using System.Threading;
using System.Windows;

namespace Tembr.Desktop;

public partial class App : System.Windows.Application
{
    private Mutex? _instanceMutex;
    private bool _ownsMutex;

    protected override void OnStartup(StartupEventArgs e)
    {
        _instanceMutex = new Mutex(initiallyOwned: true, "Local\\Tembr.Desktop", out var isNewInstance);
        if (!isNewInstance)
        {
            _instanceMutex.Dispose();
            _instanceMutex = null;
            System.Windows.MessageBox.Show(
                "Tembr уже запущен. Переключись на его открытое окно.",
                "Tembr",
                MessageBoxButton.OK,
                MessageBoxImage.Information);
            Shutdown();
            return;
        }
        _ownsMutex = true;

        base.OnStartup(e);
        MainWindow = new MainWindow();
        MainWindow.Show();
    }

    protected override void OnExit(ExitEventArgs e)
    {
        if (_ownsMutex) _instanceMutex?.ReleaseMutex();
        _instanceMutex?.Dispose();
        base.OnExit(e);
    }
}
