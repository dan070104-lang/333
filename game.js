const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const W = canvas.width;
const H = canvas.height;
const GROUND_Y = 400;

const hp1El = document.getElementById('hp1');
const hp2El = document.getElementById('hp2');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlayTitle');
const overlayText = document.getElementById('overlayText');
const startBtn = document.getElementById('startBtn');

function loadImage(src) {
  const img = new Image();
  img.ready = false;
  img.onload = () => { img.ready = true; };
  img.src = src;
  return img;
}

const assets = {
  capGuy: loadImage('assets/character-cap.png'),
  noCapGuy: loadImage('assets/character-nocap.png'),
  cross: loadImage('assets/cross.png'),
  landCode: loadImage('assets/land-code.png'),
  church: loadImage('assets/church.png'),
};

const CHAR_W = 110;
const CHAR_H = 170;

const player1 = {
  id: 'cap',
  x: 80,
  w: CHAR_W,
  h: CHAR_H,
  hp: 100,
  maxHp: 100,
  facing: 1,
  cooldown: 0,
  hurtFlash: 0,
  speed: 220,
};

const player2 = {
  id: 'nocap',
  x: W - 80 - CHAR_W,
  w: CHAR_W,
  h: CHAR_H,
  hp: 100,
  maxHp: 100,
  facing: -1,
  cooldown: 0,
  hurtFlash: 0,
  speed: 220,
};

let projectiles = [];
let keys = {};
let state = 'start';
let winner = null;
let lastTime = performance.now();

const THROW_COOLDOWN = 0.6;
const PROJECTILE_SPEED = 420;
const PROJECTILE_DAMAGE = 8;

window.addEventListener('keydown', (e) => {
  if (['Space', 'ArrowLeft', 'ArrowRight', 'Enter', 'KeyA', 'KeyD'].includes(e.code)) {
    e.preventDefault();
  }
  keys[e.code] = true;
});
window.addEventListener('keyup', (e) => { keys[e.code] = false; });

startBtn.addEventListener('click', startGame);

function startGame() {
  player1.hp = player1.maxHp;
  player2.hp = player2.maxHp;
  player1.x = 80;
  player2.x = W - 80 - CHAR_W;
  player1.cooldown = 0;
  player2.cooldown = 0;
  projectiles = [];
  winner = null;
  state = 'playing';
  overlay.classList.add('hidden');
  updateBars();
}

function throwProjectile(from, type) {
  projectiles.push({
    type,
    x: from.facing === 1 ? from.x + from.w : from.x,
    y: from.y ? from.y : GROUND_Y - CHAR_H * 0.55,
    dir: from.facing,
    owner: from.id,
  });
}

function update(dt) {
  if (state !== 'playing') return;

  if (keys['KeyA']) player1.x -= player1.speed * dt;
  if (keys['KeyD']) player1.x += player1.speed * dt;
  if (keys['ArrowLeft']) player2.x -= player2.speed * dt;
  if (keys['ArrowRight']) player2.x += player2.speed * dt;

  player1.x = Math.max(10, Math.min(W - CHAR_W - 10, player1.x));
  player2.x = Math.max(10, Math.min(W - CHAR_W - 10, player2.x));

  player1.facing = player2.x >= player1.x ? 1 : -1;
  player2.facing = player1.x <= player2.x ? -1 : 1;

  player1.cooldown -= dt;
  player2.cooldown -= dt;
  if (player1.hurtFlash > 0) player1.hurtFlash -= dt;
  if (player2.hurtFlash > 0) player2.hurtFlash -= dt;

  if (keys['Space'] && player1.cooldown <= 0) {
    throwProjectile(player1, 'cross');
    player1.cooldown = THROW_COOLDOWN;
  }
  if (keys['Enter'] && player2.cooldown <= 0) {
    throwProjectile(player2, 'landCode');
    player2.cooldown = THROW_COOLDOWN;
  }

  for (const p of projectiles) {
    p.x += p.dir * PROJECTILE_SPEED * dt;
  }

  const target1 = { x: player2.x, y: GROUND_Y - CHAR_H, w: CHAR_W, h: CHAR_H };
  const target2 = { x: player1.x, y: GROUND_Y - CHAR_H, w: CHAR_W, h: CHAR_H };

  projectiles = projectiles.filter((p) => {
    if (p.owner === 'cap' && rectHit(p, target1)) {
      applyDamage(player2);
      return false;
    }
    if (p.owner === 'nocap' && rectHit(p, target2)) {
      applyDamage(player1);
      return false;
    }
    return p.x > -40 && p.x < W + 40;
  });

  if (player1.hp <= 0 || player2.hp <= 0) {
    winner = player1.hp <= 0 ? 'nocap' : 'cap';
    state = 'gameover';
    showEnding(winner);
  }

  updateBars();
}

