const clamp = (v) => Math.max(0, Math.min(1, v));
const easeOut = (v) => 1 - Math.pow(1 - clamp(v), 3);
const rad = (d) => (d * Math.PI) / 180;
const poseFor = (date) => ({
  minute: { angle: rad(date.getMinutes() * 6), visible: 1 },
  hour: { angle: rad((date.getHours() % 12) * 30 + date.getMinutes() * 0.5), visible: 1 },
});
const pt = (cx, cy, a, d) => ({ x: cx + Math.sin(a) * d, y: cy - Math.cos(a) * d });

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
const lock = async () => { try { if ("wakeLock" in navigator) await navigator.wakeLock.request("screen"); } catch (e) {} };
addEventListener("resize", resize);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") { holdUntil = Date.now() + 5000; lock(); }
});
canvas.addEventListener("click", lock, { once: true });
resize(); lock();

function paintBar(ctx, cx, cy, angle, inner, outer, width, color) {
  const a = pt(cx, cy, angle, inner);
  const b = pt(cx, cy, angle, outer);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "butt";
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
  ctx.restore();
}

function paintedHand(ctx, cx, cy, angle, length, visible, width) {
  const shown = length * clamp(visible);
  if (shown < 2) return;
  const start = width * 0.35;
  const perp = angle + Math.PI / 2;
  const steps = 22;
  ctx.save();
  ctx.lineCap = "butt";
  ctx.strokeStyle = "#1a1a1a";
  ctx.globalAlpha = 0.2;
  ctx.lineWidth = width * 1.18;
  ctx.beginPath();
  for (let i = 0; i <= steps; i++) {
    const q = i / steps;
    const d = start + (shown - start) * q;
    const wob = Math.sin(q * 11.4 + angle * 3) * width * 0.06;
    const p = pt(cx, cy, angle, d);
    i ? ctx.lineTo(p.x + Math.sin(perp) * wob, p.y - Math.cos(perp) * wob) : ctx.moveTo(p.x + Math.sin(perp) * wob, p.y - Math.cos(perp) * wob);
  }
  ctx.stroke();
  ctx.strokeStyle = "#111111";
  ctx.globalAlpha = 0.96;
  ctx.lineWidth = width;
  ctx.beginPath();
  for (let i = 0; i <= steps; i++) {
    const q = i / steps;
    const d = start + (shown - start) * q;
    const wob = Math.sin(q * 11.4 + angle * 3) * width * 0.045;
    const p = pt(cx, cy, angle, d);
    i ? ctx.lineTo(p.x + Math.sin(perp) * wob, p.y - Math.cos(perp) * wob) : ctx.moveTo(p.x + Math.sin(perp) * wob, p.y - Math.cos(perp) * wob);
  }
  ctx.stroke();
  ctx.restore();
}

