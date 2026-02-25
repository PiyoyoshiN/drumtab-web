import { fftRealToComplex } from "./fft";
import { hann } from "./window";

export type Onset = { timeSec: number; strength: number };

export function detectOnsetsFFT(
  mono: Float32Array,
  sampleRate: number,
  opts?: { frameSize?: number; hopSize?: number; threshold?: number; minGapMs?: number }
): Onset[] {
  const frameSize = opts?.frameSize ?? 2048;
  const hop = opts?.hopSize ?? 512;
  const threshold = opts?.threshold ?? 0.35;
  const minGap = (opts?.minGapMs ?? 35) / 1000;

  const w = hann(frameSize);
  const nFrames = Math.max(0, Math.floor((mono.length - frameSize) / hop) + 1);

  const flux = new Float32Array(nFrames);
  let prevMag: Float32Array | null = null;

  for (let f = 0; f < nFrames; f++) {
    const off = f * hop;
    const frame = new Float32Array(frameSize);
    for (let i = 0; i < frameSize; i++) frame[i] = (mono[off + i] ?? 0) * w[i];

    const { re, im } = fftRealToComplex(frame);
    const mag = new Float32Array(frameSize >> 1);
    for (let k = 0; k < mag.length; k++) mag[k] = Math.hypot(re[k], im[k]);

    if (prevMag) {
      let s = 0;
      for (let k = 0; k < mag.length; k++) {
        const d = mag[k] - prevMag[k];
        if (d > 0) s += d;
      }
      flux[f] = s;
    }
    prevMag = mag;
  }

  const norm = normalize01(flux);

  const out: Onset[] = [];
  let lastT = -999;

  for (let i = 1; i < norm.length - 1; i++) {
    const v = norm[i];

    // 微弱ノイズ除去
    if (v < threshold) continue;

    // ローカルピークのみ
    if (!(v > norm[i - 1] && v >= norm[i + 1])) continue;

    const t = (i * hop) / sampleRate;
    if (t - lastT < minGap) continue;

    out.push({ timeSec: t, strength: v });
    lastT = t;
  }

  return out;
}

function normalize01(x: Float32Array) {
  let mx = 1e-9;
  for (let i = 0; i < x.length; i++) mx = Math.max(mx, x[i]);
  const out = new Float32Array(x.length);
  for (let i = 0; i < x.length; i++) out[i] = x[i] / mx;
  return out;
}