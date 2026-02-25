export type AudioDetectParams = {
  threshold: number; // 0..1（オンセット閾値）
  minGapMs: number;  // 連打抑制
};

export const DEFAULT_AUDIO_PARAMS: AudioDetectParams = {
  threshold: 0.35,
  minGapMs: 35,
};