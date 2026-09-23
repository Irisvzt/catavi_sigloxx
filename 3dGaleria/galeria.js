const scene = new THREE.Scene();
// scene.background eliminado a propósito: ahora el fondo lo pinta el shader de nube (ver más abajo)
scene.fog = new THREE.Fog(0x1a1410, 5, 80);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1.6, 12);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = false;
document.getElementById('canvas-container').appendChild(renderer.domElement);

/* ------------------------------------------------------------------ *
 * FONDO: mismo shader de nube con destellos celestes que en historia.js
 * (con soporte de transición día/noche vía u_dayFactor)
 * ------------------------------------------------------------------ */
const bgScene = new THREE.Scene();
const bgCamera = new THREE.Camera();
bgCamera.position.z = 1;

const bgVertexShader = `
void main() {
    gl_Position = vec4(position, 1.0);
}
`;

const bgFragmentShader = `
uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;
uniform sampler2D u_bg;
uniform float u_scroll;
uniform float u_dayFactor;

const vec3 cloudcolour = vec3(0.09, 0.06, 0.04);
const vec3 lightcolour = vec3(0.55, 0.35, 0.20);
const vec3 cloudcolourDay = vec3(0.72, 0.87, 0.98);
const vec3 lightcolourDay = vec3(0.93, 0.97, 1.0);

float mod289(float x){ return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x){ return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 perm(vec4 x){ return mod289(((x * 34.0) + 1.0) * x); }

float noise(vec3 p){
    vec3 a = floor(p);
    vec3 d = p - a;
    d = d * d * (3.0 - 2.0 * d);

    vec4 b = a.xxyy + vec4(0.0, 1.0, 0.0, 1.0);
    vec4 k1 = perm(b.xyxy);
    vec4 k2 = perm(k1.xyxy + b.zzww);

    vec4 c = k2 + a.zzzz;
    vec4 k3 = perm(c);
    vec4 k4 = perm(c + 1.0);

    vec4 o1 = fract(k3 * (1.0 / 41.0));
    vec4 o2 = fract(k4 * (1.0 / 41.0));

    vec4 o3 = o2 * d.z + o1 * (1.0 - d.z);
    vec2 o4 = o3.yw * d.x + o3.xz * (1.0 - d.x);

    return o4.y * d.y + o4.x * (1.0 - d.y);
}

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.y, u_resolution.x);

    float noise1 = noise(vec3(uv * 3.0 * noise(vec3(uv * 3.0 + 100.0, u_time * 3.0 + 10.0)), u_time * 2.0)) * 2.0;
    float noise2 = noise(vec3(uv + 2.35, u_time * 1.357 - 10.0));

    uv += texture2D(u_bg, uv * vec2(0.5, 1.0) - vec2(u_time * 0.05, 1.0) - 0.5 * 0.05).rg * 0.08
        + noise1 * 0.008 * (1.0 - clamp(noise1 * noise1 * 2.0 + 0.2, 0.0, 1.0));

    vec3 tex = texture2D(u_bg, uv * vec2(0.5, 1.0) - vec2(u_time * 0.02, 1.0) - 0.5).rgb;
    vec3 tex1 = texture2D(u_bg, uv * vec2(0.5, 1.0) - vec2(u_time * 0.08, 1.0)).rgb;
    vec3 tex2 = texture2D(u_bg, (uv * 0.8 + 0.5) * vec2(0.5, 1.0) - vec2(u_time * 0.1, 1.0)).rgb;

    float shade = tex.r;
    shade *= clamp(noise1 * noise2 * sin(u_time * 3.0), 0.2, 10.0);
    shade += shade * shade * 3.0;
    shade -= (1.0 - clamp(tex1 * 4.0, 0.0, 1.0).r) * 0.2;
    shade -= (1.0 - clamp(tex2 * 4.0, 0.0, 1.0).r) * 0.1;

    vec3 nightColour = mix(cloudcolour, lightcolour, shade);
    vec3 dayColour = mix(cloudcolourDay, lightcolourDay, shade);
    vec3 fragcolour = mix(nightColour, dayColour, u_dayFactor);
    gl_FragColor = vec4(fragcolour, 1.0);
}
`;

let bgUniforms;
let bgReady = false;

const bgLoader = new THREE.TextureLoader();
bgLoader.setCrossOrigin('anonymous');
bgLoader.load('https://s3-us-west-2.amazonaws.com/s.cdpn.io/982762/clouds-1-tile.jpg', (bgTex) => {
    bgTex.wrapS = THREE.RepeatWrapping;
    bgTex.wrapT = THREE.RepeatWrapping;
    bgTex.minFilter = THREE.LinearFilter;

    bgUniforms = {
        u_time: { value: 1.0 },
        u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        u_bg: { value: bgTex },
        u_mouse: { value: new THREE.Vector2() },
        u_scroll: { value: 0 },
        u_dayFactor: { value: 0 }
    };

    const bgMaterial = new THREE.ShaderMaterial({
        uniforms: bgUniforms,
        vertexShader: bgVertexShader,
        fragmentShader: bgFragmentShader
    });
    bgMaterial.extensions.derivatives = true;

    bgScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bgMaterial));
    bgReady = true;
});

