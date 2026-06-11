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

// Fishing
const RIVER_EDGE = GROUND_Y; // cat stands here to fish
let fishing = false;       // is the player in fishing mode
let fishTimer = 0;         // countdown until fish jumps
let fishVisible = false;   // fish is splashing
let fishX = 0;             // where the fish appears
let fishY = 0;
let fishTimer2 = 0;        // how long fish is visible
let fishCaught = false;    // flash message
let fishCaughtTimer = 0;
let fishCount = 0;         // how many caught

// Day/night cycle — 0 to 1 full cycle, 1 = one full day
let dayTime = 0.25; // start at dawn
const DAY_SPEED = 0.00008; // full cycle takes about 3 minutes

// returns 0=night 0.25=dawn 0.5=day 0.75=dusk 1=night
function skyColors() {
  const t = dayTime;
  // interpolate between key times
  const stops = [
    { t: 0.00, sky1: '#020510', sky2: '#0a1020', water: '#0a1a2a', ground: '#1a2a10' },
    { t: 0.20, sky1: '#0d1b2a', sky2: '#1a3a4a', water: '#1a3a5a', ground: '#2a4a1a' }, // pre-dawn
    { t: 0.28, sky1: '#c06020', sky2: '#e08030', water: '#2a4a6a', ground: '#3a5a2a' }, // dawn
    { t: 0.38, sky1: '#4a90c8', sky2: '#80c0e8', water: '#2a6a8a', ground: '#2a5a1a' }, // morning
    { t: 0.55, sky1: '#2a6aaa', sky2: '#60a8d8', water: '#1a5a7a', ground: '#2a5a1a' }, // day
    { t: 0.72, sky1: '#c05818', sky2: '#e07830', water: '#2a4a5a', ground: '#2a4a18' }, // dusk
    { t: 0.82, sky1: '#1a1a3a', sky2: '#2a2a5a', water: '#0a2a3a', ground: '#1a2a10' }, // evening
    { t: 1.00, sky1: '#020510', sky2: '#0a1020', water: '#0a1a2a', ground: '#1a2a10' }, // night
  ];
  let a = stops[0], b = stops[1];
  for (let i = 0; i < stops.length - 1; i++) {
    if (t >= stops[i].t && t <= stops[i+1].t) { a = stops[i]; b = stops[i+1]; break; }
  }
  const f = (t - a.t) / (b.t - a.t);
  return {
    sky1:   lerpColor(a.sky1,   b.sky1,   f),
    sky2:   lerpColor(a.sky2,   b.sky2,   f),
    water:  lerpColor(a.water,  b.water,  f),
    ground: lerpColor(a.ground, b.ground, f),
  };
}

function lerpColor(a, b, t) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const ar = (pa>>16)&255, ag = (pa>>8)&255, ab = pa&255;
  const br = (pb>>16)&255, bg = (pb>>8)&255, bb = pb&255;
  const r = Math.round(ar + (br-ar)*t);
  const g = Math.round(ag + (bg-ag)*t);
  const bv= Math.round(ab + (bb-ab)*t);
  return '#' + [r,g,bv].map(v => v.toString(16).padStart(2,'0')).join('');
}

function isNight() { return dayTime < 0.22 || dayTime > 0.80; }
function isDawn()  { return dayTime >= 0.22 && dayTime < 0.35; }
function isDusk()  { return dayTime >= 0.68 && dayTime <= 0.80; }

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
  dayTime       = 0.25;
  fishing       = false;
  fishTimer     = 0;
  fishVisible   = false;
  fishCaught    = false;
  fishCaughtTimer = 0;
  fishCount     = 0;
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

  dayTime = (dayTime + DAY_SPEED) % 1;

  // Fishing — only apprentices and warriors can hunt, kits can try too for fun
  const atRiverEdge = cat.y >= GROUND_Y && cat.x > 100;
  if (atRiverEdge && keys['f'] && !fishing && !dialogue) {
    fishing = true;
    fishTimer = 60 + Math.random() * 80; // fish jumps after random delay
    fishVisible = false;
    keys['f'] = false;
  }
  if (fishing) {
    if (fishTimer > 0) {
      fishTimer--;
    } else if (!fishVisible) {
      // fish jumps!
      fishX = cat.x + (Math.random() * 60 - 30);
      fishY = GROUND_Y - 10;
      fishVisible = true;
      fishTimer2 = 40; // window to catch it
    }
    if (fishVisible) {
      fishTimer2--;
      // press F again to catch while fish is visible
      if (keys['f']) {
        fishCaught  = true;
        fishCaughtTimer = 90;
        fishCount++;
        xp += stage === 0 ? 60 : 100;
        fishing     = false;
        fishVisible = false;
        keys['f']   = false;
        dialogue = { speaker: catName(), text: fishCount === 1 ? 'I caught my first fish!' : 'Got one! ' + fishCount + ' fish caught!' };
        dialogueTimer = 120;
      }
      if (fishTimer2 <= 0) {
        // missed!
        fishing     = false;
        fishVisible = false;
        dialogue    = { speaker: catName(), text: 'The fish got away...' };
        dialogueTimer = 100;
      }
    }
  }
  if (fishCaughtTimer > 0) fishCaughtTimer--;

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
  drawFishing();
  drawPlayer();
  drawHUD();
  if (dialogue) drawDialogue();
}

