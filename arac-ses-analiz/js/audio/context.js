/** Tarayıcıda tek bir AudioContext paylaşılır (kayıt, çözümleme ve çalma için). */
let ctx = null;

export function audioContext() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

let playing = null;

/** Çalan örnek sesi durdurur. */
export function stopPlayback() {
  if (playing) { try { playing.stop(); } catch { /* zaten durmuş */ } playing = null; }
}

/** Mono örnekleri hoparlörden çalar. */
export function playSamples(samples, sr) {
  stopPlayback();
  const ac = audioContext();
  const buffer = ac.createBuffer(1, samples.length, sr);
  buffer.copyToChannel(samples, 0);
  const source = ac.createBufferSource();
  source.buffer = buffer;
  source.connect(ac.destination);
  source.start();
  playing = source;
}
