/**
 * PinFormation – generates all 10 bowling pins in the standard triangular layout.
 *
 * A single base pin template is built once (LatheGeometry body + CylinderGeometry
 * neck stripe), then cloned to each of the 10 world positions using THREE.Group.clone().
 * Shadow flags are set on every cloned mesh via traverse().
 *
 * The entire formation is parented under a single THREE.Group exposed via `.mesh`.
 *
 * Pin dimensions:
 *   Total height: 1.25 units (profile closes at Y = 1.25)
 *   Base width:   ~0.20 radius at the belly
 *   Neck radius:  ~0.09 (narrowest point at Y ≈ 0.85)
 *
 * Formation spacing: 0.866 units between rows (equilateral triangle geometry,
 * centre-to-centre pin distance = 1.0 unit).
 */
export default class PinFormation {

  constructor() {
    /**
     * Root group containing all 10 individual pin groups.
     * Add `pins.mesh` directly to the scene.
     * @type {THREE.Group}
     */
    this.mesh = new THREE.Group();
    this._build();
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  _build() {
    const template = this._createPinTemplate();
    this._placeAllPins(template);
  }

  /**
   * Constructs the base pin group used as a clone source.
   * The group is never added to the scene directly; .clone() is called on it.
   *
   * @returns {THREE.Group}
   */
  _createPinTemplate() {
    /*
     * LatheGeometry profile: each Vector2 is (radius, height) swept 360°
     * around the Y axis.  Closing at radius = 0 caps both ends cleanly.
     */
    const profile = [
      new THREE.Vector2(0.00,  0.00),   /* base centre cap              */
      new THREE.Vector2(0.09,  0.00),   /* base edge                    */
      new THREE.Vector2(0.11,  0.03),   /* base shoulder start          */
      new THREE.Vector2(0.17,  0.12),   /* lower belly rising           */
      new THREE.Vector2(0.195, 0.25),   /* belly widening               */
      new THREE.Vector2(0.20,  0.35),   /* maximum belly width          */
      new THREE.Vector2(0.195, 0.45),   /* belly narrowing toward neck  */
      new THREE.Vector2(0.17,  0.58),   /* upper belly                  */
      new THREE.Vector2(0.13,  0.72),   /* waist                        */
      new THREE.Vector2(0.09,  0.85),   /* narrowest neck point         */
      new THREE.Vector2(0.095, 0.92),   /* slight neck flare            */
      new THREE.Vector2(0.13,  1.02),   /* head base                    */
      new THREE.Vector2(0.135, 1.10),   /* head equator                 */
      new THREE.Vector2(0.11,  1.19),   /* head tapering                */
      new THREE.Vector2(0.04,  1.24),   /* top shoulder                 */
      new THREE.Vector2(0.00,  1.25),   /* top centre cap               */
    ];

    const pinBodyGeo = new THREE.LatheGeometry(profile, 24);
    const pinBodyMat = new THREE.MeshPhongMaterial({ color: 0xffffff, shininess: 100 });
    const pinBody    = new THREE.Mesh(pinBodyGeo, pinBodyMat);
    pinBody.castShadow    = true;
    pinBody.receiveShadow = true;

    /*
     * Neck stripe: a thin red cylinder whose radius (0.107) slightly exceeds
     * the neck geometry (0.09) to float above and avoid Z-fighting artefacts.
     */
    const stripeGeo = new THREE.CylinderGeometry(0.107, 0.107, 0.075, 24);
    const stripeMat = new THREE.MeshPhongMaterial({ color: 0xcc0000, shininess: 60 });
    const stripe    = new THREE.Mesh(stripeGeo, stripeMat);
    stripe.position.y    = 0.875;   /* centred on the narrowest neck section */
    stripe.castShadow    = true;
    stripe.receiveShadow = true;

    const template = new THREE.Group();
    template.add(pinBody);
    template.add(stripe);
    return template;
  }

  /**
   * Clones the template into all 10 positions of the standard 1-2-3-4 formation.
   * Shadow flags are re-applied after cloning because clone() does not preserve them.
   *
   * @param {THREE.Group} template  Base pin group to clone.
   */
  _placeAllPins(template) {
    /*
     * World positions (foul line = Z = 0).
     * Pin numbering convention: 1 = head pin, 7-10 = back row.
     * Row Z-delta = 0.866 (equilateral triangle with 1.0 unit side length).
     */
    const PIN_Y = 0.1;   /* sits on the pin deck (Y = 0.112 surface + minor clearance) */

    const positions = [
      { x:  0.0, z: -57.000 },   /* pin  1 – head pin */
      { x: -0.5, z: -57.866 },   /* pin  2            */
      { x:  0.5, z: -57.866 },   /* pin  3            */
      { x: -1.0, z: -58.732 },   /* pin  4            */
      { x:  0.0, z: -58.732 },   /* pin  5            */
      { x:  1.0, z: -58.732 },   /* pin  6            */
      { x: -1.5, z: -59.598 },   /* pin  7            */
      { x: -0.5, z: -59.598 },   /* pin  8            */
      { x:  0.5, z: -59.598 },   /* pin  9            */
      { x:  1.5, z: -59.598 },   /* pin 10            */
    ];

    positions.forEach(({ x, z }) => {
      const pin = template.clone();
      pin.position.set(x, PIN_Y, z);

      /* Restore shadow flags on every mesh inside the cloned group. */
      pin.traverse(child => {
        if (child.isMesh) {
          child.castShadow    = true;
          child.receiveShadow = true;
        }
      });

      this.mesh.add(pin);
    });
  }
}
