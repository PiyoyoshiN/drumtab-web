import { getFFmpeg } from "./ffmpegLoader";

export async function extractWavFromVideo(file: File): Promise<Uint8Array> {
  const ffmpeg = await getFFmpeg();

  const inName = "in." + (file.name.split(".").pop() || "mp4");
  const outName = "out.wav";

  const inData = new Uint8Array(await file.arrayBuffer());

  await ffmpeg.writeFile(inName, inData);

  // -vn: video無視 / 1ch / 44.1k / pcm16
  await ffmpeg.exec([
    "-i", inName,
    "-vn",
    "-ac", "1",
    "-ar", "44100",
    "-c:a", "pcm_s16le",
    outName,
  ]);

  const out = await ffmpeg.readFile(outName);
  // 後片付け（失敗しても無視）
  try { await ffmpeg.deleteFile(inName); } catch {}
  try { await ffmpeg.deleteFile(outName); } catch {}

  return out as Uint8Array;
}