function worker(ctx, cx, cy, r, act, t) {
  const breath = Math.sin(t * 0.5) * r * 0.004;
  const sway = Math.sin(t * 0.27 + 0.8) * r * 0.01;
  const x = cx + sway;
  const headY = cy - r * 0.08 + breath;
  const shoulderY = cy + r * 0.04 + breath;
  const hipY = cy + r * 0.22 + breath;
  const footY = cy + r * 0.46 + breath;
  const dist = act.mode === "wipe" ? r * (0.72 * (1 - act.progress) + 0.06) : act.mode === "paint" ? r * (0.08 + 0.66 * act.progress) : r * 0.18;
  const tool = pt(cx, cy, act.angle, dist);
  const shoulder = { x: x + r * 0.09, y: shoulderY };
  const elbow = { x: shoulder.x + (tool.x - shoulder.x) * 0.46, y: shoulder.y + (tool.y - shoulder.y) * 0.4 + r * 0.02 };
  ctx.save();
  ctx.fillStyle = "#3d6a88";
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.ellipse(x, headY, r * 0.055, r * 0.07, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - r * 0.12, shoulderY);
  ctx.quadraticCurveTo(x, shoulderY - r * 0.05, x + r * 0.13, shoulderY);
  ctx.lineTo(x + r * 0.11, hipY);
  ctx.quadraticCurveTo(x, hipY + r * 0.04, x - r * 0.11, hipY);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - r * 0.08, hipY);
  ctx.lineTo(x - r * 0.16, footY);
  ctx.lineTo(x - r * 0.07, footY + r * 0.02);
  ctx.lineTo(x - r * 0.02, hipY);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + r * 0.04, hipY);
  ctx.lineTo(x + r * 0.15, footY);
  ctx.lineTo(x + r * 0.07, footY + r * 0.02);
  ctx.lineTo(x + r * 0.1, hipY);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3d6a88";
  ctx.globalAlpha = 0.82;
  ctx.lineCap = "round";
  ctx.lineWidth = r * 0.07;
  ctx.beginPath();
  ctx.moveTo(shoulder.x, shoulder.y);
  ctx.lineTo(elbow.x, elbow.y);
  ctx.lineTo(tool.x, tool.y);
  ctx.stroke();
  if (act.mode === "wipe") {
    ctx.fillStyle = "#e2c14a";
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.ellipse(tool.x, tool.y, r * 0.038, r * 0.024, act.angle, 0, Math.PI * 2);
    ctx.fill();
  } else if (act.mode === "paint") {
    ctx.fillStyle = "#1a1d1f";
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.ellipse(tool.x, tool.y, r * 0.05, r * 0.016, act.angle, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = "#c43b32";
    ctx.globalAlpha = 0.45;
    ctx.beginPath();
    ctx.ellipse(x + r * 0.16, hipY + r * 0.06, r * 0.035, r * 0.028, 0.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function render(now) {
  const w = innerWidth, h = innerHeight, r = Math.min(w, h) * 0.495, cx = w / 2, cy = h / 2;
  const date = new Date();
  const sec = date.getSeconds() + date.getMilliseconds() / 1000;
  const wiping = sec >= 58, painting = sec < 4, pose = poseFor(date);
  const next = new Date(date.getTime() + 60000);
  const hourB = date.getMinutes() === 0, willH = next.getHours() !== date.getHours();
  const inT = (wiping || painting) && Date.now() >= holdUntil, el = now / 1000;
  let H = pose.hour, M = pose.minute;
  let act = { mode: "hold", angle: Math.sin(el * 0.35) * 0.2, progress: 0.18 };
  if (inT && wiping) {
    if (willH && sec >= 59) {
      const p = easeOut((sec - 59) / 1);
      H = { angle: pose.hour.angle, visible: 1 - p };
      M = { angle: pose.minute.angle, visible: 0 };
      act = { mode: "wipe", angle: pose.hour.angle, progress: p };
    } else {
      const p = easeOut((sec - 58) / (willH ? 1 : 2));
      M = { angle: pose.minute.angle, visible: 1 - p };
      act = { mode: "wipe", angle: pose.minute.angle, progress: p };
    }
  } else if (inT && painting) {
    if (hourB && sec < 1.5) {
      const p = easeOut(sec / 1.5);
      H = { angle: pose.hour.angle, visible: p };
      M = { angle: pose.minute.angle, visible: 0 };
      act = { mode: "paint", angle: pose.hour.angle, progress: p };
    } else {
      const st = hourB ? 1.5 : 0;
      const p = easeOut((sec - st) / (hourB ? 2.35 : 3.8));
      M = { angle: pose.minute.angle, visible: p };
      act = { mode: "paint", angle: pose.minute.angle, progress: p };
    }
  }
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#050505";
  ctx.fillRect(0, 0, w, h);
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = "#f3f3f1";
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  const frost = ctx.createRadialGradient(cx - r * 0.18, cy - r * 0.22, r * 0.08, cx, cy, r);
  frost.addColorStop(0, "rgba(255,255,255,0.55)");
  frost.addColorStop(0.7, "rgba(230,232,230,0.18)");
  frost.addColorStop(1, "rgba(210,214,214,0.35)");
  ctx.fillStyle = frost;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  lctx.clearRect(0, 0, w, h);
  worker(lctx, cx, cy, r, act, el);
  ctx.save();
  ctx.filter = "blur(" + Math.max(16, r * 0.048) + "px)";
  ctx.globalAlpha = 0.62;
  ctx.drawImage(layer, 0, 0, w, h);
  ctx.restore();
  for (let i = 0; i < 60; i++) {
    const hour = i % 5 === 0;
    paintBar(ctx, cx, cy, rad(i * 6), r * (hour ? 0.805 : 0.86), r * 0.935, hour ? r * 0.034 : r * 0.011, "#111111");
  }
  paintedHand(ctx, cx, cy, M.angle, r * 0.72, M.visible, r * 0.038);
  paintedHand(ctx, cx, cy, H.angle, r * 0.48, H.visible, r * 0.046);
  if (act.mode === "wipe") {
    const rag = r * (0.72 * (1 - act.progress) + 0.06);
    ctx.save();
    ctx.strokeStyle = "#9aa0a0";
    ctx.globalAlpha = (1 - act.progress) * 0.28;
    ctx.lineWidth = r * 0.04;
    ctx.lineCap = "round";
    ctx.beginPath();
    const a = pt(cx, cy, act.angle, rag);
    const b = pt(cx, cy, act.angle, r * 0.72);
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.restore();
  }
  ctx.fillStyle = "#111111";
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.028, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  requestAnimationFrame(render);
}
requestAnimationFrame(render);
if (navigator.serviceWorker) navigator.serviceWorker.register("./sw.js").catch(() => {});
