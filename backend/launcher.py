"""Start the local server and open the UI after startup finishes."""

import threading
import time
import webbrowser

import uvicorn


URL = "http://127.0.0.1:7860/"


def open_when_ready(server: uvicorn.Server) -> None:
    while not server.started and not server.should_exit:
        time.sleep(0.2)
    if server.started:
        webbrowser.open(URL)


def main() -> None:
    config = uvicorn.Config("main:app", host="127.0.0.1", port=7860, log_level="info")
    server = uvicorn.Server(config)
    threading.Thread(target=open_when_ready, args=(server,), daemon=True).start()
    server.run()


if __name__ == "__main__":
    main()
