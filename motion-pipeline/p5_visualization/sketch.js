
var [rx, ry, rz] = [0, 0, 45];
var [orderX, orderY, orderZ] = [3, 2, 1];
let gui;

function preload() {
}


function setup() {
  angleMode(DEGREES);
  let canvas = createCanvas(windowWidth, windowHeight, WEBGL);
  document.oncontextmenu = () => false;
  createEasyCam();

  gui = createGui('p5.gui')

  sliderRange(-180, 180, 1);
  gui.addGlobals('rx', 'ry', 'rz');

  sliderRange(1, 3, 1);
  gui.addGlobals('orderX', 'orderY', 'orderZ');
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function drawCoordinates(s, colx, coly, colz) {
  push();
  if (colx === undefined) colx = color(190, 40, 40);
  stroke(colx);
  line(0, 0, 0, s, 0, 0);

  if (coly === undefined) coly = color(40, 190, 40);
  stroke(coly);
  line(0, 0, 0, 0, s, 0);

  if (colz === undefined) colz = color(40, 40, 190);
  stroke(colz);
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

  // Switch to left handed coordinate system
  scale(1, -1, 1);

  let col_component_major_base = 230;
  let col_component_minor_base = 190;
  drawCoordinates(ll / 3, 
    color(col_component_major_base, col_component_minor_base, col_component_minor_base), 
    color(col_component_minor_base, col_component_major_base, col_component_minor_base), 
    color(col_component_minor_base, col_component_minor_base, col_component_major_base)
  );
  
  objs = [{
    val: rx,
    order: orderX,
    fn: rotateX
  }, {
    val: ry,
    order: orderY,
    fn: rotateY
  }, {
    val: rz,
    order: orderZ,
    fn: rotateZ
  }].sort((a, b) => a.order - b.order);
  
  for (let obj of objs) {
    obj.fn(obj.val);
  }
  drawCoordinates(ll / 4);
  stroke(128, 80);
  line(0, 0, 0, ll / 2, 0, 0)
  translate(ll / 2, 0, 0);
  drawCoordinates(ll / 6);
  // line(0, 0, 0, 0, ll / 2, 0)
  pop();

  translate(0, 0, -50);
  noStroke(128);
  fill(255, 255, 255, 128);
  box(minDim, minDim, 1, 3, 3);
  stroke(128);
  point(0, 0, 0);
}