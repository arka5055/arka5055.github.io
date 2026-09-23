const clamp = (v) => Math.max(0, Math.min(1, v));
const easeOut = (v) => 1 - Math.pow(1 - clamp(v), 3);
const toRadians = (d) => (d * Math.PI) / 180;
const poseFor = (date) => ({
  minute: { angle: toRadians(date.getMinutes() * 6), visible: 1 },
  hour: { angle: toRadians((date.getHours() % 12) * 30 + date.getMinutes() * 0.5), visible: 1 },
});
const pt = (cx, cy, a, d) => ({ x: cx + Math.sin(a) * d, y: cy - Math.cos(a) * d });
const line = (ctx, a, b, w, c, o = 1) => {
  ctx.save(); ctx.strokeStyle = c; ctx.globalAlpha = o; ctx.lineWidth = w; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.restore();
};

const canvas = document.getElementById("clock");
const ctx = canvas.getContext("2d");
const layer = document.createElement("canvas");
const lctx = layer.getContext("2d");
let holdUntil = 0;

const resize = () => {
  const d = Math.min(devicePixelRatio || 1, 2);
  canvas.width = innerWidth * d; canvas.height = innerHeight * d;
  canvas.style.width = innerWidth + "px"; canvas.style.height = innerHeight + "px";
  ctx.setTransform(d, 0, 0, d, 0, 0);
  layer.width = innerWidth * d; layer.height = innerHeight * d;
  lctx.setTransform(d, 0, 0, d, 0, 0);
};
const lock = async () => { try { if ("wakeLock" in navigator) await navigator.wakeLock.request("screen"); } catch (e) {} };
addEventListener("resize", resize);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") { holdUntil = Date.now() + 5000; lock(); }
});
canvas.addEventListener("click", lock, { once: true });
resize(); lock();

const tile = document.createElement("canvas"); tile.width = 48; tile.height = 48;
const t = tile.getContext("2d"); t.fillStyle = "#edf1f1"; t.fillRect(0, 0, 48, 48);
t.fillStyle = "rgba(71,99,110,.12)";
for (let x = 3; x < 48; x += 6) for (let y = 3; y < 48; y += 6) t.fillRect(x, y, 1, 1);
const pattern = ctx.createPattern(tile, "repeat");

function hand(ctx, cx, cy, r, ang, len, vis, th, time, op = 1) {
  const L = len * clamp(vis); if (L <= 0.5) return;
  const s = r * 0.038, n = 34, p = ang + Math.PI / 2;
  ctx.save(); ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = "#151819";
  ctx.globalAlpha = op * 0.16; ctx.lineWidth = th * 1.45; ctx.beginPath();
  for (let i = 0; i <= n; i++) {
    const q = i / n, d = s + (L - s) * q;
    const w = Math.sin(q * 8.7 + time * 0.8) * th * 0.13 + Math.sin(q * 18.2 + time * 0.31) * th * 0.057;
    const b = pt(cx, cy, ang, d);
    i ? ctx.lineTo(b.x + Math.sin(p) * w, b.y - Math.cos(p) * w) : ctx.moveTo(b.x + Math.sin(p) * w, b.y - Math.cos(p) * w);
  }
  ctx.stroke();
  for (let i = 0; i < n; i++) {
    const q = i / n, k = (i + 1) / n;
    const sd = s + (L - s) * q, ed = s + (L - s) * k;
    const w1 = Math.sin(q * 8.7 + time * 0.8) * th * 0.13 + Math.sin(q * 18.2 + time * 0.31) * th * 0.057;
    const w2 = Math.sin(k * 8.7 + time * 0.8) * th * 0.13 + Math.sin(k * 18.2 + time * 0.31) * th * 0.057;
    const A = pt(cx, cy, ang, sd), B = pt(cx, cy, ang, ed);
    ctx.globalAlpha = op * (0.79 + Math.sin(q * 5.2) * 0.06);
    ctx.lineWidth = th * (0.77 + Math.sin(q * 13.6 + time * 0.33) * 0.12);
    ctx.beginPath();
    ctx.moveTo(A.x + Math.sin(p) * w1, A.y - Math.cos(p) * w1);
    ctx.lineTo(B.x + Math.sin(p) * w2, B.y - Math.cos(p) * w2);
    ctx.stroke();
  }
  ctx.restore();
}

