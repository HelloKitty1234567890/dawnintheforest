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
let dialogue;
let dialogueTimer;

const ripplestar = { x: 320, y: GROUND_Y, w: 44, h: 44 };

function startGame() {
  canvas.width = W;
  canvas.height = H;

  cat = { x: 120, y: GROUND_Y - 28, w: 24, h: 28, vx: 0, vy: 0 };
  onGround = false;
  cameraX = 0;
  showName = true;
  dialogue = null;
  dialogueTimer = 0;
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

  // talk to Ripplestar
  const nearRipplestar = Math.abs(cat.x - ripplestar.x) < 50;
  if (nearRipplestar && keys['e']) {
    dialogue = { speaker: 'Ripplestar', text: 'Hello little one.' };
    dialogueTimer = 180;
    keys['e'] = false;
  }
  if (dialogueTimer > 0) dialogueTimer--;
  else dialogue = null;

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

  // Ripplestar — full grown leader
  drawCat(ripplestar.x - cameraX, GROUND_Y, 0, '#f0f0f0', '#e0e0e0', 22);
  ctx.fillStyle = '#f0f0ee';
  ctx.font = '12px Georgia';
  ctx.textAlign = 'center';
  ctx.fillText('Ripplestar', ripplestar.x - cameraX, GROUND_Y - 56);

  // "press E" hint
  if (Math.abs(cat.x - ripplestar.x) < 60 && !dialogue) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(ripplestar.x - cameraX - 42, GROUND_Y - 76, 84, 18);
    ctx.fillStyle = '#ffe080';
    ctx.font = '12px Georgia';
    ctx.textAlign = 'center';
    ctx.fillText('Press E to talk', ripplestar.x - cameraX, GROUND_Y - 63);
  }

  // Player cat — tiny kit
  drawCat(cat.x - cameraX, GROUND_Y, cat.vx, '#4a4a5a', '#6a6a7a', 12);

  // Name tag — always visible above kit
  ctx.fillStyle = '#aadfc8';
  ctx.font = 'bold 12px Georgia';
  ctx.textAlign = 'center';
  ctx.fillText(kitName, cat.x - cameraX, GROUND_Y - 28);

  // HUD
  ctx.fillStyle = '#aadfc8';
  ctx.font = '15px Georgia';
  ctx.textAlign = 'left';
  ctx.fillText(kitName + ' — RiverClan', 12, 24);
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.font = '12px Georgia';
  ctx.fillText('A/D move   W jump   E talk', 12, H - 12);

  // Dialogue box
  if (dialogue) {
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(20, H - 110, W - 40, 80);
    ctx.strokeStyle = '#7ec8e3';
    ctx.lineWidth = 2;
    ctx.strokeRect(20, H - 110, W - 40, 80);
    ctx.fillStyle = '#7ec8e3';
    ctx.font = 'bold 14px Georgia';
    ctx.textAlign = 'left';
    ctx.fillText(dialogue.speaker, 36, H - 88);
    ctx.fillStyle = '#e8d5a3';
    ctx.font = '15px Georgia';
    ctx.fillText(dialogue.text, 36, H - 65);
  }
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

