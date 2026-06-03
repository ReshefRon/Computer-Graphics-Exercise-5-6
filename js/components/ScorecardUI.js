/**
 * ScorecardUI – DOM overlay components for the bowling scorecard and controls panel.
 *
 * Injects two absolutely-positioned cards over the WebGL canvas:
 *
 *   #scorecard      (top-centre)   – 10-frame bowling score tracking grid.
 *                                    Frames 1-9 have two shot boxes each;
 *                                    frame 10 has three boxes for the bonus ball.
 *
 *   #controls-card  (bottom-left)  – keyboard shortcut reference panel.
 *                                    Active controls are fully opaque; future
 *                                    HW06 controls are muted and italicised.
 *
 * This component is purely DOM-based.  It has no `.mesh` property and does not
 * interact with the Three.js scene graph.  All visual styles are defined in
 * style.css (`.bowling-ui-card`, `.frame`, `.key-badge`, etc.).
 */
export default class ScorecardUI {

  constructor() {
    this._buildScorecard();
    this._buildControlsCard();
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  _buildScorecard() {
    /*
     * Generate frame HTML.
     * Frames 1-9: two shot boxes (ball 1, ball 2).
     * Frame 10:   three shot boxes (ball 1, ball 2, bonus ball).
     */
    const regularFrames = Array.from({ length: 9 }, (_, i) => `
      <div class="frame">
        <div class="frame-label">${i + 1}</div>
        <div class="frame-shots">
          <div class="shot-box">-</div>
          <div class="shot-box">-</div>
        </div>
        <div class="frame-total">-</div>
      </div>`).join('');

    const tenthFrame = `
      <div class="frame">
        <div class="frame-label">10</div>
        <div class="frame-shots">
          <div class="shot-box">-</div>
          <div class="shot-box">-</div>
          <div class="shot-box">-</div>
        </div>
        <div class="frame-total">-</div>
      </div>`;

    const scorecard = document.createElement('div');
    scorecard.id        = 'scorecard';
    scorecard.className = 'bowling-ui-card';
    scorecard.innerHTML = `
      <h2>Scorecard</h2>
      <div class="score-frames">${regularFrames}${tenthFrame}</div>`;
    document.body.appendChild(scorecard);
  }

  _buildControlsCard() {
    const controlsCard = document.createElement('div');
    controlsCard.id        = 'controls-card';
    controlsCard.className = 'bowling-ui-card';
    controlsCard.innerHTML = `
      <h3>Controls</h3>

      <div class="control-row">
        <span class="key-badge">O</span>
        <span class="control-label">Toggle orbit camera</span>
      </div>

      <div class="control-row">
        <span class="key-badge">C</span>
        <span class="control-label">Front view – neon sign</span>
      </div>

      `;
    document.body.appendChild(controlsCard);
  }
}
