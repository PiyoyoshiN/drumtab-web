import type { DrumTrack } from "../model/types";

export type PhaseResult = { phaseSec: number; score: number };

export function estimateBeatPhase(track: DrumTrack, bpm: number, res: "8th" | "16th" | "32nd" = "16th"): PhaseResult {
  const div = res === "8th" ? 2 : res === "16th" ? 4 : 8;
  const secPerBeat = 60 / bpm;
  const secPerStep = secPerBeat / div;

  const N = 24;
  let bestPhase = 0;
  let bestScore = -1;

  for (let i = 0; i < N; i++) {
    const phase = (i / N) * secPerStep;
    let score = 0;

    for (const e of track.events) {
      const x = (e.timeSec - phase) / secPerStep;
      const dist = Math.abs(x - Math.round(x));
      const w = e.velocity;
      score += w * Math.exp(-20 * dist * dist);
    }

    if (score > bestScore) {
      bestScore = score;
      bestPhase = phase;
    }
  }

  return { phaseSec: bestPhase, score: bestScore };
}