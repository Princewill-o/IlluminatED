"use client";

/** Tiny synthesised sound effects (no audio files to download). */
type Cue = "right" | "wrong" | "promote" | "tick" | "fired" | "click" | "chirp" | "step" | "door" | "train";

let ctx: AudioContext | null = null;
const KEY = "arcade-sound";

export function soundOn() {
  try {
    return localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
}

export function setSoundOn(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? "on" : "off");
  } catch {
    // Storage blocked: the toggle still works for this visit.
  }
}

function tone(
  freq: number,
  start: number,
  length: number,
  type: OscillatorType,
  volume = 0.08,
) {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(volume, ctx.currentTime + start);
  gain.gain.exponentialRampToValueAtTime(
    0.0001,
    ctx.currentTime + start + length,
  );
  osc.connect(gain).connect(ctx.destination);
  osc.start(ctx.currentTime + start);
  osc.stop(ctx.currentTime + start + length + 0.02);
}

export function play(cue: Cue, enabled: boolean) {
  if (!enabled || typeof window === "undefined") return;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    switch (cue) {
      case "right":
        tone(660, 0, 0.12, "square", 0.05);
        tone(990, 0.08, 0.18, "square", 0.05);
        break;
      case "wrong":
        tone(180, 0, 0.25, "sawtooth", 0.05);
        tone(140, 0.12, 0.3, "sawtooth", 0.05);
        break;
      case "promote":
        [523, 659, 784, 1047].forEach((f, i) =>
          tone(f, i * 0.09, 0.2, "square", 0.05),
        );
        break;
      case "fired":
        [392, 330, 262, 196].forEach((f, i) =>
          tone(f, i * 0.16, 0.3, "triangle", 0.07),
        );
        break;
      case "tick":
        tone(1200, 0, 0.04, "sine", 0.03);
        break;
      case "click":
        tone(500, 0, 0.05, "sine", 0.03);
        break;
      case "chirp": {
        const base = 2200 + Math.random() * 1400;
        tone(base, 0, 0.06, "sine", 0.012);
        tone(base * 1.25, 0.08, 0.05, "sine", 0.01);
        if (Math.random() > 0.5) tone(base * 1.1, 0.16, 0.05, "sine", 0.01);
        break;
      }
      case "step":
        tone(110 + Math.random() * 40, 0, 0.03, "triangle", 0.012);
        break;
      case "door":
        tone(392, 0, 0.12, "sine", 0.04);
        tone(523, 0.1, 0.18, "sine", 0.04);
        break;
      case "train":
        // Two-tone chime, then the rumble of the train pulling away.
        tone(659, 0, 0.22, "sine", 0.05);
        tone(523, 0.24, 0.3, "sine", 0.05);
        for (let i = 0; i < 8; i++) tone(70 + i * 9, 0.55 + i * 0.07, 0.12, "sawtooth", 0.012);
        break;
    }
  } catch {
    // Audio isn't available (e.g. autoplay blocked). Silence is fine.
  }
}
