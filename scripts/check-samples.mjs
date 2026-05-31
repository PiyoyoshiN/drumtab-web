import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const sampleDir = path.join(process.cwd(), "public", "samples");
const validDrums = new Set([
  "kick",
  "snare",
  "hh_closed",
  "hh_open",
  "crash",
  "ride",
  "tom_low",
  "tom_mid",
  "tom_high"
]);
const requiredSamples = new Set([
  "basic-rock-16th.json",
  "eighth-note-groove.json",
  "rock-fill-2bar.json",
  "thirty-second-check.json"
]);
const resolutions = [
  ["8th", 2],
  ["16th", 4],
  ["32nd", 8]
];

const files = (await readdir(sampleDir)).filter((file) => file.endsWith(".json")).sort();
const errors = [];

for (const required of requiredSamples) {
  if (!files.includes(required)) errors.push(`missing sample: ${required}`);
}

for (const file of files) {
  const fullPath = path.join(sampleDir, file);
  const track = JSON.parse(await readFile(fullPath, "utf8"));
  validateTrack(file, track, errors);
  const stats = resolutions.map(([name, stepsPerBeat]) => `${name}:${gridStats(track, stepsPerBeat)}`).join(" ");
  console.log(`${file} ${stats}`);
}

if (errors.length) {
  console.error(errors.map((error) => `- ${error}`).join("\n"));
  process.exit(1);
}

console.log(`Checked ${files.length} sample files.`);

function validateTrack(file, track, errors) {
  if (!Number.isFinite(track.bpm) || track.bpm <= 0) errors.push(`${file}: bpm must be positive`);
  if (!Array.isArray(track.events) || track.events.length === 0) errors.push(`${file}: events must be a non-empty array`);

  const drums = new Set();
  for (const [index, event] of (track.events ?? []).entries()) {
    if (!Number.isFinite(event.timeSec) || event.timeSec < 0) errors.push(`${file}: event ${index} has invalid timeSec`);
    if (!Number.isFinite(event.durationSec) || event.durationSec < 0) errors.push(`${file}: event ${index} has invalid durationSec`);
    if (!Number.isFinite(event.velocity) || event.velocity < 0 || event.velocity > 1) errors.push(`${file}: event ${index} has invalid velocity`);
    if (!validDrums.has(event.drum)) errors.push(`${file}: event ${index} has invalid drum '${event.drum}'`);
    drums.add(event.drum);
  }

  if (!drums.has("kick")) errors.push(`${file}: missing kick`);
  if (!drums.has("snare")) errors.push(`${file}: missing snare`);
  if (!drums.has("hh_closed") && !drums.has("hh_open")) errors.push(`${file}: missing hihat`);
}

function gridStats(track, stepsPerBeat) {
  const secPerStep = 60 / track.bpm / stepsPerBeat;
  const stepsPerBar = stepsPerBeat * 4;
  const maxStep = track.events.reduce((max, event) => Math.max(max, Math.round(event.timeSec / secPerStep)), 0);
  const bars = Math.max(1, Math.ceil((maxStep + 1) / stepsPerBar));
  const stacked = new Map();
  for (const event of track.events) {
    const step = Math.round(event.timeSec / secPerStep);
    stacked.set(step, (stacked.get(step) ?? 0) + 1);
  }
  const stackedSteps = [...stacked.values()].filter((count) => count > 1).length;
  return `${bars}bar/${stackedSteps}stacked`;
}
