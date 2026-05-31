import type { DrumName } from "../../core/model/types";
import type { GridResolution } from "../../core/model/quantize";

export type GridViewOptions = {
  resolution: GridResolution;
  barsPerBlock?: number;
};

export type GridCell = {
  text: string;
  velocity: number;
  hitCount: number;
};

export type GridLaneModel = {
  drum: DrumName;
  label: string;
  cells: GridCell[];
};

export type GridRenderModel = {
  bpm: number;
  resolution: GridResolution;
  stepsPerBeat: number;
  stepsPerBar: number;
  secPerStep: number;
  steps: number;
  bars: number;
  barsPerBlock: number;
  lanes: GridLaneModel[];
};

export const BEATS_PER_BAR = 4;
export const LABEL_WIDTH = 10;
export const CELL_WIDTH = 3;
export const EMPTY_CELL = "───";
export const DEFAULT_BARS_PER_BLOCK = 4;

export const GRID_LANES: DrumName[] = [
  "crash",
  "ride",
  "hh_open",
  "hh_closed",
  "snare",
  "tom_high",
  "tom_mid",
  "tom_low",
  "kick"
];

export const GRID_LEGEND =
  "Legend: |小節 :拍 ▶再生位置 ───=空白/休符相当 x=HH o=open HH s=snare b=kick c=crash r=ride t=tom 大文字=accent (x)=ghost +=同一レーン同一セルに複数hit";
