const clamp = (v) => Math.max(0, Math.min(1, v));
const easeOut = (v) => 1 - Math.pow(1 - clamp(v), 3);
const easeInOut = (v) => {
  v = clamp(v);
  return v < 0.5 ? 2 * v * v : 1 - Math.pow(-2 * v + 2, 2) / 2;
};
const toRad = (d) => (d * Math.PI) / 180;
const poseFor = (date) => ({
  minute: { angle: toRad(date.getMinutes() * 6), visible: 1 },
  hour: { angle: toRad((date.getHours() % 12) * 30 + date.getMinutes() * 0.5), visible: 1 },
});
const pt = (cx, cy, a, d) => ({ x: cx + Math.sin(a) * d, y: cy - Math.cos(a) * d });
const line = (ctx, a, b, w, c, o = 1) => {
  ctx.save();
  ctx.strokeStyle = c;
  ctx.globalAlpha = o;
  ctx.lineWidth = w;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
  ctx.restore();
};

const canvas = document.getElementById("clock");
const ctx = canvas.getContext("2d");
const layer = document.createElement("canvas");
const lctx = layer.getContext("2d");
let holdUntil = 0;

const resize = () => {
  const d = Math.min(devicePixelRatio || 1, 2);
  canvas.width = innerWidth * d;
  canvas.height = innerHeight * d;
  canvas.style.width = innerWidth + "px";
  canvas.style.height = innerHeight + "px";
  ctx.setTransform(d, 0, 0, d, 0, 0);
  layer.width = innerWidth * d;
  layer.height = innerHeight * d;
  lctx.setTransform(d, 0, 0, d, 0, 0);
};
const lock = async () => {
  try { if ("wakeLock" in navigator) await navigator.wakeLock.request("screen"); } catch (e) {}
};
addEventListener("resize", resize);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") { holdUntil = Date.now() + 4000; lock(); }
});
canvas.addEventListener("click", lock, { once: true });
resize();
lock();

const tile = document.createElement("canvas");
tile.width = 28;
tile.height = 28;
const t = tile.getContext("2d");
t.fillStyle = "#f4f6f5";
t.fillRect(0, 0, 28, 28);
t.fillStyle = "rgba(70, 96, 108, 0.12)";
for (let x = 1; x < 28; x += 4) for (let y = 1; y < 28; y += 4) t.fillRect(x, y, 1.1, 1.1);
const pattern = ctx.createPattern(tile, "repeat");