// draws a cute forward-facing chubby cat, bottom-centre at (x, groundY)
// s = size (adult 22, kit 12)
function drawCat(x, groundY, vx, color = '#4a4a5a', legColor = '#6a6a7a', s = 22) {
  const c = color;

  const bx = x;
  const by = groundY - s * 1.1;  // body centre

  // tail — curls up behind and over
  ctx.strokeStyle = c;
  ctx.lineWidth = s * 0.25;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(bx + s * 0.7, by + s * 0.4);
  ctx.quadraticCurveTo(bx + s * 1.6, by - s * 0.6, bx + s * 0.5, by - s * 1.5);
  ctx.stroke();

  // body — chubby round oval
  ctx.fillStyle = c;
  ctx.beginPath();
  ctx.ellipse(bx, by, s * 0.85, s * 0.75, 0, 0, Math.PI * 2);
  ctx.fill();

  // head — big round, sits on top of body, slightly forward-facing
  const hx = bx;
  const hy = by - s * 0.95;
  const hr = s * 0.78;
  ctx.beginPath();
  ctx.ellipse(hx, hy, hr, hr * 0.95, 0, 0, Math.PI * 2);
  ctx.fill();

  // ears — small rounded triangles on top
  ctx.beginPath();
  ctx.moveTo(hx - hr * 0.55, hy - hr * 0.6);
  ctx.lineTo(hx - hr * 0.72, hy - hr * 1.35);
  ctx.lineTo(hx - hr * 0.1,  hy - hr * 0.78);
  ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(hx + hr * 0.1,  hy - hr * 0.78);
  ctx.lineTo(hx + hr * 0.72, hy - hr * 1.35);
  ctx.lineTo(hx + hr * 0.55, hy - hr * 0.6);
  ctx.closePath(); ctx.fill();

  // inner ear
  ctx.fillStyle = '#e8a0b0';
  ctx.beginPath();
  ctx.moveTo(hx - hr * 0.52, hy - hr * 0.65);
  ctx.lineTo(hx - hr * 0.62, hy - hr * 1.15);
  ctx.lineTo(hx - hr * 0.14, hy - hr * 0.8);
  ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(hx + hr * 0.14, hy - hr * 0.8);
  ctx.lineTo(hx + hr * 0.62, hy - hr * 1.15);
  ctx.lineTo(hx + hr * 0.52, hy - hr * 0.65);
  ctx.closePath(); ctx.fill();

  // two big forward-facing eyes
  const eyeOff = hr * 0.32;
  const ey = hy - hr * 0.08;
  for (const ex of [hx - eyeOff, hx + eyeOff]) {
    // white of eye
    ctx.fillStyle = '#c8eef8';
    ctx.beginPath();
    ctx.ellipse(ex, ey, hr * 0.26, hr * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
    // iris
    ctx.fillStyle = '#7ab8d8';
    ctx.beginPath();
    ctx.ellipse(ex, ey, hr * 0.2, hr * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
    // pupil
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.ellipse(ex, ey, hr * 0.11, hr * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();
    // shine
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(ex + hr * 0.07, ey - hr * 0.08, hr * 0.06, hr * 0.06, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // tiny pink nose, centred low on face
  const nx = hx, ny = hy + hr * 0.28;
  ctx.fillStyle = '#e87090';
  ctx.beginPath();
  ctx.ellipse(nx, ny, hr * 0.14, hr * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();

  // cute w-shaped mouth
  ctx.strokeStyle = '#c05060';
  ctx.lineWidth = Math.max(1, s * 0.06);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(nx - hr * 0.22, ny + hr * 0.12);
  ctx.quadraticCurveTo(nx - hr * 0.1, ny + hr * 0.26, nx, ny + hr * 0.16);
  ctx.quadraticCurveTo(nx + hr * 0.1, ny + hr * 0.26, nx + hr * 0.22, ny + hr * 0.12);
  ctx.stroke();

  // whiskers — three each side
  ctx.strokeStyle = 'rgba(255,255,255,0.65)';
  ctx.lineWidth = 1;
  for (const side of [-1, 1]) {
    for (const row of [-1, 0, 1]) {
      ctx.beginPath();
      ctx.moveTo(nx + side * hr * 0.15, ny + row * hr * 0.08);
      ctx.lineTo(nx + side * hr * 1.1,  ny + row * hr * 0.2);
      ctx.stroke();
    }
  }

  // two front paws poking out from under body — like in the photo
  ctx.fillStyle = legColor;
  ctx.beginPath();
  ctx.ellipse(bx - s * 0.38, groundY - s * 0.1, s * 0.28, s * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(bx + s * 0.38, groundY - s * 0.1, s * 0.28, s * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();

  // toe lines on paws
  ctx.strokeStyle = 'rgba(0,0,0,0.2)';
  ctx.lineWidth = 1;
  for (const px of [bx - s * 0.38, bx + s * 0.38]) {
    for (const toe of [-0.12, 0, 0.12]) {
      ctx.beginPath();
      ctx.moveTo(px + toe * s, groundY - s * 0.18);
      ctx.lineTo(px + toe * s, groundY - s * 0.02);
      ctx.stroke();
    }
  }
}
