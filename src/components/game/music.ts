"use client";

export type MusicScene = "city" | "nature" | "home" | "study" | "station" | "journey" | "arcade" | "quiet" | "university" | "work" | "shop";

const THEMES: Record<MusicScene, { bpm: number; root: number; melody: number[]; chords: number[]; brightness: number }> = {
  city: { bpm: 88, root: 48, melody: [12, 16, 19, 21, 19, 16, 14, 16], chords: [0, 5, 9, 7], brightness: 2200 },
  nature: { bpm: 66, root: 50, melody: [19, 21, 24, 21, 19, 16, 14, 12], chords: [0, 5, 0, 7], brightness: 1600 },
  home: { bpm: 72, root: 48, melody: [16, 19, 14, 12, 16, 21, 19, 16], chords: [0, 9, 5, 7], brightness: 1400 },
  study: { bpm: 62, root: 53, melody: [12, 19, 16, 14, 12, 16, 19, 24], chords: [0, 5, 9, 5], brightness: 1200 },
  station: { bpm: 92, root: 46, melody: [12, 14, 19, 16, 21, 19, 16, 14], chords: [0, 5, 7, 5], brightness: 1800 },
  journey: { bpm: 96, root: 48, melody: [12, 16, 19, 24, 21, 19, 16, 19], chords: [0, 7, 9, 5], brightness: 2000 },
  arcade: { bpm: 112, root: 48, melody: [12, 19, 24, 19, 16, 21, 19, 14], chords: [0, 5, 9, 7], brightness: 2800 },
  quiet: { bpm: 58, root: 50, melody: [12, 14, 19, 16, 14, 12, 16, 14], chords: [0, 5, 0, 5], brightness: 1000 },
  university: { bpm: 76, root: 55, melody: [19, 16, 14, 12, 16, 19, 21, 24], chords: [0, 5, 9, 7], brightness: 1800 },
  work: { bpm: 84, root: 50, melody: [12, 16, 19, 16, 14, 19, 21, 19], chords: [0, 9, 5, 7], brightness: 1600 },
  shop: { bpm: 94, root: 53, melody: [16, 19, 21, 19, 12, 14, 16, 19], chords: [0, 5, 7, 0], brightness: 2200 },
};

