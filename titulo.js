/* titulo3d.js — efecto de texto con profundidad (DepthText) para el título de la página.
   Apila copias del texto en 3D, las inclina con el mouse (o en órbita suave)
   y las hace "crecer" al entrar. Mantiene los colores originales del título. */
(function () {
  'use strict';

  // ---- Ajustes ----
  const CAPAS = 28;               // más capas = más suave (y más pesado)
  const PROFUNDIDAD = 1.1;        // grosor de cada capa en px (grosor total = CAPAS x PROFUNDIDAD)
  const COLOR_PROFUNDO = '#0a1a33';   // color del fondo de la extrusión (los lados se oscurecen hacia él)
  const COLOR_CARA = '#ffffff';       // color del texto normal (blanco)
  const COLOR_CARA_AZUL = '#7cc8ff';  // color del <span> (Siglo XX): celeste
  const INCLINACION = 7.5;        // grados de inclinación máxima
  const SUAVIZADO = 0.14;         // 0.02 = muy lento · 0.35 = muy rápido
  const ORBITA_VEL = 0.35;        // velocidad del balanceo automático
  const PERSPECTIVA = 900;        // px
  const INTRO_MS = 1200;          // duración de la aparición
  const INTRO_RETRASO = 700;      // espera antes de empezar (coincide con la aparición del título)

  const el = document.querySelector('[data-titulo3d]');
  if (!el) return;

  const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
  const html = el.innerHTML;

  const raiz = document.createElement('span');
  raiz.className = 't3d';
  raiz.style.perspective = PERSPECTIVA + 'px';

  const escena = document.createElement('span');
  escena.className = 't3d__stage';

  // Capas de profundidad, de atrás hacia adelante
  for (let i = CAPAS; i >= 1; i--) {
    const capa = document.createElement('span');
    capa.className = 't3d__capa' + (i === CAPAS ? ' t3d__capa--fondo' : '');
    capa.setAttribute('aria-hidden', 'true');
    capa.innerHTML = html;
    const p = i / CAPAS;
    const mezcla = Math.round((1 - p * p) * 72 + 4);
    const color = (cara) =>
      'color-mix(in srgb, color-mix(in srgb, ' + cara + ' ' + mezcla + '%, ' + COLOR_PROFUNDO + ') 92%, black)';
    capa.style.color = color(COLOR_CARA);
    capa.style.setProperty('--c2', color(COLOR_CARA_AZUL));
    capa.style.transform = 'translateZ(calc(var(--grow, 1) * ' + (-i * PROFUNDIDAD).toFixed(2) + 'px))';
    escena.appendChild(capa);
  }

  const cara = document.createElement('span');
  cara.className = 't3d__cara';
  cara.innerHTML = html;
  escena.appendChild(cara);

  raiz.appendChild(escena);
  el.innerHTML = '';
  el.appendChild(raiz);

  // ---- Movimiento ----
  const reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hayMouse = window.matchMedia('(hover: hover) and (pointer: fine)').matches && !reducido;

  const base = { x: -INCLINACION * 0.32, y: INCLINACION * 0.42 };
  const actual = { x: base.x, y: base.y };
  const meta = { x: base.x, y: base.y };
  let punteroActivo = false;
  let ultimoGrow = -1;

  function aplicar() {
    escena.style.transform =
      'rotateX(' + actual.x.toFixed(3) + 'deg) rotateY(' + actual.y.toFixed(3) + 'deg)';
  }

  if (reducido) {
    escena.style.setProperty('--grow', '1');
    aplicar();
    return;
  }
  escena.style.setProperty('--grow', '0');
  aplicar();

  if (hayMouse) {
    window.addEventListener('pointermove', function (e) {
      const r = raiz.getBoundingClientRect();
      if (!r.width || !r.height) return;
      punteroActivo = true;
      const x = clamp((e.clientX - (r.left + r.width / 2)) / (r.width * 0.8), -1, 1);
      const y = clamp((e.clientY - (r.top + r.height / 2)) / (r.height * 0.8), -1, 1);
      meta.x = base.x - y * INCLINACION;
      meta.y = base.y + x * INCLINACION;
    });
    window.addEventListener('pointerout', function (e) { if (!e.relatedTarget) punteroActivo = false; });
    window.addEventListener('blur', function () { punteroActivo = false; });
  }

  const t0 = performance.now();
  const inicio = t0 + INTRO_RETRASO;

  function tick(now) {
    requestAnimationFrame(tick);
    // pausa cuando el título no se ve (modo explorar) o la pestaña está oculta
    if (document.hidden || document.body.classList.contains('explorando')) return;

    const p = clamp((now - inicio) / INTRO_MS, 0, 1);
    const grow = 1 - Math.pow(1 - p, 3);
    if (grow !== ultimoGrow) {
      ultimoGrow = grow;
      escena.style.setProperty('--grow', grow.toFixed(4));
    }

    if (!(hayMouse && punteroActivo)) {
      const orbita = ((now - t0) / 1000) * ORBITA_VEL * Math.PI * 2;
      const fuerza = hayMouse ? 0.18 : 0.55;
      meta.x = base.x + Math.sin(orbita) * INCLINACION * fuerza;
      meta.y = base.y + Math.cos(orbita * 0.85) * INCLINACION * fuerza;
    }
    actual.x += (meta.x - actual.x) * SUAVIZADO;
    actual.y += (meta.y - actual.y) * SUAVIZADO;
    aplicar();
  }
  requestAnimationFrame(tick);
})();