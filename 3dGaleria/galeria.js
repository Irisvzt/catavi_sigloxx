const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x1a1410);
        scene.fog = new THREE.Fog(0x1a1410, 5, 80);

        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(0, 1.6, 12);

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMap.enabled = true;
        document.getElementById('canvas-container').appendChild(renderer.domElement);

        scene.add(new THREE.AmbientLight(0xffffff, 0.3));

        // Lámparas del techo con textura
        const lanternTexture = new THREE.TextureLoader().load(
            'img1/linternas.jpg',
            undefined,
            undefined,
            function(error) {
                console.error('Error cargando textura de linterna:', error);
            }
        );

        for (let i = 0; i < 18; i++) {
            const light = new THREE.PointLight(0xffffcc, 1.2, 12);
            light.position.set(0, 3.8, 10 - i * 2.5);
            scene.add(light);
            
            const bulb = new THREE.Mesh(
                new THREE.SphereGeometry(0.2, 16, 16),
                new THREE.MeshStandardMaterial({ 
                    map: lanternTexture,
                    emissive: 0xffff00,
                    emissiveIntensity: 0.5,
                    roughness: 0.5
                })
            );
            bulb.position.copy(light.position);
            scene.add(bulb);
        }

        // Piso con textura de tierra
        const floorTexture = new THREE.TextureLoader().load(
            'img1/tierra.jpg',
            function(texture) {
                texture.wrapS = THREE.RepeatWrapping;
                texture.wrapT = THREE.RepeatWrapping;
                texture.repeat.set(4, 20);
            },
            undefined,
            function(error) {
                console.error('Error cargando textura de tierra:', error);
            }
        );
        const floorGeo = new THREE.PlaneGeometry(8, 80);
        const floorMat = new THREE.MeshStandardMaterial({ 
            map: floorTexture,
            roughness: 0.95 
        });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.z = -10;
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
        function createWall(x, rotY) {
            const wall = new THREE.Mesh(
                new THREE.PlaneGeometry(5, 80),
                new THREE.MeshStandardMaterial({ color: 0x3d3025, roughness: 1 })
            );
            wall.position.set(x, 2.5, -10);
            wall.rotation.y = rotY;
            scene.add(wall);
        }
        createWall(-4, Math.PI / 2);
        createWall(4, -Math.PI / 2);

        // Rieles
        const railMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.7 });
        for (let z = 15; z > -50; z -= 0.5) {
            const rail1 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.4), railMat);
            rail1.position.set(-0.9, 0.04, z);
            scene.add(rail1);
            
            const rail2 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.4), railMat);
            rail2.position.set(0.9, 0.04, z);
            scene.add(rail2);

            if (Math.abs(z % 1) < 0.5) {
                const sleeper = new THREE.Mesh(
                    new THREE.BoxGeometry(2.5, 0.15, 0.2),
                    new THREE.MeshStandardMaterial({ color: 0x3d2817 })
                );
                sleeper.position.set(0, 0.02, z);
                scene.add(sleeper);
            }
        }

        // Letrero 3D con profundidad
        const signGroup = new THREE.Group();
        
        const signBase = new THREE.Mesh(
            new THREE.BoxGeometry(4.2, 2.2, 0.3),
            new THREE.MeshStandardMaterial({ 
                color: 0x3d2817,
                roughness: 0.8,
                metalness: 0.1
            })
        );
        signBase.castShadow = true;
        signBase.receiveShadow = true;
        signGroup.add(signBase);

        const frameMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xffa500,
            roughness: 0.3,
            metalness: 0.7,
            emissive: 0xff8800,
            emissiveIntensity: 0.2
        });

        const topFrame = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.15, 0.12), frameMaterial);
        topFrame.position.set(0, 1.0, 0.15);
        signGroup.add(topFrame);

        const bottomFrame = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.15, 0.12), frameMaterial);
        bottomFrame.position.set(0, -1.0, 0.15);
        signGroup.add(bottomFrame);

        const leftFrame = new THREE.Mesh(new THREE.BoxGeometry(0.15, 2.0, 0.12), frameMaterial);
        leftFrame.position.set(-1.95, 0, 0.15);
        signGroup.add(leftFrame);

        const rightFrame = new THREE.Mesh(new THREE.BoxGeometry(0.15, 2.0, 0.12), frameMaterial);
        rightFrame.position.set(1.95, 0, 0.15);
        signGroup.add(rightFrame);

        const signBackground = new THREE.Mesh(
            new THREE.PlaneGeometry(3.8, 1.9),
            new THREE.MeshStandardMaterial({ 
                color: 0xD4A574,
                roughness: 0.7
            })
        );
        signBackground.position.z = 0.16;
        signGroup.add(signBackground);

        const signCanvas = document.createElement('canvas');
        signCanvas.width = 1024;
        signCanvas.height = 512;
        const signCtx = signCanvas.getContext('2d');
        signCtx.clearRect(0, 0, 1024, 512);
        signCtx.fillStyle = '#000000';
        signCtx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        signCtx.shadowBlur = 8;
        signCtx.shadowOffsetX = 4;
        signCtx.shadowOffsetY = 4;
        signCtx.font = 'bold 70px Arial';
        signCtx.textAlign = 'center';
        signCtx.fillText('GALERIA FOTOGRAFICA', 512, 220);
        signCtx.font = 'bold 50px Arial';
        signCtx.fillText('COOPERATIVA CATAVI SIGLO XX', 512, 340);
        
        const textMesh = new THREE.Mesh(
            new THREE.PlaneGeometry(3.7, 1.85),
            new THREE.MeshStandardMaterial({ 
                map: new THREE.CanvasTexture(signCanvas),
                transparent: true,
                roughness: 0.3
            })
        );
        textMesh.position.z = 0.25;
        textMesh.castShadow = true;
        signGroup.add(textMesh);

        const signLight1 = new THREE.SpotLight(0xffa500, 1.5, 10, Math.PI / 6);
        signLight1.position.set(0, 5, 8);
        signLight1.target = signBase;
        scene.add(signLight1);

        const signLight2 = new THREE.PointLight(0xffaa00, 0.8, 8);
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
            const frameMat = new THREE.MeshStandardMaterial({ color: 0x4d3319 });
            
            [
                [1.8, 0.12, 0.06, 0, 1.05, 0],
                [1.8, 0.12, 0.06, 0, -1.05, 0],
                [0.12, 2.1, 0.06, -0.84, 0, 0],
                [0.12, 2.1, 0.06, 0.84, 0, 0]
            ].forEach(([w, h, d, x, y, z]) => {
                const frame = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), frameMat);
                frame.position.set(x, y, z);
                frameGroup.add(frame);
            });

            textureLoader.load(
                photo.image,
                function(texture) {
                    const photoMesh = new THREE.Mesh(
                        new THREE.PlaneGeometry(1.7, 2),
                        new THREE.MeshStandardMaterial({ map: texture })
                    );
                    frameGroup.add(photoMesh);
                },
                undefined,
                function(error) {
                    console.error('Error cargando ' + photo.image + ':', error);
                    const photoMesh = new THREE.Mesh(
                        new THREE.PlaneGeometry(1.7, 2),
                        new THREE.MeshStandardMaterial({ color: 0x2a1f1a })
                    );
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

        // Minerales flotantes
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
            mineralGroup.add(new THREE.PointLight(isGold ? 0xffd700 : 0x4169e1, 0.6, 4));

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

        // Cascos flotantes
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

            const light = new THREE.PointLight(0xffff00, 0.5, 2.5);
            light.position.copy(lamp.position);
            helmetGroup.add(light);

            const xPos = Math.random() < 0.5 ? -5 - Math.random() * 3 : 5 + Math.random() * 3;
            const yPos = 1.5 + Math.random() * 2.5;
            helmetGroup.position.set(xPos, yPos, 5 - Math.random() * 28);
            helmetGroup.rotation.x = -Math.PI / 4;
            helmetGroup.userData = { floatSpeed: 0.5 + Math.random() * 0.5, initialY: yPos };
            helmets.push(helmetGroup);
            scene.add(helmetGroup);
        }

        // Piedras en el piso
        const rocks = [];
        const rockColors = [0x6b7280, 0x4b5563, 0x9ca3af, 0x374151, 0x1f2937];
        for (let i = 0; i < 150; i++) {
            let rockSize;
            const sizeRandom = Math.random();
            if (sizeRandom > 0.85) {
                rockSize = 0.25 + Math.random() * 0.25;
            } else if (sizeRandom > 0.6) {
                rockSize = 0.15 + Math.random() * 0.15;
            } else {
                rockSize = 0.08 + Math.random() * 0.12;
            }
            
            const rockGeometry = Math.random() > 0.5 
                ? new THREE.DodecahedronGeometry(rockSize, 0)
                : new THREE.IcosahedronGeometry(rockSize, 0);
            
            const rock = new THREE.Mesh(
                rockGeometry,
                new THREE.MeshStandardMaterial({ 
                    color: rockColors[Math.floor(Math.random() * rockColors.length)],
                    roughness: 0.85,
                    metalness: 0.15
                })
            );
            
            let xPos;
            if (Math.random() > 0.5) {
                xPos = -3.5 + Math.random() * 1.8;
            } else {
                xPos = 1.7 + Math.random() * 1.8;
            }
            
            rock.position.set(xPos, rockSize * 0.5, 8 - Math.random() * 40);
            rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
            rock.castShadow = true;
            rock.receiveShadow = true;
            rocks.push(rock);
            scene.add(rock);
        }

        // Partículas de polvo
        const dust = [];
        for (let i = 0; i < 250; i++) {
            const particle = new THREE.Mesh(
                new THREE.SphereGeometry(0.02, 4, 4),
                new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 })
            );
            particle.position.set(
                -10 + Math.random() * 20,
                0.3 + Math.random() * 4.5,
                10 - Math.random() * 35
            );
            particle.userData = { 
                vx: -0.003 + Math.random() * 0.006,
                vy: 0.002 + Math.random() * 0.006,
                vz: -0.003 + Math.random() * 0.006
            };
            dust.push(particle);
            scene.add(particle);
        }

        // Carga de modelo 3D GLB
        // Vigas de soporte del túnel (geometría simple, sin modelo externo — mucho más liviano)
