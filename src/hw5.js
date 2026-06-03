import {OrbitControls} from './OrbitControls.js'

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
// Set background color
scene.background = new THREE.Color(0x1a1a2e);

// Add lights to the scene
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(5, 20, -20);
directionalLight.target.position.set(0, 0, -58.5);
scene.add(directionalLight.target);
scene.add(directionalLight);

// Enable shadows
renderer.shadowMap.enabled = true;
directionalLight.castShadow = true;
directionalLight.shadow.camera.left = -5;
directionalLight.shadow.camera.right = 5;
directionalLight.shadow.camera.top = 25;
directionalLight.shadow.camera.bottom = -5;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 100; 

directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;

function degrees_to_radians(degrees) {
  var pi = Math.PI;
  return degrees * (pi/180);
}

// Create bowling lane
function createBowlingLane() {
  // Main lane surface – Z=0 (foul line) to Z=-60 (pin end)
  const laneGeometry = new THREE.BoxGeometry(3.5, 0.2, 60);
  const laneMaterial = new THREE.MeshPhongMaterial({
    color: 0xDEB887,  // Light maple wood
    shininess: 80
  });
  const lane = new THREE.Mesh(laneGeometry, laneMaterial);
  lane.position.set(0, 0, -30);  // top surface at Y=0.1
  lane.receiveShadow = true;
  lane.castShadow = true;
  scene.add(lane);

  // Approach area – Z=0 to Z=+15 (between bowler and foul line)
  const approachGeo = new THREE.BoxGeometry(3.5, 0.2, 15);
  const approachMat = new THREE.MeshPhongMaterial({
    color: 0xC8A06A,  // Slightly darker/different maple tone
    shininess: 40
  });
  const approach = new THREE.Mesh(approachGeo, approachMat);
  approach.position.set(0, 0, 7.5);  // spans Z=0 to Z=+15
  approach.receiveShadow = true;
  approach.castShadow = true;
  scene.add(approach);

  // Gutters – recessed 0.05 below lane top surface, both sides, full lane length
  const gutterWidth = 0.5;
  const gutterGeo = new THREE.BoxGeometry(gutterWidth, 0.15, 60);
  const gutterMat = new THREE.MeshPhongMaterial({
    color: 0x7A5C2E,  // Darker matte wood
    shininess: 10
  });
  [-1, 1].forEach(side => {
    const gutter = new THREE.Mesh(gutterGeo, gutterMat);
    // Y=-0.025 → top of gutter at 0.05, which is 0.05 below lane top (0.1)
    gutter.position.set(side * (1.75 + gutterWidth / 2), -0.025, -30);
    gutter.receiveShadow = true;
    gutter.castShadow = true;
    scene.add(gutter);
  });

  // Foul line – thin red stripe across full lane width, exactly at Z=0
  const foulLineGeo = new THREE.BoxGeometry(3.5, 0.01, 0.08);
  const foulLineMat = new THREE.MeshPhongMaterial({ color: 0xff1a1a, shininess: 20 });
  const foulLine = new THREE.Mesh(foulLineGeo, foulLineMat);
  foulLine.position.set(0, 0.101, 0);  // Y=0.101 prevents Z-fighting with lane top (0.1)
  foulLine.receiveShadow = true;
  foulLine.castShadow = true;
  scene.add(foulLine);

  // Lane arrows – 5 amber triangles pointing toward pins, at Z=-15
  // ShapeGeometry is in XY plane; rotation.x = -PI/2 lays it flat (facing +Y)
  // and maps shape +Y → 3D -Z (toward pins)
  const arrowShape = new THREE.Shape();
  arrowShape.moveTo(0, 0.3);      // tip → points toward pins in 3D
  arrowShape.lineTo(-0.08, -0.15);
  arrowShape.lineTo(0.08, -0.15);
  arrowShape.lineTo(0, 0.3);

  const arrowGeo = new THREE.ShapeGeometry(arrowShape);
  const arrowMat = new THREE.MeshPhongMaterial({
    color: 0xB8860B,  // Dark goldenrod / amber inlay
    shininess: 40,
    side: THREE.DoubleSide
  });
  [0, -0.5, 0.5, -1.0, 1.0].forEach(x => {
    const arrow = new THREE.Mesh(arrowGeo, arrowMat);
    arrow.rotation.x = -Math.PI / 2;
    arrow.position.set(x, 0.101, -15);
    arrow.receiveShadow = true;
    arrow.castShadow = true;
    scene.add(arrow);
  });

  // Approach dots – two straight rows of 5, parallel to the foul line.
  // Row at Z=7 and Z=12; five dots symmetric around X=0 at 0.5-unit spacing.
  const dotGeo = new THREE.CircleGeometry(0.06, 16);
  const dotMat = new THREE.MeshPhongMaterial({
    color: 0x8B4513,  // Saddle brown
    shininess: 20,
    side: THREE.DoubleSide
  });
  [7, 12].forEach(z => {
    [-1.0, -0.5, 0, 0.5, 1.0].forEach(x => {
      const dot = new THREE.Mesh(dotGeo, dotMat);
      dot.rotation.x = -Math.PI / 2;
      dot.position.set(x, 0.101, z);
      dot.receiveShadow = true;
      dot.castShadow = true;
      scene.add(dot);
    });
  });
}