const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
scene.add(ambientLight);

// Lámparas del techo con textura (optimizado: menos luces reales, mismos bulbos visuales)
const lanternTexture = new THREE.TextureLoader().load(
    'img1/linternas.jpg',
    undefined,
    undefined,
    function(error) {
        console.error('Error cargando textura de linterna:', error);
    }
);

const LANTERN_COUNT = 18;
const REAL_LIGHT_EVERY = 3; // solo 1 de cada 3 bulbos tiene una luz real

for (let i = 0; i < LANTERN_COUNT; i++) {
    const zPos = 10 - i * 2.5;

    if (i % REAL_LIGHT_EVERY === 0) {
        const light = new THREE.PointLight(0xffffcc, 1.6, 12);
        light.position.set(0, 3.8, zPos);
        scene.add(light);
    }

    const bulb = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 16, 16),
        new THREE.MeshStandardMaterial({
            map: lanternTexture,
            emissive: 0xffff00,
            emissiveIntensity: 0.5,
            roughness: 0.5
        })
    );
    bulb.position.set(0, 3.8, zPos);
    scene.add(bulb);
}

// Piso con textura de tierra
const floorTexture = new THREE.TextureLoader().load(
    'img1/tierra.jpg',
    function(texture) {
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(90, 23);
    },
    undefined,
    function(error) {
        console.error('Error cargando textura de tierra:', error);
    }
);
const floorGeo = new THREE.PlaneGeometry(180, 150);
const floorMat = new THREE.MeshStandardMaterial({
    map: floorTexture,
    roughness: 0.95
});
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
floor.position.z = -20;
floor.receiveShadow = true;
scene.add(floor);

// Techo
const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(8, 80),
    new THREE.MeshStandardMaterial({ color: 0x2d2420, roughness: 1 })
);
ceiling.rotation.x = Math.PI / 2;
ceiling.position.set(0, 4.5, -10);
scene.add(ceiling);

// Paredes
function createWall(x, height, length, zCenter) {
    const wall = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, height, length),
        new THREE.MeshStandardMaterial({ color: 0x3d3025, roughness: 1 })
    );
    wall.position.set(x, height / 2, zCenter);
    scene.add(wall);
    return wall;
}
createWall(-4, 0.3, 80, -10);
createWall(4, 0.3, 80, -10);

/* ------------------------------------------------------------------ *
 * MONTAÑAS: modelo 3D (montana.glb), posiciones fijas (con semilla)
 * ------------------------------------------------------------------ */
const mountainLoader = new THREE.GLTFLoader();

function seededRandom(seed) {
    let s = seed;
    return function() {
        s = (s * 1664525 + 1013904223) % 4294967296;
        return s / 4294967296;
    };
}
const mountainRandom = seededRandom(12345);

