/* =====================================================================
   desierto.js — Cooperativa Multiactiva Catavi Siglo XX
   Entrada principal más grande, alejada y girada hacia el personaje.
   ===================================================================== */
(function () {
  'use strict';
  console.log('desierto.js VERSION 4 cargada');

  // ================== CONFIGURACIÓN ==================
  const RUTA_SUELO = './TEXTURA DE ARENA.jpg';
  const RUTA_MONTANAS = './MONTAÑAS.png';
  const RUTA_PERSONAJE = './P CAMINANDO.fbx';

  const TAMANO = 2000, REPETICIONES = 100;
  const RADIO_FONDO = 900, ALTO_FONDO = 460, BAJAR_FONDO = 100;
  const VELOCIDAD = 8, GIRO = 2.2;

  const ALTURA_PERSONAJE = 3.5, ORIENTACION = 0;
  const VELOCIDAD_ANIMACION = 1, SUAVIZADO_BUCLE = 0.2;

  // ================== CASAS ==================
  const CASAS = [
    './CASA 1.glb',
    './CASA 2.glb',
    './CASA IZQUIERDA.glb',
    './CASA DERECHA.glb'
  ];

  // Tamaño de cada modelo (largo horizontal máximo).
  // Orden: CASA 1, CASA 2, CASA IZQUIERDA, CASA DERECHA
  const TAMANO_POR_MODELO = [25, 25, 35, 25];

  // CASA 1 (índice 0) girada 180° porque estaba de espaldas
  const GIRO_EXTRA_POR_MODELO = [Math.PI, 0, 0, Math.PI];
  const ALTURA_EXTRA_POR_MODELO = [0, 0, 0, 0];

  const DISTANCIA_CALLE = 26;
  const Z_CASA_DER = 40, Z_CASA_IZQ = 15, ADELANTE_NUEVAS = -27;
  const ROTACION_IZQ = 0, ROTACION_DER = Math.PI;

  // CASA IZQUIERDA: un poco más atrás y más a la derecha
  const ATRAS_CASA_IZQUIERDA = 8;
  const DERECHA_CASA_IZQUIERDA = 6;

  // CASA DERECHA: más cerca de la CASA 1
  const ADELANTE_CASA_DERECHA = -20;

  // CASA GRANDE: delante de la CASA 1
  const ADELANTE_CASA_GRANDE = 45;
  const X_CASA_GRANDE = -DISTANCIA_CALLE;
  const Z_CASA_GRANDE = Z_CASA_IZQ + ADELANTE_CASA_GRANDE;
  const ROTACION_CASA_GRANDE = ROTACION_IZQ;

  // Ruta y escala de CASA GRANDE (se carga aparte).
  // ESCALA_CASA_GRANDE multiplica el tamaño ORIGINAL del modelo.
  // Mira la consola: imprime "[CASA GRANDE] tamaño final" para ajustarlo.
  const RUTA_CASA_GRANDE = './CASA GRANDE.glb';
  const ESCALA_CASA_GRANDE = 1;

  // ================== MEDIO FONDO ==================
  // Modelo más adelante que las demás casas (Z mayor = más lejos).
  const RUTA_MEDIO_FONDO = './medioFondo.glb';
  const TAMANO_MEDIO_FONDO = 40;   // largo horizontal máximo del modelo
  const POS_MEDIO_FONDO_X = 0;
  const POS_MEDIO_FONDO_Z = 85;
  const GIRO_MEDIO_FONDO = 0;      // prueba Math.PI si se ve de espaldas

  // Rayos de luz para ver DÓNDE están los modelos (rojo = medioFondo,
  // verde = CASA GRANDE). Ponlo en false cuando ya los veas.
  const MARCADORES_DEBUG = true;

  // ================== ENTRADA PRINCIPAL ==================
  const RUTA_ENTRADA = './ENTRADA.glb';

  const TAMANO_ENTRADA = 60;
  const POS_ENTRADA_X = 10;
  const POS_ENTRADA_Z = -2;
  const GIRO_ENTRADA = Math.PI;

  // ================== PERSONAJE Y CÁMARA ==================
  const INICIO_EXPLORAR_Z = -18;
  const DIST_CAM = 7;
  const ALTURA_CAM = 4;

  const POS_CAM_INTRO = {
    x: 0,
    y: ALTURA_CAM,
    z: INICIO_EXPLORAR_Z - DIST_CAM
  };

  const PITCH_CAM = Math.atan(
    (ALTURA_CAM - 2.5) / DIST_CAM
  );

  const AMPL_GIRO = 1.3;
  const VEL_GIRO_CAM = 0.2;

  // ================== PUNTOS DE INFORMACIÓN ==================
  const RADIO_INFO = 5;

  const PUNTOS_INFO = [
    {
      x: 6, z: -2,
      titulo: 'Quiénes somos',
      texto: [
        'Organización boliviana nacida en Llallagua, Potosí, que reúne el trabajo minero, comercial y social de sus socios bajo un modelo cooperativo, solidario y democrático.'
      ]
    },
    {
      x: -9, z: 15,
      titulo: 'Nuestra fundación',
      texto: [
        'Cooperativa Minera Multiactiva Catavi Siglo XX R.L., fundada el 3 de mayo de 1994 en Llallagua, Potosí, Bolivia.',
        'Personería jurídica N° 04665.'
      ]
    },
    {
      x: 9, z: 28,
      titulo: 'El trabajo minero',
      texto: [
        'La cooperativa nació de la fuerza del pueblo minero: el trabajo de sus socios en la extracción y el procesamiento del mineral es el corazón de la organización.'
      ]
    },
    {
      x: -9, z: 42,
      titulo: 'Procesos',
      texto: [
        'Conoce los equipos de la planta: alimentación, molienda, mesas, filtro y secadora.'
      ],
      enlace: {
        texto: 'Ver procesos',
        url: '3dExtraccion/extraccion.html'
      }
    },
    {
      x: 9, z: 55,
      titulo: 'Galería',
      texto: [
        'Imágenes y modelos de las instalaciones y del trabajo de la cooperativa.'
      ],
      enlace: {
        texto: 'Ver galería',
        url: '3dGaleria/galeria.html'
      }
    }
  ];

  // ================== COMPROBACIONES ==================
  const canvas = document.getElementById('canvas-desierto');

  if (
    !canvas ||
    !window.THREE ||
    !THREE.FBXLoader ||
    !THREE.GLTFLoader
  ) {
    console.warn(
      '[Desierto] Falta el canvas o alguna librería de Three.js.'
    );
    return;
  }

  // ================== PANEL DE ESTADO (depuración) ==================
  // Muestra en pantalla qué modelos cargaron y cuáles fallaron.
  const panelEstado = document.createElement('div');

  panelEstado.style.cssText =
    'position:fixed;left:8px;bottom:8px;z-index:99;' +
    'background:rgba(0,0,0,.75);color:#fff;' +
    'font:11px/1.5 monospace;padding:8px 10px;' +
    'border-radius:6px;max-width:420px;pointer-events:none;';

  if (typeof MARCADORES_DEBUG !== 'undefined' && MARCADORES_DEBUG) {
    document.body.appendChild(panelEstado);
  }

  function estado(texto, ok) {
    const l = document.createElement('div');
    l.style.color = ok ? '#7CFC7C' : '#ff7b7b';
    l.textContent = (ok ? '✔ ' : '✘ ') + texto;
    panelEstado.appendChild(l);
  }

  estado('desierto.js VERSION 4', true);

  // ================== ESCENA ==================
  const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true
  });

  renderer.setPixelRatio(
    Math.min(window.devicePixelRatio, 2)
  );

  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.shadowMap.enabled = true;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x9ec5e8);
  scene.fog = new THREE.Fog(0xc9b8a0, 150, 700);

  const fogBase = new THREE.Color(0xc9b8a0);

  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 2000);

  camera.position.set(
    POS_CAM_INTRO.x,
    POS_CAM_INTRO.y,
    POS_CAM_INTRO.z
  );

  const hemi = new THREE.HemisphereLight(
    0xffffff,
    0x8a7a66,
    0.85
  );

  scene.add(hemi);

  const sol = new THREE.DirectionalLight(0xfff2d6, 0.9);
  sol.castShadow = true;
  sol.shadow.mapSize.set(2048, 2048);

  const sc = sol.shadow.camera;
  sc.left = -40;
  sc.right = 40;
  sc.top = 40;
  sc.bottom = -40;
  sc.near = 1;
  sc.far = 250;

  scene.add(sol, sol.target);

  // ================== PISO ==================
  const matSuelo = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 1,
    metalness: 0
  });

  new THREE.TextureLoader().load(
    RUTA_SUELO,
    function (tex) {
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(REPETICIONES, REPETICIONES);
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      tex.encoding = THREE.sRGBEncoding;
      matSuelo.map = tex;
      matSuelo.needsUpdate = true;
    },
    undefined,
    function () {
      matSuelo.color.set(0x8b6f4e);
      console.warn('[Desierto] No se encontró ' + RUTA_SUELO);
    }
  );

  const suelo = new THREE.Mesh(
    new THREE.PlaneGeometry(TAMANO, TAMANO),
    matSuelo
  );

  suelo.rotation.x = -Math.PI / 2;
  suelo.receiveShadow = true;
  scene.add(suelo);

  // ================== MONTAÑAS ==================
  const matFondo = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    side: THREE.BackSide,
    fog: false,
    depthWrite: false
  });

  const TEMAS = {
    claro: {
      cielo: new THREE.Color(0x9ec5e8),
      tinte: new THREE.Color(1, 1, 1),
      hemi: 0.85,
      sol: 0.9,
      solColor: new THREE.Color(0xfff2d6)
    },
    oscuro: {
      cielo: new THREE.Color(0x0a1020),
      tinte: new THREE.Color(0.14, 0.18, 0.32),
      hemi: 0.28,
      sol: 0.28,
      solColor: new THREE.Color(0x9fb4ff)
    }
  };

  let tema = TEMAS.claro;

  const mezcla = {
    cielo: TEMAS.claro.cielo.clone(),
    tinte: TEMAS.claro.tinte.clone(),
    hemi: TEMAS.claro.hemi,
    sol: TEMAS.claro.sol,
    solColor: TEMAS.claro.solColor.clone()
  };

  new THREE.TextureLoader().load(
    RUTA_MONTANAS,
    function (tex) {
      tex.encoding = THREE.sRGBEncoding;
      tex.wrapS = THREE.MirroredRepeatWrapping;

      const anchoImagen =
        ALTO_FONDO * (tex.image.width / tex.image.height);

      const vueltas =
        (2 * Math.PI * RADIO_FONDO) / anchoImagen;

      tex.repeat.x = Math.max(
        2,
        2 * Math.round(vueltas / 2)
      );

      matFondo.map = tex;
      matFondo.needsUpdate = true;

      try {
        const cv = document.createElement('canvas');
        cv.width = 32;
        cv.height = 100;

        const cx = cv.getContext('2d');
        cx.drawImage(tex.image, 0, 0, 32, 100);

        const fila = Math.min(
          99,
          Math.max(
            0,
            Math.round((1 - BAJAR_FONDO / ALTO_FONDO) * 100)
          )
        );

        const d = cx.getImageData(0, fila, 32, 1).data;

        let r = 0, g = 0, b = 0;

        for (let i = 0; i < 32; i++) {
          r += d[i * 4];
          g += d[i * 4 + 1];
          b += d[i * 4 + 2];
        }

        fogBase.setRGB(
          r / 32 / 255,
          g / 32 / 255,
          b / 32 / 255
        ).convertSRGBToLinear();

        const dt2 = cx.getImageData(0, 1, 32, 1).data;

        let r2 = 0, g2 = 0, b2 = 0;

        for (let i = 0; i < 32; i++) {
          r2 += dt2[i * 4];
          g2 += dt2[i * 4 + 1];
          b2 += dt2[i * 4 + 2];
        }
        TEMAS.claro.cielo.setRGB(
          r2 / 32 / 255,
          g2 / 32 / 255,
          b2 / 32 / 255
        );

        TEMAS.oscuro.cielo
          .copy(TEMAS.claro.cielo)
          .multiplyScalar(0.3);

        mezcla.cielo.copy(tema.cielo);
      } catch (e) {
        console.warn('[Desierto] Error ajustando la niebla:', e);
      }
    },
    undefined,
    function () {
      matFondo.color.set(0x6f8aa8);
      console.warn('[Desierto] No se encontró ' + RUTA_MONTANAS);
    }
  );

  const fondo = new THREE.Mesh(
    new THREE.CylinderGeometry(
      RADIO_FONDO,
      RADIO_FONDO,
      ALTO_FONDO,
      64,
      1,
      true
    ),
    matFondo
  );

  fondo.position.y = ALTO_FONDO / 2 - BAJAR_FONDO;
  fondo.renderOrder = -1;
  scene.add(fondo);

  function actualizarTema() {
    const k = 0.04;

    mezcla.cielo.lerp(tema.cielo, k);
    mezcla.tinte.lerp(tema.tinte, k);
    mezcla.solColor.lerp(tema.solColor, k);

    mezcla.hemi += (tema.hemi - mezcla.hemi) * k;
    mezcla.sol += (tema.sol - mezcla.sol) * k;

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
  jugador.visible = false;

  let mixer = null;
  let accionCaminar = null;
  let huesoCadera = null;
  let modeloGrupo = null;

  const baseCadera = new THREE.Vector3();
  const _v = new THREE.Vector3();

  const ES_RAIZ_POS =
    /(hips|root|pelvis|armature).*\.position$/i;

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
    const q0 = new THREE.Quaternion();
    const q1 = new THREE.Quaternion();

    clip.tracks.forEach(function (t) {
      if (ES_RAIZ_POS.test(t.name)) return;

      const size = t.getValueSize();
      const v = t.values;
      const tm = t.times;
      const n = tm.length;

      if (n < 3) return;

      const T = tm[n - 1];

      for (let i = 0; i < n; i++) {
        if (tm[i] < T - L) continue;

        const w = (tm[i] - (T - L)) / L;
        const k = w * w * (3 - 2 * w);

        if (size === 4) {
          q0.fromArray(v, 0);
          q1.fromArray(v, i * 4);
          q1.slerp(q0, k);
          q1.toArray(v, i * 4);
        } else {
          for (let j = 0; j < size; j++) {
            v[i * size + j] +=
              (v[j] - v[i * size + j]) * k;
          }
        }
      }
    });
  }

  new THREE.FBXLoader().load(
    RUTA_PERSONAJE,
    function (obj) {
      const caja = new THREE.Box3().setFromObject(obj);

      obj.scale.setScalar(
        ALTURA_PERSONAJE / (caja.max.y - caja.min.y)
      );

      const cajaEscalada = new THREE.Box3().setFromObject(obj);
      obj.position.y -= cajaEscalada.min.y;

      obj.traverse(function (m) {
        if (!m.isMesh) return;

        m.castShadow = true;
        m.frustumCulled = false;

        [].concat(m.material).forEach(function (mt) {
          if (mt && mt.map) mt.map.encoding = THREE.sRGBEncoding;
        });
      });

      if (obj.animations.length) {
        const clip =
          obj.animations.find(function (c) {
            return /walk|camin/i.test(c.name);
          }) || obj.animations[0];

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

        obj.traverse(function (h) {
          if (!h.isBone) return;

          if (!primero) primero = h;

          if (!huesoCadera && /hips|pelvis/i.test(h.name)) {
            huesoCadera = h;
          }
        });

        huesoCadera = huesoCadera || primero;

        if (huesoCadera) {
          huesoCadera.getWorldPosition(baseCadera);
          modelo.worldToLocal(baseCadera);
        }
      }
    },
    undefined,
    function (err) {
      console.error('[Desierto] No se pudo cargar el personaje:', err);
    }
  );

  // ================== MARCADOR DE DEPURACIÓN ==================
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

      if (ext === 'fbx') {
        new THREE.FBXLoader().load(
          ruta, resolve, undefined, reject
        );
      } else {
        new THREE.GLTFLoader().load(
          ruta,
          function (gltf) {
            resolve(gltf.scene);
          },
          undefined,
          reject
        );
      }
    });
  }

  // ================== PREPARAR CASAS ==================
  function prepararCasa(obj, tamano) {
    const caja = new THREE.Box3().setFromObject(obj);
    const tam = caja.getSize(new THREE.Vector3());

    // Si tamano es 0, se deja el tamaño original del modelo
    if (tamano) {
      obj.scale.multiplyScalar(
        tamano / Math.max(tam.x, tam.z)
      );
    }

    const cajaEscalada = new THREE.Box3().setFromObject(obj);
    const centro = cajaEscalada.getCenter(new THREE.Vector3());

    obj.position.x -= centro.x;
    obj.position.z -= centro.z;
    obj.updateMatrixWorld(true);

    const ys = [];
    const v = new THREE.Vector3();

    obj.traverse(function (m) {
      if (!m.isMesh || !m.visible || !m.geometry.attributes.position) {
        return;
      }

      const pos = m.geometry.attributes.position;
      const salto = Math.max(1, Math.floor(pos.count / 4000));

      for (let i = 0; i < pos.count; i += salto) {
        v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld);
        ys.push(v.y);
      }
    });

    ys.sort(function (p, q) {
      return p - q;
    });

    const base = ys.length
      ? ys[Math.floor(ys.length * 0.02)]
      : cajaEscalada.min.y;

    obj.position.y -= base;

    obj.traverse(function (m) {
      if (m.isMesh) {
        m.castShadow = true;
        m.receiveShadow = true;
      }
    });

    const grupo = new THREE.Group();
    grupo.add(obj);

    return grupo;
  }

  Promise.allSettled(CASAS.map(cargarModelo)).then(
    function (resultados) {
      const bases = resultados.map(function (r, i) {
        if (r.status === 'fulfilled') {
          const t = TAMANO_POR_MODELO[i];

          return prepararCasa(
            r.value,
            t === undefined ? 18 : t
          );
        }

        console.warn(
          '[Desierto] No se pudo cargar la casa ' + CASAS[i],
          r.reason
        );
        estado('FALLÓ ' + CASAS[i], false);

        return null;
      });

      function colocar(indice, x, z, giro) {
        if (!bases[indice]) return;

        const casa = bases[indice].clone(true);

        casa.position.set(
          x,
          ALTURA_EXTRA_POR_MODELO[indice] || 0,
          z
        );

        casa.rotation.y =
          giro + (GIRO_EXTRA_POR_MODELO[indice] || 0);

        scene.add(casa);
      }

      colocar(0, -DISTANCIA_CALLE, Z_CASA_IZQ, ROTACION_IZQ);
      colocar(3, -DISTANCIA_CALLE, Z_CASA_IZQ + ADELANTE_CASA_DERECHA, ROTACION_IZQ);
      colocar(1, DISTANCIA_CALLE, Z_CASA_DER, ROTACION_DER);
      colocar(2, DISTANCIA_CALLE - DERECHA_CASA_IZQUIERDA, Z_CASA_DER + ADELANTE_NUEVAS - ATRAS_CASA_IZQUIERDA, ROTACION_DER);
    }
  );

  // ================== CASA GRANDE (bloque independiente) ==================
  cargarModelo(RUTA_CASA_GRANDE)
    .then(function (obj) {
      obj.scale.setScalar(ESCALA_CASA_GRANDE);
      obj.updateMatrixWorld(true);

      // Centrar en X y Z
      let caja = new THREE.Box3().setFromObject(obj);
      const centro = caja.getCenter(new THREE.Vector3());
      obj.position.x -= centro.x;
      obj.position.z -= centro.z;

      // Apoyar en el suelo
      obj.updateMatrixWorld(true);
      caja = new THREE.Box3().setFromObject(obj);
      obj.position.y -= caja.min.y;

      obj.traverse(function (m) {
        if (m.isMesh) {
          m.castShadow = true;
          m.receiveShadow = true;
        }
      });

      const grupo = new THREE.Group();
      grupo.add(obj);
      grupo.position.set(X_CASA_GRANDE, 0, Z_CASA_GRANDE);
      grupo.rotation.y = ROTACION_CASA_GRANDE;
      scene.add(grupo);

      const t = new THREE.Box3().setFromObject(grupo).getSize(new THREE.Vector3());
      console.log(
        '[CASA GRANDE] tamaño final:',
        t.x.toFixed(1), t.y.toFixed(1), t.z.toFixed(1)
      );
      estado(
        'CASA GRANDE ok, tamaño ' +
        t.x.toFixed(1) + ' x ' + t.y.toFixed(1) + ' x ' + t.z.toFixed(1),
        true
      );
    })
    .catch(function (err) {
      console.error('[Desierto] No se pudo cargar CASA GRANDE:', err);
      estado('FALLÓ ' + RUTA_CASA_GRANDE, false);
    });

  // ================== MEDIO FONDO ==================
  cargarModelo(RUTA_MEDIO_FONDO)
    .then(function (obj) {
      let caja = new THREE.Box3().setFromObject(obj);
      const tam = caja.getSize(new THREE.Vector3());
      const dimension = Math.max(tam.x, tam.z);

      if (dimension <= 0) {
        throw new Error('El modelo medioFondo no tiene dimensiones válidas.');
      }

      obj.scale.multiplyScalar(TAMANO_MEDIO_FONDO / dimension);

      // Centrar en X y Z
      obj.updateMatrixWorld(true);
      caja = new THREE.Box3().setFromObject(obj);
      const centro = caja.getCenter(new THREE.Vector3());
      obj.position.x -= centro.x;
      obj.position.z -= centro.z;

      // Apoyar en el suelo
      obj.updateMatrixWorld(true);
      caja = new THREE.Box3().setFromObject(obj);
      obj.position.y -= caja.min.y;

      obj.traverse(function (m) {
        if (!m.isMesh) return;
        m.castShadow = true;
        m.receiveShadow = true;
        m.frustumCulled = false;
      });

      const grupo = new THREE.Group();
      grupo.add(obj);
      grupo.position.set(POS_MEDIO_FONDO_X, 0, POS_MEDIO_FONDO_Z);
      grupo.rotation.y = GIRO_MEDIO_FONDO;
      scene.add(grupo);


      const tf = new THREE.Box3().setFromObject(grupo).getSize(new THREE.Vector3());
      console.log(
        '[medioFondo] cargado. Posición:',
        POS_MEDIO_FONDO_X, POS_MEDIO_FONDO_Z,
        '| tamaño final:',
        tf.x.toFixed(1), tf.y.toFixed(1), tf.z.toFixed(1)
      );
      estado(
        'medioFondo ok, tamaño ' +
        tf.x.toFixed(1) + ' x ' + tf.y.toFixed(1) + ' x ' + tf.z.toFixed(1),
        true
      );
    })
    .catch(function (err) {
      console.error(
        '[Desierto] No se pudo cargar ' + RUTA_MEDIO_FONDO +
        '. Comprueba el nombre, la extensión y la carpeta.',
        err
      );
      estado('FALLÓ ' + RUTA_MEDIO_FONDO, false);
    });

  // ================== ENTRADA PRINCIPAL ==================
  cargarModelo(RUTA_ENTRADA)
    .then(function (obj) {
      let caja = new THREE.Box3().setFromObject(obj);
      const tam = caja.getSize(new THREE.Vector3());
      const dimensionHorizontal = Math.max(tam.x, tam.z);

      if (dimensionHorizontal <= 0) {
        throw new Error('El modelo ENTRADA no tiene dimensiones válidas.');
      }

      // Aumentar el tamaño de la entrada sin deformarla.
      obj.scale.multiplyScalar(
        TAMANO_ENTRADA / dimensionHorizontal
      );

      // Centrar horizontalmente el modelo.
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

        [].concat(m.material || []).forEach(function (mt) {
          if (mt && mt.map) mt.map.encoding = THREE.sRGBEncoding;
        });
      });

      obj.position.x += POS_ENTRADA_X;
      obj.position.z += POS_ENTRADA_Z;

      // Giro de 180 grados para orientar la fachada al personaje.
      obj.rotation.y = GIRO_ENTRADA;

      scene.add(obj);

      console.log(
        '[Desierto] Entrada principal cargada correctamente:',
        RUTA_ENTRADA
      );
      estado('ENTRADA ok', true);
    })
    .catch(function (err) {
      console.error(
        '[Desierto] No se pudo cargar la entrada ' + RUTA_ENTRADA +
        '. Comprueba el nombre, extensión y carpeta del archivo.',
        err
      );
      estado('FALLÓ ' + RUTA_ENTRADA, false);
    });

  // ================== CONTROLES ==================
  let visible = false;
  let pausado = false;
  let modo = 'intro';

  const teclas = {};

  const hay = function () {
    return Array.from(arguments).some(function (c) {
      return teclas[c];
    });
  };

  const activo = function () {
    return visible && !pausado && modo === 'explorar';
  };

  const TECLAS_MOV = [
    'KeyW', 'KeyA', 'KeyS', 'KeyD',
    'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'
  ];

  addEventListener('keydown', function (e) {
    if (!activo() || !TECLAS_MOV.includes(e.code)) return;

    teclas[e.code] = true;
    e.preventDefault();
  });

  addEventListener('keyup', function (e) {
    teclas[e.code] = false;
  });

  addEventListener('blur', function () {
    for (const k in teclas) teclas[k] = false;
  });

  let angulo = 0;
  const LIMITE = TAMANO / 2 - 20;

  // ================== INTERFAZ DE INFORMACIÓN ==================
  const estilo = document.createElement('style');

  estilo.textContent = `
    #info-prompt {
      position:fixed; left:50%; bottom:64px;
      transform:translateX(-50%) translateY(8px);
      z-index:9; opacity:0; pointer-events:none;
      transition:opacity .25s ease,transform .25s ease;
    }
    #info-prompt.show {
      opacity:1; pointer-events:auto;
      transform:translateX(-50%);
    }
    #info-prompt button {
      font:11px 'Courier New',monospace;
      letter-spacing:2.5px; text-transform:uppercase;
      color:#04080f; background:#dff0ff; border:0;
      border-radius:22px; padding:11px 24px;
      cursor:pointer; box-shadow:0 0 18px rgba(79,163,232,.55);
    }
    #info-prompt button:hover { background:#fff; }
    #info-card {
      position:fixed; right:24px; bottom:24px;
      width:min(330px,calc(100vw - 48px)); z-index:9;
      background:rgba(4,8,15,.84);
      border:1px solid rgba(79,163,232,.45);
      border-radius:14px; padding:18px 20px; color:#fff;
      opacity:0; transform:translateY(12px);
      pointer-events:none;
      transition:opacity .3s ease,transform .3s ease;
    }
    #info-card.show {
      opacity:1; transform:none; pointer-events:auto;
    }
    #info-card .n {
      font:10px 'Courier New',monospace;
      letter-spacing:3px; color:#4fa3e8; margin-bottom:6px;
    }
    #info-card h3 {
      font:700 19px Georgia,serif;
      margin:0 0 8px; padding-right:26px;
    }
    #info-card p {
      font:13px/1.65 sans-serif;
      color:rgba(255,255,255,.86); margin:0 0 10px;
    }
    #info-card a {
      display:inline-block; margin-top:2px;
      font:11px 'Courier New',monospace;
      letter-spacing:2px; text-transform:uppercase;
      text-decoration:none; color:#dff0ff;
      border:1px solid rgba(79,163,232,.55);
      border-radius:18px; padding:8px 16px;
    }
    #info-card a:hover {
      background:#dff0ff; color:#04080f;
    }
    #info-card .x {
      position:absolute; top:8px; right:12px;
      background:none; border:0; color:#dff0ff;
      font-size:22px; line-height:1; cursor:pointer;
    }
    @media(max-width:640px) {
      #info-card {
        left:12px; right:12px; bottom:12px; width:auto;
      }
    }
  `;

  document.head.appendChild(estilo);

  const avisoEl = document.createElement('div');
  avisoEl.id = 'info-prompt';
  avisoEl.innerHTML =
    '<button type="button">Ver información · E / Enter</button>';

  document.body.appendChild(avisoEl);

  const tarjetaEl = document.createElement('div');
  tarjetaEl.id = 'info-card';
  document.body.appendChild(tarjetaEl);

  // ================== ICONOS DE INFORMACIÓN ==================
  const texIcono = (function () {
    const c = document.createElement('canvas');
    c.width = c.height = 128;

    const x = c.getContext('2d');

    x.fillStyle = 'rgba(4,8,15,.88)';
    x.beginPath();
    x.arc(64, 64, 56, 0, Math.PI * 2);
    x.fill();

    x.strokeStyle = '#4fa3e8';
    x.lineWidth = 8;
    x.stroke();

    x.fillStyle = '#fff';
    x.font = 'bold 76px Georgia';
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.fillText('i', 64, 70);

    return new THREE.CanvasTexture(c);
  })();

  const puntosGrupo = new THREE.Group();
  puntosGrupo.visible = false;
  scene.add(puntosGrupo);

  const puntos = PUNTOS_INFO.map(function (d, i) {
    const g = new THREE.Group();
    g.position.set(d.x, 0, d.z);

    const haz = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.35, 6, 16, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0x4fa3e8,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide,
        depthWrite: false,
        fog: false
      })
    );

    haz.position.y = 3;

    const aro = new THREE.Mesh(
      new THREE.RingGeometry(1.1, 1.5, 40),
      new THREE.MeshBasicMaterial({
        color: 0x4fa3e8,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
        depthWrite: false,
        fog: false
      })
    );

    aro.rotation.x = -Math.PI / 2;
    aro.position.y = 0.06;

    const icono = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: texIcono,
        depthWrite: false,
        fog: false
      })
    );

    icono.scale.set(2.2, 2.2, 1);
    icono.position.y = 6.2;

    g.add(haz, aro, icono);
    puntosGrupo.add(g);

    return { g: g, haz: haz, aro: aro, icono: icono, d: d, i: i };
  });

  let cercano = null;
  let abierto = null;

  function mostrarAviso(v) {
    avisoEl.classList.toggle('show', !!v);
  }

  function cerrarInfo() {
    abierto = null;
    tarjetaEl.classList.remove('show');
  }

  function abrirInfo(p) {
    abierto = p;
    tarjetaEl.innerHTML = '';

    function mk(tag, cls, txt) {
      const e = document.createElement(tag);
      if (cls) e.className = cls;
      if (txt) e.textContent = txt;
      return e;
    }

    tarjetaEl.appendChild(
      mk(
        'div',
        'n',
        String(p.i + 1).padStart(2, '0') +
        ' / ' + String(puntos.length).padStart(2, '0')
      )
    );

    tarjetaEl.appendChild(mk('h3', '', p.d.titulo));

    p.d.texto.forEach(function (t) {
      tarjetaEl.appendChild(mk('p', '', t));
    });

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

  avisoEl.querySelector('button').addEventListener('click', function () {
    if (cercano) abrirInfo(cercano);
  });

  addEventListener('keydown', function (e) {
    if (!activo()) return;

    if ((e.code === 'KeyE' || e.code === 'Enter') && cercano) {
      e.preventDefault();

      if (abierto === cercano) cerrarInfo();
      else abrirInfo(cercano);
    } else if (e.code === 'Escape') {
      cerrarInfo();
    }
  });

  const rayo = new THREE.Raycaster();
  const puntero = new THREE.Vector2();

  canvas.addEventListener('click', function (e) {
    if (!activo() || !cercano) return;

    const r = canvas.getBoundingClientRect();

    puntero.set(
      ((e.clientX - r.left) / r.width) * 2 - 1,
      -((e.clientY - r.top) / r.height) * 2 + 1
    );

    rayo.setFromCamera(puntero, camera);

    if (
      rayo.intersectObjects(
        [cercano.haz, cercano.icono],
        false
      ).length
    ) {
      abrirInfo(cercano);
    }
  });

  function actualizarPuntos(te) {
    puntosGrupo.visible = modo === 'explorar';

    if (modo !== 'explorar') return;

    let mejor = null;
    let mejorDist = RADIO_INFO;

    puntos.forEach(function (p) {
      const dist = Math.hypot(
        jugador.position.x - p.g.position.x,
        jugador.position.z - p.g.position.z
      );

      if (dist < mejorDist) {
        mejor = p;
        mejorDist = dist;
      }
    });

    if (mejor !== cercano) {
      cercano = mejor;

      if (abierto && abierto !== cercano) cerrarInfo();

      mostrarAviso(cercano && abierto !== cercano);
    }

    puntos.forEach(function (p) {
      const activoP = p === cercano;

      p.aro.scale.setScalar(
        1 + 0.15 * Math.sin(te * 3 + p.i) +
        (activoP ? 0.2 : 0)
      );

      p.haz.material.opacity =
        (activoP ? 0.55 : 0.25) +
        0.08 * Math.sin(te * 2 + p.i);

      p.icono.position.y =
        6.2 + 0.35 * Math.sin(te * 2 + p.i);
    });
  }

  // ================== BUCLE DE ANIMACIÓN ==================
  const reloj = new THREE.Clock();

  let tCam = 0;
  let cambiando = false;
  let snap = false;

  const objCam = new THREE.Vector3();
  const objMira = new THREE.Vector3();

  const mira = new THREE.Vector3(
    POS_CAM_INTRO.x,
    POS_CAM_INTRO.y - Math.sin(PITCH_CAM) * 40,
    POS_CAM_INTRO.z + Math.cos(PITCH_CAM) * 40
  );

  const foco = new THREE.Vector3();

  function ajustarTamano() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;

    if (!w || !h) return;

    const pr = renderer.getPixelRatio();

    if (
      canvas.width !== Math.floor(w * pr) ||
      canvas.height !== Math.floor(h * pr)
    ) {
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
  }

  function loop() {
    requestAnimationFrame(loop);

    const dt = Math.min(reloj.getDelta(), 0.05);

    if (!visible || pausado) return;

    ajustarTamano();

    if (modo === 'explorar') {
      if (hay('KeyA', 'ArrowLeft')) angulo += GIRO * dt;
      if (hay('KeyD', 'ArrowRight')) angulo -= GIRO * dt;

      let avance = 0;

      if (hay('KeyW', 'ArrowUp')) avance = 1;
      if (hay('KeyS', 'ArrowDown')) avance = -0.6;

      jugador.rotation.y = angulo;

      const dx = Math.sin(angulo);
      const dz = Math.cos(angulo);

      jugador.position.x = THREE.MathUtils.clamp(
        jugador.position.x + dx * avance * VELOCIDAD * dt,
        -LIMITE,
        LIMITE
      );

      jugador.position.z = THREE.MathUtils.clamp(
        jugador.position.z + dz * avance * VELOCIDAD * dt,
        -LIMITE,
        LIMITE
      );

      if (mixer) {
        if (accionCaminar) {
          accionCaminar.paused = avance === 0;
          accionCaminar.timeScale = avance * VELOCIDAD_ANIMACION;
        }

        mixer.update(dt);

        if (huesoCadera) bloquearCadera();
      }

      objCam.set(
        jugador.position.x - dx * DIST_CAM,
        ALTURA_CAM,
        jugador.position.z - dz * DIST_CAM
      );

      camera.position.lerp(
        objCam,
        1 - Math.pow(0.001, dt)
      );

      objMira.set(
        jugador.position.x,
        2.5,
        jugador.position.z
      );

      foco.copy(jugador.position);
    } else {
      tCam += dt;

      const giro = AMPL_GIRO * Math.sin(tCam * VEL_GIRO_CAM);

      camera.position.set(
        POS_CAM_INTRO.x,
        POS_CAM_INTRO.y,
        POS_CAM_INTRO.z
      );

      objMira.set(
        camera.position.x + Math.sin(giro) * Math.cos(PITCH_CAM) * 40,
        camera.position.y - Math.sin(PITCH_CAM) * 40,
        camera.position.z + Math.cos(giro) * Math.cos(PITCH_CAM) * 40
      );

      foco.set(0, 0, 15);
    }

    actualizarPuntos(reloj.elapsedTime);

    if (snap) {
      mira.copy(objMira);
      snap = false;
    } else {
      mira.lerp(objMira, 1 - Math.pow(0.002, dt));
    }

    camera.lookAt(mira);

    fondo.position.x = camera.position.x;
    fondo.position.z = camera.position.z;

    sol.position.set(
      foco.x + 50,
      80,
      foco.z + 30
    );

    sol.target.position.copy(foco);

    actualizarTema();
    renderer.render(scene, camera);
  }

  requestAnimationFrame(loop);

  // ================== API PARA LA PÁGINA PRINCIPAL ==================
  window.Desierto = {
    mostrar: function () {
      visible = true;
      canvas.style.opacity = '1';
    },

    explorar: function () {
      if (modo === 'explorar' || cambiando) return;

      cambiando = true;
      canvas.style.transition = 'opacity .4s ease';
      canvas.style.opacity = '0';

      setTimeout(function () {
        modo = 'explorar';
        angulo = 0;

        jugador.position.set(0, 0, INICIO_EXPLORAR_Z);
        jugador.rotation.y = 0;
        jugador.visible = true;

        camera.position.set(
          0,
          ALTURA_CAM,
          INICIO_EXPLORAR_Z - DIST_CAM
        );

        mira.set(0, 2.5, INICIO_EXPLORAR_Z);
        snap = false;

        canvas.style.opacity = '1';
        cambiando = false;

        const h = document.getElementById('desierto-hint');

        if (h) {
          h.classList.add('show');

          setTimeout(function () {
            h.classList.remove('show');
          }, 9000);
        }
      }, 450);
    },

    volver: function () {
      if (modo === 'intro' || cambiando) return;

      cambiando = true;
      canvas.style.transition = 'opacity .4s ease';
      canvas.style.opacity = '0';

      for (const k in teclas) teclas[k] = false;

      cerrarInfo();
      cercano = null;
      mostrarAviso(false);

      const h = document.getElementById('desierto-hint');

      if (h) h.classList.remove('show');

      setTimeout(function () {
        modo = 'intro';
        jugador.visible = false;
        snap = true;

        canvas.style.opacity = '1';
        cambiando = false;
      }, 450);
    },

    ocultar: function () {
      visible = false;
      canvas.style.opacity = '0';
    },

    pausar: function (p) {
      pausado = !!p;

      if (pausado) {
        for (const k in teclas) teclas[k] = false;
      }
    },

    setTema: function (nombre) {
      tema = TEMAS[nombre] || TEMAS.claro;
    }
  };
})();