// Referências principais do canvas e HUD
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

const scoreValue = document.getElementById('score-value');
const livesValue = document.getElementById('lives-value');
const characterLabel = document.getElementById('character-name');
const bestScoreValue = document.getElementById('best-score-value');
const gameOverOverlay = document.getElementById('game-over');
const startOverlay = document.getElementById('start-overlay');
const startButton = document.getElementById('start-button');
const restartButton = document.getElementById('restart-button');

// Caminhos para imagens e sons utilizados no jogo
const imagePaths = {
  adrielle: 'assets/adrielle.svg',
  luca: 'assets/luca.svg',
  cat: 'assets/cat.svg',
  dog: 'assets/dog.svg',
  ship: 'assets/ship.svg',
  explosion: 'assets/explosion.svg',
  tree: 'assets/tree.svg',
  house: 'assets/house.svg'
};

const soundPaths = {
  shoot: 'assets/shoot.wav',
  explosion: 'assets/explosion.wav',
  switch: 'assets/switch.wav',
  music: 'assets/music.wav'
};

// Estruturas para armazenamento dos recursos carregados
const images = {};
const sounds = {};
let audioUnlocked = false;

// Estado de teclas pressionadas para controlar o jogador
const keys = {
  left: false,
  right: false,
  up: false,
  shoot: false,
  shift: false
};

// Variáveis de estado globais do jogo
const groundY = canvas.height - 80;
let gameRunning = false;
let lastTime = 0;
let spawnTimer = 0;
let spawnInterval = 2.8;
let difficultyLevel = 0;
let score = 0;
let health = 3;
const maxLives = 3;
const BEST_SCORE_KEY = 'universoAL_bestScore';
let bestScore = 0;

// Coleções dinâmicas de entidades
const projectiles = [];
const enemies = [];
const explosions = [];

// Animais companheiros que devem ser protegidos
const animals = [
  {
    key: 'cat',
    name: 'Nuvem',
    width: 72,
    height: 78,
    offsetX: -120,
    projectileColor: '#ff8de0',
    projectileTrail: 'rgba(255, 141, 224, 0.45)',
    projectileSize: 9,
    projectileSpeed: 540,
    fireCooldown: 1.45,
    cooldownTimer: 0
  },
  {
    key: 'dog',
    name: 'Sol',
    width: 76,
    height: 80,
    offsetX: 120,
    projectileColor: '#ffd480',
    projectileTrail: 'rgba(255, 212, 128, 0.45)',
    projectileSize: 11,
    projectileSpeed: 520,
    fireCooldown: 1.65,
    cooldownTimer: 0
  }
];

// Dados das personagens jogáveis e respectivas vantagens
const characters = {
  adrielle: {
    name: 'Adrielle',
    speed: 240,
    jumpStrength: -560,
    projectileSpeed: 560,
    fireCooldown: 0.35,
    projectileColor: '#8ce0ff',
    projectileSize: 10,
    damageTaken: 0.75,
    spriteKey: 'adrielle'
  },
  luca: {
    name: 'Luca',
    speed: 320,
    jumpStrength: -600,
    projectileSpeed: 660,
    fireCooldown: 0.28,
    projectileColor: '#ffd166',
    projectileSize: 12,
    damageTaken: 1,
    spriteKey: 'luca'
  }
};

let currentCharacterKey = 'adrielle';

// Estado do jogador controlado
const player = {
  x: canvas.width / 2 - 36,
  y: groundY - 120,
  width: 72,
  height: 120,
  vx: 0,
  vy: 0,
  onGround: false,
  fireCooldown: 0
};

// Configuração da lua animada de fundo
const moon = {
  x: canvas.width - 140,
  y: 120,
  radius: 60,
  glow: 0
};