function placeMountainRange(model, minX, maxX, side, zFrom, zTo) {
    for (let z = zFrom; z > zTo; z -= 5 + mountainRandom() * 3) {
        const mountain = model.clone(true);

        const scale = 3 + mountainRandom() * 2;
        mountain.scale.setScalar(scale);
        mountain.rotation.y = mountainRandom() * Math.PI * 2;

        const x = side * (minX + mountainRandom() * (maxX - minX));
        mountain.position.set(x, 0, z);

        mountain.updateMatrixWorld(true);
        const instanceBox = new THREE.Box3().setFromObject(mountain);
        const groundY = -0.3;
        mountain.position.y += (groundY - instanceBox.min.y);

        mountain.traverse(child => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        scene.add(mountain);
    }
}

mountainLoader.load(
    'montana.glb',
    (gltf) => {
        const model = gltf.scene;
        placeMountainRange(model, 5, 32, 1, 45, -80);
        placeMountainRange(model, 20, 32, -1, 45, -80);
    },
    undefined,
    (error) => {
        console.error('Error cargando montana.glb:', error);
    }
);

/* ------------------------------------------------------------------ *
 * RIELES: textura de óxido en el metal, vetas de madera en los
 * durmientes, y pequeño desnivel aleatorio (nunca quedan perfectos)
 * ------------------------------------------------------------------ */
function makeRustTexture() {
    const c = document.createElement('canvas');
    c.width = 64; c.height = 64;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#4a4a4a';
    ctx.fillRect(0, 0, 64, 64);
    for (let i = 0; i < 40; i++) {
        ctx.fillStyle = Math.random() > 0.5
            ? `rgba(120, 70, 30, ${0.15 + Math.random() * 0.25})`
            : `rgba(20, 20, 20, ${0.1 + Math.random() * 0.2})`;
        const w = 2 + Math.random() * 6;
        ctx.fillRect(Math.random() * 64, Math.random() * 64, w, w);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
}

function makeWoodTexture(baseColor, grainColor) {
    const c = document.createElement('canvas');
    c.width = 128; c.height = 256;
    const ctx = c.getContext('2d');
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, 128, 256);
    ctx.strokeStyle = grainColor;
    for (let i = 0; i < 22; i++) {
        ctx.globalAlpha = 0.25 + Math.random() * 0.35;
        ctx.lineWidth = 1 + Math.random() * 2;
        ctx.beginPath();
        const xStart = Math.random() * 128;
        ctx.moveTo(xStart, 0);
        let cx = xStart;
        for (let y = 0; y <= 256; y += 32) {
            cx += (Math.random() - 0.5) * 18;
            ctx.lineTo(cx, y);
        }
        ctx.stroke();
    }
    ctx.globalAlpha = 1;
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
}

const railTexture = makeRustTexture();
railTexture.repeat.set(1, 20);
const railMat = new THREE.MeshStandardMaterial({ map: railTexture, roughness: 0.85, metalness: 0.4 });

const sleeperTexture = makeWoodTexture('#3d2817', '#241609');
sleeperTexture.repeat.set(2, 1);
const sleeperMat = new THREE.MeshStandardMaterial({ map: sleeperTexture, roughness: 0.95 });

const railRandom = seededRandom(2024); // secuencia fija propia, para desnivel de durmientes

for (let z = 15; z > -50; z -= 0.5) {
    const rail1 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.4), railMat);
    rail1.position.set(-0.9, 0.04, z);
    scene.add(rail1);

    const rail2 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.4), railMat);
    rail2.position.set(0.9, 0.04, z);
    scene.add(rail2);

    if (Math.abs(z % 1) < 0.5) {
        const sleeper = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.15, 0.2), sleeperMat);
        // Pequeño desnivel y desalineación aleatoria, como en durmientes reales desgastados
        const jitterY = (railRandom() - 0.5) * 0.03;
        const jitterZ = (railRandom() - 0.5) * 0.06;
        const jitterRot = (railRandom() - 0.5) * 0.08;
        sleeper.position.set(0, 0.02 + jitterY, z + jitterZ);
        sleeper.rotation.y = jitterRot;
        scene.add(sleeper);
    }
}

// Letrero 3D con profundidad
const signGroup = new THREE.Group();

const signBase = new THREE.Mesh(
    new THREE.BoxGeometry(4.2, 2.2, 0.3),
    new THREE.MeshStandardMaterial({
        color: 0x2e2016,
        roughness: 0.9,
        metalness: 0.05
    })
);
signBase.castShadow = true;
signBase.receiveShadow = true;
signGroup.add(signBase);

// Marco exterior: bronce envejecido, dos tonos para dar sensación de bisel
const frameOuterMat = new THREE.MeshStandardMaterial({ color: 0x5a4326, roughness: 0.4, metalness: 0.75 });
const frameInnerMat = new THREE.MeshStandardMaterial({
    color: 0x8a6a35, roughness: 0.3, metalness: 0.8,
    emissive: 0x442f10, emissiveIntensity: 0.15
});

[
    [4.0, 0.15, 0.12, 0, 1.0, 0.15],
    [4.0, 0.15, 0.12, 0, -1.0, 0.15],
    [0.15, 2.0, 0.12, -1.95, 0, 0.15],
    [0.15, 2.0, 0.12, 1.95, 0, 0.15]
].forEach(([w, h, d, x, y, z]) => {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), frameOuterMat);
    bar.position.set(x, y, z);
    signGroup.add(bar);
});

[
    [3.88, 0.05, 0.08, 0, 0.92, 0.2],
    [3.88, 0.05, 0.08, 0, -0.92, 0.2],
    [0.05, 1.9, 0.08, -1.88, 0, 0.2],
    [0.05, 1.9, 0.08, 1.88, 0, 0.2]
].forEach(([w, h, d, x, y, z]) => {
    const fillet = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), frameInnerMat);
    fillet.position.set(x, y, z);
    signGroup.add(fillet);
});

// Remaches decorativos en las esquinas
const rivetMat = new THREE.MeshStandardMaterial({ color: 0x8a6a35, roughness: 0.3, metalness: 0.85 });
[[-1.9, 1.0], [1.9, 1.0], [-1.9, -1.0], [1.9, -1.0]].forEach(([rx, ry]) => {
    const rivet = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 10), rivetMat);
    rivet.position.set(rx, ry, 0.22);
    signGroup.add(rivet);
});

