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
scene.add(directionalLight);

// Enable shadows
renderer.shadowMap.enabled = true;
directionalLight.castShadow = true;

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

  // Approach dots – 10 dots in a 4-3-2-1 triangular formation.
  // Wide end (4 dots) sits near the bowler; single tip dot sits near the foul line,
  // acting as a visual funnel guiding the bowler toward the centre.
  const dotGeo = new THREE.CircleGeometry(0.06, 16);
  const dotMat = new THREE.MeshPhongMaterial({
    color: 0x8B4513,  // Saddle brown
    shininess: 20,
    side: THREE.DoubleSide
  });
  const dotRows = [
    { z: 12, xs: [-0.75, -0.25, 0.25, 0.75] },  // row 1 – 4 dots (near bowler)
    { z:  9, xs: [-0.5,  0,    0.5        ] },   // row 2 – 3 dots
    { z:  6, xs: [-0.25, 0.25             ] },   // row 3 – 2 dots
    { z:  3, xs: [0                       ] },   // row 4 – 1 dot (near foul line)
  ];
  dotRows.forEach(({ z, xs }) => {
    xs.forEach(x => {
      const dot = new THREE.Mesh(dotGeo, dotMat);
      dot.rotation.x = -Math.PI / 2;
      dot.position.set(x, 0.101, z);
      dot.receiveShadow = true;
      dot.castShadow = true;
      scene.add(dot);
    });
  });
}

// Create all elements
createBowlingLane();

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
