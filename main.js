
// === STATE ===
let selectedDrink = { drink: 'milk-tea', color: '#c9956a', emoji: '🧋' };
let score = 0, lives = 3, level = 1, gameRunning = false;
let highScores = {};
let animId;

// Cup
let cup = { x: 0, y: 0, w: 80, h: 60, speed: 7, targetX: 0 };

// Falling items
let items = [];
let frameCount = 0;
let spawnRate = 80;

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

function selectDrink(btn) {
  document.querySelectorAll('.drink-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  selectedDrink = {
    drink: btn.dataset.drink,
    color: btn.dataset.color,
    emoji: btn.dataset.emoji
  };
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  document.getElementById('hud').style.display = id === 'game-screen' ? 'flex' : 'none';
}

function startGame() {
  score = 0; lives = 3; level = 1;
  items = []; frameCount = 0; spawnRate = 80;
  cup.color = selectedDrink.color;

  resizeCanvas();
  cup.x = canvas.width / 2;
  cup.targetX = cup.x;
  cup.y = canvas.height - cup.h - 10;

  updateHUD();
  showScreen('game-screen');
  gameRunning = true;
  gameLoop();

  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('touchmove', onTouchMove, { passive: false });
}

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

window.addEventListener('resize', () => {
  if (gameRunning) {
    resizeCanvas();
    cup.y = canvas.height - cup.h - 10;
  }
});

function onMouseMove(e) {
  cup.targetX = e.clientX;
}

function onTouchMove(e) {
  e.preventDefault();
  cup.targetX = e.touches[0].clientX;
}

// Item types
const BOBA_TYPES = [
  { type: 'boba', emoji: '⚫', pts: 10, color: '#1a1a1a' },
  { type: 'boba', emoji: '🟤', pts: 10, color: '#5c3317' },
  { type: 'boba', emoji: '⚪', pts: 15, color: '#e8e8e8' },
  { type: 'bonus', emoji: '⭐', pts: 30, color: '#ffd166' },
  { type: 'bonus', emoji: '💎', pts: 50, color: '#a8dadc' },
];

const BOMB_TYPES = [
  { type: 'bomb', emoji: '💣', pts: -20 },
  { type: 'bomb', emoji: '🧨', pts: -20 },
];

function spawnItem() {
  const isBomb = Math.random() < (0.2 + level * 0.02);
  const pool = isBomb ? BOMB_TYPES : BOBA_TYPES;
  const template = pool[Math.floor(Math.random() * pool.length)];
  const size = isBomb ? 36 : 28 + Math.random() * 10;
  const speed = 2 + level * 0.5 + Math.random() * 2;

  items.push({
    ...template,
    x: 40 + Math.random() * (canvas.width - 80),
    y: -size,
    size,
    speed,
    rotation: 0,
    rotSpeed: (Math.random() - 0.5) * 0.1,
    bounce: 0,
  });
}

function gameLoop() {
  if (!gameRunning) return;
  update();
  draw();
  animId = requestAnimationFrame(gameLoop);
}

