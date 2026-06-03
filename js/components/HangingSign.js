/**
 * HangingSign – high-DPI neon canvas sign with metal support framework.
 *
 * Canvas pipeline:
 *   1. A 2048 × 512 px canvas provides high resolution at lane distances.
 *   2. Pink outer glow is painted via a wide stroke with shadowBlur = 8.
 *   3. A sharp white core fill is laid over the glow with shadowBlur = 2.
 *   4. The canvas is wrapped in a THREE.CanvasTexture with full anisotropy.
 *   5. The plane mesh uses a MeshPhongMaterial with an emissive self-lit pass
 *      (emissiveIntensity = 1.1) so the sign glows even in unlit areas.
 *
 * Support structure:
 *   Two vertical metal pillars at X = ±2.5, plus a horizontal cross-beam
 *   connecting their tops at Y = 5.5.  All positioned at Z = -30.
 *
 * All geometry (sign plane + pillars + beam) is parented to a single
 * THREE.Group exposed via the `.mesh` property.
 *
 * @param {THREE.WebGLRenderer} renderer  Required for max anisotropy query.
 */
export default class HangingSign {

  /**
   * @param {THREE.WebGLRenderer} renderer
   */
  constructor(renderer) {
    /**
     * Root group for the sign and its support hardware.
     * Add `sign.mesh` directly to the scene.
     * @type {THREE.Group}
     */
    this.mesh      = new THREE.Group();
    this._renderer = renderer;
    this._build();
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  _build() {
    this._buildSignPlane();
    this._buildSupportStructure();
  }

  _buildSignPlane() {
    /* ── Canvas: 2048 × 512 for crisp text at full lane depth ── */
    const canvas  = document.createElement('canvas');
    canvas.width  = 2048;
    canvas.height = 512;
    const ctx     = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.font         = "bold 160px 'Impact', 'Arial Black', sans-serif";
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';

    /* Pass 1: pink glow – wide stroke with moderate blur for neon halo effect */
    ctx.shadowColor = '#ff007f';
    ctx.shadowBlur  = 8;          /* kept low to maintain crisp text contrast */
    ctx.strokeStyle = '#ff007f';
    ctx.lineWidth   = 20;
    ctx.strokeText('Ron x Dor  Bowling', canvas.width / 2, canvas.height / 2);

    /* Pass 2: sharp white core – minimal blur so letterforms stay readable */
    ctx.shadowBlur  = 2;
    ctx.shadowColor = '#ffffff';
    ctx.fillStyle   = '#ffffff';
    ctx.fillText('Ron x Dor  Bowling', canvas.width / 2, canvas.height / 2);

    /* ── Texture setup ── */
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter   = THREE.LinearMipmapLinearFilter;
    texture.magFilter   = THREE.LinearFilter;
    texture.anisotropy  = this._renderer.capabilities.getMaxAnisotropy();
    texture.needsUpdate = true;

    /* ── Self-emissive material: sign glows regardless of scene lighting ── */
    const signMat = new THREE.MeshPhongMaterial({
      map:               texture,
      transparent:       true,
      emissive:          new THREE.Color(0xff007f),
      emissiveMap:       texture,
      emissiveIntensity: 1.1,      /* strong enough to saturate the pink in shadows */
      side:              THREE.DoubleSide
    });

    /* Physical plane: 5.2 wide × 1.3 tall, centred on the back-wall axis */
    const neonSign = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 1.3), signMat);
    neonSign.position.set(0, 4.2, -30);
    this.mesh.add(neonSign);
  }

  _buildSupportStructure() {
    const metalMat = new THREE.MeshPhongMaterial({
      color:     0x222222,
      shininess: 80,
      specular:  0x555555
    });

    /* Two vertical pillars: radius 0.06, height 5.5, at X = ±2.5 */
    const pillarGeo = new THREE.CylinderGeometry(0.06, 0.06, 5.5, 16);
    [-1, 1].forEach(side => {
      const pillar = new THREE.Mesh(pillarGeo, metalMat);
      pillar.position.set(side * 2.5, 2.75, -30);   /* Y = 5.5/2 = centred on height */
      pillar.castShadow    = true;
      pillar.receiveShadow = true;
      this.mesh.add(pillar);
    });

    /* Horizontal cross-beam: radius 0.04, length 5.0, connecting pillar tops */
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 5.0, 16), metalMat
    );
    beam.rotation.z = Math.PI / 2;   /* rotate from vertical to horizontal */
    beam.position.set(0, 5.5, -30);  /* sits at the top of both pillars     */
    beam.castShadow = true;
    this.mesh.add(beam);
  }
}
