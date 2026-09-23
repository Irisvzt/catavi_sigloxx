import * as THREE from 'https://esm.sh/three@0.129.0/build/three.module.js';
import { GLTFLoader } from 'https://esm.sh/three@0.129.0/examples/jsm/loaders/GLTFLoader.js';
import { gsap } from 'https://esm.sh/gsap';

const container3D = document.getElementById('container3D');
const renderer = new THREE.WebGLRenderer({ alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
container3D.appendChild(renderer.domElement);

/* ------------------------------------------------------------------ *
 * FONDO: nube de polvo mineral animada (un solo pase, mismo renderer)
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

const vec3 cloudcolour = vec3(0.10, 0.14, 0.20);
const vec3 lightcolour = vec3(0.25, 0.55, 0.85);

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

    uv.y -= u_scroll * 0.0001;

    uv += texture2D(u_bg, uv * vec2(0.5, 1.0) - vec2(u_time * 0.05, 1.0) - 0.5 * 0.05).rg * 0.08
        + noise1 * 0.008 * (1.0 - clamp(noise1 * noise1 * 2.0 + 0.2, 0.0, 1.0));

    vec3 tex = texture2D(u_bg, uv * vec2(0.5, 1.0) - vec2(u_time * 0.02, 1.0) - 0.5).rgb;

    uv.y -= u_scroll * 0.0001;
    vec3 tex1 = texture2D(u_bg, uv * vec2(0.5, 1.0) - vec2(u_time * 0.08, 1.0)).rgb;

    uv.y -= u_scroll * 0.0001;
    vec3 tex2 = texture2D(u_bg, (uv * 0.8 + 0.5) * vec2(0.5, 1.0) - vec2(u_time * 0.1, 1.0)).rgb;

    float shade = tex.r;
    shade *= clamp(noise1 * noise2 * sin(u_time * 3.0), 0.2, 10.0);
    shade += shade * shade * 3.0;
    shade -= (1.0 - clamp(tex1 * 4.0, 0.0, 1.0).r) * 0.2;
    shade -= (1.0 - clamp(tex2 * 4.0, 0.0, 1.0).r) * 0.1;

    vec3 fragcolour = mix(cloudcolour, lightcolour, shade);
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
        u_scroll: { value: 0 }
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

window.addEventListener('pointermove', (e) => {
    if (!bgUniforms) return;
    const ratio = window.innerHeight / window.innerWidth;
    bgUniforms.u_mouse.value.x = (e.pageX - window.innerWidth / 2) / window.innerWidth / ratio;
    bgUniforms.u_mouse.value.y = ((e.pageY - window.innerHeight / 2) / window.innerHeight) * -1;
});

/* ------------------------------------------------------------------ *
 * CASCO
 * ------------------------------------------------------------------ */
const camera = new THREE.PerspectiveCamera(
    10,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);
camera.position.z = 13;

const scene = new THREE.Scene();
let casco;
let mixer;
const loader = new GLTFLoader();

// Casco del minero (archivo dentro de la misma carpeta "historia")
loader.load('cascominero.glb',
    function (gltf) {
        casco = gltf.scene;
        casco.scale.set(1, 1, 1);
        scene.add(casco);

        // Más brillo especular todavía, sin pasarse
        casco.traverse((child) => {
            if (child.isMesh && child.material) {
                child.material.metalness = 0.3;
                child.material.roughness = 0.12;
                child.material.needsUpdate = true;
            }
        });

        // Solo se reproduce una animación si el modelo trae una
        if (gltf.animations && gltf.animations.length > 0) {
            mixer = new THREE.AnimationMixer(casco);
            mixer.clipAction(gltf.animations[0]).play();
        }
        modelMove();
    },
    function (xhr) {},
    function (error) { console.error('Error al cargar cascominero.glb', error); }
);

// Luces
const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
scene.add(ambientLight);

const hemiLight = new THREE.HemisphereLight(0xfff2d9, 0x1a1410, 0.9);
scene.add(hemiLight);

const topLight = new THREE.DirectionalLight(0xffffff, 1.4);
topLight.position.set(500, 500, 500);
scene.add(topLight);

// Luz cálida tipo lámpara de minero, para dar brillo al material
const lampLight = new THREE.PointLight(0xffb84d, 3.2, 20);
lampLight.position.set(2, 2, 4);
scene.add(lampLight);

// Luz de relleno desde la cámara, para que el frente del casco no quede oscuro
const fillLight = new THREE.PointLight(0xffffff, 1.8, 20);
fillLight.position.set(0, 0, 13);
scene.add(fillLight);

// Luz de contorno detrás del casco, para que se despegue del fondo
const rimLight = new THREE.PointLight(0xfff2d9, 2.6, 20);
rimLight.position.set(0, 1.5, -5);
scene.add(rimLight);

/* ------------------------------------------------------------------ *
 * PARTÍCULAS: polvo disperso general + nube densa alrededor del casco
 * ------------------------------------------------------------------ */
function makeParticleSystem(count, spread, color, size, opacity) {
    const positions = new Float32Array(count * 3);
    const basePos = new Float32Array(count * 3);
    const offsets = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
        const x = (Math.random() - 0.5) * spread[0];
        const y = (Math.random() - 0.5) * spread[1];
        const z = (Math.random() - 0.5) * spread[2];
        positions[i * 3] = x; positions[i * 3 + 1] = y; positions[i * 3 + 2] = z;
        basePos[i * 3] = x; basePos[i * 3 + 1] = y; basePos[i * 3 + 2] = z;
        offsets[i * 3] = Math.random() * Math.PI * 2;
        offsets[i * 3 + 1] = Math.random() * Math.PI * 2;
        offsets[i * 3 + 2] = Math.random() * Math.PI * 2;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
        color,
        size,
        transparent: true,
        opacity,
        depthWrite: false
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    return { points, geometry, positions, basePos, offsets, count };
}

const dustGeneral = makeParticleSystem(220, [14, 10, 14], 0xffffff, 0.12, 0.35);
const dustAroundCasco = makeParticleSystem(140, [3.2, 3.2, 3.2], 0xffffff, 0.16, 0.55);

function animateParticles(system, t, speedX, speedY, speedZ, amp = 1) {
    for (let i = 0; i < system.count; i++) {
        system.positions[i * 3] = system.basePos[i * 3] + Math.sin(t * speedX + system.offsets[i * 3]) * 0.25 * amp;
        system.positions[i * 3 + 1] = system.basePos[i * 3 + 1] + Math.sin(t * speedY + system.offsets[i * 3 + 1]) * 0.3 * amp;
        system.positions[i * 3 + 2] = system.basePos[i * 3 + 2] + Math.cos(t * speedZ + system.offsets[i * 3 + 2]) * 0.2 * amp;
    }
    system.geometry.attributes.position.needsUpdate = true;
}

let autoRotate = true;
let modelTarget = { x: 0, y: -1, z: 0 }; // posición "base" que anima gsap; el flotado se suma encima

let particleTime = 0;

const reRender3D = () => {
    requestAnimationFrame(reRender3D);
    particleTime += 0.016;

    // Un solo renderer, dos pasadas: primero el fondo, después el casco encima
    renderer.autoClear = false;
    renderer.clear();
    if (bgReady) {
        bgUniforms.u_time.value += 0.01;
        bgUniforms.u_scroll.value = window.scrollY;
        renderer.render(bgScene, bgCamera);
    }
    renderer.clearDepth();
    renderer.render(scene, camera);

    if (mixer) mixer.update(0.02);
    if (casco) {
        // Flotado suave, siempre activo
        const floatY = Math.sin(Date.now() * 0.0012) * 0.08;
        casco.position.set(modelTarget.x, modelTarget.y + floatY, modelTarget.z);
        // Giro constante, solo cuando no se está arrastrando
        if (autoRotate) casco.rotation.y += 0.004;
    }

    // Partículas: la nube densa sigue al casco en cada frame
    dustAroundCasco.points.position.set(modelTarget.x, modelTarget.y, modelTarget.z);
    animateParticles(dustGeneral, particleTime, 0.4, 0.3, 0.35, 1);
    animateParticles(dustAroundCasco, particleTime, 0.5, 0.4, 0.4, 0.6);
};
reRender3D();

// --- Interacción: arrastrar con el mouse para rotar el casco ---
let isDragging = false;
let lastX = 0;
let lastY = 0;

container3D.style.pointerEvents = 'auto';
container3D.style.cursor = 'grab';

container3D.addEventListener('mousedown', (e) => {
    if (!casco) return;
    isDragging = true;
    autoRotate = false;
    lastX = e.clientX;
    lastY = e.clientY;
    container3D.style.cursor = 'grabbing';
    gsap.killTweensOf(casco.rotation);
});

window.addEventListener('mousemove', (e) => {
    if (!isDragging || !casco) return;
    const deltaX = e.clientX - lastX;
    const deltaY = e.clientY - lastY;
    casco.rotation.y += deltaX * 0.01;
    casco.rotation.x += deltaY * 0.01;
    lastX = e.clientX;
    lastY = e.clientY;
});

window.addEventListener('mouseup', () => {
    isDragging = false;
    autoRotate = true;
    container3D.style.cursor = 'grab';
});

// Posición del casco en cada tramo de la historia
let arrPositionModel = [
    {
        id: 'banner',
        position: { x: 0, y: -0.8, z: 0 },
        rotation: { x: 0, y: 1.5, z: 0 }
    },
    {
        id: 'origenes',
        position: { x: 1.2, y: -1, z: -5 },
        rotation: { x: 0.3, y: -0.5, z: 0 }
    },
    {
        id: 'lucha',
        position: { x: -1.2, y: -1, z: -5 },
        rotation: { x: 0, y: 0.6, z: 0 }
    },
    {
        id: 'legado',
        position: { x: 0, y: -1, z: 0 },
        rotation: { x: 0.2, y: -0.4, z: 0 }
    }
];

const modelMove = () => {
    const sections = document.querySelectorAll('.section');
    let currentSection;
    sections.forEach((section) => {
        const rect = section.getBoundingClientRect();
        if (rect.top <= window.innerHeight / 3) {
            currentSection = section.id;
        }
    });
    let position_active = arrPositionModel.findIndex(
        (val) => val.id == currentSection
    );
    if (position_active >= 0 && casco) {
        let new_coordinates = arrPositionModel[position_active];
        gsap.to(modelTarget, {
            x: new_coordinates.position.x,
            y: new_coordinates.position.y,
            z: new_coordinates.position.z,
            duration: 3,
            ease: 'power1.out'
        });
        gsap.to(casco.rotation, {
            x: new_coordinates.rotation.x,
            y: new_coordinates.rotation.y,
            z: new_coordinates.rotation.z,
            duration: 3,
            ease: 'power1.out'
        });
    }
};

window.addEventListener('scroll', () => {
    if (casco) {
        modelMove();
    }
});

window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    if (bgUniforms) {
        bgUniforms.u_resolution.value.x = window.innerWidth * window.devicePixelRatio;
        bgUniforms.u_resolution.value.y = window.innerHeight * window.devicePixelRatio;
    }
});

/* ------------------------------------------------------------------ *
 * Aparición lenta de decoraciones al hacer scroll (IntersectionObserver)
 * ------------------------------------------------------------------ */
const fadeElements = document.querySelectorAll('.deco-fade');

const fadeObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
        }
    });
}, {
    threshold: 0.0,
    rootMargin: '-25% 0px -25% 0px'
});

fadeElements.forEach((el) => fadeObserver.observe(el));