function createBowlingPins() {
  
  const deckGeo = new THREE.BoxGeometry(3.5, 0.01, 3.5); 
  const deckMat = new THREE.MeshPhongMaterial({ color: 0xE8D5A3, shininess: 30 });
  const deck = new THREE.Mesh(deckGeo, deckMat);
  
  
  deck.position.set(0, 0.101, -58.25); 
  deck.receiveShadow = true;
  scene.add(deck);

  // Half cross-section profile for LatheGeometry.
  // Each Vector2 is (radius, height) in pin-local space.
  // First/last point at radius=0 closes the bottom and top caps naturally.
  const pinProfile = [
    new THREE.Vector2(0.00, 0.00),   // base centre – closes bottom
    new THREE.Vector2(0.09, 0.00),   // base rim
    new THREE.Vector2(0.11, 0.03),   // lower body
    new THREE.Vector2(0.17, 0.12),   // body widening
    new THREE.Vector2(0.195, 0.25),  // approaching belly
    new THREE.Vector2(0.20,  0.35),  // widest point – belly
    new THREE.Vector2(0.195, 0.45),  // past belly, narrowing
    new THREE.Vector2(0.17,  0.58),  // upper body
    new THREE.Vector2(0.13,  0.72),  // narrowing toward neck
    new THREE.Vector2(0.09,  0.85),  // neck – narrowest point
    new THREE.Vector2(0.095, 0.92),  // base of head
    new THREE.Vector2(0.13,  1.02),  // head widening
    new THREE.Vector2(0.135, 1.10),  // head peak
    new THREE.Vector2(0.11,  1.19),  // top of head, tapering
    new THREE.Vector2(0.04,  1.24),  // near tip
    new THREE.Vector2(0.00,  1.25),  // tip – closes top
  ];

  const pinBodyGeo = new THREE.LatheGeometry(pinProfile, 24);
  const pinBodyMat = new THREE.MeshPhongMaterial({ color: 0xffffff, shininess: 100 });
  const pinBody = new THREE.Mesh(pinBodyGeo, pinBodyMat);
  pinBody.castShadow = true;
  pinBody.receiveShadow = true;

  // Red neck stripe – thin cylinder radius 0.107, just wider than the neck (0.09),
  // so it sits proud of the pin surface without Z-fighting. Centred at pin-local y=0.875.
  const stripeGeo = new THREE.CylinderGeometry(0.107, 0.107, 0.075, 24);
  const stripeMat = new THREE.MeshPhongMaterial({ color: 0xcc0000, shininess: 60 });
  const stripe = new THREE.Mesh(stripeGeo, stripeMat);
  stripe.position.y = 0.875;
  stripe.castShadow = true;
  stripe.receiveShadow = true;

  // Build template group ONCE; .clone() creates independent copies for each pin
  const basePinGroup = new THREE.Group();
  basePinGroup.add(pinBody);
  basePinGroup.add(stripe);

  // Standard 10-pin triangular formation (from assignment spec).
  // Lane top is Y=0.1; pin base is at local Y=0, so world PIN_Y=0.1 is flush.
  const PIN_Y = 0.1;
  const pinPositions = [
    { x:  0.0, z: -57.000 },  // 1 – head pin (centre, aligns with approach-dot funnel)
    { x: -0.5, z: -57.866 },  // 2
    { x:  0.5, z: -57.866 },  // 3
    { x: -1.0, z: -58.732 },  // 4
    { x:  0.0, z: -58.732 },  // 5
    { x:  1.0, z: -58.732 },  // 6
    { x: -1.5, z: -59.598 },  // 7
    { x: -0.5, z: -59.598 },  // 8
    { x:  0.5, z: -59.598 },  // 9
    { x:  1.5, z: -59.598 },  // 10
  ];

  pinPositions.forEach(({ x, z }) => {
    const pin = basePinGroup.clone();
    pin.position.set(x, PIN_Y, z);
    // traverse() walks every node in the cloned subtree (body + stripe) and
    // sets shadow flags explicitly, rather than relying on clone() propagation.
    pin.traverse(child => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    scene.add(pin);
  });
}

// Create all elements
createBowlingLane();
createBowlingPins();

// Set camera position for bowler's perspective
const cameraTranslate = new THREE.Matrix4();
cameraTranslate.makeTranslation(0, 5, 12);
camera.applyMatrix4(cameraTranslate);

// Orbit controls – must be `let` so handleKeyDown can re-instantiate it on toggle
const controls = new OrbitControls(camera, renderer.domElement);
let isOrbitEnabled = true;

// Instructions display
const instructionsElement = document.createElement('div');
instructionsElement.style.position = 'absolute';
instructionsElement.style.bottom = '20px';
instructionsElement.style.left = '20px';
instructionsElement.style.color = 'white';
instructionsElement.style.fontSize = '16px';
instructionsElement.style.fontFamily = 'Arial, sans-serif';
instructionsElement.style.textAlign = 'left';
instructionsElement.innerHTML = `
  <h3>Bowling Alley Controls:</h3>
  <p>O - Toggle orbit camera</p>
`;
document.body.appendChild(instructionsElement);

// Handle key events
function handleKeyDown(e) {
  if (e.code === "KeyO") {
    isOrbitEnabled = !isOrbitEnabled;
    controls.enabled = isOrbitEnabled; // זה מה שמקפיא את המצלמה בתוך הספרייה
  }
}

document.addEventListener('keydown', handleKeyDown);

// Animation function
function animate() {
  requestAnimationFrame(animate);

  // Guard: update() has no internal `enabled` check – it unconditionally flushes
  // sphericalDelta onto the camera matrices. Calling it on a disposed instance
  // would also throw. Only run it while orbit is active.
  if (isOrbitEnabled) controls.update();

  renderer.render(scene, camera);
}

animate();