// Fondo tipo pergamino envejecido, con viñeta suave (en vez de un beige plano)
const bgCanvas = document.createElement('canvas');
bgCanvas.width = 1024; bgCanvas.height = 512;
const bgCtx = bgCanvas.getContext('2d');
const bgGrad = bgCtx.createRadialGradient(512, 256, 100, 512, 256, 560);
bgGrad.addColorStop(0, '#f2e3ba');
bgGrad.addColorStop(1, '#c9a35f');
bgCtx.fillStyle = bgGrad;
bgCtx.fillRect(0, 0, 1024, 512);

const signBackground = new THREE.Mesh(
    new THREE.PlaneGeometry(3.8, 1.9),
    new THREE.MeshStandardMaterial({
        map: new THREE.CanvasTexture(bgCanvas),
        roughness: 0.75
    })
);
signBackground.position.z = 0.16;
signGroup.add(signBackground);

// Texto: título + línea decorativa + subtítulo en cursiva
const signCanvas = document.createElement('canvas');
signCanvas.width = 1024;
signCanvas.height = 512;
const signCtx = signCanvas.getContext('2d');
signCtx.textAlign = 'center';

signCtx.fillStyle = '#1c140c';
signCtx.shadowColor = 'rgba(0, 0, 0, 0.25)';
signCtx.shadowBlur = 4;
signCtx.shadowOffsetX = 2;
signCtx.shadowOffsetY = 2;
signCtx.font = 'bold 68px Georgia';
signCtx.fillText('GALERÍA FOTOGRÁFICA', 512, 210);

signCtx.shadowColor = 'transparent';
signCtx.strokeStyle = '#7a5a28';
signCtx.lineWidth = 2;
signCtx.beginPath();
signCtx.moveTo(362, 250);
signCtx.lineTo(662, 250);
signCtx.stroke();

signCtx.font = 'italic 42px Georgia';
signCtx.fillStyle = '#3a2a18';
signCtx.fillText('Cooperativa Catavi Siglo XX', 512, 320);

const textMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(3.7, 1.85),
    new THREE.MeshStandardMaterial({
        map: new THREE.CanvasTexture(signCanvas),
        transparent: true,
        roughness: 0.5
    })
);
textMesh.position.z = 0.25;
textMesh.castShadow = true;
signGroup.add(textMesh);

// Pequeñas cadenas de sujeción arriba (da sensación de letrero colgado)
const chainMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.5, metalness: 0.7 });
[-1.6, 1.6].forEach((cx) => {
    const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 6), chainMat);
    chain.position.set(cx, 1.18, 0.1);
    signGroup.add(chain);
});

const signLight1 = new THREE.SpotLight(0xffcc77, 1.5, 10, Math.PI / 6);
signLight1.position.set(0, 5, 8);
signLight1.target = signBase;
scene.add(signLight1);

const signLight2 = new THREE.PointLight(0xffaa55, 0.8, 8);
signLight2.position.set(0, 2, 7);
scene.add(signLight2);

signGroup.position.set(0, 3.2, 6);
signGroup.castShadow = true;
scene.add(signGroup);

// Fotografías
const photos = [
    { image: "img1/1.jpg", z: 2 },
    { image: "img1/2.jpg", z: -2 },
    { image: "img1/3.jpg", z: -6 },
    { image: "img1/4.jpg", z: -10 },
    { image: "img1/5.jpg", z: -14 },
    { image: "img1/6.jpg", z: -18 },
    { image: "img1/7.jpg", z: -22 },
    { image: "img1/8.jpg", z: -26 },
    { image: "img1/9.jpg", z: -30 }
];

const textureLoader = new THREE.TextureLoader();
const photoFrames = [];

