const canvas = document.getElementById("space");
const ctx = canvas.getContext("2d");
const dialog = document.getElementById("dialog");
const dialogText = document.getElementById("dialogText");
const dButton = document.getElementById("dButton");
const scoreLabel = document.getElementById("scoreLabel");

// == Global initialization ==
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
worldCenter = { x: canvas.width / 2, y: canvas.height / 2 };

let lastTime = 0;
let accumulator = 0;
const FPS = 60;
ctx.FPS = FPS;
const timestep = 1000 / FPS;
let gameRunning = false;

// == Variables ==
//earth
const earth = new Image();
earth.src = "earth.svg";
let earthAngle = 0;
let earthSize = 200;
//player
let playerRotation = 270;
let playerRad = 150;
let playerSpeed = 140;
//bullet
let bulletSpeed = 400;
let bulletSize = 5;
const bulletList = [];
const shootCooldown = 0.1;
let lastShootTime = 0;
//asteroids
let asteroidSpeed = 50;
let asteroidSize = 60;
//score system
let health = 100;
let score = 0;
let highScore = 0;
if (localStorage.getItem("HS")) highScore = localStorage.getItem("HS");
const scoreEffects = [];
const speechEffects = [];

let asteroidMargin = [0.5, 1.4];
let asteroidTimeout = 0;
let asteroidCool = randomNumber(asteroidMargin[0], asteroidMargin[1]);
const asteroidList = [];
const dieAnim = [createAnimation(100, 102, 0.3), createAnimation(1, 0, 0.3)];

let camShake = null;
let camPos = { x: 0, y: 0 };
let camCounter = 0;

// == Draw stuff at an angle ==
function drawAngle(draw, pivot, angle) {
  ctx.save();
  ctx.translate(pivot[0], pivot[1]);
  ctx.rotate(angle * (Math.PI / 180));
  draw();
  ctx.restore();
}

// == Draw Circles ==
function drawCircle(
  x,
  y,
  radius,
  color,
  borderWidth = 0,
  borderColor = "black",
) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  if (borderWidth > 0) {
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = borderWidth;
    ctx.stroke();
  }
}

// == Smooth animation handler ==
function createAnimation(start, end, duration, easing = easeOut) {
  const frames = Math.round(duration * FPS);
  const values = [];

  for (let i = 0; i < frames; i++) {
    const t = i / (frames - 1);
    const eased = easing(t);

    values.push(start + (end - start) * eased);
  }

  return values;
}
function easeOut(t) {
  return 1 - Math.pow(1 - t, 3);
}

function createShakeAnimation(intensity, angle, duration) {
  const frames = Math.round(duration * FPS);
  const values = [];

  const radians = (angle * Math.PI) / 180;

  const dirX = Math.cos(radians);
  const dirY = Math.sin(radians);

  for (let i = 0; i < frames; i++) {
    const t = i / (frames - 1);

    const strength = intensity * (1 - easeOut(t));

    values.push({
      x: dirX * strength,
      y: dirY * strength,
    });
  }

  return values;
}

// == Draw Elipses ==
function drawEllipse(
  x,
  y,
  radiusX,
  radiusY,
  rotation,
  color,
  borderColor = "black",
  borderWidth = 0,
  opacity,
) {
  ctx.globalAlpha = opacity;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, radiusX, radiusY, rotation, 0, Math.PI * 2);
  ctx.fill();
  if (borderWidth > 0) {
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = borderWidth;
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

// == Angular Movement ==
function moveAtAngle(x, y, deg, distance) {
  const angle = (deg * Math.PI) / 180;
  return {
    x: x + Math.cos(angle) * distance,
    y: y + Math.sin(angle) * distance,
  };
}

// == Check bullet collision ==
function ellipseCircleCollision(
  ellipseX,
  ellipseY,
  radiusX,
  radiusY,
  rotation,
  circleX,
  circleY,
  circleRadius,
) {
  const dx = circleX - ellipseX;
  const dy = circleY - ellipseY;

  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);

  const localX = dx * cos + dy * sin;
  const localY = -dx * sin + dy * cos;

  const normalizedX = localX / radiusX;
  const normalizedY = localY / radiusY;

  return (
    normalizedX * normalizedX + normalizedY * normalizedY <=
    1 + circleRadius / Math.min(radiusX, radiusY)
  );
}

