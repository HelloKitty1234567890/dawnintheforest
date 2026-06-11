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

  // Name tag — always visible above your cat
  ctx.fillStyle = '#aadfc8';
  ctx.font = 'bold 13px Georgia';
  ctx.textAlign = 'center';
  ctx.fillText(kitName, cat.x - cameraX + 20, cat.y - 6);

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
  const facingLeft = vx < 0;
  const dir = facingLeft ? -1 : 1;

  // All coords relative to cat centre-bottom at (x+20, y+44)
  const bx = x + 20; // body centre x
  const by = y + 28; // body centre y

  // tail behind body
  ctx.strokeStyle = c;
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(bx - dir * 14, by + 8);
  ctx.quadraticCurveTo(bx - dir * 34, by - 4, bx - dir * 28, by - 22);
  ctx.stroke();

  // body
  ctx.fillStyle = c;
  ctx.beginPath();
  ctx.ellipse(bx, by, 18, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  // neck connector
  ctx.beginPath();
  ctx.ellipse(bx + dir * 14, by - 6, 8, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  // head
  const hx = bx + dir * 22;
  const hy = by - 10;
  ctx.beginPath();
  ctx.ellipse(hx, hy, 13, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  // ears — pointy triangles on top of head
  ctx.beginPath();
  ctx.moveTo(hx - 7, hy - 7);
  ctx.lineTo(hx - 12, hy - 22);
  ctx.lineTo(hx - 1, hy - 8);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(hx + 1, hy - 8);
  ctx.lineTo(hx + 10, hy - 22);
  ctx.lineTo(hx + 7, hy - 7);
  ctx.fill();

  // inner ear
  ctx.fillStyle = '#e8a0b0';
  ctx.beginPath();
  ctx.moveTo(hx - 6, hy - 8);
  ctx.lineTo(hx - 10, hy - 18);
  ctx.lineTo(hx - 2, hy - 9);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(hx + 2, hy - 9);
  ctx.lineTo(hx + 8, hy - 18);
  ctx.lineTo(hx + 6, hy - 8);
  ctx.fill();

  // eye — single side-on eye
  ctx.fillStyle = '#90d0f0';
  ctx.beginPath();
  ctx.ellipse(hx + dir * 4, hy - 2, 4, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(hx + dir * 4, hy - 2, 2, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  // eye shine
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.ellipse(hx + dir * 5, hy - 4, 1, 1, 0, 0, Math.PI * 2);
  ctx.fill();

  // nose
  ctx.fillStyle = '#e87090';
  ctx.beginPath();
  ctx.moveTo(hx + dir * 11, hy + 3);
  ctx.lineTo(hx + dir * 8,  hy + 6);
  ctx.lineTo(hx + dir * 13, hy + 6);
  ctx.fill();

  // mouth
  ctx.strokeStyle = '#c05060';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(hx + dir * 10, hy + 6);
  ctx.quadraticCurveTo(hx + dir * 8, hy + 10, hx + dir * 6, hy + 9);
  ctx.stroke();

  // whiskers
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = 1;
  for (const offset of [-4, 0, 4]) {
    ctx.beginPath();
    ctx.moveTo(hx + dir * 10, hy + 4 + offset * 0.3);
    ctx.lineTo(hx + dir * 26, hy + 2 + offset);
    ctx.stroke();
  }

  // legs — two front, two back
  ctx.fillStyle = legColor;
  ctx.beginPath(); ctx.ellipse(bx - 10, by + 16, 4, 7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(bx - 2,  by + 16, 4, 7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(bx + 6,  by + 16, 4, 7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(bx + 14, by + 16, 4, 7, 0, 0, Math.PI * 2); ctx.fill();

  // paws
  ctx.fillStyle = c;
  ctx.beginPath(); ctx.ellipse(bx - 10, by + 22, 5, 3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(bx - 2,  by + 22, 5, 3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(bx + 6,  by + 22, 5, 3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(bx + 14, by + 22, 5, 3, 0, 0, Math.PI * 2); ctx.fill();
}
