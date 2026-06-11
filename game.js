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

// World layout
const FOREST_START = 0;
const FOREST_END   = 1800;  // forest to the left of camp
const CAMP_START   = 1800;
const NURSERY_X    = 1980;
const LEADERS_X    = 2300;
const WARRIORS_X   = 2650;
const MEDICINE_X   = 2950;
const WORLD_WIDTH  = 3200;
const MOONPOOL_X   = 3100; // Moonpool — medicine cats speak with StarClan here

// NPC cats — positioned in camp
const NPCS = [
  { x: LEADERS_X  - 100, name: 'Ripplestar',  color: '#f0f0f0', legColor: '#e0e0e0', size: 22,
    lines: ['Hello little one.', 'Stay close to camp!'] },
  { x: NURSERY_X  + 80,  name: 'Mosswhisker', color: '#b8926a', legColor: '#a07850', size: 20,
    lines: ['Welcome to the nursery!', 'You are safe here, little one.'] },
  { x: WARRIORS_X + 80,  name: 'Stoneclaw',   color: '#7a7a8a', legColor: '#5a5a6a', size: 22,
    lines: ['Train hard and you will be a great warrior.'] },
  { x: MEDICINE_X + 80,  name: 'Fernleaf',    color: '#8ab870', legColor: '#6a9050', size: 20,
    lines: ['I am the medicine cat. Come to me if you are hurt.'] },
];

const keys = {};
document.addEventListener('keydown', e => {
  if (namingKit) {
    if (e.key === 'Backspace') {
      kitNameInput = kitNameInput.slice(0, -1);
    } else if (e.key === 'Enter' && kitNameInput.trim().length > 0) {
      const name = kitNameInput.trim();
      const kitPrefix = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
      const fullKitName = kitPrefix + 'kit';
      const kitColors = ['#c8a870','#7a9aaa','#b87060','#a0b888','#8a8aaa'];
      const c = kitColors[kits.length % kitColors.length];
      kits.push({ name: fullKitName, prefix: kitPrefix, color: c, leg: c, stage: 0, growTimer: 0 });
      kitNameInput = '';
      namingKit = false;
      dialogue = { speaker: catName(), text: 'Welcome to RiverClan, ' + fullKitName + '! 💕' };
      dialogueTimer = 200;
    } else if (e.key.length === 1 && kitNameInput.length < 12) {
      kitNameInput += e.key;
    }
    e.preventDefault();
    return;
  }
  keys[e.key.toLowerCase()] = true;
});
document.addEventListener('keyup',   e => keys[e.key.toLowerCase()] = false);

let cat, onGround, cameraX, dialogue, dialogueTimer, walkFrame;

// Den interiors
// currentDen: null = outside, 'nursery'/'leaders'/'warriors'/'medicine'
let currentDen = null;
const DENS = [
  { id: 'nursery',  x: NURSERY_X,  label: 'Nursery',
    bg: '#1a2a10', wallColor: '#2a3a18',
    desc: 'Soft moss and bracken line the floor. It smells like milk and warmth.',
    cats: [
      { name: 'Mosswhisker', color: '#b8926a', leg: '#a07850', line: 'Rest here little one. You are safe in the nursery.' },
      { name: 'Dawnpetal',   color: '#e8c8a0', leg: '#c8a880', line: 'Would you like to hear a story about the old days?' },
      { name: 'Reedkit',     color: '#8a7a5a', leg: '#6a5a3a', line: 'Mew! Want to play moss-ball with me?' },
      { name: 'Splashkit',   color: '#7a9aaa', leg: '#5a7a8a', line: 'I want to be a warrior one day! Do you?' },
    ]},
  { id: 'leaders',  x: LEADERS_X,  label: "Leader's Den",
    bg: '#18181a', wallColor: '#28283a',
    desc: 'A grand den draped with trailing ivy. The air smells of pine and authority.',
    cats: [
      { name: 'Ripplestar',  color: '#f0f0f0', leg: '#e0e0e0', line: 'Welcome to my den. What do you need, young one?' },
      { name: 'Silverdepth', color: '#b0c0d0', leg: '#90a0b0', line: 'I am the deputy. Ripplestar leads us all wisely.' },
    ]},
  { id: 'warriors', x: WARRIORS_X, label: 'Warriors Den',
    bg: '#1a1810', wallColor: '#2a2818',
    desc: 'Bracken nests are scattered around. It smells of earth and pine needles.',
    cats: [
      { name: 'Stoneclaw',   color: '#7a7a8a', leg: '#5a5a6a', line: 'A warrior\'s den is no place for a kit. But you are brave.' },
      { name: 'Rushpelt',    color: '#8a6a40', leg: '#6a4a28', line: 'I just got back from dawn patrol. Those ThunderClan cats were snooping again.' },
      { name: 'Pikefang',    color: '#5a6a5a', leg: '#3a4a3a', line: 'I caught five fish yesterday. Can you beat that?' },
      { name: 'Willowshade', color: '#aab890', leg: '#8a9870', line: 'Shh, some of us are trying to sleep!' },
      { name: 'Currentfoot', color: '#7a8a9a', leg: '#5a6a7a', line: 'RiverClan is the strongest Clan. We swim where others fear to walk.' },
    ]},
  { id: 'medicine', x: MEDICINE_X, label: 'Medicine Den',
    bg: '#101a10', wallColor: '#182a18',
    desc: 'Bundles of herbs hang from the roof. The air smells sweet and strange.',
    cats: [
      { name: 'Fernleaf',    color: '#8ab870', leg: '#6a9050', line: 'Careful! Don\'t knock over my herbs. Are you hurt?' },
      { name: 'Mistpaw',     color: '#c0c8b0', leg: '#a0a890', line: 'I am training to be a medicine cat. These are marigold leaves — they help wounds heal.' },
    ]},
];

// Forest prey
const PREY_TYPES = [
  { name: 'mouse',  color: '#8a6a50', size: 6,  xp: 40,  msg: 'You caught a mouse!' },
  { name: 'vole',   color: '#7a5a40', size: 7,  xp: 45,  msg: 'You caught a vole!' },
  { name: 'rabbit', color: '#c8a878', size: 10, xp: 70,  msg: 'You caught a rabbit!' },
  { name: 'bird',   color: '#6a7a9a', size: 8,  xp: 60,  msg: 'You caught a starling!' },
];
let forestPrey = []; // live prey scurrying around
let preyCount = 0;
let pouncing = false;
let pounceTimer = 0;

// Fishing
const RIVER_EDGE = GROUND_Y;
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

// Mate system
let mate = null; // { name, color, leg } once chosen
let mateAsked = false;
let mateTimer = 0;

// Kits
// stage: 0=kit, 1=apprentice, 2=warrior
// Each kit has a growTimer that ticks up — at thresholds they grow up
let kits = []; // { name, color, leg, stage, growTimer, prefix }
let namingKit = false;
let kitNameInput = '';
let apprentice = null; // ref to the kit chosen as player's apprentice
let apprenticeOut = false; // true when apprentice is following player on patrol
let mentor = null; // { name, color, leg } — assigned when player becomes apprentice
const KIT_GROW_TO_APP  = 1800;  // ~30 seconds of play
const KIT_GROW_TO_WAR  = 4200;

function kitDisplayName(k) {
  if (k.stage === 0) return k.prefix + 'kit';
  if (k.stage === 1) return k.prefix + 'paw';
  return k.prefix + WARRIOR_SUFFIXES[k.prefix.length % WARRIOR_SUFFIXES.length];
}
function kitSize(k) { return k.stage === 0 ? 9 : k.stage === 1 ? 14 : 19; }
function kitDen(k)  { return k.stage === 0 ? 'nursery' : k.stage === 1 ? 'warriors' : 'warriors'; }

