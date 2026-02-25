import type { DrumTrack, DrumName } from "../core/model/types";
import { velocityToMark } from "../core/model/velocityMarks";

export function createGridView(track: DrumTrack) {
  const el = document.createElement("div");
  const pre = document.createElement("pre");
  el.appendChild(pre);

  const bpm = track.bpm ?? 120;
  const secPerBeat = 60 / bpm;

  // 16分基準表示（内部が8/32でも最終はここで見える形に）
  const secPerStep = secPerBeat / 4;

  const endSec =
    track.events.length ? track.events[track.events.length - 1].timeSec : 0;
  const steps = Math.max(16, Math.ceil(endSec / secPerStep) + 8);

  let playhead = -1;

  function render() {
    const header = headerLine(steps);
    const lanes: DrumName[] = [
      "hh_open",
      "hh_closed",
      "ride",
      "crash",
      "snare",
      "tom_high",
      "tom_mid",
      "tom_low",
      "kick"
    ];

    const grid: Record<DrumName, string[]> = Object.fromEntries(
      lanes.map((d) => [d, new Array(steps).fill(" . ")])
    ) as any;

    for (const e of track.events) {
      const s = Math.round(e.timeSec / secPerStep);
      if (s < 0 || s >= steps) continue;

      const mark = velocityToMark(e.velocity);
      const base = baseChar(e.drum);
      const cell = glyph(base, mark === "ghost", mark === "accent");

      grid[e.drum][s] = ` ${cell} `;
    }

    // playhead縦線
    if (playhead >= 0 && playhead < steps) {
      for (const d of lanes) {
        const cur = grid[d][playhead];
        grid[d][playhead] = cur.replace(".", "|").replace(" ", "");
        // ↑ ちょい強引だけど見やすい
        if (grid[d][playhead].length < 3) grid[d][playhead] = `|${grid[d][playhead]}|`;
      }
    }

    const lines = [];
    lines.push(header);

    for (const d of lanes) {
      const label = laneLabel(d).padEnd(10, " ");
      lines.push(label + grid[d].join(""));
    }

    pre.textContent = lines.join("\n");
  }

  function setPlayhead(step: number) {
    playhead = step;
    render();
  }

  render();

  return { el, secPerStep, steps, setPlayhead };
}

function headerLine(steps: number) {
  let h = "";
  for (let s = 0; s < steps; s++) {
    const bar = s % 16 === 0;
    const beat = s % 4 === 0;
    h += bar ? "|" : beat ? ":" : ".";
    h += s % 4 === 3 ? " " : "";
  }
  return " ".repeat(10) + h;
}

function laneLabel(d: DrumName) {
  switch (d) {
    case "hh_open": return "HO";
    case "hh_closed": return "HH";
    case "ride": return "RD";
    case "crash": return "CR";
    case "snare": return "SN";
    case "tom_high": return "T1";
    case "tom_mid": return "T2";
    case "tom_low": return "T3";
    case "kick": return "BD";
    default: return d;
  }
}

function baseChar(d: DrumName) {
  switch (d) {
    case "kick": return "b";
    case "snare": return "s";
    case "hh_closed": return "h";
    case "hh_open": return "o";
    case "crash": return "c";
    case "ride": return "r";
    case "tom_low": return "t";
    case "tom_mid": return "t";
    case "tom_high": return "t";
    default: return "x";
  }
}

// ✅ ここが「括弧っぽい表示→本当に括弧」
// ghost: (s) みたいにする
function glyph(base: string, ghost: boolean, accent: boolean) {
  if (ghost) return `(${base})`;
  if (accent) return base.toUpperCase();
  return base;
}