function rectHit(p, box) {
  return p.x > box.x && p.x < box.x + box.w &&
         p.y > box.y && p.y < box.y + box.h;
}

function applyDamage(player) {
  player.hp = Math.max(0, player.hp - PROJECTILE_DAMAGE);
  player.hurtFlash = 0.25;
}

function updateBars() {
  hp1El.style.width = (player1.hp / player1.maxHp * 100) + '%';
  hp2El.style.width = (player2.hp / player2.maxHp * 100) + '%';
}

function drawBackground() {
  const grad = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
  grad.addColorStop(0, '#87ceeb');
  grad.addColorStop(1, '#c9e8f5');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, GROUND_Y);
  ctx.fillStyle = '#5a8f3c';
  ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
  ctx.strokeStyle = '#4a7a30';
  ctx.lineWidth = 2;
  for (let x = 0; x < W; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, GROUND_Y);
    ctx.lineTo(x - 10, H);
    ctx.stroke();
  }
}

function drawCharacter(player, headImg, hasCap) {
  const x = player.x;
  const y = GROUND_Y - CHAR_H;
  const w = player.w;
  const h = player.h;
  const headR = w * 0.26;
  const cx = x + w / 2;
  const headCy = y + headR + 4;

  ctx.save();
  if (player.hurtFlash > 0) {
    ctx.filter = 'brightness(1.8) saturate(0.3)';
  }

  drawBody(x, y, w, h, headR, hasCap);

  if (headImg.ready) {
    drawHeadImage(headImg, cx, headCy, headR);
  } else {
    drawDefaultHead(cx, headCy, headR, hasCap);
  }

  ctx.restore();
}

function drawBody(x, y, w, h, headR, hasCap) {
  ctx.fillStyle = hasCap ? '#2f5d3a' : '#3a4a6b';
  ctx.fillRect(x + w * 0.25, y + headR * 1.7, w * 0.5, h - headR * 1.7 - h * 0.15);

  ctx.fillStyle = '#8a6b4d';
  ctx.fillRect(x + w * 0.2, y + h - h * 0.15, w * 0.25, h * 0.15);
  ctx.fillRect(x + w * 0.55, y + h - h * 0.15, w * 0.25, h * 0.15);
}

function drawHeadImage(img, cx, headCy, headR) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, headCy, headR, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(img, cx - headR, headCy - headR, headR * 2, headR * 2);
  ctx.restore();

  ctx.beginPath();
  ctx.arc(cx, headCy, headR, 0, Math.PI * 2);
  ctx.strokeStyle = '#00000055';
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawDefaultHead(cx, headCy, headR, hasCap) {
  ctx.fillStyle = '#c9a179';
  ctx.beginPath();
  ctx.arc(cx, headCy, headR, 0, Math.PI * 2);
  ctx.fill();

  if (hasCap) {
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(cx, headCy - headR * 0.3, headR * 1.05, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(cx - headR * 1.15, headCy - headR * 0.35, headR * 2.3, headR * 0.35);
  } else {
    ctx.fillStyle = '#5b3a29';
    ctx.beginPath();
    ctx.arc(cx, headCy - headR * 0.1, headR * 0.95, Math.PI, 0);
    ctx.fill();
  }
}

function drawProjectile(p) {
  const img = p.type === 'cross' ? assets.cross : assets.landCode;
  const size = 44;
  if (img.ready) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(performance.now() / 300 * p.dir);
    ctx.drawImage(img, -size / 2, -size / 2, size, size);
    ctx.restore();
    return;
  }
  ctx.save();
  ctx.translate(p.x, p.y);
  if (p.type === 'cross') {
    ctx.fillStyle = '#d4af37';
    ctx.fillRect(-4, -16, 8, 32);
    ctx.fillRect(-14, -6, 28, 8);
  } else {
    ctx.fillStyle = '#7a5230';
    ctx.fillRect(-16, -12, 32, 24);
    ctx.strokeStyle = '#3d2a17';
    ctx.strokeRect(-16, -12, 32, 24);
    ctx.fillStyle = '#f0e0c0';
    ctx.font = 'bold 10px Georgia';
    ctx.textAlign = 'center';
    ctx.fillText('ЗК', 0, 4);
  }
  ctx.restore();
}

