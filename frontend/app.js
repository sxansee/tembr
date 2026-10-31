// ===== Параметры и состояние приложения =====
const DEFAULTS = { pitch: 0, index_rate: 0.5, gain_in: 1, gain_out: 1 };
const FADERS = [
  { key: 'pitch', label: 'Высота тона', hint: 'Меняет высоту голоса', min: -12, max: 12, step: 1, group: 'main' },
  { key: 'index_rate', label: 'Сходство голоса', hint: 'Насколько точно передавать тембр модели', min: 0, max: 1, step: 0.05, group: 'main' },
  { key: 'gain_in', label: 'Уровень микрофона', hint: 'Усиление исходного сигнала', min: 0, max: 2, step: 0.1, group: 'advanced' },
  { key: 'gain_out', label: 'Громкость результата', hint: 'Уровень обработанного голоса', min: 0, max: 2, step: 0.1, group: 'advanced' },
];

const SAMPLE_RATE = 48000;
const CHUNK_MS = 200;
const STORAGE_KEY = 'tembr.studio.settings.v1';
let VOICES = [];
let toastTimer;
let waveFrame = 0;

const state = {
  running: false,
  starting: false,
  inFlight: false,
  ws: null,
  audioCtx: null,
  captureNode: null,
  playbackNode: null,
  mediaStream: null,
  activeName: null,
  droppedChunks: 0,
  inputLevel: 0,
  outputLevel: 0,
  cudaAvailable: null,
  gpuName: null,
  settings: { ...DEFAULTS },
};

// ===== Уведомления и параметры =====
function showNotice(title, message) {
  document.getElementById('notice-title').textContent = title;
  document.getElementById('notice-message').textContent = message;
  document.getElementById('notice').hidden = false;
  document.getElementById('notice').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function hideNotice() {
  document.getElementById('notice').hidden = true;
}

function showToast(message) {
  const toast = document.getElementById('toast');
  document.getElementById('toast-message').textContent = message;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 3200);
}

function restoreSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    for (const fader of FADERS) {
      const value = Number(saved[fader.key]);
      if (Number.isFinite(value) && value >= fader.min && value <= fader.max) {
        state.settings[fader.key] = value;
      }
    }
  } catch (error) {
    console.warn('[Tembr] Не удалось восстановить настройки:', error);
  }
}

function saveSettings() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.settings)); }
  catch (error) { console.warn('[Tembr] Не удалось сохранить настройки:', error); }
}

function formatFaderValue(fader, value) {
  if (fader.key === 'pitch') return `${value > 0 ? '+' : ''}${value} st`;
  if (fader.key === 'index_rate') return `${Math.round(value * 100)}%`;
  return `${Number(value).toFixed(1)}×`;
}

function renderFaders() {
  document.getElementById('faders').replaceChildren();
  document.getElementById('advanced-faders').replaceChildren();

  for (const fader of FADERS) {
    const container = document.getElementById(fader.group === 'main' ? 'faders' : 'advanced-faders');
    const wrap = document.createElement('div');
    wrap.className = 'fader';

    const head = document.createElement('div');
    head.className = 'fader-head';
    const labelWrap = document.createElement('label');
    labelWrap.className = 'fader-label-wrap';
    labelWrap.htmlFor = `fader-${fader.key}`;
    labelWrap.textContent = fader.label;
    const hint = document.createElement('span');
    hint.className = 'fader-help';
    hint.textContent = fader.hint;
    labelWrap.append(hint);
    const value = document.createElement('span');
    value.className = 'fader-value';
    value.textContent = formatFaderValue(fader, state.settings[fader.key]);
    head.append(labelWrap, value);

    const input = document.createElement('input');
    input.id = `fader-${fader.key}`;
    input.type = 'range';
    input.min = fader.min;
    input.max = fader.max;
    input.step = fader.step;
    input.value = state.settings[fader.key];
    input.setAttribute('aria-label', fader.label);
    input.addEventListener('input', () => {
      const nextValue = Math.round(Number(input.value) * 100) / 100;
      state.settings[fader.key] = nextValue;
      value.textContent = formatFaderValue(fader, nextValue);
      saveSettings();
      sendSettings({ [fader.key]: nextValue });
    });

    wrap.append(head, input);
    container.append(wrap);
  }
}

