import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const sampleDir = path.join(process.cwd(), "public", "samples");
const resolutions = [
  ["8th", 2],
  ["16th", 4],
  ["32nd", 8]
];
const lanes = ["crash", "ride", "hh_open", "hh_closed", "snare", "tom_high", "tom_mid", "tom_low", "kick"];
const labels = {
  crash: "CR crash",
  ride: "RD ride",
  hh_open: "OH open",
  hh_closed: "HH closed",
  snare: "SN snare",
  tom_high: "T1 high",
  tom_mid: "T2 mid",
  tom_low: "T3 low",
  kick: "BD kick"
};
const baseChars = {
  crash: "c",
  ride: "r",
  hh_open: "o",
  hh_closed: "x",
  snare: "s",
  tom_high: "t",
  tom_mid: "t",
  tom_low: "t",
  kick: "b"
};
const barsPerBlock = 4;
const maxLineLength = 560;
const errors = [];
const warnings = [];

const files = (await readdir(sampleDir)).filter((file) => file.endsWith(".json")).sort();
for (const file of files) {
  const track = JSON.parse(await readFile(path.join(sampleDir, file), "utf8"));
  validateTrack(file, track);

  for (const [resolution, stepsPerBeat] of resolutions) {
    const model = buildGridModel(track, resolution, stepsPerBeat);
    const text = renderGridText(model);
    validateGridText(file, resolution, model, text);
    const maxLen = Math.max(...text.split("\n").map((line) => line.length));
    const stacked = countStackedPositions(track, model.secPerStep);
    console.log(`${file} ${resolution}: bars=${model.bars} blocks=${Math.ceil(model.bars / barsPerBlock)} stacked=${stacked} maxLine=${maxLen}`);
  }
}

for (const warning of warnings) console.warn(`warning: ${warning}`);
if (errors.length) {
  console.error(errors.map((error) => `- ${error}`).join("\n"));
  process.exit(1);
}
console.log(`Checked grid rendering for ${files.length} sample files x ${resolutions.length} resolutions.`);

function validateTrack(file, track) {
  if (!Number.isFinite(track.bpm) || track.bpm <= 0) errors.push(`${file}: bpm must be positive`);
  if (!Array.isArray(track.events) || track.events.length === 0) errors.push(`${file}: events must be non-empty`);
  const drums = new Set((track.events ?? []).map((event) => event.drum));
  if (!drums.has("kick")) errors.push(`${file}: missing kick`);
  if (!drums.has("snare")) errors.push(`${file}: missing snare`);
  if (!drums.has("hh_closed") && !drums.has("hh_open")) errors.push(`${file}: missing hihat`);
}

function buildGridModel(track, resolution, stepsPerBeat) {
  const bpm = track.bpm;
  const stepsPerBar = stepsPerBeat * 4;
  const secPerStep = 60 / bpm / stepsPerBeat;
  const maxStep = track.events.reduce((max, event) => Math.max(max, Math.round(event.timeSec / secPerStep)), 0);
  const steps = Math.max(stepsPerBar, Math.ceil((maxStep + 1) / stepsPerBar) * stepsPerBar);
  const cellsByLane = Object.fromEntries(lanes.map((lane) => [lane, Array.from({ length: steps }, () => ({ text: "───", velocity: -1, hitCount: 0 }))]));

  for (const event of track.events) {
    const step = Math.round(event.timeSec / secPerStep);
    if (step < 0 || step >= steps || !cellsByLane[event.drum]) continue;
    const current = cellsByLane[event.drum][step];
    const hitCount = current.hitCount + 1;
    const text = glyph(baseChars[event.drum] ?? "x", event.velocity);
    if (current.hitCount > 0 && current.velocity > event.velocity) {
      current.hitCount = hitCount;
      current.text = collisionGlyph(current.text);
    } else {
      cellsByLane[event.drum][step] = { text: collisionGlyph(text, hitCount), velocity: event.velocity, hitCount };
    }
  }

  return {
    bpm,
    resolution,
    stepsPerBeat,
    stepsPerBar,
    secPerStep,
    steps,
    bars: steps / stepsPerBar,
    barsPerBlock,
    lanes: lanes.map((drum) => ({ drum, label: labels[drum], cells: cellsByLane[drum] }))
  };
}

