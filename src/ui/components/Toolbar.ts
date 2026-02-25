import { h } from "../ui";
import type { AppState, ViewMode } from "../state";

export function Toolbar(
  state: AppState,
  on: {
    setViewMode: (m: ViewMode) => void;
    onPlay: () => void;
    onStop: () => void;
    onExportMidi: () => void;
  }
) {
  const view = h(
    "select",
    {},
    option("Grid", state.viewMode === "Grid"),
    option("Score", state.viewMode === "Score")
  );
  view.addEventListener("change", () => on.setViewMode(view.value as ViewMode));

  const play = h("button", { textContent: "Play" });
  const stop = h("button", { textContent: "Stop" });
  const exportMidi = h("button", { textContent: "Export MIDI" });

  stop.disabled = !state.isPlaying;
  play.disabled = state.isPlaying;
  exportMidi.disabled = !state.track;

  play.addEventListener("click", on.onPlay);
  stop.addEventListener("click", on.onStop);
  exportMidi.addEventListener("click", on.onExportMidi);

  return h(
    "div",
    { className: "row" },
    h("div", { className: "label", textContent: "View" }),
    view,
    h("div", { className: "label", textContent: "Playback" }),
    play,
    stop,
    exportMidi
  );
}

function option(text: string, selected: boolean) {
  const o = document.createElement("option");
  o.value = text;
  o.textContent = text;
  o.selected = selected;
  return o;
}