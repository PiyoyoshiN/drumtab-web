import type { Onset } from "./onsets";
import { fftRealToComplex } from "./fft";
import { hann } from "./window";
import { bandsFromMag } from "./bands";

export type DrumClass = "kick" | "snare" | "hh" | "crash" | "ride";

export type ClassifiedHit = {
  timeSec: number;
  velocity: number;
  drum: DrumClass;
};

export function classifyHitsFFT(
  mono: Float32Array,
  sampleRate: number,
  onsets: Onset[],
  opts?: { frameSize?: number }
): ClassifiedHit[] {
  const frameSize = opts?.frameSize ?? 2048;
  const w = hann(frameSize);

  const hits: ClassifiedHit[] = [];

  for (const o of onsets) {
    const center = Math.floor(o.timeSec * sampleRate);
    const start = Math.max(0, center - Math.floor(frameSize / 2));

    const frame = new Float32Array(frameSize);
    for (let i = 0; i < frameSize; i++) frame[i] = (mono[start + i] ?? 0) * w[i];

    const { re, im } = fftRealToComplex(frame);
    const mag = new Float32Array(frameSize >> 1);
    for (let k = 0; k < mag.length; k++) mag[k] = Math.hypot(re[k], im[k]);

    const b = bandsFromMag(mag, sampleRate, frameSize);

    const drum = pickClass(b.low, b.mid, b.high, o.strength);
    const velocity = clamp01(0.12 + 0.92 * o.strength);

    hits.push({ timeSec: o.timeSec, velocity, drum });
  }

  return hits;
}

function pickClass(low: number, mid: number, high: number, strength: number): DrumClass {
  const sum = low + mid + high + 1e-9;
  const l = low / sum, m = mid / sum, h = high / sum;

  // kick：低域が支配的
  if (l > 0.55 && l > h * 2) return "kick";

  // 高域支配：HH/Crash/Rideの候補
  if (h > 0.55 && h > l * 2) {
    // 強い＆高域に偏る＝クラッシュ寄り（雑だけど効く）
    if (strength > 0.75 && m < 0.25) return "crash";
    // 中域がそこそこ＝ライド寄り（雑）
    if (m > 0.22) return "ride";
    return "hh";
  }

  // snare：中域優勢
  if (m > 0.38) return "snare";

  // 迷ったらhh
  return "hh";
}

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}