function drawFishing() {
  // F to fish hint
  if (!fishing && !dialogue && cat.y >= GROUND_Y) {
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '11px Georgia';
    ctx.textAlign = 'center';
    ctx.fillText('Press F to fish 🐟', cat.x - cameraX, GROUND_Y - 45);
  }

  // Waiting ripple
  if (fishing && !fishVisible) {
    const rippleX = cat.x - cameraX;
    const rippleY = GROUND_Y + 8;
    ctx.strokeStyle = 'rgba(100,180,220,0.5)';
    ctx.lineWidth = 1.5;
    for (let r = 1; r <= 3; r++) {
      ctx.beginPath();
      ctx.ellipse(rippleX, rippleY, r*10, r*4, 0, 0, Math.PI*2);
      ctx.stroke();
    }
    ctx.fillStyle = '#e8d5a3';
    ctx.font = '11px Georgia';
    ctx.textAlign = 'center';
    ctx.fillText('waiting...', rippleX, GROUND_Y - 45);
  }

  // Fish jumping!
  if (fishVisible) {
    const fx = fishX - cameraX;
    const jumpH = (1 - fishTimer2 / 40);
    const fy = GROUND_Y - 20 - Math.sin(jumpH * Math.PI) * 35;

    // splash
    ctx.strokeStyle = 'rgba(100,200,240,0.6)';
    ctx.lineWidth = 1.5;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(fx + i*6, GROUND_Y + 4);
      ctx.lineTo(fx + i*9, GROUND_Y - 10);
      ctx.stroke();
    }

    // fish body
    ctx.fillStyle = '#60b8d0';
    ctx.beginPath();
    ctx.ellipse(fx, fy, 14, 6, -0.4, 0, Math.PI*2);
    ctx.fill();
    // scales shimmer
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath();
    ctx.ellipse(fx - 2, fy - 1, 5, 3, -0.4, 0, Math.PI*2);
    ctx.fill();
    // tail
    ctx.fillStyle = '#4090a8';
    ctx.beginPath();
    ctx.moveTo(fx + 12, fy);
    ctx.lineTo(fx + 20, fy - 7);
    ctx.lineTo(fx + 20, fy + 7);
    ctx.closePath(); ctx.fill();
    // eye
    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.arc(fx - 7, fy - 1, 2, 0, Math.PI*2); ctx.fill();

    // catch prompt — flashing
    if (fishTimer2 > 10) {
      ctx.fillStyle = `rgba(255,220,50,${0.7 + Math.sin(Date.now()*0.02)*0.3})`;
      ctx.font = 'bold 14px Georgia';
      ctx.textAlign = 'center';
      ctx.fillText('Press F to catch!', fx, GROUND_Y - 55);
    }
  }

  // Fish count badge
  if (fishCount > 0) {
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(W - 90, 28, 80, 18);
    ctx.fillStyle = '#60d0e8';
    ctx.font = '12px Georgia';
    ctx.textAlign = 'right';
    ctx.fillText('🐟 × ' + fishCount, W - 14, 42);
  }
}

