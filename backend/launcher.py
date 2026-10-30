"""Start Tembr's loopback-only audio engine.

The native Windows shell owns the app window and starts this process. Keeping
the engine in a child process lets the UI release CUDA and audio resources
cleanly when its window closes.
"""

import os
import socket
import sys

import uvicorn


HOST = "127.0.0.1"
PORT = int(os.environ.get("TEMBR_PORT", "7860"))


def main() -> None:
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8", errors="replace")

    # Reserve the port before Uvicorn runs application startup. Model loading
    # takes several seconds; without this pre-bind a second instance would
    # load the model and only then discover that another server owns the port.
    listener = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        listener.bind((HOST, PORT))
        listener.listen()
        listener.setblocking(False)
    except OSError as exc:
        listener.close()
        print(
            f"Порт {PORT} уже занят. Останови предыдущий экземпляр Тембра "
            f"или освободи этот порт. Подробности: {exc}",
            file=sys.stderr,
        )
        raise SystemExit(1) from exc

    config = uvicorn.Config("main:app", host=HOST, port=PORT, log_level="info")
    try:
        uvicorn.Server(config).run(sockets=[listener])
    finally:
        listener.close()


if __name__ == "__main__":
    main()
