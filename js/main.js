/**
 * main.js – Application controller for HW05 Bowling Alley (Three.js / WebGL).
 *
 * Responsibilities:
 *   - Bootstrap Three.js engine: Renderer, Scene, Camera, Lights.
 *   - Instantiate all scene components and add them to the scene graph.
 *   - Register global event handlers: window resize, keyboard shortcuts.
 *   - Run the main animation / render loop.
 *
 * Scene components (each encapsulates its own geometry/material):
 *   BowlingLane    – full lane infrastructure (surfaces, gutters, markings).
 *   HangingSign    – neon canvas sign with metal support pillars and beam.
 *   PinFormation   – 10 bowling pins in the standard triangular layout.
 *   BowlingBall    – static ball positioned on the approach.
 *   ScorecardUI    – DOM overlay scorecard and keyboard controls panel.
 *
 * Keyboard shortcuts:
 *   O – toggle OrbitControls on / off.
 *   C – snap camera to a frontal view centred on the neon sign.
 */

import { OrbitControls } from '../src/OrbitControls.js';
import BowlingLane       from './components/BowlingLane.js';
import HangingSign       from './components/HangingSign.js';
import PinFormation      from './components/PinFormation.js';
import BowlingBall       from './components/BowlingBall.js';
import ScorecardUI       from './components/ScorecardUI.js';

const clock = new THREE.Clock();

const gameState = {
  phase:              'aiming',
  currentFrame:       1,
  currentRoll:        1,
  powerValue:         0,
  powerDirection:     1,
  ballSpeedFactor:    35,
  ballVelocity:       new THREE.Vector3(0, 0, 0),
  scores:             Array.from({ length: 10 }, () => []),
  cumulativeTotals:   Array(10).fill(null),
  pinsStanding:       Array(10).fill(true),  // true = upright, false = knocked down
  pinsFallenThisRoll: 0
};

// ── Renderer ──────────────────────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// ── Scene ─────────────────────────────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);   /* deep navy background */

// ── Camera ────────────────────────────────────────────────────────────────────
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
/* Default bowler's-eye starting position – moved back to comfortably frame the ball and approach area */
camera.position.set(0, 5, 18.0);

// ── Lights ────────────────────────────────────────────────────────────────────
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

/*
 * Primary directional light with shadow mapping.
 * Shadow frustum is tuned tightly around the lane extents to maximise
 * shadow-map resolution (2048 × 2048 px).
 */
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(5, 25, 20);
directionalLight.target.position.set(0, 0, -25);
directionalLight.castShadow                   = true;
directionalLight.shadow.camera.left           = -6;
directionalLight.shadow.camera.right          =  5;
directionalLight.shadow.camera.top            =  30;
directionalLight.shadow.camera.bottom         = -30;
directionalLight.shadow.camera.near           =  0.5;
directionalLight.shadow.camera.far            =  120;
directionalLight.shadow.mapSize.width         = 2048;
directionalLight.shadow.mapSize.height        = 2048;
scene.add(directionalLight);
scene.add(directionalLight.target);

// ── Back wall ─────────────────────────────────────────────────────────────────
/* Simple dark plane behind the pin deck, closing the visual space of the alley. */
const backWall = new THREE.Mesh(
  new THREE.PlaneGeometry(5.5, 4.0),
  new THREE.MeshPhongMaterial({
    color:     0x11161f,
    shininess: 8,
    side:      THREE.DoubleSide
  })
);
backWall.position.set(0, 2.0, -60);
backWall.receiveShadow = true;
scene.add(backWall);

// ── Scene components ──────────────────────────────────────────────────────────

/* BowlingLane and HangingSign need the renderer to query max anisotropy. */
const lane = new BowlingLane(renderer);
const sign = new HangingSign(renderer);
const pins = new PinFormation();
const ball = new BowlingBall();

/* ScorecardUI only injects DOM elements; it has no scene-graph mesh. */
const scorecardUI = new ScorecardUI();

