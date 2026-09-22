/* Focused runtime QA fixes for the existing Solitaire 3D implementation. */
(function installSolitaireQAFixes() {
  'use strict';

  function whenReady(fn) {
    var tries = 0;
    (function wait() {
      if (window.game && window.controller && window.renderer && window.camera && window.POS) {
        fn();
        return;
      }
      if (++tries < 120) setTimeout(wait, 100);
    }());
  }

  whenReady(function () {
    var stockButton = document.createElement('button');
    stockButton.type = 'button';
    stockButton.id = 'stock-recycle-button';
    stockButton.setAttribute('aria-label', 'Draw from stock or recycle waste');
    stockButton.title = 'Draw cards';
    document.body.appendChild(stockButton);

    var style = document.createElement('style');
    style.textContent = [
      '#stock-recycle-button{position:fixed;z-index:20;display:flex;align-items:center;justify-content:center;width:clamp(58px,12vw,108px);height:clamp(78px,18vw,150px);padding:6px;border:2px dashed rgba(255,255,255,.38);border-radius:12px;background:rgba(0,0,0,.16);color:#fff;font:700 clamp(10px,2vw,15px)/1.15 system-ui,sans-serif;text-align:center;text-shadow:0 2px 4px #000;cursor:pointer;touch-action:manipulation;transition:opacity .2s,background .2s,border-color .2s,transform .2s}',
      '#stock-recycle-button.empty{border-color:#ffd700;background:rgba(255,215,0,.18);box-shadow:0 0 18px rgba(255,215,0,.35);animation:stockPulse 1.6s ease-in-out infinite}',
      '#stock-recycle-button:active{transform:scale(.94)}',
      '@keyframes stockPulse{50%{box-shadow:0 0 28px rgba(255,215,0,.65)}}',
      '@media (max-width:600px){#controls{max-height:29vh;overflow-y:auto;align-content:flex-end;padding-bottom:env(safe-area-inset-bottom)}.ctrl-btn,.icon-btn{min-height:44px}.hud{padding-left:8px;padding-right:8px}.hud-group{gap:6px}.modal-box{max-height:88vh;padding:20px}}',
      '@media (orientation:portrait){#game-container canvas{filter:brightness(1.16) saturate(1.08)}#stock-recycle-button{width:72px;height:100px}}'
    ].join('');
    document.head.appendChild(style);

    function projectStock() {
      var v = new THREE.Vector3(window.POS.stock.x, 0.08, window.POS.stock.z);
      v.project(window.camera);
      var w = innerWidth, h = innerHeight;
      var bw = stockButton.offsetWidth, bh = stockButton.offsetHeight;
      stockButton.style.left = Math.round((v.x * .5 + .5) * w - bw / 2) + 'px';
      stockButton.style.top = Math.round((-v.y * .5 + .5) * h - bh / 2) + 'px';
    }

    function refreshStockButton() {
      if (!window.controller || !controller.state) return;
      var empty = controller.state.stock.length === 0;
      var recyclable = empty && controller.state.waste.length > 0;
      stockButton.classList.toggle('empty', recyclable);
      stockButton.disabled = !recyclable && empty;
      stockButton.style.opacity = empty && !recyclable ? '.25' : '1';
      stockButton.textContent = recyclable ? '↻\nRECYCLE' : (empty ? 'STOCK' : '');
      stockButton.title = recyclable ? 'Recycle waste back into the stock' : 'Draw cards';
      projectStock();
    }

    stockButton.addEventListener('click', function () {
      if (!controller.state || (controller.state.stock.length === 0 && controller.state.waste.length === 0)) {
        if (window.ui) ui.toast('The stock is empty');
        return;
      }
      var wasRecycle = controller.state.stock.length === 0;
      var result = game && game.draw ? (game.draw(), null) : null;
      // game.draw owns the normal UI/audio path; the state is refreshed below.
      if (wasRecycle) {
        AudioSys.play('draw');
        ui.toast('Waste recycled — keep playing');
      }
      refreshStockButton();
    });

    var oldSyncRender = window.syncRender;
    if (typeof oldSyncRender === 'function') {
      window.syncRender = function () {
        var r = oldSyncRender.apply(this, arguments);
        refreshStockButton();
        return r;
      };
    }

    function improveViewport() {
      projectStock();
      if (window.scene) {
        var portrait = innerHeight > innerWidth;
        scene.traverse(function (obj) {
          if (obj.isAmbientLight) obj.intensity = portrait ? .62 : .45;
          if (obj.isDirectionalLight && obj !== window.keyLight) obj.intensity = portrait ? .42 : .3;
        });
      }
    }
    addEventListener('resize', improveViewport, { passive: true });
    addEventListener('orientationchange', function () { setTimeout(improveViewport, 180); }, { passive: true });
    setTimeout(function () { refreshStockButton(); improveViewport(); }, 50);
  });
}());
