
var [rx, ry, rz] = [0, 0, 45];
var [orderX, orderY, orderZ] = [3, 2, 1];
let gui;

function preload() {
}

var camera;

function setup() {
  angleMode(DEGREES);
  let canvas = createCanvas(windowWidth, windowHeight, WEBGL);
  document.oncontextmenu = () => false;

  // Switch to right handed coordinate system
  scale(-1, 1, 1);

  camera = createEasyCam();
  camera.setCenter([100, 100, 100]);

  gui = createGui('p5.gui')

  sliderRange(-180, 180, 5);
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

  let minDim = min(width, height) / 2;
  let ll = minDim / 2;
  noStroke();
  fill(255, 255, 255, 128);
  box(minDim, 1, minDim);
  stroke(55);
  point(0, 0, 0);

  stroke(0);
  strokeWeight(4);
  
  translate(0, 50, 0);
  push();


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
  pop();
}