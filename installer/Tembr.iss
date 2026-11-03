#ifndef AppVersion
  #define AppVersion "0.1.3"
#endif

#define AppName "Tembr"
#define AppPublisher "sxansee"
#define AppExe "Tembr.exe"

[Setup]
AppId={{CC377B7B-EC67-46D8-9E3C-E0F1DB98B794}
AppName={#AppName}
AppVersion={#AppVersion}
AppPublisher={#AppPublisher}
DefaultDirName={localappdata}\Programs\Tembr
DefaultGroupName=Tembr
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
UninstallDisplayIcon={app}\desktop\publish\{#AppExe}
OutputDir=output
OutputBaseFilename=Tembr-Setup-{#AppVersion}
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
CloseApplications=yes
RestartApplications=no
SetupIconFile=..\desktop\app.ico
Uninstallable=yes
VersionInfoProductName=Tembr
VersionInfoProductVersion={#AppVersion}
VersionInfoCompany={#AppPublisher}

[Tasks]
Name: "desktopicon"; Description: "Создать ярлык на рабочем столе"; GroupDescription: "Ярлыки:"
Name: "startmenuicon"; Description: "Создать значок в меню «Пуск»"; GroupDescription: "Ярлыки:"
Name: "startup"; Description: "Запускать Tembr при входе в Windows"; GroupDescription: "Дополнительно:"; Flags: unchecked
Name: "trayicon"; Description: "Показывать значок в трее и сворачивать Tembr при закрытии окна"; GroupDescription: "Дополнительно:"; Flags: unchecked

[Files]
Source: "..\run.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\desktop\TembrLauncher.vbs"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\desktop\publish\*"; DestDir: "{app}\desktop\publish"; Excludes: "*.pdb"; Flags: recursesubdirs createallsubdirs ignoreversion
Source: "..\backend\*.py"; DestDir: "{app}\backend"; Flags: ignoreversion
Source: "..\backend\requirements.txt"; DestDir: "{app}\backend"; Flags: ignoreversion
Source: "..\backend\README.md"; DestDir: "{app}\backend"; Flags: ignoreversion
Source: "..\backend\models\README.md"; DestDir: "{app}\backend\models"; Flags: ignoreversion
Source: "..\frontend\*"; DestDir: "{app}\frontend"; Flags: recursesubdirs createallsubdirs ignoreversion
Source: "..\README.md"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\LICENSE"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{autodesktop}\Tembr"; Filename: "{sys}\wscript.exe"; Parameters: """{app}\TembrLauncher.vbs"""; IconFilename: "{app}\desktop\publish\{#AppExe}"; Tasks: desktopicon
Name: "{autoprograms}\Tembr"; Filename: "{sys}\wscript.exe"; Parameters: """{app}\TembrLauncher.vbs"""; IconFilename: "{app}\desktop\publish\{#AppExe}"; Tasks: startmenuicon
Name: "{autoprograms}\Uninstall Tembr"; Filename: "{uninstallexe}"; Tasks: startmenuicon

[Registry]
Root: HKCU; Subkey: "Software\Microsoft\Windows\CurrentVersion\Run"; ValueType: string; ValueName: "Tembr"; ValueData: """{app}\desktop\publish\{#AppExe}"""; Tasks: startup; Flags: uninsdeletevalue
Root: HKCU; Subkey: "Software\Microsoft\Windows\CurrentVersion\Run"; ValueType: none; ValueName: "Tembr"; Tasks: not startup; Flags: deletevalue
Root: HKCU; Subkey: "Software\Tembr"; ValueType: dword; ValueName: "ShowTrayIcon"; ValueData: "1"; Tasks: trayicon; Flags: uninsdeletevalue
Root: HKCU; Subkey: "Software\Tembr"; ValueType: dword; ValueName: "ShowTrayIcon"; ValueData: "0"; Tasks: not trayicon; Flags: uninsdeletevalue

[Run]
Filename: "{sys}\wscript.exe"; Parameters: """{app}\TembrLauncher.vbs"""; Description: "Запустить Tembr"; Flags: postinstall nowait skipifsilent
