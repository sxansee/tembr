(() => {
  const translations = {
    en: {
      'РАБОЧЕЕ ПРОСТРАНСТВО': 'WORKSPACE', 'Студия': 'Studio', 'Голоса': 'Voices', 'Настройки': 'Settings',
      'ЛОКАЛЬНЫЙ ДВИЖОК': 'LOCAL ENGINE', 'Запускается…': 'Starting…', 'Движок готов': 'Engine ready',
      'NVIDIA GPU недоступна': 'NVIDIA GPU unavailable', 'Ошибка подключения': 'Connection error',
      'РАБОТАЕТ НА ЭТОМ ПК': 'RUNS ON THIS PC', 'Диагностика': 'Diagnostics',
      'Голосовая студия': 'Voice studio', 'Выбери голос, настрой тембр и направь звук в нужное приложение.': 'Choose a voice, tune it, and route the sound to an app.',
      'ОЖИДАНИЕ': 'IDLE', 'В ЭФИРЕ': 'LIVE', 'ПОДКЛЮЧЕНИЕ': 'CONNECTING', 'GPU НЕ НАЙДЕНА': 'GPU NOT FOUND',
      'ГОТОВ К СТАРТУ': 'READY TO START', 'ОБРАБОТКА АКТИВНА': 'PROCESSING', 'ПОДКЛЮЧАЕМ УСТРОЙСТВА': 'CONNECTING DEVICES',
      'ПРОВЕРЬ NVIDIA GPU': 'CHECK NVIDIA GPU', 'LIVE VOICE ENGINE': 'LIVE VOICE ENGINE',
      'Твой голос,': 'Your voice,', 'новый тембр.': 'a new tone.', 'Обработка идёт локально на видеокарте. Для начала выбери голос и нажми кнопку.': 'Audio is processed locally on your GPU. Choose a voice and press the button to begin.',
      'ВХОД': 'INPUT', 'ВЫХОД': 'OUTPUT', 'Выбери голос': 'Choose a voice', 'Остановить обработку': 'Stop processing',
      'Начать обработку': 'Start processing', 'Для обработки в реальном времени требуется доступная NVIDIA GPU.': 'An available NVIDIA GPU is required for real-time processing.',
      'Обработка активна. Нажми кнопку или Ctrl + Shift + Space, чтобы остановить.': 'Processing is active. Press the button or Ctrl + Shift + Space to stop.',
      'Разреши доступ к микрофону, если Windows покажет запрос.': 'Allow microphone access if Windows asks.',
      'Добавь модель .pth и выбери голос, чтобы включить преобразование.': 'Add a .pth model and choose a voice to enable conversion.',
      'Нажми кнопку или Ctrl + Shift + Space, чтобы начать.': 'Press the button or Ctrl + Shift + Space to start.',
      'Маршрутизация звука': 'Audio routing', 'Выбери микрофон и устройство, куда отправлять голос.': 'Choose a microphone and where to send the voice.',
      'Обновить список устройств': 'Refresh device list', 'МИКРОФОН': 'MICROPHONE', 'Поиск устройств…': 'Searching for devices…',
      'Отсюда берётся исходный голос': 'Source voice input', 'Устройство вывода': 'Output device', 'Виртуальный кабель — для Discord': 'Virtual cable for Discord',
      'Проверить': 'Check', 'Проверить микрофон, движок и устройства': 'Check microphone, engine, and devices',
      'Состояние системы': 'System status', 'Быстрые проверки перед звонком или записью.': 'Quick checks before a call or recording.',
      'Нажми «Проверить», чтобы посмотреть состояние.': 'Select “Check” to view system status.', 'БИБЛИОТЕКА': 'LIBRARY',
      'Текущий:': 'Current:', 'не выбран': 'none selected', 'Библиотека пока пуста': 'Your library is empty',
      'Добавь свою RVC-модель .pth и, если есть, соответствующий индекс .index.': 'Add an RVC .pth model and its matching .index file, if available.',
      'Выбрать модель': 'Choose model', 'Добавить голос': 'Add voice', 'Настройка голоса': 'Voice settings',
      'Подстрой результат под себя.': 'Adjust the result to your taste.', 'Сбросить': 'Reset', 'Уровни сигнала': 'Signal levels',
      'Внешний вид': 'Appearance', 'Язык': 'Language', 'Цветовая тема': 'Color theme',
      'Графитовая · лайм': 'Graphite · lime', 'Океаническая · голубая': 'Ocean · blue', 'Ночная · фиолетовая': 'Night · violet',
      'Используешь Discord?': 'Using Discord?', 'Вывод Tembr → CABLE Input': 'Tembr output → CABLE Input',
      'Микрофон Discord → CABLE Output': 'Discord microphone → CABLE Output',
      'Tembr обрабатывает звук только на этом компьютере.': 'Tembr processes audio only on this computer.',
      'ОШИБКА': 'ERROR', 'Открыть журнал': 'Open log', 'Повторить запуск': 'Retry',
      'Настройки голоса сброшены.': 'Voice settings reset.', 'Устройство не найдено': 'Device not found',
      'Не найден микрофон. Подключи устройство и нажми кнопку обновления.': 'No microphone found. Connect one and refresh the device list.',
      'Не найдено устройство вывода. Проверь подключение динамиков или наушников.': 'No output device found. Check your speakers or headphones.',
      'Не удалось получить список аудиоустройств. Проверь разрешение на микрофон в Windows.': 'Could not list audio devices. Check microphone permissions in Windows.',
      'Высота тона': 'Pitch', 'Меняет высоту голоса': 'Changes voice pitch', 'Сходство голоса': 'Voice similarity',
      'Насколько точно передавать тембр модели': 'How closely to match the model voice', 'Уровень микрофона': 'Microphone level',
      'Усиление исходного сигнала': 'Input signal gain', 'Громкость результата': 'Output volume', 'Уровень обработанного голоса': 'Processed voice level',
      'Аудиодвижок': 'Audio engine', 'Микрофон': 'Microphone', 'Виртуальный кабель': 'Virtual cable', 'Настройка Discord': 'Discord setup',
      'доступно': 'available', 'подключи микрофон': 'connect a microphone', 'нужен для передачи в Discord': 'needed to route audio to Discord',
      'микрофон Discord → CABLE Output': 'Discord microphone → CABLE Output', 'нет доступа к списку устройств': 'device list unavailable',
      'Модель загружена': 'Model loaded', 'Голос загружен': 'Voice loaded', 'Загрузка модели…': 'Loading model…',
      'Не удалось загрузить студию': 'Could not load the studio', 'Не удалось начать обработку': 'Could not start processing',
      'Разреши Tembr доступ к микрофону в Windows: Параметры → Конфиденциальность и безопасность → Микрофон.': 'Allow Tembr to use the microphone in Windows: Settings → Privacy & security → Microphone.',
      'Доступ к микрофону запрещён': 'Microphone access denied', 'Уровень тона': 'Pitch', 'доступно': 'available',
    },
    es: {
      'РАБОЧЕЕ ПРОСТРАНСТВО': 'ESPACIO DE TRABAJO', 'Студия': 'Estudio', 'Голоса': 'Voces', 'Настройки': 'Ajustes',
      'ЛОКАЛЬНЫЙ ДВИЖОК': 'MOTOR LOCAL', 'Запускается…': 'Iniciando…', 'Движок готов': 'Motor listo',
      'NVIDIA GPU недоступна': 'GPU NVIDIA no disponible', 'Ошибка подключения': 'Error de conexión',
      'РАБОТАЕТ НА ЭТОМ ПК': 'FUNCIONA EN ESTE PC', 'Диагностика': 'Diagnóstico', 'Голосовая студия': 'Estudio de voz',
      'Выбери голос, настрой тембр и направь звук в нужное приложение.': 'Elige una voz, ajústala y envía el audio a una aplicación.',
      'ОЖИДАНИЕ': 'EN ESPERA', 'В ЭФИРЕ': 'EN DIRECTO', 'ПОДКЛЮЧЕНИЕ': 'CONECTANDO', 'GPU НЕ НАЙДЕНА': 'GPU NO DETECTADA',
      'ГОТОВ К СТАРТУ': 'LISTO PARA EMPEZAR', 'ОБРАБОТКА АКТИВНА': 'PROCESANDO', 'ПОДКЛЮЧАЕМ УСТРОЙСТВА': 'CONECTANDO DISPOSITIVOS',
      'ПРОВЕРЬ NVIDIA GPU': 'COMPRUEBA LA GPU NVIDIA', 'Твой голос,': 'Tu voz,', 'новый тембр.': 'un nuevo tono.',
      'Обработка идёт локально на видеокарте. Для начала выбери голос и нажми кнопку.': 'El audio se procesa localmente en la GPU. Elige una voz y pulsa el botón para empezar.',
      'ВХОД': 'ENTRADA', 'ВЫХОД': 'SALIDA', 'Выбери голос': 'Elige una voz', 'Остановить обработку': 'Detener procesamiento',
      'Начать обработку': 'Iniciar procesamiento', 'Маршрутизация звука': 'Enrutamiento de audio',
      'Выбери микрофон и устройство, куда отправлять голос.': 'Elige un micrófono y dónde enviar la voz.',
      'Обновить список устройств': 'Actualizar dispositivos', 'МИКРОФОН': 'MICRÓFONO', 'Поиск устройств…': 'Buscando dispositivos…',
      'Отсюда берётся исходный голос': 'Entrada de voz original', 'Устройство вывода': 'Dispositivo de salida',
      'Виртуальный кабель — для Discord': 'Cable virtual para Discord', 'Проверить': 'Comprobar', 'Состояние системы': 'Estado del sistema',
      'Быстрые проверки перед звонком или записью.': 'Comprobaciones rápidas antes de una llamada o grabación.',
      'Нажми «Проверить», чтобы посмотреть состояние.': 'Pulsa «Comprobar» para ver el estado.', 'БИБЛИОТЕКА': 'BIBLIOTECA',
      'Текущий:': 'Actual:', 'не выбран': 'ninguna', 'Библиотека пока пуста': 'La biblioteca está vacía',
      'Добавь свою RVC-модель .pth и, если есть, соответствующий индекс .index.': 'Añade un modelo RVC .pth y su índice .index si lo tienes.',
      'Выбрать модель': 'Elegir modelo', 'Добавить голос': 'Añadir voz', 'Настройка голоса': 'Ajustes de voz',
      'Подстрой результат под себя.': 'Personaliza el resultado.', 'Сбросить': 'Restablecer', 'Уровни сигнала': 'Niveles de señal',
      'Внешний вид': 'Apariencia', 'Язык': 'Idioma', 'Цветовая тема': 'Tema de color',
      'Графитовая · лайм': 'Grafito · lima', 'Океаническая · голубая': 'Océano · azul', 'Ночная · фиолетовая': 'Noche · violeta',
      'Используешь Discord?': '¿Usas Discord?', 'Вывод Tembr → CABLE Input': 'Salida de Tembr → CABLE Input',
      'Микрофон Discord → CABLE Output': 'Micrófono de Discord → CABLE Output',
      'Tembr обрабатывает звук только на этом компьютере.': 'Tembr procesa el audio solo en este ordenador.',
      'Открыть журнал': 'Abrir registro', 'Повторить запуск': 'Reintentar', 'Настройки голоса сброшены.': 'Ajustes de voz restablecidos.',
      'Устройство не найдено': 'Dispositivo no encontrado', 'Не найден микрофон. Подключи устройство и нажми кнопку обновления.': 'No se encontró ningún micrófono. Conecta uno y actualiza la lista.',
      'Не найдено устройство вывода. Проверь подключение динамиков или наушников.': 'No se encontró una salida de audio. Comprueba los altavoces o auriculares.',
      'Не удалось получить список аудиоустройств. Проверь разрешение на микрофон в Windows.': 'No se pudo obtener la lista de audio. Comprueba el permiso del micrófono en Windows.',
      'Высота тона': 'Tono', 'Меняет высоту голоса': 'Cambia el tono de voz', 'Сходство голоса': 'Similitud de voz',
      'Насколько точно передавать тембр модели': 'Fidelidad a la voz del modelo', 'Уровень микрофона': 'Nivel del micrófono',
      'Усиление исходного сигнала': 'Ganancia de entrada', 'Громкость результата': 'Volumen de salida',
      'Уровень обработанного голоса': 'Nivel de voz procesada', 'Аудиодвижок': 'Motor de audio', 'Микрофон': 'Micrófono',
      'Виртуальный кабель': 'Cable virtual', 'Настройка Discord': 'Configuración de Discord', 'доступно': 'disponibles',
      'подключи микрофон': 'conecta un micrófono', 'нужен для передачи в Discord': 'necesario para enviar audio a Discord',
      'микрофон Discord → CABLE Output': 'micrófono de Discord → CABLE Output', 'нет доступа к списку устройств': 'lista de dispositivos no disponible',
      'Загрузка модели…': 'Cargando modelo…', 'Не удалось загрузить студию': 'No se pudo cargar el estudio',
      'Не удалось начать обработку': 'No se pudo iniciar el procesamiento',
    },
    de: {
      'РАБОЧЕЕ ПРОСТРАНСТВО': 'ARBEITSBEREICH', 'Студия': 'Studio', 'Голоса': 'Stimmen', 'Настройки': 'Einstellungen',
      'ЛОКАЛЬНЫЙ ДВИЖОК': 'LOKALE ENGINE', 'Запускается…': 'Wird gestartet…', 'Движок готов': 'Engine bereit',
      'NVIDIA GPU недоступна': 'NVIDIA-GPU nicht verfügbar', 'Ошибка подключения': 'Verbindungsfehler',
      'РАБОТАЕТ НА ЭТОМ ПК': 'LÄUFT AUF DIESEM PC', 'Диагностика': 'Diagnose', 'Голосовая студия': 'Sprachstudio',
      'Выбери голос, настрой тембр и направь звук в нужное приложение.': 'Wähle eine Stimme, passe sie an und leite den Ton an eine App weiter.',
      'ОЖИДАНИЕ': 'BEREIT', 'В ЭФИРЕ': 'LIVE', 'ПОДКЛЮЧЕНИЕ': 'VERBINDEN', 'GPU НЕ НАЙДЕНА': 'GPU NICHT GEFUNDEN',
      'ГОТОВ К СТАРТУ': 'STARTKLAR', 'ОБРАБОТКА АКТИВНА': 'VERARBEITUNG AKTIV', 'ПОДКЛЮЧАЕМ УСТРОЙСТВА': 'GERÄTE VERBINDEN',
      'ПРОВЕРЬ NVIDIA GPU': 'NVIDIA-GPU PRÜFEN', 'Твой голос,': 'Deine Stimme,', 'новый тембр.': 'ein neuer Klang.',
      'Обработка идёт локально на видеокарте. Для начала выбери голос и нажми кнопку.': 'Die Verarbeitung läuft lokal auf der GPU. Wähle eine Stimme und starte die Verarbeitung.',
      'ВХОД': 'EINGANG', 'ВЫХОД': 'AUSGANG', 'Выбери голос': 'Stimme auswählen', 'Остановить обработку': 'Verarbeitung stoppen',
      'Начать обработку': 'Verarbeitung starten', 'Маршрутизация звука': 'Audio-Routing',
      'Выбери микрофон и устройство, куда отправлять голос.': 'Wähle ein Mikrofon und das Zielgerät für die Stimme.',
      'Обновить список устройств': 'Geräteliste aktualisieren', 'МИКРОФОН': 'MIKROFON', 'Поиск устройств…': 'Geräte werden gesucht…',
      'Отсюда берётся исходный голос': 'Eingang für die Originalstimme', 'Устройство вывода': 'Ausgabegerät',
      'Виртуальный кабель — для Discord': 'Virtuelles Kabel für Discord', 'Проверить': 'Prüfen', 'Состояние системы': 'Systemstatus',
      'Быстрые проверки перед звонком или записью.': 'Schnellprüfung vor einem Anruf oder einer Aufnahme.',
      'Нажми «Проверить», чтобы посмотреть состояние.': 'Klicke auf „Prüfen“, um den Status anzuzeigen.', 'БИБЛИОТЕКА': 'BIBLIOTHEK',
      'Текущий:': 'Aktuell:', 'не выбран': 'keine ausgewählt', 'Библиотека пока пуста': 'Deine Bibliothek ist leer',
      'Добавь свою RVC-модель .pth и, если есть, соответствующий индекс .index.': 'Füge ein RVC-.pth-Modell und, falls vorhanden, die passende .index-Datei hinzu.',
      'Выбрать модель': 'Modell auswählen', 'Добавить голос': 'Stimme hinzufügen', 'Настройка голоса': 'Spracheinstellungen',
      'Подстрой результат под себя.': 'Passe das Ergebnis an.', 'Сбросить': 'Zurücksetzen', 'Уровни сигнала': 'Signalpegel',
      'Внешний вид': 'Darstellung', 'Язык': 'Sprache', 'Цветовая тема': 'Farbschema',
      'Графитовая · лайм': 'Graphit · Limette', 'Океаническая · голубая': 'Ozean · Blau', 'Ночная · фиолетовая': 'Nacht · Violett',
      'Используешь Discord?': 'Verwendest du Discord?', 'Вывод Tembr → CABLE Input': 'Tembr-Ausgabe → CABLE Input',
      'Микрофон Discord → CABLE Output': 'Discord-Mikrofon → CABLE Output',
      'Tembr обрабатывает звук только на этом компьютере.': 'Tembr verarbeitet Audio nur auf diesem Computer.',
      'Открыть журнал': 'Protokoll öffnen', 'Повторить запуск': 'Erneut versuchen', 'Настройки голоса сброшены.': 'Spracheinstellungen zurückgesetzt.',
      'Устройство не найдено': 'Gerät nicht gefunden', 'Не найден микрофон. Подключи устройство и нажми кнопку обновления.': 'Kein Mikrofon gefunden. Schließe eines an und aktualisiere die Liste.',
      'Не найдено устройство вывода. Проверь подключение динамиков или наушников.': 'Kein Ausgabegerät gefunden. Prüfe Lautsprecher oder Kopfhörer.',
      'Не удалось получить список аудиоустройств. Проверь разрешение на микрофон в Windows.': 'Audiogeräte konnten nicht aufgelistet werden. Prüfe die Mikrofonberechtigung in Windows.',
      'Высота тона': 'Tonhöhe', 'Меняет высоту голоса': 'Ändert die Tonhöhe', 'Сходство голоса': 'Stimmähnlichkeit',
      'Насколько точно передавать тембр модели': 'Ähnlichkeit mit der Modellstimme', 'Уровень микрофона': 'Mikrofonpegel',
      'Усиление исходного сигнала': 'Eingangsverstärkung', 'Громкость результата': 'Ausgabelautstärke',
      'Уровень обработанного голоса': 'Pegel der verarbeiteten Stimme', 'Аудиодвижок': 'Audio-Engine', 'Микрофон': 'Mikrofon',
      'Виртуальный кабель': 'Virtuelles Kabel', 'Настройка Discord': 'Discord-Einrichtung', 'доступно': 'verfügbar',
      'подключи микрофон': 'Mikrofon anschließen', 'нужен для передачи в Discord': 'für die Übertragung an Discord erforderlich',
      'микрофон Discord → CABLE Output': 'Discord-Mikrofon → CABLE Output', 'нет доступа к списку устройств': 'Geräteliste nicht verfügbar',
      'Загрузка модели…': 'Modell wird geladen…', 'Не удалось загрузить студию': 'Studio konnte nicht geladen werden',
      'Не удалось начать обработку': 'Verarbeitung konnte nicht gestartet werden',
    },
  };

  Object.assign(translations.en, {
    'Подключаем…': 'Connecting…', 'Остановить преобразование': 'Stop conversion', 'Начать преобразование': 'Start conversion',
    'Обработка звука': 'Processing audio', 'Добавь модель .pth и выбери голос, чтобы включить преобразование.': 'Add a .pth model and choose a voice to enable conversion.',
    'Нажми кнопку или Ctrl + Shift + Space, чтобы начать.': 'Press the button or Ctrl + Shift + Space to start.',
    'Добавить голос (.pth и необязательный .index)': 'Add voice (.pth and optional .index)',
    'Не удалось загрузить голос': 'Could not load voice', 'Ошибка модели': 'Model error', 'Выбери файл модели': 'Choose a model file',
    'Нужен файл .pth. Соответствующий .index можно выбрать вместе с ним.': 'A .pth file is required. You can also select its matching .index file.',
    'Добавляем голос…': 'Adding voice…', 'Модель и индекс добавлены.': 'Model and index added.',
    'Модель добавлена. Она будет работать без индекса.': 'Model added. It will work without an index.',
    'Не удалось добавить голос': 'Could not add voice', 'Ошибка загрузки': 'Loading error', 'Ошибка конвертации': 'Conversion error',
    'Ошибка обработки голоса': 'Voice processing error', 'Связь с аудиодвижком потеряна': 'Connection to the audio engine was lost',
    'Проверь работу GPU и повторно запусти преобразование.': 'Check the GPU and start conversion again.', 'Движок отключён': 'Engine disconnected',
    'Аудиодвижок не ответил за 10 секунд.': 'The audio engine did not respond within 10 seconds.',
    'Соединение с аудиодвижком закрыто.': 'The audio engine connection was closed.', 'Не удалось соединиться с аудиодвижком.': 'Could not connect to the audio engine.',
    'Голос пока идёт на системный выход': 'Audio is still routed to the system output',
    'После запуска выбери устройство в списке и подтверди его в появившемся окне выбора звука.': 'Choose an output device after starting and confirm it in the audio picker.',
    'Нет доступа к микрофону': 'Microphone access denied', 'Не удалось запустить обработку': 'Could not start processing',
    'Аудиодвижок доступен': 'Audio engine available', 'локальный сервер отвечает': 'Local server is responding',
    'Модель голоса загружена': 'Voice model loaded', 'готова к обработке': 'Ready to process', 'GPU не найдена': 'GPU not found',
    'добавь RVC-модель в библиотеку': 'Add an RVC model to the library', 'Аудиоустройства': 'Audio devices',
    'Не удалось переключить микрофон': 'Could not switch microphone', 'Ошибка микрофона': 'Microphone error',
    'Выходное устройство не подтверждено': 'Output device not confirmed',
    'Выбор отменён. Звук останется на системном выходе; выбери устройство ещё раз, если нужен другой маршрут.': 'Selection cancelled. Audio remains on the system output; select another device to change the route.',
    'Подтверди устройство в появившемся окне выбора звука, затем повтори попытку.': 'Confirm the device in the audio picker, then try again.',
    'Устройство вывода выбрано.': 'Output device selected.', 'Смена выхода недоступна': 'Output switching unavailable',
    'Текущая аудиосреда не поддерживает выбор выходного устройства.': 'This audio environment does not support output device selection.',
    'Устройство вывода переключено.': 'Output device switched.', 'Не удалось переключить выход': 'Could not switch output',
    'Выбран голос': 'Voice selected', 'Не удалось загрузить студию': 'Could not load the studio',
  });

  Object.assign(translations.es, {
    'Подключаем…': 'Conectando…', 'Остановить преобразование': 'Detener conversión', 'Начать преобразование': 'Iniciar conversión',
    'Обработка звука': 'Procesando audio', 'Добавить голос (.pth и необязательный .index)': 'Añadir voz (.pth e .index opcional)',
    'Не удалось загрузить голос': 'No se pudo cargar la voz', 'Ошибка модели': 'Error del modelo', 'Выбери файл модели': 'Elige un archivo de modelo',
    'Нужен файл .pth. Соответствующий .index можно выбрать вместе с ним.': 'Se necesita un archivo .pth. También puedes elegir su archivo .index correspondiente.',
    'Добавляем голос…': 'Añadiendo voz…', 'Модель и индекс добавлены.': 'Modelo e índice añadidos.',
    'Модель добавлена. Она будет работать без индекса.': 'Modelo añadido. Funcionará sin índice.', 'Не удалось добавить голос': 'No se pudo añadir la voz',
    'Ошибка загрузки': 'Error de carga', 'Ошибка конвертации': 'Error de conversión', 'Ошибка обработки голоса': 'Error al procesar la voz',
    'Связь с аудиодвижком потеряна': 'Se perdió la conexión con el motor de audio',
    'Проверь работу GPU и повторно запусти преобразование.': 'Comprueba la GPU e inicia la conversión de nuevo.', 'Движок отключён': 'Motor desconectado',
    'Аудиодвижок не ответил за 10 секунд.': 'El motor de audio no respondió en 10 segundos.',
    'Соединение с аудиодвижком закрыто.': 'Se cerró la conexión con el motor de audio.', 'Не удалось соединиться с аудиодвижком.': 'No se pudo conectar con el motor de audio.',
    'Голос пока идёт на системный выход': 'El audio sigue en la salida del sistema',
    'После запуска выбери устройство в списке и подтверди его в появившемся окне выбора звука.': 'Después de iniciar, elige un dispositivo y confírmalo en la ventana de audio.',
    'Нет доступа к микрофону': 'Acceso al micrófono denegado', 'Не удалось запустить обработку': 'No se pudo iniciar el procesamiento',
    'Аудиодвижок доступен': 'Motor de audio disponible', 'локальный сервер отвечает': 'El servidor local responde',
    'Модель голоса загружена': 'Modelo de voz cargado', 'готова к обработке': 'Lista para procesar', 'GPU не найдена': 'GPU no detectada',
    'добавь RVC-модель в библиотеку': 'Añade un modelo RVC a la biblioteca', 'Аудиоустройства': 'Dispositivos de audio',
    'Не удалось переключить микрофон': 'No se pudo cambiar el micrófono', 'Ошибка микрофона': 'Error del micrófono',
    'Выходное устройство не подтверждено': 'Salida de audio sin confirmar', 'Устройство вывода выбрано.': 'Salida de audio seleccionada.',
    'Смена выхода недоступна': 'Cambio de salida no disponible', 'Текущая аудиосреда не поддерживает выбор выходного устройства.': 'Este entorno de audio no permite elegir la salida.',
    'Устройство вывода переключено.': 'Salida de audio cambiada.', 'Не удалось переключить выход': 'No se pudo cambiar la salida',
    'Выбран голос': 'Voz seleccionada', 'Не удалось загрузить студию': 'No se pudo cargar el estudio',
  });

  Object.assign(translations.de, {
    'Подключаем…': 'Verbinden…', 'Остановить преобразование': 'Umwandlung stoppen', 'Начать преобразование': 'Umwandlung starten',
    'Обработка звука': 'Audio wird verarbeitet', 'Добавить голос (.pth и необязательный .index)': 'Stimme hinzufügen (.pth und optional .index)',
    'Не удалось загрузить голос': 'Stimme konnte nicht geladen werden', 'Ошибка модели': 'Modellfehler', 'Выбери файл модели': 'Modelldatei auswählen',
    'Нужен файл .pth. Соответствующий .index можно выбрать вместе с ним.': 'Eine .pth-Datei ist erforderlich. Die passende .index-Datei kann mit ausgewählt werden.',
    'Добавляем голос…': 'Stimme wird hinzugefügt…', 'Модель и индекс добавлены.': 'Modell und Index hinzugefügt.',
    'Модель добавлена. Она будет работать без индекса.': 'Modell hinzugefügt. Es funktioniert auch ohne Index.', 'Не удалось добавить голос': 'Stimme konnte nicht hinzugefügt werden',
    'Ошибка загрузки': 'Ladefehler', 'Ошибка конвертации': 'Umwandlungsfehler', 'Ошибка обработки голоса': 'Sprachverarbeitungsfehler',
    'Связь с аудиодвижком потеряна': 'Verbindung zur Audio-Engine verloren',
    'Проверь работу GPU и повторно запусти преобразование.': 'Prüfe die GPU und starte die Umwandlung erneut.', 'Движок отключён': 'Engine getrennt',
    'Аудиодвижок не ответил за 10 секунд.': 'Die Audio-Engine hat innerhalb von 10 Sekunden nicht geantwortet.',
    'Соединение с аудиодвижком закрыто.': 'Die Verbindung zur Audio-Engine wurde geschlossen.', 'Не удалось соединиться с аудиодвижком.': 'Verbindung zur Audio-Engine fehlgeschlagen.',
    'Голос пока идёт на системный выход': 'Audio wird weiterhin über den Systemausgang ausgegeben',
    'После запуска выбери устройство в списке и подтверди его в появившемся окне выбора звука.': 'Wähle nach dem Start ein Gerät aus und bestätige es im Audiofenster.',
    'Нет доступа к микрофону': 'Mikrofonzugriff verweigert', 'Не удалось запустить обработку': 'Verarbeitung konnte nicht gestartet werden',
    'Аудиодвижок доступен': 'Audio-Engine verfügbar', 'локальный сервер отвечает': 'Lokaler Server antwortet',
    'Модель голоса загружена': 'Stimmenmodell geladen', 'готова к обработке': 'Bereit zur Verarbeitung', 'GPU не найдена': 'GPU nicht gefunden',
    'добавь RVC-модель в библиотеку': 'Füge der Bibliothek ein RVC-Modell hinzu', 'Аудиоустройства': 'Audiogeräte',
    'Не удалось переключить микрофон': 'Mikrofon konnte nicht gewechselt werden', 'Ошибка микрофона': 'Mikrofonfehler',
    'Выходное устройство не подтверждено': 'Ausgabegerät nicht bestätigt', 'Устройство вывода выбрано.': 'Ausgabegerät ausgewählt.',
    'Смена выхода недоступна': 'Ausgabewechsel nicht verfügbar', 'Текущая аудиосреда не поддерживает выбор выходного устройства.': 'Diese Audio-Umgebung unterstützt keine Auswahl des Ausgabegeräts.',
    'Устройство вывода переключено.': 'Ausgabegerät gewechselt.', 'Не удалось переключить выход': 'Ausgabegerät konnte nicht gewechselt werden',
    'Выбран голос': 'Stimme ausgewählt', 'Не удалось загрузить студию': 'Studio konnte nicht geladen werden',
  });

  const reverse = Object.fromEntries(Object.entries(translations).map(([locale, entries]) => [
    locale, new Map(Object.entries(entries).map(([source, translated]) => [translated, source])),
  ]));
  const sources = new WeakMap();
  let locale = 'ru';

  function translateNode(node) {
    const text = node.nodeValue;
    if (!text || !text.trim()) return;
    const leading = text.match(/^\s*/)?.[0] || '';
    const trailing = text.match(/\s*$/)?.[0] || '';
    const visible = text.trim();
    const source = sources.get(node) || reverse[locale]?.get(visible) || visible;
    sources.set(node, source);
    const result = translations[locale]?.[source] || source;
    const next = `${leading}${result}${trailing}`;
    if (node.nodeValue !== next) node.nodeValue = next;
  }

  function translateSubtree(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      translateNode(node);
      return;
    }
    node.childNodes?.forEach(translateSubtree);
  }

  function setLanguage(next) {
    locale = translations[next] ? next : 'ru';
    document.documentElement.lang = locale;
    document.querySelectorAll('body *').forEach((element) => {
      element.childNodes.forEach((node) => { if (node.nodeType === Node.TEXT_NODE) translateNode(node); });
    });
    try { localStorage.setItem('tembr.ui.language', locale); } catch { }
    window.dispatchEvent(new CustomEvent('tembr:localechange', { detail: { locale } }));
  }

  function setTheme(next) {
    const allowed = ['graphite', 'ocean', 'violet'];
    const theme = allowed.includes(next) ? next : 'graphite';
    document.documentElement.dataset.theme = theme === 'graphite' ? '' : theme;
    try { localStorage.setItem('tembr.ui.theme', theme); } catch { }
  }

  let savedLanguage = 'ru';
  let savedTheme = 'graphite';
  try {
    savedLanguage = localStorage.getItem('tembr.ui.language') || 'ru';
    savedTheme = localStorage.getItem('tembr.ui.theme') || 'graphite';
  } catch { }
  const languageSelect = document.getElementById('language-select');
  const themeSelect = document.getElementById('theme-select');
  if (languageSelect) {
    languageSelect.value = translations[savedLanguage] ? savedLanguage : 'ru';
    languageSelect.addEventListener('change', () => setLanguage(languageSelect.value));
  }
  if (themeSelect) {
    themeSelect.value = ['graphite', 'ocean', 'violet'].includes(savedTheme) ? savedTheme : 'graphite';
    themeSelect.addEventListener('change', () => setTheme(themeSelect.value));
  }
  translateSubtree(document.body);
  setLanguage(savedLanguage);
  setTheme(savedTheme);
  window.tembrLocale = () => locale;
  new MutationObserver((records) => {
    for (const record of records) {
      if (record.type === 'characterData') translateNode(record.target);
      record.addedNodes?.forEach(translateSubtree);
    }
  }).observe(document.body, { subtree: true, childList: true, characterData: true });
})();
