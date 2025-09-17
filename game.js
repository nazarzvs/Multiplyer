// game.js — версия с 5 жизнями и кнопкой музыки
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const answerInput = document.getElementById("answerInput");
const restartBtn = document.getElementById("restartBtn");

// создаём кнопку музыки в статистике
const statsDiv = document.getElementById("stats");
const musicBtn = document.createElement("button");
musicBtn.textContent = "🎵 Музыка: Вкл";
musicBtn.style.marginLeft = "15px";
musicBtn.style.padding = "5px 10px";
musicBtn.style.fontSize = "16px";
statsDiv.appendChild(musicBtn);

const timeEl = document.getElementById("time");
const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
const livesEl = document.getElementById("lives");
const heartContainer = document.getElementById("heartContainer");

const explosionSound = document.getElementById("explosionSound");
const errorSound = document.getElementById("errorSound");
const bgMusic = document.getElementById("bgMusic");

// === параметры ===
const VIRTUAL_WIDTH = 600;
const VIRTUAL_HEIGHT = 800;
const groundHeight = 50;
let tasks = [];
let explosions = [];
let debrisParticles = [];
let score = 0;
let lives = 5;   // теперь 5 жизней
let time = 0;
let baseSpeed = 1.0;
let rafId;
let lastTimestamp = 0;
let isPaused = false;
let timeAccumulator = 0; // seconds accumulator for integer time and speed ramp
let isGameOver = false;
let bestScore = parseInt(localStorage.getItem("bestScore")) || 0;

// контроль спавна
// Перевели в частоту в секундах (ранее 0.012 за кадр при 30мс → ~0.4/сек)
const spawnRatePerSecond = 0.4;
let spawnAccumulator = 0;
const maxActive = 6;

let currentMultiplier = 2;
let pool = shuffle([...Array(8).keys()].map(i => [currentMultiplier, i + 2]));

// город
let cityBuildings = [];

function shuffle(array) {
  return array.sort(() => Math.random() - 0.5);
}

/* ======= Particle ======= */
class Particle {
  constructor(x, y, color, speedX = (Math.random() - 0.5) * 0.8, speedY = -(Math.random() * 1 + 0.6)) {
    this.x = x;
    this.y = y;
    this.radius = Math.random() * 3 + 1;
    this.alpha = 1;
    this.color = color;
    this.speedY = speedY;
    this.speedX = speedX;
  }
  draw() {
    ctx.beginPath();
    ctx.fillStyle = `rgba(${this.color}, ${this.alpha})`;
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  update(dt, frameScale) {
    // frameScale ≈ 33.333, чтобы сохранить ту же скорость, что и при 30мс таймере
    this.x += this.speedX * frameScale * dt;
    this.y += this.speedY * frameScale * dt;
    this.alpha -= 0.04 * frameScale * dt;
    this.draw();
  }
}

/* ======= Task ======= */
class Task {
  constructor(x, y, a, b) {
    this.x = x;
    this.y = y;
    this.a = a;
    this.b = b;
    this.answer = a * b;
    this.speed = baseSpeed + Math.random() * 0.8;
    this.radius = 30 + Math.random() * 12;
    this.particles = [];
    this.shape = [];
    const points = 10 + Math.floor(Math.random() * 6);
    for (let i = 0; i < points; i++) {
      let angle = (i / points) * Math.PI * 2;
      let r = this.radius + (Math.random() * 8 - 4);
      this.shape.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r });
    }
  }
  draw() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.update(currentDeltaTime, FRAME_SCALE);
      if (p.alpha <= 0) this.particles.splice(i, 1);
    }
    ctx.beginPath();
    ctx.moveTo(this.x + this.shape[0].x, this.y + this.shape[0].y);
    for (let i = 1; i < this.shape.length; i++) {
      ctx.lineTo(this.x + this.shape[i].x, this.y + this.shape[i].y);
    }
    ctx.closePath();
    const gradient = ctx.createRadialGradient(this.x, this.y, 5, this.x, this.y, this.radius);
    gradient.addColorStop(0, "#ffaa66");
    gradient.addColorStop(1, "#552200");
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.fillStyle = "white";
    ctx.font = "20px Arial";
    ctx.textAlign = "center";
    ctx.fillText(`${this.a}×${this.b}`, this.x, this.y + 6);
  }
  update(dt, frameScale) {
    this.y += this.speed * frameScale * dt;
    if (Math.random() < 0.45) {
      this.particles.push(new Particle(
        this.x + (Math.random() - 0.5) * 6,
        this.y - this.radius * 0.6,
        "255,120,0",
        (Math.random() - 0.5) * 0.6,
        -(Math.random() * 1 + 0.6)
      ));
      this.particles.push(new Particle(
        this.x + (Math.random() - 0.5) * 6,
        this.y - this.radius * 0.4,
        "255,200,50",
        (Math.random() - 0.5) * 0.6,
        -(Math.random() * 0.6 + 0.3)
      ));
    }
    this.draw();
  }
}

