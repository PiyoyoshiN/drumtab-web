import { h } from "../ui";
import type { AppState } from "../state";
import type { GridResolution } from "../../core/model/quantize";

export function ParamsPanel(
  state: AppState,
  on: {
    setQuantize: (pct: number) => void;
    setGridRes: (r: GridResolution) => void;
    setSpeed: (v: number) => void;
  }
) {
  const q = slider(0, 100, 1, state.quantizePct);
  const qText = h("div", {
    className: "label",
    textContent: `Quantize ${state.quantizePct}%`
  });
  q.addEventListener("input", () => {
    on.setQuantize(Number(q.value));
    qText.textContent = `Quantize ${q.value}%`;
  });

  const res = h(
    "select",
    {},
    opt("8th", state.gridRes === "8th"),
    opt("16th", state.gridRes === "16th"),
    opt("32nd", state.gridRes === "32nd")
  );
  res.addEventListener("change", () =>
    on.setGridRes(res.value as GridResolution)
  );

  const sp = slider(0.5, 1.5, 0.01, state.speed);
  const spText = h("div", {
    className: "label",
    textContent: `Speed ${state.speed.toFixed(2)}x`
  });
  sp.addEventListener("input", () => {
    on.setSpeed(Number(sp.value));
    spText.textContent = `Speed ${Number(sp.value).toFixed(2)}x`;
  });

  return h(
    "div",
    { className: "row" },
    qText,
    q,
    h("div", { className: "label", textContent: "Grid" }),
    res,
    spText,
    sp
  );
}

function slider(min: number, max: number, step: number, value: number) {
  const s = document.createElement("input");
  s.type = "range";
  s.min = String(min);
  s.max = String(max);
  s.step = String(step);
  s.value = String(value);
  return s;
}

function opt(text: string, selected: boolean) {
  const o = document.createElement("option");
  o.value = text;
  o.textContent = text;
  o.selected = selected;
  return o;
}