function renderGridText(model) {
  const lines = [`Grid ${model.resolution} | BPM ${model.bpm} | 4/4 | ${model.stepsPerBeat} cells/beat | ${model.bars} bars | block=${model.barsPerBlock} bars`];
  for (let barStart = 0; barStart < model.bars; barStart += model.barsPerBlock) {
    const barEnd = Math.min(model.bars, barStart + model.barsPerBlock);
    const stepStart = barStart * model.stepsPerBar;
    const stepEnd = barEnd * model.stepsPerBar;
    if (barStart > 0) lines.push("");
    lines.push(`=== Bars ${barStart + 1}-${barEnd} / ${model.bars} ===`);
    lines.push(timelineLine("Bar", model, stepStart, stepEnd, (step) => step % model.stepsPerBar === 0 ? String(step / model.stepsPerBar + 1) : ""));
    lines.push(timelineLine("Beat", model, stepStart, stepEnd, (step) => step % model.stepsPerBeat === 0 ? String((step / model.stepsPerBeat) % 4 + 1) : ""));
    lines.push(timelineLine("Count", model, stepStart, stepEnd, (step) => countLabel(step, model.stepsPerBeat)));
    lines.push("".padEnd(10, " ") + range(stepStart, stepEnd).map((step) => boundary(step, model.stepsPerBeat, model.stepsPerBar, -1) + "───").join(""));
    for (const lane of model.lanes) {
      lines.push(lane.label.padEnd(10, " ") + lane.cells.slice(stepStart, stepEnd).map((cell, index) => boundary(stepStart + index, model.stepsPerBeat, model.stepsPerBar, -1) + cell.text).join(""));
    }
  }
  return lines.join("\n");
}

function validateGridText(file, resolution, model, text) {
  if (model.bars < 1) errors.push(`${file} ${resolution}: bars must be >= 1`);
  if (!text.includes(`Grid ${resolution}`)) errors.push(`${file} ${resolution}: missing grid metadata`);
  if (!text.includes("Bar") || !text.includes("Beat") || !text.includes("Count")) errors.push(`${file} ${resolution}: missing timeline headers`);
  if (!text.includes("HH closed") && !text.includes("OH open")) errors.push(`${file} ${resolution}: missing hihat lane label`);
  if (!text.includes("SN snare") || !text.includes("BD kick")) errors.push(`${file} ${resolution}: missing core lane labels`);
  if (model.bars > barsPerBlock && !text.includes(`=== Bars ${barsPerBlock + 1}-`)) errors.push(`${file} ${resolution}: missing second block heading`);

  const lineLengths = text.split("\n").map((line) => line.length);
  const maxLen = Math.max(...lineLengths);
  if (maxLen > maxLineLength) warnings.push(`${file} ${resolution}: longest line ${maxLen} chars; consider smaller barsPerBlock for narrow screens`);
}

function timelineLine(label, model, stepStart, stepEnd, cellText) {
  return label.padEnd(10, " ") + range(stepStart, stepEnd).map((step) => boundary(step, model.stepsPerBeat, model.stepsPerBar, -1) + fitCell(cellText(step))).join("");
}

function range(start, end) {
  return Array.from({ length: end - start }, (_, index) => start + index);
}

function boundary(step, stepsPerBeat, stepsPerBar, playhead) {
  if (step === playhead) return "▶";
  if (step % stepsPerBar === 0) return "|";
  if (step % stepsPerBeat === 0) return ":";
  return " ";
}

function countLabel(step, stepsPerBeat) {
  const beat = Math.floor(step / stepsPerBeat) % 4 + 1;
  const pos = step % stepsPerBeat;
  if (stepsPerBeat === 2) return pos === 0 ? String(beat) : "+";
  if (stepsPerBeat === 4) return [String(beat), "e", "+", "a"][pos];
  return [String(beat), "·", "e", "·", "+", "·", "a", "·"][pos] ?? "";
}

function fitCell(text) {
  return text.padEnd(3, " ").slice(0, 3);
}

function glyph(base, velocity) {
  if (velocity < 0.35) return `(${base})`;
  if (velocity > 0.85) return ` ${base.toUpperCase()} `;
  return ` ${base} `;
}

function collisionGlyph(base, hitCount = 2) {
  if (hitCount <= 1) return base;
  const trimmed = base.trim();
  const char = trimmed.startsWith("(") ? trimmed.slice(1, 2) : trimmed.slice(0, 1);
  return ` ${char}+`;
}

function countStackedPositions(track, secPerStep) {
  const positions = new Map();
  for (const event of track.events) {
    const step = Math.round(event.timeSec / secPerStep);
    positions.set(step, (positions.get(step) ?? 0) + 1);
  }
  return [...positions.values()].filter((count) => count > 1).length;
}