class Asteroid {
  constructor(x, y, radius, angle, speed, distance, id) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.radius2 = randomNumber(radius * 0.5, radius * 0.8);
    this.angle = angle;
    this.speed = speed;
    this.rotation = 0;
    this.distance = distance;
    this.attack = false;
    this.id = 0;
    this.dying = false;
    this.animProgress = 0;
    this.opacity = 1;
  }
  update(delta) {
    this.rotation += delta * (this.speed / 50);
    const newPosition = moveAtAngle(
      this.x,
      this.y,
      this.angle,
      this.speed * delta,
    );
    this.x = newPosition.x;
    this.y = newPosition.y;
    this.distance -= this.speed * delta;

    if (this.distance <= earthSize / 2 && !this.dying) this.attack = true;

    if (this.dying) {
      if (this.animProgress >= dieAnim[0].length) {
      } else {
        this.radius = (dieAnim[0][this.animProgress] / 100) * this.radius;
        this.radius2 = (dieAnim[0][this.animProgress] / 100) * this.radius2;
        this.opacity = dieAnim[1][this.animProgress];
        this.animProgress++;
      }
    }
  }

  draw() {
    drawEllipse(
      this.x,
      this.y,
      this.radius,
      this.radius2,
      this.rotation,
      "#454545",
      "#5d5c5c",
      4,
      this.opacity,
    );
  }

  die(id) {
    this.id = id;
    this.dying = true;
    this.attack = false;
  }
}

class Bullet {
  constructor() {
    this.sPos = moveAtAngle(
      worldCenter.x,
      worldCenter.y,
      playerRotation,
      playerRad,
    );
    this.x = this.sPos.x;
    this.y = this.sPos.y;
    this.angle = playerRotation;
    this.speed = bulletSpeed;
    this.radius = bulletSize;
  }
  update(delta) {
    const newPosition = moveAtAngle(
      this.x,
      this.y,
      this.angle,
      this.speed * delta,
    );
    this.x = newPosition.x;
    this.y = newPosition.y;
  }
  draw() {
    drawCircle(this.x, this.y, this.radius, "white");
  }
}

class NumberEffect {
  constructor(x, y, color, amount) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.amount = amount;
    this.yAnim = createAnimation(y, y - 50, 0.6);
    this.currentFrame = 0;
  }
  update() {
    if (this.currentFrame >= this.yAnim.length) {
    } else {
      this.y = this.yAnim[this.currentFrame];
      this.currentFrame++;
    }
  }
  draw() {
    ctx.fillStyle = this.color;
    ctx.fillText(this.amount, this.x, this.y);
  }
}

function randomNumber(min, max) {
  return Math.random() * (max - min) + min;
}

const key = { left: false, right: false, shoot: false };

function drawEarth() {
  drawAngle(
    () => {
      ctx.fillStyle = "red";
      ctx.drawImage(
        earth,
        -earthSize / 2,
        -earthSize / 2,
        earthSize,
        earthSize,
      );
    },
    [worldCenter.x, worldCenter.y],
    earthAngle,
  );
}

function drawPlayer() {
  drawCircle(
    worldCenter.x,
    worldCenter.y,
    150,
    "rgba(0,0,0,0)",
    7,
    "rgba(255, 255, 255, 0.5)",
  );
  drawAngle(
    () => {
      drawCircle(playerRad, 0, 15, "white");
    },
    [worldCenter.x, worldCenter.y],
    playerRotation,
  );
}

let hbSize = [300, 30];

