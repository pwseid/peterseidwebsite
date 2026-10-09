// Ambient sound that follows the pointer: a soft drone whose brightness tracks
// height on the page, and pentatonic chimes when the pointer moves quickly.
// Browsers only allow audio after a click, so it starts from the toggle button.
(() => {
  const button = document.getElementById("sound");
  const SCALES = [
    [0, 2, 4, 7, 9],   // major pentatonic
    [0, 3, 5, 7, 10],  // minor pentatonic
    [0, 2, 5, 7, 9],   // suspended
  ];

  let ctx, master, filter, drones = [], delay;
  let root = 48 + Math.floor(Math.random() * 7); // MIDI note, around C3
  let scale = SCALES[0];
  let on = false;
  let last = null, lastChime = 0;

  const freq = (midi) => 440 * Math.pow(2, (midi - 69) / 12);

  function build() {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);

    // Echo for the chimes.
    delay = ctx.createDelay(1);
    delay.delayTime.value = 0.38;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.35;
    const wet = ctx.createGain();
    wet.gain.value = 0.4;
    delay.connect(feedback).connect(delay);
    delay.connect(wet).connect(master);

    filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 600;
    filter.Q.value = 4;
    filter.connect(master);

    // Root, fifth and octave, each a slightly detuned pair.
    for (const interval of [0, 7, 12]) {
      for (const detune of [-6, 6]) {
        const osc = ctx.createOscillator();
        osc.type = interval === 0 ? "sawtooth" : "triangle";
        osc.detune.value = detune;
        const g = ctx.createGain();
        g.gain.value = 0.05;
        osc.connect(g).connect(filter);
        osc.start();
        drones.push({ osc, interval });
      }
    }
    tuneDrones(0);
  }

  function tuneDrones(glide) {
    const now = ctx.currentTime;
    for (const d of drones) {
      d.osc.frequency.setTargetAtTime(freq(root - 12 + d.interval), now, glide || 0.01);
    }
  }

  function chime(y) {
    const now = ctx.currentTime;
    // Higher on the page plays higher notes.
    const step = Math.floor((1 - y / window.innerHeight) * 10);
    const note = root + 12 + scale[step % 5] + 12 * Math.floor(step / 5);
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq(note);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.12, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 1.6);
    osc.connect(g);
    g.connect(master);
    g.connect(delay);
    osc.start(now);
    osc.stop(now + 1.7);
  }

  function onMove(e) {
    if (!on) return;
    const pt = e.touches ? e.touches[0] : e;
    const now = performance.now();
    filter.frequency.setTargetAtTime(
      300 + (1 - pt.clientY / window.innerHeight) * 2200, ctx.currentTime, 0.15);
    if (last) {
      const dt = Math.max(now - last.t, 1);
      const speed = Math.hypot(pt.clientX - last.x, pt.clientY - last.y) / dt;
      if (speed > 0.9 && now - lastChime > 140) {
        chime(pt.clientY);
        lastChime = now;
      }
    }
    last = { x: pt.clientX, y: pt.clientY, t: now };
  }

  function setOn(next) {
    on = next;
    if (on) {
      if (!ctx) build();
      ctx.resume();
      master.gain.setTargetAtTime(0.8, ctx.currentTime, 0.5);
    } else if (ctx) {
      master.gain.setTargetAtTime(0, ctx.currentTime, 0.2);
    }
    button.setAttribute("aria-pressed", String(on));
    button.textContent = on ? "sound on" : "sound off";
  }

  button.addEventListener("click", (e) => {
    e.stopPropagation(); // don't reshuffle the art
    setOn(!on);
  });
  window.addEventListener("pointermove", onMove);
  window.addEventListener("touchmove", onMove, { passive: true });

  // A reshuffle of the art also moves the music to a new key and scale.
  window.addEventListener("reshuffle", () => {
    root = 48 + Math.floor(Math.random() * 7);
    scale = SCALES[Math.floor(Math.random() * SCALES.length)];
    if (ctx) tuneDrones(0.4);
  });
})();
