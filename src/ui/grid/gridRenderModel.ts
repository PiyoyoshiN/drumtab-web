import type { DrumTrack, DrumName, DrumEvent } from "../../core/model/types";
import type { GridResolution } from "../../core/model/quantize";
import { velocityToMark } from "../../core/model/velocityMarks";
import {
  BEATS_PER_BAR,
  EMPTY_CELL,
  GRID_LANES,
  type GridCell,
  type GridRenderModel,
  type GridViewOptions
} from "./gridTypes";

export function buildGridRenderModel(
  track: DrumTrack,
  options: GridViewOptions
): GridRenderModel {
  const bpm = track.bpm ?? 120;
  const stepsPerBeat = stepsPerBeatFor(options.resolution);
  const stepsPerBar = stepsPerBeat * BEATS_PER_BAR;
  const secPerBeat = 60 / bpm;
  const secPerStep = secPerBeat / stepsPerBeat;
  const steps = measureAlignedStepCount(track, secPerStep, stepsPerBar);
  const grid = makeEmptyGrid(steps);

  for (const event of track.events) {
    const step = Math.round(event.timeSec / secPerStep);
    if (step < 0 || step >= steps) continue;
    setGridCell(grid, event.drum, step, event);
  }

  return {
    bpm,
    resolution: options.resolution,
    stepsPerBeat,
    stepsPerBar,
    secPerStep,
    steps,
    bars: steps / stepsPerBar,
    lanes: GRID_LANES.map((drum) => ({
      drum,
      label: laneLabel(drum),
      cells: grid[drum]
    }))
  };
}

export function stepsPerBeatFor(resolution: GridResolution) {
  switch (resolution) {
    case "8th": return 2;
    case "16th": return 4;
    case "32nd": return 8;
  }
}

function makeEmptyGrid(steps: number): Record<DrumName, GridCell[]> {
  return Object.fromEntries(
    GRID_LANES.map((drum) => [
      drum,
      Array.from({ length: steps }, () => ({ text: EMPTY_CELL, velocity: -1, hitCount: 0 }))
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
  const nextHitCount = current.hitCount + 1;

  if (current.hitCount > 0 && current.velocity > event.velocity) {
    current.hitCount = nextHitCount;
    current.text = collisionGlyph(current.text);
    return;
  }

  const mark = velocityToMark(event.velocity);
  const base = glyph(baseChar(drum), mark === "ghost", mark === "accent");
  grid[drum][step] = {
    text: collisionGlyph(base, nextHitCount),
    velocity: event.velocity,
    hitCount: nextHitCount
  };
}

function measureAlignedStepCount(track: DrumTrack, secPerStep: number, stepsPerBar: number) {
  const maxStep = track.events.reduce(
    (max, event) => Math.max(max, Math.round(event.timeSec / secPerStep)),
    0
  );
  return Math.max(stepsPerBar, roundUpToBar(maxStep + 1, stepsPerBar));
}

function roundUpToBar(steps: number, stepsPerBar: number) {
  return Math.ceil(steps / stepsPerBar) * stepsPerBar;
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

function collisionGlyph(base: string, hitCount = 2) {
  if (hitCount <= 1) return base;
  const trimmed = base.trim();
  const char = trimmed.startsWith("(") ? trimmed.slice(1, 2) : trimmed.slice(0, 1);
  return ` ${char}+`;
}
