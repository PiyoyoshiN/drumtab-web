import type { Onset } from "./onsets";

export type TempoResult = { bpm: number; confidence: number };

export function estimateTempoFromOnsets(onsets: Onset[], opts?: { bpmMin?: number; bpmMax?: number }): TempoResult {
  const bpmMin = opts?.bpmMin ?? 70;
  const bpmMax = opts?.bpmMax ?? 200;

  if (onsets.length < 8) return { bpm: 120, confidence: 0 };

  const iois: number[] = [];
  for (let i = 1; i < onsets.length; i++) {
    const d = onsets[i].timeSec - onsets[i - 1].timeSec;
    if (d > 0.03 && d < 1.5) iois.push(d);
  }
  if (iois.length < 6) return { bpm: 120, confidence: 0 };

  const hist = new Map<number, number>();
  for (const d0 of iois) {
    for (const mul of [1, 2, 0.5]) {
      const d = d0 * mul;
      const bpm = 60 / d;
      if (bpm < bpmMin || bpm > bpmMax) continue;
      const bin = Math.round(bpm);
      hist.set(bin, (hist.get(bin) ?? 0) + 1);
    }
  }

  let bestBpm = 120;
  let best = -1;
  let total = 0;
  for (const v of hist.values()) total += v;
  for (const [b, v] of hist.entries()) {
    if (v > best) { best = v; bestBpm = b; }
  }

  const confidence = total > 0 ? best / total : 0;
  return { bpm: bestBpm, confidence };
}