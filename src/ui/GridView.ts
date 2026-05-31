import type { DrumTrack, DrumName, DrumEvent } from "../core/model/types";
import type { GridResolution } from "../core/model/quantize";
import { velocityToMark } from "../core/model/velocityMarks";

type GridCell = {
  text: string;
  velocity: number;
};

type GridViewOptions = {
  resolution: GridResolution;
};

const BEATS_PER_BAR = 4;
const LABEL_WIDTH = 10;
const CELL_WIDTH = 3;
const EMPTY_CELL = "───";

const LANES: DrumName[] = [
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

export function createGridView(track: DrumTrack, options: GridViewOptions) {
  const el = document.createElement("div");
  el.className = "grid-view";

  const pre = document.createElement("pre");
  el.appendChild(pre);

  const bpm = track.bpm ?? 120;
  const secPerBeat = 60 / bpm;
  const stepsPerBeat = stepsPerBeatFor(options.resolution);
  const stepsPerBar = stepsPerBeat * BEATS_PER_BAR;
  const secPerStep = secPerBeat / stepsPerBeat;

  const endSec = track.events.reduce(
    (max, event) => Math.max(max, event.timeSec + event.durationSec),
    0
  );
  const usedSteps = Math.ceil(endSec / secPerStep) + stepsPerBeat;
  const steps = Math.max(stepsPerBar, roundUpToBar(usedSteps, stepsPerBar));

  let playhead = -1;

  function render() {
    const grid = makeEmptyGrid(steps);

    for (const event of track.events) {
      const step = Math.round(event.timeSec / secPerStep);
      if (step < 0 || step >= steps) continue;
      setGridCell(grid, event.drum, step, event);
    }

    const lines = [
      timelineLine("Bar", steps, stepsPerBeat, stepsPerBar, playhead, (step) =>
        step % stepsPerBar === 0 ? String(step / stepsPerBar + 1) : ""
      ),
      timelineLine("Beat", steps, stepsPerBeat, stepsPerBar, playhead, (step) =>
        step % stepsPerBeat === 0 ? String((step / stepsPerBeat) % BEATS_PER_BAR + 1) : ""
      ),
      timelineLine("Count", steps, stepsPerBeat, stepsPerBar, playhead, (step) =>
        countLabel(step, stepsPerBeat)
      ),
      separatorLine(steps, stepsPerBeat, stepsPerBar),
      ...LANES.map((drum) => laneLine(drum, grid[drum], stepsPerBeat, stepsPerBar, playhead))
    ];

    pre.textContent = lines.join("\n");
  }

  function setPlayhead(step: number) {
    playhead = step;
    render();
  }

  render();

  return { el, secPerStep, steps, setPlayhead };
}

function makeEmptyGrid(steps: number): Record<DrumName, GridCell[]> {
  return Object.fromEntries(
    LANES.map((drum) => [
      drum,
      Array.from({ length: steps }, () => ({ text: EMPTY_CELL, velocity: -1 }))
    ])
  ) as Record<DrumName, GridCell[]>;
}

function setGridCell(
  grid: Record<DrumName, GridCell[]>,
  drum: DrumName,
  step: number,
  event: DrumEvent
) {
  const current = grid[drum][step];
  if (current.velocity > event.velocity) return;

  const mark = velocityToMark(event.velocity);
  grid[drum][step] = {
    text: glyph(baseChar(drum), mark === "ghost", mark === "accent"),
    velocity: event.velocity
  };
}

function laneLine(
  drum: DrumName,
  cells: GridCell[],
  stepsPerBeat: number,
  stepsPerBar: number,
  playhead: number
) {
  const label = laneLabel(drum).padEnd(LABEL_WIDTH, " ");
  return label + cells.map((cell, step) => boundary(step, stepsPerBeat, stepsPerBar, playhead) + cell.text).join("");
}

function timelineLine(
  label: string,
  steps: number,
  stepsPerBeat: number,
  stepsPerBar: number,
  playhead: number,
  cellText: (step: number) => string
) {
  return label.padEnd(LABEL_WIDTH, " ") + Array.from({ length: steps }, (_, step) => {
    return boundary(step, stepsPerBeat, stepsPerBar, playhead) + fitCell(cellText(step));
  }).join("");
}

function separatorLine(steps: number, stepsPerBeat: number, stepsPerBar: number) {
  return "".padEnd(LABEL_WIDTH, " ") + Array.from({ length: steps }, (_, step) => {
    return boundary(step, stepsPerBeat, stepsPerBar, -1) + "───";
  }).join("");
}

function boundary(step: number, stepsPerBeat: number, stepsPerBar: number, playhead: number) {
  if (step === playhead) return "▶";
  if (step % stepsPerBar === 0) return "|";
  if (step % stepsPerBeat === 0) return ":";
  return " ";
}

function countLabel(step: number, stepsPerBeat: number) {
  const beat = Math.floor(step / stepsPerBeat) % BEATS_PER_BAR + 1;
  const pos = step % stepsPerBeat;

  if (stepsPerBeat === 2) return pos === 0 ? String(beat) : "+";
  if (stepsPerBeat === 4) return [String(beat), "e", "+", "a"][pos];

  return [String(beat), ".", "e", ".", "+", ".", "a", "."][pos] ?? "";
}

function stepsPerBeatFor(resolution: GridResolution) {
  switch (resolution) {
    case "8th": return 2;
    case "16th": return 4;
    case "32nd": return 8;
  }
}

function roundUpToBar(steps: number, stepsPerBar: number) {
  return Math.ceil(steps / stepsPerBar) * stepsPerBar;
}

function fitCell(text: string) {
  return text.padEnd(CELL_WIDTH, " ").slice(0, CELL_WIDTH);
}

function laneLabel(d: DrumName) {
  switch (d) {
    case "hh_open": return "OH open";
    case "hh_closed": return "HH closed";
    case "ride": return "RD ride";
    case "crash": return "CR crash";
    case "snare": return "SN snare";
    case "tom_high": return "T1 high";
    case "tom_mid": return "T2 mid";
    case "tom_low": return "T3 low";
    case "kick": return "BD kick";
    default: return d;
  }
}

function baseChar(d: DrumName) {
  switch (d) {
    case "kick": return "b";
    case "snare": return "s";
    case "hh_closed": return "x";
    case "hh_open": return "o";
    case "crash": return "c";
    case "ride": return "r";
    case "tom_low": return "t";
    case "tom_mid": return "t";
    case "tom_high": return "t";
    default: return "x";
  }
}

function glyph(base: string, ghost: boolean, accent: boolean) {
  if (ghost) return `(${base})`;
  if (accent) return ` ${base.toUpperCase()} `;
  return ` ${base} `;
}
