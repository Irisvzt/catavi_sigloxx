/* escudo.js — el escudo 3D de la cooperativa (canvas #escudo, a la derecha) */
(function () {
  'use strict';
  const RUTA_ESCUDO = './escudo.glb';

  const canvas = document.getElementById('escudo');
  if (!canvas || !window.THREE || !THREE.GLTFLoader) {
    console.warn('[Escudo] Falta #escudo o GLTFLoader.');
    return;
  }

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;

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

  // Arrastrar para girarlo
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

  function loop() {
    requestAnimationFrame(loop);
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    const pr = renderer.getPixelRatio();
    if (canvas.width !== Math.floor(w * pr) || canvas.height !== Math.floor(h * pr)) {
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    if (!arrastrando) grupo.rotation.y += 0.006;    // giro lento
    renderer.render(scene, camera);
  }
  loop();
})();