scene.add(lane.mesh);
scene.add(sign.mesh);
scene.add(pins.mesh);
scene.add(ball.mesh);

// Wrap each pin Group child with per-pin collision and animation state.
// pins.mesh.children[i] maps to pin positions in the same order as PinFormation._placeAllPins().
const pinsArray = pins.mesh.children.map((pinMesh, index) => ({
  mesh:            pinMesh,
  index:           index,
  isToppling:      false,
  toppleDirection: new THREE.Vector3(),
  toppleRotation:  0
}));

// ── Orbit controls ────────────────────────────────────────────────────────────
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping      = true;
controls.dampingFactor      = 0.05;
controls.screenSpacePanning = true;
controls.minDistance        = 0.1;
controls.maxDistance        = 150;

// ── Keyboard shortcuts ────────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.code === 'KeyO') {
    controls.enabled = !controls.enabled;
  }

  if (e.code === 'KeyC') {
    controls.reset();
    camera.position.set(0, 4.0, -18);
    controls.target.set(0, 4.0, -30);
    controls.update();
  }

  if (e.code === 'ArrowLeft' && gameState.phase === 'aiming') {
    // Allow aiming up to ±1.76 so the player can intentionally roll a gutter ball
    ball.mesh.position.x = THREE.MathUtils.clamp(ball.mesh.position.x - 0.1, -1.76, 1.76);
  }

  if (e.code === 'ArrowRight' && gameState.phase === 'aiming') {
    ball.mesh.position.x = THREE.MathUtils.clamp(ball.mesh.position.x + 0.1, -1.76, 1.76);
  }

  if (e.code === 'Space') {
    if (gameState.phase === 'aiming') {
      gameState.phase          = 'power';
      gameState.powerValue     = 0;
      gameState.powerDirection = 1;
      controls.enabled         = false;
    } else if (gameState.phase === 'power') {
      gameState.phase = 'rolling';
      // Scale forward speed by the locked power fraction
      const forwardSpeed = gameState.powerValue * gameState.ballSpeedFactor;
      // Negative Z = towards the pins; X/Y stay flat
      gameState.ballVelocity.set(0, 0, -forwardSpeed);
    }
  }

  if (e.code === 'KeyR') {
    console.log("Reset triggered");
  }
});

// ── Collision constants ───────────────────────────────────────────────────────
const BALL_RADIUS            = 0.35;
const PIN_RADIUS             = 0.17;   // max profile radius from LatheGeometry (~0.17 at belly)
const COLLISION_THRESHOLD    = BALL_RADIUS + PIN_RADIUS;  // ~0.52 units
const PIN_PROPAGATION_RADIUS = 0.85;   // neighbor topple radius (1 unit centre-to-centre spacing)

// ── Pin collision detection ───────────────────────────────────────────────────
function checkCollisions() {
  pinsArray.forEach(pin => {
    // Skip pins already in motion or already down
    if (!gameState.pinsStanding[pin.index] || pin.isToppling) return;

    // Horizontal 2D distance on the X/Z plane
    const dx   = ball.mesh.position.x - pin.mesh.position.x;
    const dz   = ball.mesh.position.z - pin.mesh.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist < COLLISION_THRESHOLD) {
      // Topple this pin away from the ball's incoming direction
      pin.isToppling = true;
      pin.toppleDirection.copy(pin.mesh.position).sub(ball.mesh.position).setY(0).normalize();

      // Pin-to-pin propagation: immediately tip over close standing neighbors
      pinsArray.forEach(neighbor => {
        if (
          gameState.pinsStanding[neighbor.index] &&
          !neighbor.isToppling &&
          neighbor.index !== pin.index
        ) {
          const distToNeighbor = pin.mesh.position.distanceTo(neighbor.mesh.position);
          if (distToNeighbor < PIN_PROPAGATION_RADIUS) {
            neighbor.isToppling = true;
            neighbor.toppleDirection
              .copy(neighbor.mesh.position)
              .sub(pin.mesh.position)
              .setY(0)
              .normalize();
          }
        }
      });
    }
  });
}