photos.forEach((photo, i) => {
    const frameGroup = new THREE.Group();

    const frameOuterMat2 = new THREE.MeshStandardMaterial({ color: 0x3a2414, roughness: 0.7, metalness: 0.05 });
    const frameInnerMat2 = new THREE.MeshStandardMaterial({ color: 0x5c3a1f, roughness: 0.6, metalness: 0.1 });

    const backing = new THREE.Mesh(
        new THREE.BoxGeometry(1.9, 2.2, 0.08),
        new THREE.MeshStandardMaterial({ color: 0x1f140b, roughness: 0.9 })
    );
    backing.position.set(0, 0, -0.05);
    frameGroup.add(backing);

    [
        [1.9, 0.14, 0.1, 0, 1.08, 0],
        [1.9, 0.14, 0.1, 0, -1.08, 0],
        [0.14, 2.2, 0.1, -0.88, 0, 0],
        [0.14, 2.2, 0.1, 0.88, 0, 0]
    ].forEach(([w, h, d, x, y, z]) => {
        const frame = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), frameOuterMat2);
        frame.position.set(x, y, z + 0.02);
        frameGroup.add(frame);
    });

    [
        [1.78, 0.05, 0.09, 0, 0.98, 0],
        [1.78, 0.05, 0.09, 0, -0.98, 0],
        [0.05, 1.96, 0.09, -0.79, 0, 0],
        [0.05, 1.96, 0.09, 0.79, 0, 0]
    ].forEach(([w, h, d, x, y, z]) => {
        const fillet = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), frameInnerMat2);
        fillet.position.set(x, y, z + 0.06);
        frameGroup.add(fillet);
    });

    const mat = new THREE.Mesh(
        new THREE.PlaneGeometry(1.78, 1.96),
        new THREE.MeshStandardMaterial({ color: 0xe8dfc8, roughness: 0.85 })
    );
    mat.position.z = 0.11;
    frameGroup.add(mat);

    const cornerMat = new THREE.MeshStandardMaterial({ color: 0xb8860b, roughness: 0.35, metalness: 0.8 });
    [[-0.83, 1.0], [0.83, 1.0], [-0.83, -1.0], [0.83, -1.0]].forEach(([cx, cy]) => {
        const corner = new THREE.Mesh(new THREE.CircleGeometry(0.045, 12), cornerMat);
        corner.position.set(cx, cy, 0.12);
        frameGroup.add(corner);
    });

    const plaqueCanvas = document.createElement('canvas');
    plaqueCanvas.width = 256; plaqueCanvas.height = 64;
    const pctx = plaqueCanvas.getContext('2d');
    pctx.fillStyle = '#e8dfc8';
    pctx.fillRect(0, 0, 256, 64);
    pctx.fillStyle = '#2a1f1a';
    pctx.font = 'bold 28px Georgia';
    pctx.textAlign = 'center';
    pctx.fillText('N° ' + (i + 1).toString().padStart(2, '0'), 128, 42);
    const plaque = new THREE.Mesh(
        new THREE.PlaneGeometry(0.5, 0.13),
        new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(plaqueCanvas), roughness: 0.6 })
    );
    plaque.position.set(0, -1.22, 0.12);
    frameGroup.add(plaque);

    textureLoader.load(
        photo.image,
        function(texture) {
            const photoMesh = new THREE.Mesh(
                new THREE.PlaneGeometry(1.6, 1.82),
                new THREE.MeshStandardMaterial({ map: texture, roughness: 0.4 })
            );
            photoMesh.position.z = 0.12;
            frameGroup.add(photoMesh);
        },
        undefined,
        function(error) {
            console.error('Error cargando ' + photo.image + ':', error);
            const photoMesh = new THREE.Mesh(
                new THREE.PlaneGeometry(1.6, 1.82),
                new THREE.MeshStandardMaterial({ color: 0x2a1f1a })
            );
            photoMesh.position.z = 0.12;
            frameGroup.add(photoMesh);
        }
    );

    const side = i % 2 === 0 ? -3.2 : 3.2;
    const rot = i % 2 === 0 ? Math.PI / 2 : -Math.PI / 2;
    frameGroup.position.set(side, 2.3, photo.z);
    frameGroup.rotation.y = rot;
    frameGroup.userData = { imagePath: photo.image };
    scene.add(frameGroup);
    photoFrames.push(frameGroup);
});

// Minerales flotantes (optimizado: sin PointLight por unidad)
const minerals = [];
for (let i = 0; i < 60; i++) {
    const mineralGroup = new THREE.Group();
    const isGold = Math.random() > 0.5;

    const mineral = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.18, 0),
        new THREE.MeshStandardMaterial({
            color: isGold ? 0xffd700 : 0x4169e1,
            emissive: isGold ? 0xffa500 : 0x00bfff,
            emissiveIntensity: 0.6,
            metalness: 0.9,
            roughness: 0.1
        })
    );
    mineralGroup.add(mineral);

    const xPos = Math.random() < 0.5 ? -5 - Math.random() * 4 : 5 + Math.random() * 4;
    mineralGroup.position.set(xPos, 0.5 + Math.random() * 3.5, 5 - Math.random() * 30);
    mineralGroup.userData = {
        floatSpeed: 0.4 + Math.random() * 0.6,
        rotSpeed: 0.3 + Math.random() * 0.7,
        initialY: mineralGroup.position.y
    };
    minerals.push(mineralGroup);
    scene.add(mineralGroup);
}

