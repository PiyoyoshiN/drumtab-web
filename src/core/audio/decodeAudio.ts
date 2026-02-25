export type DecodedAudio = {
  sampleRate: number;
  channels: Float32Array[];
  mono: Float32Array;
  durationSec: number;
};

export async function decodeAudioFile(file: File): Promise<DecodedAudio> {
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const buf = await file.arrayBuffer();
  const audio = await ctx.decodeAudioData(buf);

  const sampleRate = audio.sampleRate;
  const channels: Float32Array[] = [];
  for (let ch = 0; ch < audio.numberOfChannels; ch++) {
    channels.push(audio.getChannelData(ch).slice());
  }

  const mono = mixToMono(channels);
  const durationSec = mono.length / sampleRate;

  try { await ctx.close(); } catch {}
  return { sampleRate, channels, mono, durationSec };
}

export async function decodeWavBytes(wavBytes: Uint8Array): Promise<DecodedAudio> {
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const ab = wavBytes.buffer.slice(
  wavBytes.byteOffset,
  wavBytes.byteOffset + wavBytes.byteLength
) as ArrayBuffer;

const audio = await ctx.decodeAudioData(ab);

  const sampleRate = audio.sampleRate;
  const channels: Float32Array[] = [];
  for (let ch = 0; ch < audio.numberOfChannels; ch++) {
    channels.push(audio.getChannelData(ch).slice());
  }

  const mono = mixToMono(channels);
  const durationSec = mono.length / sampleRate;

  try { await ctx.close(); } catch {}
  return { sampleRate, channels, mono, durationSec };
}

function mixToMono(chs: Float32Array[]) {
  if (chs.length === 1) return chs[0];
  const n = chs[0].length;
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let c = 0; c < chs.length; c++) s += chs[c][i] ?? 0;
    out[i] = s / chs.length;
  }
  return out;
}