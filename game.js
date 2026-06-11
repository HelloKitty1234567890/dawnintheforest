// Dawn in the Forest — Warriors game

const prefixInput = document.getElementById('prefix');
const preview = document.getElementById('name-preview');
const startBtn = document.getElementById('start-btn');
const nameScreen = document.getElementById('name-screen');
const gameScreen = document.getElementById('game-screen');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let kitName = '';
let prefix = '';

prefixInput.addEventListener('input', () => {
  const val = prefixInput.value.trim();
  preview.textContent = val ? val + 'kit' : '';
});

startBtn.addEventListener('click', () => {
  const val = prefixInput.value.trim();
  if (!val) { prefixInput.focus(); return; }
  prefix = val.charAt(0).toUpperCase() + val.slice(1).toLowerCase();
  kitName = prefix + 'kit';
  nameScreen.style.display = 'none';
  gameScreen.style.display = 'block';
  startGame();
});

prefixInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') startBtn.click();
});

// ─── Constants ───────────────────────────────────────────────────────────────

const W = 800;
const H = 400;
const GRAVITY = 0.5;
const JUMP_FORCE = -11;
const SPEED = 3;
const GROUND_Y = H - 60;

// Camp layout — world positions
const CAMP_START = 200;
const NURSERY_X   = 280;
const LEADERS_X   = 600;
const WARRIORS_X  = 950;
const MEDICINE_X  = 1250;
const WORLD_WIDTH = 1600;

// NPC cats
const NPCS = [
  { x: 500,  name: 'Ripplestar',  color: '#f0f0f0', legColor: '#e0e0e0', size: 22,
    lines: ['Hello little one.', 'Stay close to camp, ' ] },
  { x: 310,  name: 'Mosswhisker', color: '#b8926a', legColor: '#a07850', size: 20,
    lines: ['Welcome to the nursery!', 'You are safe here, little one.'] },
  { x: 980,  name: 'Stoneclaw',   color: '#7a7a8a', legColor: '#5a5a6a', size: 22,
    lines: ['Train hard and you will be a great warrior.'] },
  { x: 1280, name: 'Fernleaf',    color: '#8ab870', legColor: '#6a9050', size: 20,
    lines: ['I am the medicine cat. Come to me if you are hurt.'] },
];

const keys = {};
document.addEventListener('keydown', e => keys[e.key.toLowerCase()] = true);
document.addEventListener('keyup',   e => keys[e.key.toLowerCase()] = false);

let cat, onGround, cameraX, dialogue, dialogueTimer, walkFrame;

function startGame() {
  canvas.width  = W;
  canvas.height = H;
  cat = { x: 300, y: GROUND_Y, vx: 0, vy: 0 };
  onGround    = true;
  cameraX     = 0;
  dialogue    = null;
  dialogueTimer = 0;
  walkFrame   = 0;
  requestAnimationFrame(loop);
}

// ─── Loop ────────────────────────────────────────────────────────────────────

function loop() { update(); draw(); requestAnimationFrame(loop); }

function update() {
  if (keys['a']) cat.vx = -SPEED;
  else if (keys['d']) cat.vx = SPEED;
  else cat.vx = 0;

  if ((keys['w'] || keys[' ']) && onGround) {
    cat.vy = JUMP_FORCE;
    onGround = false;
  }

  cat.vy += GRAVITY;
  cat.x  += cat.vx;
  cat.y  += cat.vy;

  if (cat.vx !== 0 && onGround) walkFrame++;
  else walkFrame = 0;

  if (cat.y >= GROUND_Y) { cat.y = GROUND_Y; cat.vy = 0; onGround = true; }
  if (cat.x < 0) cat.x = 0;
  if (cat.x > WORLD_WIDTH) cat.x = WORLD_WIDTH;

  // NPC interaction
  if (dialogueTimer > 0) { dialogueTimer--; if (dialogueTimer === 0) dialogue = null; }

  for (const npc of NPCS) {
    if (Math.abs(cat.x - npc.x) < 55 && keys['e'] && !dialogue) {
      const line = npc.lines[Math.floor(Math.random() * npc.lines.length)];
      const text = npc.name === 'Ripplestar' ? line + (line.endsWith(',') ? ' ' + kitName + '.' : '') : line;
      dialogue = { speaker: npc.name, text };
      dialogueTimer = 200;
      keys['e'] = false;
    }
  }

  cameraX = cat.x - W / 3;
  if (cameraX < 0) cameraX = 0;
  if (cameraX > WORLD_WIDTH - W) cameraX = WORLD_WIDTH - W;
}