function resetSettings() {
  state.settings = { ...DEFAULTS };
  saveSettings();
  renderFaders();
  sendSettings(state.settings);
  showToast('Настройки голоса сброшены.');
}

// ===== Уровни и визуализация сигнала =====
function createMeter(container, valueNode) {
  const segmentCount = 30;
  const bars = [];
  container.replaceChildren();
  for (let i = 0; i < segmentCount; i++) {
    const bar = document.createElement('span');
    bar.className = 'segment';
    container.append(bar);
    bars.push(bar);
  }

  return (level) => {
    const normalized = Math.max(0, Math.min(1, level));
    const lit = Math.round(normalized * segmentCount);
    bars.forEach((bar, index) => {
      const on = index < lit;
      bar.classList.toggle('lit', on);
      bar.classList.toggle('lit-hot', on && index / segmentCount > 0.66 && index / segmentCount <= 0.86);
      bar.classList.toggle('lit-peak', on && index / segmentCount > 0.86);
    });
    container.setAttribute('aria-valuenow', String(Math.round(normalized * 100)));
    valueNode.textContent = normalized > 0.0001
      ? `${Math.max(-60, Math.round(20 * Math.log10(normalized)))} dB`
      : '−∞ dB';
  };
}

let setInLevel = () => {};
let setOutLevel = () => {};

function drawWave() {
  const canvas = document.getElementById('wave-canvas');
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(1, Math.round(rect.width * pixelRatio));
  const height = Math.max(1, Math.round(rect.height * pixelRatio));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  const context = canvas.getContext('2d');
  context.clearRect(0, 0, width, height);
  const count = Math.max(48, Math.floor(rect.width / 7));
  const palette = getComputedStyle(document.documentElement);
  const accentRgb = palette.getPropertyValue('--accent-rgb').trim();
  const tealRgb = palette.getPropertyValue('--teal-rgb').trim();
  const center = height * 0.5;
  const spacing = width / count;
  const activeLevel = Math.max(state.inputLevel, state.outputLevel);
  const pulse = state.running ? 1 : 0.16;
  const time = performance.now() / 600;
  for (let i = 0; i < count; i++) {
    const envelope = Math.sin((i / count) * Math.PI) ** 0.45;
    const wave = Math.abs(Math.sin(i * 0.48 + time) * 0.55 + Math.cos(i * 0.19 - time * 0.7) * 0.45);
    const heightRatio = (0.08 + activeLevel * 0.72 + wave * pulse * (0.14 + activeLevel * 0.36)) * envelope;
    const barHeight = Math.max(2, height * heightRatio * 0.66);
    const x = i * spacing + spacing * 0.34;
    const alpha = 0.32 + envelope * 0.55;
    context.fillStyle = i > count * 0.69 ? `rgba(${accentRgb},${alpha})` : `rgba(${tealRgb},${alpha})`;
    context.beginPath();
    context.roundRect(x, center - barHeight / 2, Math.max(1, spacing * 0.34), barHeight, 2 * pixelRatio);
    context.fill();
  }
  waveFrame = requestAnimationFrame(drawWave);
}

function setConnectionStatus(text, kind = 'idle') {
  document.getElementById('conn-status').textContent = text;
  const statusDot = document.getElementById('status-dot');
  statusDot.classList.remove('ready', 'running', 'error');
  if (kind !== 'idle') statusDot.classList.add(kind);
}