/* ======= Explosion ======= */
class Explosion {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 8;
    this.alpha = 1;
  }
  draw() {
    ctx.beginPath();
    const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius);
    gradient.addColorStop(0, `rgba(255, 200, 0, ${this.alpha})`);
    gradient.addColorStop(1, `rgba(255, 0, 0, 0)`);
    ctx.fillStyle = gradient;
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  update() {
    // Используем глобальные dt/scale, чтобы сохранить прежнюю динамику
    this.radius += 2 * FRAME_SCALE * currentDeltaTime;
    this.alpha -= 0.05 * FRAME_SCALE * currentDeltaTime;
    this.draw();
  }
}

/* ======= Город ======= */
function initCity() {
  cityBuildings = [];
  const num = 10;
  const slot = VIRTUAL_WIDTH / num;
  for (let i = 0; i < num; i++) {
    let w = 40 + Math.random() * 40;
    let h = 30 + Math.random() * 90;
    let x = i * slot + (slot - w) / 2;
    cityBuildings.push({ x, w, h, maxH: h, color: "#555" });
  }
}
function drawCity() {
  const groundY = VIRTUAL_HEIGHT - groundHeight;
  ctx.fillStyle = "#2b2b2b";
  ctx.fillRect(0, groundY, VIRTUAL_WIDTH, groundHeight);
  for (let b of cityBuildings) {
    if (b.h > 2) {
      let bx = b.x;
      let by = groundY - b.h;
      ctx.fillStyle = b.color;
      ctx.fillRect(bx, by, b.w, b.h);
      ctx.fillStyle = "#ffd";
      for (let wx = bx + 6; wx < bx + b.w - 6; wx += 12) {
        for (let wy = by + 6; wy < by + b.h - 6; wy += 14) {
          if (Math.random() < 0.45) ctx.fillRect(wx, wy, 6, 8);
        }
      }
    } else {
      const cx = b.x + b.w / 2;
      const cy = VIRTUAL_HEIGHT - groundHeight + 6;
      ctx.fillStyle = "#3a3a3a";
      ctx.beginPath();
      ctx.ellipse(cx, cy, b.w / 3, 6, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/* ======= Спавн ======= */
function spawnTask() {
  if (pool.length === 0) {
    currentMultiplier++;
    if (currentMultiplier > 9) {
      let a = Math.floor(Math.random() * 8) + 2;
      let b = Math.floor(Math.random() * 8) + 2;
      pool.push([a, b]);
    } else {
      pool = shuffle([...Array(8).keys()].map(i => [currentMultiplier, i + 2]));
    }
  }
  const [a, b] = pool.pop();
  let x = Math.random() * (VIRTUAL_WIDTH - 80) + 40;
  tasks.push(new Task(x, -50, a, b));
}

/* ======= Статистика ======= */
function updateStats() {
  scoreEl.textContent = score;
  bestEl.textContent = bestScore;
  livesEl.textContent = lives;
  heartContainer.textContent = "❤️".repeat(lives);
  timeEl.textContent = time;
}

/* ======= Попадание в город ======= */
function handleCityHit(taskIndex) {
  const task = tasks[taskIndex];
  const groundY = VIRTUAL_HEIGHT - groundHeight;
  tasks.splice(taskIndex, 1);
  lives--;
  errorSound.play();
  updateStats();
  const hitX = task.x;
  let hitBuilding = null;
  for (let b of cityBuildings) {
    if (hitX >= b.x && hitX <= b.x + b.w) {
      hitBuilding = b;
      break;
    }
  }
  if (hitBuilding) {
    const damage = Math.floor(20 + Math.random() * 40);
    hitBuilding.h -= damage;
    if (hitBuilding.h < 0) hitBuilding.h = 0;
    explosions.push(new Explosion(hitBuilding.x + hitBuilding.w / 2, groundY - 10));
  }
  if (lives <= 0) gameOver();
}

/* ======= Game Over ======= */
function gameOver() {
  isGameOver = true;
  cancelAnimationFrame(rafId);
  bgMusic.pause();
  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem("bestScore", bestScore);
  }
  ctx.fillStyle = "rgba(0,0,0,0.7)";
  ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
  ctx.fillStyle = "red";
  ctx.font = "48px Arial";
  ctx.textAlign = "center";
  ctx.fillText("Игра окончена!", VIRTUAL_WIDTH / 2, VIRTUAL_HEIGHT / 2 - 60);
  ctx.fillStyle = "white";
  ctx.font = "28px Arial";
  ctx.fillText(`Очки: ${score}`, VIRTUAL_WIDTH / 2, VIRTUAL_HEIGHT / 2);
  ctx.fillText(`Время: ${time} сек`, VIRTUAL_WIDTH / 2, VIRTUAL_HEIGHT / 2 + 40);
  ctx.fillText(`Рекорд: ${bestScore}`, VIRTUAL_WIDTH / 2, VIRTUAL_HEIGHT / 2 + 80);
  restartBtn.style.display = "block";
}

/* ======= Reset ======= */
function resetGame() {
  tasks = [];
  explosions = [];
  debrisParticles = [];
  score = 0;
  lives = 5;
  time = 0;
  baseSpeed = 1.0;
  isGameOver = false;
  currentMultiplier = 2;
  pool = shuffle([...Array(8).keys()].map(i => [currentMultiplier, i + 2]));
  initCity();
  ctx.clearRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
  updateStats();
  restartBtn.style.display = "none";
  answerInput.value = "";
  startGame();
}

/* ======= Game Loop ======= */
// ======= Адаптивный канвас (DPR + масштаб под окно) =======
let canvasScale = 1;
let dpr = Math.max(1, window.devicePixelRatio || 1);
function resizeCanvas() {
  dpr = Math.max(1, window.devicePixelRatio || 1);
  // Не меняем виртуальные размеры, но увеличиваем реальное число пикселей под DPR
  canvas.width = VIRTUAL_WIDTH * dpr;
  canvas.height = VIRTUAL_HEIGHT * dpr;
  // Масштаб под высоту окна, не больше 1 (без апскейла)
  const maxScaleByHeight = (window.innerHeight - 20) / VIRTUAL_HEIGHT;
  canvasScale = Math.min(Math.max(0.5, maxScaleByHeight), 1);
  canvas.style.width = (VIRTUAL_WIDTH * canvasScale) + "px";
  canvas.style.height = (VIRTUAL_HEIGHT * canvasScale) + "px";
}
window.addEventListener("resize", resizeCanvas);

// Глобальные переменные для dt/масштаба кадра
const FRAME_SCALE = 1000 / 30; // ~33.333 для соответствия прежнему шагу 30мс
let currentDeltaTime = 0; // в секундах

function renderFrame() {
  // Настраиваем трансформацию: сначала DPR, затем визуальный масштаб
  ctx.setTransform(dpr * canvasScale, 0, 0, dpr * canvasScale, 0, 0);
  ctx.clearRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
  drawCity();

  for (let i = tasks.length - 1; i >= 0; i--) {
    const t = tasks[i];
    t.update(currentDeltaTime, FRAME_SCALE);
    if (t.y + t.radius >= VIRTUAL_HEIGHT - groundHeight) handleCityHit(i);
  }
  for (let i = explosions.length - 1; i >= 0; i--) {
    const e = explosions[i];
    e.update();
    if (e.alpha <= 0) explosions.splice(i, 1);
  }
  for (let i = debrisParticles.length - 1; i >= 0; i--) {
    const p = debrisParticles[i];
    p.update(currentDeltaTime, FRAME_SCALE);
    if (p.alpha <= 0) debrisParticles.splice(i, 1);
  }

  // Пауза — затемняем и выводим текст
  if (isPaused && !isGameOver) {
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
    ctx.fillStyle = "#fff";
    ctx.font = "36px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Пауза", VIRTUAL_WIDTH / 2, VIRTUAL_HEIGHT / 2);
  }
}

function update(dt) {
  // Если пауза или игра окончена — не двигаем время и не спавним
  if (isPaused || isGameOver) {
    updateStats();
    return;
  }

  // Таймер и ускорение скорости
  timeAccumulator += dt;
  while (timeAccumulator >= 1) {
    time++;
    if (time % 45 === 0) baseSpeed += 0.10;
    timeAccumulator -= 1;
  }
  updateStats();

  // Спавн задач по частоте в секунду
  spawnAccumulator += spawnRatePerSecond * dt;
  while (spawnAccumulator >= 1 && tasks.length < maxActive) {
    spawnTask();
    spawnAccumulator -= 1;
  }
}

function loop(now) {
  if (lastTimestamp === 0) lastTimestamp = now;
  const dt = Math.min(0.05, (now - lastTimestamp) / 1000); // clamp 50ms
  lastTimestamp = now;

  currentDeltaTime = isPaused || isGameOver ? 0 : dt;
  update(dt);
  renderFrame();
  // После gameOver не планируем следующий кадр, чтобы не перерисовывать экран игры
  if (!isGameOver) {
    rafId = requestAnimationFrame(loop);
  }
}

/* ======= Start ======= */
function startGame() {
  initCity();
  resizeCanvas();
  lastTimestamp = 0;
  cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(loop);
}

/* ======= Input ======= */
answerInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !isGameOver && !isPaused) {
    const val = parseInt(answerInput.value);
    if (isNaN(val)) return;
    let found = false;
    for (let i = 0; i < tasks.length; i++) {
      if (tasks[i].answer === val) {
        const t = tasks[i];
        score += 10;
        explosionSound.currentTime = 0;
        explosionSound.play();
        explosions.push(new Explosion(t.x, t.y));
        tasks.splice(i, 1);
        found = true;
        break;
      }
    }
    if (!found) {
      lives--;
      errorSound.play();
      if (lives <= 0) gameOver();
    }
    answerInput.value = "";
    updateStats();
  }
});
restartBtn.addEventListener("click", resetGame);

