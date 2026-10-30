"""Manual GPU/WebSocket smoke test; requires the local server and an RVC model."""

import asyncio
import json
import time
import urllib.request

import numpy as np
from websockets.asyncio.client import connect


BASE_URL = "http://127.0.0.1:7860"
WS_URL = "ws://127.0.0.1:7860/ws/convert"
SAMPLE_RATE = 48000
CHUNK_SAMPLES = SAMPLE_RATE // 5


def check_health() -> dict:
    with urllib.request.urlopen(f"{BASE_URL}/health", timeout=5) as response:
        health = json.load(response)
    if not health.get("active_model"):
        raise RuntimeError("Загрузи RVC-модель в backend/models и перезапусти сервер")
    if not health.get("cuda_available"):
        raise RuntimeError("Для этого smoke-теста нужна доступная CUDA-видеокарта")
    return health


async def check_stream() -> None:
    async with connect(WS_URL, origin=BASE_URL) as websocket:
        await websocket.send(json.dumps({"type": "settings", "sample_rate": SAMPLE_RATE}))

        short_audio = np.zeros(SAMPLE_RATE // 10, dtype=np.float32)
        await websocket.send(short_audio.tobytes())
        short_response = await websocket.recv()
        if not isinstance(short_response, str):
            raise RuntimeError("Сервер должен отклонять чанки длительностью 100 мс")
        short_error = json.loads(short_response)
        if short_error.get("type") != "error" or "100" not in short_error.get("message", ""):
            raise RuntimeError(f"Неожиданный ответ для короткого чанка: {short_error}")

        for frame_number in range(3):
            start = frame_number * CHUNK_SAMPLES
            samples = np.arange(start, start + CHUNK_SAMPLES, dtype=np.float32)
            audio = (0.2 * np.sin(2 * np.pi * 220 * samples / SAMPLE_RATE)).astype(np.float32)

            before = time.perf_counter()
            await websocket.send(audio.tobytes())
            converted = await websocket.recv()
            levels = json.loads(await websocket.recv())
            round_trip_ms = (time.perf_counter() - before) * 1000

            if not isinstance(converted, bytes) or len(converted) != len(audio) * 4:
                raise RuntimeError("Сервер вернул аудиофрейм неверной длины")
            pcm = np.frombuffer(converted, dtype=np.float32)
            if not np.isfinite(pcm).all() or not np.any(np.abs(pcm) > 1e-6):
                raise RuntimeError("Сервер вернул пустое, нулевое или некорректное аудио")
            if levels.get("type") != "level" or "inference_ms" not in levels:
                raise RuntimeError(f"Нет метрик уровня/инференса: {levels}")
            print(
                f"Кадр {frame_number + 1}: round-trip {round_trip_ms:.1f} ms, "
                f"инференс {levels['inference_ms']} ms, RMS out {levels['out']:.3f}"
            )


def main() -> None:
    health = check_health()
    print(f"Модель: {health['active_model']}; CUDA: доступна")
    asyncio.run(check_stream())
    print("WebSocket smoke-тест пройден")


if __name__ == "__main__":
    main()