function updateLiveState() {
  const statusText = document.getElementById('status-text');
  const pill = document.getElementById('engine-pill');
  const signalState = document.getElementById('signal-state');
  const signalLabel = document.getElementById('signal-label');
  const start = document.getElementById('start-btn');

  pill.classList.remove('ready', 'running', 'error');
  signalState.classList.remove('running', 'waiting');
  if (state.running) {
    statusText.textContent = 'В ЭФИРЕ';
    pill.classList.add('running');
    signalState.classList.add('running');
    signalLabel.textContent = 'ОБРАБОТКА АКТИВНА';
  } else if (state.starting) {
    statusText.textContent = 'ПОДКЛЮЧЕНИЕ';
    signalState.classList.add('waiting');
    signalLabel.textContent = 'ПОДКЛЮЧАЕМ УСТРОЙСТВА';
  } else {
    statusText.textContent = 'ОЖИДАНИЕ';
    pill.classList.add('ready');
    signalLabel.textContent = 'ГОТОВ К СТАРТУ';
  }

  if (state.cudaAvailable === false) {
    pill.classList.remove('ready');
    pill.classList.add('error');
    statusText.textContent = 'GPU НЕ НАЙДЕНА';
    signalLabel.textContent = 'ПРОВЕРЬ NVIDIA GPU';
  }

  const label = document.getElementById('start-label');
  document.getElementById('start-play-icon').hidden = state.running || state.starting;
  document.getElementById('start-stop-icon').hidden = !state.running;
  start.classList.toggle('running', state.running);
  start.disabled = state.starting || (!state.running && (!state.activeName || state.cudaAvailable !== true));
  label.textContent = state.starting
    ? 'Подключаем…'
    : (state.running ? 'Остановить преобразование' : (state.activeName ? 'Начать преобразование' : 'Выбери голос'));

  const help = document.getElementById('start-help');
  if (state.cudaAvailable === false) {
    help.textContent = 'Для обработки в реальном времени требуется доступная NVIDIA GPU.';
  } else if (state.running) {
    help.textContent = 'Обработка активна. Нажми кнопку или Ctrl + Shift + Space, чтобы остановить.';
  } else if (state.starting) {
    help.textContent = 'Разреши доступ к микрофону, если Windows покажет запрос.';
  } else if (!state.activeName) {
    help.textContent = 'Добавь модель .pth и выбери голос, чтобы включить преобразование.';
  } else {
    help.textContent = 'Нажми кнопку или Ctrl + Shift + Space, чтобы начать.';
  }

  if (state.running) setConnectionStatus('Обработка звука', 'running');
  else if (state.cudaAvailable === true) setConnectionStatus('Движок готов', 'ready');
  else if (state.cudaAvailable === false) setConnectionStatus('NVIDIA GPU недоступна', 'error');
}

// ===== Модели голосов =====
async function loadVoiceList() {
  const response = await fetch('/model/list');
  if (!response.ok) throw new Error(`Список моделей: HTTP ${response.status}`);
  const data = await response.json();
  VOICES = (data.voices || []).map((voice) => ({
    name: voice.name,
    tag: voice.index ? 'RVC · индекс' : 'RVC · без индекса',
    file: voice.file,
    index: voice.index,
  }));
  state.activeName = data.active || null;
  renderVoices();
}

function pluralVoices(count) {
  const locale = document.documentElement.lang;
  if (locale === 'en') return `${count} ${count === 1 ? 'voice' : 'voices'}`;
  if (locale === 'es') return `${count} ${count === 1 ? 'voz' : 'voces'}`;
  if (locale === 'de') return `${count} ${count === 1 ? 'Stimme' : 'Stimmen'}`;
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} голос`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} голоса`;
  return `${count} голосов`;
}

