// Dawn in the Forest — Warriors game

const prefixInput = document.getElementById('prefix');
const preview = document.getElementById('name-preview');
const startBtn = document.getElementById('start-btn');
const nameScreen = document.getElementById('name-screen');
const gameScreen = document.getElementById('game-screen');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let kitName = '';

prefixInput.addEventListener('input', () => {
  const val = prefixInput.value.trim();
  preview.textContent = val ? val + 'kit' : '';
});

startBtn.addEventListener('click', () => {
  const val = prefixInput.value.trim();
  if (!val) { prefixInput.focus(); return; }
  kitName = val.charAt(0).toUpperCase() + val.slice(1).toLowerCase() + 'kit';
  nameScreen.style.display = 'none';
  gameScreen.style.display = 'block';
  startGame();
});

prefixInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') startBtn.click();
});

// ─── Game ────────────────────────────────────────────────────────────────────

const W = 800;
const H = 400;
const GRAVITY = 0.5;
const JUMP_FORCE = -11;
const SPEED = 3;

const GROUND_Y = H - 60;

const keys = {};
document.addEventListener('keydown', e => keys[e.key.toLowerCase()] = true);
document.addEventListener('keyup',  e => keys[e.key.toLowerCase()] = false);

let cat;
let onGround;
let cameraX;
let showName;

function startGame() {
  canvas.width = W;
  canvas.height = H;

  cat = { x: 120, y: GROUND_Y - 24, w: 28, h: 24, vx: 0, vy: 0 };
  onGround = false;
  cameraX = 0;
  showName = true;
  setTimeout(() => showName = false, 3000);

  requestAnimationFrame(loop);
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

function update() {
  // horizontal
  if (keys['a']) cat.vx = -SPEED;
  else if (keys['d']) cat.vx = SPEED;
  else cat.vx = 0;

  // jump
  if ((keys['w'] || keys[' ']) && onGround) {
    cat.vy = JUMP_FORCE;
    onGround = false;
  }

  cat.vy += GRAVITY;
  cat.x += cat.vx;
  cat.y += cat.vy;

  // ground collision
  if (cat.y + cat.h >= GROUND_Y) {
    cat.y = GROUND_Y - cat.h;
    cat.vy = 0;
    onGround = true;
  }

  // don't go left of start
  if (cat.x < 0) cat.x = 0;

  // camera follows cat
  cameraX = cat.x - W / 3;
  if (cameraX < 0) cameraX = 0;
}

function draw() {
  ctx.clearRect(0, 0, W, H);

  // Sky
  const sky = ctx.createLinearGradient(0, 0, 0, H * 0.6);
  sky.addColorStop(0, '#0d1b2a');
  sky.addColorStop(1, '#1a3a4a');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H * 0.6);

  // Water
  ctx.fillStyle = '#1a3a5a';
  ctx.fillRect(0, H * 0.6, W, H * 0.4);

  // Water shimmer
  ctx.fillStyle = 'rgba(100,180,220,0.15)';
  for (let i = 0; i < 6; i++) {
    const wx = ((i * 140 - cameraX * 0.3) % (W + 100)) - 50;
    ctx.fillRect(wx, H * 0.65, 60, 4);
  }

  // Ground (riverbank)
  ctx.fillStyle = '#2a4a1a';
  ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);

  // Grass top
  ctx.fillStyle = '#3a6a2a';
  ctx.fillRect(0, GROUND_Y, W, 6);

  // Trees in background
  drawTrees(cameraX);

  // Cat
  drawCat(cat.x - cameraX, cat.y, cat.vx);

  // Name tag
  if (showName) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(cat.x - cameraX - 30, cat.y - 28, 90, 20);
    ctx.fillStyle = '#aadfc8';
    ctx.font = '13px Georgia';
    ctx.textAlign = 'center';
    ctx.fillText(kitName, cat.x - cameraX + 14, cat.y - 13);
  }

  // HUD
  ctx.fillStyle = '#aadfc8';
  ctx.font = '15px Georgia';
  ctx.textAlign = 'left';
  ctx.fillText(kitName + ' — RiverClan', 12, 24);
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.font = '12px Georgia';
  ctx.fillText('A/D move   W jump', 12, H - 12);
}

function drawTrees(camX) {
  const treePositions = [50, 200, 380, 520, 700, 900, 1100, 1300];
  for (const tx of treePositions) {
    const x = tx - camX * 0.6;
    // trunk
    ctx.fillStyle = '#3a2a1a';
    ctx.fillRect(x, GROUND_Y - 80, 14, 80);
    // leaves
    ctx.fillStyle = '#1a4a1a';
    ctx.beginPath();
    ctx.arc(x + 7, GROUND_Y - 90, 36, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2a6a2a';
    ctx.beginPath();
    ctx.arc(x + 7, GROUND_Y - 105, 26, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawCat(x, y, vx) {
  const c = '#4a4a5a'; // dark blue-gray
  const lighter = '#6a6a7a';
  const nose = '#e8a0a0';

  // body
  ctx.fillStyle = c;
  ctx.fillRect(x + 4, y + 8, 20, 14);

  // head
  ctx.fillRect(x + 10, y, 16, 14);

  // ears
  ctx.fillStyle = c;
  ctx.beginPath();
  ctx.moveTo(x + 11, y); ctx.lineTo(x + 8,  y - 7); ctx.lineTo(x + 15, y); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + 20, y); ctx.lineTo(x + 24, y - 7); ctx.lineTo(x + 26, y); ctx.fill();

  // eye
  ctx.fillStyle = '#90d0f0';
  const eyeX = vx < 0 ? x + 12 : x + 22;
  ctx.fillRect(eyeX, y + 4, 4, 3);

  // nose
  ctx.fillStyle = nose;
  ctx.fillRect(eyeX + 1, y + 9, 2, 2);

  // tail
  ctx.strokeStyle = c;
  ctx.lineWidth = 4;
  ctx.beginPath();
  if (vx >= 0) {
    ctx.moveTo(x + 4, y + 18);
    ctx.quadraticCurveTo(x - 10, y + 10, x - 4, y + 2);
  } else {
    ctx.moveTo(x + 24, y + 18);
    ctx.quadraticCurveTo(x + 38, y + 10, x + 32, y + 2);
  }
  ctx.stroke();

  // legs
  ctx.fillStyle = lighter;
  ctx.fillRect(x + 6,  y + 20, 5, 6);
  ctx.fillRect(x + 13, y + 20, 5, 6);
  ctx.fillRect(x + 18, y + 20, 5, 6);
}
