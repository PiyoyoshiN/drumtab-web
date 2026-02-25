export function normalize(x: Float32Array) {
  let mx = 1e-9;
  for (let i = 0; i < x.length; i++) mx = Math.max(mx, Math.abs(x[i]));
  const out = new Float32Array(x.length);
  const g = 1 / mx;
  for (let i = 0; i < x.length; i++) out[i] = x[i] * g;
  return out;
}

// 1次IIRフィルタ（超軽量）
// 本格EQじゃないけど「低域ドン/高域シャリ」を整えるのに十分

export function lowpass1(x: Float32Array, sampleRate: number, cutoffHz: number) {
  const out = new Float32Array(x.length);
  const dt = 1 / sampleRate;
  const RC = 1 / (2 * Math.PI * cutoffHz);
  const a = dt / (RC + dt);

  let y = 0;
  for (let i = 0; i < x.length; i++) {
    y = y + a * (x[i] - y);
    out[i] = y;
  }
  return out;
}

export function highpass1(x: Float32Array, sampleRate: number, cutoffHz: number) {
  const out = new Float32Array(x.length);
  const dt = 1 / sampleRate;
  const RC = 1 / (2 * Math.PI * cutoffHz);
  const a = RC / (RC + dt);

  let y = 0;
  let prevX = x[0] ?? 0;
  for (let i = 0; i < x.length; i++) {
    const xi = x[i];
    y = a * (y + xi - prevX);
    out[i] = y;
    prevX = xi;
  }
  return out;
}