function initials(name) {
  return name.split(/[\s_-]+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'R';
}

function renderVoices() {
  const row = document.getElementById('voice-row');
  row.replaceChildren();
  document.getElementById('voice-count').textContent = pluralVoices(VOICES.length);
  document.getElementById('selected-voice-name').textContent = state.activeName || 'не выбран';

  if (VOICES.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'voice-empty';
    const mark = document.createElement('span');
    mark.className = 'voice-empty-mark';
    mark.textContent = '♪';
    const title = document.createElement('strong');
    title.textContent = 'Библиотека пока пуста';
    const hint = document.createElement('p');
    hint.textContent = 'Добавь свою RVC-модель .pth и, если есть, соответствующий индекс .index.';
    const add = createAddVoiceButton(true);
    empty.append(mark, title, hint, add);
    row.append(empty);
  } else {
    for (const voice of VOICES) {
      const selected = voice.name === state.activeName;
      const button = document.createElement('button');
      button.className = `voice-chip${selected ? ' active' : ''}`;
      button.type = 'button';
      button.setAttribute('aria-pressed', String(selected));
      button.title = `Использовать голос «${voice.name}»`;

      const avatar = document.createElement('span');
      avatar.className = 'voice-avatar';
      avatar.textContent = initials(voice.name);
      const copy = document.createElement('span');
      copy.className = 'voice-chip-copy';
      const name = document.createElement('span');
      name.className = 'voice-name';
      name.textContent = voice.name;
      const tag = document.createElement('span');
      tag.className = 'voice-tag';
      tag.textContent = voice.tag;
      copy.append(name, tag);
      const check = document.createElement('span');
      check.className = 'voice-check';
      check.textContent = selected ? '✓' : '';
      button.append(avatar, copy, check);
      button.addEventListener('click', async () => {
        if (selected || button.disabled) return;
        button.disabled = true;
        const loaded = await loadVoice(voice);
        if (loaded) {
          renderVoices();
          hideNotice();
          showToast(`Выбран голос «${voice.name}».`);
        } else {
          button.disabled = false;
        }
      });
      row.append(button);
    }
    row.append(createAddVoiceButton(false));
  }

  updateLiveState();
}

function createAddVoiceButton(emptyState) {
  const button = document.createElement('button');
  button.id = emptyState ? 'voice-add-empty' : 'voice-add-btn';
  button.className = 'voice-chip voice-add';
  button.type = 'button';
  button.title = 'Добавить голос (.pth и необязательный .index)';
  const icon = document.createElement('span');
  icon.className = 'voice-add-icon';
  icon.textContent = '+';
  const label = document.createElement('span');
  label.className = 'voice-add-label';
  label.textContent = emptyState ? 'Выбрать модель' : 'Добавить голос';
  button.append(icon, label);
  if (!emptyState) {
    const hint = document.createElement('span');
    hint.className = 'voice-add-hint';
    hint.textContent = '.PTH  +  .INDEX';
    button.append(hint);
  }
  button.addEventListener('click', () => document.getElementById('voice-upload-input').click());
  return button;
}

async function loadVoice(voice) {
  setConnectionStatus(`Загружаем «${voice.name}»…`, 'idle');
  try {
    const query = new URLSearchParams({ filename: voice.file });
    if (voice.index) query.set('index', voice.index);
    const response = await fetch(`/model/load?${query}`, { method: 'POST' });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || `HTTP ${response.status}`);
    state.activeName = data.loaded || voice.name;
    updateLiveState();
    setConnectionStatus('Движок готов', 'ready');
    return true;
  } catch (error) {
    console.error('[Tembr] Не удалось загрузить модель:', error);
    showNotice('Не удалось загрузить голос', error.message);
    setConnectionStatus('Ошибка модели', 'error');
    return false;
  }
}

function setupVoiceUpload() {
  const input = document.getElementById('voice-upload-input');
  input.addEventListener('change', async () => {
    const files = Array.from(input.files || []);
    const pth = files.find((file) => file.name.toLowerCase().endsWith('.pth'));
    const index = files.find((file) => file.name.toLowerCase().endsWith('.index'));
    if (!pth) {
      showNotice('Выбери файл модели', 'Нужен файл .pth. Соответствующий .index можно выбрать вместе с ним.');
      input.value = '';
      return;
    }

    const addButton = document.querySelector('.voice-add');
    if (addButton) addButton.disabled = true;
    hideNotice();
    setConnectionStatus('Добавляем голос…', 'idle');
    const formData = new FormData();
    formData.append('pth_file', pth);
    if (index) formData.append('index_file', index);

    try {
      const response = await fetch('/model/upload', { method: 'POST', body: formData });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || `HTTP ${response.status}`);
      await loadVoiceList();
      const uploaded = VOICES.find((voice) => voice.file === data.uploaded);
      if (uploaded) await loadVoice(uploaded);
      renderVoices();
      setConnectionStatus('Движок готов', 'ready');
      showToast(index ? 'Модель и индекс добавлены.' : 'Модель добавлена. Она будет работать без индекса.');
    } catch (error) {
      showNotice('Не удалось добавить голос', error.message);
      setConnectionStatus('Ошибка загрузки', 'error');
    } finally {
      input.value = '';
      const add = document.querySelector('.voice-add');
      if (add) add.disabled = false;
    }
  });
}

// ===== Сервер и WebSocket =====
async function loadEngineStatus() {
  const response = await fetch('/health');
  if (!response.ok) throw new Error(`Аудиодвижок: HTTP ${response.status}`);
  const data = await response.json();
  state.cudaAvailable = Boolean(data.cuda_available);
  state.gpuName = data.gpu_name || null;
  document.getElementById('stream-metrics').textContent = state.cudaAvailable
    ? `GPU · ${state.gpuName || 'NVIDIA готова'} · инференс — · пропуски 0`
    : 'GPU · не найдена';
  updateLiveState();
  return data;
}

