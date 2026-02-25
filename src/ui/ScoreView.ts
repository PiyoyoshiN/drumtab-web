import { Renderer, Stave, StaveNote, Voice, Formatter } from "vexflow";
import type { DrumTrack } from "../core/model/types";

export function createScoreView(track: DrumTrack) {
  const div = document.createElement("div");

  // SVGレンダラーを明示
  const renderer = new Renderer(div, Renderer.Backends.SVG);
  renderer.resize(980, 260);

  const ctx = renderer.getContext();

  const stave = new Stave(10, 40, 940);
  stave.addClef("percussion").addTimeSignature("4/4");
  stave.setContext(ctx).draw();

  // まずは見た目確認用：16分を並べるだけ（最大32個）
  const notes = track.events.slice(0, 32).map((e) => {
    // ドラムごとに線位置を変える（超ざっくり）
    const key = toPercKey(e.drum);
    const n = new StaveNote({
      clef: "percussion",
      keys: [key],
      duration: "16",
    });
    return n;
  });

  const voice = new Voice({ numBeats: 4, beatValue: 4 });
  voice.addTickables(notes);

  new Formatter().joinVoices([voice]).format([voice], 900);
  voice.draw(ctx, stave);

  return div;
}

function toPercKey(drum: string) {
  // ここは「まず見える」ための簡易対応
  switch (drum) {
    case "kick":
      return "c/4";
    case "snare":
      return "d/4";
    case "hh_closed":
    case "hh_open":
      return "f/5";
    case "crash":
      return "a/5";
    case "ride":
      return "g/5";
    case "tom_low":
      return "e/4";
    case "tom_mid":
      return "f/4";
    case "tom_high":
      return "g/4";
    default:
      return "d/4";
  }
}