function update() {
  frameCount++;

  // Level up every 300 frames
  level = 1 + Math.floor(frameCount / 300);
  spawnRate = Math.max(30, 80 - level * 5);

  // Spawn
  if (frameCount % spawnRate === 0) spawnItem();

  // Move cup toward target (smooth)
  cup.x += (cup.targetX - cup.x) * 0.18;
  cup.x = Math.max(cup.w/2, Math.min(canvas.width - cup.w/2, cup.x));

  // Move items
  for (let i = items.length - 1; i >= 0; i--) {
    const item = items[i];
    item.y += item.speed;
    item.rotation += item.rotSpeed;

    // Check catch
    const cx = cup.x;
    const cy = cup.y + 10;
    const cw = cup.w * 0.9;

    if (
      item.y + item.size/2 >= cy &&
      item.y - item.size/2 <= cy + cup.h * 0.4 &&
      item.x >= cx - cw/2 &&
      item.x <= cx + cw/2
    ) {
      if (item.type === 'bomb') {
        lives--;
        spawnParticle(item.x, item.y, '💥');
        if (lives <= 0) { endGame(); return; }
      } else {
        score += item.pts;
        spawnParticle(item.x, item.y, '+' + item.pts);
      }
      items.splice(i, 1);
      updateHUD();
      continue;
    }

    // Off screen
    if (item.y > canvas.height + 50) {
      if (item.type !== 'bomb') {
        // missed boba — lose life
        lives--;
        spawnParticle(item.x, canvas.height - 20, '😢');
        if (lives <= 0) { endGame(); return; }
        updateHUD();
      }
      items.splice(i, 1);
    }
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, '#1a0e2e');
  grad.addColorStop(1, '#0d0820');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw items
  for (const item of items) {
    ctx.save();
    ctx.translate(item.x, item.y);
    ctx.rotate(item.rotation);
    ctx.font = `${item.size}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(item.emoji, 0, 0);
    ctx.restore();
  }

  // Draw cup
  drawCup(cup.x, cup.y, cup.w, cup.h, selectedDrink.color);
}

function drawCup(x, y, w, h, color) {
  // Cup body (trapezoid)
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x - w*0.4, y);
  ctx.lineTo(x + w*0.4, y);
  ctx.lineTo(x + w*0.5, y + h);
  ctx.lineTo(x - w*0.5, y + h);
  ctx.closePath();

  // Gradient fill
  const g = ctx.createLinearGradient(x - w/2, y, x + w/2, y);
  g.addColorStop(0, shadeColor(color, -20));
  g.addColorStop(0.5, color);
  g.addColorStop(1, shadeColor(color, -30));
  ctx.fillStyle = g;
  ctx.fill();

  // Shine
  ctx.beginPath();
  ctx.moveTo(x - w*0.25, y + 5);
  ctx.lineTo(x - w*0.1, y + 5);
  ctx.lineTo(x - w*0.15, y + h*0.6);
  ctx.lineTo(x - w*0.3, y + h*0.6);
  ctx.closePath();
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.fill();

  // Rim
  ctx.beginPath();
  ctx.ellipse(x, y, w*0.4, 8, 0, 0, Math.PI * 2);
  ctx.fillStyle = shadeColor(color, 20);
  ctx.fill();

  // Straw
  ctx.strokeStyle = '#ff6b9d';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x + w*0.15, y + 5);
  ctx.lineTo(x + w*0.25, y - h * 0.8);
  ctx.stroke();

  // Drink emoji label
  ctx.font = '18px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(selectedDrink.emoji, x - w*0.1, y + h*0.5);

  ctx.restore();
}

function shadeColor(color, amount) {
  const num = parseInt(color.replace('#',''), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amount));
  const b = Math.min(255, Math.max(0, (num & 0xff) + amount));
  return `rgb(${r},${g},${b})`;
}

function updateHUD() {
  document.getElementById('score-display').textContent = score;
  document.getElementById('level-display').textContent = level;
  const hearts = '❤️'.repeat(Math.max(0, lives)) + '🖤'.repeat(Math.max(0, 3 - lives));
  document.getElementById('hearts-display').textContent = hearts;
}

function spawnParticle(x, y, text) {
  const el = document.createElement('div');
  el.className = 'particle';
  el.textContent = text;
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  el.style.color = text.startsWith('+') ? '#ffd166' : 'white';
  el.style.fontFamily = "'Bubblegum Sans', cursive";
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 900);
}

function endGame() {
  gameRunning = false;
  cancelAnimationFrame(animId);
  canvas.removeEventListener('mousemove', onMouseMove);
  canvas.removeEventListener('touchmove', onTouchMove);

  const key = selectedDrink.drink;
  const prev = highScores[key] || 0;
  const isHigh = score > prev;
  if (isHigh) highScores[key] = score;

  document.getElementById('go-drink-icon').textContent = selectedDrink.emoji;
  document.getElementById('go-score').textContent = `Score: ${score}`;
  document.getElementById('go-title').textContent = score >= 200 ? '🎉 Amazing!' : score >= 100 ? '✨ Nice Job!' : 'Game Over!';
  document.getElementById('go-msg').textContent = isHigh ? `New high score for ${selectedDrink.drink}! 🏆` : `Best: ${Math.max(score, prev)}`;
  document.getElementById('hs-tag').style.display = isHigh ? 'inline-block' : 'none';

  showScreen('gameover-screen');
}

function retryGame() { startGame(); }
function goMenu() { showScreen('select-screen'); }

window.addEventListener('load', resizeCanvas);