function sendSettings(partial) {
  if (state.ws?.readyState === WebSocket.OPEN) {
    state.ws.send(JSON.stringify({ type: 'settings', ...partial }));
  }
}

function connectWS() {
  const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
  const ws = new WebSocket(`${protocol}://${location.host}/ws/convert`);
  ws.binaryType = 'arraybuffer';
  state.ws = ws;

  return new Promise((resolve, reject) => {
    let opened = false;
    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error('Аудиодвижок не ответил за 10 секунд.'));
    }, 10000);

    ws.onopen = () => {
      opened = true;
      clearTimeout(timeout);
      ws.send(JSON.stringify({ type: 'settings', ...state.settings, sample_rate: SAMPLE_RATE }));
      setConnectionStatus('Обработка звука', 'running');
      resolve();
    };
    ws.onclose = () => {
      state.inFlight = false;
      clearTimeout(timeout);
      if (state.ws === ws) {
        state.ws = null;
        if (state.running) {
          state.running = false;
          void releaseAudio(false).finally(() => {
            updateLiveState();
            showNotice('Связь с аудиодвижком потеряна', 'Проверь работу GPU и повторно запусти преобразование.');
          });
        } else {
          setConnectionStatus('Движок отключён', 'idle');
        }
      }
      if (!opened) reject(new Error('Соединение с аудиодвижком закрыто.'));
    };
    ws.onerror = () => {
      clearTimeout(timeout);
      if (!opened) reject(new Error('Не удалось соединиться с аудиодвижком.'));
    };
    ws.onmessage = (event) => {
      if (typeof event.data === 'string') {
        let message;
        try { message = JSON.parse(event.data); } catch { return; }
        if (message.type === 'level') {
          state.outputLevel = message.out || 0;
          setOutLevel(state.outputLevel);
          const gpu = state.gpuName ? `GPU · ${state.gpuName}` : 'GPU';
          document.getElementById('stream-metrics').textContent =
            `${gpu} · инференс ${message.inference_ms ?? '—'} мс · пропуски ${state.droppedChunks}`;
        } else if (message.type === 'error') {
          state.inFlight = false;
          console.error('[Tembr] Ошибка конвертации:', message.message);
          setConnectionStatus(`Ошибка конвертации: ${message.message}`, 'error');
          showNotice('Ошибка обработки голоса', message.message);
        }
        return;
      }
      state.inFlight = false;
      const floatData = new Float32Array(event.data);
      if (state.playbackNode) state.playbackNode.port.postMessage(floatData, [floatData.buffer]);
    };
  });
}

// ===== Захват и воспроизведение аудио =====
function readStoredDevice(key) {
  try { return localStorage.getItem(`tembr.device.${key}`) || ''; }
  catch { return ''; }
}

function storeDevice(key, value) {
  try { localStorage.setItem(`tembr.device.${key}`, value); }
  catch (error) { console.warn('[Tembr] Не удалось сохранить аудиоустройство:', error); }
}

