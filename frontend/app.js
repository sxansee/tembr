// ===== Конфигурация =====
let VOICES = []; // заполняется с бэкенда через /model/list — см. loadVoiceList()

const FADERS = [
  { key: 'pitch', label: 'Тон', min: -12, max: 12, step: 1, value: 0, signed: true },
  { key: 'index_rate', label: 'Индекс', min: 0, max: 1, step: 0.05, value: 0.5 },
  { key: 'gain_in', label: 'Усиление · вход', min: 0, max: 2, step: 0.1, value: 1 },
  { key: 'gain_out', label: 'Усиление · выход', min: 0, max: 2, step: 0.1, value: 1 },
];

const SAMPLE_RATE = 48000;
const CHUNK_MS = 200;

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
  settings: { pitch: 0, index_rate: 0.5, gain_in: 1, gain_out: 1 },
};

// ===== Мелкие утилиты =====
function injectCornerDots() {
  document.querySelectorAll('.panel').forEach((panel) => {
    ['tl', 'tr', 'bl', 'br'].forEach((pos) => {
      const dot = document.createElement('span');
      dot.className = `corner-dot ${pos}`;
      panel.appendChild(dot);
    });
  });
}

function rms(float32arr) {
  let sum = 0;
  for (let i = 0; i < float32arr.length; i++) sum += float32arr[i] * float32arr[i];
  return Math.sqrt(sum / float32arr.length);
}

// ===== Сегментные метры =====
function createMeter(container) {
  const segments = 28;
  const bars = [];
  for (let i = 0; i < segments; i++) {
    const bar = document.createElement('div');
    bar.className = 'segment';
    container.appendChild(bar);
    bars.push(bar);
  }
  return function setLevel(level01) {
    const lit = Math.round(Math.max(0, Math.min(1, level01)) * segments);
    bars.forEach((bar, i) => {
      const isLit = i < lit;
      bar.classList.toggle('lit', isLit);
      bar.classList.toggle('lit-hot', isLit && i / segments > 0.6 && i / segments <= 0.85);
      bar.classList.toggle('lit-peak', isLit && i / segments > 0.85);
    });
  };
}

let setInLevel = () => {};
let setOutLevel = () => {};

// ===== Голоса =====
async function loadVoiceList() {
  try {
    const res = await fetch('/model/list');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    VOICES = (data.voices || []).map((v) => ({
      name: v.name,
      tag: v.index ? 'RVC' : 'RVC · без индекса',
      file: v.file,
      index: v.index,
    }));
    state.activeName = data.active || null;
  } catch (e) {
    console.error('[Тембр] Не удалось получить список голосов:', e);
    VOICES = [];
  }
}

function renderVoices(selectName) {
  const row = document.getElementById('voice-row');
  row.innerHTML = '';

  if (VOICES.length === 0) {
    const hint = document.createElement('p');
    hint.className = 'voice-tag';
    hint.textContent = 'Пока пусто — добавь .pth файл';
    row.appendChild(hint);
  }

  VOICES.forEach((v) => {
    const isSelected = selectName ? v.name === selectName : v.name === state.activeName;
    const btn = document.createElement('button');
    btn.className = 'voice-chip' + (isSelected ? ' active' : '');
    const name = document.createElement('span');
    name.className = 'voice-name';
    name.textContent = v.name;
    const tag = document.createElement('span');
    tag.className = 'voice-tag';
    tag.textContent = v.tag;
    btn.append(name, tag);
    btn.addEventListener('click', () => {
      loadVoice(v).then((loaded) => {
        if (loaded) renderVoices(v.name);
      });
    });
    row.appendChild(btn);
  });

  const addBtn = document.createElement('button');
  addBtn.className = 'voice-chip voice-add';
  addBtn.id = 'voice-add-btn';
  addBtn.title = 'Добавить голос (.pth + .index)';
  addBtn.innerHTML = '<span class="voice-add-icon">+</span>';
  addBtn.addEventListener('click', () => document.getElementById('voice-upload-input').click());
  row.appendChild(addBtn);
}

