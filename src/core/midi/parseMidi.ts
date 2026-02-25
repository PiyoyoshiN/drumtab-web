import type { DrumEvent, DrumName, DrumTrack } from "../model/types";

export async function parseMidiFromArrayBuffer(buf: ArrayBuffer): Promise<DrumTrack> {
  const u8 = new Uint8Array(buf);
  const r = new Reader(u8);

  const head = r.readStr(4);
  if (head !== "MThd") throw new Error("Not a MIDI file");
  const headerLen = r.readU32();
  const format = r.readU16();
  const nTrks = r.readU16();
  const division = r.readU16(); // ticks per quarter
  r.skip(headerLen - 6);

  const events: DrumEvent[] = [];
  let bpm = 120;
  const tpq = division || 480;

  for (let t = 0; t < nTrks; t++) {
    const tag = r.readStr(4);
    if (tag !== "MTrk") throw new Error("Bad track chunk");
    const trkLen = r.readU32();
    const end = r.pos + trkLen;

    let tick = 0;
    let running = 0;

    // ノートON→OFFの長さは無視（ドラムなので）
    while (r.pos < end) {
      const dt = r.readVLQ();
      tick += dt;

      let status = r.peek();
      if (status < 0x80) {
        // running status
        status = running;
      } else {
        status = r.readU8();
        running = status;
      }

      if (status === 0xff) {
        // meta
        const type = r.readU8();
        const len = r.readVLQ();
        if (type === 0x51 && len === 3) {
          const mpqn = (r.readU8() << 16) | (r.readU8() << 8) | r.readU8();
          bpm = Math.round(60000000 / mpqn);
        } else {
          r.skip(len);
        }
        continue;
      }

      if (status === 0xf0 || status === 0xf7) {
        // sysex
        const len = r.readVLQ();
        r.skip(len);
        continue;
      }

      const type = status & 0xf0;
      const ch = status & 0x0f;

      // NoteOn/Off
      if (type === 0x90 || type === 0x80) {
        const note = r.readU8();
        const vel = r.readU8();
        const isOn = type === 0x90 && vel > 0;

        // ドラムは基本CH10(=9)
        if (ch === 9 && isOn) {
          const timeSec = ticksToSec(tick, tpq, bpm);
          const drum = gmToDrum(note);
          if (drum) {
            events.push({
              timeSec,
              durationSec: 0,
              velocity: clamp01(vel / 127),
              drum,
            });
          }
        }
        continue;
      }

      // その他のMIDIイベントは必要分だけスキップ
      if (type === 0xa0 || type === 0xb0 || type === 0xe0) {
        r.readU8(); r.readU8();
        continue;
      }
      if (type === 0xc0 || type === 0xd0) {
        r.readU8();
        continue;
      }

      // 不明：とりあえず壊れないように
      // ここに来ることは稀
      // 1byteだけ進める
      r.readU8();
    }

    r.pos = end;
  }

  events.sort((a, b) => a.timeSec - b.timeSec);

  return { bpm, events };
}

function ticksToSec(tick: number, tpq: number, bpm: number) {
  const secPerBeat = 60 / bpm;
  return (tick / tpq) * secPerBeat;
}

function gmToDrum(note: number): DrumName | null {
  // GMドラムの代表的な対応
  // Kick: 36/35, Snare: 38/40, HH: 42/44/46, Crash: 49/57, Ride: 51/59, Toms: 45/47/50
  if (note === 36 || note === 35) return "kick";
  if (note === 38 || note === 40) return "snare";
  if (note === 42 || note === 44) return "hh_closed";
  if (note === 46) return "hh_open";
  if (note === 49 || note === 57) return "crash";
  if (note === 51 || note === 59) return "ride";
  if (note === 45) return "tom_low";
  if (note === 47) return "tom_mid";
  if (note === 50) return "tom_high";
  return null;
}

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

class Reader {
  pos = 0;
  constructor(private u8: Uint8Array) {}

  peek() { return this.u8[this.pos] ?? 0; }
  readU8() { return this.u8[this.pos++] ?? 0; }

  readU16() {
    const a = this.readU8();
    const b = this.readU8();
    return (a << 8) | b;
  }

  readU32() {
    const a = this.readU8();
    const b = this.readU8();
    const c = this.readU8();
    const d = this.readU8();
    return ((a << 24) >>> 0) + (b << 16) + (c << 8) + d;
  }

  readStr(n: number) {
    let s = "";
    for (let i = 0; i < n; i++) s += String.fromCharCode(this.readU8());
    return s;
  }

  skip(n: number) { this.pos += Math.max(0, n); }

  readVLQ() {
    let v = 0;
    while (true) {
      const b = this.readU8();
      v = (v << 7) | (b & 0x7f);
      if ((b & 0x80) === 0) break;
    }
    return v;
  }
}