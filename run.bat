@echo off
setlocal
cd /d "%~dp0backend"

set "PYTHON=venv\Scripts\python.exe"
set "MARKER=venv\.tembr-install-complete"

if not exist "%PYTHON%" goto :install
if not exist "%MARKER%" goto :install
findstr /x /c:"requirements-v1" "%MARKER%" >nul
if errorlevel 1 goto :install
"%PYTHON%" -c "import fastapi, inferrvc, numpy, torch, torchaudio, uvicorn; assert torch.cuda.is_available()" >nul 2>&1
if errorlevel 1 goto :install
goto :run

:install
echo Setting up Tembr with Python 3.11 and CUDA-enabled PyTorch...
echo.

py -3.11 --version > "%TEMP%\tembr_pycheck.txt" 2>&1
findstr /C:"Python 3.11" "%TEMP%\tembr_pycheck.txt" >nul
if errorlevel 1 (
    echo Python 3.11 is required. Install it with:
    echo   py install 3.11
    pause
    exit /b 1
)

if not exist "%PYTHON%" py -3.11 -m venv venv
if not exist "%PYTHON%" (
    echo Could not create the Python 3.11 environment.
    pause
    exit /b 1
)

rem Pin the CUDA wheel so the app cannot silently fall back to CPU PyTorch.
"%PYTHON%" -m pip install --upgrade pip setuptools wheel
if errorlevel 1 goto :install_failed
"%PYTHON%" -m pip install torch==2.7.1 torchaudio==2.7.1 --index-url https://download.pytorch.org/whl/cu128
if errorlevel 1 goto :install_failed

rem fairseq's extension build on Windows needs MSVC and the C++17 flag.
set "VSWHERE=%ProgramFiles(x86)%\Microsoft Visual Studio\Installer\vswhere.exe"
if not exist "%VSWHERE%" (
    echo Visual Studio Build Tools with Desktop development with C++ is required.
    echo Install it first, then run Tembr again.
    pause
    exit /b 1
)
for /f "usebackq tokens=*" %%I in (`"%VSWHERE%" -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath`) do set "VSINSTALL=%%I"
if not defined VSINSTALL (
    echo Install Visual Studio Build Tools with the Desktop development with C++ workload.
    pause
    exit /b 1
)
call "%VSINSTALL%\VC\Auxiliary\Build\vcvars64.bat" >nul
if errorlevel 1 goto :install_failed
where cl.exe >nul 2>&1
if errorlevel 1 (
    echo MSVC C++ compiler was not found. Install the Desktop development with C++ workload.
    pause
    exit /b 1
)
set CL=/std:c++17
set DISTUTILS_USE_SDK=1
set MSSdk=1
"%PYTHON%" -m pip install numpy==1.26.4 Cython==0.29.37
if errorlevel 1 goto :install_failed
"%PYTHON%" -m pip install --no-build-isolation https://github.com/One-sixth/fairseq/archive/44800430a728c2216fd1cf1e8daa672f50dfacba.zip
if errorlevel 1 goto :install_failed
"%PYTHON%" -m pip install -r requirements.txt
if errorlevel 1 goto :install_failed

"%PYTHON%" -c "import torch; assert torch.cuda.is_available(), 'CUDA is unavailable'; print('CUDA:', torch.version.cuda, '-', torch.cuda.get_device_name(0))"
if errorlevel 1 goto :install_failed
"%PYTHON%" -c "import fastapi, inferrvc, numpy, torchaudio, uvicorn; print('Tembr dependencies are ready')"
if errorlevel 1 goto :install_failed
> "%MARKER%" echo requirements-v1

:run
"%PYTHON%" launcher.py
if errorlevel 1 echo Tembr stopped with an error. See the messages above.
pause
exit /b

:install_failed
echo.
echo Dependency setup failed. Keep this console open and share the error above.
pause
exit /b 1