// ─── Draw ────────────────────────────────────────────────────────────────────

function draw() {
  ctx.clearRect(0, 0, W, H);
  drawBackground();
  drawCamp();
  drawNPCs();
  drawPlayer();
  drawHUD();
  if (dialogue) drawDialogue();
}

function drawBackground() {
  // Sky
  const sky = ctx.createLinearGradient(0, 0, 0, H * 0.62);
  sky.addColorStop(0, '#0d1b2a');
  sky.addColorStop(1, '#1a3a4a');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H * 0.62);

  // Stars
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  for (const [sx, sy] of [[80,30],[200,50],[340,20],[500,40],[650,25],[720,55],[150,70],[420,65]]) {
    ctx.beginPath(); ctx.arc(sx, sy, 1.2, 0, Math.PI*2); ctx.fill();
  }

  // River
  ctx.fillStyle = '#1a3a5a';
  ctx.fillRect(0, H * 0.62, W, H * 0.38);
  ctx.fillStyle = 'rgba(100,180,220,0.12)';
  for (let i = 0; i < 6; i++) {
    const wx = ((i * 140 - cameraX * 0.2) % (W + 100)) - 50;
    ctx.fillRect(wx, H * 0.67, 60, 4);
  }

  // Ground
  ctx.fillStyle = '#2a4a1a';
  ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
  ctx.fillStyle = '#3a6a2a';
  ctx.fillRect(0, GROUND_Y, W, 5);

  // Background trees (parallax)
  drawTrees();
}

function drawTrees() {
  const positions = [40,180,360,520,680,860,1060,1260,1460];
  for (const tx of positions) {
    const x = tx - cameraX * 0.5;
    ctx.fillStyle = '#2a1a0a';
    ctx.fillRect(x, GROUND_Y - 90, 12, 90);
    ctx.fillStyle = '#0f3a0f';
    ctx.beginPath(); ctx.arc(x+6, GROUND_Y-100, 32, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#1a5a1a';
    ctx.beginPath(); ctx.arc(x+6, GROUND_Y-118, 22, 0, Math.PI*2); ctx.fill();
  }
}

function drawCamp() {
  // Camp ground — sandy patch
  ctx.fillStyle = '#4a5a2a';
  roundRect(CAMP_START - cameraX, GROUND_Y - 4, WORLD_WIDTH - CAMP_START, 8);

  // Nursery den
  drawDen(NURSERY_X - cameraX, '🌿 Nursery', '#3a6a3a', '#2a5a2a');

  // Leader's den (higher, grander)
  drawDen(LEADERS_X - cameraX, "⭐ Leader's Den", '#4a4a6a', '#3a3a5a', true);

  // Warriors' den
  drawDen(WARRIORS_X - cameraX, '⚔️ Warriors Den', '#5a4a3a', '#4a3a2a');

  // Medicine cat den
  drawDen(MEDICINE_X - cameraX, '🌿 Medicine Den', '#3a5a4a', '#2a4a3a');
}

function drawDen(x, label, wallColor, roofColor, grand = false) {
  const w = grand ? 110 : 90;
  const h = grand ? 80 : 65;
  const denY = GROUND_Y - h;

  // Reed walls
  ctx.fillStyle = wallColor;
  ctx.beginPath();
  ctx.moveTo(x - w/2, GROUND_Y);
  ctx.lineTo(x - w/2, denY + 10);
  ctx.quadraticCurveTo(x, denY - (grand ? 30 : 20), x + w/2, denY + 10);
  ctx.lineTo(x + w/2, GROUND_Y);
  ctx.closePath();
  ctx.fill();

  // Roof highlight
  ctx.fillStyle = roofColor;
  ctx.beginPath();
  ctx.moveTo(x - w/2 + 8, GROUND_Y - 10);
  ctx.lineTo(x - w/2 + 4, denY + 15);
  ctx.quadraticCurveTo(x, denY - (grand ? 18 : 10), x + w/2 - 4, denY + 15);
  ctx.lineTo(x + w/2 - 8, GROUND_Y - 10);
  ctx.closePath();
  ctx.fill();

  // Reed stripes
  ctx.strokeStyle = 'rgba(0,0,0,0.15)';
  ctx.lineWidth = 2;
  for (let i = -3; i <= 3; i++) {
    ctx.beginPath();
    ctx.moveTo(x + i * (w/8), GROUND_Y);
    ctx.lineTo(x + i * (w/10), denY + 14);
    ctx.stroke();
  }

  // Entrance gap
  ctx.fillStyle = '#0a1a0a';
  ctx.beginPath();
  ctx.ellipse(x, GROUND_Y - 12, 14, 16, 0, 0, Math.PI, Math.PI*2);
  ctx.fill();

  // Label
  ctx.fillStyle = '#d4e8b0';
  ctx.font = '11px Georgia';
  ctx.textAlign = 'center';
  ctx.fillText(label, x, denY - (grand ? 36 : 26));
}

function roundRect(x, y, w, h) {
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.fill();
}

function drawNPCs() {
  for (const npc of NPCS) {
    const sx = npc.x - cameraX;
    if (sx < -60 || sx > W + 60) continue;
    drawCat(sx, GROUND_Y, 0, npc.color, npc.legColor, npc.size);
    ctx.fillStyle = '#f0f0cc';
    ctx.font = '11px Georgia';
    ctx.textAlign = 'center';
    ctx.fillText(npc.name, sx, GROUND_Y - npc.size * 2.8);

    if (Math.abs(cat.x - npc.x) < 55 && !dialogue) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(sx - 42, GROUND_Y - npc.size * 2.8 - 20, 84, 16);
      ctx.fillStyle = '#ffe080';
      ctx.font = '11px Georgia';
      ctx.textAlign = 'center';
      ctx.fillText('Press E to talk', sx, GROUND_Y - npc.size * 2.8 - 8);
    }
  }
}

