/**
 * BowlingBall – self-contained bowling ball component.
 *
 * Builds a shiny sphere (radius 0.35) with three finger-hole cylinders
 * embedded flush on the surface.  All geometry is parented inside a
 * THREE.Group exposed via the public `.mesh` property.
 *
 * Shadow policy (prevents interior shadow artifacts on the holes):
 *   - Main sphere mesh:   castShadow = receiveShadow = true
 *   - Finger hole meshes: castShadow = receiveShadow = false
 *
 * World position: (0, 0.45, 12)
 *   Lane surface Y = 0.1, ball radius = 0.35  →  centre Y = 0.1 + 0.35 = 0.45
 *   Z = 12 places the ball in the approach area, centred on the lane.
 */
export default class BowlingBall {

  constructor() {
    /**
     * Root group.  Add `ball.mesh` directly to the scene.
     * @type {THREE.Group}
     */
    this.mesh = new THREE.Group();
    this._build();
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  _build() {
    this._buildSphere();
    this._buildFingerHoles();

    /* Position the entire group so the ball rests flush on the approach deck. */
    this.mesh.position.set(0, 0.45, 12);
  }

  _buildSphere() {
    const ballGeo = new THREE.SphereGeometry(0.35, 32, 32);
    const ballMat = new THREE.MeshPhongMaterial({
      color:     0x1a2b8a,   /* deep cobalt blue */
      shininess: 90,
      specular:  0x4444cc
    });

    const ballMesh = new THREE.Mesh(ballGeo, ballMat);
    ballMesh.castShadow    = true;
    ballMesh.receiveShadow = true;
    this.mesh.add(ballMesh);
  }

  _buildFingerHoles() {
    /* Shared geometry/material reused for all three holes. */
    const holeGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.08, 16);
    const holeMat = new THREE.MeshPhongMaterial({ color: 0x111111, shininess: 5 });

    /*
     * Each tuple is the unnormalised direction vector pointing outward from
     * the ball centre toward the hole opening.  The cylinder is placed so its
     * outer rim sits exactly flush with the sphere surface (r = 0.35).
     *
     * Placement formula:
     *   centre = normalise(dir) * 0.35   – surface contact point
     *           + normalise(dir) * -0.04  – half-depth inward offset
     *         = normalise(dir) * 0.31
     */
    const holeDirections = [
      [ 0.25,  0.93,  0.17],   /* ring finger  */
      [-0.25,  0.93,  0.17],   /* middle finger */
      [ 0.00,  0.87, -0.30],   /* thumb         */
    ];

    holeDirections.forEach(([dx, dy, dz]) => {
      this._addHole(dx, dy, dz, holeGeo, holeMat);
    });
  }

  /**
   * Positions and orients a single hole cylinder flush on the sphere surface.
   *
   * @param {number}               dx   X component of the surface direction vector.
   * @param {number}               dy   Y component.
   * @param {number}               dz   Z component.
   * @param {THREE.CylinderGeometry} geo  Shared hole geometry instance.
   * @param {THREE.Material}         mat  Shared hole material instance.
   */
  _addHole(dx, dy, dz, geo, mat) {
    const outward = new THREE.Vector3(dx, dy, dz).normalize();
    const inward  = outward.clone().negate();

    const hole = new THREE.Mesh(geo, mat);

    /* Surface point + half-depth inward = cylinder centre. */
    hole.position
      .copy(outward).multiplyScalar(0.35)
      .addScaledVector(inward, 0.04);

    /* Rotate default Y-up cylinder axis to align with the inward normal. */
    hole.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), inward);

    /* Holes must NOT cast or receive shadows to avoid interior artifacts. */
    hole.castShadow    = false;
    hole.receiveShadow = false;

    this.mesh.add(hole);
  }
}
