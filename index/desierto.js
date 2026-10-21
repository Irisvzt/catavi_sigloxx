/* =====================================================================
   desierto.js — el mundo caminable como fondo de la página principal.
   Dibuja en su propio canvas (#canvas-desierto) que va DETRÁS del
   canvas del escudo (#tc). CATAVI.js lo controla con window.Desierto.
   ===================================================================== */
(function () {
  'use strict';

  // ================== CONFIGURACIÓN ==================
  // (las imágenes y modelos deben estar en la MISMA carpeta que CATAVI.html)
  const RUTA_SUELO     = './TEXTURA DE ARENA.jpg';
  const RUTA_MONTANAS  = './MONTAÑAS.png';
  const RUTA_PERSONAJE = './P CAMINANDO.fbx';

  const TAMANO = 2000, REPETICIONES = 100;
  const RADIO_FONDO = 900, ALTO_FONDO = 400, BAJAR_FONDO = 100;
  const VELOCIDAD = 8, GIRO = 2.2;

  const ALTURA_PERSONAJE = 3.5, ORIENTACION = 0;
  const VELOCIDAD_ANIMACION = 1, SUAVIZADO_BUCLE = 0.2;

  // Casas: 0 = CASA 1, 1 = CASA 2, 2 = CASA IZQUIERDA, 3 = CASA DERECHA
  const CASAS = ['./CASA 1.glb', './CASA 2.glb', './CASA IZQUIERDA.glb', './CASA DERECHA.glb'];
  const TAMANO_POR_MODELO       = [25, 25, 35, 25];
  const GIRO_EXTRA_POR_MODELO   = [0, 0, 0, Math.PI];
  const ALTURA_EXTRA_POR_MODELO = [0, 0, 0, 0];
  const DISTANCIA_CALLE = 26;
  const Z_CASA_DER = 40, Z_CASA_IZQ = 15, ADELANTE_NUEVAS = -27;
  const ROTACION_IZQ = 0, ROTACION_DER = Math.PI;

  // ================== COMPROBACIONES ==================
  const canvas = document.getElementById('canvas-desierto');
  if (!canvas || !window.THREE || !THREE.FBXLoader || !THREE.GLTFLoader) {
    console.warn('[Desierto] Falta #canvas-desierto o alguna librería (THREE / FBXLoader / GLTFLoader). Se usará la imagen de fondo.');
    return;   // sin window.Desierto, CATAVI.js vuelve a mostrar la imagen
  }

  // ================== ESCENA BASE ==================
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.shadowMap.enabled = true;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x9ec5e8);
  scene.fog = new THREE.Fog(0xc9b8a0, 150, 700);
  const fogBase = new THREE.Color(0xc9b8a0);   // color de niebla "de día" (se ajusta con la imagen de montañas)

  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 2000);
  camera.position.set(0, 6, -13);

  const hemi = new THREE.HemisphereLight(0xffffff, 0x8a7a66, 0.85);
  scene.add(hemi);
  const sol = new THREE.DirectionalLight(0xfff2d6, 0.9);
  sol.castShadow = true;
  sol.shadow.mapSize.set(2048, 2048);
  const sc = sol.shadow.camera;
  sc.left = -40; sc.right = 40; sc.top = 40; sc.bottom = -40; sc.near = 1; sc.far = 250;
  scene.add(sol, sol.target);

  // ================== PISO ==================
  const matSuelo = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0 });
  new THREE.TextureLoader().load(
    RUTA_SUELO,
    (tex) => {
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(REPETICIONES, REPETICIONES);
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      tex.encoding = THREE.sRGBEncoding;
      matSuelo.map = tex;
      matSuelo.needsUpdate = true;
    },
    undefined,
    () => { matSuelo.color.set(0x8b6f4e); console.warn('[Desierto] No se encontró ' + RUTA_SUELO); }
  );
  const suelo = new THREE.Mesh(new THREE.PlaneGeometry(TAMANO, TAMANO), matSuelo);
  suelo.rotation.x = -Math.PI / 2;
  suelo.receiveShadow = true;
  scene.add(suelo);

  // ================== FONDO DE MONTAÑAS ==================
  const matFondo = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.BackSide, fog: false, depthWrite: false });
  new THREE.TextureLoader().load(
    RUTA_MONTANAS,
    (tex) => {
      tex.encoding = THREE.sRGBEncoding;
      tex.wrapS = THREE.MirroredRepeatWrapping;
      const anchoImagen = ALTO_FONDO * (tex.image.width / tex.image.height);
      const vueltas = (2 * Math.PI * RADIO_FONDO) / anchoImagen;
      tex.repeat.x = Math.max(2, 2 * Math.round(vueltas / 2));
      matFondo.map = tex;
      matFondo.needsUpdate = true;

      // La niebla toma el color de la base de las montañas (el piso se funde con ellas)
      try {
        const cv = document.createElement('canvas');
        cv.width = 32; cv.height = 100;
        const cx = cv.getContext('2d');
        cx.drawImage(tex.image, 0, 0, 32, 100);
        const fila = Math.min(99, Math.max(0, Math.round((1 - BAJAR_FONDO / ALTO_FONDO) * 100)));
        const d = cx.getImageData(0, fila, 32, 1).data;
        let r = 0, g = 0, b = 0;
        for (let i = 0; i < 32; i++) { r += d[i * 4]; g += d[i * 4 + 1]; b += d[i * 4 + 2]; }
        fogBase.setRGB(r / 32 / 255, g / 32 / 255, b / 32 / 255).convertSRGBToLinear();
      } catch (e) { console.warn('[Desierto] No se pudo igualar la niebla:', e); }
    },
    undefined,
    () => { matFondo.color.set(0x6f8aa8); console.warn('[Desierto] No se encontró ' + RUTA_MONTANAS); }
  );
  const fondo = new THREE.Mesh(
    new THREE.CylinderGeometry(RADIO_FONDO, RADIO_FONDO, ALTO_FONDO, 64, 1, true),
    matFondo
  );
  fondo.position.y = ALTO_FONDO / 2 - BAJAR_FONDO;
  fondo.renderOrder = -1;
  scene.add(fondo);

  // ================== TEMA CLARO / OSCURO ==================
  const TEMAS = {
    claro:  { cielo: new THREE.Color(0x9ec5e8), tinte: new THREE.Color(1, 1, 1),          hemi: 0.85, sol: 0.9,  solColor: new THREE.Color(0xfff2d6) },
    oscuro: { cielo: new THREE.Color(0x0a1020), tinte: new THREE.Color(0.14, 0.18, 0.32), hemi: 0.28, sol: 0.28, solColor: new THREE.Color(0x9fb4ff) }
  };
  let tema = TEMAS.claro;
  const mezcla = {
    cielo: TEMAS.claro.cielo.clone(), tinte: TEMAS.claro.tinte.clone(),
    hemi: TEMAS.claro.hemi, sol: TEMAS.claro.sol, solColor: TEMAS.claro.solColor.clone()
  };
  function actualizarTema() {
    const k = 0.04;
    mezcla.cielo.lerp(tema.cielo, k);
    mezcla.tinte.lerp(tema.tinte, k);
    mezcla.solColor.lerp(tema.solColor, k);
    mezcla.hemi += (tema.hemi - mezcla.hemi) * k;
    mezcla.sol  += (tema.sol  - mezcla.sol)  * k;
    scene.background.copy(mezcla.cielo);
    matFondo.color.copy(mezcla.tinte);
    scene.fog.color.copy(fogBase).multiply(mezcla.tinte);
    hemi.intensity = mezcla.hemi;
    sol.intensity = mezcla.sol;
    sol.color.copy(mezcla.solColor);
  }

  // ================== PERSONAJE ==================
  const jugador = new THREE.Group();
  scene.add(jugador);

  let mixer = null, accionCaminar = null, huesoCadera = null, modeloGrupo = null;
  const baseCadera = new THREE.Vector3();
  const _v = new THREE.Vector3();
  const ES_RAIZ_POS = /(hips|root|pelvis|armature).*\.position$/i;

  function bloquearCadera() {
    jugador.updateMatrixWorld(true);
    huesoCadera.getWorldPosition(_v);
    modeloGrupo.worldToLocal(_v);
    _v.x = baseCadera.x;
    _v.z = baseCadera.z;
    modeloGrupo.localToWorld(_v);
    huesoCadera.parent.worldToLocal(_v);
    huesoCadera.position.copy(_v);
  }

  function cerrarBucle(clip, fraccion) {
    if (fraccion <= 0) return;
    const L = clip.duration * fraccion;
    const q0 = new THREE.Quaternion(), q1 = new THREE.Quaternion();
    clip.tracks.forEach((t) => {
      if (ES_RAIZ_POS.test(t.name)) return;
      const size = t.getValueSize(), v = t.values, tm = t.times, n = tm.length;
      if (n < 3) return;
      const T = tm[n - 1];
      for (let i = 0; i < n; i++) {
        if (tm[i] < T - L) continue;
        const w = (tm[i] - (T - L)) / L;
        const k = w * w * (3 - 2 * w);
        if (size === 4) {
          q0.fromArray(v, 0); q1.fromArray(v, i * 4); q1.slerp(q0, k); q1.toArray(v, i * 4);
        } else {
          for (let j = 0; j < size; j++) v[i * size + j] += (v[j] - v[i * size + j]) * k;
        }
      }
    });
  }

  new THREE.FBXLoader().load(
    RUTA_PERSONAJE,
    (obj) => {
      const caja = new THREE.Box3().setFromObject(obj);
      obj.scale.setScalar(ALTURA_PERSONAJE / (caja.max.y - caja.min.y));
      caja.setFromObject(obj);
      obj.position.y -= caja.min.y;

      obj.traverse((m) => {
        if (!m.isMesh) return;
        m.castShadow = true;
        m.frustumCulled = false;
        [].concat(m.material).forEach((mt) => { if (mt && mt.map) mt.map.encoding = THREE.sRGBEncoding; });
      });

      if (obj.animations.length) {
        const clip = obj.animations.find((c) => /walk|camin/i.test(c.name)) || obj.animations[0];
        cerrarBucle(clip, SUAVIZADO_BUCLE);
        mixer = new THREE.AnimationMixer(obj);
        accionCaminar = mixer.clipAction(clip);
        accionCaminar.play();
        accionCaminar.paused = true;
      }

      const modelo = new THREE.Group();
      modelo.rotation.y = ORIENTACION;
      modelo.add(obj);
      jugador.add(modelo);

      if (mixer) {
        modeloGrupo = modelo;
        mixer.update(0);
        jugador.updateMatrixWorld(true);
        let primero = null;
        obj.traverse((h) => {
          if (!h.isBone) return;
          if (!primero) primero = h;
          if (!huesoCadera && /hips|pelvis/i.test(h.name)) huesoCadera = h;
        });
        huesoCadera = huesoCadera || primero;
        if (huesoCadera) {
          huesoCadera.getWorldPosition(baseCadera);
          modelo.worldToLocal(baseCadera);
        }
      }
    },
    undefined,
    (err) => console.error('[Desierto] No se pudo cargar ' + RUTA_PERSONAJE, err)
  );

  // ================== CASAS ==================
  function cargarModelo(ruta) {
    return new Promise((resolve, reject) => {
      const ext = ruta.split('.').pop().toLowerCase();
      if (ext === 'fbx') new THREE.FBXLoader().load(ruta, resolve, undefined, reject);
      else new THREE.GLTFLoader().load(ruta, (g) => resolve(g.scene), undefined, reject);
    });
  }

  function prepararCasa(obj, tamano) {
    const caja = new THREE.Box3().setFromObject(obj);
    const tam = caja.getSize(new THREE.Vector3());
    obj.scale.multiplyScalar(tamano / Math.max(tam.x, tam.z));

    caja.setFromObject(obj);
    const centro = caja.getCenter(new THREE.Vector3());
    obj.position.x -= centro.x;
    obj.position.z -= centro.z;
    obj.updateMatrixWorld(true);

    const ys = [];
    const v = new THREE.Vector3();
    obj.traverse((m) => {
      if (!m.isMesh || !m.visible || !m.geometry.attributes.position) return;
      const pos = m.geometry.attributes.position;
      const salto = Math.max(1, Math.floor(pos.count / 4000));
      for (let i = 0; i < pos.count; i += salto) {
        v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld);
        ys.push(v.y);
      }
    });
    ys.sort((p, q) => p - q);
    const base = ys.length ? ys[Math.floor(ys.length * 0.02)] : caja.min.y;
    obj.position.y -= base;

    obj.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
    const grupo = new THREE.Group();
    grupo.add(obj);
    return grupo;
  }

  Promise.allSettled(CASAS.map(cargarModelo)).then((resultados) => {
    const bases = resultados.map((r, i) => {
      if (r.status === 'fulfilled') return prepararCasa(r.value, TAMANO_POR_MODELO[i] || 18);
      console.warn('[Desierto] No se pudo cargar la casa ' + CASAS[i], r.reason);
      return null;
    });
    const colocar = (indice, x, z, giro) => {
      if (!bases[indice]) return;
      const casa = bases[indice].clone(true);
      casa.position.set(x, ALTURA_EXTRA_POR_MODELO[indice] || 0, z);
      casa.rotation.y = giro + (GIRO_EXTRA_POR_MODELO[indice] || 0);
      scene.add(casa);
    };
    colocar(0, -DISTANCIA_CALLE, Z_CASA_IZQ, ROTACION_IZQ);
    colocar(3, -DISTANCIA_CALLE, Z_CASA_IZQ + ADELANTE_NUEVAS, ROTACION_IZQ);
    colocar(1,  DISTANCIA_CALLE, Z_CASA_DER, ROTACION_DER);
    colocar(2,  DISTANCIA_CALLE, Z_CASA_DER + ADELANTE_NUEVAS, ROTACION_DER);
  });

  // ================== CONTROLES ==================
  let visible = false, pausado = false;
  const teclas = {};
  const hay = (...codes) => codes.some((c) => teclas[c]);
  const activo = () => visible && !pausado;
  const TECLAS_MOV = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

  addEventListener('keydown', (e) => {
    if (!activo() || !TECLAS_MOV.includes(e.code)) return;
    teclas[e.code] = true;
    e.preventDefault();
  });
  addEventListener('keyup', (e) => { teclas[e.code] = false; });
  addEventListener('blur', () => { for (const k in teclas) teclas[k] = false; });

  let angulo = 0;
  const LIMITE = TAMANO / 2 - 20;

  // ================== BUCLE ==================
  const reloj = new THREE.Clock();

  function ajustarTamano() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    const pr = renderer.getPixelRatio();
    if (canvas.width !== Math.floor(w * pr) || canvas.height !== Math.floor(h * pr)) {
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
  }

  function loop() {
    requestAnimationFrame(loop);
    const dt = Math.min(reloj.getDelta(), 0.05);
    if (!visible || pausado) return;     // oculto o en pausa: no dibuja
    ajustarTamano();

    if (hay('KeyA', 'ArrowLeft'))  angulo += GIRO * dt;
    if (hay('KeyD', 'ArrowRight')) angulo -= GIRO * dt;
    let avance = 0;
    if (hay('KeyW', 'ArrowUp'))   avance = 1;
    if (hay('KeyS', 'ArrowDown')) avance = -0.6;

    jugador.rotation.y = angulo;
    const dx = Math.sin(angulo), dz = Math.cos(angulo);
    jugador.position.x = THREE.MathUtils.clamp(jugador.position.x + dx * avance * VELOCIDAD * dt, -LIMITE, LIMITE);
    jugador.position.z = THREE.MathUtils.clamp(jugador.position.z + dz * avance * VELOCIDAD * dt, -LIMITE, LIMITE);

    if (mixer) {
      if (accionCaminar) {
        accionCaminar.paused = (avance === 0);
        accionCaminar.timeScale = avance * VELOCIDAD_ANIMACION;
      }
      mixer.update(dt);
      if (huesoCadera) bloquearCadera();
    }

    const objetivo = new THREE.Vector3(jugador.position.x - dx * 13, 6, jugador.position.z - dz * 13);
    camera.position.lerp(objetivo, 1 - Math.pow(0.001, dt));
    camera.lookAt(jugador.position.x, 2.5, jugador.position.z);

    fondo.position.x = camera.position.x;
    fondo.position.z = camera.position.z;
    sol.position.set(jugador.position.x + 50, 80, jugador.position.z + 30);
    sol.target.position.copy(jugador.position);

    actualizarTema();
    renderer.render(scene, camera);
  }
  requestAnimationFrame(loop);

  // ================== API PARA CATAVI.js ==================
  window.Desierto = {
    mostrar() {
      visible = true;
      canvas.style.opacity = '1';
      const h = document.getElementById('desierto-hint');
      if (h) { h.classList.add('show'); setTimeout(() => h.classList.remove('show'), 9000); }
    },
    ocultar() { visible = false; canvas.style.opacity = '0'; },
    pausar(p) {
      pausado = !!p;
      if (pausado) for (const k in teclas) teclas[k] = false;
    },
    setTema(nombre) { tema = TEMAS[nombre] || TEMAS.claro; }
  };
})();