import type { DrumTrack } from "./types";

export type GridResolution = "8th" | "16th" | "32nd";

export function quantizeTrackWithPhase(
  track: DrumTrack,
  strength: number,
  res: GridResolution = "16th",
  phaseSec = 0
): DrumTrack {
  const bpm = track.bpm ?? 120;
  const secPerBeat = 60 / bpm;
  const div = res === "8th" ? 2 : res === "16th" ? 4 : 8;
  const secPerStep = secPerBeat / div;

  const s = clamp01(strength);

  return {
    bpm: track.bpm,
    events: track.events.map((e) => {
      const x = (e.timeSec - phaseSec) / secPerStep;
      const q = Math.round(x) * secPerStep + phaseSec;
      return { ...e, timeSec: lerp(e.timeSec, q, s) };
    })
  };
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}
function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}