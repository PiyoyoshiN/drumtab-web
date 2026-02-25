import type { DrumTrack, DrumName } from "../model/types";
import type { AudioDetectParams } from "./audioParams";
import { normalize, highpass1, lowpass1 } from "./preprocess";
import { detectOnsetsFFT } from "./onsets";
import { classifyHitsFFT } from "./classify";
import { estimateTempoFromOnsets } from "./tempo";
import { smartDedupe } from "../model/postprocess";

export async function audioToDrumTrack(
  mono: Float32Array,
  sampleRate: number,
  params: AudioDetectParams
): Promise<DrumTrack> {

  let x = normalize(mono);
  x = highpass1(x, sampleRate, 35);
  x = lowpass1(x, sampleRate, 14000);

  const onsets = detectOnsetsFFT(x, sampleRate, {
    threshold: params.threshold,
    minGapMs: params.minGapMs,
    frameSize: 2048,
    hopSize: 512,
  });

  const tempo = estimateTempoFromOnsets(onsets);
  const bpm = tempo.confidence > 0.18 ? tempo.bpm : 120;

  const hits = classifyHitsFFT(x, sampleRate, onsets, { frameSize: 2048 });

  const events = hits.map((h) => {
    let drum: DrumName;

    if (h.drum === "kick") drum = "kick";
    else if (h.drum === "snare") drum = "snare";
    else if (h.drum === "ride") drum = "ride";
    else if (h.drum === "crash") drum = "crash";
    else drum = h.velocity > 0.75 ? "hh_open" : "hh_closed";

    return {
      timeSec: h.timeSec,
      durationSec: 0,
      velocity: h.velocity,
      drum,
    };
  });

  events.sort((a, b) => a.timeSec - b.timeSec);

  const track: DrumTrack = smartDedupe({ bpm, events });

  return track;
}