// Particles drift along a slowly changing flow field and swirl around the pointer.
(() => {
  const canvas = document.getElementById("field");
  const ctx = canvas.getContext("2d");
  const hint = document.querySelector(".hint");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let w, h, dpr, particles, seed, hueBase;
  const pointer = { x: -9999, y: -9999, active: false };

  // Cheap smooth 2D value noise.
  function hash(x, y) {
    const s = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
    return s - Math.floor(s);
  }
  function noise(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash(xi, yi), b = hash(xi + 1, yi);
    const c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }

  function spawn(p) {
    p.x = Math.random() * w;
    p.y = Math.random() * h;
    p.life = 100 + Math.random() * 300;
    p.hue = hueBase + Math.random() * 70;
    return p;
  }

  function reset() {
    seed = Math.random() * 1000;
    hueBase = Math.random() * 360;
    const count = Math.min(2200, Math.floor((w * h) / 700));
    particles = Array.from({ length: count }, () => spawn({}));
    ctx.fillStyle = "#0b0b12";
    ctx.fillRect(0, 0, w, h);
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    reset();
  }

  let t = 0;
  function draw() {
    t += 0.0015;
    ctx.fillStyle = "rgba(11, 11, 18, 0.035)";
    ctx.fillRect(0, 0, w, h);
    ctx.lineWidth = 1.1;

    for (const p of particles) {
      const angle = noise(p.x * 0.0028, p.y * 0.0028 + t) * Math.PI * 4;
      let vx = Math.cos(angle) * 1.4;
      let vy = Math.sin(angle) * 1.4;

      if (pointer.active) {
        const dx = p.x - pointer.x, dy = p.y - pointer.y;
        const dist2 = dx * dx + dy * dy;
        if (dist2 < 160 * 160) {
          const f = (1 - Math.sqrt(dist2) / 160) * 3;
          // Swirl tangentially plus a gentle push outward.
          vx += (-dy * 0.6 + dx * 0.4) / 160 * f * 4;
          vy += (dx * 0.6 + dy * 0.4) / 160 * f * 4;
        }
      }

      const nx = p.x + vx, ny = p.y + vy;
      ctx.strokeStyle = `hsla(${p.hue % 360}, 90%, 66%, 0.8)`;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(nx, ny);
      ctx.stroke();
      p.x = nx;
      p.y = ny;

      if (--p.life < 0 || p.x < 0 || p.x > w || p.y < 0 || p.y > h) spawn(p);
    }
  }

  function loop() {
    draw();
    requestAnimationFrame(loop);
  }

  // With reduced motion, draw a settled still frame instead of animating.
  function still() {
    for (let i = 0; i < 120; i++) draw();
  }

  function setPointer(e) {
    const pt = e.touches ? e.touches[0] : e;
    pointer.x = pt.clientX;
    pointer.y = pt.clientY;
    pointer.active = true;
    hint.classList.add("gone");
  }

  window.addEventListener("pointermove", setPointer);
  window.addEventListener("touchmove", setPointer, { passive: true });
  document.documentElement.addEventListener("mouseleave", () => (pointer.active = false));
  window.addEventListener("touchend", () => (pointer.active = false));
  window.addEventListener("click", () => {
    reset();
    window.dispatchEvent(new Event("reshuffle"));
    if (reduceMotion) still();
  });
  window.addEventListener("resize", () => {
    resize();
    if (reduceMotion) still();
  });

  resize();
  if (reduceMotion) still();
  else requestAnimationFrame(loop);
})();
