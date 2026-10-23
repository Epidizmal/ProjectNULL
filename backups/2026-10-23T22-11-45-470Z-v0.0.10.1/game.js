const canvas = document.querySelector("#game");
const context = canvas.getContext("2d");
const overlay = document.querySelector("#overlay");
const overlayKicker = document.querySelector("#overlay-kicker");
const overlayTitle = document.querySelector("#overlay-title");
const overlayCopy = document.querySelector("#overlay-copy");
const startButton = document.querySelector("#start-button");
const pauseButton = document.querySelector("#pause-button");
const resetButton = document.querySelector("#reset-button");
const scoreElement = document.querySelector("#score");
const bestElement = document.querySelector("#best");
const shieldIndicator = document.querySelector("#shield-indicator");
const streakCountElement = document.querySelector("#streak-count");
const streakTimerTrack = document.querySelector("#streak-timer-track");
const streakTimerBar = document.querySelector("#streak-timer-bar");
const stateLabel = document.querySelector("#state-label");
const runState = document.querySelector(".run-state");

const width = canvas.width;
const height = canvas.height;
const lanes = [300, 480, 660];
const runnerY = 433;
const stars = Array.from({ length: 74 }, (_, index) => ({
  x: (index * 193 + 47) % width,
  y: (index * 127 + 31) % height,
  size: (index % 3) + 1,
  phase: index * 0.71,
}));

let state = "ready";
let score = 0;
let best = readBest();
let currentLane = 1;
let playerX = lanes[currentLane];
let moveDirection = 0;
let moveAnimation = 0;
let objects = [];
let elapsed = 0;
let spawnTimer = 0.7;
let backgroundOffset = 0;
let lastFrame = 0;
let shownScore = -1;
let shieldCharges = 0;
let shardStreak = 0;
let streakTimer = 0;
let invulnerabilityTimer = 0;
let comboFlash = 0;
let comboBonus = 0;
let displayedStreakTime = -1;

function readBest() {
  try {
    return Number(window.localStorage.getItem("nullrun-best")) || 0;
  } catch {
    return 0;
  }
}

function saveBest() {
  try {
    window.localStorage.setItem("nullrun-best", String(best));
  } catch {
    // The current run still works when storage is unavailable.
  }
}

function formatScore(value) {
  return String(Math.floor(value)).padStart(5, "0");
}

function updateScoreboard(force = false) {
  const wholeScore = Math.floor(score);
  if (force || wholeScore !== shownScore) {
    scoreElement.textContent = formatScore(wholeScore);
    shownScore = wholeScore;
  }
  bestElement.textContent = formatScore(best);
}

function updateMeters() {
  shieldIndicator.classList.toggle("has-charge", shieldCharges > 0);
  shieldIndicator.setAttribute("aria-label", shieldCharges > 0 ? "Shield charged" : "No shield charged");
  streakCountElement.textContent = shardStreak > 0 ? `x${shardStreak}` : "0";
  updateStreakTimerBar();
}

function updateStreakTimerBar() {
  const remaining = Math.max(0, streakTimer);
  streakTimerBar.style.transform = `scaleY(${remaining / 3.5})`;
  const deciseconds = Math.ceil(remaining * 10);
  if (deciseconds !== displayedStreakTime) {
    streakTimerTrack.setAttribute("aria-valuenow", remaining.toFixed(1));
    displayedStreakTime = deciseconds;
  }
}

