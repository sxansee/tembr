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