function draw() {
  drawBackground();
  drawCharacter(player1, assets.capGuy, true);
  drawCharacter(player2, assets.noCapGuy, false);
  for (const p of projectiles) drawProjectile(p);
}

function loop(now) {
  const dt = Math.min(0.033, (now - lastTime) / 1000);
  lastTime = now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

function showEnding(who) {
  if (who === 'cap') {
    overlayTitle.textContent = 'Победа Отца Аркадия!';
    overlayText.textContent =
      'Царствие Божие наступило благодаря стараниям Святого отца Аркадия.';
    ctx.save();
    drawChurchEnding();
    ctx.restore();
  } else {
    overlayTitle.textContent = 'Победа Землемера!';
    overlayText.textContent =
      'Восторжествовали неизменные законы земли — и никто не сможет нарушить закон об аренде земли на 49 лет.';
    drawLawEnding();
  }
  startBtn.textContent = 'Сыграть ещё раз';
  overlay.classList.remove('hidden');
}

function drawChurchEnding() {
  if (assets.church.ready) {
    ctx.drawImage(assets.church, 0, 0, W, H);
    return;
  }
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#fceabb');
  grad.addColorStop(1, '#f8b500');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  const cx = W / 2;
  const baseY = GROUND_Y + 20;
  ctx.fillStyle = '#f5f5f0';
  ctx.fillRect(cx - 90, baseY - 220, 180, 220);

  ctx.fillStyle = '#4a6fa5';
  ctx.beginPath();
  ctx.moveTo(cx - 100, baseY - 220);
  ctx.lineTo(cx, baseY - 300);
  ctx.lineTo(cx + 100, baseY - 220);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#d4af37';
  ctx.beginPath();
  ctx.arc(cx, baseY - 320, 26, Math.PI, 0);
  ctx.fill();
  ctx.fillRect(cx - 4, baseY - 370, 8, 40);
  ctx.fillRect(cx - 16, baseY - 358, 32, 8);

  for (const dx of [-140, 140]) {
    ctx.fillStyle = '#f5f5f0';
    ctx.fillRect(cx + dx - 25, baseY - 160, 50, 160);
    ctx.fillStyle = '#4a6fa5';
    ctx.beginPath();
    ctx.arc(cx + dx, baseY - 160, 25, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#d4af37';
    ctx.fillRect(cx + dx - 3, baseY - 200, 6, 24);
    ctx.fillRect(cx + dx - 12, baseY - 192, 24, 6);
  }
}

function drawLawEnding() {
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#3b3b2f');
  grad.addColorStop(1, '#6b5b3a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  const cx = W / 2;
  const cy = H / 2;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.05);
  ctx.fillStyle = '#f0e6cf';
  ctx.fillRect(-160, -200, 320, 260);
  ctx.strokeStyle = '#8a7a52';
  ctx.lineWidth = 3;
  ctx.strokeRect(-160, -200, 320, 260);
  ctx.fillStyle = '#333';
  ctx.font = 'bold 22px Georgia';
  ctx.textAlign = 'center';
  ctx.fillText('ЗЕМЕЛЬНЫЙ', 0, -130);
  ctx.fillText('КОДЕКС', 0, -100);
  ctx.font = '16px Georgia';
  ctx.fillText('ст. 49', 0, -50);
  ctx.fillText('«Аренда земли —', 0, -10);
  ctx.fillText('срок 49 лет»', 0, 14);

  ctx.strokeStyle = '#a02020';
  ctx.beginPath();
  ctx.arc(90, 90, 48, 0, Math.PI * 2);
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.fillStyle = 'rgba(160,32,32,0.85)';
  ctx.font = 'bold 12px Georgia';
  ctx.fillText('ЗАКОН', 90, 85);
  ctx.fillText('НЕЗЫБЛЕМ', 90, 100);
  ctx.restore();
}

requestAnimationFrame(loop);
draw();