function drawUI() {
  ctx.fillStyle = "red";
  ctx.fillRect(30, 30, hbSize[0], hbSize[1]);
  ctx.fillStyle = "green";
  ctx.fillRect(30, 30, hbSize[0] * (health / 100), hbSize[1]);

  ctx.font = "30px Arial";
  ctx.strokeStyle = "#e7f15d";
  ctx.lineWidth = 2;
  ctx.strokeText("Score: " + score + "     " + "HS: " + highScore, 40, 110);
  ctx.fillStyle = "#f3c910";
  ctx.fillText("Score: " + score + "     " + "HS: " + highScore, 40, 110);
}

function createAsteroid() {
  const angle = randomNumber(0, 359);
  const distance = Math.max(window.innerWidth, window.innerHeight) / 2 + 60;
  const pos = moveAtAngle(worldCenter.x, worldCenter.y, angle, -distance);
  const rad = randomNumber(10, asteroidSize);
  const speed = randomNumber(asteroidSpeed - 15, asteroidSpeed + 5);
  asteroidList.push(new Asteroid(pos.x, pos.y, rad, angle, speed, distance));
}

function startGame() {
  score = 0;
  health = 100;
  asteroidList.length = 0;
  bulletList.length = 0;
  gameRunning = true;
  dialog.style.display = "none";
  requestAnimationFrame(gameLoop);
}

function randomSpeech() {
  const phrases = [
    "Ouch!",
    "MY HOUSE!!",
    "I hate you!",
    "Do your job better!",
    "I prefer the old defender",
    "Was that an asteroid or metior?",
    "Noooo, not McDonald's!",
    "Are you even trying?",
    "Did someone just fart?",
    "Let's move to Mars guys",
    "You suck ngl",
    "C'mon, I was watching Spongebob",
  ];
  const message = phrases[Math.floor(Math.random() * phrases.length)];
  return message;
}