const starField = Array.from({ length: 90 }, () => ({
  x: Math.random() * canvas.width,
  y: Math.random() * (groundY - 140) + 20,
  radius: Math.random() * 1.5 + 0.6,
  twinkle: Math.random() * Math.PI * 2,
  twinkleSpeed: 0.6 + Math.random() * 0.6
}));

const doubleShiftWindow = 350;
let supportAutoFire = false;
let lastShiftTap = 0;

// Carregamento assíncrono de imagens
function loadImages() {
  const promises = Object.entries(imagePaths).map(([key, src]) => new Promise((resolve, reject) => {
    const img = new Image();
    img.src = src;
    img.onload = () => {
      images[key] = img;
      resolve();
    };
    img.onerror = () => reject(new Error('Não foi possível carregar ' + src));
  }));
  return Promise.all(promises);
}

// Inicialização dos objectos de áudio
function loadSounds() {
  Object.entries(soundPaths).forEach(([key, src]) => {
    const audio = new Audio(src);
    if (key === 'music') {
      audio.loop = true;
      audio.volume = 0.35;
    } else if (key === 'shoot') {
      audio.volume = 0.5;
    } else if (key === 'explosion') {
      audio.volume = 0.6;
    } else if (key === 'switch') {
      audio.volume = 0.45;
    }
    sounds[key] = audio;
  });
}

// Executa sons, respeitando o bloqueio inicial dos navegadores
function playSound(name) {
  const sound = sounds[name];
  if (!sound) return;
  if (name === 'music') {
    if (!audioUnlocked) return;
    if (sound.paused) {
      sound.currentTime = 0;
      sound.play().catch(() => {});
    }
    return;
  }
  const cloned = sound.cloneNode();
  cloned.volume = sound.volume;
  cloned.play().catch(() => {});
}

// Desbloqueia áudio na primeira interacção do jogador
function unlockAudio() {
  if (audioUnlocked) return;
  audioUnlocked = true;
  playSound('music');
}

window.addEventListener('keydown', unlockAudio, { once: true });
window.addEventListener('mousedown', unlockAudio, { once: true });

// Posiciona gato e cão junto da personagem
function positionAnimals() {
  animals.forEach(animal => {
    animal.x = player.x + player.width / 2 + animal.offsetX - animal.width / 2;
    animal.y = groundY - animal.height;
    animal.cooldownTimer = animal.fireCooldown * (0.4 + Math.random() * 0.8);
  });
}

// Restaura o estado completo do jogo
function resetGame(startImmediately = true) {
  score = 0;
  health = maxLives;
  spawnInterval = 2.8;
  difficultyLevel = 0;
  spawnTimer = 0;
  lastTime = 0;
  projectiles.length = 0;
  enemies.length = 0;
  explosions.length = 0;
  currentCharacterKey = 'adrielle';
  player.x = canvas.width / 2 - player.width / 2;
  player.y = groundY - player.height;
  player.vx = 0;
  player.vy = 0;
  player.onGround = true;
  player.fireCooldown = 0;
  positionAnimals();
  updateHUD();
  hideGameOver();

  if (!startImmediately) {
    gameRunning = false;
    renderFrame();
    return;
  }

  hideStartOverlay();
  gameRunning = true;
  if (audioUnlocked) {
    playSound('music');
  }
  lastTime = performance.now();
  requestAnimationFrame(loop);
}

function showStartOverlay() {
  startOverlay.classList.remove('hidden');
}

function hideStartOverlay() {
  startOverlay.classList.add('hidden');
}

function hideGameOver() {
  gameOverOverlay.classList.add('hidden');
}

function showGameOver() {
  gameOverOverlay.classList.remove('hidden');
}

// Permite reiniciar a partir do ecrã de Game Over
restartButton.addEventListener('click', () => {
  if (audioUnlocked) {
    sounds.music.currentTime = 0;
    playSound('music');
  }
  playSound('switch');
  resetGame(true);
});

startButton.addEventListener('click', () => {
  unlockAudio();
  playSound('switch');
  resetGame(true);
});

