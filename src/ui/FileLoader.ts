export function createFileLoader(onPick: (file: File) => void) {
  const wrap = document.createElement("div");
  wrap.style.display = "flex";
  wrap.style.gap = "10px";
  wrap.style.alignItems = "center";

  const input = document.createElement("input");
  input.type = "file";
  input.accept =
    ".mid,.midi,.json,.wav,.mp3,.ogg,.mp4,.webm,video/*,audio/*,audio/midi,application/json";

  const label = document.createElement("div");
  label.textContent = "MIDI/JSON/Audio/Video を選択";

  input.addEventListener("change", () => {
    const file = input.files?.[0];
    if (!file) return;
    label.textContent = `選択: ${file.name}`;
    onPick(file);
  });

  wrap.appendChild(input);
  wrap.appendChild(label);
  return wrap;
}