window.addEventListener('load', function() {
    document.getElementById('loading').style.display = 'none';

    const helpButton = document.getElementById('help-button');
    const controlsPanel = document.querySelector('.controls');

    helpButton.addEventListener('click', () => {
        controlsPanel.style.display =
            (controlsPanel.style.display === 'none' || controlsPanel.style.display === '')
                ? 'block' : 'none';
    });

    var scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000011);
    scene.fog = new THREE.Fog(0x000011, 30, 150);

    var camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 8, 20);
    camera.rotation.y = 0;

    // OPTIMIZACION: antialias apagado (MSAA es caro, sobre todo en celulares) y
    // powerPreference "high-performance" para pedir la GPU dedicada si existe.
    var renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
    renderer.setSize(window.innerWidth, window.innerHeight);
    // OPTIMIZACION: limitar pixelRatio. En pantallas retina/celular (devicePixelRatio 3+)
    // renderizar sin este limite puede multiplicar por 9 la cantidad de pixeles a dibujar.
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    // OPTIMIZACION GRANDE: las sombras en tiempo real (shadow map) son de lo mas
    // caro que hay en three.js: obligan a un segundo render pass de toda la
    // escena (7 modelos + plataformas + piso) desde el punto de vista de la luz,
    // en cada frame. Con ~10 luces ya activas, apagarlas es la ganancia mas
    // grande de FPS disponible sin perder casi nada visualmente (el emissive de
    // los materiales ya "vende" el brillo de cada estacion).
    renderer.shadowMap.enabled = false;
    document.getElementById('canvas-container').appendChild(renderer.domElement);

    // ============================================================
    // TEXTURAS PROCEDURALES
    // Generadas por canvas en vez de colores planos: manchas, rayones y
    // variacion de tono para que las superficies no se vean uniformes/perfectas.
    // ============================================================
    function seededRandom(seed) {
        var s = seed;
        return function() {
            s = (s * 1664525 + 1013904223) % 4294967296;
            return s / 4294967296;
        };
    }

    function makeSpeckleTexture(size, baseColor, speckleColors, speckleCount, opts) {
        opts = opts || {};
        var c = document.createElement('canvas');
        c.width = c.height = size;
        var ctx = c.getContext('2d');
        ctx.fillStyle = baseColor;
        ctx.fillRect(0, 0, size, size);
        for (var i = 0; i < speckleCount; i++) {
            ctx.fillStyle = speckleColors[Math.floor(Math.random() * speckleColors.length)];
            var s = (opts.minSize || 1) + Math.random() * ((opts.maxSize || 4) - (opts.minSize || 1));
            ctx.globalAlpha = (opts.minAlpha || 0.08) + Math.random() * ((opts.maxAlpha || 0.3) - (opts.minAlpha || 0.08));
            ctx.fillRect(Math.random() * size, Math.random() * size, s, s);
        }
        ctx.globalAlpha = 1;
        if (opts.scratches) {
            ctx.strokeStyle = opts.scratchColor || 'rgba(0,0,0,0.12)';
            for (var s2 = 0; s2 < opts.scratches; s2++) {
                ctx.lineWidth = 0.5 + Math.random();
                ctx.beginPath();
                var sx = Math.random() * size, sy = Math.random() * size;
                ctx.moveTo(sx, sy);
                ctx.lineTo(sx + (Math.random() - 0.5) * size * 0.4, sy + (Math.random() - 0.5) * size * 0.4);
                ctx.stroke();
            }
        }
        if (opts.panelLines) {
            ctx.strokeStyle = opts.panelLineColor || 'rgba(0,0,0,0.25)';
            ctx.lineWidth = 1.5;
            var step = size / opts.panelLines;
            for (var p = 1; p < opts.panelLines; p++) {
                ctx.beginPath();
                ctx.moveTo(p * step, 0);
                ctx.lineTo(p * step, size);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(0, p * step);
                ctx.lineTo(size, p * step);
                ctx.stroke();
            }
        }
        var tex = new THREE.CanvasTexture(c);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        return tex;
    }

    // ============================================================
    // LUCES
    // OPTIMIZACION PRINCIPAL: la version original tenia ~64 luces activas.
    // Una pasada anterior las bajo a ~10 (1 ambiental + 1 direccional + 7 por
    // estacion + 1 de acento), pero eso seguia siendo caro: cada PointLight en
    // escena agrega su calculo de iluminacion al shader de TODOS los materiales
    // con luz (Lambert/Standard) de la escena, sin importar layers (en three.js
    // r128 los layers de luz NO filtran la iluminacion real por objeto).
    // Ahora quedan solo 3 luces: 1 ambiental, 1 direccional (sin sombra) y 1
    // PointLight de acento para el letrero. El "brillo" de cada estacion ya no
    // depende de una luz real: se logra subiendo el emissive de sus materiales
    // (que es practicamente gratis) y con los anillos/particulas, que ya son
    // MeshBasicMaterial sin necesidad de luz.
    // ============================================================
    var ambientLight = new THREE.AmbientLight(0x556688, 0.9);
    scene.add(ambientLight);

    var mainLight = new THREE.DirectionalLight(0xaabbff, 0.9);
    mainLight.position.set(10, 20, 10);
    // castShadow queda apagado junto con renderer.shadowMap.enabled arriba.
    scene.add(mainLight);

    var floorGeometry = new THREE.PlaneGeometry(100, 80);
    var floorTexture = makeSpeckleTexture(512, '#0a0a1e',
        ['#12122a', '#060612', '#1a1a35', '#00171a', '#141428'], 1100,
        { minSize: 1, maxSize: 5, minAlpha: 0.05, maxAlpha: 0.22, scratches: 60, scratchColor: 'rgba(0,255,255,0.05)' });
    floorTexture.repeat.set(16, 13);
    // OPTIMIZACION: MeshStandardMaterial (PBR) calcula una formula de iluminacion
    // mucho mas pesada por pixel que MeshLambertMaterial. Con ~10 luces en escena
    // ese costo se paga en cada fragmento de cada superficie con este material,
    // asi que se cambia a Lambert en todo lo que no necesita reflejos metalicos.
    var floorMaterial = new THREE.MeshLambertMaterial({
        map: floorTexture,
        color: 0x8f9ab0,
        emissive: 0x000033,
        emissiveIntensity: 0.25
    });
    var floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    // ============================================================
    // LINEAS DE CUADRICULA
    // OPTIMIZACION: antes eran ~26 Mesh (BoxGeometry) individuales, cada una
    // su propio draw call. Ahora es un solo LineSegments con toda la geometria
    // fusionada: 1 draw call en vez de 26.
    // ============================================================
    (function buildGrid() {
        var pts = [];
        for (var lineZ = -30; lineZ < 30; lineZ += 5) {
            pts.push(-40, 0.03, lineZ, 40, 0.03, lineZ);
        }
        for (var lineX = -35; lineX < 35; lineX += 5) {
            pts.push(lineX, 0.03, -30, lineX, 0.03, 30);
        }
        var gridGeom = new THREE.BufferGeometry();
        gridGeom.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
        var gridMat = new THREE.LineBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.3 });
        scene.add(new THREE.LineSegments(gridGeom, gridMat));
    })();

    var mountainLayers = [
        { distance: 150, height: 45, color: 0x1a0a2a, opacity: 0.3 },
        { distance: 130, height: 40, color: 0x2a1a3a, opacity: 0.4 },
        { distance: 110, height: 35, color: 0x3a2a4a, opacity: 0.5 },
        { distance: 90, height: 30, color: 0x4a3a5a, opacity: 0.6 },
        { distance: 70, height: 25, color: 0x5a4a6a, opacity: 0.7 },
        { distance: 50, height: 20, color: 0x6a5a7a, opacity: 0.8 }
    ];

    // Ruido propio por capa (semilla fija = mismo perfil de montaña en cada carga,
    // pero irregular de verdad en vez de una onda seno perfecta y repetitiva)
    mountainLayers.forEach(function(layer, layerIndex) {
        var segments = 64;
        var rnd = seededRandom(4000 + layerIndex * 97);
        var mountainVertices = [];

        // Picos y valles a saltos irregulares, no en intervalos parejos
        var jaggedOffsets = [];
        var numJags = 8 + Math.floor(rnd() * 5);
        for (var jg = 0; jg < numJags; jg++) {
            jaggedOffsets.push({ pos: rnd() * segments, amt: (rnd() - 0.5) * 0.5 });
        }

        for (var seg = 0; seg <= segments; seg++) {
            var angle = (seg / segments) * Math.PI * 2;
            var x = Math.cos(angle) * layer.distance;
            var z = Math.sin(angle) * layer.distance;

            var base = 0.4 +
                Math.sin(seg * 0.3 + layerIndex * 2) * 0.2 +
                Math.sin(seg * 0.6 + layerIndex) * 0.15 +
                Math.cos(seg * 0.16) * 0.15 +
                Math.sin(seg * 1.0) * 0.1;

            var jag = 0;
            jaggedOffsets.forEach(function(j) {
                var d = Math.abs(seg - j.pos);
                jag += j.amt * Math.max(0, 1 - d / 4);
            });

            var height = layer.height * Math.max(0.15, base + jag);
            // ligera variacion de tono por vertice, para no verse un solido de color uniforme
            var shade = 0.82 + rnd() * 0.36;

            mountainVertices.push({ x: x, z: z, height: height, shade: shade });
        }

        var geometry = new THREE.BufferGeometry();
        var positions = [];
        var colors = [];
        var baseColorObj = new THREE.Color(layer.color);

        function pushVertex(v) {
            positions.push(v.x, v.height, v.z);
            var c = baseColorObj.clone().multiplyScalar(v.shade);
            colors.push(c.r, c.g, c.b);
        }
        function pushGroundVertex(v) {
            positions.push(v.x, 0, v.z);
            var c = baseColorObj.clone().multiplyScalar(v.shade * 0.7);
            colors.push(c.r, c.g, c.b);
        }

        for (var i = 0; i < segments; i++) {
            var v1 = mountainVertices[i];
            var v2 = mountainVertices[i + 1];

            pushGroundVertex(v1);
            pushGroundVertex(v2);
            pushVertex(v1);

            pushGroundVertex(v2);
            pushVertex(v2);
            pushVertex(v1);
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geometry.computeVertexNormals();

        var material = new THREE.MeshBasicMaterial({
            vertexColors: true,
            transparent: true,
            opacity: layer.opacity,
            side: THREE.DoubleSide
        });

        scene.add(new THREE.Mesh(geometry, material));
    });

    var starsGeometry = new THREE.BufferGeometry();
    var starVertices = [];
    // OPTIMIZACION: 3000 -> 1800 estrellas. Points ya es un solo draw call,
    // pero menos vertices = menos trabajo de vertex shader y menos overdraw.
    var STAR_COUNT = 1800;
    for (var i = 0; i < STAR_COUNT; i++) {
        starVertices.push(
            (Math.random() - 0.5) * 500,
            (Math.random() - 0.5) * 500,
            (Math.random() - 0.5) * 500
        );
    }

    starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
    var starsMaterial = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.4,
        transparent: true,
        opacity: 0.8
    });
    var stars = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(stars);

    // ============================================================
    // LETRERO PRINCIPAL
    // ============================================================
    var signGroup = new THREE.Group();

    var signFrameTexture = makeSpeckleTexture(256, '#1a1a3e',
        ['#141432', '#22224a', '#0e0e28'], 300,
        { minSize: 1, maxSize: 4, minAlpha: 0.08, maxAlpha: 0.25, panelLines: 6, panelLineColor: 'rgba(0,0,0,0.3)' });
    var signFrameGeom = new THREE.BoxGeometry(35, 12, 0.5);
    var signFrameMat = new THREE.MeshLambertMaterial({
        map: signFrameTexture,
        color: 0xaab0cc,
        emissive: 0x00ffff,
        emissiveIntensity: 0.15
    });
    var signFrame = new THREE.Mesh(signFrameGeom, signFrameMat);
    signGroup.add(signFrame);

    // Marco biselado en dos capas (borde exterior mate + filete interior brillante)
    // en vez de una sola barra plana, para dar sensacion de espesor real.
    var borderOuterMat = new THREE.MeshLambertMaterial({ color: 0x0a2a30 });
    var borderInnerMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.9 });

    [
        [35, 0.55, 0.65, 0, 6, 0.03],
        [35, 0.55, 0.65, 0, -6, 0.03],
        [0.55, 12, 0.65, -17.5, 0, 0.03],
        [0.55, 12, 0.65, 17.5, 0, 0.03]
    ].forEach(function(d) {
        var bar = new THREE.Mesh(new THREE.BoxGeometry(d[0], d[1], d[2]), borderOuterMat);
        bar.position.set(d[3], d[4], d[5]);
        signGroup.add(bar);
    });

    [
        [34.6, 0.28, 0.5, 0, 6, 0.1],
        [34.6, 0.28, 0.5, 0, -6, 0.1],
        [0.28, 11.6, 0.5, -17.5, 0, 0.1],
        [0.28, 11.6, 0.5, 17.5, 0, 0.1]
    ].forEach(function(d) {
        var bar = new THREE.Mesh(new THREE.BoxGeometry(d[0], d[1], d[2]), borderInnerMat);
        bar.position.set(d[3], d[4], d[5]);
        signGroup.add(bar);
    });

    // Remaches en las esquinas del marco (detalle que un panel liso no tendria)
    var rivetMat = new THREE.MeshLambertMaterial({ color: 0x7a8aa0 });
    var rivetGeom = new THREE.SphereGeometry(0.14, 8, 8);
    [[-17, 5.6], [17, 5.6], [-17, -5.6], [17, -5.6]].forEach(function(rp) {
        var rivet = new THREE.Mesh(rivetGeom, rivetMat);
        rivet.position.set(rp[0], rp[1], 0.35);
        signGroup.add(rivet);
    });

    var signCanvas = document.createElement('canvas');
    signCanvas.width = 2048;
    signCanvas.height = 1024;
    var signCtx = signCanvas.getContext('2d');

    var gradient = signCtx.createLinearGradient(0, 0, 0, 1024);
    gradient.addColorStop(0, '#000011');
    gradient.addColorStop(0.5, '#000022');
    gradient.addColorStop(1, '#000011');
    signCtx.fillStyle = gradient;
    signCtx.fillRect(0, 0, 2048, 1024);

    // Ruido/manchas sutiles sobre el fondo, para que no se vea un degradado perfecto
    for (var sn = 0; sn < 500; sn++) {
        signCtx.fillStyle = Math.random() > 0.5 ? 'rgba(0,40,50,0.15)' : 'rgba(0,80,90,0.08)';
        var ssz = 2 + Math.random() * 8;
        signCtx.fillRect(Math.random() * 2048, Math.random() * 1024, ssz, ssz);
    }
    // Vineta hacia los bordes
    var vignette = signCtx.createRadialGradient(1024, 512, 300, 1024, 512, 1100);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.55)');
    signCtx.fillStyle = vignette;
    signCtx.fillRect(0, 0, 2048, 1024);

    signCtx.font = 'bold 150px Arial';
    signCtx.textAlign = 'center';
    signCtx.strokeStyle = '#000000';
    signCtx.lineWidth = 10;
    signCtx.strokeText('GALAXIA MINERA', 1024, 400);
    signCtx.fillStyle = '#00ffff';
    signCtx.fillText('GALAXIA MINERA', 1024, 400);

    signCtx.font = 'bold 80px Arial';
    signCtx.strokeStyle = '#000000';
    signCtx.lineWidth = 8;
    signCtx.strokeText('PROCESO DE PRODUCCION', 1024, 550);
    signCtx.fillStyle = '#00ffff';
    signCtx.fillText('PROCESO DE PRODUCCION', 1024, 550);

    signCtx.lineWidth = 6;
    signCtx.strokeStyle = '#00ffff';
    signCtx.beginPath();
    signCtx.moveTo(250, 660);
    signCtx.lineTo(1798, 660);
    signCtx.stroke();

    signCtx.lineWidth = 3;
    for (var dot = 0; dot < 15; dot++) {
        signCtx.beginPath();
        signCtx.arc(350 + dot * 90, 800, 20, 0, Math.PI * 2);
        signCtx.stroke();
        signCtx.fillStyle = '#00ffff';
        signCtx.beginPath();
        signCtx.arc(350 + dot * 90, 800, 6, 0, Math.PI * 2);
        signCtx.fill();
    }

    var signTexture = new THREE.CanvasTexture(signCanvas);
    signTexture.minFilter = THREE.LinearFilter;
    signTexture.magFilter = THREE.LinearFilter;

    var signMat = new THREE.MeshLambertMaterial({
        map: signTexture,
        emissive: 0x002233,
        emissiveIntensity: 0.2,
        transparent: true,
        opacity: 1
    });
    var signMesh = new THREE.Mesh(new THREE.PlaneGeometry(34.5, 11.5), signMat);
    signMesh.position.z = 0.3;
    signGroup.add(signMesh);

    // OPTIMIZACION: antes 6 PointLight reales para el letrero. Ahora 1 sola
    // luz de acento + esferitas emisivas (MeshBasicMaterial, no necesitan luz
    // real para "brillar", ya son unlit) para el efecto visual de bombillas.
    var signAccentLight = new THREE.PointLight(0x00ffff, 1.2, 40);
    signAccentLight.position.set(0, 0, 5);
    signGroup.add(signAccentLight);

    var bulbGeom = new THREE.SphereGeometry(0.3, 8, 8);
    var bulbMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
    var bulbMesh = new THREE.InstancedMesh(bulbGeom, bulbMat, 12);
    var bulbDummy = new THREE.Object3D();
    var bulbIdx = 0;
    for (var b = 0; b < 6; b++) {
        var bx = -14 + (b * 5.5);
        bulbDummy.position.set(bx, 6.3, 0.5);
        bulbDummy.updateMatrix();
        bulbMesh.setMatrixAt(bulbIdx++, bulbDummy.matrix);
        bulbDummy.position.set(bx, -6.3, 0.5);
        bulbDummy.updateMatrix();
        bulbMesh.setMatrixAt(bulbIdx++, bulbDummy.matrix);
    }
    signGroup.add(bulbMesh);

    signGroup.position.set(0, 10, -20);
    scene.add(signGroup);

    // ============================================================
    // ESTACIONES
    // ============================================================
    var stations = [
        { name: "1. ALIMENTACION", description: "Lleva mineral desde la tolva hasta el molino", position: { x: -15, z: 10 }, color: 0xffdd00, modelPath: "alimentacion.glb" },
        { name: "2. MOLIENDA", description: "Reduce el mineral a particulas finas para poder separarlo", position: { x: 0, z: 10 }, color: 0xff9900, modelPath: "molienda.glb" },
        { name: "3. CLASIFICACION", description: "Separa finos(que siguen adelante) de gruesos(que ingresa al molino)", position: { x: 15, z: 10 }, color: 0xccaa00, modelPath: "filtro.glb" },
        { name: "4. CONSENTRACION GAVIMETRICA", description: "Separa minerales pesados de la ganga usando su densidad", position: { x: -30, z: -5 }, color: 0xffffff, modelPath: "mesas.glb" },
        { name: "5. ESPESAMIENTO", description: "Quita agua del concentrado formando una pulpa mas espesa", position: { x: -15, z: -5 }, color: 0x00ffff, modelPath: "secadora.glb" },
        { name: "6. FILTRADO O SECADO", description: "Elimina la humedad para obtener concentrado casi seco", position: { x: 0, z: -5 }, color: 0x00ff88, modelPath: "tubo.glb" },
        { name: "7. ALMACENAMIENTO DEL CONCENTRADO", description: "Guarda el proceso el producto final listo para venta o transporte", position: { x: 15, z: -5 }, color: 0x0088ff, modelPath: "almacenamiento.glb" }
    ];

    var loader = new THREE.GLTFLoader();
    var modelsLoaded = 0;
    var totalModels = stations.length;

    function createModelParticles(station) {
        // OPTIMIZACION: 12 esferitas individuales -> 1 InstancedMesh por estacion.
        var geom = new THREE.SphereGeometry(0.08, 6, 6);
        var mat = new THREE.MeshBasicMaterial({ color: station.color, transparent: true, opacity: 0.8 });
        var inst = new THREE.InstancedMesh(geom, mat, 12);
        var dummy = new THREE.Object3D();
        var data = [];
        for (var p = 0; p < 12; p++) {
            var angle = (p / 12) * Math.PI * 2;
            data.push({ angle: angle, radius: 2.5, speed: 0.02 });
        }
        inst.userData.particles = data;
        inst.userData.dummy = dummy;
        return inst;
    }

    function loadStationModel(station) {
        loader.load(
            station.modelPath,
            function(gltf) {
                var model = gltf.scene;
                model.position.set(station.position.x, 2.5, station.position.z);
                model.scale.set(5.5, 5.5, 5.5);

                model.traverse(function(child) {
                    if (child.isMesh && child.material) {
                        // OPTIMIZACION: los materiales que trae el .glb suelen ser
                        // MeshStandardMaterial (PBR); se reemplazan por Lambert
                        // (mismo mapa/color, sin el costo de metalness/roughness
                        // por pixel) multiplicado por las ~7 estaciones cargadas.
                        var mats = Array.isArray(child.material) ? child.material : [child.material];
                        var newMats = mats.map(function(m) {
                            return new THREE.MeshLambertMaterial({
                                map: m.map || null,
                                color: m.color ? m.color.clone() : 0xffffff,
                                transparent: m.transparent,
                                opacity: m.opacity
                            });
                        });
                        child.material = Array.isArray(child.material) ? newMats : newMats[0];
                        child.material.needsUpdate = true;
                    }
                });

                model.userData = { rotationSpeed: 0.015, isModel: true, floatSpeed: 0.5, initialY: 2.5 };

                scene.add(model);
                station.model = model;

                var particles = createModelParticles(station);
                particles.position.set(station.position.x, 2.5, station.position.z);
                scene.add(particles);
                station.modelParticles = particles;

                modelsLoaded++;
                if (modelsLoaded === totalModels) {
                    console.log('Todos los modelos 3D cargados correctamente');
                }
            },
            undefined,
            function(error) {
                console.error('Error cargando modelo de ' + station.name + ':', error);

                var fallbackGeom = new THREE.OctahedronGeometry(1.5, 0);
                var fallbackMat = new THREE.MeshBasicMaterial({ color: station.color, transparent: true, opacity: 0.5, wireframe: true });
                var fallback = new THREE.Mesh(fallbackGeom, fallbackMat);
                fallback.position.set(station.position.x, 2.5, station.position.z);
                fallback.userData = { rotationSpeed: 0.02, isModel: true, floatSpeed: 0.5, initialY: 2.5 };
                scene.add(fallback);
                station.model = fallback;

                modelsLoaded++;
            }
        );
    }

    // OPTIMIZACION: geometria/material de columnas compartidos + InstancedMesh
    // para las 28 columnas (4 x 7 estaciones) y sus 28 esferas superiores en
    // vez de 56 Mesh individuales.
    var columnGeom = new THREE.CylinderGeometry(0.15, 0.15, 4, 6);
    var columnSphereGeom = new THREE.SphereGeometry(0.25, 8, 8);
    var columnDummy = new THREE.Object3D();

    stations.forEach(function(station, index) {
        var platformGeom = new THREE.CylinderGeometry(4, 4, 0.3, 24);
        // Textura de metal desgastado (manchas + rayones + lineas de paneles)
        // tenida levemente hacia el color de la estacion, en vez de un cilindro
        // de color solido perfectamente uniforme.
        var stationHex = '#' + station.color.toString(16).padStart(6, '0');
        var platformTexture = makeSpeckleTexture(256, '#1a1a3e',
            ['#22224a', '#101028', '#2a2a50', stationHex], 350,
            { minSize: 1, maxSize: 5, minAlpha: 0.05, maxAlpha: 0.2, scratches: 22, scratchColor: 'rgba(0,0,0,0.3)', panelLines: 8, panelLineColor: 'rgba(0,0,0,0.25)' });
        var platformMat = new THREE.MeshLambertMaterial({
            map: platformTexture,
            color: 0xbfc4d8,
            emissive: station.color,
            emissiveIntensity: 0.35,
            transparent: true,
            opacity: 0.92
        });
        var platform = new THREE.Mesh(platformGeom, platformMat);
        platform.position.set(station.position.x, 0.15, station.position.z);
        scene.add(platform);

        station.rings = [];
        for (var ring = 0; ring < 3; ring++) {
            var ringGeom = new THREE.TorusGeometry(3 + ring * 0.5, 0.08, 6, 24);
            var ringMat = new THREE.MeshBasicMaterial({ color: station.color, transparent: true, opacity: 0.6 - ring * 0.15 });
            var ringMesh = new THREE.Mesh(ringGeom, ringMat);
            ringMesh.position.set(station.position.x, 0.4 + ring * 0.2, station.position.z);
            ringMesh.rotation.x = Math.PI / 2;
            ringMesh.userData = { rotationSpeed: 0.01 + ring * 0.005 };
            scene.add(ringMesh);
            station.rings.push(ringMesh);
        }

        // 4 columnas por estacion, fusionadas en un InstancedMesh compartido entre estaciones
        var columnMat = new THREE.MeshLambertMaterial({
            color: 0x222244, emissive: station.color, emissiveIntensity: 0.65, transparent: true, opacity: 0.7
        });
        var columnsInst = new THREE.InstancedMesh(columnGeom, columnMat, 4);
        var spheresInst = new THREE.InstancedMesh(columnSphereGeom, new THREE.MeshBasicMaterial({ color: station.color }), 4);
        for (var col = 0; col < 4; col++) {
            var angle = (col / 4) * Math.PI * 2;
            var colX = station.position.x + Math.cos(angle) * 3.5;
            var colZ = station.position.z + Math.sin(angle) * 3.5;

            columnDummy.position.set(colX, 2.3, colZ);
            columnDummy.updateMatrix();
            columnsInst.setMatrixAt(col, columnDummy.matrix);

            columnDummy.position.set(colX, 4.5, colZ);
            columnDummy.updateMatrix();
            spheresInst.setMatrixAt(col, columnDummy.matrix);
        }
        scene.add(columnsInst);
        scene.add(spheresInst);

        loadStationModel(station);

        // OPTIMIZACION GRANDE: antes habia 1 PointLight real por estacion (7 en
        // total) ademas de la ambiental y la direccional. Cada luz real agrega
        // su calculo a TODOS los materiales Lambert/Standard de la escena en
        // cada frame (piso, plataformas, columnas, letrero, paneles, rocas...),
        // asi que 7 luces de mas es carisimo. Se quitan y el "brillo" de cada
        // estacion se sigue viendo por el emissive ya subido en platformMat y
        // columnMat, mas los anillos y particulas (que son MeshBasicMaterial,
        // no necesitan luz real porque ya brillan solos).
        createHolographicPanel(station);
    });

    function createHolographicPanel(station) {
        var pos = station.position;

        var frameGeom = new THREE.BoxGeometry(3.5, 2.5, 0.2);
        var frameMat = new THREE.MeshLambertMaterial({ color: 0x1a1a3e, emissive: station.color, emissiveIntensity: 0.35 });
        var frame = new THREE.Mesh(frameGeom, frameMat);
        frame.position.set(pos.x, 2.5, pos.z + 5.5);
        scene.add(frame);

        var panelCanvas = document.createElement('canvas');
        panelCanvas.width = 512;
        panelCanvas.height = 512;
        var ctx = panelCanvas.getContext('2d');

        var gradient = ctx.createRadialGradient(256, 256, 50, 256, 256, 256);
        gradient.addColorStop(0, '#0a0a1e');
        gradient.addColorStop(1, '#000008');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 512, 512);

        var colorHex = '#' + station.color.toString(16).padStart(6, '0');
        ctx.strokeStyle = colorHex;
        ctx.lineWidth = 8;
        ctx.strokeRect(20, 20, 472, 472);

        ctx.fillStyle = colorHex;
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';

        var titleWords = station.name.split(' ');
        var titleLines = [];
        var currentLine = '';

        for (var w = 0; w < titleWords.length; w++) {
            var testLine = currentLine + titleWords[w] + ' ';
            var metrics = ctx.measureText(testLine);

            if (metrics.width > 420 && currentLine !== '') {
                titleLines.push(currentLine.trim());
                currentLine = titleWords[w] + ' ';
            } else {
                currentLine = testLine;
            }
        }
        titleLines.push(currentLine.trim());

        var startY = 256 - ((titleLines.length - 1) * 30);
        for (var l = 0; l < titleLines.length; l++) {
            ctx.fillText(titleLines[l], 256, startY + (l * 60));
        }

        ctx.strokeStyle = colorHex;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(80, startY + (titleLines.length * 60) + 20);
        ctx.lineTo(432, startY + (titleLines.length * 60) + 20);
        ctx.stroke();

        var panelTexture = new THREE.CanvasTexture(panelCanvas);
        var panelMaterial = new THREE.MeshLambertMaterial({ map: panelTexture, emissive: station.color, emissiveIntensity: 0.25, transparent: true, opacity: 0.9 });
        var panelMesh = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 2.2), panelMaterial);
        panelMesh.position.set(pos.x, 2.5, pos.z + 5.8);
        scene.add(panelMesh);
    }

    // OPTIMIZACION: menos nebulosas y menos segmentos (16x16 -> 8x8); son esferas
    // enormes con opacidad 0.02, el detalle es imperceptible.
    var nebulaColors = [0xff6600, 0x00ff88, 0x0088ff, 0x8800ff, 0xff0088, 0x00ffff];
    nebulaColors.forEach(function(nebColor, neb) {
        var nebGeom = new THREE.SphereGeometry(15, 8, 8);
        var nebMat = new THREE.MeshBasicMaterial({ color: nebColor, transparent: true, opacity: 0.02, side: THREE.BackSide });
        var nebula = new THREE.Mesh(nebGeom, nebMat);

        var angle = (neb / nebulaColors.length) * Math.PI * 2;
        var distance = 180 + Math.random() * 50;
        nebula.position.set(Math.cos(angle) * distance, 50 + Math.random() * 30, Math.sin(angle) * distance);
        scene.add(nebula);
    });

    // ============================================================
    // PARTICULAS DE ESPACIO
    // OPTIMIZACION: 150 Mesh individuales -> 1 InstancedMesh (1 draw call).
    // Se agrupan por color usando 5 InstancedMesh (uno por color, ~30 c/u)
    // ya que InstancedMesh necesita un material/geometria compartido.
    // ============================================================
    var spColors = [0xff6600, 0x00ffff, 0xff0088, 0x00ff88, 0x8800ff];
    var spaceParticleGroups = [];
    var SP_PER_COLOR = 30;
    spColors.forEach(function(color) {
        var geom = new THREE.SphereGeometry(0.08, 5, 5);
        var mat = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.7 });
        var inst = new THREE.InstancedMesh(geom, mat, SP_PER_COLOR);
        var dummy = new THREE.Object3D();
        var data = [];
        for (var sp = 0; sp < SP_PER_COLOR; sp++) {
            var pos = new THREE.Vector3((Math.random() - 0.5) * 100, Math.random() * 15 + 1, (Math.random() - 0.5) * 60);
            var vel = new THREE.Vector3((Math.random() - 0.5) * 0.02, (Math.random() - 0.5) * 0.01, (Math.random() - 0.5) * 0.02);
            data.push({ pos: pos, vel: vel });
            dummy.position.copy(pos);
            dummy.updateMatrix();
            inst.setMatrixAt(sp, dummy.matrix);
        }
        inst.userData.data = data;
        inst.userData.dummy = dummy;
        scene.add(inst);
        spaceParticleGroups.push(inst);
    });

    // ============================================================
    // ROCAS FLOTANTES
    // OPTIMIZACION: 40 Mesh individuales -> 1 InstancedMesh compartiendo una
    // sola geometria/material (se pierde la variacion de color por roca para
    // ganar 1 solo draw call; visualmente casi imperceptible a esa distancia).
    // ============================================================
    // Dos tonos de roca (grisaceo tipo mineral / rojizo tipo oxido de la mina),
    // cada uno con su propia textura moteada, en vez de un solo gris plano.
    var rockTexGray = makeSpeckleTexture(128, '#4a4f58', ['#3a3e46', '#5c6270', '#2e3138'], 260,
        { minSize: 1, maxSize: 4, minAlpha: 0.15, maxAlpha: 0.35 });
    var rockTexRust = makeSpeckleTexture(128, '#5a4536', ['#3f2f22', '#75543c', '#2a1f16'], 260,
        { minSize: 1, maxSize: 4, minAlpha: 0.15, maxAlpha: 0.35 });

    var rockGeomA = new THREE.DodecahedronGeometry(0.9, 0);
    var rockGeomB = new THREE.IcosahedronGeometry(0.9, 0);
    var rockMatGray = new THREE.MeshLambertMaterial({ map: rockTexGray });
    var rockMatRust = new THREE.MeshLambertMaterial({ map: rockTexRust });

    var ROCK_COUNT_A = 22;
    var ROCK_COUNT_B = 18;
    var rocksInstA = new THREE.InstancedMesh(rockGeomA, rockMatGray, ROCK_COUNT_A);
    var rocksInstB = new THREE.InstancedMesh(rockGeomB, rockMatRust, ROCK_COUNT_B);
    var rockDummy = new THREE.Object3D();
    var rockData = [];

    function pickRockSpot() {
        var rockX, rockZ, tooClose, attempts = 0;
        do {
            rockX = (Math.random() - 0.5) * 90;
            rockZ = (Math.random() - 0.5) * 50;
            tooClose = false;
            for (var s = 0; s < stations.length; s++) {
                var dx = rockX - stations[s].position.x;
                var dz = rockZ - stations[s].position.z;
                if (Math.sqrt(dx * dx + dz * dz) < 8) { tooClose = true; break; }
            }
            attempts++;
        } while (tooClose && attempts < 20);
        return { x: rockX, z: rockZ };
    }

    // Distribucion de tamanos con pocas rocas grandes y muchas pequenas
    // (en vez de un Math.random() uniforme, que se ve mas "artificial")
    function weightedRockScale() {
        var r = Math.random();
        if (r > 0.88) return 1.1 + Math.random() * 0.7;
        if (r > 0.55) return 0.6 + Math.random() * 0.5;
        return 0.25 + Math.random() * 0.35;
    }

    function fillRocks(inst, count) {
        for (var rock = 0; rock < count; rock++) {
            var spot = pickRockSpot();
            var scale = weightedRockScale();
            var entry = {
                pos: new THREE.Vector3(spot.x, Math.random() * 12 + 2, spot.z),
                rot: new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI),
                scale: scale,
                vel: new THREE.Vector3((Math.random() - 0.5) * 0.015, (Math.random() - 0.5) * 0.008, (Math.random() - 0.5) * 0.015),
                rotVel: new THREE.Vector3((Math.random() - 0.5) * 0.01, (Math.random() - 0.5) * 0.01, (Math.random() - 0.5) * 0.01)
            };
            rockData.push({ inst: inst, index: rock, data: entry });

            rockDummy.position.copy(entry.pos);
            rockDummy.rotation.copy(entry.rot);
            rockDummy.scale.setScalar(entry.scale);
            rockDummy.updateMatrix();
            inst.setMatrixAt(rock, rockDummy.matrix);
        }
    }

    fillRocks(rocksInstA, ROCK_COUNT_A);
    fillRocks(rocksInstB, ROCK_COUNT_B);
    scene.add(rocksInstA);
    scene.add(rocksInstB);

    // ============================================================
    // CONTROLES
    // ============================================================
    var moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
    var rotateLeft = false, rotateRight = false;
    var currentStation = 0;

    document.addEventListener('keydown', function(e) {
        if (e.code === 'KeyW' || e.code === 'ArrowUp') moveForward = true;
        if (e.code === 'KeyS' || e.code === 'ArrowDown') moveBackward = true;
        if (e.code === 'KeyA' || e.code === 'ArrowLeft') moveLeft = true;
        if (e.code === 'KeyD' || e.code === 'ArrowRight') moveRight = true;
        if (e.code === 'KeyQ') rotateLeft = true;
        if (e.code === 'KeyE') rotateRight = true;

        if (e.code === 'Space') {
            currentStation = (currentStation + 1) % stations.length;
            var station = stations[currentStation];
            camera.position.x = station.position.x;
            camera.position.y = 8;
            camera.position.z = station.position.z + 12;

            var info = document.getElementById('station-info');
            document.getElementById('station-title').textContent = station.name;
            document.getElementById('station-description').textContent = station.description;
            info.style.display = 'block';
        }
    });

    document.addEventListener('keyup', function(e) {
        if (e.code === 'KeyW' || e.code === 'ArrowUp') moveForward = false;
        if (e.code === 'KeyS' || e.code === 'ArrowDown') moveBackward = false;
        if (e.code === 'KeyA' || e.code === 'ArrowLeft') moveLeft = false;
        if (e.code === 'KeyD' || e.code === 'ArrowRight') moveRight = false;
        if (e.code === 'KeyQ') rotateLeft = false;
        if (e.code === 'KeyE') rotateRight = false;
    });

    // Mira alrededor moviendo el mouse (movimiento relativo, sin mantener clic).
    // Se ignora mientras el cursor esta sobre botones/paneles de la interfaz,
    // para que no gire la camara al pasar sobre "AYUDA" o el boton de volver.
    var rotateSpeed = 0.0022;
    document.addEventListener('mousemove', function(e) {
        if (e.target.closest && e.target.closest('#help-button, #back-button, .controls, .station-info')) {
            return;
        }
        yaw -= e.movementX * rotateSpeed;
        pitch -= e.movementY * rotateSpeed;
        pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch));
    });
    document.addEventListener('wheel', function(e) {
        e.preventDefault();
        var fov = camera.fov + e.deltaY * 0.05;
        camera.fov = Math.max(30, Math.min(100, fov));
        camera.updateProjectionMatrix();
    }, { passive: false });

    var velocity = new THREE.Vector3();
    var yaw = 0;
    var pitch = -Math.PI / 8;
    var moveSpeed = 0.25;
    var time = 0;

    function animate() {
        requestAnimationFrame(animate);
        time += 0.01;

        stars.rotation.y += 0.0002;

        stations.forEach(function(station) {
            station.rings.forEach(function(ring) { ring.rotation.z += ring.userData.rotationSpeed; });

            if (station.model) {
                station.model.rotation.y += station.model.userData.rotationSpeed;
                station.model.position.y = station.model.userData.initialY + Math.sin(time * station.model.userData.floatSpeed) * 0.3;
            }

            if (station.modelParticles) {
                var inst = station.modelParticles;
                inst.rotation.y += 0.015;
                var dummy = inst.userData.dummy;
                inst.userData.particles.forEach(function(p, i) {
                    p.angle += p.speed;
                    dummy.position.set(Math.cos(p.angle) * p.radius, Math.sin(p.angle * 2) * 0.5, Math.sin(p.angle) * p.radius);
                    dummy.updateMatrix();
                    inst.setMatrixAt(i, dummy.matrix);
                });
                inst.instanceMatrix.needsUpdate = true;
            }
        });

        spaceParticleGroups.forEach(function(inst) {
            var dummy = inst.userData.dummy;
            inst.userData.data.forEach(function(p, i) {
                p.pos.add(p.vel);
                if (Math.abs(p.pos.x) > 50 || p.pos.y < 0 || p.pos.y > 20 || Math.abs(p.pos.z) > 30) {
                    p.pos.set((Math.random() - 0.5) * 100, Math.random() * 15 + 1, (Math.random() - 0.5) * 60);
                }
                dummy.position.copy(p.pos);
                dummy.updateMatrix();
                inst.setMatrixAt(i, dummy.matrix);
            });
            inst.instanceMatrix.needsUpdate = true;
        });

        var rDummy = rockDummy;
        rockData.forEach(function(entry) {
            var r = entry.data;
            r.pos.add(r.vel);
            if (Math.abs(r.pos.x) > 45 || r.pos.y < 1 || r.pos.y > 15 || Math.abs(r.pos.z) > 25) {
                r.pos.set((Math.random() - 0.5) * 90, Math.random() * 12 + 2, (Math.random() - 0.5) * 50);
            }
            r.rot.x += r.rotVel.x;
            r.rot.y += r.rotVel.y;
            r.rot.z += r.rotVel.z;

            rDummy.position.copy(r.pos);
            rDummy.rotation.copy(r.rot);
            rDummy.scale.setScalar(r.scale);
            rDummy.updateMatrix();
            entry.inst.setMatrixAt(entry.index, rDummy.matrix);
        });
        rocksInstA.instanceMatrix.needsUpdate = true;
        rocksInstB.instanceMatrix.needsUpdate = true;

        var forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
        var right = new THREE.Vector3(-Math.sin(yaw + Math.PI / 2), 0, -Math.cos(yaw + Math.PI / 2));

        velocity.set(0, 0, 0);
        if (moveForward) velocity.add(forward.clone().multiplyScalar(moveSpeed));
        if (moveBackward) velocity.add(forward.clone().multiplyScalar(-moveSpeed));
        if (moveLeft) velocity.add(right.clone().multiplyScalar(moveSpeed));
        if (moveRight) velocity.add(right.clone().multiplyScalar(-moveSpeed));

        camera.position.x += velocity.x;
        camera.position.z += velocity.z;
        camera.position.x = Math.max(-45, Math.min(45, camera.position.x));
        camera.position.z = Math.max(-25, Math.min(30, camera.position.z));

        if (rotateLeft) yaw += 0.04;
        if (rotateRight) yaw -= 0.04;

        camera.rotation.order = 'YXZ';
        camera.rotation.y = yaw;
        camera.rotation.x = pitch;

        renderer.render(scene, camera);
    }

    animate();

    window.addEventListener('resize', function() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
});