function drawPlayer() {
  drawCat(cat.x - cameraX, cat.y, cat.vx, '#4a4a5a', '#6a6a7a', 12, walkFrame);
  ctx.fillStyle = '#aadfc8';
  ctx.font = 'bold 12px Georgia';
  ctx.textAlign = 'center';
  ctx.fillText(kitName, cat.x - cameraX, cat.y - 30);
}

function drawHUD() {
  ctx.fillStyle = '#aadfc8';
  ctx.font = '15px Georgia';
  ctx.textAlign = 'left';
  ctx.fillText(kitName + ' — RiverClan', 12, 24);
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.font = '11px Georgia';
  ctx.fillText('A/D move   W jump   E talk', 12, H - 12);
}

function drawDialogue() {
  ctx.fillStyle = 'rgba(0,0,0,0.82)';
  ctx.fillRect(20, H - 110, W - 40, 82);
  ctx.strokeStyle = '#7ec8e3';
  ctx.lineWidth = 2;
  ctx.strokeRect(20, H - 110, W - 40, 82);
  ctx.fillStyle = '#7ec8e3';
  ctx.font = 'bold 14px Georgia';
  ctx.textAlign = 'left';
  ctx.fillText(dialogue.speaker, 36, H - 88);
  ctx.fillStyle = '#e8d5a3';
  ctx.font = '15px Georgia';
  ctx.fillText(dialogue.text, 36, H - 65);
}

// ─── Cat drawing ─────────────────────────────────────────────────────────────

