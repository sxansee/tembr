"""
main.py — бэкенд "Тембр"

FastAPI + WebSocket поверх inferrvc. Тот же движок конвертации (RVC),
но собственный, документированный протокол вместо закрытого Socket.IO
у w-okada.

Запуск:
    uvicorn main:app --host 127.0.0.1 --port 7860

Протокол WebSocket /ws/convert:
    → бинарный фрейм:  сырой float32 PCM, моно, один чанк на фрейм
    → текстовый фрейм: {"type": "settings", "pitch": int, "index_rate": float,
                         "gain_in": float, "gain_out": float}  (любые поля опциональны)
    ← бинарный фрейм:  обработанный float32 PCM тем же чанком
    ← текстовый фрейм: {"type": "level", "in": float, "out": float}  — для метров в интерфейсе
    ← текстовый фрейм: {"type": "error", "message": str}  — если конвертация упала
"""
import asyncio
import json
import math
import os
import tempfile
import time
import uuid
from pathlib import Path
from pathlib import PureWindowsPath

import numpy as np
from fastapi import FastAPI, File, HTTPException, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles

from model_manager import ModelManager, inspect_checkpoint

MODEL_DIR = Path(__file__).resolve().parent / "models"
DEFAULT_MODEL = "nyamura-ru.pth"
FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend"

manager = ModelManager(model_dir=str(MODEL_DIR), index_dir=str(MODEL_DIR))

app = FastAPI(title="Тембр — voice engine", version="0.2.0")
MAX_MODEL_BYTES = 1024 * 1024 * 1024
MAX_INDEX_BYTES = 2 * 1024 * 1024 * 1024
ALLOWED_PITCH = (-24, 24)
DEFAULT_SETTINGS = {"pitch": 0, "index_rate": 0.5, "gain_in": 1.0, "gain_out": 1.0, "sample_rate": 48000}


def _same_origin(origin: str | None, host: str) -> bool:
    if not origin:
        return True  # CLI clients do not send Origin.
    return origin in (f"http://{host}", f"https://{host}")


@app.middleware("http")
async def reject_cross_origin_requests(request, call_next):
    if not _same_origin(request.headers.get("origin"), request.headers.get("host", "")):
        from fastapi.responses import JSONResponse
        return JSONResponse({"detail": "Cross-origin requests are not allowed"}, status_code=403)
    return await call_next(request)


@app.on_event("startup")
def autoload_default_model():
    path = MODEL_DIR / DEFAULT_MODEL
    if path.exists():
        try:
            name = manager.load(DEFAULT_MODEL)
            print(f"[Тембр] Загружена модель по умолчанию: {name}")
        except Exception as e:
            print(f"[Тембр] Не удалось автозагрузить {DEFAULT_MODEL}: {e}")
    else:
        print(f"[Тембр] {DEFAULT_MODEL} не найден в {MODEL_DIR}/ — используй POST /model/load")


@app.get("/health")
def health():
    import torch
    cuda_available = bool(torch.cuda.is_available())
    return {
        "status": "ok",
        "active_model": manager.active_name,
        "cuda_available": cuda_available,
        "gpu_name": torch.cuda.get_device_name(0) if cuda_available else None,
    }


