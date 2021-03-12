const COLORTHRESH = 45;
const PSYCHWAITTIME = 8000;
const detectionOptions = {
  withLandmarks: true,
  withDescriptors: false,
};

let app = {
	pixelSize: 3,
  cthresh: 0,
  useShader: false,
  ns: .01,
  rotate: true,
  faceOnly: true,
  skinColor: null,
  meltLength: 75,
  meltTime: 17500
};

let faceapi;
let detections;
let poseNet;
let pose;
let faceX = 0;
let faceY = 0;
let faceW = 0;
let faceH = 0;
let init = false;
let pg = null;

function setup() {
	createCanvas(640, 480);
	pg = createGraphics(640, 480);
	capture = createCapture(VIDEO, videoReady);
	capture.hide();

  poseNet = ml5.poseNet(capture, modelLoaded);
  poseNet.on('pose', gotPoses);
  faceapi = ml5.faceApi(capture, detectionOptions, modelReady);

  app.cthresh = COLORTHRESH;
  colorMode(RGB, 255);
}

function videoReady() {
  init = true;
}

function modelLoaded() {
  console.log('poseNet ready');
}

function modelReady() {
  console.log("faceapi ready!");
  console.log(faceapi);
  faceapi.detect(gotResults);
}

function gotResults(err, result) {
  if (err) {
    console.log(err);
    return;
  }

  detections = result;
  if (detections) {
    if (detections.length > 0) {
      drawBox(detections);
    }
  }
  faceapi.detect(gotResults);
}

function drawBox(detections) {
  for (let i = 0; i < detections.length; i += 1) {
    const alignedRect = detections[i].alignedRect;
    faceX = alignedRect._box._x;
    faceY = alignedRect._box._y;
    faceW = alignedRect._box._width;
    faceH = alignedRect._box._height;
  }
}

function gotPoses(poses) {
  if (poses.length > 0) {
    pose = poses[0].pose;
    let nc = getLocColor(Math.round(pose.nose.x ), Math.round(pose.nose.y));
    let lcc = getLocColor(Math.round(pose.leftEye.x), Math.round(pose.nose.y));
    let rcc = getLocColor(Math.round(pose.rightEye.x), Math.round(pose.nose.y));

    app.skinColor = color(
    	Math.round((red(nc) + red(lcc) + red(rcc)) / 3),
    	Math.round((green(nc) + green(lcc) + green(rcc)) / 3),
    	Math.round((blue(nc) + blue(lcc) + blue(rcc)) / 3)
    );
  }
}

function draw() {
  if (!init || !app.skinColor) {
    return;
  }

  let ns = app.ns;
  let img = capture.get();
  let sc = app.skinColor; 
  let fx = Math.round(faceX);
  let fy = Math.round(faceY);
  let fw = Math.round(faceW);
  let fh = Math.round(faceH);

  pg = createGraphics(640, 480);

  if (!app.faceOnly) {
  	fx = 0;
  	fy = 0;
  	fw = capture.width;
  	fh = capture.height;
  }

  capture.loadPixels();

  for (let x = fx; x < fx+fw; x += app.pixelSize) {
  	for (let y = fy; y < fy+fh; y += app.pixelSize) {
      let c = getLocColor(x, y);
      let pc = getRGBShader(c, x, y, ns);
      
      if (!app.faceOnly || (app.faceOnly && x <=  fx+fw && y >= fy && x >= fx  && y <= fy+fh)) {     
        let d = dist(
          red(c),
          green(c),
          blue(c),
          red(sc),
          green(sc),
          blue(sc)
        );

        if (d < app.cthresh) {
        	let amt = (millis() % app.meltTime); 

        	amt = map(amt, 0, app.meltTime, 0, app.meltLength + Math.round(random(0, 15)));
        	pg.push();
        	pg.translate(x, y);

        	if (app.rotate) {
        		if (Math.round(random(10)) % 3 == 0) {
        			pg.rotate(random(-.05, .05));
        		}
        	}

        	pg.strokeWeight(app.pixelSize);
        	pg.stroke(app.useShader ? pc : c);
        	pg.line(0, 0, 0, 0 + amt);
        	pg.pop();
        }  
      }
	  }
	}

  push();
  scale(-1,1);
  image(img,-width, 0);
  image(pg, -width, 0);
  pop();
}

function mouseClicked() {
}

function keyPressed() {
  if (keyCode == 90) {  //z
    app.useShader = !app.useShader;
  } else if (keyCode == 88) { // x
  	app.rotate = !app.rotate;
  } else if (keyCode == 65) { // a
    app.ns = random(0, 1) / 100;
  } else if (keyCode == 70) { // f
    app.faceOnly = !app.faceOnly;
  } 
}

function getLocColor(x, y) {
  let loc = (x + (y*capture.width))*4;
  let r = capture.pixels[loc];
  let g = capture.pixels[loc+1];
  let b = capture.pixels[loc+2];
  return color(r, g, b);
}

function getShaderColor(c, i, j, noiseScale) {
  let h = hue(c);
  let s = saturation(c);
  let b = brightness(c);
  let noiseVal1 = noise((h+i)*noiseScale, (h+j)*noiseScale);
  let noiseVal2 = noise((s+i)*noiseScale, (s+j)*noiseScale);
  let noiseVal3 = noise((b+i)*noiseScale, (b+j)*noiseScale);
  c = color(
    (h*noiseVal1), 
    (s*noiseVal2), 
    (b*noiseVal3*2)
  );
    
  return c;
}

function getRGBShader(c, i, j, noiseScale) {
  let r = red(c);
  let g = green(c);
  let b = blue(c);

  if (noiseScale) {
    let noiseVal1 = noise((r+i)*noiseScale, (r+j)*noiseScale);
    let noiseVal2 = noise((g+i)*noiseScale, (g+j)*noiseScale);
    let noiseVal3 = noise((b+i)*noiseScale, (b+j)*noiseScale);
    c = color(
      (r*noiseVal1), 
      (g*noiseVal2), 
      (b*noiseVal3)
    );

    colorMode(HSB, 100);
    c = color(hue(c), saturation(c), brightness(c)*2);
    colorMode(RGB, 255);
  }
  return c;
}
