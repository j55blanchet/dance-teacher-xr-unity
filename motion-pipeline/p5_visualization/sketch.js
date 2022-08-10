
const [rx, ry, rz] = [0, 0, 45];

function preload() {
}


function setup() {
  angleMode(DEGREES);
  let canvas = createCanvas(windowWidth, windowHeight, WEBGL);
  document.oncontextmenu = () => false;
  createEasyCam();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function drawCoordinates(s) {
  push();
  stroke(190, 40, 40);
  line(0, 0, 0, s, 0, 0);

  stroke(40, 190, 40);
  line(0, 0, 0, 0, s, 0);

  stroke(40, 40, 190);
  line(0, 0, 0, 0, 0, s);
  pop();
}

function draw() {
  background(240);
  stroke(0);
  strokeWeight(4);
  let minDim = min(width, height) / 2;
  let ll = minDim / 2;
  
  translate(0, 0, 50);
  push();
  

  drawCoordinates(ll / 2);
  

  rotateZ(rz);
  rotateY(ry);
  rotateX(rx);
  
  stroke(255,80, 80);
  line(0, 0, 0, ll, 0, 0)
  pop();
  translate(0, 0, -50);
  noStroke(128);
  fill(255, 255, 255, 128);
  box(minDim, minDim, 1, 3, 3);
  stroke(128);
  point(0, 0, 0);
}