function drawCat(x, groundY, vx, color = '#4a4a5a', legColor = '#6a6a7a', s = 22, walk = 0) {
  const c = color;
  const bx = x;
  const by = groundY - s * 1.1;

  // tail
  ctx.strokeStyle = c;
  ctx.lineWidth = s * 0.25;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(bx + s * 0.7, by + s * 0.4);
  ctx.quadraticCurveTo(bx + s * 1.6, by - s * 0.6, bx + s * 0.5, by - s * 1.5);
  ctx.stroke();

  // body
  ctx.fillStyle = c;
  ctx.beginPath();
  ctx.ellipse(bx, by, s * 0.85, s * 0.75, 0, 0, Math.PI * 2);
  ctx.fill();

  // head
  const hx = bx, hy = by - s * 0.95, hr = s * 0.78;
  ctx.beginPath();
  ctx.ellipse(hx, hy, hr, hr * 0.95, 0, 0, Math.PI * 2);
  ctx.fill();

  // ears
  ctx.beginPath();
  ctx.moveTo(hx - hr*0.55, hy - hr*0.6); ctx.lineTo(hx - hr*0.72, hy - hr*1.35); ctx.lineTo(hx - hr*0.1, hy - hr*0.78);
  ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(hx + hr*0.1, hy - hr*0.78); ctx.lineTo(hx + hr*0.72, hy - hr*1.35); ctx.lineTo(hx + hr*0.55, hy - hr*0.6);
  ctx.closePath(); ctx.fill();

  // inner ear
  ctx.fillStyle = '#e8a0b0';
  ctx.beginPath();
  ctx.moveTo(hx - hr*0.52, hy - hr*0.65); ctx.lineTo(hx - hr*0.62, hy - hr*1.15); ctx.lineTo(hx - hr*0.14, hy - hr*0.8);
  ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(hx + hr*0.14, hy - hr*0.8); ctx.lineTo(hx + hr*0.62, hy - hr*1.15); ctx.lineTo(hx + hr*0.52, hy - hr*0.65);
  ctx.closePath(); ctx.fill();

  // eyes
  const eyeOff = hr * 0.32, ey = hy - hr * 0.08;
  for (const ex of [hx - eyeOff, hx + eyeOff]) {
    ctx.fillStyle = '#c8eef8';
    ctx.beginPath(); ctx.ellipse(ex, ey, hr*0.26, hr*0.28, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#7ab8d8';
    ctx.beginPath(); ctx.ellipse(ex, ey, hr*0.2, hr*0.22, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.ellipse(ex, ey, hr*0.11, hr*0.16, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.ellipse(ex + hr*0.07, ey - hr*0.08, hr*0.06, hr*0.06, 0, 0, Math.PI*2); ctx.fill();
  }

  // nose & mouth
  const nx = hx, ny = hy + hr * 0.28;
  ctx.fillStyle = '#e87090';
  ctx.beginPath(); ctx.ellipse(nx, ny, hr*0.14, hr*0.1, 0, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = '#c05060'; ctx.lineWidth = Math.max(1, s*0.06); ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(nx - hr*0.22, ny + hr*0.12);
  ctx.quadraticCurveTo(nx - hr*0.1, ny + hr*0.26, nx, ny + hr*0.16);
  ctx.quadraticCurveTo(nx + hr*0.1, ny + hr*0.26, nx + hr*0.22, ny + hr*0.12);
  ctx.stroke();

  // whiskers
  ctx.strokeStyle = 'rgba(255,255,255,0.65)'; ctx.lineWidth = 1;
  for (const side of [-1, 1]) for (const row of [-1, 0, 1]) {
    ctx.beginPath();
    ctx.moveTo(nx + side*hr*0.15, ny + row*hr*0.08);
    ctx.lineTo(nx + side*hr*1.1,  ny + row*hr*0.2);
    ctx.stroke();
  }

  // walking paws
  const swing = Math.sin(walk * 0.3) * s * 0.18;
  const leftY = groundY - s*0.1 + swing, rightY = groundY - s*0.1 - swing;
  ctx.fillStyle = legColor;
  ctx.beginPath(); ctx.ellipse(bx - s*0.38, leftY,  s*0.28, s*0.18, 0, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(bx + s*0.38, rightY, s*0.28, s*0.18, 0, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.lineWidth = 1;
  for (const [px, py] of [[bx - s*0.38, leftY], [bx + s*0.38, rightY]]) {
    for (const toe of [-0.12, 0, 0.12]) {
      ctx.beginPath(); ctx.moveTo(px + toe*s, py - s*0.08); ctx.lineTo(px + toe*s, py + s*0.08); ctx.stroke();
    }
  }
}
