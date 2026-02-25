import type { DrumTrack, DrumName } from "./types";

export function smartDedupe(track: DrumTrack): DrumTrack {
  const gapsMs: Partial<Record<DrumName, number>> = {
    kick: 35,
    snare: 28,
    crash: 120,
    ride: 55,
    hh_closed: 10,
    hh_open: 18,
    tom_low: 55,
    tom_mid: 55,
    tom_high: 55
  };

  const out = [];
  const last = new Map<DrumName, { t: number; idx: number }>();

  for (const e of track.events) {
    const gap = (gapsMs[e.drum] ?? 0) / 1000;
    const prev = last.get(e.drum);

    if (!prev || e.timeSec - prev.t >= gap) {
      out.push(e);
      last.set(e.drum, { t: e.timeSec, idx: out.length - 1 });
      continue;
    }

    const i = prev.idx;
    if (e.velocity > out[i].velocity) {
      out[i] = e;
      last.set(e.drum, { t: e.timeSec, idx: i });
    }
  }

  return { bpm: track.bpm, events: out };
}