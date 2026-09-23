(function () {
  const canvas = document.getElementById("clock");
  if (!canvas) return;
  const ctx = canvas.getContext("2d", { alpha: false });
  const ghost = document.createElement("canvas");
  const gtx = ghost.getContext("2d");
  let holdUntil = 0;
  const clamp = (v) => Math.max(0, Math.min(1, v));
  const ease = (v) => 1 - Math.pow(1 - clamp(v), 3);
  const rad = (d) => (d * Math.PI) / 180;
  const pt = (cx, cy, a, d) => ({ x: cx + Math.sin(a) * d, y: cy - Math.cos(a) * d });
  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth, h = window.innerHeight;
    canvas.width = Math.floor(w * dpr); canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + "px"; canvas.style.height = h + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ghost.width = canvas.width; ghost.height = canvas.height;
    gtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  const lock = async () => { try { if (navigator.wakeLock) await navigator.wakeLock.request("screen"); } catch (e) {} };
  window.addEventListener("resize", resize);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") { holdUntil = Date.now() + 4000; lock(); } });
  canvas.addEventListener("pointerdown", lock, { once: true });
  resize(); lock();
  const led = document.createElement("canvas"); led.width = 64; led.height = 64;
  const lt = led.getContext("2d"); lt.fillStyle = "#e8eef2"; lt.fillRect(0, 0, 64, 64);
  lt.fillStyle = "rgba(90,130,155,0.16)";
  for (let y = 2; y < 64; y += 4) for (let x = 2; x < 64; x += 4) lt.fillRect(x, y, 1.2, 1.2);
  const ledPat = ctx.createPattern(led, "repeat");
  function pose(date) { const m = date.getMinutes(), h = date.getHours() % 12; return { minute: rad(m * 6), hour: rad(h * 30 + m * 0.5) }; }
  function bar(c, cx, cy, a, inner, outer, w, color) {
    const A = pt(cx, cy, a, inner), B = pt(cx, cy, a, outer);
    c.save(); c.strokeStyle = color; c.lineWidth = w; c.lineCap = "butt"; c.beginPath(); c.moveTo(A.x, A.y); c.lineTo(B.x, B.y); c.stroke(); c.restore();
  }
  function plank(c, cx, cy, a, len, vis, w) {
    const L = len * clamp(vis); if (L < 3) return;
    const inner = w * 0.2, A = pt(cx, cy, a, inner), B = pt(cx, cy, a, L);
    c.save(); c.lineCap = "butt"; c.strokeStyle = "rgba(10,10,12,0.22)"; c.lineWidth = w * 1.12;
    c.beginPath(); c.moveTo(A.x, A.y); c.lineTo(B.x, B.y); c.stroke();
    c.strokeStyle = "#141414"; c.lineWidth = w; c.beginPath(); c.moveTo(A.x, A.y); c.lineTo(B.x, B.y); c.stroke();
    c.restore();
  }
  function person(c, cx, cy, r, act, t) {
    const sway = Math.sin(t * 0.35) * r * 0.012, breath = Math.sin(t * 0.7) * r * 0.006, x = cx + sway;
    const headY = cy - r * 0.16 + breath, chestY = cy + r * 0.02 + breath, hipY = cy + r * 0.18 + breath, footY = cy + r * 0.52 + breath;
    const reach = act.mode === "wipe" ? r * (0.68 * (1 - act.progress) + 0.08) : act.mode === "paint" ? r * (0.08 + 0.62 * act.progress) : r * 0.22;
    const tool = pt(cx, cy, act.angle, reach);
    const sh = { x: x + r * 0.07, y: chestY - r * 0.02 };
    const el = { x: sh.x + (tool.x - sh.x) * 0.48, y: sh.y + (tool.y - sh.y) * 0.42 + r * 0.02 };
    c.save(); c.fillStyle = "#3a6d8f"; c.globalAlpha = 0.92;
    c.beginPath(); c.ellipse(x + r * 0.01, headY, r * 0.075, r * 0.095, 0, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.moveTo(x - r * 0.16, chestY - r * 0.04); c.quadraticCurveTo(x, chestY - r * 0.16, x + r * 0.17, chestY - r * 0.03);
    c.lineTo(x + r * 0.13, hipY); c.quadraticCurveTo(x, hipY + r * 0.06, x - r * 0.13, hipY); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(x - r * 0.09, hipY); c.lineTo(x - r * 0.2, footY); c.lineTo(x - r * 0.07, footY + r * 0.03); c.lineTo(x + r * 0.01, hipY); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(x + r * 0.03, hipY); c.lineTo(x + r * 0.2, footY); c.lineTo(x + r * 0.08, footY + r * 0.03); c.lineTo(x + r * 0.11, hipY); c.closePath(); c.fill();
    c.strokeStyle = "#3a6d8f"; c.lineCap = "round"; c.lineJoin = "round"; c.lineWidth = r * 0.085;
    c.beginPath(); c.moveTo(sh.x, sh.y); c.lineTo(el.x, el.y); c.lineTo(tool.x, tool.y); c.stroke();
    if (act.mode === "wipe") { c.fillStyle = "#e0b83a"; c.globalAlpha = 0.85; c.beginPath(); c.ellipse(tool.x, tool.y, r * 0.045, r * 0.028, act.angle, 0, Math.PI * 2); c.fill(); }
    else if (act.mode === "paint") { c.fillStyle = "#16181a"; c.globalAlpha = 0.85; c.beginPath(); c.ellipse(tool.x, tool.y, r * 0.055, r * 0.018, act.angle, 0, Math.PI * 2); c.fill(); }
    else { c.fillStyle = "#c0392b"; c.globalAlpha = 0.55; c.beginPath(); c.ellipse(x + r * 0.2, hipY + r * 0.08, r * 0.042, r * 0.032, 0.25, 0, Math.PI * 2); c.fill(); }
    c.restore();
  }
  function actionFor(date) {
    const p = pose(date), sec = date.getSeconds() + date.getMilliseconds() / 1000;
    const next = new Date(date.getTime() + 60000);
    const hourChange = next.getHours() !== date.getHours(), hourBirth = date.getMinutes() === 0, live = Date.now() >= holdUntil;
    let H = { angle: p.hour, vis: 1 }, M = { angle: p.minute, vis: 1 };
    let act = { mode: "hold", angle: Math.sin(date.getTime() / 900) * 0.22, progress: 0.2 };
    if (live && sec >= 58) {
      if (hourChange && sec >= 59) { const k = ease((sec - 59) / 1); H.vis = 1 - k; M.vis = 0; act = { mode: "wipe", angle: p.hour, progress: k }; }
      else { const k = ease((sec - 58) / (hourChange ? 1 : 2)); M.vis = 1 - k; act = { mode: "wipe", angle: p.minute, progress: k }; }
    } else if (live && sec < 4.2) {
      if (hourBirth && sec < 1.6) { const k = ease(sec / 1.6); H.vis = k; M.vis = 0; act = { mode: "paint", angle: p.hour, progress: k }; }
      else { const start = hourBirth ? 1.6 : 0, k = ease((sec - start) / (hourBirth ? 2.4 : 3.9)); M.vis = k; act = { mode: "paint", angle: p.minute, progress: k }; }
    }
    return { H, M, act };
  }
  function frame(now) {
    const w = window.innerWidth, h = window.innerHeight, r = Math.min(w, h) * 0.46, cx = w / 2, cy = h / 2;
    const date = new Date(), { H, M, act } = actionFor(date), t = now / 1000;
    ctx.fillStyle = "#121314"; ctx.fillRect(0, 0, w, h);
    const cube = Math.min(w, h) * 0.98;
    ctx.fillStyle = "#2a2c2e"; ctx.fillRect(cx - cube / 2, cy - cube / 2, cube, cube);
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = "#eef3f6"; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    if (ledPat) { ctx.globalAlpha = 0.85; ctx.fillStyle = ledPat; ctx.fillRect(cx - r, cy - r, r * 2, r * 2); ctx.globalAlpha = 1; }
    const wash = ctx.createRadialGradient(cx - r * 0.2, cy - r * 0.25, r * 0.1, cx, cy, r);
    wash.addColorStop(0, "rgba(255,255,255,0.55)"); wash.addColorStop(0.65, "rgba(210,225,235,0.12)"); wash.addColorStop(1, "rgba(160,185,200,0.28)");
    ctx.fillStyle = wash; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    gtx.clearRect(0, 0, w, h); person(gtx, cx, cy, r, act, t);
    ctx.save(); ctx.filter = "blur(" + Math.max(18, r * 0.055) + "px)"; ctx.globalAlpha = 0.72; ctx.drawImage(ghost, 0, 0, w, h); ctx.restore();
    for (let i = 0; i < 60; i++) { const hour = i % 5 === 0; bar(ctx, cx, cy, rad(i * 6), r * (hour ? 0.78 : 0.86), r * 0.945, hour ? r * 0.038 : r * 0.012, "#161616"); }
    plank(ctx, cx, cy, M.angle, r * 0.7, M.vis, r * 0.042);
    plank(ctx, cx, cy, H.angle, r * 0.46, H.vis, r * 0.052);
    ctx.fillStyle = "#111"; ctx.beginPath(); ctx.arc(cx, cy, r * 0.03, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.992, 0, Math.PI * 2); ctx.strokeStyle = "rgba(110,175,210,0.9)"; ctx.lineWidth = Math.max(3, r * 0.014); ctx.stroke();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  if (navigator.serviceWorker) navigator.serviceWorker.register("./sw.js").catch(() => {});
})();