function isNight() { return dayTime < 0.22 || dayTime > 0.80; }
function isDawn()  { return dayTime >= 0.22 && dayTime < 0.35; }
function isDusk()  { return dayTime >= 0.68 && dayTime <= 0.80; }

// ─── ThunderClan Battle ───────────────────────────────────────────────────────
let tcBattle = false;       // battle in progress
let tcCats   = [];          // { x, hp, maxHp, color, leg, name, vx, hitFlash }
let playerHp = 10;
const PLAYER_MAX_HP = 10;
let healTimer = 0;          // ticks between heals outside battle
let swipeTimer = 0;         // brief swipe animation
let battleWon  = false;     // show victory screen briefly
let battleWonTimer = 0;

// ─── Moonpool / StarClan ──────────────────────────────────────────────────────
let moonpoolVisited = false; // cooldown so you can't spam
let moonpoolTimer   = 0;     // glowing ripple animation tick

const STARCLAN_MESSAGES = [
  { speaker: 'Bluestar',    text: 'Well done, young medicine cat. RiverClan is strong because of cats like you. Trust in the river — it always finds its way.' },
  { speaker: 'Yellowfang',  text: 'Ha! So you came to bother the dead, did you? Good. Listen closely: a storm is coming. Prepare your herbs.' },
  { speaker: 'Spottedleaf', text: 'The stars are watching over you. When you feel lost, look at the reflection in the water — StarClan is always near.' },
  { speaker: 'Firestar',    text: 'Courage, young one. A medicine cat\'s strength is not in their claws but in their heart. You have a kind heart.' },
  { speaker: 'Silverstream', text: 'The river carries whispers from the old ones. Be patient. The answers you seek will come like the tide.' },
  { speaker: 'Cinderpelt',  text: 'I know what it is to walk this path. It is hard and it is beautiful. You are never alone — we are always here.' },
  { speaker: 'Bluestar',    text: 'I sense great things in your future. RiverClan chose well when you answered the call of the medicine cat.' },
  { speaker: 'Oakheart',    text: 'The river flows on forever, as does RiverClan. Keep your clanmates healthy and the Clan will thrive for generations.' },
];

const TC_CATS_DATA = [
  { name: 'Tigerclaw',  color: '#8a6030', leg: '#6a4010' },
  { name: 'Darkstripe', color: '#303030', leg: '#202020' },
  { name: 'Longtail',   color: '#d0c890', leg: '#b0a870' },
  { name: 'Dustpelt',   color: '#a08050', leg: '#806030' },
  { name: 'Sandpaw',    color: '#e0c870', leg: '#c0a850' },
];

function startBattle() {
  if (tcBattle || stage < 1) return;
  tcBattle = true;
  battleWon = false;
  // spawn 3–4 ThunderClan cats on the left side of the forest
  const count = 3 + (stage === 2 ? 1 : 0);
  tcCats = [];
  for (let i = 0; i < count; i++) {
    const data = TC_CATS_DATA[i % TC_CATS_DATA.length];
    tcCats.push({ ...data, x: 100 + i * 180, hp: 4, maxHp: 4, vx: 0.6, hitFlash: 0 });
  }
  dialogue = { speaker: 'Ripplestar', text: `ThunderClan is on our territory! Drive them out, ${catName()}! Fight for RiverClan!` };
  dialogueTimer = 220;
}

// Growth system
// stage: 0=kit, 1=apprentice, 2=warrior
let stage = 0;
let xp = 0;
const XP_TO_APPRENTICE = 300;
const XP_TO_WARRIOR    = 700;
const XP_TO_DEPUTY     = 1200;
const XP_TO_LEADER     = 2000;
const WARRIOR_SUFFIXES = ['storm','heart','fire','leap','splash','stream','ripple','pool','claw','tail'];
let ceremonyTimer = 0;
let ceremonyText  = '';
let xpZones = []; // tracks which zones have been visited for xp

let catPath = 'warrior'; // 'warrior' or 'medicine'
let choosingPath = false; // show path choice screen
let pathChoice = 0; // 0=warrior, 1=medicine (highlighted)

const MED_SUFFIXES = ['leaf','petal','pool','frost','feather','fern','whisker','herb'];

let leaderLives = 9;
let readyForNineLives = false; // deputy earned enough XP — needs to visit Moonpool
let nineLivesCeremony = false; // ceremony in progress at Moonpool
let livesReceived = 0;         // how many lives given so far

const NINE_LIVES_GIVERS = [
  { name: 'Bluestar',     life: 'courage',      text: 'I give you a life for courage, to face danger without flinching.' },
  { name: 'Firestar',     life: 'loyalty',      text: 'I give you a life for loyalty, to always stand by your Clan.' },
  { name: 'Silverstream', life: 'love',         text: 'I give you a life for love, to cherish those who depend on you.' },
  { name: 'Yellowfang',   life: 'compassion',   text: 'I give you a life for compassion. Even grumpy old medicine cats need it.' },
  { name: 'Spottedleaf',  life: 'wisdom',       text: 'I give you a life for wisdom. Listen to your heart as well as your head.' },
  { name: 'Oakheart',     life: 'strength',     text: 'I give you a life for strength, to protect those who cannot protect themselves.' },
  { name: 'Cinderpelt',   life: 'endurance',    text: 'I give you a life for endurance. You will face hard times — keep going.' },
  { name: 'Whitestorm',   life: 'justice',      text: 'I give you a life for justice. Lead with fairness and RiverClan will thrive.' },
  { name: 'Bluestar',     life: 'hope',         text: 'And your ninth life — for hope. As long as you have hope, RiverClan can never truly fall.' },
];

function catSize() { return stage === 0 ? 12 : stage === 1 ? 17 : stage >= 3 ? 24 : 22; }

function catName() {
  if (stage === 0) return prefix + 'kit';
  if (stage === 1) return prefix + 'paw';
  if (stage === 4) return prefix + 'star';
  if (catPath === 'medicine') return prefix + MED_SUFFIXES[prefix.length % MED_SUFFIXES.length];
  return prefix + WARRIOR_SUFFIXES[prefix.length % WARRIOR_SUFFIXES.length];
}

