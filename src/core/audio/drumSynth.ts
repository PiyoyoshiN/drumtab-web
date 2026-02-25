// 超簡易ドラム音源（WebAudio）
// 本物の音源じゃないけど、譜面の確認には十分

export type DrumKind = "kick" | "snare" | "hh" | "crash" | "ride" | "tom";

export function createDrumSynth() {
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();

  const master = ctx.createGain();
  master.gain.value = 0.8;
  master.connect(ctx.destination);

  function noiseNode(duration: number, at: number, gain: number) {
    const bufferSize = Math.max(1, Math.floor(duration * ctx.sampleRate));
    const buf = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1);

    const src = ctx.createBufferSource();
    src.buffer = buf;

    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + duration);

    src.connect(g);
    g.connect(master);

    src.start(at);
    src.stop(at + duration);
  }

  function oscNode(freq: number, duration: number, at: number, gain: number, sweepTo?: number) {
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(freq, at);
    if (sweepTo) o.frequency.exponentialRampToValueAtTime(sweepTo, at + duration);

    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + duration);

    o.connect(g);
    g.connect(master);

    o.start(at);
    o.stop(at + duration);
  }

  function hit(kind: DrumKind, at: number, vel = 0.8) {
    const v = Math.max(0.05, Math.min(1, vel));

    switch (kind) {
      case "kick":
        oscNode(120, 0.12, at, 0.9 * v, 50);
        noiseNode(0.03, at, 0.06 * v);
        break;
      case "snare":
        noiseNode(0.09, at, 0.28 * v);
        oscNode(200, 0.06, at, 0.12 * v);
        break;
      case "hh":
        noiseNode(0.05, at, 0.16 * v);
        break;
      case "crash":
        noiseNode(0.35, at, 0.18 * v);
        break;
      case "ride":
        noiseNode(0.22, at, 0.12 * v);
        break;
      case "tom":
        oscNode(180, 0.10, at, 0.22 * v, 120);
        break;
    }
  }

  async function resume() {
    if (ctx.state === "suspended") await ctx.resume();
  }

  return { ctx, hit, resume };
}