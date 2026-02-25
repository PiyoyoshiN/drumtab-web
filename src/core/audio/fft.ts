// Radix-2 Cooley–Tukey (in-place)
// nは2^k限定。リアル入力→複素スペクトル（re, im配列）
export function fftRealToComplex(x: Float32Array) {
  const n = x.length;
  const re = new Float32Array(n);
  const im = new Float32Array(n);
  for (let i = 0; i < n; i++) re[i] = x[i];

  bitReverse(re, im);

  for (let len = 2; len <= n; len <<= 1) {
    const half = len >> 1;
    const ang = (-2 * Math.PI) / len;

    for (let i = 0; i < n; i += len) {
      for (let j = 0; j < half; j++) {
        const a = i + j;
        const b = a + half;

        const wr = Math.cos(ang * j);
        const wi = Math.sin(ang * j);

        const tr = wr * re[b] - wi * im[b];
        const ti = wr * im[b] + wi * re[b];

        re[b] = re[a] - tr;
        im[b] = im[a] - ti;
        re[a] = re[a] + tr;
        im[a] = im[a] + ti;
      }
    }
  }

  return { re, im };
}

function bitReverse(re: Float32Array, im: Float32Array) {
  const n = re.length;
  let j = 0;
  for (let i = 0; i < n; i++) {
    if (i < j) {
      const tr = re[i]; re[i] = re[j]; re[j] = tr;
      const ti = im[i]; im[i] = im[j]; im[j] = ti;
    }
    let m = n >> 1;
    while (m >= 1 && j >= m) { j -= m; m >>= 1; }
    j += m;
  }
}