function setState(nextState) {
  state = nextState;
  const labels = {
    ready: "SIGNAL STANDBY",
    playing: "SIGNAL ACTIVE",
    paused: "SIGNAL PAUSED",
    over: "SIGNAL LOST",
  };
  stateLabel.textContent = labels[state];
  runState.classList.toggle("is-playing", state === "playing");
  runState.classList.toggle("is-over", state === "over");
  pauseButton.disabled = state === "ready" || state === "over";
  pauseButton.setAttribute("aria-label", state === "paused" ? "Resume game" : "Pause game");
  pauseButton.title = state === "paused" ? "Resume game" : "Pause game";
  pauseButton.firstElementChild.textContent = state === "paused" ? "▶" : "Ⅱ";

  if (state === "playing") {
    overlay.classList.remove("is-visible");
    return;
  }

  overlay.classList.add("is-visible");
  if (state === "ready") {
    overlayKicker.textContent = "INCOMING TRANSMISSION";
    overlayTitle.textContent = "The void is moving.";
    overlayCopy.textContent = "Build shard streaks for bonus points. Cyan shields absorb one thorn hit.";
    startButton.firstElementChild.textContent = "Start run";
  } else if (state === "paused") {
    overlayKicker.textContent = "SIGNAL HELD";
    overlayTitle.textContent = "Catch your breath.";
    overlayCopy.textContent = `Current score: ${formatScore(score)}. Your run is paused.`;
    startButton.firstElementChild.textContent = "Resume run";
  } else {
    overlayKicker.textContent = "CONNECTION SEVERED";
    overlayTitle.textContent = "The signal went quiet.";
    overlayCopy.textContent = `Final score: ${formatScore(score)}. The current is still out there.`;
    startButton.firstElementChild.textContent = "Run it back";
  }
}

function startRun() {
  score = 0;
  elapsed = 0;
  spawnTimer = 0.6;
  currentLane = 1;
  playerX = lanes[currentLane];
  moveDirection = 0;
  moveAnimation = 0;
  objects = [];
  shieldCharges = 0;
  shardStreak = 0;
  streakTimer = 0;
  invulnerabilityTimer = 0;
  comboFlash = 0;
  comboBonus = 0;
  updateScoreboard(true);
  updateMeters();
  setState("playing");
}

function pauseRun() {
  if (state === "playing") {
    setState("paused");
  } else if (state === "paused") {
    setState("playing");
  }
}

function moveLane(direction) {
  if (state !== "playing") return;
  setLane(currentLane + direction);
}

function setLane(lane) {
  const nextLane = Math.max(0, Math.min(lanes.length - 1, lane));
  if (nextLane === currentLane) return;
  moveDirection = Math.sign(nextLane - currentLane);
  currentLane = nextLane;
  moveAnimation = 1;
}

function endRun() {
  if (state !== "playing") return;
  const finalScore = Math.floor(score);
  if (finalScore > best) {
    best = finalScore;
    saveBest();
  }
  updateScoreboard(true);
  setState("over");
}

function spawnObject() {
  const lane = Math.floor(Math.random() * lanes.length);
  const roll = Math.random();
  const shieldChance = Math.max(0.01, 0.06 - elapsed * 0.0005);
  const type = roll < shieldChance ? "shield" : roll < shieldChance + 0.46 ? "shard" : "thorn";
  objects.push({
    lane,
    y: -36,
    type,
    rotation: Math.random() * Math.PI,
    collected: false,
  });
}

function update(delta) {
  if (state !== "playing") return;
  elapsed += delta;
  score += delta * (10 + Math.min(elapsed * 0.12, 12));
  backgroundOffset = (backgroundOffset + delta * 160) % 80;
  invulnerabilityTimer = Math.max(0, invulnerabilityTimer - delta);
  moveAnimation = Math.max(0, moveAnimation - delta * 3.2);
  comboFlash = Math.max(0, comboFlash - delta);
  if (streakTimer > 0) {
    streakTimer -= delta;
    if (streakTimer <= 0) {
      shardStreak = 0;
      updateMeters();
    }
  }
  updateStreakTimerBar();

  const speed = 250 + Math.min(elapsed * 8, 330);
  spawnTimer -= delta;
  if (spawnTimer <= 0) {
    spawnObject();
    spawnTimer = Math.max(0.43, 0.94 - elapsed * 0.006) + Math.random() * 0.12;
  }

  playerX += (lanes[currentLane] - playerX) * Math.min(1, delta * 13);

  for (const object of objects) {
    object.y += speed * delta;
    object.rotation += delta * (object.type === "thorn" ? 0.8 : 1.6);
    const closeToRunner = Math.abs(object.y - runnerY) < 29;
    const sameLane = Math.abs(lanes[object.lane] - playerX) < 57;

    if (!object.collected && closeToRunner && sameLane) {
      if (object.type === "thorn") {
        if (shieldCharges > 0) {
          shieldCharges = 0;
          streakTimer = 0;
          shardStreak = 0;
          invulnerabilityTimer = 0.9;
          object.collected = true;
          updateMeters();
          continue;
        }
        if (invulnerabilityTimer > 0) {
          object.collected = true;
          continue;
        }
        endRun();
        return;
      }

      object.collected = true;
      if (object.type === "shield") {
        if (shieldCharges === 0) shieldCharges = 1;
        else score += 100;
      } else {
        score += 35;
        shardStreak += 1;
        streakTimer = 3.5;
        if (shardStreak % 3 === 0) {
          comboBonus = 25 * Math.floor(shardStreak / 3);
          score += comboBonus;
          comboFlash = 1.4;
        }
      }
      updateMeters();
    }
  }

  objects = objects.filter((object) => object.y < height + 45 && !object.collected);
  updateScoreboard();
}