function update(delta) {
  earthAngle += 20 * delta;
  lastShootTime -= delta;
  if (earthAngle > 360) earthAngle = 0;

  if (key.left) {
    playerRotation -= playerSpeed * delta;
  }
  if (key.right) {
    playerRotation += playerSpeed * delta;
  }
  if (key.shoot && lastShootTime <= 0) {
    bulletList.push(new Bullet());
    lastShootTime = shootCooldown;
  }

  for (let i = asteroidList.length - 1; i >= 0; i--) {
    const ast = asteroidList[i];

    ast.update(delta);

    if (ast.attack) {
      ast.die(i);
      const damage = Math.floor(-ast.radius * 0.3);
      health += damage;
      scoreEffects.push(new NumberEffect(ast.x, ast.y, "red", damage));
      speechEffects.length = 0;
      speechEffects.push(
        new NumberEffect(worldCenter.x, 100, "white", randomSpeech()),
      );
      camShake = shake = createShakeAnimation(20, ast.angle, 0.8);
      camCounter = 0;
    }

    if (ast.dying && ast.animProgress >= dieAnim[0].length) {
      asteroidList.splice(i, 1);
    }
  }

  for (let i = bulletList.length - 1; i >= 0; i--) {
    const bul = bulletList[i];
    bul.update(delta);
    if (
      bul.x < 0 ||
      bul.x > canvas.width ||
      bul.y < 0 ||
      bul.y > canvas.height
    ) {
      bulletList.splice(i, 1);
    }
    for (let j = 0; j < asteroidList.length; j++) {
      const ast = asteroidList[j];
      if (!ast.dying) {
        if (
          ellipseCircleCollision(
            ast.x,
            ast.y,
            ast.radius,
            ast.radius2,
            ast.rotation,
            bul.x,
            bul.y,
            bul.radius,
          )
        ) {
          bulletList.splice(i, 1);
          ast.die(j);
          score += Math.floor(ast.radius / 2);
          scoreEffects.push(
            new NumberEffect(
              ast.x,
              ast.y,
              "yellow",
              Math.floor(ast.radius / 2),
            ),
          );
          camShake = shake = createShakeAnimation(10, ast.angle + 180, 0.7);
          camCounter = 0;
        }
      }
    }
  }

  if (asteroidTimeout <= 0) {
    asteroidTimeout = randomNumber(asteroidMargin[0], asteroidMargin[1]);
    createAsteroid();
  } else {
    asteroidTimeout -= delta;
  }
  if (health <= 0) {
    gameRunning = false;
    health = 0;
    if (score > highScore) {
      highScore = score;
      localStorage.setItem("HS", highScore);
    }
    dialog.style.display = "block";
    dialogText.textContent = "Game Over bro";
    dButton.textContent = "Restart";
    scoreLabel.textContent = "Your score: " + score;
  }
  for (let i = 0; i < scoreEffects.length; i++) {
    if (scoreEffects[i].currentFrame >= scoreEffects[i].yAnim.length) {
      scoreEffects.splice(i, 1);
    }
  }

  for (let i = 0; i < scoreEffects.length; i++) {
    scoreEffects[i].update();
  }

  for (let i = 0; i < speechEffects.length; i++) {
    if (speechEffects[i].currentFrame >= speechEffects[i].yAnim.length) {
      speechEffects.splice(i, 1);
    }
  }

  for (let i = 0; i < speechEffects.length; i++) {
    speechEffects[i].update();
  }

  if (camShake) {
    if (camCounter < camShake.length) {
      camPos = camShake[camCounter];
      camCounter++;
    } else {
      camCounter = 0;
      camShake = null;
    }
  }

  if (score > 400) asteroidSpeed = 60;
  if (score > 700) asteroidSpeed = 70;
  if (score > 700) asteroidSpeed = 80;
  if (score > 1000) asteroidSpeed = 90;
  if (score > 1500) asteroidSpeed = 100;
  if (score > 1800) asteroidSpeed = 115;
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.translate(camPos.x, camPos.y);
  // == Draw the Earth Rotating ==
  drawEarth();

  // == Draw the Player ==
  drawPlayer();

  // == Draw Bullets ==
  for (let i = 0; i < bulletList.length; i++) {
    bulletList[i].draw();
  }
  for (let i = asteroidList.length - 1; i >= 0; i--) {
    asteroidList[i].draw();
  }

  ctx.restore();
  for (let i = 0; i < scoreEffects.length; i++) {
    scoreEffects[i].draw();
  }

  for (let i = 0; i < speechEffects.length; i++) {
    speechEffects[i].draw();
  }

  drawUI();
}

function gameLoop(ctime) {
  if (gameRunning) {
    let deltaTime = ctime - lastTime;
    lastTime = ctime;

    if (deltaTime > FPS) deltaTime = FPS;

    accumulator += deltaTime;

    while (accumulator >= timestep) {
      update(timestep / 1000);
      accumulator -= timestep;
    }

    render();

    requestAnimationFrame(gameLoop);
  }
}

requestAnimationFrame((time) => {
  lastTime = time;
  requestAnimationFrame(gameLoop);
});

window.addEventListener("resize", () => {
  resizeCanvas();
});

window.addEventListener("keydown", (e) => {
  if (e.code == "ArrowLeft") {
    key.left = true;
  }
  if (e.code == "ArrowRight") {
    key.right = true;
  }
  if (e.code == "Space") {
    key.shoot = true;
  }
});
window.addEventListener("keyup", (e) => {
  if (e.code == "ArrowLeft") {
    key.left = false;
  }
  if (e.code == "ArrowRight") {
    key.right = false;
  }
  if (e.code == "Space") {
    key.shoot = false;
  }
});

function angleBetween(pos1, pos2) {
  return Math.atan2(pos2.y - pos1.y, pos2.x - pos1.x);
}

// == Resize canvas ==
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  worldCenter = { x: canvas.width / 2, y: canvas.height / 2 };
  for (let i = 0; i < asteroidList.length; i++) {
    asteroidList[i].angle = angleBetween(
      { x: asteroidList.x, y: asteroidList.y },
      worldCenter,
    );
  }
}
resizeCanvas();