// Cascos flotantes (optimizado: sin PointLight por unidad)
const helmets = [];
for (let i = 0; i < 30; i++) {
    const helmetGroup = new THREE.Group();

    const helmet = new THREE.Mesh(
        new THREE.SphereGeometry(0.15, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2),
        new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0xff3300, emissiveIntensity: 0.4 })
    );
    helmetGroup.add(helmet);

    const lamp = new THREE.Mesh(
        new THREE.SphereGeometry(0.05, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xffff00 })
    );
    lamp.position.set(0, 0.06, 0.15);
    helmetGroup.add(lamp);

    const xPos = Math.random() < 0.5 ? -5 - Math.random() * 3 : 5 + Math.random() * 3;
    const yPos = 1.5 + Math.random() * 2.5;
    helmetGroup.position.set(xPos, yPos, 5 - Math.random() * 28);
    helmetGroup.rotation.x = -Math.PI / 4;
    helmetGroup.userData = { floatSpeed: 0.5 + Math.random() * 0.5, initialY: yPos };
    helmets.push(helmetGroup);
    scene.add(helmetGroup);
}

/* ------------------------------------------------------------------ *
 * PIEDRAS: textura moteada (no gris liso) y dos tonos (gris/rojizo)
 * mezclados, para que no se vean todas idénticas
 * ------------------------------------------------------------------ */
function makeRockTexture(baseColor, speckleColors) {
    const c = document.createElement('canvas');
    c.width = 128; c.height = 128;
    const ctx = c.getContext('2d');
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 90; i++) {
        ctx.fillStyle = speckleColors[Math.floor(Math.random() * speckleColors.length)];
        const s = 1 + Math.random() * 4;
        ctx.globalAlpha = 0.2 + Math.random() * 0.3;
        ctx.fillRect(Math.random() * 128, Math.random() * 128, s, s);
    }
    ctx.globalAlpha = 1;
    const tex = new THREE.CanvasTexture(c);
    return tex;
}

const rockCountDodeca = 75;
const rockCountIcosa = 75;

const dodecaGeo = new THREE.DodecahedronGeometry(0.18, 0);
const icosaGeo = new THREE.IcosahedronGeometry(0.18, 0);

// Tono gris-azulado (mineral) y tono rojizo-óxido (tierra), mezclados
const rockMatGray = new THREE.MeshStandardMaterial({
    map: makeRockTexture('#6b7280', ['#4b5260', '#8a919c', '#5c6470']),
    roughness: 0.9,
    metalness: 0.1
});
const rockMatRust = new THREE.MeshStandardMaterial({
    map: makeRockTexture('#7a5c48', ['#5c4230', '#8f6f52', '#4a3624']),
    roughness: 0.9,
    metalness: 0.05
});

const rocksDodeca = new THREE.InstancedMesh(dodecaGeo, rockMatGray, rockCountDodeca);
const rocksIcosa = new THREE.InstancedMesh(icosaGeo, rockMatRust, rockCountIcosa);
rocksDodeca.castShadow = rocksDodeca.receiveShadow = true;
rocksIcosa.castShadow = rocksIcosa.receiveShadow = true;

const dummy = new THREE.Object3D();

function placeRockInstances(instancedMesh, count) {
    for (let i = 0; i < count; i++) {
        const sizeRandom = Math.random();
        let scale;
        if (sizeRandom > 0.85) scale = (0.25 + Math.random() * 0.25) / 0.18;
        else if (sizeRandom > 0.6) scale = (0.15 + Math.random() * 0.15) / 0.18;
        else scale = (0.08 + Math.random() * 0.12) / 0.18;

        const xPos = Math.random() > 0.5 ? -3.5 + Math.random() * 1.8 : 1.7 + Math.random() * 1.8;
        const zPos = 8 - Math.random() * 40;

        dummy.position.set(xPos, 0.09 * scale, zPos);
        dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
        dummy.scale.setScalar(scale);
        dummy.updateMatrix();
        instancedMesh.setMatrixAt(i, dummy.matrix);
    }
    instancedMesh.instanceMatrix.needsUpdate = true;
}

placeRockInstances(rocksDodeca, rockCountDodeca);
placeRockInstances(rocksIcosa, rockCountIcosa);

scene.add(rocksDodeca);
scene.add(rocksIcosa);

// Partículas de polvo (optimizado: un solo sistema de puntos en vez de 250 mallas)
const dustCount = 250;
const dustPositions = new Float32Array(dustCount * 3);
const dustVelocities = [];

for (let i = 0; i < dustCount; i++) {
    dustPositions[i * 3]     = -10 + Math.random() * 20;
    dustPositions[i * 3 + 1] = 0.3 + Math.random() * 4.5;
    dustPositions[i * 3 + 2] = 10 - Math.random() * 35;
    dustVelocities.push({
        vx: -0.003 + Math.random() * 0.006,
        vy: 0.002 + Math.random() * 0.006,
        vz: -0.003 + Math.random() * 0.006
    });
}

const dustGeometry = new THREE.BufferGeometry();
dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));

const dustMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.05,
    transparent: true,
    opacity: 0.5,
    depthWrite: false
});

