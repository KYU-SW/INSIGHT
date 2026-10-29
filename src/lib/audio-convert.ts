export const SERVER_AUDIO_EXTENSIONS = [".wav", ".flac", ".ogg"];
const TARGET_RATE = 16000;

export function needsConversion(file: File) {
  const name = file.name.toLowerCase();
  return !SERVER_AUDIO_EXTENSIONS.some(ext => name.endsWith(ext));
}

function encodeWav(samples: Float32Array, rate: number) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const text = (offset: number, value: string) => { for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i)); };
  text(0, "RIFF"); view.setUint32(4, 36 + samples.length * 2, true); text(8, "WAVE"); text(12, "fmt ");
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, rate, true); view.setUint32(28, rate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  text(36, "data"); view.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const clipped = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, clipped < 0 ? clipped * 0x8000 : clipped * 0x7fff, true);
  }
  return buffer;
}

/** Decode m4a/mp3/aac/webm etc. with the browser codec and re-encode as 16 kHz mono PCM16 WAV. */
export async function convertToWav(file: File): Promise<File> {
  const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) throw new Error("이 브라우저는 오디오 변환을 지원하지 않습니다. WAV/FLAC/OGG 파일을 사용하세요.");
  const context = new AudioCtx();
  try {
    let decoded: AudioBuffer;
    try { decoded = await context.decodeAudioData(await file.arrayBuffer()); }
    catch { throw new Error("이 오디오 형식을 읽을 수 없습니다. WAV/FLAC/OGG 파일을 사용하세요."); }
    const frames = Math.max(1, Math.ceil(decoded.duration * TARGET_RATE));
    const offline = new OfflineAudioContext(1, frames, TARGET_RATE);
    const source = offline.createBufferSource();
    source.buffer = decoded;
    source.connect(offline.destination); // multi-channel input is down-mixed to mono by the destination
    source.start();
    const rendered = await offline.startRendering();
    const name = file.name.replace(/\.[^.]+$/, "") || "recording";
    return new File([encodeWav(rendered.getChannelData(0), TARGET_RATE)], `${name}.wav`, { type: "audio/wav" });
  } finally { void context.close(); }
}
