import type { DrumTrack } from "../core/model/types";
import type { GridResolution } from "../core/model/quantize";
import type { AudioDetectParams } from "../core/audio/audioParams";

export type ViewMode = "Grid" | "Score";

export type AppState = {
  track: DrumTrack | null;

  viewMode: ViewMode;
  quantizePct: number;
  gridRes: GridResolution;

  speed: number;
  isPlaying: boolean;

  audioParams: AudioDetectParams;
};

export function createInitialState(audioParams: AudioDetectParams): AppState {
  return {
    track: null,
    viewMode: "Grid",
    quantizePct: 100,
    gridRes: "16th",
    speed: 1.0,
    isPlaying: false,
    audioParams
  };
}