function updateBestScoreDisplay() {
  bestScoreValue.textContent = bestScore.toString().padStart(5, '0');
}

function loadBestScore() {
  try {
    const stored = localStorage.getItem(BEST_SCORE_KEY);
    const parsed = parseInt(stored, 10);
    if (!Number.isNaN(parsed) && parsed >= 0) {
      bestScore = parsed;
    }
  } catch (error) {
    console.warn('Não foi possível ler a melhor pontuação.', error);
  }
  updateBestScoreDisplay();
}

function saveBestScore() {
  try {
    localStorage.setItem(BEST_SCORE_KEY, String(bestScore));
  } catch (error) {
    console.warn('Não foi possível guardar a melhor pontuação.', error);
  }
}

function registerBestScore() {
  if (score > bestScore) {
    bestScore = score;
    updateBestScoreDisplay();
    saveBestScore();
  }
}

// Actualiza elementos informativos no topo da página
function updateHUD() {
  scoreValue.textContent = score.toString().padStart(5, '0');
  updateBestScoreDisplay();
  renderLives();
  const character = characters[currentCharacterKey];
  characterLabel.textContent = character.name;
}

// Desenha corações equivalentes às vidas restantes
function renderLives() {
  livesValue.innerHTML = '';
  const hearts = Math.max(0, Math.ceil(health));
  if (hearts === 0) {
    livesValue.textContent = '0';
    return;
  }
  for (let i = 0; i < hearts; i += 1) {
    const heart = document.createElement('img');
    heart.src = 'assets/heart.svg';
    heart.alt = 'vida';
    heart.width = 20;
    heart.height = 20;
    heart.className = 'heart-icon';
    livesValue.appendChild(heart);
  }
}