/* ======= Музыка ======= */
let musicStarted = false;
document.addEventListener("click", () => {
  if (!musicStarted) {
    const savedMuted = localStorage.getItem("musicMuted") === "true";
    const savedVol = parseFloat(localStorage.getItem("musicVolume"));
    bgMusic.volume = isNaN(savedVol) ? 0.05 : Math.min(1, Math.max(0, savedVol));
    if (!savedMuted) {
    bgMusic.currentTime = 0;
    bgMusic.play().catch(() => {});
    }
    musicStarted = true;
  }
});
musicBtn.addEventListener("click", () => {
  if (bgMusic.paused) {
    bgMusic.play().catch(() => {});
    musicBtn.textContent = "🎵 Музыка: Вкл";
    localStorage.setItem("musicMuted", "false");
  } else {
    bgMusic.pause();
    musicBtn.textContent = "🎵 Музыка: Выкл";
    localStorage.setItem("musicMuted", "true");
  }
});

// ======= Пауза/Возобновление =======
document.addEventListener("keydown", (e) => {
  if (e.key === "p" || e.key === "P") {
    if (isGameOver) return;
    isPaused = !isPaused;
    if (isPaused) {
      bgMusic.pause();
    } else {
      const muted = localStorage.getItem("musicMuted") === "true";
      if (!muted) bgMusic.play().catch(() => {});
    }
  }
});

/* ======= Запуск ======= */
// Восстанавливаем метку на кнопке музыки из сохранённого состояния
const initMuted = localStorage.getItem("musicMuted") === "true";
musicBtn.textContent = initMuted ? "🎵 Музыка: Выкл" : "🎵 Музыка: Вкл";

updateStats();
startGame();