function drawBackground(time) {
  const gradient = context.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#17201c");
  gradient.addColorStop(0.62, "#111915");
  gradient.addColorStop(1, "#0c100e");
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  for (const star of stars) {
    const flicker = 0.25 + (Math.sin(time * 0.001 + star.phase) + 1) * 0.24;
    context.fillStyle = `rgba(192, 225, 184, ${flicker})`;
    context.fillRect(star.x, star.y, star.size, star.size);
  }

  const glow = context.createRadialGradient(480, 250, 10, 480, 250, 430);
  glow.addColorStop(0, "rgba(85, 133, 101, 0.15)");
  glow.addColorStop(1, "rgba(85, 133, 101, 0)");
  context.fillStyle = glow;
  context.fillRect(0, 0, width, height);
}

function drawTrack() {
  context.save();
  context.lineWidth = 1;
  context.setLineDash([4, 13]);
  context.lineDashOffset = -backgroundOffset;

  for (const x of [390, 570]) {
    context.strokeStyle = "rgba(188, 218, 182, 0.16)";
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, height);
    context.stroke();
  }

  context.setLineDash([]);
  for (const x of lanes) {
    const laneGlow = context.createLinearGradient(x - 52, 0, x + 52, 0);
    laneGlow.addColorStop(0, "rgba(143, 205, 159, 0)");
    laneGlow.addColorStop(0.5, "rgba(143, 205, 159, 0.045)");
    laneGlow.addColorStop(1, "rgba(143, 205, 159, 0)");
    context.fillStyle = laneGlow;
    context.fillRect(x - 52, 0, 104, height);
  }

  context.restore();
}