// Garante que as teclas controlam o jogador
function handleKeyDown(event) {
  if (['ArrowUp', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
    event.preventDefault();
  }
  switch (event.code) {
    case 'ArrowLeft':
    case 'KeyA':
      keys.left = true;
      break;
    case 'ArrowRight':
    case 'KeyD':
      keys.right = true;
      break;
    case 'ArrowUp':
    case 'KeyW':
      keys.up = true;
      break;
    case 'ShiftLeft':
    case 'ShiftRight':
      if (!keys.shift) {
        const now = performance.now();
        if (now - lastShiftTap < doubleShiftWindow) {
          supportAutoFire = !supportAutoFire;
          lastShiftTap = 0;
          if (supportAutoFire) {
            fireSupportAnimals();
          }
        } else {
          lastShiftTap = now;
          if (!event.repeat) {
            fireSupportAnimals();
          }
        }
      }
      keys.shift = true;
      break;
    case 'Space':
      if ((event.shiftKey || keys.shift) && !event.repeat) {
        fireSupportAnimals();
      }
      keys.shoot = true;
      event.preventDefault();
      break;
    case 'KeyS':
      switchCharacter();
      break;
    default:
      break;
  }
}
function handleKeyUp(event) {
  switch (event.code) {
    case 'ArrowLeft':
    case 'KeyA':
      keys.left = false;
      break;
    case 'ArrowRight':
    case 'KeyD':
      keys.right = false;
      break;
    case 'ArrowUp':
    case 'KeyW':
      keys.up = false;
      break;
    case 'ShiftLeft':
    case 'ShiftRight':
      keys.shift = false;
      break;
    case 'Space':
      keys.shoot = false;
      break;
    default:
      break;
  }
}
window.addEventListener('keydown', handleKeyDown);
window.addEventListener('keyup', handleKeyUp);

// Alterna entre Adrielle e Luca
function switchCharacter() {
  if (!gameRunning) return;
  currentCharacterKey = currentCharacterKey === 'adrielle' ? 'luca' : 'adrielle';
  playSound('switch');
  createSwitchFlash();
  updateHUD();
}

// Efeito visual rápido ao trocar de personagem
function createSwitchFlash() {
  explosions.push({
    x: player.x + player.width / 2,
    y: player.y + player.height / 2,
    radius: 10,
    maxRadius: 100,
    alpha: 0.6,
    color: characters[currentCharacterKey].projectileColor,
    life: 0,
    duration: 0.25
  });
}

// Cria uma nova nave inimiga com comportamento variado
function spawnEnemy() {
  const type = Math.random() < 0.5 ? 'straight' : 'zigzag';
  const baseSpeed = 70 + difficultyLevel * 15;
  const enemy = {
    x: Math.random() * (canvas.width - 80) + 40,
    y: -100,
    width: 70,
    height: 90,
    vy: baseSpeed,
    vx: type === 'zigzag' ? (Math.random() < 0.5 ? -80 : 80) : 0,
    type,
    zigzagTimer: 0,
    health: 2,
    hitFlash: 0
  };
  enemies.push(enemy);
}

// Dispara projéctil de energia a partir da personagem activa
function shootProjectile() {
  const character = characters[currentCharacterKey];
  if (player.fireCooldown > 0) return;
  const projectile = {
    x: player.x + player.width / 2,
    y: player.y + 30,
    radius: character.projectileSize,
    vx: 0,
    vy: -character.projectileSpeed,
    color: character.projectileColor,
    owner: 'player',
    damage: 2
  };
  projectiles.push(projectile);
  player.fireCooldown = character.fireCooldown;
  playSound('shoot');
}

function shootAnimalProjectile(animal) {
  if ((animal.cooldownTimer ?? 0) > 0) {
    return false;
  }
  if (enemies.length === 0) {
    return false;
  }
  const target = enemies.reduce((closest, enemy) => {
    if (!closest) return enemy;
    return enemy.y < closest.y ? enemy : closest;
  }, null);
  const startX = animal.x + animal.width / 2;
  const startY = animal.y + animal.height / 2 - 6;
  let vx = 0;
  let vy = -animal.projectileSpeed;
  if (target) {
    const targetCenterX = target.x + target.width / 2;
    const targetCenterY = target.y + target.height / 2;
    const dx = targetCenterX - startX;
    const dy = targetCenterY - startY;
    const len = Math.hypot(dx, dy) || 1;
    const speed = animal.projectileSpeed;
    vx = (dx / len) * speed;
    vy = (dy / len) * speed;
  }

  projectiles.push({
    x: startX,
    y: startY,
    radius: animal.projectileSize,
    vx,
    vy,
    color: animal.projectileColor,
    trail: animal.projectileTrail,
    owner: animal.key,
    damage: 1
  });
  animal.cooldownTimer = animal.fireCooldown * (0.8 + Math.random() * 0.4);
  playSound('shoot');
  return true;
}

function fireSupportAnimals() {
  let fired = false;
  animals.forEach(animal => {
    if (shootAnimalProjectile(animal)) {
      fired = true;
    }
  });
  return fired;
}

// Simula gravidade, movimento e disparo do jogador
function updatePlayer(delta) {
  const character = characters[currentCharacterKey];
  const acceleration = character.speed * 3;
  const maxSpeed = character.speed;

  if (keys.left && !keys.right) {
    player.vx = Math.max(player.vx - acceleration * delta, -maxSpeed);
  } else if (keys.right && !keys.left) {
    player.vx = Math.min(player.vx + acceleration * delta, maxSpeed);
  } else {
    player.vx *= 0.82;
    if (Math.abs(player.vx) < 10) player.vx = 0;
  }

  player.x += player.vx * delta;
  player.x = Math.max(20, Math.min(canvas.width - player.width - 20, player.x));

  if (keys.up && player.onGround) {
    player.vy = character.jumpStrength;
    player.onGround = false;
  }

  player.vy += 1400 * delta;
  player.y += player.vy * delta;

  if (player.y + player.height >= groundY) {
    player.y = groundY - player.height;
    player.vy = 0;
    player.onGround = true;
  }

  if (keys.shoot) shootProjectile();

  if (player.fireCooldown > 0) {
    player.fireCooldown = Math.max(0, player.fireCooldown - delta);
  }
}

// Mantém os animais a acompanhar a posição do jogador
function updateAnimals(delta) {
  const smoothing = Math.min(1, delta * 6);
  animals.forEach(animal => {
    const targetX = player.x + player.width / 2 + animal.offsetX - animal.width / 2;
    if (typeof animal.x === 'undefined') {
      animal.x = targetX;
    } else {
      animal.x += (targetX - animal.x) * smoothing;
    }
    animal.y = groundY - animal.height;
    animal.cooldownTimer = Math.max(0, (animal.cooldownTimer ?? 0) - delta);
    if (supportAutoFire && enemies.length > 0 && (animal.cooldownTimer ?? 0) <= 0) {
      shootAnimalProjectile(animal);
    }
  });
}

// Move projécteis e remove os que saem do ecrã
function updateProjectiles(delta) {
  for (let i = projectiles.length - 1; i >= 0; i -= 1) {
    const projectile = projectiles[i];
    const vx = typeof projectile.vx === 'number' ? projectile.vx : 0;
    projectile.x = (projectile.x ?? 0) + vx * delta;
    projectile.y += projectile.vy * delta;

    const outOfBounds =
      projectile.y + projectile.radius < -40 ||
      projectile.y - projectile.radius > canvas.height + 40 ||
      projectile.x + projectile.radius < -40 ||
      projectile.x - projectile.radius > canvas.width + 40;
    if (outOfBounds) {
      projectiles.splice(i, 1);
    }
  }
}

// Atualiza posição e padrões das naves inimigas
function updateEnemies(delta) {
  for (let i = enemies.length - 1; i >= 0; i -= 1) {
    const enemy = enemies[i];
    if (enemy.type === 'zigzag') {
      enemy.zigzagTimer += delta * 3;
      enemy.vx = Math.sin(enemy.zigzagTimer) * 140;
    }
    enemy.x += enemy.vx * delta;
    enemy.y += enemy.vy * delta;
    enemy.hitFlash = Math.max(0, (enemy.hitFlash || 0) - delta);

    if (enemy.x < 10 || enemy.x + enemy.width > canvas.width - 10) {
      enemy.vx *= -1;
    }

    if (enemy.y > canvas.height + 120) {
      enemies.splice(i, 1);
    }
  }
}

// Armazena partículas de explosão para efeitos visuais
function createExplosion(x, y) {
  explosions.push({
    x,
    y,
    radius: 0,
    maxRadius: 120,
    alpha: 0.8,
    color: '#ffdd66',
    life: 0,
    duration: 0.45
  });
}

function createHitSpark(x, y, color) {
  explosions.push({
    x,
    y,
    radius: 0,
    maxRadius: 60,
    alpha: 0.6,
    color,
    life: 0,
    duration: 0.25
  });
}

function updateExplosions(delta) {
  for (let i = explosions.length - 1; i >= 0; i -= 1) {
    const explosion = explosions[i];
    explosion.life += delta;
    const progress = explosion.life / explosion.duration;
    explosion.radius = explosion.maxRadius * progress;
    explosion.alpha = Math.max(0, 0.8 - progress);
    if (explosion.life >= explosion.duration) {
      explosions.splice(i, 1);
    }
  }
}

// Funções utilitárias de colisão
function rectsIntersect(a, b) {
  return a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y;
}

function circleRectCollision(circle, rect) {
  const closestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.width));
  const closestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.height));
  const dx = circle.x - closestX;
  const dy = circle.y - closestY;
  return dx * dx + dy * dy < circle.radius * circle.radius;
}