function setupVoiceUpload() {
  const input = document.getElementById('voice-upload-input');
  input.addEventListener('change', async () => {
    const files = Array.from(input.files);
    const pth = files.find((f) => f.name.toLowerCase().endsWith('.pth'));
    const index = files.find((f) => f.name.toLowerCase().endsWith('.index'));

    if (!pth) {
      alert('Нужен файл .pth с моделью (можно выбрать сразу и .index вместе с ним).');
      input.value = '';
      return;
    }

    const addBtn = document.getElementById('voice-add-btn');
    const originalLabel = addBtn.innerHTML;
    addBtn.innerHTML = '<span class="voice-add-icon">…</span>';
    addBtn.disabled = true;

    const formData = new FormData();
    formData.append('pth_file', pth);
    if (index) formData.append('index_file', index);

    try {
      const res = await fetch('/model/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) {
        alert('Не загрузилось: ' + (data.detail || 'неизвестная ошибка'));
        return;
      }
      if (!index) {
        alert(`Файл ${data.uploaded} загружен без .index. Голос работает без retrieval-индекса.`);
      }
      await loadVoiceList();
      const voice = VOICES.find((v) => v.file === data.uploaded);
      if (voice && await loadVoice(voice)) renderVoices(voice.name);
    } catch (e) {
      alert('Ошибка загрузки: ' + e.message);
    } finally {
      addBtn.innerHTML = originalLabel;
      addBtn.disabled = false;
      input.value = '';
    }
  });
}

async function loadVoice(voice) {
  try {
    setConnStatus(`загрузка: ${voice.name}`);
    const query = new URLSearchParams({ filename: voice.file });
    if (voice.index) query.set('index', voice.index);
    const res = await fetch(`/model/load?${query}`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
    state.activeName = data.loaded || voice.name;
    updateStartAvailability();
    setConnStatus('модель готова');
    return true;
  } catch (e) {
    console.error('[Тембр] Не удалось загрузить модель:', e);
    setConnStatus(`ошибка модели: ${e.message}`);
    return false;
  }
}

// ===== Фейдеры =====
function renderFaders() {
  const container = document.getElementById('faders');
  FADERS.forEach((f) => {
    const wrap = document.createElement('div');
    wrap.className = 'fader';

    const head = document.createElement('div');
    head.className = 'fader-head';
    const label = document.createElement('span');
    label.textContent = f.label;
    const value = document.createElement('span');
    value.className = 'fader-value';
    value.textContent = formatFaderValue(f, f.value);
    head.append(label, value);

    const input = document.createElement('input');
    input.type = 'range';
    input.min = f.min;
    input.max = f.max;
    input.step = f.step;
    input.value = f.value;
    input.addEventListener('input', (e) => {
      const v = Math.round(parseFloat(e.target.value) * 100) / 100;
      state.settings[f.key] = v;
      value.textContent = formatFaderValue(f, v);
      sendSettings({ [f.key]: v });
    });

    wrap.append(head, input);
    container.appendChild(wrap);
  });
}

function formatFaderValue(f, v) {
  return (f.signed && v > 0 ? '+' : '') + v;
}

// ===== WebSocket =====
function sendSettings(partial) {
  if (state.ws && state.ws.readyState === WebSocket.OPEN) {
    state.ws.send(JSON.stringify({ type: 'settings', ...partial }));
  }
}

function connectWS() {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  const ws = new WebSocket(`${proto}://${location.host}/ws/convert`);
  ws.binaryType = 'arraybuffer';
  state.ws = ws;
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error('сервер не ответил за 10 секунд'));
    }, 10000);
    ws.onopen = () => {
      clearTimeout(timeout);
      ws.send(JSON.stringify({ type: 'settings', ...state.settings, sample_rate: SAMPLE_RATE }));
      setConnStatus('подключено');
      resolve();
    };
    ws.onclose = () => {
      state.inFlight = false;
      clearTimeout(timeout);
      setConnStatus('отключено');
      if (ws.readyState !== WebSocket.OPEN) reject(new Error('WebSocket закрыт'));
    };
    ws.onerror = () => {
      clearTimeout(timeout);
      setConnStatus('ошибка соединения');
      reject(new Error('не удалось соединиться с сервером'));
    };
    ws.onmessage = (event) => {
      if (typeof event.data === 'string') {
        let msg;
        try { msg = JSON.parse(event.data); } catch { return; }
        if (msg.type === 'level') {
          setOutLevel(msg.out || 0);
          const metrics = document.getElementById('stream-metrics');
          if (metrics) metrics.textContent = `${msg.inference_ms ?? '—'} мс · пропущено ${state.droppedChunks}`;
        } else if (msg.type === 'error') {
          state.inFlight = false;
          console.error('[Тембр] Ошибка конвертации:', msg.message);
          setConnStatus(`ошибка конвертации: ${msg.message}`);
        }
        return;
      }
      state.inFlight = false;
      const floatData = new Float32Array(event.data);
      if (state.playbackNode) state.playbackNode.port.postMessage(floatData, [floatData.buffer]);
    };
  });
}