function drawShard(x, y, rotation) {
  context.save();
  context.translate(x, y);
  context.rotate(rotation);
  context.shadowColor = "#75f2c2";
  context.shadowBlur = 24;
  context.fillStyle = "#75f2c2";
  context.beginPath();
  context.moveTo(0, -19);
  context.lineTo(13, 0);
  context.lineTo(0, 19);
  context.lineTo(-13, 0);
  context.closePath();
  context.fill();
  context.shadowBlur = 0;
  context.fillStyle = "#e2fff3";
  context.beginPath();
  context.arc(0, 0, 3, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function drawThorn(x, y, rotation) {
  context.save();
  context.translate(x, y);
  context.rotate(rotation);
  context.shadowColor = "#ff735e";
  context.shadowBlur = 25;
  context.fillStyle = "#fc6d58";
  context.beginPath();
  for (let point = 0; point < 10; point += 1) {
    const radius = point % 2 === 0 ? 22 : 13;
    const angle = (point / 10) * Math.PI * 2 - Math.PI / 2;
    const xPoint = Math.cos(angle) * radius;
    const yPoint = Math.sin(angle) * radius;
    if (point === 0) context.moveTo(xPoint, yPoint);
    else context.lineTo(xPoint, yPoint);
  }
  context.closePath();
  context.fill();
  context.shadowBlur = 0;
  context.fillStyle = "#622c28";
  context.beginPath();
  context.arc(0, 0, 5, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function drawShield(x, y, rotation) {
  context.save();
  context.translate(x, y);
  context.rotate(rotation);
  context.shadowColor = "#73cfff";
  context.shadowBlur = 24;
  context.fillStyle = "#73cfff";
  context.beginPath();
  context.moveTo(0, -20);
  context.lineTo(16, -13);
  context.lineTo(13, 7);
  context.lineTo(0, 19);
  context.lineTo(-13, 7);
  context.lineTo(-16, -13);
  context.closePath();
  context.fill();
  context.shadowBlur = 0;
  context.strokeStyle = "#e3f8ff";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(-6, -1);
  context.lineTo(-1, 5);
  context.lineTo(7, -6);
  context.stroke();
  context.restore();
}

function drawPlayer() {
  const y = runnerY;
  context.save();
  context.translate(playerX, y);
  if (moveAnimation > 0) {
    context.globalAlpha = moveAnimation * 0.55;
    context.strokeStyle = "#75f2c2";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(-moveDirection * 8, 8);
    context.lineTo(-moveDirection * (24 + moveAnimation * 12), 8);
    context.moveTo(-moveDirection * 5, 15);
    context.lineTo(-moveDirection * (14 + moveAnimation * 10), 15);
    context.stroke();
    context.globalAlpha = 1;
  }
  context.rotate(moveDirection * 0.24 * moveAnimation);
  context.scale(1 + moveAnimation * 0.08, 1 - moveAnimation * 0.04);
  if (shieldCharges > 0) {
    context.strokeStyle = "rgba(115, 207, 255, 0.9)";
    context.lineWidth = 2;
    context.shadowColor = "#73cfff";
    context.shadowBlur = 16;
    context.beginPath();
    context.arc(0, 0, 31, 0, Math.PI * 2);
    context.stroke();
  }
  if (invulnerabilityTimer > 0 && Math.floor(invulnerabilityTimer * 14) % 2 === 0) {
    context.globalAlpha = 0.38;
  }
  context.shadowColor = "#c8f36a";
  context.shadowBlur = 30;
  context.fillStyle = "#c8f36a";
  context.beginPath();
  context.moveTo(0, -23);
  context.lineTo(17, 13);
  context.lineTo(0, 7);
  context.lineTo(-17, 13);
  context.closePath();
  context.fill();
  context.shadowBlur = 0;
  context.fillStyle = "#344125";
  context.beginPath();
  context.moveTo(0, -11);
  context.lineTo(5, 6);
  context.lineTo(-5, 6);
  context.closePath();
  context.fill();
  context.restore();
}

function drawCombo() {
  if (comboFlash <= 0) return;
  context.save();
  context.textAlign = "center";
  context.font = "bold 14px monospace";
  context.fillStyle = "#c8f36a";
  context.shadowColor = "#c8f36a";
  context.shadowBlur = 12;
  context.fillText(`STREAK x${shardStreak}   +${comboBonus}`, width / 2, 42);
  context.restore();
}

function render(time) {
  drawBackground(time);
  drawTrack();
  for (const object of objects) {
    if (object.type === "shard") drawShard(lanes[object.lane], object.y, object.rotation);
    else if (object.type === "shield") drawShield(lanes[object.lane], object.y, object.rotation);
    else drawThorn(lanes[object.lane], object.y, object.rotation);
  }
  drawPlayer();
  drawCombo();
}

function frame(time) {
  const delta = lastFrame ? Math.min((time - lastFrame) / 1000, 0.04) : 0;
  lastFrame = time;
  update(delta);
  render(time);
  requestAnimationFrame(frame);
}

startButton.addEventListener("click", () => {
  if (state === "paused") setState("playing");
  else startRun();
});

pauseButton.addEventListener("click", pauseRun);
resetButton.addEventListener("click", startRun);

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (["arrowleft", "arrowright", " "].includes(key)) event.preventDefault();

  if (key === "arrowleft" || key === "a") moveLane(-1);
  if (key === "arrowright" || key === "d") moveLane(1);
  if (key === "p" || key === "escape") pauseRun();
  if (key === "r") startRun();
  if (key === " " && state !== "playing") {
    if (state === "paused") setState("playing");
    else startRun();
  }
});

canvas.addEventListener("pointerdown", (event) => {
  if (state !== "playing") return;
  const bounds = canvas.getBoundingClientRect();
  const pointerX = ((event.clientX - bounds.left) / bounds.width) * width;
  setLane(pointerX < 390 ? 0 : pointerX < 570 ? 1 : 2);
});

updateScoreboard(true);
updateMeters();
setState("ready");
requestAnimationFrame(frame);