// Aplica dano e avalia condição de Game Over
function applyDamage(amount) {
  health = Math.max(0, health - amount);
  updateHUD();
  if (health <= 0) {
    gameRunning = false;
    showGameOver();
  }
}

// Trata colisões entre projécteis, jogador, animais e inimigos
function checkCollisions() {
  for (let i = projectiles.length - 1; i >= 0; i -= 1) {
    const projectile = projectiles[i];
    let removedProjectile = false;
    for (let j = enemies.length - 1; j >= 0; j -= 1) {
      const enemy = enemies[j];
      if (circleRectCollision({ x: projectile.x, y: projectile.y, radius: projectile.radius }, enemy)) {
        projectiles.splice(i, 1);
        removedProjectile = true;
        const damage = projectile.damage ?? 1;
        enemy.health = (enemy.health ?? 2) - damage;
        enemy.hitFlash = 0.35;
        if (enemy.health <= 0) {
          enemies.splice(j, 1);
          score += 100;
          registerBestScore();
          createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
          playSound('explosion');
          updateHUD();
        } else {
          createHitSpark(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, projectile.color || '#ffffff');
        }
        break;
      }
    }
    if (removedProjectile) {
      continue;
    }
  }

  const character = characters[currentCharacterKey];
  const playerHitbox = { x: player.x, y: player.y, width: player.width, height: player.height };

  for (let i = enemies.length - 1; i >= 0; i -= 1) {
    const enemy = enemies[i];

    if (rectsIntersect(playerHitbox, enemy)) {
      enemies.splice(i, 1);
      applyDamage(character.damageTaken);
      createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
      playSound('explosion');
      continue;
    }

    let hitAnimal = false;
    for (const animal of animals) {
      const animalHitbox = {
        x: animal.x,
        y: animal.y,
        width: animal.width,
        height: animal.height
      };
      if (rectsIntersect(animalHitbox, enemy)) {
        hitAnimal = true;
        break;
      }
    }
    if (hitAnimal) {
      enemies.splice(i, 1);
      applyDamage(character.damageTaken);
      createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
      playSound('explosion');
    }
  }
}