function startGame() {
  canvas.width  = W;
  canvas.height = H;
  cat = { x: NURSERY_X - 100, y: GROUND_Y, vx: 0, vy: 0 };
  onGround      = true;
  cameraX       = 0;
  dialogue      = null;
  dialogueTimer = 0;
  walkFrame     = 0;
  stage         = 0;
  xp            = 0;
  ceremonyTimer = 0;
  dayTime       = 0.25;
  mate          = null;
  mateAsked     = false;
  kits          = [];
  namingKit     = false;
  kitNameInput  = '';
  apprentice    = null;
  apprenticeOut = false;
  mentor        = null;
  catPath       = 'warrior';
  choosingPath  = false;
  pathChoice    = 0;
  leaderLives         = 9;
  readyForNineLives   = false;
  nineLivesCeremony   = false;
  livesReceived       = 0;
  tcBattle      = false;
  tcCats        = [];
  playerHp      = PLAYER_MAX_HP;
  healTimer     = 0;
  swipeTimer    = 0;
  battleWon     = false;
  battleWonTimer  = 0;
  moonpoolVisited = false;
  moonpoolTimer   = 0;
  currentDen    = null;
  // Spawn forest prey
  forestPrey = [];
  for (let i = 0; i < 14; i++) {
    const type = PREY_TYPES[Math.floor(Math.random() * PREY_TYPES.length)];
    forestPrey.push({
      ...type,
      x: 80 + Math.random() * (FOREST_END - 200),
      y: GROUND_Y,
      vx: (Math.random() - 0.5) * 1.2,
      scared: false,
      scaredTimer: 0,
      caught: false,
      fleeTimer: 0,
    });
  }
  preyCount  = 0;
  pouncing   = false;
  pounceTimer = 0;
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

function confirmPath() {
  catPath = pathChoice === 0 ? 'warrior' : 'medicine';
  choosingPath = false;
  if (catPath === 'warrior') {
    const warriorCats = DENS.find(d => d.id === 'warriors').cats;
    mentor = warriorCats[Math.floor(Math.random() * warriorCats.length)];
    dialogue = { speaker: 'Ripplestar', text: `From this day on you shall be known as ${catName()}! ${mentor.name} — you are ready for an apprentice. Train ${catName()} well!` };
  } else {
    mentor = DENS.find(d => d.id === 'medicine').cats[0]; // Fernleaf
    dialogue = { speaker: 'Ripplestar', text: `From this day on you shall be known as ${catName()}! Fernleaf — ${catName()} will learn the ways of a medicine cat. Teach them wisely!` };
  }
  dialogueTimer = 400;
}

function update() {
  // Path choice screen blocks all other input
  if (choosingPath) {
    if (keys['a'] || keys['arrowleft'])  { pathChoice = 0; keys['a'] = keys['arrowleft'] = false; }
    if (keys['d'] || keys['arrowright']) { pathChoice = 1; keys['d'] = keys['arrowright'] = false; }
    if (keys['enter'] || keys[' '])      { confirmPath(); keys['enter'] = keys[' '] = false; }
    return;
  }

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

  if (currentDen) {
    const den = DENS.find(d => d.id === currentDen);
    // Walk inside den with A/D, E to talk to nearest cat
    if (keys['a']) cat.vx = -SPEED; else if (keys['d']) cat.vx = SPEED; else cat.vx = 0;
    cat.x = Math.max(60, Math.min(W - 60, cat.x + cat.vx));
    if (cat.vx !== 0) walkFrame++; else walkFrame = 0;

    if (keys['t'] && !dialogue) {
      // find nearest den cat
      const denCatXs = den.cats.map((_, i) => denCatX(den, i));
      let nearest = 0, nearDist = 9999;
      denCatXs.forEach((cx, i) => {
        const d = Math.abs(cat.x - cx);
        if (d < nearDist) { nearDist = d; nearest = i; }
      });
      if (nearDist < 80) {
        const nearCat = den.cats[nearest];
        // mate asking — only warriors, only in warriors den, only cats that aren't already your mate
        if (stage === 2 && den.id === 'warriors' && !mate && keys['m']) {
          // handled below
        } else {
          const mateHint = stage === 2 && den.id === 'warriors' && !mate
            ? ' (Press M to ask to be mates)' : '';
          const isMentor = mentor && nearCat.name === mentor.name;
          const mentorLines = [
            `Come on ${catName()}, let's go on patrol together!`,
            `You're getting better every day, ${catName()}. Keep practising!`,
            `Focus on your hunting crouch. Watch how I do it.`,
            `A good warrior is always ready. Are you ready?`,
          ];
          const line = isMentor
            ? mentorLines[Math.floor(Math.random() * mentorLines.length)]
            : nearCat.line + mateHint;
          dialogue = { speaker: nearCat.name, text: line };
          dialogueTimer = 220;
          keys['t'] = false;
        }
      }
    }

    // M to ask a cat to be your mate (warrior path only, warriors den)
    if (keys['m'] && stage === 2 && catPath === 'warrior' && den.id === 'warriors' && !mate && !dialogue) {
      const denCatXs = den.cats.map((_, i) => denCatX(den, i));
      let nearest = 0, nearDist = 9999;
      denCatXs.forEach((cx, i) => {
        const d = Math.abs(cat.x - cx);
        if (d < nearDist) { nearDist = d; nearest = i; }
      });
      if (nearDist < 80) {
        const chosen = den.cats[nearest];
        mate = { name: chosen.name, color: chosen.color, leg: chosen.leg };
        dialogue = { speaker: chosen.name, text: `${catName()}... I would be honoured to be your mate. My heart is yours. 💕` };
        dialogueTimer = 280;
        keys['m'] = false;
      }
    }
    // K to have a kit — only in nursery, warrior with mate, max 3
    if (keys['k'] && stage === 2 && mate && kits.length < 3 && den.id === 'nursery' && !dialogue && !namingKit) {
      namingKit = true;
      kitNameInput = '';
      keys['k'] = false;
    }

    // P in warriors den — take apprentice on patrol or send them back
    if (keys['p'] && stage === 2 && den.id === 'warriors' && apprentice && !dialogue) {
      const appIdx = kits.indexOf(apprentice);
      const appKx = 140 + appIdx * 100;
      if (Math.abs(cat.x - appKx) < 110) {
        if (!apprenticeOut) {
          apprenticeOut = true;
          dialogue = { speaker: apprentice.name, text: `Yes, mentor! I\'m ready to train! Let\'s go! 🐾` };
          dialogueTimer = 220;
        } else {
          apprenticeOut = false;
          dialogue = { speaker: apprentice.name, text: `That was great training! I learned so much today!` };
          dialogueTimer = 220;
        }
        keys['p'] = false;
      }
    }

    // P to pick an apprentice from the nursery kits
    if (keys['p'] && stage === 2 && den.id === 'nursery' && !apprentice && !dialogue && !namingKit) {
      const nurseryKits = kits.filter(k => k.stage === 0);
      if (nurseryKits.length > 0) {
        // use the filtered index (i) so positions match how they are drawn
        let chosen = null;
        let chosenDist = 9999;
        nurseryKits.forEach((k, i) => {
          const kx = 140 + i * 100;
          const dist = Math.abs(cat.x - kx);
          if (dist < chosenDist) { chosenDist = dist; chosen = k; }
        });
        if (chosenDist < 130) {
          apprentice = chosen;
          apprentice.stage = 1;
          apprentice.name = apprentice.prefix + 'paw';
          dialogue = { speaker: 'Ripplestar', text: `${catName()}, you have shown great wisdom and courage! From this day on, ${apprentice.name} is your apprentice. Mentor them well!` };
          dialogueTimer = 340;
          keys['p'] = false;
        }
      } else {
        dialogue = { speaker: catName(), text: `There are no kits in the nursery yet to take as an apprentice.` };
        dialogueTimer = 180;
        keys['p'] = false;
      }
    }

    if (keys['q'] || keys['escape']) {
      currentDen = null;
      cat.x = den.x;
      keys['q'] = false;
    }
    return;
  }

  for (const npc of NPCS) {
    if (Math.abs(cat.x - npc.x) < 55 && keys['t'] && !dialogue) {
      const line = npc.lines[Math.floor(Math.random() * npc.lines.length)];
      const text = line.includes('NAME') ? line.replace('NAME', catName()) : line;
      dialogue = { speaker: npc.name, text };
      dialogueTimer = 200;
      keys['t'] = false;
    }
  }

  // Enter a den
  for (const den of DENS) {
    if (Math.abs(cat.x - den.x) < 22 && cat.y >= GROUND_Y - 5 && keys['e'] && !dialogue) {
      currentDen = den.id;
      cat.x = W / 2;
      dialogue = null;
      keys['e'] = false;
      break;
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
    choosingPath = true;
    pathChoice = 0;
  }
  if (stage === 1 && xp >= XP_TO_WARRIOR) {
    stage = 2;
    xp = XP_TO_WARRIOR;
    const m = mentor ? mentor.name : 'your mentor';
    mentor = null;
    const pathCeremony = catPath === 'medicine'
      ? `${catName()}! You have learned the ways of herbs and healing. ${m} is proud of you. From this day forward you shall be known as ${catName()}, medicine cat of RiverClan!`
      : `${catName()}! You have trained hard and shown true courage. ${m} is proud of you. From this day forward you shall be known as ${catName()}!`;
    ceremonyText = pathCeremony;
    ceremonyTimer = 400;
    dialogue = { speaker: 'Ripplestar', text: ceremonyText };
    dialogueTimer = 400;
  }
  if (stage === 2 && catPath === 'warrior' && xp >= XP_TO_DEPUTY) {
    stage = 3;
    xp = XP_TO_DEPUTY;
    ceremonyText = `${catName()}! Your courage and loyalty are unmatched. I, Ripplestar, name you deputy of RiverClan! All cats honour the new deputy!`;
    dialogue = { speaker: 'Ripplestar', text: ceremonyText };
    dialogueTimer = 420;
  }
  if (stage === 3 && xp >= XP_TO_LEADER && !readyForNineLives) {
    readyForNineLives = true;
    xp = XP_TO_LEADER;
    dialogue = { speaker: 'Ripplestar', text: `${catName()}, RiverClan is ready for a new leader. Go to the Moonpool at night — StarClan is waiting to give you your nine lives!` };
    dialogueTimer = 420;
  }

  dayTime = (dayTime + DAY_SPEED) % 1;

  // If apprentice already became a warrior, free the slot
  if (apprentice && apprentice.stage === 2) {
    apprentice = null;
    apprenticeOut = false;
  }

  // Apprentice trains faster while out on patrol
  if (apprentice && apprenticeOut && apprentice.stage === 1) {
    apprentice.growTimer += 2; // double speed while training
  }

  // Grow kits over time
  for (const k of kits) {
    if (k.stage < 2) k.growTimer++;
    if (k.stage === 0 && k.growTimer >= KIT_GROW_TO_APP) {
      k.stage = 1;
      k.name  = k.prefix + 'paw';
      dialogue = { speaker: 'Ripplestar', text: `${k.name} has earned their apprentice name! From this day on they shall be known as ${k.name}!` };
      dialogueTimer = 280;
    } else if (k.stage === 1 && k.growTimer >= KIT_GROW_TO_WAR) {
      k.stage = 2;
      k.name  = k.prefix + WARRIOR_SUFFIXES[k.prefix.length % WARRIOR_SUFFIXES.length];
      dialogue = { speaker: 'Ripplestar', text: `${k.name} has proven themselves a true warrior of RiverClan!` };
      dialogueTimer = 280;
      if (apprentice === k) {
        apprentice = null;
        apprenticeOut = false;
      }
    }
  }

  // Forest prey movement
  const inForest = cat.x < FOREST_END && !currentDen;
  for (const p of forestPrey) {
    if (p.caught) continue;
    // flee if cat is close
    const dist = Math.abs(cat.x - p.x);
    if (dist < 120 && inForest) {
      p.scared = true;
      p.vx = p.x < cat.x ? -1.8 : 1.8;
      if (p.name === 'bird' && dist < 60) p.y = Math.max(GROUND_Y - 60, p.y - 2); // birds fly up
    } else {
      p.scared = false;
      if (Math.random() < 0.01) p.vx = (Math.random() - 0.5) * 1.2;
      if (p.name === 'bird') p.y += (GROUND_Y - p.y) * 0.05; // birds land
    }
    p.x += p.vx;
    // bounce off forest edges
    if (p.x < 40)            { p.x = 40;            p.vx *= -1; }
    if (p.x > FOREST_END - 40) { p.x = FOREST_END - 40; p.vx *= -1; }
    if (p.y > GROUND_Y) p.y = GROUND_Y;
  }

  // Pounce with F in forest
  if (inForest && keys['f'] && !pouncing && !dialogue && onGround) {
    pouncing = true;
    pounceTimer = 18;
    cat.vy = -8;
    onGround = false;
    keys['f'] = false;
  }
  if (pouncing) {
    pounceTimer--;
    if (pounceTimer <= 0 || onGround) {
      pouncing = false;
      // check if landed on any prey
      for (const p of forestPrey) {
        if (!p.caught && Math.abs(cat.x - p.x) < 30 && Math.abs(cat.y - p.y) < 30) {
          p.caught = true;
          preyCount++;
          xp += p.xp;
          dialogue = { speaker: catName(), text: p.msg + ' (' + preyCount + ' caught)' };
          dialogueTimer = 120;
          // respawn after a while
          setTimeout(() => {
            p.caught = false;
            p.x = 80 + Math.random() * (FOREST_END - 200);
            p.y = GROUND_Y;
          }, 8000);
          break;
        }
      }
      if (!dialogue && pounceTimer <= 0) {
        dialogue = { speaker: catName(), text: 'Missed! The ' + (forestPrey.find(p => !p.caught && Math.abs(cat.x - p.x) < 80)?.name || 'prey') + ' got away.' };
        dialogueTimer = 80;
      }
    }
  }

  // Fishing — only apprentices and warriors can hunt, kits can try too for fun
  const atRiverEdge = cat.y >= GROUND_Y && cat.x >= FOREST_END;
  if (atRiverEdge && keys['f'] && !fishing && !dialogue && !pouncing) {
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

  // ── Battle: trigger with B at camp border ──────────────────────────────────
  if (keys['b'] && !tcBattle && !currentDen && !dialogue && stage >= 2 && catPath === 'warrior') {
    startBattle();
    keys['b'] = false;
  }

  if (swipeTimer > 0) swipeTimer--;

  if (tcBattle && !currentDen) {
    // F key to swipe at nearest TC cat
    if (keys['f'] && swipeTimer === 0 && !dialogue) {
      swipeTimer = 14;
      let hit = false;
      for (const tc of tcCats) {
        if (tc.hp > 0 && Math.abs(cat.x - tc.x) < 55) {
          tc.hp--;
          tc.hitFlash = 18;
          tc.vx = cat.x < tc.x ? 2 : -2; // knockback
          xp += 15;
          hit = true;
          if (tc.hp <= 0) {
            dialogue = { speaker: tc.name, text: 'Argh! RiverClan is too strong! I retreat!' };
            dialogueTimer = 160;
          }
          break;
        }
      }
      if (!hit) {
        dialogue = { speaker: catName(), text: 'Missed! Get closer!' };
        dialogueTimer = 60;
      }
      keys['f'] = false;
    }

    // TC cats move toward player and deal damage when adjacent
    for (const tc of tcCats) {
      if (tc.hp <= 0) continue;
      if (tc.hitFlash > 0) { tc.hitFlash--; tc.vx *= 0.85; }
      else tc.vx = tc.x > cat.x ? -0.9 : 0.9;
      tc.x += tc.vx;
      tc.x = Math.max(30, Math.min(FOREST_END + 200, tc.x));
      // attack player
      if (Math.abs(cat.x - tc.x) < 40) {
        if (Math.random() < 0.015) {
          playerHp = Math.max(0, playerHp - 1);
          if (playerHp === 0) {
            if (stage === 4) {
              leaderLives--;
              playerHp = PLAYER_MAX_HP;
              if (leaderLives <= 0) {
                tcBattle = false; tcCats = [];
                dialogue = { speaker: 'StarClan', text: `${catName()}... you have used all nine lives. You join us now among the stars. RiverClan will remember you always.` };
                dialogueTimer = 500;
              } else {
                dialogue = { speaker: catName(), text: `A life lost! ${leaderLives} lives remain. I will not give up!` };
                dialogueTimer = 200;
              }
            } else {
              tcBattle = false;
              tcCats = [];
              playerHp = 3;
              dialogue = { speaker: 'Ripplestar', text: `${catName()}! Fall back! You fought bravely but you need to rest. ThunderClan will be back...` };
              dialogueTimer = 300;
            }
          }
        }
      }
    }

    // Check if all TC cats defeated
    if (tcCats.every(tc => tc.hp <= 0)) {
      tcBattle = false;
      battleWon = true;
      battleWonTimer = 400;
      xp += 80;
      dialogue = { speaker: 'Ripplestar', text: `RiverClan! ${catName()} has driven ThunderClan from our territory! We are proud of you! RIVERCLAN!` };
      dialogueTimer = 380;
    }
  }

  // Heal slowly outside battle
  if (!tcBattle && playerHp < PLAYER_MAX_HP) {
    healTimer++;
    if (healTimer >= 120) { healTimer = 0; playerHp = Math.min(PLAYER_MAX_HP, playerHp + 1); }
  }

  if (battleWonTimer > 0) battleWonTimer--;

  moonpoolTimer++;
  if (moonpoolVisited) {
    moonpoolTimer++;
    if (moonpoolTimer > 600) { moonpoolVisited = false; moonpoolTimer = 0; }
  }

  // Moonpool interactions at night
  if (keys['t'] && !currentDen && !dialogue && Math.abs(cat.x - MOONPOOL_X) < 55 && isNight()) {
    // Nine lives ceremony for deputy who's ready
    if (readyForNineLives && !nineLivesCeremony) {
      nineLivesCeremony = true;
      livesReceived = 0;
      const giver = NINE_LIVES_GIVERS[0];
      dialogue = { speaker: '✨ ' + giver.name + ' (StarClan)', text: giver.text };
      dialogueTimer = 360;
      livesReceived = 1;
      keys['t'] = false;
    } else if (nineLivesCeremony && livesReceived < 9) {
      const giver = NINE_LIVES_GIVERS[livesReceived];
      dialogue = { speaker: '✨ ' + giver.name + ' (StarClan)', text: giver.text };
      dialogueTimer = 360;
      livesReceived++;
      keys['t'] = false;
    } else if (nineLivesCeremony && livesReceived >= 9) {
      // All nine lives received — become leader!
      nineLivesCeremony = false;
      readyForNineLives = false;
      stage = 4;
      leaderLives = 9;
      playerHp = PLAYER_MAX_HP;
      dialogue = { speaker: '✨ StarClan', text: `You have your nine lives, ${catName()}! Lead RiverClan with all the courage, wisdom and love we have given you. RIVERCLAN!` };
      dialogueTimer = 500;
      keys['t'] = false;
    } else if (catPath === 'medicine' && stage >= 1 && !moonpoolVisited) {
      // Medicine cat StarClan message
      const msg = STARCLAN_MESSAGES[Math.floor(Math.random() * STARCLAN_MESSAGES.length)];
      dialogue = { speaker: '✨ ' + msg.speaker + ' (StarClan)', text: msg.text };
      dialogueTimer = 380;
      moonpoolVisited = true;
      moonpoolTimer = 0;
      xp += 40;
      keys['t'] = false;
    }
  }

  cameraX = cat.x - W / 3;
  if (cameraX < 0) cameraX = 0;
  if (cameraX > WORLD_WIDTH - W) cameraX = WORLD_WIDTH - W;
}

// ─── Draw ────────────────────────────────────────────────────────────────────

function draw() {
  ctx.clearRect(0, 0, W, H);
  if (currentDen) {
    drawDenInterior();
  } else {
    drawBackground();
    if (cat.x < FOREST_END) drawForestDetails();
    drawCamp();
    drawMoonpool();
    drawNPCs();
    drawPrey();
    drawFishing();
    drawTCCats();
    drawPlayer();
  }
  drawHUD();
  if (choosingPath) drawPathChoice();
  if (battleWon && battleWonTimer > 300) drawVictory();
  if (dialogue) drawDialogue();
}

function denCatX(den, i) {
  // spread cats evenly across den width
  const spacing = W / (den.cats.length + 1);
  return spacing * (i + 1);
}

function drawDenInterior() {
  const den = DENS.find(d => d.id === currentDen);

  // Background — dark cosy den walls
  ctx.fillStyle = den.bg;
  ctx.fillRect(0, 0, W, H);

  // Woven reed/bramble walls texture
  ctx.fillStyle = den.wallColor;
  ctx.fillRect(0, 0, W, 40);
  ctx.fillRect(0, H - 80, W, 80);
  ctx.fillRect(0, 0, 40, H);
  ctx.fillRect(W - 40, 0, 40, H);

  // Reed stripes on walls
  ctx.strokeStyle = 'rgba(0,0,0,0.2)';
  ctx.lineWidth = 2;
  for (let i = 0; i < W; i += 18) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 40); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(i, H-80); ctx.lineTo(i, H); ctx.stroke();
  }

  // Moss/earth floor
  ctx.fillStyle = '#2a3a18';
  ctx.fillRect(40, H - 80, W - 80, 80);
  // moss patches
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = `rgba(40,${80+i*8},30,0.5)`;
    ctx.beginPath();
    ctx.ellipse(100 + i*80, H - 50, 28, 12, 0, 0, Math.PI*2);
    ctx.fill();
  }

  // Sleeping nests — moss circles
  const nestPositions = [150, 320, 490, 620];
  for (const nx of nestPositions) {
    ctx.fillStyle = '#3a4a20';
    ctx.beginPath(); ctx.ellipse(nx, H - 62, 38, 16, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#4a5a28';
    ctx.beginPath(); ctx.ellipse(nx, H - 64, 28, 12, 0, 0, Math.PI*2); ctx.fill();
    // nest strands
    ctx.strokeStyle = '#5a6a30';
    ctx.lineWidth = 1;
    for (let a = 0; a < Math.PI*2; a += 0.4) {
      ctx.beginPath();
      ctx.moveTo(nx, H-64);
      ctx.lineTo(nx + Math.cos(a)*26, H-64 + Math.sin(a)*10);
      ctx.stroke();
    }
  }

  // Special den features
  if (den.id === 'medicine') {
    // Herb bundles hanging
    const herbs = ['#6a9a40','#8aba50','#4a7a30','#aac060','#7aaa48'];
    for (let i = 0; i < 5; i++) {
      const hx = 120 + i * 130;
      ctx.strokeStyle = '#6a5a30';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(hx, 40); ctx.lineTo(hx, 90); ctx.stroke();
      ctx.fillStyle = herbs[i % herbs.length];
      for (let j = -2; j <= 2; j++) {
        ctx.beginPath();
        ctx.ellipse(hx + j*5, 95 + Math.abs(j)*4, 4, 8, j*0.3, 0, Math.PI*2);
        ctx.fill();
      }
    }
  }

  if (den.id === 'leaders') {
    // Ivy trailing down walls
    ctx.strokeStyle = '#3a6a20';
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      const vx = 80 + i * 180;
      ctx.beginPath(); ctx.moveTo(vx, 40);
      for (let y = 40; y < 160; y += 15) {
        ctx.lineTo(vx + Math.sin(y*0.3)*12, y);
      }
      ctx.stroke();
      ctx.fillStyle = '#4a8a28';
      for (let y = 55; y < 160; y += 20) {
        ctx.beginPath();
        ctx.ellipse(vx + Math.sin(y*0.3)*12, y, 8, 5, Math.sin(y)*0.5, 0, Math.PI*2);
        ctx.fill();
      }
    }
  }

  // Dim light glow from entrance
  const glow = ctx.createRadialGradient(W/2, H-40, 10, W/2, H-40, 120);
  glow.addColorStop(0, 'rgba(180,160,80,0.15)');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Den name
  ctx.fillStyle = '#c8dfa0';
  ctx.font = 'italic bold 18px Georgia';
  ctx.textAlign = 'center';
  ctx.fillText(den.label, W/2, 28);

  // Description
  ctx.fillStyle = 'rgba(220,210,170,0.7)';
  ctx.font = 'italic 12px Georgia';
  ctx.fillText(den.desc, W/2, 58);

  // Den cats
  den.cats.forEach((c, i) => {
    const cx = denCatX(den, i);
    const sz = c.name.endsWith('kit') || c.name.endsWith('paw') ? 14 : 20;
    drawCat(cx, H - 80, 0, c.color, c.leg, sz);
    ctx.fillStyle = '#f0f0cc';
    ctx.font = '11px Georgia';
    ctx.textAlign = 'center';
    ctx.fillText(c.name, cx, H - 80 - sz * 2.8);
    // E hint if nearby
    if (Math.abs(cat.x - cx) < 80) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(cx - 40, H - 80 - sz*2.8 - 18, 80, 14);
      ctx.fillStyle = '#ffe080';
      ctx.font = '10px Georgia';
      ctx.fillText('Press T to talk',cx, H - 80 - sz*2.8 - 7);
    }
  });

  // Player cat
  drawCat(cat.x, H - 80, cat.vx, '#4a4a5a', '#6a6a7a', catSize(), walkFrame);
  ctx.fillStyle = '#aadfc8';
  ctx.font = 'bold 12px Georgia';
  ctx.textAlign = 'center';
  ctx.fillText(catName(), cat.x, H - 80 - catSize() * 2.6);

  // Kits/apprentices/warriors in their correct den
  const kitsHere = kits.filter(k => kitDen(k) === currentDen);
  if (kitsHere.length > 0) {
    kitsHere.forEach((k, i) => {
      const kx = 140 + i * 100;
      const ks = kitSize(k);
      drawCat(kx, H - 80, 0, k.color, k.leg, ks);
      ctx.fillStyle = '#ffd8a8';
      ctx.font = '10px Georgia';
      ctx.textAlign = 'center';
      ctx.fillText(k.name, kx, H - 80 - ks * 2.8);
      // progress pip
      if (k.stage < 2) {
        const maxT = k.stage === 0 ? KIT_GROW_TO_APP : KIT_GROW_TO_WAR;
        const pct = Math.min(k.growTimer / maxT, 1);
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(kx - 20, H - 80 - ks*2.8 - 14, 40, 5);
        ctx.fillStyle = '#aadfc8';
        ctx.fillRect(kx - 20, H - 80 - ks*2.8 - 14, 40 * pct, 5);
      }
      // "P — apprentice" prompt when player is nearby and eligible
      if (k.stage === 0 && stage === 2 && !apprentice && Math.abs(cat.x - kx) < 130) {
        ctx.fillStyle = '#c8e0ff';
        ctx.font = 'bold 11px Georgia';
        ctx.textAlign = 'center';
        ctx.fillText('[P] Make apprentice', kx, H - 80 - ks*2.8 - 20);
      }
    });
  }

  // Kit naming screen
  if (namingKit) {
    ctx.fillStyle = 'rgba(0,0,0,0.78)';
    ctx.fillRect(W/2 - 180, H/2 - 55, 360, 105);
    ctx.strokeStyle = '#ffb0c8';
    ctx.lineWidth = 2;
    ctx.strokeRect(W/2 - 180, H/2 - 55, 360, 105);
    ctx.fillStyle = '#ffb0c8';
    ctx.font = 'bold 14px Georgia';
    ctx.textAlign = 'center';
    ctx.fillText('Name your kit! (type a prefix)', W/2, H/2 - 28);
    ctx.fillStyle = '#fff';
    ctx.font = '20px Georgia';
    ctx.fillText((kitNameInput || '') + 'kit' + (Date.now() % 800 < 400 ? '|' : ' '), W/2, H/2 + 10);
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '11px Georgia';
    ctx.fillText('Press Enter to confirm', W/2, H/2 + 34);
  }

  // Exit hint
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.font = '11px Georgia';
  ctx.textAlign = 'center';
  const mateHint = stage === 2 && currentDen === 'warriors' && !mate ? '   M ask to be mates' : '';
  const kitHint  = stage === 2 && mate && kits.length < 3 && currentDen === 'nursery' ? '   K have a kit' : '';
  const appHint  = stage === 2 && !apprentice && currentDen === 'nursery' && kits.some(k => k.stage === 0) ? '   P pick apprentice' : '';
  const trainHint = stage === 2 && apprentice && currentDen === 'warriors' ? ('   P ' + (apprenticeOut ? 'send back' : 'take on patrol')) : '';
  ctx.fillText('A/D move   T talk   Q leave' + mateHint + kitHint + appHint + trainHint, W/2, H - 10);
}