async function startAudio() {
  if (!state.activeName) throw new Error('Сначала выбери или добавь голосовую модель.');
  if (state.cudaAvailable !== true) throw new Error('Для обработки голоса требуется доступная NVIDIA GPU.');
  state.droppedChunks = 0;
  state.inputLevel = 0;
  state.outputLevel = 0;

  const inputDeviceId = document.getElementById('input-select').value;
  const outputDeviceId = document.getElementById('output-select').value;
  const audioConstraints = {
    echoCancellation: false,
    noiseSuppression: false,
    autoGainControl: false,
  };
  if (inputDeviceId) audioConstraints.deviceId = { exact: inputDeviceId };
  state.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });

  state.audioCtx = new AudioContext({ sampleRate: SAMPLE_RATE, latencyHint: 'interactive' });
  await state.audioCtx.resume();
  await state.audioCtx.audioWorklet.addModule('worklets/capture-processor.js');
  const source = state.audioCtx.createMediaStreamSource(state.mediaStream);
  state.captureNode = new AudioWorkletNode(state.audioCtx, 'capture-processor', {
    processorOptions: { chunkSize: Math.round(state.audioCtx.sampleRate * CHUNK_MS / 1000) },
  });
  source.connect(state.captureNode);

  // Keep the capture worklet alive without monitoring the dry microphone.
  const silentGain = state.audioCtx.createGain();
  silentGain.gain.value = 0;
  state.captureNode.connect(silentGain);
  silentGain.connect(state.audioCtx.destination);

  state.captureNode.port.onmessage = (event) => {
    const chunk = event.data;
    let squares = 0;
    for (let i = 0; i < chunk.length; i++) squares += chunk[i] * chunk[i];
    state.inputLevel = Math.min(Math.sqrt(squares / chunk.length) * 4, 1);
    setInLevel(state.inputLevel);
    if (!state.ws || state.ws.readyState !== WebSocket.OPEN) return;
    if (state.inFlight) {
      state.droppedChunks++;
      return;
    }
    try {
      state.inFlight = true;
      state.ws.send(chunk.buffer);
    } catch (error) {
      state.inFlight = false;
      setConnectionStatus(`Ошибка отправки: ${error.message}`, 'error');
    }
  };

  await state.audioCtx.audioWorklet.addModule('worklets/playback-processor.js');
  state.playbackNode = new AudioWorkletNode(state.audioCtx, 'playback-processor', { outputChannelCount: [1] });
  const destination = state.audioCtx.createMediaStreamDestination();
  state.playbackNode.connect(destination);

  const output = document.getElementById('output-audio');
  output.srcObject = destination.stream;
  if (outputDeviceId && typeof output.setSinkId === 'function') {
    try {
      await output.setSinkId(outputDeviceId);
    } catch (error) {
      console.warn('[Tembr] Выходное устройство пока не разрешено:', error);
      showNotice('Голос пока идёт на системный выход', 'После запуска выбери устройство в списке и подтверди его в появившемся окне выбора звука.');
    }
  }
  await output.play();
  await connectWS();
  await populateDevices();
}

async function releaseAudio(closeSocket = true) {
  const ws = state.ws;
  state.ws = null;
  state.inFlight = false;
  state.mediaStream?.getTracks().forEach((track) => track.stop());
  if (closeSocket) ws?.close();
  const audioContext = state.audioCtx;
  state.audioCtx = null;
  if (audioContext && audioContext.state !== 'closed') {
    try { await audioContext.close(); } catch (error) { console.warn('[Tembr] Не удалось закрыть AudioContext:', error); }
  }
  state.mediaStream = null;
  state.captureNode = null;
  state.playbackNode = null;
  document.getElementById('output-audio').srcObject = null;
  state.inputLevel = 0;
  state.outputLevel = 0;
  setInLevel(0);
  setOutLevel(0);
}

async function stopAudio() {
  await releaseAudio(true);
  setConnectionStatus('Движок готов', state.cudaAvailable ? 'ready' : 'idle');
}

async function toggleAudio() {
  if (state.starting) return;
  hideNotice();
  if (state.running) {
    state.starting = true;
    updateLiveState();
    await stopAudio();
    state.running = false;
    state.starting = false;
    updateLiveState();
    return;
  }

  state.starting = true;
  updateLiveState();
  try {
    await startAudio();
    state.running = true;
    setConnectionStatus('Обработка звука', 'running');
  } catch (error) {
    console.error('[Tembr] Не удалось начать обработку:', error);
    await releaseAudio(true);
    state.running = false;
    const permissionError = error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError';
    showNotice(
      permissionError ? 'Нет доступа к микрофону' : 'Не удалось запустить обработку',
      permissionError
        ? 'Разреши Tembr доступ к микрофону в Windows: Параметры → Конфиденциальность и безопасность → Микрофон.'
        : error.message,
    );
    setConnectionStatus('Ошибка запуска', 'error');
  } finally {
    state.starting = false;
    updateLiveState();
  }
}

// ===== Устройства и маршрутизация =====
async function populateDevices() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const inputs = devices.filter((device) => device.kind === 'audioinput');
    const outputs = devices.filter((device) => device.kind === 'audiooutput');
    fillSelect('input-select', inputs, readStoredDevice('input'), 'Микрофон');
    fillSelect('output-select', outputs, readStoredDevice('output'), 'Устройство вывода');

    const notice = document.getElementById('device-notice');
    if (!inputs.length) {
      notice.textContent = 'Не найден микрофон. Подключи устройство и нажми кнопку обновления.';
      notice.hidden = false;
    } else if (!outputs.length) {
      notice.textContent = 'Не найдено устройство вывода. Проверь подключение динамиков или наушников.';
      notice.hidden = false;
    } else {
      notice.hidden = true;
    }
  } catch (error) {
    console.warn('[Tembr] Не удалось получить список устройств:', error);
    const notice = document.getElementById('device-notice');
    notice.textContent = 'Не удалось получить список аудиоустройств. Проверь разрешение на микрофон в Windows.';
    notice.hidden = false;
  }
}

