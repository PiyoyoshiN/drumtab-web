import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";

let ffmpeg: FFmpeg | null = null;

export async function getFFmpeg() {
  if (ffmpeg) return ffmpeg;

  const inst = new FFmpeg();

  // CDNからロード（CORS回避用にblob化）
  const base = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm";
  await inst.load({
    coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, "text/javascript"),
    wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, "application/wasm"),
  });

  ffmpeg = inst;
  return inst;
}