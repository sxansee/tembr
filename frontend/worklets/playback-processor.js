// playback-processor.js
// Принимает обработанные чанки из главного потока (пришли по WebSocket)
// и отдаёт их на выход небольшими порциями по 128 сэмплов за раз —
// так требует спецификация AudioWorklet. Кольцевой буфер сглаживает
// неравномерность прихода сетевых сообщений, чтобы не было щелчков.

class PlaybackProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.ringSize = 48000 * 2; // 2 секунды запаса — с большим запасом под любую частоту
    this.ring = new Float32Array(this.ringSize);
    this.writePos = 0;
    this.readPos = 0;
    this.available = 0;

    this.port.onmessage = (event) => {
      let chunk = event.data;
      if (chunk.length >= this.ringSize) {
        chunk = chunk.subarray(chunk.length - this.ringSize);
        this.readPos = 0;
        this.writePos = 0;
        this.available = 0;
      } else if (this.available + chunk.length > this.ringSize) {
        const discard = this.available + chunk.length - this.ringSize;
        this.readPos = (this.readPos + discard) % this.ringSize;
        this.available -= discard;
      }
      for (let i = 0; i < chunk.length; i++) {
        this.ring[this.writePos] = chunk[i];
        this.writePos = (this.writePos + 1) % this.ringSize;
      }
      this.available += chunk.length;
    };
  }

  process(inputs, outputs) {
    const output = outputs[0]?.[0];
    if (!output) return true;
    for (let i = 0; i < output.length; i++) {
      if (this.available > 0) {
        output[i] = this.ring[this.readPos];
        this.readPos = (this.readPos + 1) % this.ringSize;
        this.available--;
      } else {
        output[i] = 0; // буфер опустел — тишина, а не мусор
      }
    }
    return true;
  }
}

registerProcessor('playback-processor', PlaybackProcessor);