function drawBackground() {
  const col = skyColors();

  // Sky gradient
  const sky = ctx.createLinearGradient(0, 0, 0, H * 0.62);
  sky.addColorStop(0, col.sky1);
  sky.addColorStop(1, col.sky2);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H * 0.62);

  // Stars — fade in at night/dusk/dawn
  const starAlpha = isNight() ? 0.85 : isDawn() || isDusk() ? 0.35 : 0;
  if (starAlpha > 0) {
    ctx.fillStyle = `rgba(255,255,255,${starAlpha})`;
    for (const [sx, sy, r] of [
      [80,25,1.4],[200,45,1.0],[340,18,1.6],[500,38,1.0],[650,22,1.4],
      [720,52,1.0],[150,65,1.2],[420,60,0.9],[560,15,1.5],[300,35,0.8],
      [700,30,1.1],[100,50,0.9],[450,28,1.3],[620,48,1.0],[260,55,0.8],
    ]) {
      ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI*2); ctx.fill();
    }
  }

  // Sun
  const sunProgress = (dayTime - 0.28) / 0.5; // 0 at dawn, 1 at dusk
  if (sunProgress >= 0 && sunProgress <= 1) {
    const sunX = W * sunProgress;
    const sunY = H * 0.55 - Math.sin(sunProgress * Math.PI) * H * 0.45;
    const sunAlpha = isDawn() || isDusk() ? 0.7 : 1;
    const sunColor = isDawn() || isDusk() ? '#ffaa40' : '#ffe080';
    ctx.fillStyle = sunColor;
    ctx.globalAlpha = sunAlpha;
    ctx.beginPath(); ctx.arc(sunX, sunY, 18, 0, Math.PI*2); ctx.fill();
    // glow
    const glow = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, 40);
    glow.addColorStop(0, 'rgba(255,220,80,0.3)');
    glow.addColorStop(1, 'rgba(255,220,80,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(sunX, sunY, 40, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Moon
  const moonProgress = dayTime < 0.22 ? dayTime / 0.22 : (dayTime - 0.80) / 0.20;
  if (isNight()) {
    const moonX = W * 0.7;
    const moonY = 60;
    ctx.fillStyle = '#e8e8c8';
    ctx.beginPath(); ctx.arc(moonX, moonY, 14, 0, Math.PI*2); ctx.fill();
    // crescent shadow
    ctx.fillStyle = col.sky1;
    ctx.beginPath(); ctx.arc(moonX + 5, moonY, 12, 0, Math.PI*2); ctx.fill();
  }

  // Time of day label
  const timeLabel = isNight() ? '🌙 Night' : isDawn() ? '🌅 Dawn' : isDusk() ? '🌆 Dusk' : '☀️ Day';
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = '11px Georgia';
  ctx.textAlign = 'right';
  ctx.fillText(timeLabel, W - 10, 20);

  // River — tinted by time of day
  ctx.fillStyle = col.water;
  ctx.fillRect(0, H * 0.62, W, H * 0.38);
  ctx.fillStyle = 'rgba(180,220,255,0.08)';
  for (let i = 0; i < 6; i++) {
    const wx = ((i * 140 - cameraX * 0.2) % (W + 100)) - 50;
    ctx.fillRect(wx, H * 0.67, 60, 4);
  }

  // Ground
  ctx.fillStyle = col.ground;
  ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
  ctx.fillStyle = isNight() ? '#2a4a18' : '#3a6a2a';
  ctx.fillRect(0, GROUND_Y, W, 5);

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
  ctx.fillText('A/D move   W jump   E talk   F fish', 12, H - 12);
}

function drawDialogue() {
  const maxW = W - 80;
  const lines = wrapText(dialogue.text, maxW, '13px Georgia');
  const boxH = 42 + lines.length * 18;

  ctx.fillStyle = 'rgba(0,0,0,0.82)';
  ctx.fillRect(20, H - boxH - 10, W - 40, boxH);
  ctx.strokeStyle = '#7ec8e3';
  ctx.lineWidth = 2;
  ctx.strokeRect(20, H - boxH - 10, W - 40, boxH);
  ctx.fillStyle = '#7ec8e3';
  ctx.font = 'bold 14px Georgia';
  ctx.textAlign = 'left';
  ctx.fillText(dialogue.speaker, 36, H - boxH + 8);
  ctx.fillStyle = '#e8d5a3';
  ctx.font = '13px Georgia';
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], 36, H - boxH + 26 + i * 18);
  }
}

function wrapText(text, maxWidth, font) {
  ctx.font = font;
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
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