@app.post("/model/load")
def load_model(filename: str, index: str | None = None):
    try:
        name = manager.load(filename, index)
    except (FileNotFoundError, ValueError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Не удалось загрузить модель: {exc}") from exc
    return {"loaded": name}


@app.get("/model/list")
def list_models():
    """Сканирует папку моделей — так фронтенд узнаёт про загруженные
    пользователем голоса, а не только про то, что было тут с самого начала."""
    model_dir = MODEL_DIR
    model_dir.mkdir(parents=True, exist_ok=True)
    pth_files = sorted(model_dir.glob("*.pth"))
    index_files = sorted(model_dir.glob("*.index"))

    voices = []
    for pth in pth_files:
        base_name = pth.stem
        matching_index = next((idx for idx in index_files if base_name in idx.stem), None)
        voices.append({
            "name": base_name,
            "file": pth.name,
            "index": matching_index.stem if matching_index else None,
        })
    return {"voices": voices, "active": manager.active_name}


@app.post("/model/upload")
async def upload_model(pth_file: UploadFile = File(...), index_file: UploadFile | None = File(None)):
    """Принимает свой .pth (+ опционально .index), проверяет, что это
    вообще похоже на RVC-модель, и кладёт в папку моделей."""
    if not pth_file.filename or not pth_file.filename.lower().endswith(".pth"):
        raise HTTPException(status_code=400, detail="Ожидается файл .pth")

    def safe_name(filename: str | None, suffix: str) -> str:
        if not filename or Path(filename).name != filename or PureWindowsPath(filename).name != filename:
            raise HTTPException(status_code=400, detail="Имя файла не должно содержать путь")
        if not filename.lower().endswith(suffix):
            raise HTTPException(status_code=400, detail=f"Ожидается файл {suffix}")
        return filename

    pth_name = safe_name(pth_file.filename, ".pth")
    index_name = None
    if index_file is not None and index_file.filename:
        index_name = safe_name(index_file.filename, ".index")

    model_dir = MODEL_DIR
    model_dir.mkdir(parents=True, exist_ok=True)
    pth_path = model_dir / pth_name
    index_path = model_dir / index_name if index_name else None
    if pth_path.exists() or (index_path and index_path.exists()):
        raise HTTPException(status_code=409, detail="Файл с таким именем уже есть в models")

    staged_paths: list[Path] = []
    try:
        def stage_path() -> Path:
            fd, name = tempfile.mkstemp(prefix=".upload-", suffix=".tmp", dir=model_dir)
            os.close(fd)
            path = Path(name)
            staged_paths.append(path)
            return path

        async def write_upload(upload: UploadFile, destination: Path, limit: int):
            total = 0
            with destination.open("wb") as output:
                while chunk := await upload.read(1024 * 1024):
                    total += len(chunk)
                    if total > limit:
                        raise HTTPException(status_code=413, detail="Файл превышает допустимый размер")
                    output.write(chunk)
            if total == 0:
                raise HTTPException(status_code=400, detail="Файл пустой")

        staged_pth = stage_path()
        await write_upload(pth_file, staged_pth, MAX_MODEL_BYTES)
        try:
            meta = inspect_checkpoint(staged_pth)
        except Exception as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

        staged_index = None
        if index_file is not None and index_name:
            staged_index = stage_path()
            await write_upload(index_file, staged_index, MAX_INDEX_BYTES)

        os.replace(staged_pth, pth_path)
        if staged_index is not None and index_path is not None:
            os.replace(staged_index, index_path)
        return {"uploaded": pth_name, "index": Path(index_name).stem if index_name else None, "meta": meta}
    finally:
        for path in staged_paths:
            path.unlink(missing_ok=True)


@app.post("/settings")
def update_settings(
    pitch: int | None = None,
    index_rate: float | None = None,
    gain_in: float | None = None,
    gain_out: float | None = None,
    sample_rate: int | None = None,
):
    values = {"pitch": pitch, "index_rate": index_rate, "gain_in": gain_in,
              "gain_out": gain_out, "sample_rate": sample_rate}
    if pitch is not None and not ALLOWED_PITCH[0] <= pitch <= ALLOWED_PITCH[1]:
        raise HTTPException(status_code=422, detail="pitch должен быть от -24 до 24")
    if index_rate is not None and not 0 <= index_rate <= 1:
        raise HTTPException(status_code=422, detail="index_rate должен быть от 0 до 1")
    for key in ("gain_in", "gain_out"):
        if values[key] is not None and (not math.isfinite(values[key]) or not 0 <= values[key] <= 3):
            raise HTTPException(status_code=422, detail=f"{key} должен быть от 0 до 3")
    if sample_rate is not None and not 8000 <= sample_rate <= 192000:
        raise HTTPException(status_code=422, detail="sample_rate должен быть от 8000 до 192000 Гц")
    DEFAULT_SETTINGS.update({key: value for key, value in values.items() if value is not None})
    return DEFAULT_SETTINGS.copy()


@app.websocket("/ws/convert")
async def ws_convert(websocket: WebSocket):
    if not _same_origin(websocket.headers.get("origin"), websocket.headers.get("host", "")):
        await websocket.close(code=1008, reason="Cross-origin WebSocket is not allowed")
        return
    await websocket.accept()
    settings = DEFAULT_SETTINGS.copy()
    try:
        while True:
            message = await websocket.receive()

            if message["type"] == "websocket.disconnect":
                break

            if message.get("text") is not None:
                try:
                    cmd = json.loads(message["text"])
                except json.JSONDecodeError:
                    continue
                if not isinstance(cmd, dict):
                    await websocket.send_text(json.dumps({"type": "error", "message": "Команда должна быть JSON-объектом"}))
                    continue
                if cmd.get("type") == "settings":
                    try:
                        if "pitch" in cmd:
                            value = cmd["pitch"]
                            if isinstance(value, bool) or not isinstance(value, int) or not ALLOWED_PITCH[0] <= value <= ALLOWED_PITCH[1]:
                                raise ValueError("pitch должен быть целым числом от -24 до 24")
                            settings["pitch"] = value
                        for key in ("index_rate", "gain_in", "gain_out"):
                            if key in cmd:
                                value = float(cmd[key])
                                bounds = (0.0, 1.0) if key == "index_rate" else (0.0, 3.0)
                                if not math.isfinite(value) or not bounds[0] <= value <= bounds[1]:
                                    raise ValueError(f"{key} вне допустимого диапазона")
                                settings[key] = value
                        if "sample_rate" in cmd:
                            value = cmd["sample_rate"]
                            if isinstance(value, bool) or not isinstance(value, int) or not 8000 <= value <= 192000:
                                raise ValueError("sample_rate должен быть от 8000 до 192000 Гц")
                            settings["sample_rate"] = value
                    except (TypeError, ValueError) as exc:
                        await websocket.send_text(json.dumps({"type": "error", "message": str(exc)}))
                continue

            if message.get("bytes") is not None:
                payload = message["bytes"]
                if len(payload) % np.dtype(np.float32).itemsize:
                    await websocket.send_text(json.dumps({"type": "error", "message": "Некорректный размер аудиофрейма"}))
                    continue
                chunk = np.frombuffer(payload, dtype=np.float32)
                if chunk.size == 0 or not np.isfinite(chunk).all():
                    await websocket.send_text(json.dumps({"type": "error", "message": "Аудиофрейм пустой или содержит недопустимые значения"}))
                    continue
                in_level = float(np.sqrt(np.mean(chunk ** 2))) if chunk.size else 0.0

                try:
                    started = time.perf_counter()
                    converted = await asyncio.to_thread(
                        manager.convert_chunk, chunk,
                        pitch=settings["pitch"],
                        index_rate=settings["index_rate"],
                        gain_in=settings["gain_in"],
                        gain_out=settings["gain_out"],
                        input_sample_rate=settings["sample_rate"],
                    )
                except Exception as e:
                    await websocket.send_text(json.dumps({"type": "error", "message": str(e)}))
                    continue
                inference_ms = (time.perf_counter() - started) * 1000

                out_level = float(np.sqrt(np.mean(converted ** 2))) if converted.size else 0.0

                await websocket.send_bytes(converted.astype(np.float32).tobytes())
                await websocket.send_text(json.dumps({
                    "type": "level",
                    "in": min(in_level * 4, 1.0),
                    "out": min(out_level * 4, 1.0),
                    "inference_ms": round(inference_ms, 1),
                }))
    except WebSocketDisconnect:
        pass


# Раздача фронтенда — обязательно ПОСЛЕ всех @app.get/@app.post/@app.websocket
# выше, иначе этот catch-all перехватит их пути на себя.
app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")
