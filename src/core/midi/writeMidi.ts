import type { DrumTrack, DrumEvent } from "../model/types";

export function writeDrumTrackAsMidi(track: DrumTrack) {
  const tpq = 480;
  const bpm = track.bpm ?? 120;

  const events = track.events.slice().sort((a, b) => a.timeSec - b.timeSec);
  const ticksPerSec = (tpq * bpm) / 60;

  const out: number[] = [];
  const pushStr = (s: string) => { for (const c of s) out.push(c.charCodeAt(0)); };
  const pushU16 = (n: number) => { out.push((n >> 8) & 255, n & 255); };
  const pushU32 = (n: number) => { out.push((n >> 24) & 255, (n >> 16) & 255, (n >> 8) & 255, n & 255); };

  // Header
  pushStr("MThd"); pushU32(6);
  pushU16(0);   // format0
  pushU16(1);   // ntrks
  pushU16(tpq);

  // Track
  const trk: number[] = [];
  const vlq = (n: number) => {
    const res: number[] = [];
    let v = n >>> 0;
    res.push(v & 0x7f);
    while ((v >>= 7)) res.unshift((v & 0x7f) | 0x80);
    return res;
  };

  // Tempo meta
  const mpqn = Math.round(60000000 / bpm);
  trk.push(...vlq(0), 0xff, 0x51, 0x03, (mpqn >> 16) & 255, (mpqn >> 8) & 255, mpqn & 255);

  let lastTick = 0;

  for (const e of events) {
    const tick = Math.max(0, Math.round(e.timeSec * ticksPerSec));
    const dt = tick - lastTick;
    lastTick = tick;

    const note = drumToGmNote(e);
    const vel = Math.max(1, Math.min(127, Math.round((e.velocity ?? 0.8) * 127)));

    // NoteOn ch10
    trk.push(...vlq(dt), 0x99, note, vel);
    // NoteOff after fixed 30ms
    const offTick = Math.max(1, Math.round(0.03 * ticksPerSec));
    trk.push(...vlq(offTick), 0x89, note, 0);
    lastTick += offTick;
  }

  // end of track
  trk.push(...vlq(0), 0xff, 0x2f, 0x00);

  // Track chunk
  pushStr("MTrk");
  pushU32(trk.length);
  out.push(...trk);

  return new Uint8Array(out);
}

function drumToGmNote(e: DrumEvent) {
  switch (e.drum) {
    case "kick": return 36;
    case "snare": return 38;
    case "hh_closed": return 42;
    case "hh_open": return 46;
    case "crash": return 49;
    case "ride": return 51;
    case "tom_high": return 50;
    case "tom_mid": return 47;
    case "tom_low": return 45;
    default: return 42;
  }
}