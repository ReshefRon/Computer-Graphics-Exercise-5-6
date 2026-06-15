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
  phase:          'aiming',
  currentFrame:   1,
  currentRoll:    1,
  powerValue:     0,
  powerDirection: 1,
  ballSpeedFactor: 35,
  ballVelocity:   new THREE.Vector3(0, 0, 0),
  scores:         Array.from({ length: 10 }, () => []),
  cumulativeTotals: Array(10).fill(null)
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
/* Default bowler's-eye starting position */
camera.position.set(0, 5, 12);

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
    ball.mesh.position.x = Math.max(-1.5, ball.mesh.position.x - 0.1);
  }

  if (e.code === 'ArrowRight' && gameState.phase === 'aiming') {
    ball.mesh.position.x = Math.min(1.5, ball.mesh.position.x + 0.1);
  }

  if (e.code === 'Space') {
    if (gameState.phase === 'aiming') {
      gameState.phase          = 'power';
      gameState.powerValue     = 0;
      gameState.powerDirection = 1;
      controls.enabled         = false;
    } else if (gameState.phase === 'power') {
      gameState.phase = 'rolling';
    }
  }

  if (e.code === 'KeyR') {
    console.log("Reset triggered");
  }
});

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

  scorecardUI.updatePowerMeterUI(gameState.phase, gameState.powerValue);

  controls.update();
  renderer.render(scene, camera);
}
animate();