function setConnStatus(text) {
  const elm = document.getElementById('conn-status');
  if (elm) elm.textContent = text;
}

// ===== Аудио-граф =====
async function startAudio() {
  if (!state.activeName) throw new Error('сначала загрузи или выбери голос');
  state.droppedChunks = 0;
  const inputDeviceId = document.getElementById('input-select').value;
  const outputDeviceId = document.getElementById('output-select').value;

  state.mediaStream = await navigator.mediaDevices.getUserMedia({
    audio: {
      deviceId: inputDeviceId ? { exact: inputDeviceId } : undefined,
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
    },
  });

  // --- захват ---
  state.audioCtx = new AudioContext({ sampleRate: SAMPLE_RATE, latencyHint: 'interactive' });
  await state.audioCtx.resume();
  await state.audioCtx.audioWorklet.addModule('worklets/capture-processor.js');
  const source = state.audioCtx.createMediaStreamSource(state.mediaStream);
  state.captureNode = new AudioWorkletNode(state.audioCtx, 'capture-processor', {
    processorOptions: { chunkSize: Math.round(state.audioCtx.sampleRate * CHUNK_MS / 1000) },
  });
  source.connect(state.captureNode);
  // Некоторые браузеры замораживают process() у узлов без пути к destination —
  // держим узел "живым" тихим (gain=0) путём до выхода, звук наружу не идёт.
  const silentGain = state.audioCtx.createGain();
  silentGain.gain.value = 0;
  state.captureNode.connect(silentGain);
  silentGain.connect(state.audioCtx.destination);

  state.captureNode.port.onmessage = (event) => {
    const chunk = event.data;
    setInLevel(Math.min(rms(chunk) * 4, 1));
    if (state.ws && state.ws.readyState === WebSocket.OPEN) {
      if (state.inFlight) {
        state.droppedChunks++;
        return;
      }
      try {
        state.inFlight = true;
        state.ws.send(chunk.buffer);
      } catch (e) {
        state.inFlight = false;
        setConnStatus(`ошибка отправки: ${e.message}`);
      }
    }
  };

  // --- воспроизведение ---
  await state.audioCtx.audioWorklet.addModule('worklets/playback-processor.js');
  state.playbackNode = new AudioWorkletNode(state.audioCtx, 'playback-processor', {
    outputChannelCount: [1],
  });
  const dest = state.audioCtx.createMediaStreamDestination();
  state.playbackNode.connect(dest);

  const audioEl = document.getElementById('output-audio');
  audioEl.srcObject = dest.stream;
  if (outputDeviceId && typeof audioEl.setSinkId === 'function') {
    try {
      await audioEl.setSinkId(outputDeviceId);
    } catch (e) {
      console.warn('[Тембр] setSinkId не сработал (это нормально в Firefox — там его нет):', e);
    }
  }
  await audioEl.play();

  await connectWS();
  await populateDevices();
}

async function stopAudio() {
  const ws = state.ws;
  state.ws = null;
  state.inFlight = false;
  state.mediaStream?.getTracks().forEach((t) => t.stop());
  ws?.close();
  await state.audioCtx?.close();
  state.mediaStream = null;
  state.audioCtx = null;
  state.captureNode = null;
  state.playbackNode = null;
  setInLevel(0);
  setOutLevel(0);
  setConnStatus('не подключено');
}

// ===== Устройства =====
async function populateDevices() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    fillSelect('input-select', devices.filter((d) => d.kind === 'audioinput'));
    fillSelect('output-select', devices.filter((d) => d.kind === 'audiooutput'));
  } catch (e) {
    console.warn('[Тембр] Не удалось получить список устройств:', e);
  }
}

function fillSelect(id, devices) {
  const select = document.getElementById(id);
  const current = select.value;
  select.innerHTML = '';
  devices.forEach((d, i) => {
    const opt = document.createElement('option');
    opt.value = d.deviceId;
    opt.textContent = d.label || `Устройство ${i + 1}`;
    select.appendChild(opt);
  });
  if (current && devices.some((d) => d.deviceId === current)) select.value = current;
}

