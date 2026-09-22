/* Focused runtime QA fixes for Solitaire 3D. */
(function installSolitaireQAFixes() {
  'use strict';

  function whenReady(fn) {
    var tries = 0;
    (function wait() {
      if (window.game && window.controller && window.camera && window.POS) return fn();
      if (++tries < 150) setTimeout(wait, 100);
    }());
  }

  whenReady(function () {
    var root = document.documentElement;
    var body = document.body;

    /* Keep the game playable on small portrait screens. */
    var style = document.createElement('style');
    style.id = 'solitaire-qa-style';
    style.textContent = [
      '#ui{z-index:50;pointer-events:none}',
      '#ui>*{pointer-events:auto}',
      '#controls{z-index:60;gap:8px;padding:0 10px calc(8px + env(safe-area-inset-bottom));}',
      '.ctrl-btn,.icon-btn{min-height:44px;touch-action:manipulation;user-select:none;-webkit-user-select:none}',
      '.ctrl-btn{padding:11px 14px;white-space:nowrap}',
      '@media(max-width:600px){#controls{max-height:30vh;overflow-y:auto;align-content:flex-end}.hud-stat{min-width:54px;padding:6px 8px}.hud-value{font-size:16px}.hud-group{gap:5px}.modal-box{max-height:88vh;padding:20px}}',
      '@media(orientation:portrait){#game-container canvas{filter:brightness(1.28) saturate(1.08)}}',
      '.qa-stock-button{position:fixed;z-index:70;display:flex;align-items:center;justify-content:center;width:72px;height:100px;border:2px dashed rgba(255,255,255,.45);border-radius:12px;background:rgba(0,0,0,.18);color:#fff;font:700 12px/1.2 system-ui,sans-serif;text-align:center;text-shadow:0 2px 4px #000;touch-action:manipulation}',
      '.qa-stock-button.empty{border-color:#ffd700;background:rgba(255,215,0,.2);box-shadow:0 0 18px rgba(255,215,0,.35)}',
      '.qa-stock-button:disabled{opacity:.25;cursor:default}'
    ].join('');
    document.head.appendChild(style);

    /* Replace fragile inline handlers with direct, single-bound handlers. */
    var controls = document.querySelectorAll('#controls button');
    controls.forEach(function (button) {
      var label = (button.textContent || '').toLowerCase();
      button.removeAttribute('onclick');
      if (label.indexOf('new game') >= 0) button.addEventListener('click', function () { game.newGame(); });
      else if (label.indexOf('auto') >= 0) button.addEventListener('click', function () { game.autoComplete(); });
      else if (label.indexOf('restart') >= 0) button.addEventListener('click', function () { game.restart(); });
      else if (label.indexOf('scores') >= 0) button.addEventListener('click', function () { ui.show('scores'); });
    });

    document.querySelectorAll('.icon-btn').forEach(function (button) {
      var title = (button.getAttribute('title') || '').toLowerCase();
      button.removeAttribute('onclick');
      if (title === 'undo') button.addEventListener('click', function () { game.undo(); });
      else if (title === 'hint') button.addEventListener('click', function () { game.hint(); });
      else if (title === 'settings') button.addEventListener('click', function () { ui.show('settings'); });
    });

    var stockButton = document.createElement('button');
    stockButton.type = 'button';
    stockButton.className = 'qa-stock-button';
    stockButton.setAttribute('aria-label', 'Draw cards or recycle waste');
    body.appendChild(stockButton);

    function projectStock() {
      var v = new THREE.Vector3(window.POS.stock.x, 0.08, window.POS.stock.z);
      v.project(window.camera);
      stockButton.style.left = Math.round((v.x * .5 + .5) * innerWidth - stockButton.offsetWidth / 2) + 'px';
      stockButton.style.top = Math.round((-v.y * .5 + .5) * innerHeight - stockButton.offsetHeight / 2) + 'px';
    }

    function refreshStock() {
      if (!controller.state) return;
      var empty = controller.state.stock.length === 0;
      var recyclable = empty && controller.state.waste.length > 0;
      stockButton.disabled = empty && !recyclable;
      stockButton.classList.toggle('empty', recyclable);
      stockButton.textContent = recyclable ? '↻\nRECYCLE' : (empty ? 'STOCK EMPTY' : 'DRAW');
      stockButton.title = recyclable ? 'Recycle waste' : 'Draw cards';
      projectStock();
    }

    stockButton.addEventListener('click', function () {
      if (!controller.state) return;
      if (controller.state.stock.length === 0 && controller.state.waste.length > 0) {
        game.draw();
        if (window.ui && ui.toast) ui.toast('Waste recycled — keep playing');
      } else if (controller.state.stock.length > 0) {
        game.draw();
      }
      refreshStock();
    });

    var oldSyncRender = window.syncRender;
    if (typeof oldSyncRender === 'function') {
      window.syncRender = function () {
        var result = oldSyncRender.apply(this, arguments);
        refreshStock();
        return result;
      };
    }

    function improveViewport() {
      projectStock();
      var portrait = innerHeight > innerWidth;
      if (window.scene) scene.traverse(function (obj) {
        if (obj.isAmbientLight) obj.intensity = portrait ? 0.72 : 0.52;
        if (obj.isDirectionalLight && obj !== window.keyLight) obj.intensity = portrait ? 0.48 : 0.34;
      });
    }

    addEventListener('resize', improveViewport, { passive: true });
    addEventListener('orientationchange', function () { setTimeout(improveViewport, 200); }, { passive: true });
    setTimeout(function () { refreshStock(); improveViewport(); }, 100);
  });
}());
