// capture-processor.js
// Работает на отдельном аудио-потоке браузера (не на главном потоке).
// Копит сэмплы в буфер фиксированного размера и отправляет целыми чанками
// в основной поток через port.postMessage — оттуда они уйдут в WebSocket.

class CaptureProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.chunkSize = (options.processorOptions && options.processorOptions.chunkSize) || 4800;
    this.buffer = new Float32Array(this.chunkSize);
    this.writeIndex = 0;
  }

  process(inputs) {
    const input = inputs[0];
    if (input && input.length > 0) {
      const channelData = input[0]; // моно — берём первый канал
      for (let i = 0; i < channelData.length; i++) {
        this.buffer[this.writeIndex++] = channelData[i];
        if (this.writeIndex >= this.chunkSize) {
          const chunkCopy = this.buffer.slice(0);
          // передаём владение буфером (transferable) — без лишнего копирования
          this.port.postMessage(chunkCopy, [chunkCopy.buffer]);
          this.writeIndex = 0;
        }
      }
    }
    return true; // false остановил бы процессор насовсем
  }
}

registerProcessor('capture-processor', CaptureProcessor);
