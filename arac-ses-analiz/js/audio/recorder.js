import { audioContext } from "./context.js";

export const recordingSupported = () =>
  !!(navigator.mediaDevices?.getUserMedia && window.MediaRecorder);

/**
 * Mikrofondan kayıt başlatır.
 * Gürültü bastırma ve otomatik kazanç kapatılır; bunlar makine seslerini bozar.
 * @returns {Promise<{analyser: AnalyserNode, stop: () => void, done: Promise<Blob>}>}
 */
export async function startRecording() {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
  });
  const ac = audioContext();
  const analyser = ac.createAnalyser();
  analyser.fftSize = 2048;
  const source = ac.createMediaStreamSource(stream);
  source.connect(analyser);

  const chunks = [];
  const recorder = new MediaRecorder(stream);
  recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
  const done = new Promise(resolve => {
    recorder.onstop = () => {
      source.disconnect();
      stream.getTracks().forEach(t => t.stop());
      resolve(new Blob(chunks, { type: chunks[0]?.type || recorder.mimeType || "audio/webm" }));
    };
  });
  recorder.start();
  return { analyser, done, stop: () => { if (recorder.state !== "inactive") recorder.stop(); } };
}

/**
 * Ses ya da video dosyasını mono örneklere çözer.
 * @param {Blob} blob
 * @returns {Promise<{samples: Float32Array, sr: number}>}
 */
export async function decodeToMono(blob) {
  const data = await blob.arrayBuffer();
  const ac = audioContext();
  const buffer = await new Promise((resolve, reject) => {
    const p = ac.decodeAudioData(data, resolve, reject);
    if (p?.then) p.then(resolve, reject);
  });
  const samples = new Float32Array(buffer.length);
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const ch = buffer.getChannelData(c);
    for (let i = 0; i < samples.length; i++) samples[i] += ch[i] / buffer.numberOfChannels;
  }
  return { samples, sr: buffer.sampleRate };
}