// ===== Диагностика =====
// "discord" намеренно без авто-проверки: у веб-страницы физически нет
// доступа к настройкам другого приложения. Оставляем как ручной пункт,
// а не притворяемся, что можем это проверить.
const DIAG_STEPS = [
  { id: 'mic', label: 'Устройство аудиовхода доступно', check: checkMic },
  { id: 'engine', label: 'Движок RVC запущен', check: checkEngine },
  { id: 'cable', label: 'Виртуальный кабель в списке устройств', check: checkCable },
  { id: 'discord', label: 'Discord слушает CABLE Output — проверь руками', check: null },
];

async function checkMic() {
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices.some((d) => d.kind === 'audioinput');
}

async function checkEngine() {
  try {
    const res = await fetch('/health');
    const data = await res.json();
    return Boolean(data.active_model);
  } catch {
    return false;
  }
}

async function checkCable() {
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices.some((d) => d.kind === 'audiooutput' && /cable/i.test(d.label || ''));
}

async function runDiagnostics() {
  const list = document.getElementById('diag-list');
  const btn = document.getElementById('diag-btn');
  btn.disabled = true;
  list.innerHTML = '';
  for (const step of DIAG_STEPS) {
    const row = document.createElement('div');
    row.className = 'diag-row';
    row.innerHTML = `<span class="diag-icon">…</span><span class="diag-label">${step.label}</span>`;
    list.appendChild(row);

    if (step.check === null) {
      row.classList.add('diag-manual');
      row.querySelector('.diag-icon').textContent = '!';
      continue;
    }
    await new Promise((r) => setTimeout(r, 150));
    let ok = false;
    try { ok = await step.check(); } catch (e) { console.warn('[Тембр] Проверка не удалась:', e); }
    row.classList.add(ok ? 'diag-ok' : 'diag-warn');
    row.querySelector('.diag-icon').textContent = ok ? '✓' : '✕';
  }
  btn.disabled = false;
}

// ===== Старт/стоп =====
function updateStartButton() {
  const button = document.getElementById('start-btn');
  button.classList.toggle('running', state.running);
  button.disabled = state.starting || (!state.running && !state.activeName);
  document.getElementById('status-dot').classList.toggle('running', state.running);
  document.getElementById('start-label').textContent = state.starting ? 'Запуск…' : (state.running ? 'Стоп' : 'Старт');
  document.getElementById('status-text').textContent = state.starting ? 'подключение' : (state.running ? 'обработка активна' : 'ожидание');
}

function updateStartAvailability() {
  updateStartButton();
}

// ===== Инициализация =====
async function init() {
  injectCornerDots();
  setInLevel = createMeter(document.getElementById('meter-in'));
  setOutLevel = createMeter(document.getElementById('meter-out'));
  await loadVoiceList();
  renderVoices();
  if (!state.activeName && VOICES.length) {
    if (await loadVoice(VOICES[0])) renderVoices(VOICES[0].name);
  }
  setupVoiceUpload();
  renderFaders();
  populateDevices();
  updateStartButton();

  document.getElementById('start-btn').addEventListener('click', async () => {
    if (!state.running && !state.starting) {
      state.starting = true;
      updateStartButton();
      try {
        await startAudio();
        state.running = true;
      } catch (e) {
        console.error('[Тембр] Не удалось запустить:', e);
        await stopAudio();
        setConnStatus('ошибка: ' + e.message);
      }
    } else {
      await stopAudio();
      state.running = false;
    }
    state.starting = false;
    updateStartButton();
  });

  document.getElementById('diag-btn').addEventListener('click', runDiagnostics);

  document.getElementById('output-select').addEventListener('change', async (event) => {
    if (!state.running) return;
    const audioEl = document.getElementById('output-audio');
    if (typeof audioEl.setSinkId !== 'function') {
      setConnStatus('выбор выхода доступен в Chrome/Edge');
      return;
    }
    try { await audioEl.setSinkId(event.target.value); }
    catch (e) { setConnStatus(`ошибка выбора выхода: ${e.message}`); }
  });

  document.getElementById('input-select').addEventListener('change', () => {
    if (state.running) setConnStatus('чтобы сменить микрофон, останови и запусти снова');
  });

  if (navigator.mediaDevices.addEventListener) {
    navigator.mediaDevices.addEventListener('devicechange', populateDevices);
  }
}

init();
