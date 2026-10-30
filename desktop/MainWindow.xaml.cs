using System.Diagnostics;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Net.Sockets;
using System.Text;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using Microsoft.Web.WebView2.Core;

namespace Tembr.Desktop;

public partial class MainWindow : Window
{
    private static readonly HttpClient Http = new() { Timeout = TimeSpan.FromSeconds(2) };
    private readonly CancellationTokenSource _lifetime = new();
    private readonly object _logLock = new();
    private readonly string _projectRoot = FindProjectRoot();
    private readonly string _logPath = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
        "Tembr", "logs", "tembr-desktop.log");
    private Process? _backend;
    private bool _closing;
    private Uri AppUri { get; }

    public MainWindow()
    {
        InitializeComponent();
        AppUri = new Uri($"http://127.0.0.1:{FindFreePort()}/");
        Directory.CreateDirectory(Path.GetDirectoryName(_logPath)!);
        Log("Desktop shell starting.");
    }

    private async void Window_Loaded(object sender, RoutedEventArgs e)
    {
        await StartStudioAsync();
    }

    private async Task StartStudioAsync()
    {
        ErrorActions.Visibility = Visibility.Collapsed;
        StartupStatus.Text = "Запускаем аудиодвижок…";
        StartupDetail.Text = "Первая загрузка модели может занять несколько секунд.";
        StartupStatus.Foreground = Brushes.White;

        try
        {
            await InitializeBrowserAsync(_lifetime.Token);
            StartBackend();
            SetStartupStatus("Загружаем RVC и проверяем GPU…",
                "Это может занять до двух минут при первом запуске.");
            await WaitForEngineAsync(_lifetime.Token);

            Browser.Source = AppUri;
            Browser.Visibility = Visibility.Visible;
            StartupPanel.Visibility = Visibility.Collapsed;
            Log("Studio page opened.");
        }
        catch (OperationCanceledException) when (_lifetime.IsCancellationRequested)
        {
            // The app is closing while startup is in progress.
        }
        catch (Exception ex)
        {
            Log($"Startup failed: {ex}");
            ShowStartupError(ex.Message);
            await StopBackendAsync();
        }
    }

    private async Task InitializeBrowserAsync(CancellationToken cancellationToken)
    {
        if (Browser.CoreWebView2 is not null) return;
        SetStartupStatus("Подготавливаем окно приложения…", "Проверяем WebView2 и графическую среду.");
        var userDataPath = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "Tembr", "WebView2");
        Directory.CreateDirectory(userDataPath);

        CoreWebView2Environment environment;
        try
        {
            environment = await CoreWebView2Environment.CreateAsync(userDataFolder: userDataPath);
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException(
                "Не найден или не запускается Microsoft Edge WebView2 Runtime. Установи Evergreen Runtime и повтори запуск.", ex);
        }
        await Browser.EnsureCoreWebView2Async(environment);
        cancellationToken.ThrowIfCancellationRequested();

        var core = Browser.CoreWebView2
            ?? throw new InvalidOperationException("WebView2 не удалось инициализировать.");
        core.PermissionRequested += OnPermissionRequested;
        core.NavigationStarting += OnNavigationStarting;
        core.NewWindowRequested += (_, args) => args.Handled = true;
        core.Settings.AreDefaultContextMenusEnabled = false;
        core.Settings.AreDevToolsEnabled = false;
        core.Settings.IsStatusBarEnabled = false;
        core.Settings.IsZoomControlEnabled = true;
    }

    private void OnPermissionRequested(object? sender, CoreWebView2PermissionRequestedEventArgs args)
    {
        // Only honor the explicit Start action from Tembr's loopback UI. Deny
        // camera, notifications, geolocation, and every other web permission.
        var localApp = Uri.TryCreate(args.Uri, UriKind.Absolute, out var requestUri)
            && requestUri.Scheme == Uri.UriSchemeHttp
            && requestUri.Host == AppUri.Host
            && requestUri.Port == AppUri.Port;
        var allowMicrophone = localApp
            && args.PermissionKind == CoreWebView2PermissionKind.Microphone
            && args.IsUserInitiated;

        args.SavesInProfile = false;
        args.State = allowMicrophone
            ? CoreWebView2PermissionState.Allow
            : CoreWebView2PermissionState.Deny;
        Log($"Web permission {args.PermissionKind} from {args.Uri}: {(allowMicrophone ? "allow" : "deny")}.");
    }

    private void OnNavigationStarting(object? sender, CoreWebView2NavigationStartingEventArgs args)
    {
        if (!Uri.TryCreate(args.Uri, UriKind.Absolute, out var uri))
        {
            args.Cancel = true;
            return;
        }

        if (uri.Scheme == "about") return;
        if (uri.Scheme == AppUri.Scheme && uri.Host == AppUri.Host && uri.Port == AppUri.Port) return;

        args.Cancel = true;
        Log($"Blocked navigation to {uri}.");
    }

    private void StartBackend()
    {
        var python = Path.Combine(_projectRoot, "backend", "venv", "Scripts", "python.exe");
        var launcher = Path.Combine(_projectRoot, "backend", "launcher.py");
        if (!File.Exists(python) || !File.Exists(launcher))
        {
            throw new InvalidOperationException(
                "Не найден Python-движок. Запусти run.bat из папки Tembr, чтобы установить компоненты.");
        }

        var startInfo = new ProcessStartInfo
        {
            FileName = python,
            WorkingDirectory = Path.Combine(_projectRoot, "backend"),
            UseShellExecute = false,
            CreateNoWindow = true,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            StandardOutputEncoding = Encoding.UTF8,
            StandardErrorEncoding = Encoding.UTF8,
        };
        startInfo.Environment["TEMBR_PORT"] = AppUri.Port.ToString();
        startInfo.ArgumentList.Add(launcher);

        _backend = new Process { StartInfo = startInfo, EnableRaisingEvents = true };
        _backend.OutputDataReceived += (_, args) => { if (args.Data is not null) Log(args.Data); };
        _backend.ErrorDataReceived += (_, args) => { if (args.Data is not null) Log(args.Data); };
        if (!_backend.Start()) throw new InvalidOperationException("Не удалось запустить аудиодвижок.");
        _backend.BeginOutputReadLine();
        _backend.BeginErrorReadLine();
        Log($"Started backend process {_backend.Id}.");
    }

    private async Task WaitForEngineAsync(CancellationToken cancellationToken)
    {
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timeout.CancelAfter(TimeSpan.FromMinutes(2));
        while (!timeout.IsCancellationRequested)
        {
            if (_backend?.HasExited == true)
            {
                var code = _backend.ExitCode;
                throw new InvalidOperationException(
                    $"Аудиодвижок завершился с кодом {code}. Убедись, что порт 7860 свободен, и открой журнал запуска для подробностей.");
            }

            try
            {
                using var response = await Http.GetAsync(AppUri, timeout.Token);
                if (response.IsSuccessStatusCode) return;
            }
            catch (HttpRequestException) { }
            catch (TaskCanceledException) when (!cancellationToken.IsCancellationRequested) { }

            await Task.Delay(500, timeout.Token);
        }

        if (cancellationToken.IsCancellationRequested) cancellationToken.ThrowIfCancellationRequested();
        throw new TimeoutException(
            "Аудиодвижок не ответил за две минуты. Проверь установку CUDA и последнюю ошибку в журнале.");
    }

    private async void Retry_Click(object sender, RoutedEventArgs e)
    {
        RetryButton.IsEnabled = false;
        try
        {
            await StopBackendAsync();
            await StartStudioAsync();
        }
        finally
        {
            RetryButton.IsEnabled = true;
        }
    }

    private void OpenLog_Click(object sender, RoutedEventArgs e)
    {
        try
        {
            Process.Start(new ProcessStartInfo("notepad.exe", $"\"{_logPath}\"") { UseShellExecute = true });
        }
        catch (Exception ex)
        {
            Log($"Could not open log: {ex.Message}");
        }
    }

    private async void Window_Closing(object? sender, System.ComponentModel.CancelEventArgs e)
    {
        if (_closing) return;
        e.Cancel = true;
        _closing = true;
        _lifetime.Cancel();
        if (Browser.CoreWebView2 is not null)
        {
            Browser.CoreWebView2.Navigate("about:blank");
        }
        await StopBackendAsync();
        Close();
    }

    private async Task StopBackendAsync()
    {
        var process = _backend;
        _backend = null;
        if (process is null) return;

        try
        {
            if (!process.HasExited)
            {
                process.Kill(entireProcessTree: true);
                using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(4));
                await process.WaitForExitAsync(timeout.Token);
            }
        }
        catch (InvalidOperationException) { }
        catch (OperationCanceledException) { Log("Backend did not exit before shutdown timeout."); }
        catch (Exception ex) { Log($"Backend shutdown failed: {ex.Message}"); }
        finally
        {
            process.Dispose();
        }
    }

    private void SetStartupStatus(string title, string detail)
    {
        StartupStatus.Text = title;
        StartupDetail.Text = detail;
    }

    private void ShowStartupError(string message)
    {
        StartupStatus.Text = "Не удалось открыть студию";
        StartupStatus.Foreground = new SolidColorBrush(Color.FromRgb(255, 141, 130));
        StartupDetail.Text = message;
        ErrorActions.Visibility = Visibility.Visible;
    }

    private void Log(string message)
    {
        try
        {
            lock (_logLock)
            {
                File.AppendAllText(_logPath, $"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] {message}{Environment.NewLine}");
            }
        }
        catch { }
    }

    private static string FindProjectRoot()
    {
        foreach (var start in new[] { Environment.CurrentDirectory, AppContext.BaseDirectory })
        {
            var directory = new DirectoryInfo(Path.GetFullPath(start));
            while (directory is not null)
            {
                if (File.Exists(Path.Combine(directory.FullName, "backend", "launcher.py"))
                    && Directory.Exists(Path.Combine(directory.FullName, "frontend")))
                {
                    return directory.FullName;
                }
                directory = directory.Parent;
            }
        }
        return Environment.CurrentDirectory;
    }

    private static int FindFreePort()
    {
        using var listener = new TcpListener(IPAddress.Loopback, 0);
        listener.Start();
        return ((IPEndPoint)listener.LocalEndpoint).Port;
    }
}
