(function(){

  /* ══════════════════════════════════════════
     CONFIGURA AQUÍ LAS RUTAS DE TUS MODELOS .GLB
  ══════════════════════════════════════════ */
  const MINER_MODEL = './MNERO.glb'; // ya no se usa visualmente en la intro (ver más abajo)
  const SHIELD_MODEL = './escudo.glb';
  const WALK_MINER_FBX = './Start Walking.fbx'; // usado en el MUNDO caminable

  /* ══════════════════════════════════════════
     PORTALES A OTROS MUNDOS
  ══════════════════════════════════════════ */
  const PORTAL_DESTINATIONS = {
    extraccion: './3dExtraccion/extraccion.html',
    galeria: './3dGaleria/galeria.html'
  };
  const PORTAL_TRIGGER_DIST = 2.3;
  let nearPortal = null;
  let portalPromptEl = null;

  /* ══════════════════════════════════════════
     ESCENA ÚNICA
  ══════════════════════════════════════════ */
  const container = document.getElementById('cc');
  const canvas    = document.getElementById('tc');
  const W = () => container.clientWidth;
  const H = () => container.clientHeight;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, alpha:true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(W(), H());
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
  renderer.outputEncoding    = THREE.sRGBEncoding;
  renderer.toneMapping       = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;

  const textureLoader = new THREE.TextureLoader();

  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, W()/H(), 0.1, 100);
  camera.position.set(0, 0.5, 5.5);
  camera.lookAt(0, -0.2, 0);

  const ambientLight = new THREE.AmbientLight(0x0a1a2e, 1.2);
  scene.add(ambientLight);
  const dirLight = new THREE.DirectionalLight(0xadd8ff, 2.8);
  dirLight.position.set(4, 7, 5); dirLight.castShadow = true; scene.add(dirLight);
  const fillDir = new THREE.DirectionalLight(0x1a4a8a, 1.0);
  fillDir.position.set(-5, 2, -4); scene.add(fillDir);
  const rimLight = new THREE.DirectionalLight(0x4fa3e8, 0.6);
  rimLight.position.set(0, -2, -5); scene.add(rimLight);
  const topLight = new THREE.DirectionalLight(0xffffff, 0.8);
  topLight.position.set(0, 10, 0); scene.add(topLight);

  /* ══════════════════════════════════════════════════════════
     CIELO AMBIENTAL PROCEDURAL — Claro / Oscuro (sin imágenes)
     Cambia el degradado del cielo, el sol/luna, las estrellas y
     la iluminación de toda la escena, con transición suave.
  ══════════════════════════════════════════════════════════ */
  const AMBIENT_THEMES = {
    claro: {
      skyTop: new THREE.Color(0x3a8fd6), skyBottom: new THREE.Color(0xbfe3ff),
      sunColor: new THREE.Color(0xfff6d0), sunPos: new THREE.Vector3(6, 9, -10),
      ambient: new THREE.Color(0xaee0ff), ambientI: 1.3,
      dir: new THREE.Color(0xffffff), dirI: 2.6,
      fill: new THREE.Color(0x6fa8dc), fillI: 0.7,
      rim: new THREE.Color(0xffffff), rimI: 0.3,
      starsOpacity: 0,
      shieldLight: new THREE.Color(0xfff8e0), shieldLightI: 0.6,
      bgTint: new THREE.Color(0xffffff)
    },
    oscuro: {
      skyTop: new THREE.Color(0x03050e), skyBottom: new THREE.Color(0x162447),
      sunColor: new THREE.Color(0xcdd8ff), sunPos: new THREE.Vector3(4, 10, -10),
      ambient: new THREE.Color(0x1a2c4a), ambientI: 0.5,
      dir: new THREE.Color(0x88a2ff), dirI: 0.7,
      fill: new THREE.Color(0x223355), fillI: 0.4,
      rim: new THREE.Color(0x4fa3e8), rimI: 0.6,
      starsOpacity: 1,
      shieldLight: new THREE.Color(0xbcd4ff), shieldLightI: 2.6,
      bgTint: new THREE.Color(0x141a33)
    }
  };

  // Luz dedicada al escudo: compensa el ambiente oscuro
  const shieldLight = new THREE.PointLight(0xffffff, 0, 7);
  shieldLight.position.set(0.6, 1.4, 2.4);
  scene.add(shieldLight);

  // ══════ FONDO DE ARENALES — imagen real que cubre toda la pantalla,
  // tintada según el ambiente elegido (claro/oscuro) ══════
  const bgTexture = textureLoader.load('./FONDO.png'); // ← CAMBIA por tu imagen
  bgTexture.encoding = THREE.sRGBEncoding;

  function makeBgPlaneGeometry(distance){
    const vFov = camera.fov * Math.PI / 180;
    const visibleHeight = 2 * Math.tan(vFov/2) * distance;
    const visibleWidth = visibleHeight * camera.aspect;
    return new THREE.PlaneGeometry(visibleWidth * 1.15, visibleHeight * 1.15);
  }

  const BG_DISTANCE = 20;
  const bgMat = new THREE.MeshBasicMaterial({ map: bgTexture, color: 0xffffff, transparent: true, depthWrite: false });
  const bgPlane = new THREE.Mesh(makeBgPlaneGeometry(BG_DISTANCE), bgMat);
  bgPlane.position.set(0, 0, -BG_DISTANCE); // posición LOCAL: siempre delante de la cámara
  bgPlane.renderOrder = -2;
  bgPlane.visible = false; // aparece recién cuando se rompe la piedra (ver finishReveal)
  camera.add(bgPlane);
  scene.add(camera); // necesario para que Three.js renderice los hijos de la cámara

  function resizeBgPlane(){
    bgPlane.geometry.dispose();
    bgPlane.geometry = makeBgPlaneGeometry(BG_DISTANCE);
  }

  // Transición suave entre temas (se llama cada frame, interpola hacia el tema activo)
  let targetAmbientTheme = AMBIENT_THEMES.claro;
  const ambientMix = {
    skyTop: AMBIENT_THEMES.claro.skyTop.clone(), skyBottom: AMBIENT_THEMES.claro.skyBottom.clone(),
    sunColor: AMBIENT_THEMES.claro.sunColor.clone(), sunPos: AMBIENT_THEMES.claro.sunPos.clone(),
    ambientColor: AMBIENT_THEMES.claro.ambient.clone(), ambientI: AMBIENT_THEMES.claro.ambientI,
    dirColor: AMBIENT_THEMES.claro.dir.clone(), dirI: AMBIENT_THEMES.claro.dirI,
    fillColor: AMBIENT_THEMES.claro.fill.clone(), fillI: AMBIENT_THEMES.claro.fillI,
    rimColor: AMBIENT_THEMES.claro.rim.clone(), rimI: AMBIENT_THEMES.claro.rimI,
    starsOpacity: AMBIENT_THEMES.claro.starsOpacity,
    shieldLightColor: AMBIENT_THEMES.claro.shieldLight.clone(), shieldLightI: AMBIENT_THEMES.claro.shieldLightI,
    bgTintColor: AMBIENT_THEMES.claro.bgTint.clone()
  };
  const AMBIENT_LERP_SPEED = 0.025;

  window.setAmbientTheme = function(name){
    targetAmbientTheme = AMBIENT_THEMES[name] || AMBIENT_THEMES.claro;
    document.querySelectorAll('.mode-option').forEach(b => {
      b.classList.toggle('active', b.dataset.theme === name);
    });
    const menu = document.getElementById('mode-menu');
    if (menu) menu.classList.remove('open');
  };

  window.toggleModeMenu = function(){
    const menu = document.getElementById('mode-menu');
    if (menu) menu.classList.toggle('open');
  };

  document.addEventListener('click', e => {
    const wrap = document.getElementById('ambient-switch');
    const menu = document.getElementById('mode-menu');
    if (!wrap || !menu || !menu.classList.contains('open')) return;
    if (!wrap.contains(e.target)) menu.classList.remove('open');
  });

  function updateAmbientTheme(){
    const s = AMBIENT_LERP_SPEED;
    ambientMix.ambientColor.lerp(targetAmbientTheme.ambient, s);
    ambientMix.ambientI += (targetAmbientTheme.ambientI - ambientMix.ambientI) * s;
    ambientMix.dirColor.lerp(targetAmbientTheme.dir, s);
    ambientMix.dirI += (targetAmbientTheme.dirI - ambientMix.dirI) * s;
    ambientMix.fillColor.lerp(targetAmbientTheme.fill, s);
    ambientMix.fillI += (targetAmbientTheme.fillI - ambientMix.fillI) * s;
    ambientMix.rimColor.lerp(targetAmbientTheme.rim, s);
    ambientMix.rimI += (targetAmbientTheme.rimI - ambientMix.rimI) * s;
    ambientMix.shieldLightColor.lerp(targetAmbientTheme.shieldLight, s);
    ambientMix.shieldLightI += (targetAmbientTheme.shieldLightI - ambientMix.shieldLightI) * s;
    ambientMix.bgTintColor.lerp(targetAmbientTheme.bgTint, s);

    ambientLight.color.copy(ambientMix.ambientColor);
    ambientLight.intensity = ambientMix.ambientI;
    dirLight.color.copy(ambientMix.dirColor);
    dirLight.intensity = ambientMix.dirI;
    fillDir.color.copy(ambientMix.fillColor);
    fillDir.intensity = ambientMix.fillI;
    rimLight.color.copy(ambientMix.rimColor);
    rimLight.intensity = ambientMix.rimI;
    shieldLight.color.copy(ambientMix.shieldLightColor);
    shieldLight.intensity = ambientMix.shieldLightI;
    bgMat.color.copy(ambientMix.bgTintColor);
  }

  function makeParticles(count, spread, color, size, opacity) {
    const pos=new Float32Array(count*3), base=new Float32Array(count*3), off=new Float32Array(count*3);
    for(let i=0;i<count;i++){
      const x=(Math.random()-.5)*spread[0], y=(Math.random()-.5)*spread[1], z=(Math.random()-.5)*spread[2];
      pos[i*3]=x; pos[i*3+1]=y; pos[i*3+2]=z;
      base[i*3]=x; base[i*3+1]=y; base[i*3+2]=z;
      off[i*3]=Math.random()*Math.PI*2; off[i*3+1]=Math.random()*Math.PI*2; off[i*3+2]=Math.random()*Math.PI*2;
    }
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
    const pts=new THREE.Points(geo,new THREE.PointsMaterial({color,size,transparent:true,opacity}));
    scene.add(pts);
    return {pts,geo,pos,base,off,count};
  }

  const p1=makeParticles(350,[22,16,12],0x4fa3e8,0.04,0.5);
  const p2=makeParticles(80,[18,12,10],0x88ccff,0.07,0.35);
  const p3=makeParticles(30,[14,10,8],0xffffff,0.1,0.18);

  const r1=new THREE.Mesh(new THREE.TorusGeometry(3.2,0.02,8,80),new THREE.MeshBasicMaterial({color:0x4fa3e8,transparent:true,opacity:0.18}));
  r1.rotation.x=Math.PI*.5; r1.position.y=-1.8; scene.add(r1);
  const r2=new THREE.Mesh(new THREE.TorusGeometry(2.3,0.014,8,80),new THREE.MeshBasicMaterial({color:0x1a6ab5,transparent:true,opacity:0.12}));
  r2.rotation.x=Math.PI*.5; r2.position.y=-1.8; scene.add(r2);
  const r3=new THREE.Mesh(new THREE.TorusGeometry(1.5,0.01,8,80),new THREE.MeshBasicMaterial({color:0x88ccff,transparent:true,opacity:0.09}));
  r3.rotation.x=Math.PI*.5; r3.position.y=-1.8; scene.add(r3);

  const floorGroup = new THREE.Group();
  floorGroup.position.y = -1.8;
  scene.add(floorGroup);

  /* ═══════════════════════════════════════════════════════════════
     PIEDRAS — geometría de icosaedro deformada con ondas seno/coseno
     (no vértices al azar), en varios tonos de gris/tierra, escaladas
     de forma dispareja en cada eje para que ninguna se vea repetida.
  ═══════════════════════════════════════════════════════════════ */
  const rockColors = [0x5a5450, 0x4a463f, 0x6b6259, 0x3c3936, 0x756a5c, 0x474138];

  /* makeRock acepta un tercer parámetro opcional "texture".
     Si se pasa una textura, el material la usa como "map" y el color
     se deja en blanco para no teñir la foto; si no se pasa, funciona
     con color plano. */
  function makeRock(size, color, texture) {
    const geo = new THREE.IcosahedronGeometry(size, 2);
    const pos = geo.attributes.position;
    const a1 = Math.random() * 10, a2 = Math.random() * 10, a3 = Math.random() * 10;
    const f1 = 1.6 + Math.random() * 1.2, f2 = 1.6 + Math.random() * 1.2;
    for (let i = 0; i < pos.count; i++) {
      const nx = pos.getX(i), ny = pos.getY(i), nz = pos.getZ(i);
      const len = Math.sqrt(nx*nx + ny*ny + nz*nz) || 1;
      const dx = nx/len, dy = ny/len, dz = nz/len;
      const wobble = 1
        + 0.11 * Math.sin(dx*f1 + dy*f2 + a1)
        + 0.08 * Math.cos(dz*f2 - dx*f1 + a2)
        + 0.05 * Math.sin(dy*3.2 + dz*2.1 + a3);
      pos.setXYZ(i, nx*wobble, ny*wobble*0.78, nz*wobble);
    }
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      map: texture || null,
      color: texture ? 0xffffff : color,
      roughness: 0.92,
      metalness: 0.04,
      flatShading: false
    });

    const rock = new THREE.Mesh(geo, mat);
    rock.scale.set(0.85 + Math.random()*0.4, 0.7 + Math.random()*0.5, 0.85 + Math.random()*0.4);
    rock.castShadow = true;
    rock.receiveShadow = true;
    return rock;
  }

  /* ═══════════════════════════════════════════════════════════════
     PIEDRAS DEL PISO — reparto circular desde el centro: piedras
     "grandes" (ROCK_COUNT) y gravilla chica (GRAVEL_COUNT) mezcladas.
     Cada una gira y se balancea muy despacio sobre sí misma
     (velocidad, eje y fase al azar).
  ═══════════════════════════════════════════════════════════════ */
  const ROCK_COUNT = 70;
  const GRAVEL_COUNT = 90;
  let floorPopulated = false;
  const floorRocks = []; // { mesh, spinX, spinY, spinZ, baseY, phase, bobSpeed, bobAmp }
  function populateFloor(){
    if (floorPopulated) return;
    floorPopulated = true;
    for (let i = 0; i < ROCK_COUNT; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 0.9 + Math.random() * 3.0;
      const size = 0.045 + Math.pow(Math.random(), 2.2) * 0.32;
      const color = rockColors[Math.floor(Math.random() * rockColors.length)];
      const rock = makeRock(size, color);
      const baseY = -size * 0.4 + Math.random() * 0.03;
      rock.position.set(Math.cos(angle) * radius, baseY, Math.sin(angle) * radius);
      rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      floorGroup.add(rock);
      floorRocks.push({
        mesh: rock,
        spinX: (Math.random()-0.5) * 0.10,
        spinY: (Math.random()-0.5) * 0.10,
        spinZ: (Math.random()-0.5) * 0.10,
        baseY,
        phase: Math.random() * Math.PI * 2,
        bobSpeed: 0.15 + Math.random() * 0.15,
        bobAmp: size * (0.05 + Math.random() * 0.05)
      });
    }
    for (let i = 0; i < GRAVEL_COUNT; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 0.6 + Math.random() * 3.3;
      const size = 0.015 + Math.random() * 0.04;
      const color = rockColors[Math.floor(Math.random() * rockColors.length)];
      const rock = makeRock(size, color);
      const baseY = -size * 0.3;
      rock.position.set(Math.cos(angle) * radius, baseY, Math.sin(angle) * radius);
      rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      floorGroup.add(rock);
      floorRocks.push({
        mesh: rock,
        spinX: (Math.random()-0.5) * 0.10,
        spinY: (Math.random()-0.5) * 0.10,
        spinZ: (Math.random()-0.5) * 0.10,
        baseY,
        phase: Math.random() * Math.PI * 2,
        bobSpeed: 0.15 + Math.random() * 0.15,
        bobAmp: size * (0.05 + Math.random() * 0.05)
      });
    }
  }
  // Giro lento y constante sobre sí misma + un leve vaivén vertical
  // (bobbing), ambos con velocidad muy baja para que se note "vivo"
  // sin llamar la atención de más.
  function updateFloorRocks(t){
    for (let i = 0; i < floorRocks.length; i++){
      const r = floorRocks[i];
      r.mesh.rotation.x += r.spinX * 0.016;
      r.mesh.rotation.y += r.spinY * 0.016;
      r.mesh.rotation.z += r.spinZ * 0.016;
      r.mesh.position.y = r.baseY + Math.sin(t * r.bobSpeed + r.phase) * r.bobAmp;
    }
  }

  const targetRock = makeRock(0.85, 0x4a463f);
  targetRock.position.set(0, -1.35, 0);
  scene.add(targetRock);

  const oreGlow = new THREE.PointLight(0x4fa3e8, 0, 4);
  oreGlow.position.set(0, -1.15, 0.4);
  scene.add(oreGlow);

  const rockFragments = [];
  function shatterTargetRock(){
    targetRock.visible = false;
    const origin = targetRock.position.clone();
    const fragCount = 18 + Math.floor(Math.random()*8);
    for (let i=0; i<fragCount; i++){
      const size = 0.05 + Math.random()*0.16;
      const color = rockColors[Math.floor(Math.random()*rockColors.length)];
      const frag = makeRock(size, color);
      frag.position.copy(origin);
      frag.material = frag.material.clone();
      frag.material.transparent = true;
      scene.add(frag);
      const ang = Math.random()*Math.PI*2;
      const speed = 1.3 + Math.random()*2.4;
      frag.userData.vel = new THREE.Vector3(Math.cos(ang)*speed, 1.6 + Math.random()*2.4, Math.sin(ang)*speed);
      frag.userData.rotVel = new THREE.Vector3((Math.random()-0.5)*7, (Math.random()-0.5)*7, (Math.random()-0.5)*7);
      frag.userData.life = 0;
      rockFragments.push(frag);
    }
  }
  function updateFragments(delta){
    for (let i = rockFragments.length-1; i>=0; i--){
      const f = rockFragments[i];
      f.userData.life += delta;
      f.userData.vel.y -= delta * 4.2;
      f.position.addScaledVector(f.userData.vel, delta);
      f.rotation.x += f.userData.rotVel.x * delta;
      f.rotation.y += f.userData.rotVel.y * delta;
      f.rotation.z += f.userData.rotVel.z * delta;
      if (f.userData.life > 1.1){
        f.material.opacity = Math.max(0, 1 - (f.userData.life-1.1)/0.8);
      }
      if (f.userData.life > 1.9 || f.position.y < -3.5){
        scene.remove(f);
        f.geometry.dispose(); f.material.dispose();
        rockFragments.splice(i,1);
      }
    }
  }

  const shieldGroup = new THREE.Group();
  shieldGroup.position.set(0, -0.8, 0);
  scene.add(shieldGroup);
  let shieldModel = null, shieldBaseScale = 1, shieldReady = false;
  new THREE.GLTFLoader().load(SHIELD_MODEL, gltf => {
    shieldModel = gltf.scene;
    const box = new THREE.Box3().setFromObject(shieldModel);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    shieldBaseScale = 2.6/Math.max(size.x, size.y, size.z);
    shieldModel.scale.setScalar(shieldBaseScale);
    shieldModel.position.sub(center.multiplyScalar(shieldBaseScale));
    shieldModel.traverse(n=>{ if(n.isMesh){ n.castShadow=true; n.receiveShadow=true; } });
    shieldModel.scale.setScalar(0.001);
    shieldGroup.add(shieldModel);
    shieldReady = true;
    if (introState === 'done') shieldModel.scale.setScalar(shieldBaseScale);
  }, undefined, () => { shieldReady = true; });

  /* ── Minero: se sigue cargando (por si algún día lo quieres reactivar),
     pero se OCULTA y no participa de la intro visualmente. ── */
  let minerMixer = null, minerWalkAction = null, minerPickAction = null, minerReady = false;
  const minerGroup = new THREE.Group();
  minerGroup.position.set(-6.5, -1.8, 0.45);
  minerGroup.rotation.y = Math.PI/2;
  scene.add(minerGroup);
  minerGroup.visible = false; // el minero ya no aparece en la intro

  new THREE.GLTFLoader().load(MINER_MODEL, gltf => {
    const minerModel = gltf.scene;
    const box = new THREE.Box3().setFromObject(minerModel);
    const size = box.getSize(new THREE.Vector3());
    const scale = 1.7/(size.y || 1);
    minerModel.scale.setScalar(scale);
    const center = box.getCenter(new THREE.Vector3());
    minerModel.position.x -= center.x*scale;
    minerModel.position.z -= center.z*scale;
    minerModel.position.y -= box.min.y*scale;
    minerModel.traverse(n=>{ if(n.isMesh){ n.castShadow=true; n.receiveShadow=true; } });
    minerGroup.add(minerModel);

    if (gltf.animations && gltf.animations.length){
      minerMixer = new THREE.AnimationMixer(minerModel);
      const findClip = (regex, fallbackIndex) => {
        const found = gltf.animations.find(a => regex.test(a.name));
        return found || gltf.animations[fallbackIndex] || gltf.animations[0];
      };
      const walkClip = findClip(/walk|camin|andar|run|marcha/i, 0);
      const pickClip = findClip(/pick|pica|mine|strike|hit|swing|axe|golpe|ataque/i, gltf.animations.length > 1 ? 1 : 0);
      minerWalkAction = minerMixer.clipAction(walkClip);
      minerWalkAction.setLoop(THREE.LoopRepeat);
      minerPickAction = minerMixer.clipAction(pickClip);
      minerPickAction.setLoop(THREE.LoopRepeat);
    }
    minerReady = true;
  }, undefined, err => {
    console.error('No se pudo cargar "' + MINER_MODEL + '".', err);
    minerReady = true;
  });

  const WALK_END_X = -1.35;
  const PICK_HITS  = 4;
  let introState  = 'waiting'; // waiting → arrived → revealing → done
  let introT = 0, hitsDone = 0, waitT = 0, lastHitTime = -999;

  const introTitleEl = document.getElementById('intro-title');
  const siteMessageEl = document.getElementById('site-message');
  const msgLeftEl = document.getElementById('msg-left');
  const msgRightEl = document.getElementById('msg-right');
  const introHintEl  = document.getElementById('intro-hint');
  const hintCountEl  = document.getElementById('hint-count');
  const decoMundo = document.getElementById('deco-mundo');
  const decoAmbient = document.getElementById('ambient-switch');

  function updateHintCount(){
    if (!hintCountEl) return;
    const remaining = Math.max(PICK_HITS - hitsDone, 0);
    hintCountEl.textContent = remaining > 0 ? ('Faltan ' + remaining + (remaining===1?' golpe':' golpes')) : '';
  }

  function hideHint(){
    if (introHintEl) introHintEl.classList.remove('show');
  }

  updateHintCount();
  if (introHintEl) introHintEl.classList.add('show');
  canvas.style.cursor = 'pointer';

  const raycaster = new THREE.Raycaster();
  const clickPos  = new THREE.Vector2();
  const dragPlane = new THREE.Plane();
  const dragPoint = new THREE.Vector3();

  let rockDragging = false, pdStartScreen = null, pdStartTime = 0, pdPointerId = null;
  let rockVX = 0, rockVY = 0;
  const pointerHistory = [];

  function getCameraForward(){
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    return dir;
  }

  function computeRockBounds(zDepth, margin){
    const forward = getCameraForward();
    const t = (zDepth - camera.position.z) / forward.z;
    const centerY = camera.position.y + forward.y * t;
    const vFov = camera.fov * Math.PI/180;
    const visibleHeight = 2 * Math.tan(vFov/2) * t;
    const visibleWidth = visibleHeight * camera.aspect;
    return {
      xMin: -visibleWidth/2 + margin,
      xMax:  visibleWidth/2 - margin,
      yMin: centerY - visibleHeight/2 + margin,
      yMax: centerY + visibleHeight/2 - margin
    };
  }

  function screenToWorldOnPlane(e, planeZ){
    const rect = canvas.getBoundingClientRect();
    clickPos.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    clickPos.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(clickPos, camera);
    dragPlane.set(new THREE.Vector3(0,0,1), -planeZ);
    raycaster.ray.intersectPlane(dragPlane, dragPoint);
    return dragPoint;
  }

  function registerHit(){
    const now = performance.now();
    if (now - lastHitTime < 220) return;
    lastHitTime = now;
    hitsDone++;
    targetRock.position.x += (Math.random()-0.5)*0.06;
    targetRock.position.z = (Math.random()-0.5)*0.06;
    oreGlow.intensity = 1.6;
    if (minerPickAction) minerPickAction.reset().fadeIn(0.05).play();
    updateHintCount();
    if (hitsDone >= PICK_HITS){
      hideHint();
      if (minerPickAction) minerPickAction.fadeOut(0.3);
      shatterTargetRock();
      oreGlow.intensity = 3;
      canvas.style.cursor = '';
      introState = 'revealing';
      introT = 0;
    }
  }

  canvas.style.touchAction = 'none';

  canvas.addEventListener('pointerdown', e => {
    if (introState === 'revealing' || introState === 'done' || !targetRock.visible) return;
    const rect = canvas.getBoundingClientRect();
    clickPos.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    clickPos.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(clickPos, camera);
    const hits = raycaster.intersectObject(targetRock, true);
    if (!hits.length) return;

    rockDragging = true;
    pdPointerId = e.pointerId;
    pdStartScreen = { x:e.clientX, y:e.clientY };
    pdStartTime = performance.now();
    rockVX = 0; rockVY = 0;
    pointerHistory.length = 0;
    const wp = screenToWorldOnPlane(e, targetRock.position.z);
    pointerHistory.push({ x:wp.x, y:wp.y, t:pdStartTime });
    if (canvas.setPointerCapture) canvas.setPointerCapture(e.pointerId);
  });

  canvas.addEventListener('pointermove', e => {
    if (!rockDragging) return;
    const wp = screenToWorldOnPlane(e, targetRock.position.z);
    targetRock.position.x = wp.x;
    targetRock.position.y = wp.y;
    const now = performance.now();
    pointerHistory.push({ x:wp.x, y:wp.y, t:now });
    if (pointerHistory.length > 6) pointerHistory.shift();
  });

  function endRockDrag(e){
    if (!rockDragging) return;
    rockDragging = false;
    const dx = e.clientX - pdStartScreen.x, dy = e.clientY - pdStartScreen.y;
    const dist = Math.hypot(dx, dy);
    const elapsed = performance.now() - pdStartTime;
    if (dist < 8 && elapsed < 350){
      registerHit();
    } else if (pointerHistory.length >= 2){
      const a = pointerHistory[0], b = pointerHistory[pointerHistory.length-1];
      const dt = Math.max((b.t - a.t)/1000, 0.001);
      let tvx = (b.x - a.x)/dt, tvy = (b.y - a.y)/dt;
      const MAXV = 9, speed = Math.hypot(tvx,tvy);
      if (speed > MAXV){ tvx = tvx/speed*MAXV; tvy = tvy/speed*MAXV; }
      rockVX = tvx; rockVY = tvy;
    }
  }
  canvas.addEventListener('pointerup', endRockDrag);
  canvas.addEventListener('pointercancel', endRockDrag);

  function updateRockPhysics(delta){
    if (!targetRock.visible || rockDragging) return;
    if (Math.abs(rockVX) < 0.001 && Math.abs(rockVY) < 0.001) return;
    targetRock.position.x += rockVX * delta;
    targetRock.position.y += rockVY * delta;
    targetRock.rotation.z -= rockVX * delta * 0.6;
    targetRock.rotation.x += rockVY * delta * 0.6;
    const b = computeRockBounds(targetRock.position.z, 0.55);
    if (targetRock.position.x < b.xMin){ targetRock.position.x = b.xMin; rockVX =  Math.abs(rockVX)*0.72; }
    if (targetRock.position.x > b.xMax){ targetRock.position.x = b.xMax; rockVX = -Math.abs(rockVX)*0.72; }
    if (targetRock.position.y < b.yMin){ targetRock.position.y = b.yMin; rockVY =  Math.abs(rockVY)*0.72; }
    if (targetRock.position.y > b.yMax){ targetRock.position.y = b.yMax; rockVY = -Math.abs(rockVY)*0.72; }
    rockVX *= 0.995; rockVY *= 0.995;
  }

  function finishReveal(){
    if (introTitleEl) introTitleEl.classList.add('show');
    if (siteMessageEl) siteMessageEl.classList.add('show');
    if (msgLeftEl) msgLeftEl.classList.add('show');
    if (msgRightEl) msgRightEl.classList.add('show');
    populateFloor();
    bgPlane.visible = true;
    if (decoMundo) decoMundo.classList.remove('hidden');
    if (decoAmbient) decoAmbient.classList.remove('hidden');
    canvas.style.cursor = 'grab';
  }

  function updateSequence(delta){
    if (minerMixer) minerMixer.update(delta);
    if (rockFragments.length) updateFragments(delta);
    updateRockPhysics(delta);
    oreGlow.intensity *= 0.92;

    if (introState === 'waiting'){
      if (minerReady){
        // El minero ya no camina en la intro: se pasa directo a "arrived",
        // que es el estado en que la piedra ya espera lista para ser golpeada.
        introState = 'arrived';
      }
      return;
    }

    if (introState === 'arrived'){
      waitT += delta;
      if (!rockDragging && Math.abs(rockVX) < 0.02 && Math.abs(rockVY) < 0.02){
        targetRock.rotation.y += delta * 0.25;
      }
      oreGlow.intensity = Math.max(oreGlow.intensity, 0.25 + 0.2*Math.sin(waitT*2.4));
    } else if (introState === 'revealing'){
      introT += delta;
      const p = Math.min(introT/0.9, 1);
      oreGlow.intensity = Math.max(0, 3*(1-p));
      if (shieldModel){
        shieldModel.scale.setScalar(shieldBaseScale * p);
        shieldModel.rotation.y = p * Math.PI * 0.6;
      }
      if (p >= 1){
        introState = 'done';
        finishReveal();
      }
    }
  }

  let isDrag=false,px=0,py=0,vx=0,vy=0.003,rotY=0.3,rotX=0.1;
  canvas.addEventListener('mousedown',e=>{isDrag=true;px=e.clientX;py=e.clientY;vx=0;vy=0;});
  window.addEventListener('mouseup',()=>{isDrag=false;});
  window.addEventListener('mousemove',e=>{if(!isDrag)return;vy=(e.clientX-px)*.009;vx=(e.clientY-py)*.009;rotY+=vy;rotX=Math.max(-.7,Math.min(.9,rotX+vx));px=e.clientX;py=e.clientY;});

  function animP(p,t,sx,sy,sz){
    for(let i=0;i<p.count;i++){
      p.pos[i*3]=p.base[i*3]+Math.sin(t*sx+p.off[i*3])*.18;
      p.pos[i*3+1]=p.base[i*3+1]+Math.sin(t*sy+p.off[i*3+1])*.22;
      p.pos[i*3+2]=p.base[i*3+2]+Math.cos(t*sz+p.off[i*3+2])*.15;
    }
    p.geo.attributes.position.needsUpdate=true;
  }

  let t=0;
  (function animate(){
    requestAnimationFrame(animate);
    const delta = 0.016; t += delta;

    updateSequence(delta);

    if (introState === 'done'){
      if(!isDrag){vy*=.96;if(Math.abs(vy)<.0005)vy=.003;rotY+=vy;}
      shieldGroup.rotation.y=rotY; shieldGroup.rotation.x=rotX;
    }

    r1.rotation.z+=.003; r2.rotation.z-=.002; r3.rotation.z+=.0015;
    animP(p1,t,.4,.3,.35); animP(p2,t,.25,.2,.3); animP(p3,t,.18,.15,.22);
    updateFloorRocks(t);

    updateAmbientTheme();

    renderer.render(scene,camera);
  })();

  window.addEventListener('resize',()=>{
    camera.aspect=W()/H(); camera.updateProjectionMatrix(); renderer.setSize(W(),H());
    resizeBgPlane();
  });

  /* ══════════════════════════════════════════
     MUNDO INTERACTIVO — calle de la cooperativa
  ══════════════════════════════════════════ */

  function makeDustGroundTexture(){
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#cfc4ad';
    ctx.fillRect(0,0,256,256);
    for (let i=0;i<2200;i++){
      const x = Math.random()*256, y = Math.random()*256;
      const g = 150 + Math.random()*80;
      ctx.fillStyle = `rgba(${g|0},${(g-14)|0},${(g-30)|0},${0.12+Math.random()*0.18})`;
      const s = 0.6 + Math.random()*2.2;
      ctx.fillRect(x, y, s, s);
    }
    ctx.strokeStyle = 'rgba(90,80,64,0.12)';
    ctx.lineWidth = 6;
    for (let i=0;i<3;i++){
      ctx.beginPath();
      const yy = 60 + i*70;
      ctx.moveTo(0, yy);
      ctx.bezierCurveTo(80, yy+14, 176, yy-14, 256, yy);
      ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }

  function makeCorrugatedTexture(baseHex){
    const c = document.createElement('canvas');
    c.width = 64; c.height = 64;
    const ctx = c.getContext('2d');
    ctx.fillStyle = baseHex;
    ctx.fillRect(0,0,64,64);
    for (let x=0; x<64; x+=6){
      const shade = (x/6)%2===0 ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.16)';
      ctx.fillStyle = shade;
      ctx.fillRect(x,0,3,64);
    }
    for (let i=0;i<40;i++){
      ctx.fillStyle = `rgba(120,70,40,${0.05+Math.random()*0.12})`;
      ctx.fillRect(Math.random()*64, Math.random()*64, 1+Math.random()*2, 1+Math.random()*2);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(3,2);
    return tex;
  }

  function makeAdobeTexture(baseHex){
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const ctx = c.getContext('2d');
    ctx.fillStyle = baseHex;
    ctx.fillRect(0,0,64,64);
    for (let i=0;i<160;i++){
      ctx.fillStyle = `rgba(0,0,0,${0.04+Math.random()*0.08})`;
      ctx.fillRect(Math.random()*64, Math.random()*64, 1+Math.random()*3, 1+Math.random()*3);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }

  function makeContactShadowTexture(){
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const ctx = c.getContext('2d');
    const grad = ctx.createRadialGradient(64,64,0,64,64,64);
    grad.addColorStop(0, 'rgba(0,0,0,0.55)');
    grad.addColorStop(0.6, 'rgba(0,0,0,0.28)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0,0,128,128);
    return new THREE.CanvasTexture(c);
  }
  const contactShadowTex = makeContactShadowTexture();

  const dustGroundTex = makeDustGroundTexture();

  function makePortalIconTexture(kind){
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const ctx = c.getContext('2d');
    ctx.clearRect(0,0,128,128);
    ctx.strokeStyle = '#f5faff';
    ctx.fillStyle = '#f5faff';
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    if (kind === 'extraccion'){
      ctx.save();
      ctx.translate(64,64);
      ctx.rotate(-Math.PI/4);
      ctx.beginPath(); ctx.moveTo(-40,0); ctx.lineTo(40,0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0,-32); ctx.lineTo(0,36); ctx.stroke();
      ctx.restore();
    } else {
      ctx.strokeRect(24,24,80,80);
      ctx.beginPath();
      ctx.moveTo(32,84); ctx.lineTo(56,58); ctx.lineTo(72,72); ctx.lineTo(94,44); ctx.lineTo(96,96); ctx.lineTo(32,96);
      ctx.closePath(); ctx.fill();
    }
    return new THREE.CanvasTexture(c);
  }

  function addPortal(sc, portals, x, z, key, label, colorHex){
    const group = new THREE.Group();

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.1, 0.06, 10, 32),
      new THREE.MeshBasicMaterial({ color: colorHex, transparent:true, opacity:0.9 })
    );
    ring.position.y = 1.55;
    group.add(ring);

    const ring2 = new THREE.Mesh(
      new THREE.TorusGeometry(1.42, 0.025, 8, 32),
      new THREE.MeshBasicMaterial({ color: colorHex, transparent:true, opacity:0.35 })
    );
    ring2.position.y = 1.55;
    group.add(ring2);

    const iconTex = makePortalIconTexture(key);
    const icon = new THREE.Mesh(
      new THREE.PlaneGeometry(1.15,1.15),
      new THREE.MeshBasicMaterial({ map: iconTex, transparent:true, depthWrite:false })
    );
    icon.position.y = 1.55;
    group.add(icon);

    const baseGlow = new THREE.Mesh(
      new THREE.CircleGeometry(1.7, 24),
      new THREE.MeshBasicMaterial({ color: colorHex, transparent:true, opacity:0.16, depthWrite:false })
    );
    baseGlow.rotation.x = -Math.PI/2;
    baseGlow.position.y = 0.02;
    group.add(baseGlow);

    const light = new THREE.PointLight(colorHex, 1.1, 6);
    light.position.y = 1.6;
    group.add(light);

    group.position.set(x, 0, z);
    sc.add(group);

    portals.push({ group, ring, ring2, icon, x, z, key, label });
  }

  function buildMundoScene(){
    const sc = new THREE.Scene();
    sc.background = new THREE.Color(0x9cc9ec);
    sc.fog = new THREE.Fog(0xbcdcf2, 30, 150);

    sc.add(new THREE.AmbientLight(0xffffff, 0.85));
    const sun = new THREE.DirectionalLight(0xfff3d8, 1.15);
    sun.position.set(18, 28, 12);
    sun.castShadow = true;
    sun.shadow.camera.left = -18;
    sun.shadow.camera.right = 18;
    sun.shadow.camera.top = 18;
    sun.shadow.camera.bottom = -18;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 80;
    sun.shadow.mapSize.set(2048, 2048);
    sc.add(sun);
    const fillL = new THREE.DirectionalLight(0xdcefff, 0.5);
    fillL.position.set(-14, 10, -8);
    sc.add(fillL);

    const groundTex = dustGroundTex.clone();
    groundTex.needsUpdate = true;
    groundTex.repeat.set(8, 55);
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(34, 300),
      new THREE.MeshStandardMaterial({ map: groundTex, roughness: 1 })
    );
    ground.rotation.x = -Math.PI/2;
    ground.position.set(0, 0, -128);
    ground.receiveShadow = true;
    sc.add(ground);

    function addMountainRange(zPos, colorHex, heightScale, opacity){
      const group = new THREE.Group();
      for (let x=-70; x<=70; x+=7+Math.random()*5){
        const h = (7+Math.random()*11)*heightScale;
        const geo = new THREE.ConeGeometry(6+Math.random()*4, h, 5);
        const mat = new THREE.MeshStandardMaterial({ color: colorHex, flatShading:true, roughness:1, transparent:true, opacity });
        const m = new THREE.Mesh(geo, mat);
        m.position.set(x + (Math.random()-0.5)*4, h/2 - 1.4, zPos + (Math.random()-0.5)*6);
        m.rotation.y = Math.random()*Math.PI;
        group.add(m);
      }
      sc.add(group);
    }
    addMountainRange(-175, 0x8f8064, 1, 1);
    addMountainRange(-150, 0xac9d79, 0.7, 0.9);

    for (let i=0;i<12;i++){
      const cloud = new THREE.Group();
      const puffCount = 3+Math.floor(Math.random()*3);
      for (let j=0;j<puffCount;j++){
        const geo = new THREE.SphereGeometry(2+Math.random()*1.4, 7, 6);
        const mat = new THREE.MeshBasicMaterial({ color:0xffffff, transparent:true, opacity:0.92 });
        const puff = new THREE.Mesh(geo, mat);
        puff.position.set(j*2.3 - puffCount, Math.random()*0.6, Math.random()*1.4);
        cloud.add(puff);
      }
      cloud.position.set((Math.random()-0.5)*90, 20+Math.random()*10, -50-Math.random()*55);
      cloud.scale.setScalar(1.1+Math.random()*1.2);
      sc.add(cloud);
    }

    const corruColors = ['#8a8a8a', '#7a5a4a', '#9c9c9c', '#6f4d3c', '#8f5a3c', '#5c4a42', '#9a4a38'];
    const adobeColors  = ['#b98f68', '#a97e57', '#c2a077', '#e6e1d2', '#cdd3d5', '#a7b39a', '#d8d2c2'];
    const roofColors   = ['#8f8f95', '#8a4a3a', '#6d5850', '#9c9c9c', '#7a5a4a'];

    function addAdobeHouse(x, z, w, h, d){
      const grp = new THREE.Group();
      const tex = makeAdobeTexture(adobeColors[Math.floor(Math.random()*adobeColors.length)]);
      tex.repeat.set(2,1);
      const wall = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), new THREE.MeshStandardMaterial({ map:tex, roughness:1 }));
      wall.position.y = h/2;
      wall.castShadow = true; wall.receiveShadow = true;
      grp.add(wall);
      const roofTex = makeCorrugatedTexture(roofColors[Math.floor(Math.random()*roofColors.length)]);
      const roof = new THREE.Mesh(new THREE.BoxGeometry(w*1.12, 0.12, d*1.12), new THREE.MeshStandardMaterial({ map:roofTex, roughness:0.85, metalness:0.1 }));
      roof.position.y = h + 0.06;
      grp.add(roof);
      grp.position.set(x,0,z);
      grp.rotation.y = (Math.random()-0.5)*0.08;
      sc.add(grp);
    }

    function addEntranceHouse(x, z, w, h, d){
      const grp = new THREE.Group();
      const brickMat = new THREE.MeshStandardMaterial({ color: 0xa9714a, roughness: 0.95 });
      const wall = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), brickMat);
      wall.position.y = h/2;
      wall.castShadow = true; wall.receiveShadow = true;
      grp.add(wall);

      const roofTex = makeCorrugatedTexture('#8f8a80');
      const roofHeight = h * 0.5;
      const roofScaleY = 0.6;
      const roofRadius = Math.max(w,d) * 0.6;
      const roof = new THREE.Mesh(
        new THREE.ConeGeometry(roofRadius, roofHeight, 4),
        new THREE.MeshStandardMaterial({ map: roofTex, roughness:0.88, metalness:0.1 })
      );
      roof.rotation.y = Math.PI/4;
      const scaleZ = Math.max(d/w, w/d) * 1.05;
      roof.scale.set(1, roofScaleY, scaleZ);
      const mediaAlturaTecho = (roofHeight * roofScaleY) / 2;
      roof.position.y = h + mediaAlturaTecho - 0.015;
      roof.castShadow = true;
      grp.add(roof);

      grp.position.set(x,0,z);
      sc.add(grp);
    }

    function addAntennaPole(x,z,height){
      const poleMat = new THREE.MeshStandardMaterial({ color:0x4a4a4a });
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.06,height,6), poleMat);
      pole.position.set(x,height/2,z);
      pole.castShadow = true;
      sc.add(pole);
      for (let i=0;i<3;i++){
        const arm = new THREE.Mesh(new THREE.BoxGeometry(1.1,0.035,0.035), poleMat);
        arm.position.set(x,height-0.4-i*0.4,z);
        arm.rotation.y = Math.random()*Math.PI;
        sc.add(arm);
      }
    }

    function addSign(x,z,colorHex){
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.03,1.5,6), new THREE.MeshStandardMaterial({ color:0x333333 }));
      post.position.set(x,0.75,z);
      sc.add(post);
      const sign = new THREE.Mesh(new THREE.BoxGeometry(0.85,0.55,0.04), new THREE.MeshStandardMaterial({ color:colorHex }));
      sign.position.set(x,1.55,z);
      sc.add(sign);
    }

    function addUnfinishedBrick(x,z,w,h,d){
      const brickMat = new THREE.MeshStandardMaterial({ color:0xc98a55, roughness:1 });
      const wall = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), brickMat);
      wall.position.set(x,h/2,z);
      wall.castShadow = true; wall.receiveShadow = true;
      sc.add(wall);
      const rebarMat = new THREE.MeshStandardMaterial({ color:0x6b6b6b });
      for (let i=0;i<4;i++){
        const rebar = new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.02,0.55,5), rebarMat);
        rebar.position.set(x+(Math.random()-0.5)*w*0.7, h+0.28, z+(Math.random()-0.5)*d*0.7);
        sc.add(rebar);
      }
    }

    function addShed(x, z, w, h, d){
      const grp = new THREE.Group();
      const wallTex = makeCorrugatedTexture(corruColors[Math.floor(Math.random()*corruColors.length)]);
      const wall = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), new THREE.MeshStandardMaterial({ map:wallTex, roughness:0.9, metalness:0.15 }));
      wall.position.y = h/2;
      wall.castShadow = true; wall.receiveShadow = true;
      grp.add(wall);
      const roofTex = makeCorrugatedTexture('#7d5a46');
      const roofMat = new THREE.MeshStandardMaterial({ map:roofTex, roughness:0.8, metalness:0.2 });
      const roofGeo = new THREE.BoxGeometry(w*1.15, 0.12, d*1.15);
      const roof = new THREE.Mesh(roofGeo, roofMat);
      roof.position.y = h + 0.06;
      grp.add(roof);
      const postMat = new THREE.MeshStandardMaterial({ color:0x5a4a3c });
      for (const sx of [-1,1]){
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09,0.09,h,6), postMat);
        post.position.set(sx*(w/2-0.15), h/2, d/2-0.15);
        grp.add(post);
      }
      grp.position.set(x,0,z);
      sc.add(grp);
    }

    function addConcreteWall(x,z,w,h,d){
      const wall = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), new THREE.MeshStandardMaterial({ color:0xb9b3a4, roughness:1 }));
      wall.position.set(x,h/2,z);
      wall.castShadow = true; wall.receiveShadow = true;
      sc.add(wall);
    }

    function addBarrels(x,z,count){
      const barrelColors = [0x14140f, 0x1c1c18, 0x2a2620, 0x1a1e22];
      for (let i=0;i<count;i++){
        const col = i % 4, row = Math.floor(i/4);
        const mat = new THREE.MeshStandardMaterial({ color: barrelColors[i % barrelColors.length], roughness:0.75, metalness:0.3 });
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.34,0.34,0.78,12), mat);
        barrel.position.set(x + col*0.72, 0.39, z - row*0.72);
        barrel.rotation.y = Math.random()*Math.PI;
        barrel.castShadow = true; barrel.receiveShadow = true;
        sc.add(barrel);
      }
    }

    function makePuddleTexture(){
      const c = document.createElement('canvas');
      c.width = c.height = 128;
      const ctx = c.getContext('2d');
      const grad = ctx.createRadialGradient(64,64,4,64,64,62);
      grad.addColorStop(0, 'rgba(120,108,86,0.95)');
      grad.addColorStop(0.55, 'rgba(96,88,70,0.85)');
      grad.addColorStop(1, 'rgba(96,88,70,0)');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.ellipse(64,64,62,44,0,0,Math.PI*2); ctx.fill();
      return new THREE.CanvasTexture(c);
    }
    const puddleTex = makePuddleTexture();
    function addPuddle(x,z,scale){
      const puddle = new THREE.Mesh(
        new THREE.PlaneGeometry(2.2*scale, 1.5*scale),
        new THREE.MeshStandardMaterial({ map: puddleTex, transparent:true, roughness:0.15, metalness:0.2, depthWrite:false })
      );
      puddle.rotation.x = -Math.PI/2;
      puddle.rotation.z = Math.random()*Math.PI;
      puddle.position.set(x, 0.012, z);
      sc.add(puddle);
    }

    function makeFenceTexture(){
      const c = document.createElement('canvas');
      c.width = c.height = 128;
      const ctx = c.getContext('2d');
      ctx.clearRect(0,0,128,128);
      ctx.strokeStyle = 'rgba(170,175,180,0.85)';
      ctx.lineWidth = 2.4;
      const step = 16;
      for (let i=-128;i<256;i+=step){
        ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i+128,128); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(i,128); ctx.lineTo(i+128,0); ctx.stroke();
      }
      const tex = new THREE.CanvasTexture(c);
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      return tex;
    }
    const fenceTex = makeFenceTexture();
    function addFence(x,z,w,h,rotY){
      const tex = fenceTex.clone();
      tex.needsUpdate = true;
      tex.repeat.set(Math.max(1, Math.round(w*1.6)), 1);
      const fence = new THREE.Mesh(
        new THREE.PlaneGeometry(w,h),
        new THREE.MeshStandardMaterial({ map: tex, transparent:true, side: THREE.DoubleSide, roughness:0.8 })
      );
      fence.position.set(x, h/2, z);
      fence.rotation.y = rotY || 0;
      sc.add(fence);
      const postMat = new THREE.MeshStandardMaterial({ color:0x3a3a3a });
      const halfW = w/2;
      [-halfW, halfW].forEach(off=>{
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.035,0.035,h,6), postMat);
        post.position.set(x + Math.sin(rotY||0)*off, h/2, z + Math.cos(rotY||0)*off);
        sc.add(post);
      });
    }

    addEntranceHouse(-6.5, -2, 4.4, 2.7, 5.2);
    addAntennaPole(-8.6, -0.5, 8.5);
    addSign(-1.4, 1.2, 0x2f6b3c);
    addUnfinishedBrick(6.8, -1.8, 3.6, 2.1, 3.6);
    addTruck(3.4, -4, Math.PI*0.08, 0xd8cfa8);
    addBarrels(-8.8, 2.5, 8);
    addFence(-8.6, -8, 12, 1.7, 0);
    addFence(8.4, -6, 9, 1.7, 0);
    addPuddle(1.6, -18, 1.3);
    addPuddle(-2.4, -66, 1.6);
    addPuddle(2.8, -140, 1.1);

    addAdobeHouse(-5.2, -10,  3.4, 2.6, 4.2);
    addAdobeHouse( 5.4, -14,  3.0, 2.4, 3.6);
    addAdobeHouse(-5.6, -20, 3.8, 2.8, 4.6);
    addAdobeHouse( 6.0, -25, 3.2, 2.5, 3.8);
    addAdobeHouse(-6.2, -31, 3.6, 2.7, 4.4);

    for (let i=0;i<11;i++){
      const z = -40 - i*11;
      const side = i%2===0 ? -1 : 1;
      addShed(side*6.6, z, 6+Math.random()*2.4, 4+Math.random()*1.6, 8+Math.random()*3.5);
    }

    addConcreteWall(6.8, -158, 0.6, 3.2, 6.5);
    addConcreteWall(-7.2, -168, 0.6, 3, 5.5);
    function addTailingsPile(x,z,r){
      const geo = new THREE.ConeGeometry(r, r*0.55, 10);
      const mat = new THREE.MeshStandardMaterial({ color:0xe4ded0, roughness:1 });
      const pile = new THREE.Mesh(geo, mat);
      pile.position.set(x, r*0.275, z);
      sc.add(pile);
    }
    addTailingsPile(-3.5, -162, 2.8);
    addTailingsPile(-1, -168, 2.0);
    addTailingsPile(3, -174, 2.4);

    function addTruck(x,z,rotY,colorHex){
      const truck = new THREE.Group();
      const bodyMat = new THREE.MeshStandardMaterial({ color:colorHex, roughness:0.6, metalness:0.35 });
      const cab = new THREE.Mesh(new THREE.BoxGeometry(1.7,1.5,1.9), bodyMat);
      cab.position.set(0,0.95,1.3);
      cab.castShadow = true;
      truck.add(cab);
      const bed = new THREE.Mesh(new THREE.BoxGeometry(1.9,1.15,3.4), bodyMat);
      bed.position.set(0,1.0,-1.3);
      bed.castShadow = true;
      truck.add(bed);
      const wheelMat = new THREE.MeshStandardMaterial({ color:0x14120f });
      const wheelGeo = new THREE.CylinderGeometry(0.42,0.42,0.32,10);
      [[-0.95,0.42,1.3],[0.95,0.42,1.3],[-0.95,0.42,-1.7],[0.95,0.42,-1.7]].forEach(p=>{
        const wheel = new THREE.Mesh(wheelGeo, wheelMat);
        wheel.rotation.z = Math.PI/2;
        wheel.position.set(p[0],p[1],p[2]);
        truck.add(wheel);
      });
      truck.position.set(x,0,z);
      truck.rotation.y = rotY;
      sc.add(truck);
    }
    addTruck(3.2, -44, Math.PI*0.06, 0xb6a06a);
    addTruck(-3.6, -84, -Math.PI*0.1, 0x8f9296);
    addTruck(3.6, -120, Math.PI*0.15, 0xc9c2a8);
    addTruck(-3.2, -150, -Math.PI*0.05, 0xb59a76);

    const poleMat = new THREE.MeshStandardMaterial({ color:0x4a4038 });
    for (let i=0;i<24;i++){
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07,0.09,5.4,6), poleMat);
      pole.position.set(i%2===0? -3.6 : 3.6, 2.7, -4 - i*8);
      sc.add(pole);
    }

    const portals = [];
    addPortal(sc, portals, -2.2, -46, 'extraccion', 'Extracción Minera', 0xffa14f);
    addPortal(sc, portals,  2.2, -96, 'galeria',     'Galería',           0x4fd6a0);

    const character = new THREE.Group();
    const jacketMat = new THREE.MeshStandardMaterial({ color:0x22262e, roughness:0.75 });
    const pantsMat  = new THREE.MeshStandardMaterial({ color:0x1a1d22, roughness:0.8 });
    const skinMat   = new THREE.MeshStandardMaterial({ color:0xcf9d76, roughness:0.9 });

    const placeholderGroup = new THREE.Group();
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.26,0.3,0.85,10), jacketMat);
    torso.position.y = 1.08; torso.castShadow = true;
    placeholderGroup.add(torso);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.2,12,10), skinMat);
    head.position.y = 1.65; head.castShadow = true;
    placeholderGroup.add(head);
    const legGeo = new THREE.CylinderGeometry(0.1,0.1,0.68,8);
    const legL = new THREE.Mesh(legGeo, pantsMat); legL.position.set(-0.12,0.34,0); legL.castShadow = true; placeholderGroup.add(legL);
    const legR = new THREE.Mesh(legGeo, pantsMat); legR.position.set(0.12,0.34,0); legR.castShadow = true; placeholderGroup.add(legR);
    const armGeo = new THREE.CylinderGeometry(0.075,0.075,0.62,8);
    const armL = new THREE.Mesh(armGeo, jacketMat); armL.position.set(-0.36,1.08,0); placeholderGroup.add(armL);
    const armR = new THREE.Mesh(armGeo, jacketMat); armR.position.set(0.36,1.08,0); placeholderGroup.add(armR);
    character.add(placeholderGroup);

    const contactShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(0.9, 0.9),
      new THREE.MeshBasicMaterial({ map: contactShadowTex, transparent: true, depthWrite: false })
    );
    contactShadow.rotation.x = -Math.PI/2;
    contactShadow.position.y = 0.015;
    character.add(contactShadow);

    character.position.set(0,0,5.2);
    sc.add(character);

    const animState = { mixer: null, walkAction: null, modelLoaded: false };
    new THREE.FBXLoader().load(WALK_MINER_FBX, object => {
      const box = new THREE.Box3().setFromObject(object);
      const size = box.getSize(new THREE.Vector3());
      const scale = 1.75 / (size.y || 1);
      object.scale.setScalar(scale);
      const center = box.getCenter(new THREE.Vector3());
      object.position.x -= center.x * scale;
      object.position.z -= center.z * scale;
      object.position.y -= box.min.y * scale;
      object.traverse(n => { if (n.isMesh) { n.castShadow = true; n.receiveShadow = true; } });
      character.add(object);
      placeholderGroup.visible = false;
      animState.modelLoaded = true;

      if (object.animations && object.animations.length){
        animState.mixer = new THREE.AnimationMixer(object);
        const findClip = (regex, fallbackIndex) => {
          const found = object.animations.find(a => regex.test(a.name));
          return found || object.animations[fallbackIndex] || object.animations[0];
        };
        let walkClip = findClip(/walk|camin|andar|run|marcha/i, 0);

        function stripRootMotionXZ(clip){
          clip.tracks.forEach(track => {
            const isPositionTrack = track.name.toLowerCase().endsWith('.position');
            const looksLikeRoot = /hip|root|pelvis|cadera/i.test(track.name);
            if (isPositionTrack && looksLikeRoot){
              const values = track.values;
              const baseX = values[0], baseZ = values[2];
              for (let i = 0; i < values.length; i += 3){
                values[i]   = baseX;
                values[i+2] = baseZ;
              }
            }
          });
          return clip;
        }
        walkClip = stripRootMotionXZ(walkClip);

        animState.walkAction = animState.mixer.clipAction(walkClip);
        animState.walkAction.setLoop(THREE.LoopRepeat);
      }
    }, undefined, err => {
      console.error('[Mundo] ERROR: no se pudo cargar "' + WALK_MINER_FBX + '".', err);
    });

    return { scene: sc, character, legL, legR, armL, armR, animState, portals };
  }

  let mundoWorld = null;
  let mundoActive = false;

  const worldKeys = {};
  const worldTouch = { fwd: 0, turn: 0 };

  function isMovementKey(key){
    return ['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d'].includes(key);
  }
  window.addEventListener('keydown', e => {
    if (!mundoActive) return;
    const k = e.key.toLowerCase();
    if (isMovementKey(k)){ worldKeys[k] = true; e.preventDefault(); }
  });
  window.addEventListener('keyup', e => {
    const k = e.key.toLowerCase();
    if (isMovementKey(k)) worldKeys[k] = false;
  });
  window.addEventListener('blur', () => { for (const k in worldKeys) worldKeys[k] = false; });

  window.addEventListener('keydown', e => {
    if (!mundoActive || !nearPortal) return;
    const k = e.key.toLowerCase();
    if (k === 'e' || k === 'enter'){
      window.location.href = PORTAL_DESTINATIONS[nearPortal.key];
    }
  });

  function setupDpadButton(id, applyFn, clearFn){
    const btn = document.getElementById(id);
    if (!btn) return;
    const press = ev => { ev.preventDefault(); btn.classList.add('pressed'); applyFn(); };
    const release = ev => { if(ev) ev.preventDefault(); btn.classList.remove('pressed'); clearFn(); };
    btn.addEventListener('pointerdown', press);
    btn.addEventListener('pointerup', release);
    btn.addEventListener('pointercancel', release);
    btn.addEventListener('pointerdown', ev => { if (btn.setPointerCapture) btn.setPointerCapture(ev.pointerId); });
  }
  setupDpadButton('wd-up',    ()=>worldTouch.fwd = 1,  ()=>{ if(worldTouch.fwd>0) worldTouch.fwd = 0; });
  setupDpadButton('wd-down',  ()=>worldTouch.fwd = -1, ()=>{ if(worldTouch.fwd<0) worldTouch.fwd = 0; });
  setupDpadButton('wd-left',  ()=>worldTouch.turn = 1, ()=>{ if(worldTouch.turn>0) worldTouch.turn = 0; });
  setupDpadButton('wd-right', ()=>worldTouch.turn = -1,()=>{ if(worldTouch.turn<0) worldTouch.turn = 0; });

  function ensurePortalPrompt(){
    if (portalPromptEl) return portalPromptEl;
    const el = document.createElement('div');
    el.id = 'portal-prompt';
    el.style.cssText = [
      'position:absolute','left:50%','bottom:120px','transform:translate(-50%,10px)',
      'z-index:9','opacity:0','pointer-events:none',
      'transition:opacity 0.25s ease, transform 0.25s ease',
      'display:flex','flex-direction:column','align-items:center','gap:6px'
    ].join(';');
    el.innerHTML =
      '<div id="portal-prompt-label" style="font-family:\'Courier New\',monospace;font-size:10px;letter-spacing:2px;color:rgba(223,240,255,0.85);text-transform:uppercase;text-shadow:0 2px 8px rgba(0,0,0,0.8);"></div>' +
      '<button id="portal-prompt-btn" style="font-family:\'Courier New\',monospace;font-size:13px;letter-spacing:3px;text-transform:uppercase;color:#04080f;background:#dff0ff;border:none;border-radius:22px;padding:10px 28px;cursor:pointer;box-shadow:0 0 18px rgba(79,163,232,0.6);">Entrar</button>';

    mundoScreenEl.appendChild(el);
    portalPromptEl = el;
    document.getElementById('portal-prompt-btn').addEventListener('click', () => {
      if (nearPortal) window.location.href = PORTAL_DESTINATIONS[nearPortal.key];
    });
    return el;
  }

  function setNearPortal(portal){
    if (portal === nearPortal) return;
    nearPortal = portal;
    const el = ensurePortalPrompt();
    const labelEl = document.getElementById('portal-prompt-label');
    if (nearPortal){
      if (labelEl) labelEl.textContent = nearPortal.label;
      el.style.opacity = '1';
      el.style.pointerEvents = 'auto';
      el.style.transform = 'translate(-50%,0)';
    } else {
      el.style.opacity = '0';
      el.style.pointerEvents = 'none';
      el.style.transform = 'translate(-50%,10px)';
    }
  }

  function createMundoWorld(){
    if (mundoWorld) return;

    const cvs = document.getElementById('canvas-mundo');
    const W3 = () => cvs.clientWidth  || cvs.offsetWidth  || 300;
    const H3 = () => cvs.clientHeight || cvs.offsetHeight || 300;

    const rend = new THREE.WebGLRenderer({ canvas: cvs, antialias: true });
    rend.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rend.outputEncoding = THREE.sRGBEncoding;
    rend.toneMapping = THREE.ACESFilmicToneMapping;
    rend.toneMappingExposure = 1.15;
    rend.shadowMap.enabled = true;

    const built = buildMundoScene();
    const sc = built.scene, character = built.character;
    const cam = new THREE.PerspectiveCamera(58, 1, 0.1, 320);

    let heading = Math.PI;
    const moveSpeed = 4.6, turnSpeed = 2.3;
    const roadHalfWidth = 4.2;
    const zNear = 5.5, zFar = -180;
    let walkPhase = 0;
    const camDist = 5.6, camHeight = 3.5;
    const lookAheadDist = 1.5, lookAtHeight = 0.85;

    cam.position.set(
      character.position.x - Math.sin(heading) * camDist,
      camHeight,
      character.position.z - Math.cos(heading) * camDist
    );
    cam.lookAt(
      character.position.x + Math.sin(heading) * lookAheadDist,
      lookAtHeight,
      character.position.z + Math.cos(heading) * lookAheadDist
    );

    const ph = document.getElementById('ph-mundo');
    const badge = document.getElementById('badge-mundo');
    if (ph) ph.style.display = 'none';
    if (badge) badge.textContent = 'Explorable';

    function updateWorld(delta){
      let turn = 0, fwd = 0;
      if (worldKeys['arrowleft']  || worldKeys['a']) turn += 1;
      if (worldKeys['arrowright'] || worldKeys['d']) turn -= 1;
      if (worldKeys['arrowup']    || worldKeys['w']) fwd += 1;
      if (worldKeys['arrowdown']  || worldKeys['s']) fwd -= 1;
      turn += worldTouch.turn;
      fwd  += worldTouch.fwd;
      turn = Math.max(-1, Math.min(1, turn));
      fwd  = Math.max(-1, Math.min(1, fwd));

      heading += turn * turnSpeed * delta;

      const dx = Math.sin(heading) * fwd * moveSpeed * delta;
      const dz = Math.cos(heading) * fwd * moveSpeed * delta;
      let nx = character.position.x + dx;
      let nz = character.position.z + dz;
      nx = Math.max(-roadHalfWidth, Math.min(roadHalfWidth, nx));
      nz = Math.max(zFar, Math.min(zNear, nz));
      character.position.x = nx;
      character.position.z = nz;
      character.rotation.y = heading;

      const enMovimiento = Math.abs(fwd) > 0.05 || Math.abs(turn) > 0.4;
      if (built.animState.walkAction){
        if (enMovimiento){
          if (!built.animState.walkAction.isRunning()) built.animState.walkAction.play();
        } else if (built.animState.walkAction.isRunning()){
          built.animState.walkAction.stop();
        }
      } else if (!built.animState.modelLoaded){
        if (enMovimiento){
          walkPhase += delta * 9;
          const swing = Math.sin(walkPhase) * 0.5;
          built.legL.rotation.x = swing;
          built.legR.rotation.x = -swing;
          built.armL.rotation.x = -swing;
          built.armR.rotation.x = swing;
        } else {
          built.legL.rotation.x *= 0.8; built.legR.rotation.x *= 0.8;
          built.armL.rotation.x *= 0.8; built.armR.rotation.x *= 0.8;
        }
      }

      let closest = null, closestDist = Infinity;
      for (const portal of built.portals){
        const ddx = character.position.x - portal.x;
        const ddz = character.position.z - portal.z;
        const dist = Math.hypot(ddx, ddz);
        if (dist < PORTAL_TRIGGER_DIST && dist < closestDist){ closest = portal; closestDist = dist; }
      }
      setNearPortal(closest);

      const targetCamX = character.position.x - Math.sin(heading) * camDist;
      const targetCamZ = character.position.z - Math.cos(heading) * camDist;
      cam.position.x += (targetCamX - cam.position.x) * Math.min(delta*6, 1);
      cam.position.z += (targetCamZ - cam.position.z) * Math.min(delta*6, 1);
      cam.position.y += (camHeight - cam.position.y) * Math.min(delta*6, 1);
      cam.lookAt(
        character.position.x + Math.sin(heading) * lookAheadDist,
        lookAtHeight,
        character.position.z + Math.cos(heading) * lookAheadDist
      );
    }

    let lastTs = null;
    function loop(ts){
      requestAnimationFrame(loop);
      if (lastTs === null) lastTs = ts;
      const delta = Math.min((ts - lastTs) / 1000, 0.05);
      lastTs = ts;

      const w = W3(), h = H3();
      const ratio = Math.min(window.devicePixelRatio, 2);
      if (rend.domElement.width !== Math.floor(w*ratio) || rend.domElement.height !== Math.floor(h*ratio)){
        rend.setSize(w, h);
        cam.aspect = w / Math.max(h, 1);
        cam.updateProjectionMatrix();
      }

      if (mundoActive) updateWorld(delta);
      if (built.animState.mixer) built.animState.mixer.update(delta);

      built.portals.forEach(p => {
        p.ring.rotation.z += delta * 0.6;
        p.ring2.rotation.z -= delta * 0.4;
        p.icon.quaternion.copy(cam.quaternion);
      });

      rend.render(sc, cam);
    }
    requestAnimationFrame(loop);

    mundoWorld = { rend, scene: sc, cam, character };
  }

  const fbtnMundo = document.getElementById('fbtn-mundo');
  const mundoScreenEl = document.getElementById('mundo-screen');
  const mundoCloseBtn = document.getElementById('mundo-close');

  window.openPanel = id => {
    if (id !== 'mundo') return;
    if (fbtnMundo) fbtnMundo.classList.add('active');
    decoMundo.classList.add('hidden');
    canvas.style.visibility = 'hidden';

    mundoScreenEl.classList.add('open');
    mundoActive = true;
    setTimeout(createMundoWorld, 50);
  };

  window.closePanel = () => {
    mundoScreenEl.classList.remove('open');
    if (fbtnMundo) fbtnMundo.classList.remove('active');
    decoMundo.classList.remove('hidden');
    canvas.style.visibility = 'visible';
    mundoActive = false;
    worldTouch.fwd = 0; worldTouch.turn = 0;
    for (const k in worldKeys) worldKeys[k] = false;
    setNearPortal(null);
  };

  if (mundoCloseBtn) mundoCloseBtn.addEventListener('click', closePanel);

  /* ── Botón "Procesos" del menú: lleva directo a la carpeta 3dExtraccion,
     donde están los modelos de la planta (molienda, secadora, mesas, etc). ── */
  const popProcesos = document.getElementById('pop-procesos');
  if (popProcesos){
    popProcesos.addEventListener('click', () => {
      window.location.href = './3dExtraccion/extraccion.html';
    });
  }

  /* ── Si venimos de "volver" desde Extracción o Galería (?mundo=1 en la
     URL), saltamos toda la intro y abrimos el Mundo directamente. ── */
  const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('mundo') === '1'){
  introState = 'done';
  hitsDone = PICK_HITS;
  targetRock.visible = false;
  hideHint();
  finishReveal();
  openPanel('mundo');
} else if (urlParams.get('skipIntro') === '1'){
  introState = 'done';
  hitsDone = PICK_HITS;
  targetRock.visible = false;
  hideHint();
  finishReveal();
}
})();