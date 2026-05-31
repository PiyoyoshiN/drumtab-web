import {
  BARS_PER_BLOCK,
  BEATS_PER_BAR,
  CELL_WIDTH,
  LABEL_WIDTH,
  type GridRenderModel
} from "./gridTypes";

export function renderGridText(model: GridRenderModel, playhead = -1) {
  const lines = [
    `Grid ${model.resolution} | BPM ${model.bpm} | 4/4 | ${model.stepsPerBeat} cells/beat | ${model.bars} bars`
  ];

  for (let barStart = 0; barStart < model.bars; barStart += BARS_PER_BLOCK) {
    const barEnd = Math.min(model.bars, barStart + BARS_PER_BLOCK);
    const stepStart = barStart * model.stepsPerBar;
    const stepEnd = barEnd * model.stepsPerBar;

    if (barStart > 0) lines.push("");
    lines.push(`[Bars ${barStart + 1}-${barEnd}]`);
    lines.push(timelineLine("Bar", model, stepStart, stepEnd, playhead, (step) =>
      step % model.stepsPerBar === 0 ? String(step / model.stepsPerBar + 1) : ""
    ));
    lines.push(timelineLine("Beat", model, stepStart, stepEnd, playhead, (step) =>
      step % model.stepsPerBeat === 0 ? String((step / model.stepsPerBeat) % BEATS_PER_BAR + 1) : ""
    ));
    lines.push(timelineLine("Count", model, stepStart, stepEnd, playhead, (step) =>
      countLabel(step, model.stepsPerBeat)
    ));
    lines.push(separatorLine(model, stepStart, stepEnd));

    for (const lane of model.lanes) {
      lines.push(
        lane.label.padEnd(LABEL_WIDTH, " ") +
        lane.cells.slice(stepStart, stepEnd).map((cell, index) => {
          const step = stepStart + index;
          return boundary(step, model.stepsPerBeat, model.stepsPerBar, playhead) + cell.text;
        }).join("")
      );
    }
  }

  return lines.join("\n");
}

function timelineLine(
  label: string,
  model: GridRenderModel,
  stepStart: number,
  stepEnd: number,
  playhead: number,
  cellText: (step: number) => string
) {
  return label.padEnd(LABEL_WIDTH, " ") + stepRange(stepStart, stepEnd).map((step) => {
    return boundary(step, model.stepsPerBeat, model.stepsPerBar, playhead) + fitCell(cellText(step));
  }).join("");
}

function separatorLine(model: GridRenderModel, stepStart: number, stepEnd: number) {
  return "".padEnd(LABEL_WIDTH, " ") + stepRange(stepStart, stepEnd).map((step) => {
    return boundary(step, model.stepsPerBeat, model.stepsPerBar, -1) + "───";
  }).join("");
}

function boundary(step: number, stepsPerBeat: number, stepsPerBar: number, playhead: number) {
  if (step === playhead) return "▶";
  if (step % stepsPerBar === 0) return "|";
  if (step % stepsPerBeat === 0) return ":";
  return " ";
}

function countLabel(step: number, stepsPerBeat: number) {
  const beat = Math.floor(step / stepsPerBeat) % BEATS_PER_BAR + 1;
  const pos = step % stepsPerBeat;

  if (stepsPerBeat === 2) return pos === 0 ? String(beat) : "+";
  if (stepsPerBeat === 4) return [String(beat), "e", "+", "a"][pos];

  return [String(beat), "·", "e", "·", "+", "·", "a", "·"][pos] ?? "";
}

function stepRange(start: number, end: number) {
  return Array.from({ length: end - start }, (_, index) => start + index);
}

function fitCell(text: string) {
  return text.padEnd(CELL_WIDTH, " ").slice(0, CELL_WIDTH);
}