function worker(ctx, cx, cy, r, act, t) {
  const br = Math.sin(t * 0.55) * r * 0.006;
  const sh = Math.sin(t * 0.33 + 1.2) * r * 0.014;
  const wx = cx + sh, sy = cy + r * 0.005 + br, hy = cy + r * 0.2 + br, hd = cy - r * 0.15 + br;
  const dist = act.mode === "wipe" ? r * (0.74 * (1 - act.progress) + 0.055) : act.mode === "paint" ? r * (0.08 + 0.68 * act.progress) : r * 0.24;
  const tool = pt(cx, cy, act.angle, dist);
  const S = { x: wx + r * 0.1, y: sy };
  const E = { x: S.x + (tool.x - S.x) * 0.44, y: S.y + (tool.y - S.y) * 0.42 + r * 0.025 };
  ctx.save(); ctx.fillStyle = "#4c7592"; ctx.globalAlpha = 0.74;
  ctx.beginPath(); ctx.ellipse(wx - r * 0.016, hd, r * 0.043, r * 0.057, -0.08, 0, Math.PI * 2);
  ctx.moveTo(wx - r * 0.13, sy + r * 0.025);
  ctx.quadraticCurveTo(wx, sy - r * 0.048, wx + r * 0.145, sy + r * 0.03);
  ctx.lineTo(wx + r * 0.11, hy); ctx.lineTo(wx + r * 0.18, cy + r * 0.62);
  ctx.quadraticCurveTo(wx + r * 0.135, cy + r * 0.65, wx + r * 0.07, cy + r * 0.61);
  ctx.lineTo(wx, hy + r * 0.015); ctx.lineTo(wx - r * 0.13, cy + r * 0.61);
  ctx.quadraticCurveTo(wx - r * 0.18, cy + r * 0.64, wx - r * 0.21, cy + r * 0.59);
  ctx.lineTo(wx - r * 0.1, hy); ctx.closePath(); ctx.fill();
  line(ctx, S, E, r * 0.075, "#4c7592", 0.76);
  line(ctx, E, tool, r * 0.061, "#4c7592", 0.76);
  if (act.mode === "wipe") {
    ctx.fillStyle = "#ba9b55"; ctx.globalAlpha = 0.58;
    ctx.beginPath(); ctx.ellipse(tool.x, tool.y, r * 0.04, r * 0.027, act.angle, 0, Math.PI * 2); ctx.fill();
  } else if (act.mode === "paint") {
    ctx.fillStyle = "#182023"; ctx.globalAlpha = 0.58;
    ctx.beginPath(); ctx.ellipse(tool.x, tool.y, r * 0.046, r * 0.014, act.angle, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function render(now) {
  const w = innerWidth, h = innerHeight, r = Math.min(w, h) * 0.495, cx = w / 2, cy = h / 2;
  const date = new Date(), sec = date.getSeconds() + date.getMilliseconds() / 1000;
  const wiping = sec >= 58, painting = sec < 4, pose = poseFor(date);
  const next = new Date(date.getTime() + 60000);
  const hourB = date.getMinutes() === 0, willH = next.getHours() !== date.getHours();
  const inT = (wiping || painting) && Date.now() >= holdUntil, el = now / 1000;
  let H = pose.hour, M = pose.minute;
  let act = { mode: "hold", angle: Math.sin(el * 0.42) * 0.18, progress: 0.2 + Math.sin(el * 0.65) * 0.08 };
  if (inT && wiping) {
    if (willH && sec >= 59) {
      const p = easeOut((sec - 59) / 1);
      H = { ...pose.hour, visible: 1 - p }; M = { ...pose.minute, visible: 0 };
      act = { mode: "wipe", angle: pose.hour.angle, progress: p };
    } else {
      const p = easeOut((sec - 58) / (willH ? 1 : 2));
      M = { ...pose.minute, visible: 1 - p };
      act = { mode: "wipe", angle: pose.minute.angle, progress: p };
    }
  } else if (inT && painting) {
    if (hourB && sec < 1.5) {
      const p = easeOut(sec / 1.5);
      H = { ...pose.hour, visible: p }; M = { ...pose.minute, visible: 0 };
      act = { mode: "paint", angle: pose.hour.angle, progress: p };
    } else {
      const st = hourB ? 1.5 : 0, dur = hourB ? 2.35 : 3.8, p = easeOut((sec - st) / dur);
      M = { ...pose.minute, visible: p };
      act = { mode: "paint", angle: pose.minute.angle, progress: p };
    }
  }
  ctx.clearRect(0, 0, w, h); ctx.fillStyle = "#040506"; ctx.fillRect(0, 0, w, h);
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
  const g = ctx.createRadialGradient(cx - r * 0.23, cy - r * 0.28, r * 0.05, cx, cy, r);
  g.addColorStop(0, "#f6f8f7"); g.addColorStop(0.72, "#e7edef"); g.addColorStop(1, "#d5dfe3");
  ctx.fillStyle = g; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  if (pattern) { ctx.globalAlpha = 0.82; ctx.fillStyle = pattern; ctx.fillRect(cx - r, cy - r, r * 2, r * 2); ctx.globalAlpha = 1; }
  lctx.clearRect(0, 0, w, h); worker(lctx, cx, cy, r, act, el);
  ctx.save(); ctx.filter = `blur(${Math.max(12, r * 0.033)}px)`; ctx.globalAlpha = 0.57; ctx.drawImage(layer, 0, 0, w, h); ctx.restore();
  for (let i = 0; i < 60; i++) {
    const hr = i % 5 === 0, a = toRadians(i * 6);
    line(ctx, pt(cx, cy, a, r * 0.89), pt(cx, cy, a, r * (hr ? 0.81 : 0.855)), r * (hr ? 0.026 : 0.0065), "#151819", hr ? 0.92 : 0.72);
  }
  hand(ctx, cx, cy, r, M.angle, r * 0.73, M.visible, r * 0.022, el, 0.96);
  hand(ctx, cx, cy, r, H.angle, r * 0.48, H.visible, r * 0.032, el, 0.98);
  if (act.mode === "wipe") {
    const rag = r * (0.74 * (1 - act.progress) + 0.055);
    line(ctx, pt(cx, cy, act.angle, rag), pt(cx, cy, act.angle, r * 0.74), r * 0.021, "#69777c", (1 - act.progress) * 0.3);
  }
  ctx.fillStyle = "#101314"; ctx.beginPath(); ctx.arc(cx, cy, r * 0.032, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = "rgba(123,178,211,.72)"; ctx.lineWidth = Math.max(2, r * 0.011);
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.981, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = "rgba(1,5,7,.95)"; ctx.lineWidth = Math.max(2, r * 0.012);
  ctx.beginPath(); ctx.arc(cx, cy, r * 1.003, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
  requestAnimationFrame(render);
}
requestAnimationFrame(render);
if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(() => {});
