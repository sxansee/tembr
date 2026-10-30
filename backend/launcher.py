"""Start the local server and open the UI after startup finishes."""

import socket
import sys
import threading
import time
import webbrowser

import uvicorn


HOST = "127.0.0.1"
PORT = 7860
URL = f"http://{HOST}:{PORT}/"


def open_when_ready(server: uvicorn.Server) -> None:
    while not server.started and not server.should_exit:
        time.sleep(0.2)
    if server.started:
        webbrowser.open(URL)


def main() -> None:
    # Reserve the port before Uvicorn runs application startup. Model loading
    # takes several seconds; without this pre-bind, a second instance would
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
    server = uvicorn.Server(config)
    threading.Thread(target=open_when_ready, args=(server,), daemon=True).start()
    try:
        server.run(sockets=[listener])
    finally:
        listener.close()


if __name__ == "__main__":
    main()
