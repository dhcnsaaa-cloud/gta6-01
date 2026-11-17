// HALCYON BAY — audio.js
// One job: all sound, synthesized with WebAudio — no audio files, no network.
// Engine hum, siren, punch, gunshot, pickup chime, mission sting.
export function createAudio() {
  const a = { ctx: null, muted: false, engine: null, engineGain: null, sirenOsc: null };
  a.ensure = () => {
    if (!a.ctx) {
      try {
        a.ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch { a.ctx = null; }
    }
    // Resume at most once per 5s: without a user gesture the context stays
    // suspended and every resume() logs an autoplay warning — per-frame
    // resume calls flood the console (and slow headless captures to a crawl).
    if (a.ctx && a.ctx.state === 'suspended') {
      const now = Date.now();
      if (!a._resumeTried || now - a._resumeTried > 5000) {
        a._resumeTried = now;
        a.ctx.resume();
      }
    }
    return a.ctx;
  };
  a.tone = (freq, dur, type = 'sine', vol = 0.15, slide = 0) => {
    if (a.muted) return;
    const ctx = a.ensure(); if (!ctx) return;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = freq;
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), ctx.currentTime + dur);
    g.gain.setValueAtTime(vol, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    o.connect(g); g.connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + dur);
  };
  a.noise = (dur, vol = 0.2) => {
    if (a.muted) return;
    const ctx = a.ensure(); if (!ctx) return;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const g = ctx.createGain(); g.gain.value = vol;
    src.connect(g); g.connect(ctx.destination); src.start();
  };
  a.punch = () => a.noise(0.12, 0.3);
  a.shot = () => { a.noise(0.15, 0.4); a.tone(160, 0.1, 'square', 0.12, -100); };
  a.pickup = () => { a.tone(660, 0.12, 'sine', 0.15); setTimeout(() => a.tone(880, 0.18, 'sine', 0.15), 90); };
  a.sting = () => { [523, 659, 784].forEach((f, i) => setTimeout(() => a.tone(f, 0.25, 'triangle', 0.18), i * 110)); };
  a.fail = () => { a.tone(220, 0.3, 'sawtooth', 0.12, -80); };
  // Garage clank: a wrench hit + a low thud when an upgrade lands.
  a.clank = () => { a.tone(1180, 0.08, 'square', 0.1); a.noise(0.08, 0.2); setTimeout(() => a.tone(180, 0.15, 'sine', 0.2), 90); };
  // Helicopter rotor: chopped low noise loop while the heli is overhead.
  a.rotor = (on) => {
    const ctx = a.ensure(); if (!ctx) return;
    if (on && !a.rotorSrc) {
      const len = Math.floor(ctx.sampleRate * 0.25);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (i < len / 2 ? 1 : 0.4);
      const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 300;
      const g = ctx.createGain(); g.gain.value = 0.06;
      src.connect(f); f.connect(g); g.connect(ctx.destination);
      src.start();
      a.rotorSrc = src; a.rotorGain = g;
    } else if (!on && a.rotorSrc) {
      try { a.rotorSrc.stop(); } catch { /* already stopped */ }
      a.rotorSrc = null; a.rotorGain = null;
    }
  };
  a.siren = (on) => {
    const ctx = a.ensure(); if (!ctx) return;
    if (on && !a.sirenOsc) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = 700; g.gain.value = 0.03;
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.6;
      const lg = ctx.createGain(); lg.gain.value = 260;
      lfo.connect(lg); lg.connect(o.frequency);
      o.connect(g); g.connect(ctx.destination);
      o.start(); lfo.start();
      a.sirenOsc = { o, lfo, g };
    } else if (!on && a.sirenOsc) {
      try { a.sirenOsc.o.stop(); a.sirenOsc.lfo.stop(); } catch { /* already stopped */ }
      a.sirenOsc = null;
    }
  };
  a.engine = (speedNorm) => {
    const ctx = a.ensure(); if (!ctx) return;
    if (!a.engOsc) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sawtooth'; o.frequency.value = 60; g.gain.value = 0;
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 400;
      o.connect(f); f.connect(g); g.connect(ctx.destination);
      o.start();
      a.engOsc = o; a.engGain = g;
    }
    const target = speedNorm > 0.02 ? 0.05 : 0;
    a.engGain.gain.setTargetAtTime(target, ctx.currentTime, 0.1);
    a.engOsc.frequency.setTargetAtTime(55 + speedNorm * 160, ctx.currentTime, 0.1);
  };
  return a;
}
