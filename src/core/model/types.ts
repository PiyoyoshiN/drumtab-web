export type DrumName =
  | "kick"
  | "snare"
  | "hh_closed"
  | "hh_open"
  | "crash"
  | "ride"
  | "tom_low"
  | "tom_mid"
  | "tom_high";

export type DrumEvent = {
  timeSec: number;
  durationSec: number;
  velocity: number; // 0..1
  drum: DrumName;
};

export type DrumTrack = {
  bpm: number;
  events: DrumEvent[];
};