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

// Growth system
// stage: 0=kit, 1=apprentice, 2=warrior
let stage = 0;
let xp = 0;
const XP_TO_APPRENTICE = 300;
const XP_TO_WARRIOR    = 700;
const WARRIOR_SUFFIXES = ['storm','heart','fire','leap','splash','stream','ripple','pool','claw','tail'];
let ceremonyTimer = 0;
let ceremonyText  = '';
let xpZones = []; // tracks which zones have been visited for xp

function catSize() { return stage === 0 ? 12 : stage === 1 ? 17 : 22; }

function catName() {
  if (stage === 0) return prefix + 'kit';
  if (stage === 1) return prefix + 'paw';
  return prefix + WARRIOR_SUFFIXES[prefix.length % WARRIOR_SUFFIXES.length];
}

function startGame() {
  canvas.width  = W;
  canvas.height = H;
  cat = { x: 300, y: GROUND_Y, vx: 0, vy: 0 };
  onGround      = true;
  cameraX       = 0;
  dialogue      = null;
  dialogueTimer = 0;
  walkFrame     = 0;
  stage         = 0;
  xp            = 0;
  ceremonyTimer = 0;
  // XP zones spread across the world
  xpZones = [200,350,500,650,800,950,1100,1250,1400].map(x => ({ x, visited: false }));
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

  // Earn XP by visiting new zones
  for (const zone of xpZones) {
    if (!zone.visited && Math.abs(cat.x - zone.x) < 60) {
      zone.visited = true;
      xp += 80;
    }
  }
  // Also earn XP slowly just by moving
  if (cat.vx !== 0) xp += 0.08;

  // Stage up!
  if (stage === 0 && xp >= XP_TO_APPRENTICE) {
    stage = 1;
    xp = XP_TO_APPRENTICE;
    ceremonyText = `Let all cats old enough to catch their own prey gather here beneath the Highledge! ${catName()} has reached the age of an apprentice. From this day on, until you receive your warrior name, you shall be known as ${catName()}!`;
    ceremonyTimer = 400;
    dialogue = { speaker: 'Ripplestar', text: ceremonyText };
    dialogueTimer = 400;
  }
  if (stage === 1 && xp >= XP_TO_WARRIOR) {
    stage = 2;
    xp = XP_TO_WARRIOR;
    ceremonyText = `${catName()}! You have trained hard and shown true courage. From this day forward you shall be known as ${catName()}!`;
    ceremonyTimer = 400;
    dialogue = { speaker: 'Ripplestar', text: ceremonyText };
    dialogueTimer = 400;
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
  const w = grand ? 120 : 96;
  const h = grand ? 88 : 70;
  const denY = GROUND_Y - h;
  const mid = x;

  // Back bramble tangle (dark)
  ctx.fillStyle = '#1a2a0a';
  ctx.beginPath();
  ctx.moveTo(mid - w/2 - 8, GROUND_Y);
  ctx.lineTo(mid - w/2 - 4, denY + 6);
  ctx.bezierCurveTo(mid - w/3, denY - 10, mid + w/3, denY - 10, mid + w/2 + 4, denY + 6);
  ctx.lineTo(mid + w/2 + 8, GROUND_Y);
  ctx.closePath();
  ctx.fill();

  // Main reed/woven wall
  ctx.fillStyle = wallColor;
  ctx.beginPath();
  ctx.moveTo(mid - w/2, GROUND_Y);
  ctx.lineTo(mid - w/2 + 2, denY + 8);
  ctx.bezierCurveTo(mid - w/3, denY - 8, mid + w/3, denY - 8, mid + w/2 - 2, denY + 8);
  ctx.lineTo(mid + w/2, GROUND_Y);
  ctx.closePath();
  ctx.fill();

  // Woven reed texture — horizontal bands
  ctx.strokeStyle = roofColor;
  ctx.lineWidth = 2.5;
  for (let i = 1; i <= 5; i++) {
    const bandY = GROUND_Y - (h * i / 6);
    const bandW = w * 0.5 * (1 - i/7);
    ctx.beginPath();
    ctx.moveTo(mid - bandW - w*0.08, bandY);
    ctx.bezierCurveTo(mid - bandW*0.3, bandY - 4, mid + bandW*0.3, bandY - 4, mid + bandW + w*0.08, bandY);
    ctx.stroke();
  }

  // Vertical reed stalks
  ctx.strokeStyle = 'rgba(0,0,0,0.18)';
  ctx.lineWidth = 1.5;
  for (let i = -4; i <= 4; i++) {
    const rx = mid + i * (w / 9);
    ctx.beginPath();
    ctx.moveTo(rx, GROUND_Y);
    ctx.lineTo(rx + i*0.5, denY + 12);
    ctx.stroke();
  }

  // Bramble thorns on top
  ctx.strokeStyle = '#0a1a05';
  ctx.lineWidth = 1.5;
  for (let i = -3; i <= 3; i++) {
    const tx = mid + i * (w/7);
    const ty = denY - 2 + Math.abs(i) * 2;
    ctx.beginPath();
    ctx.moveTo(tx - 6, ty + 8);
    ctx.lineTo(tx, ty);
    ctx.lineTo(tx + 6, ty + 6);
    ctx.stroke();
    // thorn spikes
    ctx.beginPath();
    ctx.moveTo(tx - 2, ty + 4);
    ctx.lineTo(tx - 7, ty + 1);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(tx + 2, ty + 3);
    ctx.lineTo(tx + 7, ty + 1);
    ctx.stroke();
  }

  // Dark entrance tunnel
  ctx.fillStyle = '#050e05';
  ctx.beginPath();
  ctx.ellipse(mid, GROUND_Y - 10, 16, 20, 0, Math.PI, Math.PI * 2);
  ctx.fill();

  // Entrance edge highlight
  ctx.strokeStyle = '#2a4a1a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(mid, GROUND_Y - 10, 16, 20, 0, Math.PI, Math.PI * 2);
  ctx.stroke();

  // Moss patches at base
  ctx.fillStyle = '#2a5a1a';
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.ellipse(mid + i * (w/5), GROUND_Y - 2, 8, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Label
  ctx.fillStyle = '#c8dfa0';
  ctx.font = 'italic 11px Georgia';
  ctx.textAlign = 'center';
  ctx.fillText(label, mid, denY - (grand ? 22 : 16));
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
  const sz = catSize();
  drawCat(cat.x - cameraX, cat.y, cat.vx, '#4a4a5a', '#6a6a7a', sz, walkFrame);
  ctx.fillStyle = '#aadfc8';
  ctx.font = 'bold 12px Georgia';
  ctx.textAlign = 'center';
  ctx.fillText(catName(), cat.x - cameraX, cat.y - sz * 2.6);
}

function drawHUD() {
  // Name + stage
  const stageLabel = ['Kit', 'Apprentice', 'Warrior'][stage];
  ctx.fillStyle = '#aadfc8';
  ctx.font = '15px Georgia';
  ctx.textAlign = 'left';
  ctx.fillText(catName() + ' — RiverClan  (' + stageLabel + ')', 12, 24);

  // XP bar
  if (stage < 2) {
    const maxXp = stage === 0 ? XP_TO_APPRENTICE : XP_TO_WARRIOR;
    const barW = 160, barH = 10;
    const filled = Math.min((xp / maxXp) * barW, barW);
    const label = stage === 0 ? 'To Apprentice' : 'To Warrior';
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(12, 32, barW, barH);
    const barGrad = ctx.createLinearGradient(12, 0, 12 + barW, 0);
    barGrad.addColorStop(0, '#3a8a5a');
    barGrad.addColorStop(1, '#7ec8a0');
    ctx.fillStyle = barGrad;
    ctx.fillRect(12, 32, filled, barH);
    ctx.strokeStyle = '#aadfc8';
    ctx.lineWidth = 1;
    ctx.strokeRect(12, 32, barW, barH);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '10px Georgia';
    ctx.fillText(label, 12, 54);
  } else {
    ctx.fillStyle = '#ffe080';
    ctx.font = 'italic 12px Georgia';
    ctx.fillText('⭐ Full Warrior of RiverClan', 12, 48);
  }

  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.font = '11px Georgia';
  ctx.textAlign = 'left';
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
  const by = groundY - s * 1.05;

  // tail — thin and whippy like a wild cat
  ctx.strokeStyle = c;
  ctx.lineWidth = s * 0.18;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(bx + s * 0.75, by + s * 0.3);
  ctx.bezierCurveTo(bx + s*1.8, by + s*0.1, bx + s*1.6, by - s*1.2, bx + s*0.9, by - s*1.6);
  ctx.stroke();
  // tail tip darker
  ctx.strokeStyle = legColor;
  ctx.lineWidth = s * 0.12;
  ctx.beginPath();
  ctx.moveTo(bx + s*1.2, by - s*1.2);
  ctx.lineTo(bx + s*0.9, by - s*1.6);
  ctx.stroke();

  // body — lean and slightly angular
  ctx.fillStyle = c;
  ctx.beginPath();
  ctx.moveTo(bx - s*0.9, by + s*0.55);
  ctx.bezierCurveTo(bx - s*0.95, by - s*0.3, bx - s*0.3, by - s*0.75, bx, by - s*0.72);
  ctx.bezierCurveTo(bx + s*0.3, by - s*0.75, bx + s*0.9, by - s*0.3, bx + s*0.88, by + s*0.55);
  ctx.closePath();
  ctx.fill();

  // chest scruff
  ctx.fillStyle = legColor;
  ctx.beginPath();
  ctx.ellipse(bx, by + s*0.1, s*0.35, s*0.28, 0, 0, Math.PI*2);
  ctx.fill();

  // head — slightly angular, not perfectly round
  const hx = bx, hy = by - s * 1.0, hr = s * 0.72;
  ctx.fillStyle = c;
  ctx.beginPath();
  ctx.moveTo(hx - hr*0.9, hy + hr*0.4);
  ctx.bezierCurveTo(hx - hr*1.0, hy - hr*0.3, hx - hr*0.5, hy - hr*1.0, hx, hy - hr*0.95);
  ctx.bezierCurveTo(hx + hr*0.5, hy - hr*1.0, hx + hr*1.0, hy - hr*0.3, hx + hr*0.9, hy + hr*0.4);
  ctx.bezierCurveTo(hx + hr*0.5, hy + hr*0.75, hx - hr*0.5, hy + hr*0.75, hx - hr*0.9, hy + hr*0.4);
  ctx.closePath();
  ctx.fill();

  // tall pointy wild ears
  ctx.beginPath();
  ctx.moveTo(hx - hr*0.6, hy - hr*0.55);
  ctx.lineTo(hx - hr*0.85, hy - hr*1.65);
  ctx.lineTo(hx - hr*0.05, hy - hr*0.82);
  ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(hx + hr*0.05, hy - hr*0.82);
  ctx.lineTo(hx + hr*0.85, hy - hr*1.65);
  ctx.lineTo(hx + hr*0.6, hy - hr*0.55);
  ctx.closePath(); ctx.fill();

  // inner ear
  ctx.fillStyle = '#c07080';
  ctx.beginPath();
  ctx.moveTo(hx - hr*0.56, hy - hr*0.62);
  ctx.lineTo(hx - hr*0.72, hy - hr*1.45);
  ctx.lineTo(hx - hr*0.1, hy - hr*0.86);
  ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(hx + hr*0.1, hy - hr*0.86);
  ctx.lineTo(hx + hr*0.72, hy - hr*1.45);
  ctx.lineTo(hx + hr*0.56, hy - hr*0.62);
  ctx.closePath(); ctx.fill();

  // almond-shaped eyes — more wild
  const eyeOff = hr * 0.3, ey = hy - hr * 0.1;
  for (const ex of [hx - eyeOff, hx + eyeOff]) {
    ctx.fillStyle = '#d4a820'; // amber/yellow wild cat eyes
    ctx.beginPath();
    ctx.ellipse(ex, ey, hr*0.22, hr*0.18, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.ellipse(ex, ey, hr*0.08, hr*0.15, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(ex + hr*0.06, ey - hr*0.06, hr*0.05, hr*0.05, 0, 0, Math.PI*2); ctx.fill();
  }

  // nose
  const nx = hx, ny = hy + hr * 0.22;
  ctx.fillStyle = '#c06070';
  ctx.beginPath();
  ctx.moveTo(nx, ny - hr*0.1);
  ctx.lineTo(nx - hr*0.14, ny + hr*0.1);
  ctx.lineTo(nx + hr*0.14, ny + hr*0.1);
  ctx.closePath(); ctx.fill();

  // mouth — simple downward lines
  ctx.strokeStyle = '#904050'; ctx.lineWidth = Math.max(1, s*0.05); ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(nx, ny + hr*0.1);
  ctx.lineTo(nx - hr*0.18, ny + hr*0.3);
  ctx.moveTo(nx, ny + hr*0.1);
  ctx.lineTo(nx + hr*0.18, ny + hr*0.3);
  ctx.stroke();

  // long wild whiskers
  ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1;
  for (const side of [-1, 1]) for (const row of [-1, 0, 1]) {
    ctx.beginPath();
    ctx.moveTo(nx + side*hr*0.12, ny + row*hr*0.06 - hr*0.05);
    ctx.lineTo(nx + side*hr*1.4, ny + row*hr*0.28 - hr*0.05);
    ctx.stroke();
  }

  // fur tufts on cheeks
  ctx.strokeStyle = c; ctx.lineWidth = 1.5;
  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(hx + side*(hr*0.7 + i*2), hy + hr*0.1);
      ctx.lineTo(hx + side*(hr*0.9 + i*3), hy + hr*0.1 - i*2);
      ctx.stroke();
    }
  }

  // walking paws — lean legs
  const swing = Math.sin(walk * 0.28) * s * 0.2;
  const leftY  = groundY - s*0.08 + swing;
  const rightY = groundY - s*0.08 - swing;

  ctx.fillStyle = legColor;
  ctx.beginPath(); ctx.ellipse(bx - s*0.4, leftY,  s*0.22, s*0.14, 0, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(bx + s*0.4, rightY, s*0.22, s*0.14, 0, 0, Math.PI*2); ctx.fill();

  // claws
  ctx.strokeStyle = 'rgba(200,200,180,0.7)'; ctx.lineWidth = 1;
  for (const [px, py] of [[bx - s*0.4, leftY], [bx + s*0.4, rightY]]) {
    for (const toe of [-0.18, -0.06, 0.06, 0.18]) {
      ctx.beginPath();
      ctx.moveTo(px + toe*s, py);
      ctx.lineTo(px + toe*s + toe*s*0.4, py + s*0.14);
      ctx.stroke();
    }
  }
}