function drawFishing() {
  // Den entry hints
  for (const den of DENS) {
    if (Math.abs(cat.x - den.x) < 30) {
      const sx = den.x - cameraX;
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(sx - 44, GROUND_Y - 100, 88, 16);
      ctx.fillStyle = '#ffe080';
      ctx.font = '11px Georgia';
      ctx.textAlign = 'center';
      ctx.fillText('Press E to enter den', sx, GROUND_Y - 88);
    }
  }

  // F to fish hint (only in camp area)
  if (!fishing && !dialogue && cat.y >= GROUND_Y && cat.x >= FOREST_END) {
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

function drawForestDetails() {
  const col = skyColors();
  // Darker forest floor
  const forestRight = FOREST_END - cameraX;
  if (forestRight > 0) {
    ctx.fillStyle = isNight() ? '#111a0a' : '#1e3212';
    ctx.fillRect(0, GROUND_Y, Math.min(forestRight, W), H - GROUND_Y);
    ctx.fillStyle = isNight() ? '#1a2a10' : '#2a4018';
    ctx.fillRect(0, GROUND_Y, Math.min(forestRight, W), 6);
  }

  // Dense undergrowth — ferns and bushes
  const bushPositions = [80,200,340,480,620,760,920,1080,1220,1380,1520,1660];
  for (const bx of bushPositions) {
    const sx = bx - cameraX * 0.95;
    if (sx < -60 || sx > W + 20) continue;
    // bush
    ctx.fillStyle = isNight() ? '#1a3010' : '#2a5018';
    ctx.beginPath(); ctx.ellipse(sx, GROUND_Y - 10, 28, 16, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = isNight() ? '#223818' : '#386828';
    ctx.beginPath(); ctx.ellipse(sx - 10, GROUND_Y - 14, 18, 12, -0.2, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(sx + 12, GROUND_Y - 12, 16, 11, 0.2, 0, Math.PI*2); ctx.fill();
    // fern fronds
    ctx.strokeStyle = isNight() ? '#1e3a14' : '#3a6020';
    ctx.lineWidth = 1.5;
    for (let f = -2; f <= 2; f++) {
      ctx.beginPath();
      ctx.moveTo(sx + f*8, GROUND_Y);
      ctx.quadraticCurveTo(sx + f*12, GROUND_Y - 18, sx + f*8 - 8, GROUND_Y - 22);
      ctx.stroke();
    }
  }

  // Forest sign at boundary
  const signX = FOREST_END - cameraX;
  if (signX > 0 && signX < W) {
    ctx.fillStyle = '#5a3a18';
    ctx.fillRect(signX - 2, GROUND_Y - 50, 4, 50);
    ctx.fillStyle = '#8a5a28';
    ctx.fillRect(signX - 22, GROUND_Y - 68, 44, 20);
    ctx.fillStyle = '#e8d5a3';
    ctx.font = '9px Georgia';
    ctx.textAlign = 'center';
    ctx.fillText('← Forest', signX, GROUND_Y - 54);
    ctx.fillText('Camp →',   signX, GROUND_Y - 44);
  }

  // "F to hunt" hint in forest
  if (cat.x < FOREST_END && !pouncing && !dialogue && onGround) {
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.font = '11px Georgia';
    ctx.textAlign = 'center';
    ctx.fillText('Press F to pounce 🐭', cat.x - cameraX, GROUND_Y - 45);
  }

  // Prey count badge
  if (preyCount > 0) {
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(W - 90, 46, 80, 18);
    ctx.fillStyle = '#e8c870';
    ctx.font = '12px Georgia';
    ctx.textAlign = 'right';
    ctx.fillText('🐭 × ' + preyCount, W - 14, 60);
  }
}

function drawPrey() {
  for (const p of forestPrey) {
    if (p.caught) continue;
    const sx = p.x - cameraX;
    if (sx < -20 || sx > W + 20) continue;
    const py = p.y;

    if (p.name === 'bird') {
      // bird
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.ellipse(sx, py - 8, 8, 5, 0, 0, Math.PI*2); ctx.fill();
      // wings
      ctx.fillStyle = '#8a9ab8';
      ctx.beginPath(); ctx.ellipse(sx - 8, py - 10, 7, 3, -0.5, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(sx + 8, py - 10, 7, 3,  0.5, 0, Math.PI*2); ctx.fill();
      // beak
      ctx.fillStyle = '#e8c840';
      ctx.beginPath(); ctx.moveTo(sx + 8, py - 8); ctx.lineTo(sx + 13, py - 7); ctx.lineTo(sx + 8, py - 6); ctx.fill();
    } else {
      // mouse/vole/rabbit — little scurrying critter
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.ellipse(sx, py - p.size * 0.6, p.size, p.size * 0.6, 0, 0, Math.PI*2); ctx.fill();
      // head
      ctx.beginPath(); ctx.ellipse(sx + p.size * 0.8, py - p.size * 0.7, p.size * 0.55, p.size * 0.5, 0, 0, Math.PI*2); ctx.fill();
      // ears
      ctx.beginPath(); ctx.ellipse(sx + p.size * 0.6, py - p.size * 1.2, 2, 4, -0.2, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(sx + p.size * 0.9, py - p.size * 1.3, 2, 4,  0.2, 0, Math.PI*2); ctx.fill();
      // eye
      ctx.fillStyle = '#111';
      ctx.beginPath(); ctx.arc(sx + p.size, py - p.size * 0.8, 1.2, 0, Math.PI*2); ctx.fill();
      // tail
      ctx.strokeStyle = p.color; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(sx - p.size, py - p.size * 0.4); ctx.quadraticCurveTo(sx - p.size * 1.6, py - p.size * 0.8, sx - p.size * 1.4, py - p.size * 1.3); ctx.stroke();
    }

    // scared indicator
    if (p.scared) {
      ctx.fillStyle = 'rgba(255,80,80,0.7)';
      ctx.font = '10px Georgia';
      ctx.textAlign = 'center';
      ctx.fillText('!', sx, py - p.size * 2);
    }
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

function drawMoonpool() {
  const mx = MOONPOOL_X - cameraX;
  if (mx < -80 || mx > W + 80) return;

  // Moonpool — glowing circular pool
  const pulse = 0.7 + Math.sin(moonpoolTimer * 0.04) * 0.3;
  const night = isNight();

  // Pool water
  const grad = ctx.createRadialGradient(mx, GROUND_Y - 4, 4, mx, GROUND_Y - 4, 38);
  grad.addColorStop(0, night ? `rgba(180,220,255,${0.9 * pulse})` : 'rgba(100,160,220,0.6)');
  grad.addColorStop(1, night ? `rgba(60,100,180,${0.5 * pulse})` : 'rgba(40,80,140,0.3)');
  ctx.beginPath();
  ctx.ellipse(mx, GROUND_Y - 4, 38, 14, 0, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  // Starlight sparkles at night
  if (night) {
    for (let i = 0; i < 6; i++) {
      const angle = (moonpoolTimer * 0.02 + i * 1.05) % (Math.PI * 2);
      const sx = mx + Math.cos(angle) * 28;
      const sy = GROUND_Y - 4 + Math.sin(angle) * 10;
      ctx.beginPath();
      ctx.arc(sx, sy, 2 * pulse, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,220,${0.8 * pulse})`;
      ctx.fill();
    }
    // glow ring
    ctx.beginPath();
    ctx.ellipse(mx, GROUND_Y - 4, 42, 16, 0, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(180,220,255,${0.4 * pulse})`;
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  // Label
  ctx.textAlign = 'center';
  ctx.fillStyle = night ? `rgba(200,230,255,${pulse})` : 'rgba(150,180,220,0.7)';
  ctx.font = 'italic 11px Georgia';
  ctx.fillText('Moonpool', mx, GROUND_Y - 22);

  // Prompt when near Moonpool
  if (Math.abs(cat.x - MOONPOOL_X) < 55) {
    ctx.textAlign = 'center';
    if ((readyForNineLives || nineLivesCeremony) && night) {
      ctx.fillStyle = '#ffe080';
      ctx.font = 'bold 12px Georgia';
      const livesLeft = nineLivesCeremony ? 9 - livesReceived : 9;
      ctx.fillText(nineLivesCeremony ? `[T] Receive life ${livesReceived + 1} of 9` : '[T] Receive your nine lives!', mx, GROUND_Y - 36);
      if (nineLivesCeremony) {
        // show received pips
        for (let i = 0; i < 9; i++) {
          ctx.beginPath();
          ctx.arc(mx - 56 + i * 14, GROUND_Y - 50, 4, 0, Math.PI * 2);
          ctx.fillStyle = i < livesReceived ? '#ffe080' : '#333';
          ctx.fill();
          ctx.strokeStyle = '#aaa'; ctx.lineWidth = 1; ctx.stroke();
        }
      }
    } else if ((readyForNineLives || nineLivesCeremony) && !night) {
      ctx.fillStyle = '#ffe080';
      ctx.font = '11px Georgia';
      ctx.fillText('Come back at night for your nine lives!', mx, GROUND_Y - 36);
    } else if (catPath === 'medicine' && stage >= 1 && night && !moonpoolVisited) {
      ctx.fillStyle = '#c8e0ff';
      ctx.font = 'bold 12px Georgia';
      ctx.fillText('[T] Speak with StarClan', mx, GROUND_Y - 36);
    } else if (catPath === 'medicine' && stage >= 1 && !night) {
      ctx.fillStyle = 'rgba(200,200,200,0.6)';
      ctx.font = '11px Georgia';
      ctx.fillText('Return at night to speak with StarClan', mx, GROUND_Y - 36);
    } else if (catPath === 'medicine' && moonpoolVisited) {
      ctx.fillStyle = 'rgba(200,200,200,0.6)';
      ctx.font = '11px Georgia';
      ctx.fillText('StarClan sleeps... come back later', mx, GROUND_Y - 36);
    }
  }
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
      ctx.fillText('Press T to talk', sx, GROUND_Y - npc.size * 2.8 - 8);
    }
  }

  // Apprentice follows player when out on patrol
  if (apprentice && apprenticeOut && !currentDen) {
    const ax = cat.x - cameraX - 45;
    drawCat(ax, GROUND_Y, cat.vx, apprentice.color, apprentice.leg, kitSize(apprentice), walkFrame);
    ctx.fillStyle = '#c8e0ff';
    ctx.font = '11px Georgia';
    ctx.textAlign = 'center';
    ctx.fillText(apprentice.name, ax, GROUND_Y - kitSize(apprentice) * 2.8);
    ctx.fillStyle = '#ffe080';
    ctx.font = '11px Georgia';
    ctx.fillText('★ apprentice', ax, GROUND_Y - kitSize(apprentice) * 2.8 - 14);
  }

  // Mate stands near the nursery with a heart
  if (mate && !currentDen) {
    const mx = NURSERY_X + 160 - cameraX;
    if (mx > -60 && mx < W + 60) {
      drawCat(mx, GROUND_Y, 0, mate.color, mate.leg, 22);
      ctx.fillStyle = '#ff6090';
      ctx.font = '14px Georgia';
      ctx.textAlign = 'center';
      ctx.fillText('💕', mx, GROUND_Y - 68);
      ctx.fillStyle = '#ffb0c8';
      ctx.font = '11px Georgia';
      ctx.fillText(mate.name, mx, GROUND_Y - 54);
    }
  }
}

function drawTCCats() {
  for (const tc of tcCats) {
    if (tc.hp <= 0) continue;
    const sx = tc.x - cameraX;
    if (sx < -60 || sx > W + 60) continue;
    // flash red when hit
    ctx.save();
    if (tc.hitFlash > 0) {
      ctx.globalAlpha = 0.6 + Math.sin(tc.hitFlash * 0.8) * 0.4;
    }
    drawCat(sx, GROUND_Y, tc.vx, tc.hitFlash > 0 ? '#ff4040' : tc.color, tc.leg, 20);
    ctx.restore();
    // name + HP bar
    ctx.fillStyle = '#ff6060';
    ctx.font = 'bold 11px Georgia';
    ctx.textAlign = 'center';
    ctx.fillText(tc.name + ' (ThunderClan)', sx, GROUND_Y - 62);
    const bw = 44, bh = 6;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(sx - bw/2, GROUND_Y - 56, bw, bh);
    ctx.fillStyle = '#ff4040';
    ctx.fillRect(sx - bw/2, GROUND_Y - 56, bw * (tc.hp / tc.maxHp), bh);
    // F prompt when close
    if (Math.abs(cat.x - tc.x) < 55) {
      ctx.fillStyle = '#ffe080';
      ctx.font = 'bold 12px Georgia';
      ctx.fillText('[F] Fight!', sx, GROUND_Y - 70);
    }
  }
}

function drawPathChoice() {
  // dim background
  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#7ec8e3';
  ctx.font = 'bold 20px Georgia';
  ctx.fillText('You are old enough to begin your training!', W/2, H/2 - 130);
  ctx.fillStyle = '#e8d5a3';
  ctx.font = '15px Georgia';
  ctx.fillText('Ripplestar asks: what path will you choose?', W/2, H/2 - 100);

  const opts = [
    { label: 'Warrior', icon: '⚔', desc: 'Hunt, fight, find a mate,\nraise kits & defend RiverClan!', col: '#c8a040' },
    { label: 'Medicine Cat', icon: '🌿', desc: 'Gather herbs, heal your\nclanmates & talk to StarClan!', col: '#70c870' },
  ];

  opts.forEach((opt, i) => {
    const bx = W/2 - 240 + i * 260, by = H/2 - 75, bw = 220, bh = 160;
    const chosen = pathChoice === i;
    ctx.fillStyle = chosen ? (i === 0 ? 'rgba(100,70,0,0.85)' : 'rgba(20,80,20,0.85)') : 'rgba(20,20,20,0.7)';
    ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = chosen ? opt.col : '#555';
    ctx.lineWidth = chosen ? 3 : 1;
    ctx.strokeRect(bx, by, bw, bh);

    ctx.fillStyle = opt.col;
    ctx.font = '36px Georgia';
    ctx.fillText(opt.icon, bx + bw/2, by + 50);
    ctx.fillStyle = chosen ? '#fff' : '#aaa';
    ctx.font = 'bold 16px Georgia';
    ctx.fillText(opt.label, bx + bw/2, by + 78);
    ctx.fillStyle = chosen ? '#ddd' : '#888';
    ctx.font = '12px Georgia';
    opt.desc.split('\n').forEach((line, li) => ctx.fillText(line, bx + bw/2, by + 100 + li * 18));

    if (chosen) {
      ctx.fillStyle = opt.col;
      ctx.font = 'bold 13px Georgia';
      ctx.fillText('▶ CHOSEN ◀', bx + bw/2, by + bh - 12);
    }
  });

  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '12px Georgia';
  ctx.fillText('A / D to choose   Enter to confirm', W/2, H/2 + 110);
}

function drawVictory() {
  ctx.fillStyle = 'rgba(0,40,80,0.7)';
  ctx.fillRect(W/2 - 220, H/2 - 50, 440, 100);
  ctx.strokeStyle = '#7ec8e3';
  ctx.lineWidth = 3;
  ctx.strokeRect(W/2 - 220, H/2 - 50, 440, 100);
  ctx.fillStyle = '#ffe080';
  ctx.font = 'bold 22px Georgia';
  ctx.textAlign = 'center';
  ctx.fillText('⚔ RIVERCLAN VICTORY! ⚔', W/2, H/2);
  ctx.fillStyle = '#aadfc8';
  ctx.font = '14px Georgia';
  ctx.fillText('ThunderClan has been driven from our territory!', W/2, H/2 + 28);
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
  const stageLabel = ['Kit', catPath === 'medicine' ? 'Medicine Apprentice' : 'Apprentice', catPath === 'medicine' ? 'Medicine Cat' : 'Warrior', 'Deputy', 'Leader'][stage] || 'Leader';
  ctx.fillStyle = '#aadfc8';
  ctx.font = '15px Georgia';
  ctx.textAlign = 'left';
  ctx.fillText(catName() + ' — RiverClan  (' + stageLabel + ')', 12, 24);

  // XP bar
  const xpGoals = [XP_TO_APPRENTICE, XP_TO_WARRIOR, XP_TO_DEPUTY, XP_TO_LEADER];
  const xpLabels = ['To Apprentice', 'To Warrior', 'To Deputy', 'To Leader'];
  if (stage < 4) {
    const maxXp = xpGoals[stage];
    const barW = 160, barH = 10;
    const filled = Math.min((xp / maxXp) * barW, barW);
    const label = xpLabels[stage];
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(12, 32, barW, barH);
    if (mentor) {
      ctx.fillStyle = '#ffe0a8';
      ctx.font = '12px Georgia';
      ctx.fillText('🐾 Mentor: ' + mentor.name, 12, 54);
    }
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
    const rankLabel = stage === 4 ? `⭐ Leader of RiverClan — ${leaderLives} lives` : stage === 3 ? '⭐ Deputy of RiverClan' : '⭐ Full Warrior of RiverClan';
    ctx.fillText(rankLabel, 12, 48);
    if (stage === 4) {
      // draw life dots
      for (let i = 0; i < 9; i++) {
        ctx.beginPath();
        ctx.arc(16 + i * 14, 60, 4, 0, Math.PI * 2);
        ctx.fillStyle = i < leaderLives ? '#ffe080' : '#444';
        ctx.fill();
        ctx.strokeStyle = '#aaa';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
    if (mate) {
      ctx.fillStyle = '#ff90b8';
      ctx.font = '12px Georgia';
      ctx.fillText('💕 Mate: ' + mate.name, 12, 65);
    }
    if (kits.length > 0) {
      ctx.fillStyle = '#ffd8a8';
      ctx.font = '12px Georgia';
      ctx.fillText('🐱 ' + kits.map(k => k.name).join('  '), 12, 82);
    }
    if (apprentice) {
      ctx.fillStyle = '#c8e0ff';
      ctx.font = '12px Georgia';
      ctx.fillText('🐾 Apprentice: ' + apprentice.name + (apprenticeOut ? ' (training with you!)' : ''), 12, 99);
    }
  }

  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.font = '11px Georgia';
  ctx.textAlign = 'left';
  const battleHint = (stage === 2 || stage === 3 || stage === 4) && catPath === 'warrior' && !tcBattle ? '   B start battle vs ThunderClan' : '';
  const fightHint  = tcBattle ? '   F fight!' : '';
  const hint = cat.x < FOREST_END
    ? 'A/D move   W jump   F pounce' + fightHint
    : 'A/D move   W jump   E enter den   T talk   F fish' + battleHint + fightHint;
  ctx.fillText(hint, 12, H - 12);

  // Health bar (shown during battle or when injured)
  if (tcBattle || playerHp < PLAYER_MAX_HP) {
    const bx = W - 140, by = 14, bw = 120, bh = 12;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(bx, by, bw, bh);
    const pct = playerHp / PLAYER_MAX_HP;
    ctx.fillStyle = pct > 0.5 ? '#50e050' : pct > 0.25 ? '#e0e050' : '#e05050';
    ctx.fillRect(bx, by, bw * pct, bh);
    ctx.strokeStyle = '#aadfc8';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx, by, bw, bh);
    ctx.fillStyle = '#fff';
    ctx.font = '10px Georgia';
    ctx.textAlign = 'right';
    ctx.fillText('❤ HP ' + playerHp + '/' + PLAYER_MAX_HP, bx - 4, by + 10);
  }
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
