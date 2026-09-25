const canvas = document.getElementById("space");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

function drawAngle(draw, pivot, angle) {
  ctx.save();
  ctx.translate(pivot[0], pivot[1]);
  ctx.rotate(angle);
  draw();
  ctx.restore();
}

drawAngle(
  () => {
    ctx.fillStyle = "red";
    ctx.fillRect(-30, -30, 60, 60);
  },
  [300, 300],
  70,
);

let rot = 0;
function update(delta) {
  rot += 3 * delta;
}
function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawAngle(
    () => {
      ctx.fillStyle = "red";
      ctx.fillRect(-30, -30, 60, 60);
    },
    [300, 300],
    rot,
  );
}

let lastTime = 0;
let accumulator = 0;
const FPS = 60;
const timestep = 1000 / FPS;
let gameRunning = true;

function gameLoop(ctime) {
  if (gameRunning) {
    let deltaTime = ctime - lastTime;
    lastTime = ctime;

    if (deltaTime > 250) deltaTime = 250;

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