const dustPoints = new THREE.Points(dustGeometry, dustMaterial);
scene.add(dustPoints);

/* ------------------------------------------------------------------ *
 * VIGAS DE SOPORTE: cilindros con textura de veta de madera generada por
 * código, variación aleatoria por viga, y banda metálica oxidada
 * ------------------------------------------------------------------ */
const beamWoodTexture = makeWoodTexture('#4a3625', '#2c1f14');
beamWoodTexture.repeat.set(1, 3);

const woodMatBase = new THREE.MeshStandardMaterial({
    map: beamWoodTexture,
    roughness: 0.95,
    metalness: 0.02
});

const rustBandMat = new THREE.MeshStandardMaterial({
    color: 0x5c4a35, roughness: 0.7, metalness: 0.4
});

const beamRandom = seededRandom(777); // secuencia fija propia, no interfiere con la de las montañas

function createSupportBeam(x, z) {
    const beamGroup = new THREE.Group();

    const thickness = 0.19 + beamRandom() * 0.07;
    const tilt = (beamRandom() - 0.5) * 0.05;
    const height = 5.0 + beamRandom() * 0.4;

    const post = new THREE.Mesh(
        new THREE.CylinderGeometry(thickness, thickness * 1.15, height, 8),
        woodMatBase
    );
    post.position.set(0, height / 2 - 0.4, 0);
    post.rotation.z = tilt;
    post.rotation.y = beamRandom() * Math.PI;
    post.castShadow = true;
    post.receiveShadow = true;
    beamGroup.add(post);

    const band = new THREE.Mesh(
        new THREE.CylinderGeometry(thickness * 1.08, thickness * 1.08, 0.12, 8),
        rustBandMat
    );
    band.position.set(0, 0.9, 0);
    beamGroup.add(band);

    const crossBeam = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.11, 1.6, 8),
        woodMatBase
    );
    crossBeam.rotation.z = Math.PI / 2;
    crossBeam.position.set(0, height - 0.6, x > 0 ? -0.8 : 0.8);
    crossBeam.castShadow = true;
    beamGroup.add(crossBeam);

    const brace = new THREE.Mesh(
        new THREE.CylinderGeometry(0.07, 0.08, 1.1, 6),
        woodMatBase
    );
    brace.position.set(0, height - 1.9, x > 0 ? -0.35 : 0.35);
    brace.rotation.x = x > 0 ? -0.55 : 0.55;
    beamGroup.add(brace);

    beamGroup.position.set(x, -0.1, z);
    scene.add(beamGroup);
    return beamGroup;
}

document.getElementById('loading').style.display = 'none';

for (let i = 0; i < 20; i++) {
    if (i % 2 === 0) {
        createSupportBeam(-4, 10 - i * 2.5);
        createSupportBeam(4, 10 - i * 2.5);
    }
}

// Controles de movimiento
const keys = {};
document.addEventListener('keydown', e => keys[e.code] = true);
document.addEventListener('keyup', e => keys[e.code] = false);

// Rotación de cámara: gira según CUÁNTO se mueve el mouse (movimiento relativo),
// no según su posición en pantalla. Así se queda quieta al pasar sobre botones
// de la interfaz, sin necesidad de Pointer Lock ni ocultar el cursor.
let yaw = 0, pitch = 0;
const moveSpeed = 0.15;
const rotateSpeed = 0.006; // sensibilidad del giro por movimiento del mouse

document.addEventListener('mousemove', e => {
    // Si el cursor está sobre algún botón/panel de la interfaz, no mover la cámara
    if (e.target.closest('#help-button, #daynight-toggle, #back-button, #view-button, #close-button, #photo-overlay, .controls')) {
        return;
    }
    yaw -= e.movementX * rotateSpeed;
    pitch -= e.movementY * rotateSpeed;
    pitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, pitch));
});

let time = 0;
let currentNearPhoto = null;

// Día/Noche
let dayFactor = 0;
let targetDayFactor = 0;
const dayTransitionSpeed = 0.0025; // más bajo = transición más lenta
const nightFogColor = new THREE.Color(0x1a1410);
const dayFogColor = new THREE.Color(0x9fc8e8);
const dayNightToggle = document.getElementById('daynight-toggle');

dayNightToggle.addEventListener('click', () => {
    targetDayFactor = targetDayFactor === 0 ? 1 : 0;
    dayNightToggle.classList.toggle('is-day', targetDayFactor === 1);
    dayNightToggle.title = targetDayFactor === 1 ? 'Cambiar a modo noche' : 'Cambiar a modo día';
});

const viewButton = document.getElementById('view-button');
const photoOverlay = document.getElementById('photo-overlay');
const overlayImage = document.getElementById('overlay-image');
const closeButton = document.getElementById('close-button');
const helpButton = document.getElementById('help-button');
const controlsPanel = document.querySelector('.controls');