function createSupportBeam(x, z) {
    const beamGroup = new THREE.Group();
    const woodMat = new THREE.MeshStandardMaterial({ 
        color: 0x4a3625, 
        roughness: 0.9,
        metalness: 0.05
    });

    // Poste vertical
    const post = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 4.2, 0.22),
        woodMat
    );
    post.position.set(0, 2.1, 0);
    post.castShadow = true;
    post.receiveShadow = true;
    beamGroup.add(post);

    // Viga horizontal superior (cruza hacia el centro del túnel)
    const crossBeam = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 0.2, 1.6),
        woodMat
    );
    crossBeam.position.set(0, 4.0, x > 0 ? -0.8 : 0.8);
    crossBeam.castShadow = true;
    beamGroup.add(crossBeam);

    // Pequeño refuerzo diagonal, como en las minas reales
    const brace = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 1.1, 0.14),
        woodMat
    );
    brace.position.set(0, 3.3, x > 0 ? -0.35 : 0.35);
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

        // Controles
        const keys = {};
        document.addEventListener('keydown', e => keys[e.code] = true);
        document.addEventListener('keyup', e => keys[e.code] = false);

        let mouseX = 0, mouseY = 0, isMouseDown = false;
        document.addEventListener('mousedown', () => isMouseDown = true);
        document.addEventListener('mouseup', () => isMouseDown = false);
        document.addEventListener('mousemove', e => {
            if (isMouseDown) {
                mouseX += e.movementX * 0.002;
                mouseY += e.movementY * 0.002;
                mouseY = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, mouseY));
            }
        });

        let yaw = 0, pitch = 0;
        const moveSpeed = 0.18;
        let time = 0;
        let currentNearPhoto = null;

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

            dust.forEach((d, i) => {
                d.position.x += d.userData.vx;
                d.position.y += d.userData.vy;
                d.position.z += d.userData.vz;
                
                if (d.position.y > 5) d.position.y = 0.3;
                if (d.position.x < -10 || d.position.x > 10) d.position.x = -10 + Math.random() * 20;
                if (d.position.z < -30 || d.position.z > 10) d.position.z = 10 - Math.random() * 35;
                d.material.opacity = 0.4 + Math.sin(time * 2 + i * 0.1) * 0.25;
            });

            const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
            const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
            
            if (keys['KeyW'] || keys['ArrowUp']) camera.position.addScaledVector(forward, moveSpeed);
            if (keys['KeyS'] || keys['ArrowDown']) camera.position.addScaledVector(forward, -moveSpeed);
            if (keys['KeyA'] || keys['ArrowLeft']) camera.position.addScaledVector(right, -moveSpeed);
            if (keys['KeyD'] || keys['ArrowRight']) camera.position.addScaledVector(right, moveSpeed);
            if (keys['KeyQ']) yaw += 0.04;
            if (keys['KeyE']) yaw -= 0.04;

            camera.position.x = Math.max(-3, Math.min(3, camera.position.x));
            camera.position.z = Math.max(-30, Math.min(12, camera.position.z));

            camera.rotation.order = 'YXZ';
            camera.rotation.y = yaw + mouseX;
            camera.rotation.x = pitch + mouseY;

            renderer.render(scene, camera);
        }

        animate();

        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });