export type Bands = { low: number; mid: number; high: number };

export function bandsFromMag(mag: Float32Array, sampleRate: number, frameSize: number): Bands {
  // ざっくり帯域：
  // low  =   0 -  200 Hz  (kick)
  // mid  = 200 - 2000 Hz  (snare/tom)
  // high = 2k  - 12k  Hz  (hh/cym)
  const hzPerBin = sampleRate / frameSize;

  let low = 0, mid = 0, high = 0;
  for (let k = 1; k < mag.length; k++) {
    const hz = k * hzPerBin;
    const v = mag[k];
    if (hz < 200) low += v;
    else if (hz < 2000) mid += v;
    else if (hz < 12000) high += v;
  }
  return { low, mid, high };
}