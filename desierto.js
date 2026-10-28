/* =====================================================================
   desierto.js — el mundo caminable como fondo de la página principal.
   Dibuja en su propio canvas (#canvas-desierto) que va DETRÁS del
   canvas del escudo (#tc). CATAVI.js lo controla con window.Desierto.
   ===================================================================== */
(function () {
  'use strict';
  console.log('desierto.js VERSION 5 cargada');

  // ================== CONFIGURACIÓN ==================
  const RUTA_SUELO = './TEXTURA DE ARENA.jpg';
  const RUTA_MONTANAS = './MONTAÑAS.png';
  const RUTA_PERSONAJE = './P CAMINANDO.fbx';

  const TAMANO = 2000, REPETICIONES = 100;
  const RADIO_FONDO = 900, ALTO_FONDO = 460, BAJAR_FONDO = 100;
  const VELOCIDAD = 8, GIRO = 2.2;

  const ALTURA_PERSONAJE = 3.5, ORIENTACION = 0;
  const VELOCIDAD_ANIMACION = 1, SUAVIZADO_BUCLE = 0.2;

  // ---- Casas ----
  const CASAS = ['./CASA 1.glb', './CASA 2.glb', './CASA IZQUIERDA.glb', './CASA DERECHA.glb', './CASA 3.glb'];
  // Orden: CASA 1, CASA 2, CASA IZQUIERDA, CASA DERECHA, CASA 3
  const TAMANO_POR_MODELO = [25, 25, 35, 25, 25];
  const GIRO_EXTRA_POR_MODELO = [Math.PI, 0, 0, Math.PI, 0];   // CASA 1 y CASA DERECHA giradas 180°
  const ALTURA_EXTRA_POR_MODELO = [0, 0, 0, 0, 0];

  const DISTANCIA_CALLE = 26;
  const Z_CASA_DER = 40, Z_CASA_IZQ = 15, ADELANTE_NUEVAS = -27;
  const ROTACION_IZQ = 0, ROTACION_DER = Math.PI;
  const ATRAS_CASA_IZQUIERDA = 8, DERECHA_CASA_IZQUIERDA = 6;   // CASA IZQUIERDA: más atrás y a la derecha
  
  const ADELANTE_CASA_DERECHA = -20;                            // CASA DERECHA: más cerca de la CASA 1
  const ADELANTE_CASA_3 = 25;                                   // CASA 3: delante de la CASA 2

  // CASA GRANDE: delante de la CASA 1. ESCALA multiplica el tamaño ORIGINAL (mira la consola)
  const ADELANTE_CASA_GRANDE = 45;
  const X_CASA_GRANDE = -DISTANCIA_CALLE;
  const Z_CASA_GRANDE = Z_CASA_IZQ + ADELANTE_CASA_GRANDE;
  const ROTACION_CASA_GRANDE = ROTACION_IZQ;
  const RUTA_CASA_GRANDE = './CASA GRANDE.glb';
  const ESCALA_CASA_GRANDE = 10;


    // ---- Volqueta (detrás de CASA GRANDE) ----
  const RUTA_VOLQUETA = './volqueta.glb';
  const TAMANO_VOLQUETA = 16;      // TAMAÑO: largo máximo del modelo (sube = más grande)
  const DETRAS_VOLQUETA = -6;      // POSICIÓN: qué tan atrás de la casa (sube = más lejos de la calle)
  const LADO_VOLQUETA = -28;         // POSICIÓN: + la mueve hacia adelante, − hacia atrás
  const GIRO_VOLQUETA = 0;         // GIRO: prueba Math.PI, Math.PI / 2 o -Math.PI / 2
  const BAJAR_VOLQUETA = 0;        // ALTURA: positivo la hunde en el suelo, negativo la sube
  const POS_VOLQUETA_X = X_CASA_GRANDE - DETRAS_VOLQUETA;
  const POS_VOLQUETA_Z = Z_CASA_GRANDE + LADO_VOLQUETA;

    // ================== VOLQUETA ==================
  cargarModelo(RUTA_VOLQUETA).then(function (obj) {
    const tam = new THREE.Box3().setFromObject(obj).getSize(new THREE.Vector3());
    const dimension = Math.max(tam.x, tam.z);
    if (dimension <= 0) throw new Error('El modelo volqueta no tiene dimensiones válidas.');
    obj.scale.multiplyScalar(TAMANO_VOLQUETA / dimension);
    obj.updateMatrixWorld(true);
    const c = new THREE.Box3().setFromObject(obj).getCenter(new THREE.Vector3());
    obj.position.x -= c.x;
    obj.position.z -= c.z;
    bajarAlSuelo(obj, BAJAR_VOLQUETA);
    sombras(obj, true);
    const grupo = new THREE.Group();
    grupo.add(obj);
    grupo.position.set(POS_VOLQUETA_X, 0, POS_VOLQUETA_Z);
    grupo.rotation.y = GIRO_VOLQUETA;
    scene.add(grupo);
    estado('volqueta ok', true);
  }).catch(function (err) {
    console.error('[Desierto] No se pudo cargar ' + RUTA_VOLQUETA + '. Comprueba el nombre, la extensión y la carpeta.', err);
    estado('FALLÓ ' + RUTA_VOLQUETA, false);
  });


  // ---- Medio fondo (Z mayor = más lejos) ----
  const RUTA_MEDIO_FONDO = './medioFondo.glb';
  const TAMANO_MEDIO_FONDO = 60;
  const POS_MEDIO_FONDO_X = 0, POS_MEDIO_FONDO_Z = 100;
  const GIRO_MEDIO_FONDO = Math.PI;
  const BAJAR_MEDIO_FONDO = 0.3;   // hunde el modelo en el suelo (positivo = más abajo)
  const POS_MEDIO_FONDO_2_X = 0, POS_MEDIO_FONDO_2_Z = 180;   // segundo medioFondo
  const MONTONES_ARENA = true;     // montoncitos de arena decorativos
  const MOSTRAR_COORDENADAS = false; // true = muestra la x / z del personaje (sirve para ubicar los postes)
  const MARCADORES_DEBUG = false;  // rayos de luz para ver dónde están los modelos

  // ---- Entrada principal ----
  const RUTA_ENTRADA = './ENTRADA.glb';
  const TAMANO_ENTRADA = 60;
  const POS_ENTRADA_X = 10, POS_ENTRADA_Z = -2;
  const GIRO_ENTRADA = Math.PI;

  // ---- Personaje y cámara ----
  const INICIO_EXPLORAR_Z = -18;
  const ATRAS_PORTADA = 12;                       // la cámara de la portada empieza este tanto más atrás
  const ATRAS_JUGADOR = 28;                       // el personaje aparece este tanto más atrás al presionar "Explorar más"
  const Z_APARECER = INICIO_EXPLORAR_Z - ATRAS_JUGADOR;
  const DIST_CAM = 7;
  const ALTURA_CAM = 4;
  const POS_CAM_INTRO = { x: 0, y: ALTURA_CAM, z: INICIO_EXPLORAR_Z - DIST_CAM - ATRAS_PORTADA };
  const PITCH_CAM = Math.atan((ALTURA_CAM - 2.5) / DIST_CAM);
  const AMPL_GIRO = 1.3, VEL_GIRO_CAM = 0.2;

  // ---- Puntos de información (cambia los textos por los reales) ----
  const RADIO_INFO = 5;
  const PUNTOS_INFO = [
    { x: 6, z: -2, titulo: 'Quiénes somos',
      texto: ['Organización boliviana nacida en Llallagua, Potosí, que reúne el trabajo minero, comercial y social de sus socios bajo un modelo cooperativo, solidario y democrático.'] },
    { x: -9, z: 15, titulo: 'Nuestra fundación',
      texto: ['Cooperativa Minera Multiactiva Catavi Siglo XX R.L., fundada el 3 de mayo de 1994 en Llallagua, Potosí, Bolivia.', 'Personería jurídica N° 04665.'] },
    { x: 9, z: 28, titulo: 'El trabajo minero',
      texto: ['La cooperativa nació de la fuerza del pueblo minero: el trabajo de sus socios en la extracción y el procesamiento del mineral es el corazón de la organización.'] },
    { x: -9, z: 42, titulo: 'Procesos',
      texto: ['Conoce los equipos de la planta: alimentación, molienda, mesas, filtro y secadora.'],
      enlace: { texto: 'Ver procesos', url: '3dExtraccion/extraccion.html' } },
    { x: 9, z: 55, titulo: 'Galería',
      texto: ['Imágenes y modelos de las instalaciones y del trabajo de la cooperativa.'],
      enlace: { texto: 'Ver galería', url: '3dGaleria/galeria.html' } },
    { x: -9, z: 68, titulo: 'Nuestros socios',
      texto: ['Los socios son el motor de la cooperativa: trabajan juntos bajo principios de solidaridad, democracia y participación.'] },
    { x: 9, z: 90, titulo: 'Trabajo cooperativo',
      texto: ['Cada decisión se toma de forma colectiva, buscando el beneficio común de quienes forman parte de la organización.'] },
    { x: -9, z: 112, titulo: 'Actividad comercial',
      texto: ['Además de la minería, la cooperativa desarrolla actividades comerciales que fortalecen la economía de sus socios.'] },
    { x: 9, z: 137, titulo: 'Compromiso social',
      texto: ['La organización también trabaja por el bienestar social de sus socios y de la comunidad de Llallagua.'] },
    { x: -9, z: 165, titulo: 'Desde Llallagua',
      texto: ['Llallagua, Potosí, es el lugar donde nació la cooperativa en 1994 y donde sigue creciendo hoy.'] }
  ];

  // ================== COMPROBACIONES ==================
  const canvas = document.getElementById('canvas-desierto');
  if (!canvas || !window.THREE || !THREE.FBXLoader || !THREE.GLTFLoader) {
    console.warn('[Desierto] Falta #canvas-desierto o alguna librería (THREE / FBXLoader / GLTFLoader). Se usará la imagen de fondo.');
    return;   // sin window.Desierto, CATAVI.js vuelve a mostrar la imagen
  }

  // ================== PANEL DE ESTADO (solo con MARCADORES_DEBUG = true) ==================
  const panelEstado = document.createElement('div');
  panelEstado.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:99;background:rgba(0,0,0,.75);color:#fff;font:11px/1.5 monospace;padding:8px 10px;border-radius:6px;max-width:420px;pointer-events:none;';
  if (MARCADORES_DEBUG) document.body.appendChild(panelEstado);
  function estado(texto, ok) {
    const l = document.createElement('div');
    l.style.color = ok ? '#7CFC7C' : '#ff7b7b';
    l.textContent = (ok ? '✔ ' : '✘ ') + texto;
    panelEstado.appendChild(l);
  }
  estado('desierto.js VERSION 5', true);

  const panelPos = document.createElement('div');
  panelPos.style.cssText = 'position:fixed;left:60px;top:18px;z-index:99;background:rgba(0,0,0,.75);color:#fff;font:14px monospace;padding:8px 12px;border-radius:6px;pointer-events:none;';
  if (MOSTRAR_COORDENADAS) document.body.appendChild(panelPos);

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
  camera.position.set(POS_CAM_INTRO.x, POS_CAM_INTRO.y, POS_CAM_INTRO.z);

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

        // color de la parte más alta de la imagen: el cielo de arriba se funde con ella
        const dt2 = cx.getImageData(0, 1, 32, 1).data;
        let r2 = 0, g2 = 0, b2 = 0;
        for (let i = 0; i < 32; i++) { r2 += dt2[i * 4]; g2 += dt2[i * 4 + 1]; b2 += dt2[i * 4 + 2]; }
        TEMAS.claro.cielo.setRGB(r2 / 32 / 255, g2 / 32 / 255, b2 / 32 / 255);
        TEMAS.oscuro.cielo.copy(TEMAS.claro.cielo).multiplyScalar(0.04);
        TEMAS.atardecer.cielo.copy(TEMAS.claro.cielo).multiply(new THREE.Color(1, 0.62, 0.45));
        mezcla.cielo.copy(tema.cielo);
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

    // ================== LUNA (solo de noche) ==================
  const LUNA_ANGULO = 20;      // horizontal desde el frente: + a la izquierda, − a la derecha
  const LUNA_ALTURA = 15;      // grados sobre el horizonte (sube = más alta en el cielo)
  const LUNA_TAMANO = 110;     // tamaño (incluye el halo)
  const LUNA_DISTANCIA = 850;  // no hace falta tocarlo

  const texLuna = (function () {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const x = c.getContext('2d');

    // halo suave
    const halo = x.createRadialGradient(128, 128, 50, 128, 128, 128);
    halo.addColorStop(0, 'rgba(200,215,255,.45)');
    halo.addColorStop(1, 'rgba(200,215,255,0)');
    x.fillStyle = halo;
    x.fillRect(0, 0, 256, 256);

    // disco con cráteres
    x.save();
    x.beginPath();
    x.arc(128, 128, 52, 0, Math.PI * 2);
    x.clip();
    const cara = x.createRadialGradient(112, 112, 5, 128, 128, 56);
    cara.addColorStop(0, '#fffdf2');
    cara.addColorStop(1, '#d9e0ee');
    x.fillStyle = cara;
    x.fillRect(60, 60, 136, 136);
    x.fillStyle = 'rgba(140,150,175,.28)';
    [[108, 110, 11], [143, 102, 8], [138, 142, 13], [110, 146, 7], [126, 124, 5]].forEach(function (k) {
      x.beginPath();
      x.arc(k[0], k[1], k[2], 0, Math.PI * 2);
      x.fill();
    });
    x.restore();

    return new THREE.CanvasTexture(c);
  })();

  const luna = new THREE.Sprite(new THREE.SpriteMaterial({
    map: texLuna, transparent: true, opacity: 0, depthWrite: false, fog: false
  }));
  luna.scale.set(LUNA_TAMANO, LUNA_TAMANO, 1);
  luna.visible = false;
  scene.add(luna);

  // la luna se queda fija en el cielo: se mueve con la cámara
  function actualizarLuna() {
    luna.visible = mezcla.luna > 0.01;
    if (!luna.visible) return;
    luna.material.opacity = mezcla.luna;
    const az = LUNA_ANGULO * Math.PI / 180, el = LUNA_ALTURA * Math.PI / 180;
    luna.position.set(
      camera.position.x + Math.sin(az) * Math.cos(el) * LUNA_DISTANCIA,
      Math.sin(el) * LUNA_DISTANCIA,
      camera.position.z + Math.cos(az) * Math.cos(el) * LUNA_DISTANCIA
    );
  }

  // ================== TEMA CLARO / OSCURO ==================
    const TEMAS = {
    claro:     { cielo: new THREE.Color(0x9ec5e8), tinte: new THREE.Color(1, 1, 1),          hemi: 0.85, sol: 0.9,  solColor: new THREE.Color(0xfff2d6), solY: 80, luces: 0,   luna: 0 },
    atardecer: { cielo: new THREE.Color(0xe8a070), tinte: new THREE.Color(1, 0.7, 0.52),      hemi: 0.62, sol: 0.85, solColor: new THREE.Color(0xff9a4d), solY: 26, luces: 0.4, luna: 0 },
    oscuro:    { cielo: new THREE.Color(0x0a1020), tinte: new THREE.Color(0.02, 0.03, 0.07),  hemi: 0.09, sol: 0.08, solColor: new THREE.Color(0x7f95d6), solY: 60, luces: 1,   luna: 1 }
  };
  const TIEMPO_TRANSICION = 1.1;   // segundos: más alto = el cambio día/tarde/noche es más lento
  let tema = TEMAS.claro;
    const mezcla = {
    cielo: TEMAS.claro.cielo.clone(), tinte: TEMAS.claro.tinte.clone(),
    hemi: TEMAS.claro.hemi, sol: TEMAS.claro.sol, solColor: TEMAS.claro.solColor.clone(), solY: TEMAS.claro.solY, luces: 0, luna: 0
  };
  function actualizarTema(dt) {
    const k = 1 - Math.exp(-dt / TIEMPO_TRANSICION);   // cambio gradual, igual en cualquier PC
    mezcla.cielo.lerp(tema.cielo, k);
    mezcla.tinte.lerp(tema.tinte, k);
    mezcla.solColor.lerp(tema.solColor, k);
    mezcla.hemi += (tema.hemi - mezcla.hemi) * k;
    mezcla.sol  += (tema.sol  - mezcla.sol)  * k;
    mezcla.solY += (tema.solY - mezcla.solY) * k;
    mezcla.luces += (tema.luces - mezcla.luces) * k;
        mezcla.luna += (tema.luna - mezcla.luna) * k;
    actualizarLuces(mezcla.luces);
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
  jugador.visible = false;      // aparece solo al presionar "Explorar más"

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

  // ================== MARCADORES DE DEPURACIÓN ==================
  function marcador(x, z, color) {
    if (!MARCADORES_DEBUG) return;
    const m = new THREE.Mesh(
      new THREE.CylinderGeometry(1, 1, 120, 12),
      new THREE.MeshBasicMaterial({ color: color, fog: false })
    );
    m.position.set(x, 60, z);
    scene.add(m);
  }
  marcador(POS_MEDIO_FONDO_X, POS_MEDIO_FONDO_Z, 0xff0000);
  marcador(X_CASA_GRANDE, Z_CASA_GRANDE, 0x00ff00);

  // ================== CARGADOR DE MODELOS ==================
  function cargarModelo(ruta) {
    return new Promise(function (resolve, reject) {
      const ext = ruta.split('.').pop().toLowerCase();
      if (ext === 'fbx') new THREE.FBXLoader().load(ruta, resolve, undefined, reject);
      else new THREE.GLTFLoader().load(ruta, function (gltf) { resolve(gltf.scene); }, undefined, reject);
    });
  }

  // Apoya en el suelo con los vértices reales (ignora piezas sueltas que hacían flotar el modelo)
  function bajarAlSuelo(obj, extra) {
    obj.updateMatrixWorld(true);
    const ys = [], v = new THREE.Vector3();
    obj.traverse(function (m) {
      if (!m.isMesh || !m.visible || !m.geometry.attributes.position) return;
      const pos = m.geometry.attributes.position;
      const salto = Math.max(1, Math.floor(pos.count / 4000));
      for (let i = 0; i < pos.count; i += salto) {
        v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld);
        ys.push(v.y);
      }
    });
    ys.sort(function (p, q) { return p - q; });
    const base = ys.length ? ys[Math.floor(ys.length * 0.02)] : new THREE.Box3().setFromObject(obj).min.y;
    obj.position.y -= base + (extra || 0);
  }

  function sombras(obj, sinCulling) {
    obj.traverse(function (m) {
      if (!m.isMesh) return;
      m.castShadow = true;
      m.receiveShadow = true;
      if (sinCulling) m.frustumCulled = false;
    });
  }

  // ================== PREPARAR CASAS ==================
  function prepararCasa(obj, tamano) {
    const caja = new THREE.Box3().setFromObject(obj);
    const tam = caja.getSize(new THREE.Vector3());
    if (tamano) obj.scale.multiplyScalar(tamano / Math.max(tam.x, tam.z));   // 0 = tamaño original
    const c = new THREE.Box3().setFromObject(obj).getCenter(new THREE.Vector3());
    obj.position.x -= c.x;
    obj.position.z -= c.z;
    bajarAlSuelo(obj, 0);
    sombras(obj, false);
    const grupo = new THREE.Group();
    grupo.add(obj);
    return grupo;
  }

  Promise.allSettled(CASAS.map(cargarModelo)).then(function (resultados) {
    const bases = resultados.map(function (r, i) {
      if (r.status === 'fulfilled') {
        const t = TAMANO_POR_MODELO[i];
        return prepararCasa(r.value, t === undefined ? 18 : t);
      }
      console.warn('[Desierto] No se pudo cargar la casa ' + CASAS[i], r.reason);
      estado('FALLÓ ' + CASAS[i], false);
      return null;
    });
    function colocar(indice, x, z, giro) {
      if (!bases[indice]) return;
      const casa = bases[indice].clone(true);
      casa.position.set(x, ALTURA_EXTRA_POR_MODELO[indice] || 0, z);
      casa.rotation.y = giro + (GIRO_EXTRA_POR_MODELO[indice] || 0);
      scene.add(casa);
      return casa;
    }
    colocar(0, -DISTANCIA_CALLE, Z_CASA_IZQ, ROTACION_IZQ);
    colocar(3, -DISTANCIA_CALLE, Z_CASA_IZQ + ADELANTE_CASA_DERECHA, ROTACION_IZQ);
    colocar(1, DISTANCIA_CALLE, Z_CASA_DER, ROTACION_DER);
    colocar(2, DISTANCIA_CALLE - DERECHA_CASA_IZQUIERDA, Z_CASA_DER + ADELANTE_NUEVAS - ATRAS_CASA_IZQUIERDA, ROTACION_DER);
    colocar(4, DISTANCIA_CALLE, Z_CASA_DER + ADELANTE_CASA_3, ROTACION_DER);
  });

  // ================== CASA GRANDE (bloque independiente) ==================
  cargarModelo(RUTA_CASA_GRANDE).then(function (obj) {
    obj.scale.setScalar(ESCALA_CASA_GRANDE);
    obj.updateMatrixWorld(true);
    let caja = new THREE.Box3().setFromObject(obj);
    const centro = caja.getCenter(new THREE.Vector3());
    obj.position.x -= centro.x;
    obj.position.z -= centro.z;
    obj.updateMatrixWorld(true);
    caja = new THREE.Box3().setFromObject(obj);
    obj.position.y -= caja.min.y;
    sombras(obj, false);
    const grupo = new THREE.Group();
    grupo.add(obj);
    grupo.position.set(X_CASA_GRANDE, 0, Z_CASA_GRANDE);
    grupo.rotation.y = ROTACION_CASA_GRANDE;
    scene.add(grupo);
    const t = new THREE.Box3().setFromObject(grupo).getSize(new THREE.Vector3());
    console.log('[CASA GRANDE] tamaño final:', t.x.toFixed(1), t.y.toFixed(1), t.z.toFixed(1));
    estado('CASA GRANDE ok, tamaño ' + t.x.toFixed(1) + ' x ' + t.y.toFixed(1) + ' x ' + t.z.toFixed(1), true);
  }).catch(function (err) {
    console.error('[Desierto] No se pudo cargar CASA GRANDE:', err);
    estado('FALLÓ ' + RUTA_CASA_GRANDE, false);
  });

  // ================== MEDIO FONDO ==================
  cargarModelo(RUTA_MEDIO_FONDO).then(function (obj) {
    const tam = new THREE.Box3().setFromObject(obj).getSize(new THREE.Vector3());
    const dimension = Math.max(tam.x, tam.z);
    if (dimension <= 0) throw new Error('El modelo medioFondo no tiene dimensiones válidas.');
    obj.scale.multiplyScalar(TAMANO_MEDIO_FONDO / dimension);
    obj.updateMatrixWorld(true);
    const c = new THREE.Box3().setFromObject(obj).getCenter(new THREE.Vector3());
    obj.position.x -= c.x;
    obj.position.z -= c.z;
    bajarAlSuelo(obj, BAJAR_MEDIO_FONDO);
    sombras(obj, true);
    const grupo = new THREE.Group();
    grupo.add(obj);
    grupo.position.set(POS_MEDIO_FONDO_X, 0, POS_MEDIO_FONDO_Z);
    grupo.rotation.y = GIRO_MEDIO_FONDO;
    scene.add(grupo);
    const grupo2 = grupo.clone(true);   // segundo medioFondo, más adelante
    grupo2.position.set(POS_MEDIO_FONDO_2_X, 0, POS_MEDIO_FONDO_2_Z);
    scene.add(grupo2);
    const tf = new THREE.Box3().setFromObject(grupo).getSize(new THREE.Vector3());
    console.log('[medioFondo] cargado. Posición:', POS_MEDIO_FONDO_X, POS_MEDIO_FONDO_Z, '| tamaño final:', tf.x.toFixed(1), tf.y.toFixed(1), tf.z.toFixed(1));
    estado('medioFondo ok, tamaño ' + tf.x.toFixed(1) + ' x ' + tf.y.toFixed(1) + ' x ' + tf.z.toFixed(1), true);
  }).catch(function (err) {
    console.error('[Desierto] No se pudo cargar ' + RUTA_MEDIO_FONDO + '. Comprueba el nombre, la extensión y la carpeta.', err);
    estado('FALLÓ ' + RUTA_MEDIO_FONDO, false);
  });

  // ================== MONTONCITOS DE ARENA ==================
  if (MONTONES_ARENA) {
    let semilla = 20240503;   // semilla fija: los montones quedan siempre en el mismo sitio
    const azar = function () {
      semilla |= 0;
      semilla = (semilla + 0x6D2B79F5) | 0;
      let t = Math.imul(semilla ^ (semilla >>> 15), 1 | semilla);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const TILE = TAMANO / REPETICIONES;   // misma textura que el piso
    const matMonton = new THREE.MeshStandardMaterial({ color: 0xb98f5e, roughness: 1, metalness: 0 });
    new THREE.TextureLoader().load(RUTA_SUELO, function (tex) {
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      tex.encoding = THREE.sRGBEncoding;
      matMonton.map = tex;
      matMonton.color.set(0xffffff);
      matMonton.needsUpdate = true;
    });
    const geoBase = new THREE.SphereGeometry(1, 24, 14);
    // minX, maxX, minZ, maxZ, cantidad
    const ZONAS_MONTONES = [
      [-75, -45, 55, 85, 4], [45, 75, 55, 85, 4],
      [-75, -36, 85, 215, 12], [36, 75, 85, 215, 12],
      [-30, 30, 127, 148, 4], [-30, 30, 215, 240, 4]
    ];
    ZONAS_MONTONES.forEach(function (z) {
      for (let i = 0; i < z[4]; i++) {
        const r = 2.5 + azar() * 4.5;
        const sx = r * (0.9 + azar() * 0.6), sy = r * 0.4, sz = r * (0.9 + azar() * 0.6);
        const px = z[0] + azar() * (z[1] - z[0]);
        const pz = z[2] + azar() * (z[3] - z[2]);
        const g = geoBase.clone();
        const pos = g.attributes.position, uv = g.attributes.uv;
        for (let k = 0; k < pos.count; k++) {
          const wx = px + pos.getX(k) * sx;
          const wz = pz + pos.getZ(k) * sz;
          uv.setXY(k, wx / TILE, -wz / TILE);   // la textura continúa igual que la del piso
        }
        const m = new THREE.Mesh(g, matMonton);
        m.scale.set(sx, sy, sz);
        m.position.set(px, 0, pz);
        m.castShadow = true;
        m.receiveShadow = true;
        scene.add(m);
      }
    });
  }

  // ================== POSTES DE LUZ ==================
  // Se encienden de noche (y un poco al atardecer). La luz es "de mentira": un brillo en la lámpara
  // y una mancha de luz en el suelo. Se ve bien y no hace lento el juego como lo harían luces reales.
  const POSTES_LUZ = [               // [x, z] de cada poste (las x negativas/positivas son lados de la calle)
    [-12, -30.5],   // entrada: esquina de la casa de ladrillos de la DERECHA (del lado de la reja)
    [16.5, -36],  // entrada: esquina de la casa de ladrillos de la IZQUIERDA (del lado de la reja)
    [-12, 32], [12, 62], [-12, 84], [12, 108], [-12, 130], [12, 154], [-12, 176], [12, 198]
  ];
  const ALTURA_POSTE = 9.5;
  const RADIO_LUZ_SUELO = 14;        // tamaño de la mancha de luz en el suelo
  const LAMPARA_APAGADA = new THREE.Color(0x8a8a80);
  const LAMPARA_ENCENDIDA = new THREE.Color(0xfff0c4);

  const texLuz = (function () {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,228,170,1)');
    g.addColorStop(0.35, 'rgba(255,205,125,.4)');
    g.addColorStop(1, 'rgba(255,190,100,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  })();

  const matPoste = new THREE.MeshStandardMaterial({ color: 0x2b2d2f, roughness: 0.7, metalness: 0.3 });
  const matLampara = new THREE.MeshBasicMaterial({ color: LAMPARA_APAGADA });
  const matBrillo = new THREE.SpriteMaterial({
    map: texLuz, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false
  });
  const matMancha = new THREE.MeshBasicMaterial({
    map: texLuz, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false
  });

  const geoPoste = new THREE.CylinderGeometry(0.1, 0.15, ALTURA_POSTE, 10);
  const geoBrazo = new THREE.BoxGeometry(1.6, 0.12, 0.12);
  const geoLampara = new THREE.BoxGeometry(0.6, 0.16, 0.36);
  const geoMancha = new THREE.CircleGeometry(RADIO_LUZ_SUELO, 32);

  const postesGrupo = new THREE.Group();
  postesGrupo.visible = false;
  scene.add(postesGrupo);

  function crearPoste(px, pz, dir) {
    const hacia = (dir !== undefined) ? dir : (px > 0 ? -1 : 1);   // hacia dónde apunta el brazo (dir: -1 o 1)           // el brazo apunta hacia la calle
    const g = new THREE.Group();
    g.position.set(px, 0, pz);

    const poste = new THREE.Mesh(geoPoste, matPoste);
    poste.position.y = ALTURA_POSTE / 2;
    poste.castShadow = true;

    const brazo = new THREE.Mesh(geoBrazo, matPoste);
    brazo.position.set(hacia * 0.8, ALTURA_POSTE, 0);

    const lampara = new THREE.Mesh(geoLampara, matLampara);
    lampara.position.set(hacia * 1.5, ALTURA_POSTE - 0.12, 0);

    const brillo = new THREE.Sprite(matBrillo);
    brillo.scale.set(5, 5, 1);
    brillo.position.set(hacia * 1.5, ALTURA_POSTE - 0.3, 0);

    const mancha = new THREE.Mesh(geoMancha, matMancha);
    mancha.rotation.x = -Math.PI / 2;
    mancha.position.set(hacia * 1.5, 0.07, 0);

    g.add(poste, brazo, lampara, brillo, mancha);
    postesGrupo.add(g);
  }
  POSTES_LUZ.forEach(function (pos) { crearPoste(pos[0], pos[1]); });

  // v: 0 = apagados, 1 = encendidos del todo
  function actualizarLuces(v) {
    postesGrupo.visible = true;                  // el poste siempre se ve; solo cambia la luz
    matBrillo.opacity = v * 0.9;
    matMancha.opacity = v * 0.65;
    matLampara.color.copy(LAMPARA_APAGADA).lerp(LAMPARA_ENCENDIDA, v);
  }

  // ================== ENTRADA PRINCIPAL ==================
  cargarModelo(RUTA_ENTRADA).then(function (obj) {
    let caja = new THREE.Box3().setFromObject(obj);
    const tam = caja.getSize(new THREE.Vector3());
    const dimensionHorizontal = Math.max(tam.x, tam.z);
    if (dimensionHorizontal <= 0) throw new Error('El modelo ENTRADA no tiene dimensiones válidas.');
    obj.scale.multiplyScalar(TAMANO_ENTRADA / dimensionHorizontal);
    obj.updateMatrixWorld(true);
    caja = new THREE.Box3().setFromObject(obj);
    const centro = caja.getCenter(new THREE.Vector3());
    obj.position.x -= centro.x;
    obj.position.z -= centro.z;
    obj.updateMatrixWorld(true);
    caja = new THREE.Box3().setFromObject(obj);
    obj.position.y -= caja.min.y;
    obj.traverse(function (m) {
      if (!m.isMesh) return;
      m.castShadow = true;
      m.receiveShadow = true;
      m.frustumCulled = false;
      [].concat(m.material || []).forEach(function (mt) { if (mt && mt.map) mt.map.encoding = THREE.sRGBEncoding; });
    });
    obj.position.x += POS_ENTRADA_X;
    obj.position.z += POS_ENTRADA_Z;
    obj.rotation.y = GIRO_ENTRADA;   // giro de 180° para orientar la fachada al personaje
    scene.add(obj);
    console.log('[Desierto] Entrada principal cargada correctamente:', RUTA_ENTRADA);
    estado('ENTRADA ok', true);
  }).catch(function (err) {
    console.error('[Desierto] No se pudo cargar la entrada ' + RUTA_ENTRADA + '. Comprueba el nombre, extensión y carpeta del archivo.', err);
    estado('FALLÓ ' + RUTA_ENTRADA, false);
  });

  // ================== CONTROLES ==================
  let visible = false, pausado = false, modo = 'intro';   // 'intro' = solo cámara, 'explorar' = caminar
  const teclas = {};
  const hay = (...codes) => codes.some((c) => teclas[c]);
  const activo = () => visible && !pausado && modo === 'explorar';
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

  // ================== PUNTOS DE INFORMACIÓN ==================
  const estilo = document.createElement('style');
  estilo.textContent = `
    #info-prompt{position:fixed;left:50%;bottom:64px;transform:translateX(-50%) translateY(8px);z-index:9;opacity:0;pointer-events:none;transition:opacity .25s ease,transform .25s ease}
    #info-prompt.show{opacity:1;pointer-events:auto;transform:translateX(-50%)}
    #info-prompt button{display:flex;align-items:center;gap:10px;font:500 15px Oswald,'Arial Narrow',sans-serif;letter-spacing:.5px;text-transform:uppercase;color:#fff;background:rgba(0,0,0,.5);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,.14);border-radius:999px;padding:10px 24px 10px 10px;cursor:pointer}
    #info-prompt .tecla{display:inline-flex;align-items:center;justify-content:center;min-width:24px;height:24px;padding:0 6px;border-radius:6px;background:#000;color:#fff;border:1px solid rgba(255,255,255,.3);font:500 14px Oswald,'Arial Narrow',sans-serif;letter-spacing:0}
    #info-prompt button:hover{background:rgba(0,0,0,.7)}
    #info-card{position:fixed;right:24px;bottom:24px;width:min(330px,calc(100vw - 48px));z-index:9;background:rgba(18,22,30,.92);border-left:4px solid #1e6fb8;border-radius:6px;padding:16px 20px;color:#fff;opacity:0;transform:translateY(12px);pointer-events:none;transition:opacity .3s ease,transform .3s ease}
    #info-card.show{opacity:1;transform:none;pointer-events:auto}
    #info-card .n{font:700 12px Lato,'Segoe UI',Arial,sans-serif;color:#7cc8ff;margin-bottom:4px}
    #info-card h3{font:500 21px Oswald,'Arial Narrow',sans-serif;letter-spacing:.5px;margin:0 0 8px;padding-right:40px}
    #info-card p{font:15px/1.55 Lato,'Segoe UI',Arial,sans-serif;color:rgba(255,255,255,.9);margin:0 0 10px}
    #info-card a{display:inline-block;margin-top:2px;font:500 14px Oswald,'Arial Narrow',sans-serif;letter-spacing:.5px;text-transform:uppercase;text-decoration:none;color:#fff;background:rgba(0,0,0,.5);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,.14);border-radius:999px;padding:8px 20px}
    #info-card a:hover{background:rgba(0,0,0,.7)}
    #info-card .x{position:absolute;top:10px;right:10px;width:30px;height:30px;padding:0;background:rgba(0,0,0,.45);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,.14);border-radius:50%;color:#fff;font-size:18px;line-height:1;cursor:pointer}
    #info-card .x:hover{background:rgba(0,0,0,.7)}
    @media(max-width:640px){#info-card{left:12px;right:12px;bottom:12px;width:auto}}`;
  document.head.appendChild(estilo);

  const avisoEl = document.createElement('div');
  avisoEl.id = 'info-prompt';
  avisoEl.innerHTML = '<button type="button"><span class="tecla">E</span><span>Presiona E para ver información</span></button>';
  document.body.appendChild(avisoEl);

  const tarjetaEl = document.createElement('div');
  tarjetaEl.id = 'info-card';
  document.body.appendChild(tarjetaEl);

  // ================== PUNTOS DE INFORMACIÓN: marcadores ==================
  // Cada punto: un puntito dorado en el suelo, una línea fina blanca y una etiqueta con su nombre
  const COLOR_PUNTO = '#f4c04e';    // color del puntito del suelo
  const ALTURA_ICONO = 2.4;         // a qué altura flota la etiqueta
  const ALTO_ETIQUETA = 0.5;        // alto de la etiqueta (en unidades del mundo)
  const ALTURA_PUNTO = 0.25;        // altura del puntito sobre el suelo
  const TAM_PUNTO = 0.32;           // tamaño del puntito dorado

  // Puntito: círculo dorado con borde blanco
  const texPunto = (function () {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const x = c.getContext('2d');
    x.fillStyle = COLOR_PUNTO;
    x.beginPath();
    x.arc(32, 32, 26, 0, Math.PI * 2);
    x.fill();
    x.strokeStyle = '#fff';
    x.lineWidth = 5;
    x.stroke();
    return new THREE.CanvasTexture(c);
  })();

  // Etiqueta: píldora oscura con el nombre en mayúsculas
  function crearEtiqueta(texto) {
    const c = document.createElement('canvas');
    const tex = new THREE.CanvasTexture(c);
    tex.generateMipmaps = false;
    tex.minFilter = THREE.LinearFilter;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: tex, transparent: true, depthWrite: false, fog: false
    }));

    function dibujar() {
      const t = texto.toUpperCase();
      const fuente = "500 44px Oswald, 'Arial Narrow', sans-serif";
      const x = c.getContext('2d');
      x.font = fuente;
      x.letterSpacing = '2px';
      const ancho = Math.ceil(x.measureText(t).width) + 56;
      const alto = 76, r = alto / 2;
      c.width = ancho;                // al cambiar el tamaño, el lienzo se reinicia
      c.height = alto;
      x.font = fuente;
      x.letterSpacing = '2px';
      x.fillStyle = 'rgba(50,58,80,.94)';
      x.beginPath();
      x.moveTo(r, 0);
      x.lineTo(ancho - r, 0);
      x.arc(ancho - r, r, r, -Math.PI / 2, Math.PI / 2);
      x.lineTo(r, alto);
      x.arc(r, r, r, Math.PI / 2, Math.PI * 1.5);
      x.closePath();
      x.fill();
      x.fillStyle = '#fff';
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.fillText(t, ancho / 2 + 1, alto / 2 + 3);
      tex.needsUpdate = true;
      const w = ALTO_ETIQUETA * ancho / alto;
      sprite.userData.base = [w, ALTO_ETIQUETA];
      sprite.scale.set(w, ALTO_ETIQUETA, 1);
    }

    dibujar();
    // cuando la fuente Oswald termina de cargar, se vuelve a dibujar con ella
    if (document.fonts && document.fonts.load) document.fonts.load("500 44px Oswald").then(dibujar);
    return sprite;
  }

  const puntosGrupo = new THREE.Group();
  puntosGrupo.visible = false;
  scene.add(puntosGrupo);

  const puntos = PUNTOS_INFO.map(function (d, i) {
    const g = new THREE.Group();
    g.position.set(d.x, 0, d.z);

    const punto = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: texPunto, transparent: true, depthWrite: false, fog: false })
    );
    punto.scale.set(TAM_PUNTO, TAM_PUNTO, 1);
    punto.position.y = ALTURA_PUNTO;

    // Línea fina que sube del puntito hasta la etiqueta
    const altoLinea = ALTURA_ICONO - ALTO_ETIQUETA / 2 - ALTURA_PUNTO;
    const haz = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.02, altoLinea, 6, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0xffffff, transparent: true, opacity: 0.8,
        side: THREE.DoubleSide, depthWrite: false, fog: false
      })
    );
    haz.position.y = ALTURA_PUNTO + altoLinea / 2;

    const etiqueta = crearEtiqueta(d.titulo);
    etiqueta.position.y = ALTURA_ICONO;

    // Zona invisible para poder hacer clic sin apuntar con precisión
    const hit = new THREE.Mesh(
      new THREE.SphereGeometry(1.6, 8, 8),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    hit.position.y = 1.6;

    g.add(punto, haz, etiqueta, hit);
    puntosGrupo.add(g);

    return { g: g, haz: haz, punto: punto, etiqueta: etiqueta, hit: hit, d: d, i: i };
  });

  let cercano = null, abierto = null;

  function mostrarAviso(v) { avisoEl.classList.toggle('show', !!v); }

  function cerrarInfo() { abierto = null; tarjetaEl.classList.remove('show'); }

  function abrirInfo(p) {
    abierto = p;
    tarjetaEl.innerHTML = '';
    const mk = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt) e.textContent = txt; return e; };
    tarjetaEl.appendChild(mk('div', 'n', 'Dato ' + (p.i + 1) + ' de ' + puntos.length));
    tarjetaEl.appendChild(mk('h3', '', p.d.titulo));
    p.d.texto.forEach((t) => tarjetaEl.appendChild(mk('p', '', t)));
    if (p.d.enlace) {
      const a = mk('a', '', p.d.enlace.texto + ' →');
      a.href = p.d.enlace.url;
      tarjetaEl.appendChild(a);
    }
    const x = mk('button', 'x', '×');
    x.setAttribute('aria-label', 'Cerrar');
    x.addEventListener('click', cerrarInfo);
    tarjetaEl.appendChild(x);
    tarjetaEl.classList.add('show');
    mostrarAviso(false);
  }

  avisoEl.querySelector('button').addEventListener('click', () => { if (cercano) abrirInfo(cercano); });

  // Enter / E abren o cierran; Esc cierra
  addEventListener('keydown', (e) => {
    if (!activo()) return;
    if ((e.code === 'KeyE' || e.code === 'Enter') && cercano) {
      e.preventDefault();
      if (abierto === cercano) cerrarInfo(); else abrirInfo(cercano);
    } else if (e.code === 'Escape') cerrarInfo();
  });

  // Clic sobre el marcador (solo si estás cerca)
  const rayo = new THREE.Raycaster(), puntero = new THREE.Vector2();
  canvas.addEventListener('click', (e) => {
    if (!activo() || !cercano) return;
    const r = canvas.getBoundingClientRect();
    puntero.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    rayo.setFromCamera(puntero, camera);
    if (rayo.intersectObjects([cercano.hit, cercano.etiqueta], false).length) abrirInfo(cercano);
  });

  function actualizarPuntos(te) {
    puntosGrupo.visible = (modo === 'explorar');
    // Fuera del modo explorar (o mientras se cambia de modo) no debe quedar ningún aviso ni tarjeta
    if (modo !== 'explorar' || cambiando) {
      if (cercano || abierto) { cercano = null; cerrarInfo(); }
      mostrarAviso(false);
      return;
    }

    let mejor = null, mejorDist = RADIO_INFO;
    puntos.forEach((p) => {
      const dist = Math.hypot(jugador.position.x - p.g.position.x, jugador.position.z - p.g.position.z);
      if (dist < mejorDist) { mejor = p; mejorDist = dist; }
    });
    if (mejor !== cercano) {
      cercano = mejor;
      if (abierto && abierto !== cercano) cerrarInfo();   // te alejaste: se cierra sola
      mostrarAviso(cercano && abierto !== cercano);
    }

    puntos.forEach(function (p) {
      const dist = Math.hypot(
        jugador.position.x - p.g.position.x,
        jugador.position.z - p.g.position.z
      );
      const cerca = Math.max(0, Math.min(1, 1 - dist / 22));
      const activoP = p === cercano;
      const latido = 0.5 + 0.5 * Math.sin(te * 2 + p.i);

      const sp = (activoP ? TAM_PUNTO * 1.25 : TAM_PUNTO) + 0.03 * latido;
      p.punto.scale.set(sp, sp, 1);
      p.haz.material.opacity = 0.55 + 0.3 * cerca + (activoP ? 0.15 : 0);
      p.etiqueta.material.opacity = 0.75 + 0.25 * cerca;

      const b = p.etiqueta.userData.base, f = activoP ? 1.1 : 1;
      p.etiqueta.scale.set(b[0] * f, b[1] * f, 1);
    });
  }

  // ================== BUCLE ==================
  const reloj = new THREE.Clock();
  let tCam = 0, cambiando = false, snap = false;
  const objCam = new THREE.Vector3(), objMira = new THREE.Vector3();
  const mira = new THREE.Vector3(
    POS_CAM_INTRO.x,
    POS_CAM_INTRO.y - Math.sin(PITCH_CAM) * 40,
    POS_CAM_INTRO.z + Math.cos(PITCH_CAM) * 40
  ), foco = new THREE.Vector3();

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

    if (modo === 'explorar') {
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

      objCam.set(jugador.position.x - dx * DIST_CAM, ALTURA_CAM, jugador.position.z - dz * DIST_CAM);
      camera.position.lerp(objCam, 1 - Math.pow(0.001, dt));
      objMira.set(jugador.position.x, 2.5, jugador.position.z);
      foco.copy(jugador.position);
    } else {
      // portada: la cámara gira despacio mostrando las casas y las montañas
      tCam += dt;
      const giro = AMPL_GIRO * Math.sin(tCam * VEL_GIRO_CAM);
      camera.position.set(POS_CAM_INTRO.x, POS_CAM_INTRO.y, POS_CAM_INTRO.z);
      objMira.set(
        camera.position.x + Math.sin(giro) * Math.cos(PITCH_CAM) * 40,
        camera.position.y - Math.sin(PITCH_CAM) * 40,
        camera.position.z + Math.cos(giro) * Math.cos(PITCH_CAM) * 40
      );
      foco.set(0, 0, 15);
    }
    if (MOSTRAR_COORDENADAS && modo === 'explorar') panelPos.textContent = 'x ' + jugador.position.x.toFixed(1) + '   z ' + jugador.position.z.toFixed(1);
    actualizarPuntos(reloj.elapsedTime);
    if (snap) { mira.copy(objMira); snap = false; } else mira.lerp(objMira, 1 - Math.pow(0.002, dt));
    camera.lookAt(mira);

    fondo.position.x = camera.position.x;
    fondo.position.z = camera.position.z;
        actualizarLuna();
    sol.position.set(foco.x + 50, mezcla.solY, foco.z + 30);
    sol.target.position.copy(foco);

    actualizarTema(dt);
    renderer.render(scene, camera);
  }
  requestAnimationFrame(loop);

  // ================== PRECOMPILAR ==================
  // El personaje y los marcadores están ocultos hasta "Explorar más"; el navegador compilaba sus
  // materiales justo al entrar y eso causaba un tirón. Aquí se compilan antes, sin que se vean.
  function precompilar() {
    const jv = jugador.visible, pv = puntosGrupo.visible;
    jugador.visible = true;
    puntosGrupo.visible = true;
    try { renderer.compile(scene, camera); } catch (e) { /* si falla, se compila al entrar como antes */ }
    jugador.visible = jv;
    puntosGrupo.visible = pv;
  }
  window.addEventListener('load', function () { setTimeout(precompilar, 5000); });

  // ================== API PARA CATAVI.js ==================
  window.Desierto = {
    mostrar() {
      visible = true;
      canvas.style.opacity = '1';
    },
    explorar() {                       // el personaje aparece detrás de las casas y ya se puede caminar
      if (modo === 'explorar' || cambiando) return;
      cambiando = true;
      precompilar();
      canvas.style.transition = 'opacity .4s ease';
      canvas.style.opacity = '0';
      setTimeout(() => {
        modo = 'explorar';
        angulo = 0;
        jugador.position.set(0, 0, Z_APARECER);
        jugador.rotation.y = 0;
        jugador.visible = true;
        camera.position.set(0, ALTURA_CAM, Z_APARECER - DIST_CAM);
        mira.set(0, 2.5, Z_APARECER);
        snap = false;
        canvas.style.opacity = '1';
        cambiando = false;
        const h = document.getElementById('desierto-hint');
        if (h) { h.classList.add('show'); setTimeout(() => h.classList.remove('show'), 9000); }
      }, 450);
    },
    volver() {                         // regresa a la portada (cámara girando)
      if (modo === 'intro' || cambiando) return;
      cambiando = true;
      canvas.style.transition = 'opacity .4s ease';
      canvas.style.opacity = '0';
      for (const k in teclas) teclas[k] = false;
      cerrarInfo(); cercano = null; mostrarAviso(false);
      const h = document.getElementById('desierto-hint');
      if (h) h.classList.remove('show');
      setTimeout(() => {
        modo = 'intro';
        jugador.visible = false;
        snap = true;
        canvas.style.opacity = '1';
        cambiando = false;
      }, 450);
    },
    ocultar() { visible = false; canvas.style.opacity = '0'; },
    pausar(p) {
      pausado = !!p;
      if (pausado) for (const k in teclas) teclas[k] = false;
    },
    setTema(nombre) { tema = TEMAS[nombre] || TEMAS.claro; }
  };
})();