/* ═══════════════════════════════════════════════
   MENÚ FLOTANTE — usa las funciones globales de CATAVI.js:
   window.setAmbientTheme('claro' | 'oscuro')
   window.openPanel('mundo')
═══════════════════════════════════════════════ */
(function () {
  const HISTORIA_URL = './historia/historia.html';
  const GALERIA_URL  = './3dGaleria/galeria.html';

  const $ = id => document.getElementById(id);
  const dock     = $('deco-mundo');
  const themeBtn = $('dock-theme');
  const menuBtn  = $('dock-menu');
  const worldBtn = $('dock-mundo');
  const fan      = $('fan-modo');
  const drop     = $('dock-drop');
  if (!dock || !themeBtn || !menuBtn || !worldBtn || !fan || !drop) return;

  let theme = 'claro'; // CATAVI.js arranca en modo claro

  function setOpen(panel, btn, open) {
    panel.classList.toggle('open', open);
    btn.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', String(open));
  }
  function closeAll() {
    setOpen(fan, themeBtn, false);
    setOpen(drop, menuBtn, false);
  }

  function refreshTheme() {
    themeBtn.classList.toggle('is-dark', theme === 'oscuro');
    fan.querySelectorAll('.fan-item').forEach(b =>
      b.classList.toggle('active', b.dataset.theme === theme));
  }
  refreshTheme();

  /* Botón 1: Modo → abanico Claro / Oscuro */
  themeBtn.addEventListener('click', e => {
    e.stopPropagation();
    const open = !fan.classList.contains('open');
    setOpen(drop, menuBtn, false);
    setOpen(fan, themeBtn, open);
  });
  fan.querySelectorAll('.fan-item').forEach(b => {
    b.addEventListener('click', () => {
      theme = b.dataset.theme;
      if (window.setAmbientTheme) window.setAmbientTheme(theme);
      refreshTheme();
      closeAll();
    });
  });

  /* Botón 2: Menú → caja con Historia y Galería */
  menuBtn.addEventListener('click', e => {
    e.stopPropagation();
    const open = !drop.classList.contains('open');
    setOpen(fan, themeBtn, false);
    setOpen(drop, menuBtn, open);
  });
  $('pop-historia').addEventListener('click', () => {
    closeAll();
    window.location.href = HISTORIA_URL;
  });
  $('pop-galeria').addEventListener('click', () => {
    closeAll();
    window.location.href = GALERIA_URL;
  });

  /* Botón 3: Mundo */
  worldBtn.addEventListener('click', () => {
    closeAll();
    if (window.openPanel) window.openPanel('mundo');
  });

  /* Cierra al tocar fuera o con Escape */
  document.addEventListener('click', e => {
    if (!dock.contains(e.target)) closeAll();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeAll();
  });
})();