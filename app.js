const canvas = document.getElementById('previewCanvas');
const ctx = canvas.getContext('2d');

const scriptInput = document.getElementById('scriptInput');
const themeSelect = document.getElementById('themeSelect');
const fontSelect = document.getElementById('fontSelect');
const durationInput = document.getElementById('duration');
const fpsInput = document.getElementById('fps');
const previewBtn = document.getElementById('previewBtn');
const renderBtn = document.getElementById('renderBtn');
const statusEl = document.getElementById('status');

scriptInput.value = 'Launch your message with cinematic motion graphics.';

const THEMES = {
  neon: {
    bgA: '#050515',
    bgB: '#25115b',
    primary: '#2ad5ff',
    secondary: '#ab7dff',
  },
  sunset: {
    bgA: '#251110',
    bgB: '#8d3b2e',
    primary: '#ffd65a',
    secondary: '#ff8e5e',
  },
  aurora: {
    bgA: '#031b21',
    bgB: '#0d4455',
    primary: '#86ffe5',
    secondary: '#66b7ff',
  },
  mono: {
    bgA: '#121212',
    bgB: '#303030',
    primary: '#ffffff',
    secondary: '#b8b8b8',
  },
};

let previewHandle;

function splitLines(text, maxChars = 34) {
  const words = text.trim().split(/\s+/);
  const lines = [];
  let current = '';

  words.forEach((word) => {
    if ((current + ' ' + word).trim().length > maxChars) {
      lines.push(current.trim());
      current = word;
    } else {
      current += ` ${word}`;
    }
  });

  if (current.trim()) {
    lines.push(current.trim());
  }

  return lines.slice(0, 5);
}

function easeOutExpo(x) {
  return x === 1 ? 1 : 1 - Math.pow(2, -10 * x);
}

function renderFrame(t, total, text, theme, fontFamily) {
  const progress = t / total;
  const phase = (Math.sin(progress * Math.PI * 2) + 1) / 2;

  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, theme.bgA);
  gradient.addColorStop(1, theme.bgB);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < 12; i += 1) {
    const x = (canvas.width / 12) * i + Math.sin(progress * 8 + i) * 40;
    const y = canvas.height * 0.15 + Math.cos(progress * 6 + i) * 24;
    const radius = 90 + Math.sin(progress * 5 + i) * 40;
    const glow = ctx.createRadialGradient(x, y, 0, x, y, radius);
    glow.addColorStop(0, `${theme.secondary}66`);
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }

  const lines = splitLines(text);
  const inAmount = easeOutExpo(Math.min(progress * 2, 1));
  const outAmount = easeOutExpo(Math.min((1 - progress) * 2, 1));
  const alpha = Math.min(inAmount, outAmount);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 78px ${fontFamily}`;

  lines.forEach((line, index) => {
    const yBase = canvas.height / 2 - ((lines.length - 1) * 50) / 2 + index * 100;
    const yOffset = (1 - inAmount) * 90 - (1 - outAmount) * 90;

    ctx.shadowBlur = 28 + phase * 30;
    ctx.shadowColor = theme.primary;
    ctx.fillStyle = theme.primary;
    ctx.fillText(line, canvas.width / 2, yBase + yOffset);

    ctx.shadowBlur = 0;
    ctx.lineWidth = 2;
    ctx.strokeStyle = `${theme.secondary}CC`;
    ctx.strokeText(line, canvas.width / 2, yBase + yOffset);
  });

  ctx.fillStyle = '#ffffffaa';
  ctx.font = '500 22px Inter, sans-serif';
  ctx.fillText('Generated with Text2Cinematic', canvas.width / 2, canvas.height - 44);
}

function getConfig() {
  const text = scriptInput.value.trim() || 'Type your story here.';
  return {
    text,
    theme: THEMES[themeSelect.value],
    fontFamily: fontSelect.value,
    duration: Math.min(30, Math.max(3, Number(durationInput.value) || 10)),
    fps: Math.min(60, Math.max(24, Number(fpsInput.value) || 30)),
  };
}

function startPreview() {
  cancelAnimationFrame(previewHandle);
  const config = getConfig();
  const total = config.duration * config.fps;
  const started = performance.now();

  const tick = (now) => {
    const elapsed = (now - started) / 1000;
    const frame = Math.floor((elapsed * config.fps) % total);
    renderFrame(frame, total, config.text, config.theme, config.fontFamily);
    previewHandle = requestAnimationFrame(tick);
  };

  statusEl.textContent = 'Preview running…';
  previewHandle = requestAnimationFrame(tick);
}

async function renderVideo() {
  const config = getConfig();
  const totalFrames = config.duration * config.fps;
  const stream = canvas.captureStream(config.fps);
  const recorder = new MediaRecorder(stream, {
    mimeType: 'video/webm;codecs=vp9',
    videoBitsPerSecond: 8_000_000,
  });
  const chunks = [];

  recorder.ondataavailable = (evt) => {
    if (evt.data.size > 0) chunks.push(evt.data);
  };

  statusEl.textContent = 'Rendering video...';
  renderBtn.disabled = true;

  const done = new Promise((resolve) => {
    recorder.onstop = resolve;
  });

  recorder.start();

  for (let frame = 0; frame < totalFrames; frame += 1) {
    renderFrame(frame, totalFrames, config.text, config.theme, config.fontFamily);
    await new Promise((r) => setTimeout(r, 1000 / config.fps));
  }

  recorder.stop();
  await done;

  const blob = new Blob(chunks, { type: 'video/webm' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const slug = config.text.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30) || 'video';
  a.href = url;
  a.download = `${slug}.webm`;
  a.click();
  URL.revokeObjectURL(url);

  renderBtn.disabled = false;
  statusEl.textContent = `Done. Exported ${config.duration}s at ${config.fps}fps.`;
}

previewBtn.addEventListener('click', startPreview);
renderBtn.addEventListener('click', renderVideo);
startPreview();
