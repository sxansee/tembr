# Backend

FastAPI serves the frontend and converts WebSocket audio frames through
`inferrvc`. The desktop app binds its engine to an available port on
`127.0.0.1`; a direct development launch defaults to `127.0.0.1:7860`. Run
`run.bat` from the root so the Python 3.11 CUDA environment and desktop window
are set up.

## Endpoints

- `GET /health`: server and CUDA status.
- `GET /model/list`: available checkpoints, matching indexes and active voice.
- `POST /model/load?filename=<file>[&index=<index-stem>]`: load one RVC voice.
- `POST /model/upload`: multipart form with `pth_file` and optional `index_file`.
- `POST /settings`: update defaults for new WebSocket sessions.
- `WS /ws/convert`: JSON settings messages and binary mono float32 PCM frames.

All sample-rate settings are validated. The frontend requests a 48 kHz
AudioContext, then tells the server that rate after the WebSocket opens.
It sends 200 ms frames; the real-time adapter requires frames longer than
100 ms for its edge context. Inference runs off the ASGI event loop and is
serialized with model swaps.

Do not expose this server to a network. It is a local desktop tool without
authentication. Model files are user-supplied and are not stored in Git.
