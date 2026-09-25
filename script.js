const canvas = document.getElementById("space");
const ctx = canvas.getContext("2d");

// == Resize canvas ==
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  worldCenter = { x: canvas.width / 2, y: canvas.height / 2 };
}
resizeCanvas();

// == Global initialization ==
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
worldCenter = { x: canvas.width / 2, y: canvas.height / 2 };

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

// == Angular Movement ==
function moveAtAngle(x, y, deg, distance) {
  const angle = (deg * Math.PI) / 180;
  return {
    x: x + Math.cos(angle) * distance,
    y: y + Math.sin(angle) * distance,
  };
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
let bulletSpeed = 300;
let bulletSize = 5;
const bulletList = [];
const shootCooldown = 0.1;
let lastShootTime = 0;

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

  for (let i = bulletList.length - 1; i >= 0; i--) {
    bulletList[i].update(delta);
    if (
      bulletList[i].x < 0 ||
      bulletList[i].x > canvas.width ||
      bulletList[i].y < 0 ||
      bulletList[i].y > canvas.height
    ) {
      bulletList.splice(i, 1);
    }
  }
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // == Draw the Earth Rotating ==
  drawEarth();

  // == Draw the Player ==
  drawPlayer();

  // == Draw Bullets ==
  for (let i = 0; i < bulletList.length; i++) {
    bulletList[i].draw();
  }
}

let lastTime = 0;
let accumulator = 0;
const FPS = 60;
ctx.FPS = FPS;
const timestep = 1000 / FPS;
let gameRunning = true;

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
    console.log(99);
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
