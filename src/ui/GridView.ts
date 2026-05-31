import type { DrumTrack } from "../core/model/types";
import { buildGridRenderModel } from "./grid/gridRenderModel";
import { GRID_LEGEND, type GridViewOptions } from "./grid/gridTypes";
import { renderGridText } from "./grid/gridTextRenderer";

export function createGridView(track: DrumTrack, options: GridViewOptions) {
  const el = document.createElement("div");
  el.className = "grid-view";

  const pre = document.createElement("pre");
  const legend = document.createElement("div");
  legend.className = "grid-view__legend";
  legend.textContent = GRID_LEGEND;

  el.append(pre, legend);

  const model = buildGridRenderModel(track, options);
  let playhead = -1;

  function render() {
    pre.textContent = renderGridText(model, playhead);
  }

  function setPlayhead(step: number) {
    playhead = step;
    render();
  }

  render();

  return { el, secPerStep: model.secPerStep, steps: model.steps, setPlayhead };
}
