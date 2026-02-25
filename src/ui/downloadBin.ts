export function downloadBytes(
  filename: string,
  bytes: Uint8Array,
  mime = "application/octet-stream"
) {
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: mime });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);
}