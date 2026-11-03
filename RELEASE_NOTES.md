Tembr 0.1.3 identifies itself by name in Windows startup apps.

- The startup entry launches `Tembr.exe` directly, so Windows lists Tembr instead of Windows Script Host.
- Windows executable and installer publisher metadata now use `sxansee`.

Tembr 0.1.2 opens the studio sooner and keeps the command window out of normal launches.

- Installed shortcuts start the desktop app directly after the audio environment has been set up, skipping the repeated Python/CUDA verification.
- The studio appears before the voice model finishes loading; the default voice is then loaded automatically in the interface.
- First-time dependency setup remains visible so progress and setup errors are clear.

Tembr 0.1.1 fixes model library management.

- Attach an `.index` file to a model already in the library without uploading its `.pth` again.
- Remove a model from the library with confirmation; a uniquely matched index is removed with it.
- Preserve existing model files when updating the app.

The first public release, Tembr 0.1.0, introduced the local Windows voice studio.

- Real-time RVC voice conversion using a local NVIDIA GPU.
- Windows installer with optional desktop and Start menu shortcuts, startup launch, and tray integration.
- Russian, English, Spanish, and German interface languages.
- Graphite, ocean, and violet color themes.
- Voice model library, audio routing, diagnostics, and adjustable signal controls.

The first launch installs the Python audio engine and CUDA dependencies. A compatible NVIDIA GPU, Python 3.11, Visual Studio C++ Build Tools, and WebView2 Runtime are required.