helpButton.addEventListener('click', () => {
    if (controlsPanel.style.display === 'none' || controlsPanel.style.display === '') {
        controlsPanel.style.display = 'block';
    } else {
        controlsPanel.style.display = 'none';
    }
});

viewButton.addEventListener('click', () => {
    if (currentNearPhoto) {
        overlayImage.src = currentNearPhoto.userData.imagePath;
        photoOverlay.style.display = 'flex';
    }
});

document.addEventListener('keydown', (e) => {
    if (e.code === 'Enter' && currentNearPhoto && photoOverlay.style.display !== 'flex') {
        overlayImage.src = currentNearPhoto.userData.imagePath;
        photoOverlay.style.display = 'flex';
    }
});

closeButton.addEventListener('click', () => {
    photoOverlay.style.display = 'none';
});

document.addEventListener('keydown', (e) => {
    if (e.code === 'Escape' && photoOverlay.style.display === 'flex') {
        photoOverlay.style.display = 'none';
    }
});

function checkPhotoProximity() {
    let nearPhoto = null;
    const detectionDistance = 2.5;

    photoFrames.forEach(frame => {
        const distance = camera.position.distanceTo(frame.position);
        if (distance < detectionDistance) {
            nearPhoto = frame;
        }
    });

    if (nearPhoto) {
        viewButton.style.display = 'block';
        currentNearPhoto = nearPhoto;
    } else {
        viewButton.style.display = 'none';
        currentNearPhoto = null;
    }
}

function animate() {
    requestAnimationFrame(animate);
    time += 0.016;

    checkPhotoProximity();

    minerals.forEach(m => {
        m.position.y = m.userData.initialY + Math.sin(time * m.userData.floatSpeed) * 0.25;
        m.rotation.y += 0.01 * m.userData.rotSpeed;
        m.rotation.x += 0.006 * m.userData.rotSpeed;
    });

    helmets.forEach((h, i) => {
        h.position.y = h.userData.initialY + Math.sin(time * h.userData.floatSpeed + i) * 0.18;
        h.rotation.y += 0.009;
    });

    const dustPosAttr = dustGeometry.attributes.position;
    for (let i = 0; i < dustCount; i++) {
        let x = dustPosAttr.getX(i) + dustVelocities[i].vx;
        let y = dustPosAttr.getY(i) + dustVelocities[i].vy;
        let z = dustPosAttr.getZ(i) + dustVelocities[i].vz;

        if (y > 5) y = 0.3;
        if (x < -10 || x > 10) x = -10 + Math.random() * 20;
        if (z < -30 || z > 10) z = 10 - Math.random() * 35;

        dustPosAttr.setXYZ(i, x, y, z);
    }
    dustPosAttr.needsUpdate = true;
    dustMaterial.opacity = 0.4 + Math.sin(time * 2) * 0.15;

    // Rotación con teclado: Q/E o las flechas izquierda/derecha
    const rotateKeySpeed = 0.03;
    if (keys['KeyQ'] || keys['ArrowLeft']) yaw += rotateKeySpeed;
    if (keys['KeyE'] || keys['ArrowRight']) yaw -= rotateKeySpeed;

    const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
    const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));

    if (keys['KeyW'] || keys['ArrowUp']) camera.position.addScaledVector(forward, moveSpeed);
    if (keys['KeyS'] || keys['ArrowDown']) camera.position.addScaledVector(forward, -moveSpeed);
    if (keys['KeyA']) camera.position.addScaledVector(right, -moveSpeed);
    if (keys['KeyD']) camera.position.addScaledVector(right, moveSpeed);

    camera.position.x = Math.max(-3, Math.min(3, camera.position.x));
    camera.position.z = Math.max(-30, Math.min(12, camera.position.z));

    camera.rotation.order = 'YXZ';
    camera.rotation.y = yaw;
    camera.rotation.x = pitch;

    // Transición lenta día/noche
    dayFactor += (targetDayFactor - dayFactor) * dayTransitionSpeed;
    scene.fog.color.copy(nightFogColor).lerp(dayFogColor, dayFactor);
    ambientLight.intensity = 0.3 + dayFactor * 0.6;

    renderer.autoClear = false;
    renderer.clear();
    if (bgReady) {
        bgUniforms.u_time.value += 0.01;
        bgUniforms.u_dayFactor.value = dayFactor;
        renderer.render(bgScene, bgCamera);
    }
    renderer.clearDepth();
    renderer.render(scene, camera);
}

animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    if (bgUniforms) {
        bgUniforms.u_resolution.value.x = window.innerWidth * window.devicePixelRatio;
        bgUniforms.u_resolution.value.y = window.innerHeight * window.devicePixelRatio;
    }
});