function fillSelect(id, devices, preferredId, fallbackLabel) {
  const select = document.getElementById(id);
  const current = select.value || preferredId;
  select.replaceChildren();
  if (!devices.length) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'Устройство не найдено';
    select.append(option);
    select.disabled = true;
    return;
  }
  select.disabled = false;
  devices.forEach((device, index) => {
    const option = document.createElement('option');
    option.value = device.deviceId;
    option.textContent = device.label || `${fallbackLabel} ${index + 1}`;
    select.append(option);
  });
  if (current && devices.some((device) => device.deviceId === current)) select.value = current;
  else if (preferredId && devices.some((device) => device.deviceId === preferredId)) select.value = preferredId;
}

async function changeInputDevice() {
  const select = document.getElementById('input-select');
  storeDevice('input', select.value);
  if (!state.running) return;
  state.starting = true;
  state.running = false;
  updateLiveState();
  await releaseAudio(true);
  try {
    await startAudio();
    state.running = true;
    showToast('Микрофон переключён.');
  } catch (error) {
    await releaseAudio(true);
    showNotice('Не удалось переключить микрофон', error.message);
    setConnectionStatus('Ошибка микрофона', 'error');
  } finally {
    state.starting = false;
    updateLiveState();
  }
}

async function changeOutputDevice(event) {
  const select = event.target;
  const requestedDeviceId = select.value;
  const previousDeviceId = readStoredDevice('output');
  let outputDeviceId = requestedDeviceId;

  // WebView2 may require an explicit output-device selection before a
  // non-default sink can be used. This API must be called from the user's
  // device-selection gesture, so keep it here rather than during startup.
  if (typeof navigator.mediaDevices.selectAudioOutput === 'function') {
    try {
      const selectedDevice = await navigator.mediaDevices.selectAudioOutput({ deviceId: requestedDeviceId });
      outputDeviceId = selectedDevice.deviceId;
    } catch (error) {
      select.value = previousDeviceId && Array.from(select.options).some((option) => option.value === previousDeviceId)
        ? previousDeviceId
        : (select.options[0]?.value || '');
      showNotice(
        'Выходное устройство не подтверждено',
        error.name === 'NotAllowedError'
          ? 'Выбор отменён. Звук останется на системном выходе; выбери устройство ещё раз, если нужен другой маршрут.'
          : 'Подтверди устройство в появившемся окне выбора звука, затем повтори попытку.',
      );
      return;
    }
  }

  storeDevice('output', outputDeviceId);
  if (outputDeviceId !== requestedDeviceId) {
    await populateDevices();
    select.value = outputDeviceId;
  }
  if (!state.running) {
    showToast('Устройство вывода выбрано.');
    return;
  }
  const output = document.getElementById('output-audio');
  if (typeof output.setSinkId !== 'function') {
    showNotice('Смена выхода недоступна', 'Текущая аудиосреда не поддерживает выбор выходного устройства.');
    return;
  }
  try {
    await output.setSinkId(outputDeviceId);
    showToast('Устройство вывода переключено.');
  } catch (error) {
    showNotice('Не удалось переключить выход', error.message);
  }
}

