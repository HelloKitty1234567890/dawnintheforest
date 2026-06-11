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

const ripplestar = { x: 320, y: GROUND_Y - 38, w: 40, h: 38 };

function startGame() {
  canvas.width = W;
  canvas.height = H;

  cat = { x: 120, y: GROUND_Y - 38, w: 40, h: 38, vx: 0, vy: 0 };
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
    cat.y = GROUND_Y - cat.h - 2;
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

  // Ripplestar
  drawCat(ripplestar.x - cameraX, ripplestar.y, 0, '#f0f0f0', '#ffffff');
  ctx.fillStyle = '#f0f0ee';
  ctx.font = '12px Georgia';
  ctx.textAlign = 'center';
  ctx.fillText('Ripplestar', ripplestar.x - cameraX + 14, ripplestar.y - 8);

  // "press E" hint
  if (Math.abs(cat.x - ripplestar.x) < 50 && !dialogue) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(ripplestar.x - cameraX - 28, ripplestar.y - 30, 84, 18);
    ctx.fillStyle = '#ffe080';
    ctx.font = '12px Georgia';
    ctx.textAlign = 'center';
    ctx.fillText('Press E to talk', ripplestar.x - cameraX + 14, ripplestar.y - 17);
  }

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

function drawCat(x, y, vx, color = '#4a4a5a', legColor = '#6a6a7a') {
  const c = color;
  const lighter = legColor;
  const facingLeft = vx < 0;

  // tail (draw behind body)
  ctx.strokeStyle = c;
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  if (!facingLeft) {
    ctx.moveTo(x + 6, y + 28);
    ctx.quadraticCurveTo(x - 14, y + 20, x - 8, y + 4);
  } else {
    ctx.moveTo(x + 34, y + 28);
    ctx.quadraticCurveTo(x + 54, y + 20, x + 48, y + 4);
  }
  ctx.stroke();

  // body — rounder oval shape
  ctx.fillStyle = c;
  ctx.beginPath();
  ctx.ellipse(x + 20, y + 22, 16, 11, 0, 0, Math.PI * 2);
  ctx.fill();

  // head
  ctx.beginPath();
  ctx.ellipse(x + (facingLeft ? 12 : 28), y + 10, 12, 11, 0, 0, Math.PI * 2);
  ctx.fill();

  // pointy ears
  const hx = facingLeft ? 12 : 28;
  ctx.beginPath();
  ctx.moveTo(x + hx - 8, y + 3);
  ctx.lineTo(x + hx - 12, y - 10);
  ctx.lineTo(x + hx - 2, y + 1);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + hx + 4, y + 1);
  ctx.lineTo(x + hx + 10, y - 10);
  ctx.lineTo(x + hx + 8, y + 3);
  ctx.fill();

  // inner ear
  ctx.fillStyle = '#e8a0b0';
  ctx.beginPath();
  ctx.moveTo(x + hx - 7, y + 2);
  ctx.lineTo(x + hx - 10, y - 7);
  ctx.lineTo(x + hx - 2, y + 1);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + hx + 4, y + 1);
  ctx.lineTo(x + hx + 8, y - 7);
  ctx.lineTo(x + hx + 7, y + 2);
  ctx.fill();

  // eyes
  ctx.fillStyle = '#90d0f0';
  ctx.beginPath();
  ctx.ellipse(x + hx - 4, y + 9, 3, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x + hx + 4, y + 9, 3, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  // pupils
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(x + hx - 4, y + 9, 1.5, 2.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x + hx + 4, y + 9, 1.5, 2.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // nose
  ctx.fillStyle = '#e87090';
  ctx.beginPath();
  ctx.moveTo(x + hx,     y + 14);
  ctx.lineTo(x + hx - 3, y + 17);
  ctx.lineTo(x + hx + 3, y + 17);
  ctx.fill();

  // mouth
  ctx.strokeStyle = '#c05060';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x + hx - 3, y + 17);
  ctx.quadraticCurveTo(x + hx - 5, y + 20, x + hx - 7, y + 19);
  ctx.moveTo(x + hx + 3, y + 17);
  ctx.quadraticCurveTo(x + hx + 5, y + 20, x + hx + 7, y + 19);
  ctx.stroke();

  // whiskers
  ctx.strokeStyle = color === '#f0f0f0' || color === '#ffffff' ? 'rgba(180,180,180,0.8)' : 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 1;
  for (const side of [-1, 1]) {
    for (const angle of [-0.2, 0, 0.2]) {
      ctx.beginPath();
      ctx.moveTo(x + hx + side * 3, y + 16);
      ctx.lineTo(x + hx + side * 18, y + 16 + angle * 20);
      ctx.stroke();
    }
  }

  // legs
  ctx.fillStyle = lighter;
  ctx.beginPath(); ctx.ellipse(x + 10, y + 32, 4, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x + 18, y + 32, 4, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x + 26, y + 32, 4, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x + 33, y + 32, 4, 5, 0, 0, Math.PI * 2); ctx.fill();

  // paws
  ctx.fillStyle = c;
  ctx.beginPath(); ctx.ellipse(x + 10, y + 36, 5, 3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x + 18, y + 36, 5, 3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x + 26, y + 36, 5, 3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x + 33, y + 36, 5, 3, 0, 0, Math.PI * 2); ctx.fill();
}