// ── Pin toppling animation ────────────────────────────────────────────────────
function animatePins(deltaTime) {
  pinsArray.forEach(pin => {
    if (!pin.isToppling) return;

    pin.toppleRotation += deltaTime * 5.0;

    // Rotate around the axis perpendicular to the topple direction
    pin.mesh.rotation.z = -pin.toppleDirection.x * pin.toppleRotation;
    pin.mesh.rotation.x =  pin.toppleDirection.z * pin.toppleRotation;

    // Lower the base as the pin tilts so it visually settles on the deck
    pin.mesh.position.y = Math.max(0.1 - (pin.toppleRotation * 0.1), -0.1);

    // Fully fallen – past 90° of rotation
    if (pin.toppleRotation >= Math.PI / 2) {
      pin.isToppling = false;
      gameState.pinsStanding[pin.index] = false;
      gameState.pinsFallenThisRoll++;
      pins.mesh.remove(pin.mesh);   // detach from the formation group
      console.log("Pin " + (pin.index + 1) + " is down.");
    }
  });
}

// ── Physics ───────────────────────────────────────────────────────────────────
function updatePhysics(deltaTime) {
  // 1. Apply Motion: advance position by velocity × dt
  ball.mesh.position.addScaledVector(gameState.ballVelocity, deltaTime);

  // Check for pin hits on every frame the ball is in motion
  checkCollisions();

  // 2. Realistic Rolling Rotation: spin the ball around X-axis proportional to speed
  const ballRadius         = 0.35;
  const currentForwardSpeed = Math.abs(gameState.ballVelocity.z);
  if (currentForwardSpeed > 0) {
    ball.mesh.rotation.x -= (currentForwardSpeed / ballRadius) * deltaTime;
  }

  // 3. Rolling Friction: gentle deceleration so light throws still reach the pins
  if (gameState.ballVelocity.z < 0) {
    gameState.ballVelocity.z += 0.4 * deltaTime;
    if (gameState.ballVelocity.z > 0) gameState.ballVelocity.z = 0;
  }

  // 4. Gutter Snap: only triggers after the ball crosses the foul line (Z <= 0)
  if (ball.mesh.position.z <= 0 && Math.abs(ball.mesh.position.x) >= 1.75) {
    // Determine which channel (left or right) and snap to its exact centre line
    const side = ball.mesh.position.x > 0 ? 1 : -1;
    ball.mesh.position.x = side * 2.0;   // centre of the gutter channel geometry
    ball.mesh.position.y = 0.22;         // rests the ball bottom on the gutter floor
    gameState.ballVelocity.x = 0;        // kill all lateral drift
  }

  // 5. End-of-Roll: ball cleared the pin deck or came to a full stop
  if (ball.mesh.position.z < -61.5 || currentForwardSpeed === 0) {
    gameState.phase = 'resolving';
    gameState.ballVelocity.set(0, 0, 0);
    console.log("Roll finished. Entering resolving phase.");
  }
}

// ── Window resize ─────────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ── Render loop ───────────────────────────────────────────────────────────────
/*
 * controls.update() must be called every frame when enableDamping is true
 * so the inertia animation can finish after the user releases the mouse.
 */
function animate() {
  requestAnimationFrame(animate);
  const deltaTime = clock.getDelta();

  if (gameState.phase === 'rolling') {
    updatePhysics(deltaTime);
  }

  if (gameState.phase === 'power') {
    gameState.powerValue += gameState.powerDirection * deltaTime * 2.0;
    if (gameState.powerValue >= 1.0) {
      gameState.powerValue     = 1.0;
      gameState.powerDirection = -1;
    } else if (gameState.powerValue <= 0.0) {
      gameState.powerValue     = 0.0;
      gameState.powerDirection = 1;
    }
  }

  // Animate toppling pins every frame regardless of current phase
  animatePins(deltaTime);

  scorecardUI.updatePowerMeterUI(gameState.phase, gameState.powerValue);

  controls.update();
  renderer.render(scene, camera);
}
animate();
