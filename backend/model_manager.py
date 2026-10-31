"""
model_manager.py

Обёртка над библиотекой inferrvc (github.com/CircuitCM/RVC-inference) —
лёгкий пакет для инференса RVC v1/v2 моделей, форк официального
RVC-Project без тренировочного кода. Проверено: твоя модель nyamura-ru —
version='v1', sr=40k, f0=1 — именно то, что эта библиотека умеет.

Важно: переменные окружения RVC_MODELDIR / RVC_INDEXDIR нужно выставить
ДО первого `from inferrvc import RVC` — библиотека читает их при импорте
модуля, поэтому импорт сделан внутри __init__, а не в начале файла.
"""
import os
import sys
import threading
from pathlib import Path
from types import MethodType

import numpy as np
import torch
import torchaudio

# inferrvc treats tensor inputs without a `frequency` attribute as already 16 kHz.
# WebSocket audio arrives directly from the UI, not through load_torchaudio(),
# so resample it explicitly before passing it to the RVC pipeline.
TARGET_SR = 16000
REALTIME_CONTEXT_SECONDS = 0.1


class ModelManager:
    def __init__(self, model_dir: str, index_dir: str | None = None, output_freq: int = 48000):
        self.model_dir = Path(model_dir).resolve()
        self.index_dir = Path(index_dir or model_dir).resolve()
        self.output_freq = output_freq
        self._lock = threading.RLock()
        os.environ["RVC_MODELDIR"] = str(self.model_dir)
        os.environ["RVC_INDEXDIR"] = str(self.index_dir)
        # 48000 — тот же стандарт, на который мы свели все устройства при отладке
        # w-okada (см. историю с "SRC ratio outside range": рассинхрон частот
        # между устройствами убивал конвертацию). Держим это единообразно и здесь.
        os.environ["RVC_OUTPUTFREQ"] = str(output_freq)
        os.environ["RVC_RETURNBLOCKING"] = "True"

        from inferrvc import RVC  # нарочно здесь, после выставления env
        import inferrvc.modules as rvc_modules
        from inferrvc.pipeline import Pipeline as BasePipeline
        from fairseq.data.dictionary import Dictionary

        # PyTorch 2.6+ safely loads tensor-only checkpoints by default. HuBERT's
        # trusted Fairseq checkpoint also stores this metadata class.
        torch.serialization.add_safe_globals([Dictionary])

        resamplers = {}

        def dtype_safe_resample(cache, rates, audio, device_to=rvc_modules._devgp):
            if rates[0] == rates[1]:
                return audio.to(device_to, non_blocking=True)
            key = (rates, audio.dtype, str(rvc_modules._devgp))
            if key not in resamplers:
                resamplers[key] = torchaudio.transforms.Resample(
                    *rates, lowpass_filter_width=32
                ).to(device=rvc_modules._devgp, dtype=audio.dtype, non_blocking=True)
            output = resamplers[key](audio.to(rvc_modules._devgp, non_blocking=True)).to(
                device_to, non_blocking=True
            )
            output.frequency = rates[1]
            return output

        # The library's shared float32 resampler fails on half-precision GPU
        # output. Keep per-dtype kernels for the FP16 real-time path.
        rvc_modules.ResampleCache.resample = MethodType(
            dtype_safe_resample, rvc_modules.ResampleCache
        )

        class RealtimePipeline(BasePipeline):
            """Use a short, explicit context window instead of inferrvc's 3 s pad."""

            def __init__(self, target_rate, config):
                super().__init__(target_rate, config)
                self.x_pad = 0  # custom f0 contours are not used by this adapter
                self.t_pad = round(self.sr * REALTIME_CONTEXT_SECONDS)
                self.t_pad2 = self.t_pad * 2
                self.t_pad_tgt = round(target_rate * REALTIME_CONTEXT_SECONDS)

        # inferrvc's default pipeline is an offline file converter: its 3 s
        # reflect pad rejects short live chunks. Keep its feature extraction,
        # but use a 100 ms edge context for the live adapter.
        rvc_modules.Pipeline = RealtimePipeline

        def realtime_pipeline(instance):
            pipeline = RVC._pipeline
            if pipeline is None:
                pipeline = RealtimePipeline(instance.tgt_sr, instance.config)
                RVC._pipeline = pipeline
            pipeline.t_pad_tgt = round(instance.tgt_sr * REALTIME_CONTEXT_SECONDS)
            return pipeline

        RVC.pipeline = property(realtime_pipeline)
        self._RVC = RVC
        self._active = None
        self._active_name = None

    def load(self, model_filename: str, index_filename: str | None = None) -> str:
        model_name = Path(model_filename).name
        if model_name != model_filename or not model_name.lower().endswith(".pth"):
            raise ValueError("Имя модели должно быть именем файла .pth без пути")
        if not (self.model_dir / model_name).is_file():
            raise FileNotFoundError(f"Модель не найдена: {model_name}")

        index_name = None
        if not index_filename:
            model_stem = Path(model_name).stem
            match = next(
                (path for path in sorted(self.index_dir.glob("*.index")) if model_stem in path.stem),
                None,
            )
            index_filename = match.stem if match else None
        if index_filename:
            index_name = Path(index_filename).name
            if index_name != index_filename:
                raise ValueError("Имя индекса не должно содержать путь")
            if index_name.lower().endswith(".index"):
                index_name = Path(index_name).stem
            if not (self.index_dir / f"{index_name}.index").is_file():
                raise FileNotFoundError(f"Индекс не найден: {index_name}.index")

        # Build first, then swap, so a failed load leaves the previous voice usable.
        with self._lock:
            # inferrvc's legacy Config calls argparse.parse_args() and would
            # otherwise interpret Uvicorn's --host/--port options as its own.
            process_argv = sys.argv
            try:
                sys.argv = process_argv[:1]
                loaded = self._RVC(model_name, index=index_name)
            finally:
                sys.argv = process_argv
            self._active = loaded
            self._active_name = Path(model_name).stem
            return self._active_name

    def unload_if_active(self, model_name: str) -> bool:
        """Release a loaded model before its files are removed from disk."""
        with self._lock:
            if self._active_name != model_name:
                return False
            self._active = None
            self._active_name = None
            return True

    @property
    def active_name(self):
        return self._active_name

    def convert_chunk(
        self,
        audio_chunk,
        pitch: int = 0,
        index_rate: float = 0.5,
        gain_in: float = 1.0,
        gain_out: float = 1.0,
        input_sample_rate: int = 48000,
    ) -> np.ndarray:
        """
        audio_chunk: numpy float32 или torch.Tensor, моно, 1D, на частоте
        input_sample_rate (та, на которой реально захватывает браузер —
        обычно 48000). Ресемплим до TARGET_SR перед подачей в inferrvc.
        """
        if not 8000 <= input_sample_rate <= 192000:
            raise ValueError("Частота входного аудио должна быть от 8000 до 192000 Гц")

        if not torch.is_tensor(audio_chunk):
            # WebSocket frames are backed by immutable bytes; make a writable copy.
            audio_chunk = torch.tensor(np.asarray(audio_chunk, dtype=np.float32))
        if audio_chunk.ndim != 1 or audio_chunk.numel() == 0:
            raise ValueError("Ожидается непустой монофонический аудиочанк")
        if not torch.isfinite(audio_chunk).all():
            raise ValueError("В аудиочанке обнаружены NaN или бесконечные значения")
        minimum_samples = round(input_sample_rate * REALTIME_CONTEXT_SECONDS) + 1
        if audio_chunk.numel() < minimum_samples:
            raise ValueError("Длительность аудиочанка должна быть больше 100 мс")
        if gain_in != 1.0:
            audio_chunk = audio_chunk * gain_in

        expected_samples = round(audio_chunk.numel() * self.output_freq / input_sample_rate)
        if audio_chunk.square().mean().sqrt().item() < 1e-5:
            return np.zeros(expected_samples, dtype=np.float32)

        if input_sample_rate != TARGET_SR:
            audio_chunk = torchaudio.functional.resample(audio_chunk, input_sample_rate, TARGET_SR)

        with self._lock:
            if self._active is None:
                raise RuntimeError("Модель не загружена — сначала выбери голос")
            result = self._active(
                audio_chunk,
                f0_up_key=pitch,
                output_device="cpu",
                # Torchaudio's LUFS biquad only accepts float32/float64; the
                # RVC model emits FP16 on CUDA. Gain is controlled in the UI.
                output_volume=self._RVC.NO_CHANGE,
                index_rate=index_rate,
            )

        if hasattr(result, "detach"):  # torch.Tensor -> numpy
            result = result.detach().cpu().numpy()
        result = np.asarray(result, dtype=np.float32).reshape(-1)

        # Keep the transport duration stable even if the inference package
        # rounds an output frame at a model/sample-rate boundary.
        if result.size > expected_samples:
            result = result[:expected_samples]
        elif result.size < expected_samples:
            result = np.pad(result, (0, expected_samples - result.size))

        if gain_out != 1.0:
            result = result * gain_out
        return result


def inspect_checkpoint(path) -> dict:
    """
    Читает метаданные .pth-файла БЕЗ загрузки в inferrvc — используется
    при загрузке нового голоса пользователем, чтобы сразу сказать,
    похоже ли это вообще на RVC-модель, и с какими параметрами
    (тем же способом, каким мы проверяли твою nyamura-ru).
    """
    try:
        ckpt = torch.load(path, map_location="cpu", weights_only=True)
    except Exception as e:
        raise ValueError(f"не удалось прочитать файл как PyTorch-чекпойнт: {e}")

    required = {"weight", "config", "sr", "f0", "version"}
    missing = required - set(ckpt.keys())
    if missing:
        raise ValueError(f"не похоже на RVC-модель — отсутствуют поля: {sorted(missing)}")

    return {
        "sr": ckpt.get("sr"),
        "f0": bool(ckpt.get("f0")),
        "version": ckpt.get("version"),
    }