function rollerHand(ctx, cx, cy, r, ang, len, vis, th, time, op) {
  const L = len * clamp(vis);
  if (L <= 1) return;
  const s = r * 0.045;
  const n = 26;
  const perp = ang + Math.PI / 2;
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#1a1c1d";
  ctx.globalAlpha = op * 0.2;
  ctx.lineWidth = th * 1.6;
  ctx.beginPath();
  for (let i = 0; i <= n; i++) {
    const q = i / n;
    const d = s + (L - s) * q;
    const wob = Math.sin(q * 6.4 + time * 0.12) * th * 0.05 + Math.sin(q * 17 + 1.4) * th * 0.025;
    const b = pt(cx, cy, ang, d);
    const x = b.x + Math.sin(perp) * wob;
    const y = b.y - Math.cos(perp) * wob;
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
  ctx.stroke();
  ctx.strokeStyle = "#111314";
  for (let i = 0; i < n; i++) {
    const q = i / n;
    const k = (i + 1) / n;
    const A = pt(cx, cy, ang, s + (L - s) * q);
    const B = pt(cx, cy, ang, s + (L - s) * k);
    const w1 = Math.sin(q * 6.4 + time * 0.12) * th * 0.05;
    const w2 = Math.sin(k * 6.4 + time * 0.12) * th * 0.05;
    ctx.globalAlpha = op * (0.9 + Math.sin(q * 3.2) * 0.03);
    ctx.lineWidth = th * (0.94 + Math.sin(q * 8) * 0.06);
    ctx.beginPath();
    ctx.moveTo(A.x + Math.sin(perp) * w1, A.y - Math.cos(perp) * w1);
    ctx.lineTo(B.x + Math.sin(perp) * w2, B.y - Math.cos(perp) * w2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPerson(ctx, cx, cy, r, act, elapsed) {
  const breath = Math.sin(elapsed * 0.65) * r * 0.006;
  const sway = Math.sin(elapsed * 0.25) * r * 0.018;
  const toolDist =
    act.mode === "wipe" ? r * (0.74 * (1 - act.progress) + 0.08) :
    act.mode === "paint" ? r * (0.08 + 0.66 * act.progress) :
    r * 0.26;
  const tool = pt(cx, cy, act.angle, toolDist);
  const hip = { x: cx + sway + Math.sin(act.angle) * r * 0.06, y: cy + r * 0.18 + breath };
  const head = { x: hip.x - r * 0.015, y: cy - r * 0.08 + breath };
  const shoulder = { x: hip.x + r * 0.02, y: cy + r * 0.02 + breath };
  const elbow = {
    x: shoulder.x + (tool.x - shoulder.x) * 0.45,
    y: shoulder.y + (tool.y - shoulder.y) * 0.36 + r * 0.03,
  };
  const footL = { x: hip.x - r * 0.1, y: cy + r * 0.68 + breath };
  const footR = { x: hip.x + r * 0.14, y: cy + r * 0.67 + breath };
  const idleArm = { x: hip.x - r * 0.2, y: cy + r * 0.32 };

  ctx.save();
  ctx.fillStyle = "#2f5d78";
  ctx.globalAlpha = 0.88;
  ctx.beginPath();
  ctx.ellipse(head.x, head.y, r * 0.062, r * 0.08, -0.05, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(hip.x - r * 0.15, shoulder.y + r * 0.02);
  ctx.quadraticCurveTo(hip.x + r * 0.02, shoulder.y - r * 0.08, hip.x + r * 0.17, shoulder.y + r * 0.03);
  ctx.lineTo(hip.x + r * 0.13, hip.y + r * 0.08);
  ctx.quadraticCurveTo(hip.x, hip.y + r * 0.12, hip.x - r * 0.12, hip.y + r * 0.08);
  ctx.closePath();
  ctx.fill();

  line(ctx, { x: hip.x - r * 0.05, y: hip.y + r * 0.04 }, footL, r * 0.09, "#2f5d78", 0.86);
  line(ctx, { x: hip.x + r * 0.05, y: hip.y + r * 0.04 }, footR, r * 0.09, "#2f5d78", 0.86);
  ctx.fillStyle = "#23485e";
  ctx.globalAlpha = 0.8;
  ctx.beginPath(); ctx.ellipse(footL.x, footL.y + r * 0.012, r * 0.045, r * 0.02, 0.25, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(footR.x, footR.y + r * 0.012, r * 0.045, r * 0.02, -0.18, 0, Math.PI * 2); ctx.fill();

  line(ctx, shoulder, elbow, r * 0.078, "#2f5d78", 0.88);
  line(ctx, elbow, tool, r * 0.062, "#2f5d78", 0.88);
  line(ctx, { x: shoulder.x - r * 0.1, y: shoulder.y + r * 0.03 }, idleArm, r * 0.06, "#2f5d78", 0.68);

  const bucket = { x: hip.x - r * 0.26, y: cy + r * 0.6 };
  ctx.fillStyle = "#c03b32";
  ctx.globalAlpha = 0.78;
  ctx.beginPath();
  ctx.moveTo(bucket.x - r * 0.045, bucket.y - r * 0.038);
  ctx.lineTo(bucket.x + r * 0.045, bucket.y - r * 0.038);
  ctx.lineTo(bucket.x + r * 0.036, bucket.y + r * 0.04);
  ctx.lineTo(bucket.x - r * 0.036, bucket.y + r * 0.04);
  ctx.closePath();
  ctx.fill();

  if (act.mode === "wipe") {
    ctx.fillStyle = "#e0b94a";
    ctx.globalAlpha = 0.86;
    ctx.beginPath();
    ctx.ellipse(tool.x, tool.y, r * 0.06, r * 0.034, act.angle, 0, Math.PI * 2);
    ctx.fill();
  } else if (act.mode === "paint") {
    const base = pt(cx, cy, act.angle, Math.max(r * 0.1, toolDist - r * 0.07));
    line(ctx, base, tool, r * 0.024, "#1b2226", 0.78);
    ctx.fillStyle = "#12171a";
    ctx.globalAlpha = 0.86;
    ctx.beginPath();
    ctx.ellipse(tool.x, tool.y, r * 0.062, r * 0.02, act.angle, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function render(now) {
  const w = innerWidth, h = innerHeight;
  const r = Math.min(w, h) * 0.492;
  const cx = w / 2, cy = h / 2;
  const date = new Date();
  const sec = date.getSeconds() + date.getMilliseconds() / 1000;
  const wiping = sec >= 58;
  const painting = sec < 4;
  const pose = poseFor(date);
  const next = new Date(date.getTime() + 60000);
  const hourB = date.getMinutes() === 0;
  const willH = next.getHours() !== date.getHours();
  const inT = (wiping || painting) && Date.now() >= holdUntil;
  const el = now / 1000;

  let H = pose.hour, M = pose.minute;
  let act = {
    mode: "hold",
    angle: pose.minute.angle + Math.sin(el * 0.32) * 0.1,
    progress: 0.2 + Math.sin(el * 0.5) * 0.05,
  };

  if (inT && wiping) {
    if (willH && sec >= 59) {
      const p = easeInOut((sec - 59) / 1);
      H = { ...pose.hour, visible: 1 - p };
      M = { ...pose.minute, visible: 0 };
      act = { mode: "wipe", angle: pose.hour.angle, progress: p };
    } else {
      const p = easeInOut((sec - 58) / (willH ? 1 : 2));
      M = { ...pose.minute, visible: 1 - p };
      act = { mode: "wipe", angle: pose.minute.angle, progress: p };
    }
  } else if (inT && painting) {
    if (hourB && sec < 1.5) {
      const p = easeOut(sec / 1.5);
      H = { ...pose.hour, visible: p };
      M = { ...pose.minute, visible: 0 };
      act = { mode: "paint", angle: pose.hour.angle, progress: p };
    } else {
      const st = hourB ? 1.5 : 0;
      const dur = hourB ? 2.4 : 3.8;
      const p = easeOut((sec - st) / dur);
      M = { ...pose.minute, visible: p };
      act = { mode: "paint", angle: pose.minute.angle, progress: p };
    }
  }

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#050607";
  ctx.fillRect(0, 0, w, h);
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();

  const g = ctx.createRadialGradient(cx - r * 0.18, cy - r * 0.24, r * 0.05, cx, cy, r);
  g.addColorStop(0, "#fcfdfc");
  g.addColorStop(0.55, "#f0f3f2");
  g.addColorStop(1, "#d5dee1");
  ctx.fillStyle = g;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  if (pattern) {
    ctx.globalAlpha = 0.42;
    ctx.fillStyle = pattern;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    ctx.globalAlpha = 1;
  }

  lctx.clearRect(0, 0, w, h);
  drawPerson(lctx, cx, cy, r, act, el);
  ctx.save();
  ctx.filter = `blur(${Math.max(18, r * 0.048)}px)`;
  ctx.globalAlpha = 0.58;
  ctx.drawImage(layer, 0, 0, w, h);
  ctx.restore();

  for (let i = 0; i < 60; i++) {
    const hour = i % 5 === 0;
    const a = toRad(i * 6);
    if (hour) {
      line(ctx, pt(cx, cy, a, r * 0.91), pt(cx, cy, a, r * 0.76), r * 0.042, "#141618", 0.95);
    } else {
      line(ctx, pt(cx, cy, a, r * 0.905), pt(cx, cy, a, r * 0.86), r * 0.008, "#141618", 0.72);
    }
  }

  rollerHand(ctx, cx, cy, r, M.angle, r * 0.73, M.visible, r * 0.038, el, 0.97);
  rollerHand(ctx, cx, cy, r, H.angle, r * 0.47, H.visible, r * 0.054, el, 0.98);

  if (act.mode === "wipe") {
    const rag = r * (0.74 * (1 - act.progress) + 0.08);
    line(ctx, pt(cx, cy, act.angle, rag), pt(cx, cy, act.angle, r * 0.74), r * 0.034, "#7a868b", (1 - act.progress) * 0.3);
  }

  ctx.fillStyle = "#101314";
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.04, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = "rgba(122, 168, 196, 0.5)";
  ctx.lineWidth = Math.max(2, r * 0.01);
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.982, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "rgba(2, 6, 8, 0.96)";
  ctx.lineWidth = Math.max(2, r * 0.016);
  ctx.beginPath();
  ctx.arc(cx, cy, r * 1.005, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  requestAnimationFrame(render);
}
requestAnimationFrame(render);
if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(() => {});
