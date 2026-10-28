/* escudo.js — el escudo 3D de la cooperativa (canvas #escudo, a la derecha)
   Postprocesado: UnrealBloomPass + ShaderPass propio que conserva la
   transparencia del canvas (sin cuadro negro).

   Cómo funciona: se usan DOS composers.
   1) bloomComposer: RenderPass + UnrealBloomPass  -> escena con resplandor.
   2) finalComposer: RenderPass + ShaderPass       -> mezcla la escena original
      (que tiene el canal alfa correcto) con el resplandor, y calcula el alfa
      final para que el fondo siga siendo transparente. */
(function () {
  'use strict';
  const RUTA_ESCUDO = './escudo.glb';

  // ---- Resplandor (Bloom) ----
  const USAR_BLOOM    = true;
  const FUERZA_BLOOM  = 0.45;  // intensidad del brillo
  const RADIO_BLOOM   = 0.3;   // qué tan lejos se expande el halo (0 a 1)
  const UMBRAL_BLOOM  = 0.75;  // desde qué brillo empieza a brillar (0 = todo)
  const PIXEL_RATIO_MAX = 1.5; // baja a 1 si va lento

  const BASE = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/';
  const SCRIPTS_BLOOM = [
    'shaders/CopyShader.js',
    'shaders/LuminosityHighPassShader.js',
    'postprocessing/ShaderPass.js',
    'postprocessing/MaskPass.js',
    'postprocessing/EffectComposer.js',
    'postprocessing/RenderPass.js',
    'postprocessing/UnrealBloomPass.js'
  ];

  const canvas = document.getElementById('escudo');
  if (!canvas || !window.THREE || !THREE.GLTFLoader) {
    console.warn('[Escudo] Falta #escudo o GLTFLoader.');
    return;
  }

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, PIXEL_RATIO_MAX));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
  camera.position.set(0, 0, 7);

  scene.add(new THREE.AmbientLight(0xffffff, 1.1));
  const luz = new THREE.DirectionalLight(0xffffff, 2.2);
  luz.position.set(3, 5, 6);
  scene.add(luz);
  const relleno = new THREE.DirectionalLight(0xaecbff, 0.8);
  relleno.position.set(-5, 1, -3);
  scene.add(relleno);

  const grupo = new THREE.Group();
  scene.add(grupo);

  new THREE.GLTFLoader().load(
    RUTA_ESCUDO,
    (gltf) => {
      const modelo = gltf.scene;
      const caja = new THREE.Box3().setFromObject(modelo);
      const centro = caja.getCenter(new THREE.Vector3());
      const tam = caja.getSize(new THREE.Vector3());
      const k = 3 / Math.max(tam.x, tam.y, tam.z);   // el escudo mide 3 unidades
      modelo.scale.setScalar(k);
      modelo.position.sub(centro.multiplyScalar(k));
      grupo.add(modelo);
    },
    undefined,
    () => console.warn('[Escudo] No se encontró ' + RUTA_ESCUDO)
  );

  // ================== POSTPROCESADO ==================
  let bloomComposer = null;
  let finalComposer = null;

  function cargarScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = BASE + src;
      s.onload = resolve;
      s.onerror = () => reject(new Error('No cargó ' + src));
      document.head.appendChild(s);
    });
  }

  function crearObjetivo(w, h) {
    if (renderer.capabilities.isWebGL2 && THREE.WebGLMultisampleRenderTarget) {
      return new THREE.WebGLMultisampleRenderTarget(w, h, { format: THREE.RGBAFormat });
    }
    return new THREE.WebGLRenderTarget(w, h, { format: THREE.RGBAFormat });
  }

  // ShaderPass propio: suma el resplandor a la escena y recalcula el alfa
  const MezclaShader = {
    uniforms: {
      baseTexture:  { value: null },   // escena con su alfa original
      bloomTexture: { value: null }    // escena + resplandor
    },
    vertexShader: [
      'varying vec2 vUv;',
      'void main() {',
      '  vUv = uv;',
      '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
      '}'
    ].join('\n'),
    fragmentShader: [
      'uniform sampler2D baseTexture;',
      'uniform sampler2D bloomTexture;',
      'varying vec2 vUv;',
      'void main() {',
      '  vec4 base = texture2D(baseTexture, vUv);',
      '  vec4 conBloom = texture2D(bloomTexture, vUv);',
      '  vec3 brillo = max(conBloom.rgb - base.rgb, vec3(0.0));',
      '  vec3 color = linearToOutputTexel(vec4(base.rgb + brillo, 1.0)).rgb;',
      '  vec3 brilloCod = linearToOutputTexel(vec4(brillo, 1.0)).rgb;',
      '  float alfa = clamp(base.a + max(max(brilloCod.r, brilloCod.g), brilloCod.b), 0.0, 1.0);',
      '  gl_FragColor = vec4(color, alfa);',
      '}'
    ].join('\n')
  };

  function activarBloom() {
    const pr = renderer.getPixelRatio();
    const w = Math.max(2, Math.floor((canvas.clientWidth || 512) * pr));
    const h = Math.max(2, Math.floor((canvas.clientHeight || 512) * pr));

    // 1) Escena + resplandor
    bloomComposer = new THREE.EffectComposer(renderer, crearObjetivo(w, h));
    bloomComposer.renderToScreen = false;
    bloomComposer.addPass(new THREE.RenderPass(scene, camera));
    bloomComposer.addPass(new THREE.UnrealBloomPass(
      new THREE.Vector2(w, h), FUERZA_BLOOM, RADIO_BLOOM, UMBRAL_BLOOM
    ));

    // 2) Escena original + mezcla final (conserva la transparencia)
    finalComposer = new THREE.EffectComposer(renderer, crearObjetivo(w, h));
    finalComposer.addPass(new THREE.RenderPass(scene, camera));

    const mezcla = new THREE.ShaderPass(
      new THREE.ShaderMaterial({
        uniforms: THREE.UniformsUtils.clone(MezclaShader.uniforms),
        vertexShader: MezclaShader.vertexShader,
        fragmentShader: MezclaShader.fragmentShader
      }),
      'baseTexture'
    );
    mezcla.uniforms.bloomTexture.value = bloomComposer.renderTarget2.texture;
    finalComposer.addPass(mezcla);
  }

  function fallar(err) {
    console.warn('[Escudo] Postprocesado no disponible, render normal:', err);
    bloomComposer = null;
    finalComposer = null;
  }

  if (USAR_BLOOM) {
    let cadena = Promise.resolve();
    if (!(THREE.EffectComposer && THREE.RenderPass && THREE.UnrealBloomPass && THREE.ShaderPass)) {
      SCRIPTS_BLOOM.forEach((src) => { cadena = cadena.then(() => cargarScript(src)); });
    }
    cadena
      .then(activarBloom)
      .then(() => console.log('[Escudo] Bloom + ShaderPass activos'))
      .catch(fallar);
  }

  // ================== ARRASTRAR PARA GIRAR ==================
  let arrastrando = false, ultimoX = 0;
  canvas.addEventListener('pointerdown', (e) => {
    arrastrando = true; ultimoX = e.clientX;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!arrastrando) return;
    grupo.rotation.y += (e.clientX - ultimoX) * 0.012;
    ultimoX = e.clientX;
  });
  const soltar = () => { arrastrando = false; };
  canvas.addEventListener('pointerup', soltar);
  canvas.addEventListener('pointercancel', soltar);

  // ================== BUCLE ==================
  // En modo explorar el escudo está oculto: se deja de dibujar (después de que termina de desvanecerse)
  let pausadoDesde = 0;

  function loop() {
    requestAnimationFrame(loop);

    if (document.hidden) return;
    if (document.body.classList.contains('explorando')) {
      if (!pausadoDesde) pausadoDesde = performance.now();
      if (performance.now() - pausadoDesde > 1000) return;
    } else {
      pausadoDesde = 0;
    }

    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    const pr = renderer.getPixelRatio();
    if (canvas.width !== Math.floor(w * pr) || canvas.height !== Math.floor(h * pr)) {
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      if (bloomComposer) {
        bloomComposer.setSize(Math.floor(w * pr), Math.floor(h * pr));
        finalComposer.setSize(Math.floor(w * pr), Math.floor(h * pr));
      }
    }
    if (!arrastrando) grupo.rotation.y += 0.006;    // giro lento

    if (bloomComposer && finalComposer) {
      try {
        bloomComposer.render();
        finalComposer.render();
      } catch (err) {
        fallar(err);
        renderer.render(scene, camera);
      }
    } else {
      renderer.render(scene, camera);
    }
  }
  loop();
})();