/** Original scene arrangements with recorded grand piano, bass and soft percussion. */
export function createMusic() {
  const context = new AudioContext();
  const master = context.createGain();
  master.gain.value = 0;
  master.connect(context.destination);
  let scene: MusicScene = "city";
  let bus: GainNode | null = null;
  let step = 0;
  let next = 0;
  let volume = 0.25;
  let enabled = true;
  let closed = false;
  const frequency = (note: number) => 440 * 2 ** ((note - 69) / 12);
  const piano = new Map<number, AudioBuffer>();
  const abort = new AbortController();
  // Recorded Yamaha C5 samples by Alexander Holm (CC BY 3.0); bundled locally.
  for (const [note, file] of [[36, "C2"], [48, "C3"], [60, "C4"], [72, "C5"]] as const) {
    void fetch(`/audio/piano/${file}.mp3`, { signal: abort.signal }).then(r => { if (!r.ok) throw new Error("Sample unavailable"); return r.arrayBuffer(); })
      .then(data => context.decodeAudioData(data)).then(buffer => { if (!closed) piano.set(note, buffer); }).catch(() => {});
  }
  const room = context.createConvolver();
  const impulse = context.createBuffer(2, context.sampleRate * 1.4, context.sampleRate);
  for (let c = 0; c < 2; c++) { const data = impulse.getChannelData(c); for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) ** 3 * 0.3; }
  room.buffer = impulse;
  const wet = context.createGain(); wet.gain.value = 0.16;
  room.connect(wet).connect(master);

  const voice = (note: number, at: number, duration: number, level: number, pad = false) => {
    if (!bus) return;
    if (!pad && piano.size) {
      const key = [...piano.keys()].sort((a, b) => Math.abs(a - note) - Math.abs(b - note))[0];
      const source = context.createBufferSource(), envelope = context.createGain(), pan = context.createStereoPanner();
      source.buffer = piano.get(key)!; source.playbackRate.value = 2 ** ((note - key) / 12);
      pan.pan.value = Math.max(-0.45, Math.min(0.45, (note - 60) / 36));
      envelope.gain.setValueAtTime(level * 2.2, at); envelope.gain.setTargetAtTime(0.0001, at + duration * 0.7, 0.2);
      source.connect(envelope).connect(pan); pan.connect(bus); pan.connect(room);
      source.onended = () => { source.disconnect(); envelope.disconnect(); pan.disconnect(); };
      source.start(at); source.stop(at + duration + 0.9);
      return;
    }
    const osc = context.createOscillator();
    const gain = context.createGain();
    const filter = context.createBiquadFilter();
    osc.type = pad ? "triangle" : "sine";
    osc.frequency.value = frequency(note);
    filter.type = "lowpass";
    filter.frequency.value = THEMES[scene].brightness;
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(level, at + (pad ? 0.35 : 0.025));
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    osc.connect(filter).connect(gain).connect(bus);
    osc.onended = () => { osc.disconnect(); filter.disconnect(); gain.disconnect(); };
    osc.start(at);
    osc.stop(at + duration + 0.05);
  };
  const change = (value: MusicScene) => {
    scene = value;
    if (bus) {
      const previous = bus;
      previous.gain.cancelScheduledValues(context.currentTime);
      previous.gain.setTargetAtTime(0, context.currentTime, 0.2);
      window.setTimeout(() => previous.disconnect(), 2500);
    }
    bus = context.createGain();
    bus.gain.setValueAtTime(0, context.currentTime);
    bus.gain.linearRampToValueAtTime(1, context.currentTime + 1.2);
    bus.connect(master);
    step = 0;
    next = context.currentTime + 0.05;
  };
  change(scene);
  const drum = (at: number, kick: boolean) => {
    if (!bus) return;
    const gain = context.createGain(); gain.gain.setValueAtTime(kick ? 0.07 : 0.018, at); gain.gain.exponentialRampToValueAtTime(0.0001, at + (kick ? 0.2 : 0.065));
    const osc = context.createOscillator(); osc.type = kick ? "sine" : "triangle";
    osc.frequency.setValueAtTime(kick ? 115 : 6500, at); osc.frequency.exponentialRampToValueAtTime(kick ? 38 : 1900, at + 0.08);
    osc.connect(gain).connect(bus); osc.start(at); osc.stop(at + 0.22); osc.onended = () => { osc.disconnect(); gain.disconnect(); };
  };
  const timer = window.setInterval(() => {
    if (closed || context.state !== "running" || !enabled) return;
    if (next < context.currentTime) next = context.currentTime + 0.05;
    const theme = THEMES[scene];
    const beat = 60 / theme.bpm;
    while (next < context.currentTime + 0.3) {
      // Diatonic bass movement with major/minor voicings appropriate to each chord.
      const chord = theme.chords[Math.floor(step / 8) % theme.chords.length];
      if (step % 8 === 0) {
        [0, chord === 9 ? 3 : 4, 7, 14].forEach(interval => voice(theme.root + chord + interval, next, beat * 4.5, 0.035, true));
        voice(theme.root + chord - 12, next, beat * 3, 0.07);
      }
      if (["city", "station", "journey", "arcade", "shop"].includes(scene)) {
        if (step % 4 === 0) drum(next, true);
        if (step % 2 === 1) drum(next, false);
        if (step % 8 === 4) voice(theme.root + chord - 12, next, beat * 1.5, 0.04);
      }
      // Leave space between phrases; a slower, quieter melody suits revision.
      if (step % 8 !== 7 && (scene !== "study" || step % 2 === 0)) {
        voice(theme.root + theme.melody[step % theme.melody.length], next, beat * 1.8, 0.065);
        voice(theme.root + theme.melody[step % theme.melody.length] + 12, next + beat * 0.4, beat * 1.3, 0.012);
      }
      next += beat / 2;
      step++;
    }
  }, 100);

  return {
    scene: change,
    volume(value: number) {
      volume = Math.max(0, Math.min(1, value));
      master.gain.setTargetAtTime(enabled ? volume * 0.65 : 0, context.currentTime, 0.15);
    },
    async active(value: boolean) {
      enabled = value;
      if (closed) return;
      if (value) {
        await context.resume();
        if (closed || !enabled) return;
        next = Math.max(next, context.currentTime + 0.05);
      }
      master.gain.setTargetAtTime(value ? volume * 0.65 : 0, context.currentTime, 0.15);
    },
    suspend() { if (!closed) void context.suspend().catch(() => {}); },
    dispose() {
      closed = true;
      abort.abort(); room.disconnect(); wet.disconnect();
      clearInterval(timer);
      void context.close().catch(() => {});
    },
  };
}