// ===== Диагностика =====
async function runDiagnostics() {
  const list = document.getElementById('diag-list');
  const buttons = [document.getElementById('diag-btn'), document.getElementById('diag-run-btn')];
  buttons.forEach((button) => { button.disabled = true; });
  list.replaceChildren();

  const checks = [];
  try {
    const health = await loadEngineStatus();
    checks.push({ ok: true, label: 'Аудиодвижок доступен', detail: 'локальный сервер отвечает' });
    checks.push({ ok: health.cuda_available, label: 'NVIDIA GPU', detail: health.cuda_available ? (health.gpu_name || 'готова к обработке') : 'GPU не найдена' });
    checks.push({ ok: Boolean(health.active_model), label: 'Модель голоса загружена', detail: health.active_model || 'добавь RVC-модель в библиотеку' });
  } catch (error) {
    checks.push({ ok: false, label: 'Аудиодвижок', detail: error.message });
  }

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const inputs = devices.filter((device) => device.kind === 'audioinput');
    const outputs = devices.filter((device) => device.kind === 'audiooutput');
    checks.push({ ok: inputs.length > 0, label: 'Микрофон', detail: inputs.length ? `${inputs.length} доступно` : 'подключи микрофон' });
    const cable = outputs.some((device) => /cable/i.test(device.label || ''));
    checks.push({ optional: true, ok: cable, label: 'Виртуальный кабель', detail: cable ? 'доступен' : 'нужен для передачи в Discord' });
  } catch {
    checks.push({ ok: false, label: 'Аудиоустройства', detail: 'нет доступа к списку устройств' });
  }
  checks.push({ manual: true, label: 'Настройка Discord', detail: 'микрофон Discord → CABLE Output' });

  for (const check of checks) {
    const row = document.createElement('div');
    row.className = `diag-row ${check.manual ? 'diag-manual' : (check.ok ? 'diag-ok' : (check.optional ? 'diag-manual' : 'diag-warn'))}`;
    const icon = document.createElement('span');
    icon.className = 'diag-icon';
    icon.textContent = check.manual ? 'i' : (check.ok ? '✓' : (check.optional ? 'i' : '!'));
    const label = document.createElement('span');
    label.className = 'diag-label';
    label.textContent = check.label;
    const detail = document.createElement('span');
    detail.className = 'diag-detail';
    detail.textContent = check.detail;
    row.append(icon, label, detail);
    list.append(row);
  }
  buttons.forEach((button) => { button.disabled = false; });
}

// ===== Запуск и настройка интерфейса =====
async function init() {
  restoreSettings();
  setInLevel = createMeter(document.getElementById('meter-in'), document.getElementById('meter-in-value'));
  setOutLevel = createMeter(document.getElementById('meter-out'), document.getElementById('meter-out-value'));
  renderFaders();
  setupVoiceUpload();
  drawWave();

  document.getElementById('start-btn').addEventListener('click', toggleAudio);
  document.getElementById('reset-settings').addEventListener('click', resetSettings);
  document.getElementById('notice-close').addEventListener('click', hideNotice);
  document.getElementById('refresh-devices').addEventListener('click', () => populateDevices());
  document.getElementById('diag-btn').addEventListener('click', runDiagnostics);
  document.getElementById('diag-run-btn').addEventListener('click', runDiagnostics);
  document.getElementById('input-select').addEventListener('change', changeInputDevice);
  document.getElementById('output-select').addEventListener('change', changeOutputDevice);
  document.querySelectorAll('.nav-item').forEach((item) => item.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach((nav) => nav.classList.toggle('active', nav === item));
  }));

  window.addEventListener('keydown', (event) => {
    if (event.ctrlKey && event.shiftKey && event.code === 'Space') {
      event.preventDefault();
      void toggleAudio();
    }
    if (event.key === 'Escape' && state.running) void toggleAudio();
  });
  window.addEventListener('resize', () => {
    if (waveFrame) cancelAnimationFrame(waveFrame);
    drawWave();
  });

  try {
    await loadEngineStatus();
    await loadVoiceList();
    if (!state.activeName && VOICES.length) {
      const loaded = await loadVoice(VOICES[0]);
      if (loaded) renderVoices();
    }
    await populateDevices();
    setConnectionStatus(state.cudaAvailable ? 'Движок готов' : 'NVIDIA GPU недоступна', state.cudaAvailable ? 'ready' : 'error');
  } catch (error) {
    console.error('[Tembr] Не удалось подготовить студию:', error);
    setConnectionStatus('Ошибка подключения', 'error');
    showNotice('Не удалось загрузить студию', error.message);
  }
  updateLiveState();

  if (navigator.mediaDevices?.addEventListener) {
    navigator.mediaDevices.addEventListener('devicechange', populateDevices);
  }
  window.addEventListener('pagehide', () => { void releaseAudio(true); });
}

window.addEventListener('tembr:localechange', () => {
  if (document.getElementById('voice-count')) renderVoices();
  if (document.getElementById('status-text')) updateLiveState();
});

init();
