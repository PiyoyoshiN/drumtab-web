import { h } from "./ui";
import { toast } from "./toast";
import { createFileLoader } from "./FileLoader";
import { createGridView } from "./GridView";
import { createScoreView } from "./ScoreView";
import { createInitialState, type AppState, type ViewMode } from "./state";
import { Toolbar } from "./components/Toolbar";
import { ParamsPanel } from "./components/ParamsPanel";

import type { DrumTrack, DrumEvent } from "../core/model/types";
import type { GridResolution } from "../core/model/quantize";

import { quantizeTrackWithPhase } from "../core/model/quantize";
import { estimateBeatPhase } from "../core/audio/phase";
import { DEFAULT_AUDIO_PARAMS } from "../core/audio/audioParams";
import { createDrumSynth } from "../core/audio/drumSynth";

import { parseMidiFromArrayBuffer } from "../core/midi/parseMidi";
import { decodeAudioFile, decodeWavBytes } from "../core/audio/decodeAudio";
import { audioToDrumTrack } from "../core/audio/audioToDrumTrack";
import { extractWavFromVideo } from "../core/video/extractWav";

import { writeDrumTrackAsMidi } from "../core/midi/writeMidi";
import { downloadBytes } from "./downloadBin";

export function createApp() {
  const synth = createDrumSynth();
  let state: AppState = createInitialState({ ...DEFAULT_AUDIO_PARAMS });

  let gridView: ReturnType<typeof createGridView> | null = null;

  // 再生管理
  let stopTimer: number | null = null;
  let rafId: number | null = null;
  let playStartAudioTime: number | null = null;
  let playTotalSec = 0;
  let playSpeed = 1.0; // ✅ 再生開始時速度を固定

  const root = h("div", { className: "app" });

  const header = h(
    "div",
    { className: "header panel" },
    h(
      "div",
      { className: "panel-inner title" },
      h("h1", { textContent: "DrumTab" }),
      h("div", { className: "badge", textContent: "v0.1.0-beta" })
    )
  );

  const statusText = h("div", {
    className: "status",
    textContent: "ファイルを選択して開始"
  });
  const statusPanel = h("div", { className: "panel" }, h("div", { className: "panel-inner" }, statusText));

  const controlsInner = h("div", { className: "panel-inner" });
  const controlsPanel = h("div", { className: "panel" }, controlsInner);

  const viewer = h("div", { className: "panel viewer" }, h("div", { className: "panel-inner" }));

  const loader = createFileLoader(async (file) => {
    const name = file.name.toLowerCase();
    try {
      if (name.endsWith(".json")) {
        statusText.textContent = `JSON 読込中: ${file.name}`;
        const txt = await file.text();
        state.track = JSON.parse(txt) as DrumTrack;
        statusText.textContent = `OK(JSON): events=${state.track.events.length}`;
        render();
        return;
      }

      if (name.endsWith(".mp4") || name.endsWith(".webm") || file.type.startsWith("video/")) {
        statusText.textContent = `Video→Audio抽出中: ${file.name}`;
        const wav = await extractWavFromVideo(file);
        statusText.textContent = `Audio decode中: ${file.name}`;
        const decoded = await decodeWavBytes(wav);
        statusText.textContent = `解析中(Audio): ${file.name}`;
        state.track = await audioToDrumTrack(decoded.mono, decoded.sampleRate, state.audioParams);
        statusText.textContent = `OK(Video): events=${state.track.events.length}`;
        render();
        return;
      }

      if (name.endsWith(".wav") || name.endsWith(".mp3") || name.endsWith(".ogg") || file.type.startsWith("audio/")) {
        statusText.textContent = `Audio decode中: ${file.name}`;
        const decoded = await decodeAudioFile(file);
        statusText.textContent = `解析中(Audio): ${file.name}`;
        state.track = await audioToDrumTrack(decoded.mono, decoded.sampleRate, state.audioParams);
        statusText.textContent = `OK(Audio): events=${state.track.events.length}`;
        render();
        return;
      }

      statusText.textContent = `解析中(MIDI): ${file.name}`;
      const buf = await file.arrayBuffer();
      state.track = await parseMidiFromArrayBuffer(buf);
      statusText.textContent = `OK(MIDI): events=${state.track.events.length}`;
      render();
    } catch (e) {
      console.error(e);
      toast("読み込みに失敗しました（形式/容量を確認）");
      statusText.textContent = `失敗: ${String((e as any)?.message ?? e)}`;
    }
  });

  function drumKind(e: DrumEvent) {
    if (e.drum === "kick") return "kick";
    if (e.drum === "snare") return "snare";
    if (e.drum === "hh_closed" || e.drum === "hh_open") return "hh";
    if (e.drum === "crash") return "crash";
    if (e.drum === "ride") return "ride";
    if (e.drum === "tom_low" || e.drum === "tom_mid" || e.drum === "tom_high") return "tom";
    return null;
  }

  function stopPlayback() {
    if (!state.isPlaying) return;
    state.isPlaying = false;

    if (stopTimer !== null) {
      clearTimeout(stopTimer);
      stopTimer = null;
    }
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    if (gridView) gridView.setPlayhead(-1);
    renderControlsOnly();
  }

  async function playCurrent() {
    if (!state.track || state.isPlaying) return;
    await synth.resume();

    const track = prepareTrackForView(state.track);
    const playable = track.events
      .map((e) => ({ e, k: drumKind(e) }))
      .filter((x) => x.k !== null) as { e: DrumEvent; k: any }[];

    if (playable.length === 0) return;

    state.isPlaying = true;
    renderControlsOnly();

    playSpeed = state.speed; // ✅ ここで1回だけ固定
    const startAt = synth.ctx.currentTime + 0.05;
    playStartAudioTime = startAt;

    const t0 = playable[0].e.timeSec;

    for (const { e, k } of playable) {
      const at = startAt + (e.timeSec - t0) / playSpeed;
      synth.hit(k, at, e.velocity);
    }

    const last = playable[playable.length - 1].e.timeSec;
    playTotalSec = (last - t0) / playSpeed + 0.3;

    startPlayheadLoop(track);

    stopTimer = window.setTimeout(() => stopPlayback(), playTotalSec * 1000);
  }

  function startPlayheadLoop(prepared: DrumTrack) {
    if (!gridView) return;
    if (rafId !== null) cancelAnimationFrame(rafId);

    const tick = () => {
      if (!state.isPlaying || !gridView || playStartAudioTime === null) return;
      const elapsed = (synth.ctx.currentTime - playStartAudioTime) * playSpeed;
      const step = Math.floor(elapsed / gridView.secPerStep);
      gridView.setPlayhead(Math.max(0, Math.min(gridView.steps - 1, step)));
      if (elapsed < playTotalSec * playSpeed) rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
  }

  function prepareTrackForView(src: DrumTrack) {
    const bpm = src.bpm ?? 120;
    const ph = estimateBeatPhase(
      src,
      bpm,
      state.gridRes === "8th" ? "8th" : state.gridRes === "32nd" ? "32nd" : "16th"
    );
    return quantizeTrackWithPhase(src, state.quantizePct / 100, state.gridRes, ph.phaseSec);
  }

  function renderControlsOnly() {
    controlsInner.textContent = "";
    controlsInner.appendChild(
      Toolbar(state, {
        setViewMode: (m: ViewMode) => {
          state.viewMode = m;
          render();
        },
        onPlay: playCurrent,
        onStop: stopPlayback,
        onExportMidi: () => {
          if (!state.track) return;
          const bytes = writeDrumTrackAsMidi(state.track);
          downloadBytes("drumtab.mid", bytes, "audio/midi");
        }
      })
    );

    controlsInner.appendChild(
      ParamsPanel(state, {
        setQuantize: (pct) => {
          state.quantizePct = pct;
          render();
        },
        setGridRes: (r: GridResolution) => {
          state.gridRes = r;
          render();
        },
        setSpeed: (v) => {
          state.speed = v;
          renderControlsOnly();
        }
      })
    );

    controlsInner.appendChild(loader);
  }

  function render() {
    renderControlsOnly();

    const inner = viewer.querySelector(".panel-inner") as HTMLElement;
    inner.textContent = "";

    if (!state.track) {
      inner.appendChild(h("div", { className: "status", textContent: "ファイルを選ぶとここに表示されます" }));
      return;
    }

    const prepared = prepareTrackForView(state.track);

    if (state.viewMode === "Grid") {
      gridView = createGridView(prepared, { resolution: state.gridRes });
      inner.appendChild(gridView.el);
    } else {
      gridView = null;
      inner.appendChild(createScoreView(prepared));
    }
  }

  // SpaceでPlay/Stop
  window.addEventListener("keydown", (e) => {
    if (e.code === "Space") {
      e.preventDefault();
      if (state.isPlaying) stopPlayback();
      else playCurrent();
    }
  });

  // 左右レイアウト
  const left = document.createElement("div");
  left.style.display = "grid";
  left.style.gap = "14px";
  left.append(statusPanel, controlsPanel);

  const layout = document.createElement("div");
  layout.className = "layout";
  layout.append(left, viewer);

  root.append(header, layout);
  render();
  return root;
}