// Ajusta dificuldade e temporização das ondas
function updateDifficulty(delta) {
  spawnTimer -= delta;
  if (spawnTimer <= 0) {
    spawnEnemy();
    spawnInterval = Math.max(1.2, spawnInterval - 0.05 - difficultyLevel * 0.005);
    spawnTimer = spawnInterval;
  }
  difficultyLevel = Math.min(8, difficultyLevel + delta * 0.02);
}

// Composição do cenário nocturno
function drawBackground() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, 'rgba(12, 18, 40, 0.95)');
  gradient.addColorStop(1, 'rgba(4, 6, 16, 0.96)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  starField.forEach(star => {
    star.twinkle += star.twinkleSpeed * 0.02;
    const alpha = 0.45 + Math.sin(star.twinkle) * 0.35;
    ctx.globalAlpha = Math.max(0.25, Math.min(0.95, alpha));
    ctx.fillStyle = '#fdfdff';
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();

  ctx.save();
  ctx.fillStyle = 'rgba(32, 42, 74, 0.9)';
  ctx.beginPath();
  ctx.moveTo(0, groundY - 18);
  ctx.lineTo(canvas.width * 0.18, groundY - 130);
  ctx.lineTo(canvas.width * 0.38, groundY - 40);
  ctx.lineTo(canvas.width * 0.55, groundY - 150);
  ctx.lineTo(canvas.width * 0.78, groundY - 60);
  ctx.lineTo(canvas.width, groundY - 12);
  ctx.lineTo(canvas.width, groundY + 80);
  ctx.lineTo(0, groundY + 80);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 0.8;
  ctx.fillStyle = 'rgba(18, 26, 48, 0.85)';
  ctx.beginPath();
  ctx.moveTo(-canvas.width * 0.05, groundY - 6);
  ctx.lineTo(canvas.width * 0.24, groundY - 90);
  ctx.lineTo(canvas.width * 0.48, groundY - 20);
  ctx.lineTo(canvas.width * 0.68, groundY - 110);
  ctx.lineTo(canvas.width * 0.96, groundY - 20);
  ctx.lineTo(canvas.width * 1.05, groundY + 60);
  ctx.lineTo(-canvas.width * 0.05, groundY + 60);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  moon.glow = (moon.glow + 0.02) % (Math.PI * 2);
  const glow = 0.6 + Math.sin(moon.glow) * 0.2;
  const haloGradient = ctx.createRadialGradient(moon.x, moon.y, 0, moon.x, moon.y, moon.radius + 44);
  haloGradient.addColorStop(0, `rgba(245, 245, 255, ${0.6 + glow * 0.25})`);
  haloGradient.addColorStop(1, 'rgba(245, 245, 255, 0)');
  ctx.fillStyle = haloGradient;
  ctx.beginPath();
  ctx.arc(moon.x, moon.y, moon.radius + 42, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.shadowColor = 'rgba(255, 255, 255, 0.6)';
  ctx.shadowBlur = 24;
  ctx.beginPath();
  ctx.arc(moon.x, moon.y, moon.radius, 0, Math.PI * 2);
  ctx.fillStyle = '#f7f8ff';
  ctx.fill();
  ctx.restore();

  ctx.beginPath();
  ctx.arc(moon.x - moon.radius * 0.3, moon.y - moon.radius * 0.3, moon.radius * 0.3, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.fill();

  const groundGradient = ctx.createLinearGradient(0, groundY, 0, canvas.height);
  groundGradient.addColorStop(0, '#141e3a');
  groundGradient.addColorStop(1, '#070a16');
  ctx.fillStyle = groundGradient;
  ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);

  ctx.save();
  ctx.globalAlpha = 0.95;
  const treeImage = images.tree;
  if (treeImage) {
    const treeWidth = canvas.width * 0.18;
    const treeHeight = treeWidth * 1.35;
    ctx.drawImage(treeImage, canvas.width * 0.08, groundY - treeHeight + 10, treeWidth, treeHeight);
  }
  const houseImage = images.house;
  if (houseImage) {
    const houseWidth = canvas.width * 0.24;
    const houseHeight = houseWidth * 0.82;
    ctx.drawImage(houseImage, canvas.width - houseWidth - canvas.width * 0.1, groundY - houseHeight + 6, houseWidth, houseHeight);
  }
  ctx.restore();

  ctx.save();
  const mistGradient = ctx.createLinearGradient(0, groundY - 50, 0, groundY + 80);
  mistGradient.addColorStop(0, 'rgba(160, 200, 255, 0.12)');
  mistGradient.addColorStop(1, 'rgba(10, 16, 32, 0.45)');
  ctx.fillStyle = mistGradient;
  ctx.fillRect(0, groundY - 50, canvas.width, 130);
  ctx.restore();
}


// Renderização de entidades activas
function drawPlayer() {
  const sprite = images[characters[currentCharacterKey].spriteKey];
  if (sprite) {
    ctx.drawImage(sprite, player.x, player.y, player.width, player.height);
  } else {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(player.x, player.y, player.width, player.height);
  }
}

function drawAnimals() {
  animals.forEach(animal => {
    const sprite = images[animal.key];
    if (sprite) {
      ctx.drawImage(sprite, animal.x, animal.y, animal.width, animal.height);
    }
  });
}

function drawProjectiles() {
  for (const projectile of projectiles) {
    const vx = typeof projectile.vx === 'number' ? projectile.vx : 0;
    const vy = projectile.vy;
    if (projectile.trail) {
      ctx.save();
      ctx.strokeStyle = projectile.trail;
      ctx.lineWidth = Math.max(2, projectile.radius * 0.8);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(projectile.x, projectile.y);
      ctx.lineTo(projectile.x - vx * 0.05, projectile.y - vy * 0.05);
      ctx.stroke();
      ctx.restore();
    }

    ctx.beginPath();
    const gradient = ctx.createRadialGradient(projectile.x, projectile.y, 2, projectile.x, projectile.y, projectile.radius);
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(1, projectile.color);
    ctx.fillStyle = gradient;
    ctx.globalCompositeOperation = 'screen';
    ctx.arc(projectile.x, projectile.y, projectile.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  }
}

function drawEnemies() {
  enemies.forEach(enemy => {
    const sprite = images.ship;
    if (sprite) {
      ctx.drawImage(sprite, enemy.x, enemy.y, enemy.width, enemy.height);
    } else {
      ctx.fillStyle = '#8ce0ff';
      ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
    }
    if ((enemy.hitFlash || 0) > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(0.7, enemy.hitFlash * 2.4);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
      ctx.restore();
    }
  });
}

function drawExplosions() {
  explosions.forEach(explosion => {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = explosion.alpha;
    ctx.fillStyle = explosion.color;
    ctx.beginPath();
    ctx.arc(explosion.x, explosion.y, explosion.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (images.explosion) {
      const scale = Math.max(0.4, explosion.radius / 120);
      const size = 120 * scale;
      ctx.save();
      ctx.globalAlpha = Math.max(0, explosion.alpha - 0.2);
      ctx.translate(explosion.x - size / 2, explosion.y - size / 2);
      ctx.drawImage(images.explosion, 0, 0, size, size);
      ctx.restore();
    }
  });
}

function drawCharacterLabel() {
  const labelText = characters[currentCharacterKey].name;
  const labelX = player.x + player.width / 2;
  let labelY = player.y - 28;

  ctx.save();
  ctx.font = '18px "Trebuchet MS", "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const metrics = ctx.measureText(labelText);
  const boxWidth = metrics.width + 28;
  const boxHeight = 36;
  labelY = Math.max(24 + boxHeight / 2, labelY);
  const boxX = labelX - boxWidth / 2;
  const boxY = labelY - boxHeight / 2;

  ctx.fillStyle = 'rgba(8, 12, 30, 0.7)';
  ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
  ctx.strokeStyle = 'rgba(120, 160, 255, 0.6)';
  ctx.lineWidth = 2;
  ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);

  ctx.fillStyle = '#f3f6ff';
  ctx.fillText(labelText, labelX, labelY + 2);
  ctx.restore();
}

function renderFrame() {
  drawBackground();
  drawAnimals();
  drawPlayer();
  drawEnemies();
  drawProjectiles();
  drawExplosions();
  drawCharacterLabel();
}

// Ciclo principal do jogo
function loop(timestamp) {
  if (!gameRunning) return;
  const delta = (timestamp - lastTime) / 1000 || 0;
  lastTime = timestamp;

  updateDifficulty(delta);
  updatePlayer(delta);
  updateAnimals(delta);
  updateProjectiles(delta);
  updateEnemies(delta);
  updateExplosions(delta);
  checkCollisions();

  renderFrame();

  requestAnimationFrame(loop);
}

// Inicia o jogo após o carregamento dos recursos
loadImages()
  .then(() => {
    loadSounds();
    updateHUD();
    resetGame(false);
    showStartOverlay();
  })
  .catch(error => {
    console.error(error);
    alert('Falha ao carregar recursos do Universo AL.');
  });

// Pausa inputs quando a janela perde foco
window.addEventListener('blur', () => {
  keys.left = keys.right = keys.up = keys.shoot = false;
  keys.shift = false;
});

// Retoma a música ao voltar para o separador
window.addEventListener('visibilitychange', () => {
  if (document.hidden && sounds.music && !sounds.music.paused) {
    sounds.music.pause();
  } else if (!document.hidden && audioUnlocked) {
    playSound('music');
  }
});




























