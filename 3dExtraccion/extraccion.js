 window.addEventListener('load', function() {
            document.getElementById('loading').style.display = 'none';
            
            const helpButton = document.getElementById('help-button');
            const controlsPanel = document.querySelector('.controls');
            
            helpButton.addEventListener('click', () => {
                if (controlsPanel.style.display === 'none' || controlsPanel.style.display === '') {
                    controlsPanel.style.display = 'block';
                } else {
                    controlsPanel.style.display = 'none';
                }
            });
            
            var scene = new THREE.Scene();
            scene.background = new THREE.Color(0x000011);
            scene.fog = new THREE.Fog(0x000011, 30, 150);

            var camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
            camera.position.set(0, 8, 20);
            camera.rotation.y = 0;
            camera.layers.enable(0);
            camera.layers.enable(1);

            var renderer = new THREE.WebGLRenderer({ antialias: true });
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.shadowMap.enabled = true;
            renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            document.getElementById('canvas-container').appendChild(renderer.domElement);

            var ambientLight = new THREE.AmbientLight(0x334466, 0.5);
            ambientLight.layers.enable(0);
            ambientLight.layers.enable(1);
            scene.add(ambientLight);
            
            // Luz ambiental adicional SOLO para modelos
            var modelAmbientLight = new THREE.AmbientLight(0xffffff, 0.8);
            modelAmbientLight.layers.set(1);
            scene.add(modelAmbientLight);

            var mainLight = new THREE.DirectionalLight(0x8899ff, 0.6);
            mainLight.position.set(10, 20, 10);
            mainLight.castShadow = true;
            mainLight.layers.enable(0);
            mainLight.layers.enable(1);
            scene.add(mainLight);
            
            // Luz direccional adicional SOLO para modelos
            var modelMainLight = new THREE.DirectionalLight(0xffffff, 0.8);
            modelMainLight.position.set(-10, 15, 5);
            modelMainLight.layers.set(1);
            scene.add(modelMainLight);

            var floorGeometry = new THREE.PlaneGeometry(100, 80);
            var floorMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x0a0a1e,
                roughness: 0.3,
                metalness: 0.7,
                emissive: 0x000033,
                emissiveIntensity: 0.3
            });
            var floor = new THREE.Mesh(floorGeometry, floorMaterial);
            floor.rotation.x = -Math.PI / 2;
            floor.receiveShadow = true;
            scene.add(floor);

            for (var lineZ = -30; lineZ < 30; lineZ += 5) {
                var lineGeom = new THREE.BoxGeometry(80, 0.05, 0.2);
                var lineMat = new THREE.MeshBasicMaterial({ 
                    color: 0x00ffff,
                    transparent: true,
                    opacity: 0.3
                });
                var line = new THREE.Mesh(lineGeom, lineMat);
                line.position.set(0, 0.03, lineZ);
                scene.add(line);
            }

            for (var lineX = -35; lineX < 35; lineX += 5) {
                var lineGeom = new THREE.BoxGeometry(0.2, 0.05, 60);
                var lineMat = new THREE.MeshBasicMaterial({ 
                    color: 0x00ffff,
                    transparent: true,
                    opacity: 0.3
                });
                var line = new THREE.Mesh(lineGeom, lineMat);
                line.position.set(lineX, 0.03, 0);
                scene.add(line);
            }

            var mountainLayers = [
                { distance: 150, height: 45, color: 0x1a0a2a, opacity: 0.3 },
                { distance: 130, height: 40, color: 0x2a1a3a, opacity: 0.4 },
                { distance: 110, height: 35, color: 0x3a2a4a, opacity: 0.5 },
                { distance: 90, height: 30, color: 0x4a3a5a, opacity: 0.6 },
                { distance: 70, height: 25, color: 0x5a4a6a, opacity: 0.7 },
                { distance: 50, height: 20, color: 0x6a5a7a, opacity: 0.8 }
            ];

            mountainLayers.forEach(function(layer, layerIndex) {
                var segments = 128;
                var mountainVertices = [];
                
                for (var seg = 0; seg <= segments; seg++) {
                    var angle = (seg / segments) * Math.PI * 2;
                    var x = Math.cos(angle) * layer.distance;
                    var z = Math.sin(angle) * layer.distance;
                    
                    var height = layer.height * (
                        0.4 + 
                        Math.sin(seg * 0.15 + layerIndex * 2) * 0.2 +
                        Math.sin(seg * 0.3 + layerIndex) * 0.15 +
                        Math.cos(seg * 0.08) * 0.15 +
                        Math.sin(seg * 0.5) * 0.1
                    );
                    
                    mountainVertices.push({ x: x, z: z, height: height });
                }
                
                var geometry = new THREE.BufferGeometry();
                var positions = [];
                
                for (var i = 0; i < segments; i++) {
                    var v1 = mountainVertices[i];
                    var v2 = mountainVertices[i + 1];
                    
                    positions.push(v1.x, 0, v1.z);
                    positions.push(v2.x, 0, v2.z);
                    positions.push(v1.x, v1.height, v1.z);
                    
                    positions.push(v2.x, 0, v2.z);
                    positions.push(v2.x, v2.height, v2.z);
                    positions.push(v1.x, v1.height, v1.z);
                }
                
                geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
                geometry.computeVertexNormals();
                
                var material = new THREE.MeshBasicMaterial({ 
                    color: layer.color,
                    transparent: true,
                    opacity: layer.opacity,
                    side: THREE.DoubleSide
                });
                
                var mountainRing = new THREE.Mesh(geometry, material);
                scene.add(mountainRing);
            });

            var starsGeometry = new THREE.BufferGeometry();
            var starVertices = [];
            
            for (var i = 0; i < 3000; i++) {
                var x = (Math.random() - 0.5) * 500;
                var y = (Math.random() - 0.5) * 500;
                var z = (Math.random() - 0.5) * 500;
                starVertices.push(x, y, z);
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

            var signGroup = new THREE.Group();
            
            var signFrameGeom = new THREE.BoxGeometry(35, 12, 0.5);
            var signFrameMat = new THREE.MeshStandardMaterial({ 
                color: 0x1a1a3e,
                emissive: 0x00ffff,
                emissiveIntensity: 0.3,
                metalness: 0.9,
                roughness: 0.2
            });
            var signFrame = new THREE.Mesh(signFrameGeom, signFrameMat);
            signGroup.add(signFrame);

            var borderMat = new THREE.MeshBasicMaterial({ 
                color: 0x00ffff,
                transparent: true,
                opacity: 0.9
            });

            var topBorder = new THREE.Mesh(new THREE.BoxGeometry(35, 0.5, 0.6), borderMat);
            topBorder.position.set(0, 6, 0.05);
            signGroup.add(topBorder);

            var bottomBorder = new THREE.Mesh(new THREE.BoxGeometry(35, 0.5, 0.6), borderMat);
            bottomBorder.position.set(0, -6, 0.05);
            signGroup.add(bottomBorder);

            var leftBorder = new THREE.Mesh(new THREE.BoxGeometry(0.5, 12, 0.6), borderMat);
            leftBorder.position.set(-17.5, 0, 0.05);
            signGroup.add(leftBorder);

            var rightBorder = new THREE.Mesh(new THREE.BoxGeometry(0.5, 12, 0.6), borderMat);
            rightBorder.position.set(17.5, 0, 0.05);
            signGroup.add(rightBorder);

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
            
            signCtx.font = 'bold 150px Arial';
            signCtx.textAlign = 'center';
            signCtx.strokeStyle = '#000000';
            signCtx.lineWidth = 10;
            signCtx.strokeText('GALAXIA MINERA', 1024, 400);
            signCtx.fillStyle = '#00ffff';
            signCtx.shadowBlur = 0;
            signCtx.fillText('GALAXIA MINERA', 1024, 400);
            
            signCtx.font = 'bold 80px Arial';
            signCtx.strokeStyle = '#000000';
            signCtx.lineWidth = 8;
            signCtx.strokeText('PROCESO DE PRODUCCION', 1024, 550);
            signCtx.fillStyle = '#00ffff';
            signCtx.fillText('PROCESO DE PRODUCCION', 1024, 550);
            
            signCtx.shadowBlur = 0;
            signCtx.lineWidth = 6;
            signCtx.strokeStyle = '#00ffff';
            signCtx.beginPath();
            signCtx.moveTo(250, 660);
            signCtx.lineTo(1798, 660);
            signCtx.stroke();
            
            signCtx.lineWidth = 3;
            signCtx.strokeStyle = '#00ffff';
            for (var i = 0; i < 15; i++) {
                signCtx.beginPath();
                signCtx.arc(350 + i * 90, 800, 20, 0, Math.PI * 2);
                signCtx.stroke();
                signCtx.fillStyle = '#00ffff';
                signCtx.beginPath();
                signCtx.arc(350 + i * 90, 800, 6, 0, Math.PI * 2);
                signCtx.fill();
            }
            
            var signTexture = new THREE.CanvasTexture(signCanvas);
            signTexture.minFilter = THREE.LinearFilter;
            signTexture.magFilter = THREE.LinearFilter;
            
            var signMat = new THREE.MeshStandardMaterial({ 
                map: signTexture,
                emissive: 0x002233,
                emissiveIntensity: 0.2,
                transparent: true,
                opacity: 1
            });
            var signMesh = new THREE.Mesh(new THREE.PlaneGeometry(34.5, 11.5), signMat);
            signMesh.position.z = 0.3;
            signGroup.add(signMesh);

            for (var light = 0; light < 6; light++) {
                var signLight = new THREE.PointLight(0x00ffff, 1.0, 20);
                var xPos = -14 + (light * 5.5);
                signLight.position.set(xPos, 0, 2);
                signGroup.add(signLight);

                var lightSphere = new THREE.Mesh(
                    new THREE.SphereGeometry(0.3, 16, 16),
                    new THREE.MeshBasicMaterial({ color: 0x00ffff })
                );
                lightSphere.position.set(xPos, 6.3, 0.5);
                signGroup.add(lightSphere);

                var lightSphere2 = new THREE.Mesh(
                    new THREE.SphereGeometry(0.3, 16, 16),
                    new THREE.MeshBasicMaterial({ color: 0x00ffff })
                );
                lightSphere2.position.set(xPos, -6.3, 0.5);
                signGroup.add(lightSphere2);
            }

            signGroup.position.set(0, 10, -20);
            scene.add(signGroup);

            var stations = [
                {
                    name: "1. ALIMENTACION",
                    description: "Lleva mineral desde la tolva hasta el molino",
                    position: { x: -15, z: 10 },
                    color: 0xffdd00,
                    modelPath: "alimentacion.glb"
                },
                {
                    name: "2. MOLIENDA",
                    description: "Reduce el mineral a particulas finas para poder separarlo",
                    position: { x: 0, z: 10 },
                    color: 0xff9900,
                    modelPath: "molienda.glb"
                },
                {
                    name: "3. CLASIFICACION",
                    description: "Separa finos(que siguen adelante) de gruesos(que ingresa al molino)",
                    position: { x: 15, z: 10 },
                    color: 0xccaa00,
                    modelPath: "filtro.glb"
                },
                {
                    name: "4. CONSENTRACION GAVIMETRICA",
                    description: "Separa minerales pesados de la ganga usando su densidad",
                    position: { x: -30, z: -5 },
                    color: 0xffffff,
                    modelPath: "mesas.glb"
                },
                {
                    name: "5. ESPESAMIENTO",
                    description: "Quita agua del concentrado formando una pulpa mas espesa",
                    position: { x: -15, z: -5 },
                    color: 0x00ffff,
                    modelPath: "secadora.glb"
                },
                {
                    name: "6. FILTRADO O SECADO",
                    description: "Elimina la humedad para obtener concentrado casi seco",
                    position: { x: 0, z: -5 },
                    color: 0x00ff88,
                    modelPath: "tubo.glb"
                },
                {
                    name: "7. ALMACENAMIENTO DEL CONCENTRADO",
                    description: "Guarda el proceso el producto final listo para venta o transporte",
                    position: { x: 15, z: -5 },
                    color: 0x0088ff,
                    modelPath: "almacenamiento.glb"
                }
            ];

            var loader = new THREE.GLTFLoader();
            var modelsLoaded = 0;
            var totalModels = stations.length;

            function createModelParticles(station) {
                var particleGroup = new THREE.Group();
                for (var p = 0; p < 12; p++) {
                    var particleGeom = new THREE.SphereGeometry(0.08, 8, 8);
                    var particleMat = new THREE.MeshBasicMaterial({ 
                        color: station.color,
                        transparent: true,
                        opacity: 0.8
                    });
                    var particle = new THREE.Mesh(particleGeom, particleMat);
                    
                    var angle = (p / 12) * Math.PI * 2;
                    var radius = 2.5;
                    particle.position.set(
                        Math.cos(angle) * radius,
                        Math.sin(angle * 2) * 0.5,
                        Math.sin(angle) * radius
                    );
                    
                    particle.userData = {
                        angle: angle,
                        radius: radius,
                        speed: 0.02,
                        isModelParticle: true
                    };
                    
                    particleGroup.add(particle);
                }
                return particleGroup;
            }

            function loadStationModel(station, index) {
                loader.load(
                    station.modelPath,
                    function(gltf) {
                        var model = gltf.scene;
                        model.position.set(station.position.x, 2.5, station.position.z);
                        model.scale.set(5.5, 5.5, 5.5);
                        
                        model.traverse(function(child) {
                            if (child.isMesh && child.material) {
                                child.castShadow = true;
                                child.receiveShadow = true;
                                
                                // Hacer que el modelo solo reciba luz de las luces principales
                                child.layers.set(1);
                                
                                // Preservar el material original completamente
                                if (child.material.emissive) {
                                    child.material.emissive.setHex(0x000000);
                                    child.material.emissiveIntensity = 0;
                                }
                                
                                child.material.needsUpdate = true;
                            }
                        });
                        
                        model.userData = {
                            rotationSpeed: 0.015,
                            isModel: true,
                            floatSpeed: 0.5,
                            initialY: 2.5
                        };
                        
                        scene.add(model);
                        station.model = model;
                        
                        var particles = createModelParticles(station);
                        particles.position.set(station.position.x, 2.5, station.position.z);
                        scene.add(particles);
                        station.modelParticles = particles;
                        
                        modelsLoaded++;
                        console.log('Modelo cargado: ' + station.name + ' (' + modelsLoaded + '/' + totalModels + ')');
                        
                        if (modelsLoaded === totalModels) {
                            console.log('Todos los modelos 3D cargados correctamente');
                        }
                    },
                    function(xhr) {
                        console.log(station.name + ': ' + (xhr.loaded / xhr.total * 100) + '% cargado');
                    },
                    function(error) {
                        console.error('Error cargando modelo de ' + station.name + ':', error);
                        
                        var fallbackGeom = new THREE.OctahedronGeometry(1.5, 0);
                        var fallbackMat = new THREE.MeshBasicMaterial({ 
                            color: station.color,
                            transparent: true,
                            opacity: 0.5,
                            wireframe: true
                        });
                        var fallback = new THREE.Mesh(fallbackGeom, fallbackMat);
                        fallback.position.set(station.position.x, 2.5, station.position.z);
                        fallback.userData = {
                            rotationSpeed: 0.02,
                            isModel: true,
                            floatSpeed: 0.5,
                            initialY: 2.5
                        };
                        scene.add(fallback);
                        station.model = fallback;
                        
                        modelsLoaded++;
                    }
                );
            }

            stations.forEach(function(station, index) {
                var platformGeom = new THREE.CylinderGeometry(4, 4, 0.3, 32);
                var platformMat = new THREE.MeshStandardMaterial({ 
                    color: 0x1a1a3e,
                    emissive: station.color,
                    emissiveIntensity: 0.4,
                    metalness: 0.8,
                    roughness: 0.2,
                    transparent: true,
                    opacity: 0.9
                });
                var platform = new THREE.Mesh(platformGeom, platformMat);
                platform.position.set(station.position.x, 0.15, station.position.z);
                platform.castShadow = true;
                scene.add(platform);

                for (var ring = 0; ring < 3; ring++) {
                    var ringGeom = new THREE.TorusGeometry(3 + ring * 0.5, 0.08, 8, 32);
                    var ringMat = new THREE.MeshBasicMaterial({ 
                        color: station.color,
                        transparent: true,
                        opacity: 0.6 - ring * 0.15
                    });
                    var ringMesh = new THREE.Mesh(ringGeom, ringMat);
                    ringMesh.position.set(station.position.x, 0.4 + ring * 0.2, station.position.z);
                    ringMesh.rotation.x = Math.PI / 2;
                    ringMesh.userData = {
                        rotationSpeed: 0.01 + ring * 0.005,
                        isRing: true
                    };
                    scene.add(ringMesh);
                    station.rings = station.rings || [];
                    station.rings.push(ringMesh);
                }

                for (var col = 0; col < 4; col++) {
                    var angle = (col / 4) * Math.PI * 2;
                    var colX = station.position.x + Math.cos(angle) * 3.5;
                    var colZ = station.position.z + Math.sin(angle) * 3.5;
                    
                    var columnGeom = new THREE.CylinderGeometry(0.15, 0.15, 4, 8);
                    var columnMat = new THREE.MeshStandardMaterial({ 
                        color: 0x222244,
                        emissive: station.color,
                        emissiveIntensity: 0.5,
                        metalness: 0.9,
                        transparent: true,
                        opacity: 0.7
                    });
                    var column = new THREE.Mesh(columnGeom, columnMat);
                    column.position.set(colX, 2.3, colZ);
                    scene.add(column);

                    var topLight = new THREE.PointLight(station.color, 0.8, 8);
                    topLight.position.set(colX, 4.5, colZ);
                    topLight.layers.set(0);
                    scene.add(topLight);

                    var topSphere = new THREE.Mesh(
                        new THREE.SphereGeometry(0.25, 16, 16),
                        new THREE.MeshBasicMaterial({ color: station.color })
                    );
                    topSphere.position.set(colX, 4.5, colZ);
                    scene.add(topSphere);
                }

                loadStationModel(station, index);

                var stationLight = new THREE.PointLight(station.color, 1.5, 15);
                stationLight.position.set(station.position.x, 5, station.position.z);
                stationLight.layers.set(0);
                scene.add(stationLight);
                
                // Luz blanca SOLO para iluminar el modelo
                var modelLight1 = new THREE.PointLight(0xffffff, 2, 20);
                modelLight1.position.set(station.position.x, 8, station.position.z);
                modelLight1.layers.set(1);
                scene.add(modelLight1);
                
                var modelLight2 = new THREE.PointLight(0xffffff, 1.5, 15);
                modelLight2.position.set(station.position.x + 5, 4, station.position.z + 5);
                modelLight2.layers.set(1);
                scene.add(modelLight2);
                
                var modelLight3 = new THREE.PointLight(0xffffff, 1.5, 15);
                modelLight3.position.set(station.position.x - 5, 4, station.position.z - 5);
                modelLight3.layers.set(1);
                scene.add(modelLight3);

                createHolographicPanel(station);
            });

            function createHolographicPanel(station) {
                var pos = station.position;
                
                var frameGeom = new THREE.BoxGeometry(3.5, 2.5, 0.2);
                var frameMat = new THREE.MeshStandardMaterial({ 
                    color: 0x1a1a3e,
                    emissive: station.color,
                    emissiveIntensity: 0.3,
                    metalness: 0.9
                });
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
                
                ctx.strokeStyle = '#' + station.color.toString(16).padStart(6, '0');
                ctx.lineWidth = 8;
                ctx.strokeRect(20, 20, 472, 472);
                
                ctx.fillStyle = '#' + station.color.toString(16).padStart(6, '0');
                ctx.font = 'bold 48px Arial';
                ctx.textAlign = 'center';
                
                // Dividir el título en múltiples líneas si es muy largo
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
                
                // Centrar verticalmente las líneas
                var startY = 256 - ((titleLines.length - 1) * 30);
                for (var l = 0; l < titleLines.length; l++) {
                    ctx.fillText(titleLines[l], 256, startY + (l * 60));
                }
                
                ctx.strokeStyle = '#' + station.color.toString(16).padStart(6, '0');
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(80, startY + (titleLines.length * 60) + 20);
                ctx.lineTo(432, startY + (titleLines.length * 60) + 20);
                ctx.stroke();
                
                var panelTexture = new THREE.CanvasTexture(panelCanvas);
                var panelMaterial = new THREE.MeshStandardMaterial({ 
                    map: panelTexture,
                    emissive: station.color,
                    emissiveIntensity: 0.2,
                    transparent: true,
                    opacity: 0.9
                });
                var panelMesh = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 2.2), panelMaterial);
                panelMesh.position.set(pos.x, 2.5, pos.z + 5.8);
                scene.add(panelMesh);
            }

            for (var neb = 0; neb < 8; neb++) {
                var nebGeom = new THREE.SphereGeometry(15, 16, 16);
                var nebColor = [0xff6600, 0x00ff88, 0x0088ff, 0x8800ff, 0xff0088, 0x00ffff, 0xffdd00, 0xff9900][neb];
                var nebMat = new THREE.MeshBasicMaterial({ 
                    color: nebColor,
                    transparent: true,
                    opacity: 0.02,
                    side: THREE.BackSide
                });
                var nebula = new THREE.Mesh(nebGeom, nebMat);
                
                var angle = (neb / 8) * Math.PI * 2;
                var distance = 180 + Math.random() * 50;
                nebula.position.set(
                    Math.cos(angle) * distance,
                    50 + Math.random() * 30,
                    Math.sin(angle) * distance
                );
                scene.add(nebula);
            }

            var spaceParticles = [];
            for (var sp = 0; sp < 150; sp++) {
                var spGeom = new THREE.SphereGeometry(0.08, 6, 6);
                var spColor = [0xff6600, 0x00ffff, 0xff0088, 0x00ff88, 0x8800ff][Math.floor(Math.random() * 5)];
                var spMat = new THREE.MeshBasicMaterial({ 
                    color: spColor,
                    transparent: true,
                    opacity: 0.7
                });
                var spParticle = new THREE.Mesh(spGeom, spMat);
                
                spParticle.position.set(
                    (Math.random() - 0.5) * 100,
                    Math.random() * 15 + 1,
                    (Math.random() - 0.5) * 60
                );
                
                spParticle.userData.velocity = new THREE.Vector3(
                    (Math.random() - 0.5) * 0.02,
                    (Math.random() - 0.5) * 0.01,
                    (Math.random() - 0.5) * 0.02
                );
                
                spaceParticles.push(spParticle);
                scene.add(spParticle);
            }

            // Agregar piedras flotantes de diferentes tamaños
            var floatingRocks = [];
            for (var rock = 0; rock < 40; rock++) {
                var rockSize = Math.random() * 1.5 + 0.3;
                var rockGeom = new THREE.DodecahedronGeometry(rockSize, 0);
                var rockColor = [0x4a4a4a, 0x5a5a5a, 0x6a6a6a, 0x3a3a3a, 0x7a6a5a][Math.floor(Math.random() * 5)];
                var rockMat = new THREE.MeshStandardMaterial({ 
                    color: rockColor,
                    roughness: 0.9,
                    metalness: 0.1
                });
                var rockMesh = new THREE.Mesh(rockGeom, rockMat);
                
                // Posicionar piedras fuera del área de las estaciones
                var rockX, rockZ;
                do {
                    rockX = (Math.random() - 0.5) * 90;
                    rockZ = (Math.random() - 0.5) * 50;
                    
                    // Verificar que no esté cerca de ninguna estación
                    var tooClose = false;
                    for (var s = 0; s < stations.length; s++) {
                        var dx = rockX - stations[s].position.x;
                        var dz = rockZ - stations[s].position.z;
                        var distance = Math.sqrt(dx * dx + dz * dz);
                        if (distance < 8) {
                            tooClose = true;
                            break;
                        }
                    }
                } while (tooClose);
                
                rockMesh.position.set(rockX, Math.random() * 12 + 2, rockZ);
                
                rockMesh.rotation.set(
                    Math.random() * Math.PI,
                    Math.random() * Math.PI,
                    Math.random() * Math.PI
                );
                
                rockMesh.castShadow = true;
                
                rockMesh.userData.velocity = new THREE.Vector3(
                    (Math.random() - 0.5) * 0.015,
                    (Math.random() - 0.5) * 0.008,
                    (Math.random() - 0.5) * 0.015
                );
                
                rockMesh.userData.rotationVelocity = new THREE.Vector3(
                    (Math.random() - 0.5) * 0.01,
                    (Math.random() - 0.5) * 0.01,
                    (Math.random() - 0.5) * 0.01
                );
                
                floatingRocks.push(rockMesh);
                scene.add(rockMesh);
            }

            var moveForward = false;
            var moveBackward = false;
            var moveLeft = false;
            var moveRight = false;
            var rotateLeft = false;
            var rotateRight = false;
            var mouseX = 0;
            var mouseY = 0;
            var isMouseDown = false;
            var lastMouseX = 0;
            var lastMouseY = 0;
            var currentStation = 0;

            var onKeyDown = function(e) {
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
            };

            var onKeyUp = function(e) {
                if (e.code === 'KeyW' || e.code === 'ArrowUp') moveForward = false;
                if (e.code === 'KeyS' || e.code === 'ArrowDown') moveBackward = false;
                if (e.code === 'KeyA' || e.code === 'ArrowLeft') moveLeft = false;
                if (e.code === 'KeyD' || e.code === 'ArrowRight') moveRight = false;
                if (e.code === 'KeyQ') rotateLeft = false;
                if (e.code === 'KeyE') rotateRight = false;
            };

            var onMouseDown = function(e) {
                isMouseDown = true;
                lastMouseX = e.clientX;
                lastMouseY = e.clientY;
            };

            var onMouseUp = function() {
                isMouseDown = false;
            };

            var onMouseMove = function(e) {
                if (isMouseDown) {
                    var deltaX = e.clientX - lastMouseX;
                    var deltaY = e.clientY - lastMouseY;
                    
                    mouseX = deltaX * 0.001;
                    mouseY = deltaY * 0.001;
                    
                    lastMouseX = e.clientX;
                    lastMouseY = e.clientY;
                } else {
                    mouseX = 0;
                    mouseY = 0;
                }
            };

            var onWheel = function(e) {
                e.preventDefault();
                var fov = camera.fov + e.deltaY * 0.05;
                camera.fov = Math.max(30, Math.min(100, fov));
                camera.updateProjectionMatrix();
            };

            document.addEventListener('keydown', onKeyDown);
            document.addEventListener('keyup', onKeyUp);
            document.addEventListener('mousedown', onMouseDown);
            document.addEventListener('mouseup', onMouseUp);
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('wheel', onWheel, { passive: false });

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
                    if (station.rings) {
                        station.rings.forEach(function(ring) {
                            ring.rotation.z += ring.userData.rotationSpeed;
                        });
                    }
                    
                    if (station.model) {
                        station.model.rotation.y += station.model.userData.rotationSpeed;
                        station.model.position.y = station.model.userData.initialY + Math.sin(time * station.model.userData.floatSpeed) * 0.3;
                    }
                    
                    if (station.modelParticles) {
                        station.modelParticles.rotation.y += 0.015;
                        station.modelParticles.children.forEach(function(particle) {
                            if (particle.userData.isModelParticle) {
                                particle.userData.angle += particle.userData.speed;
                                var localX = Math.cos(particle.userData.angle) * particle.userData.radius;
                                var localZ = Math.sin(particle.userData.angle) * particle.userData.radius;
                                var localY = Math.sin(particle.userData.angle * 2) * 0.5;
                                particle.position.set(localX, localY, localZ);
                            }
                        });
                    }
                });

                spaceParticles.forEach(function(particle) {
                    particle.position.add(particle.userData.velocity);
                    
                    if (Math.abs(particle.position.x) > 50 || 
                        particle.position.y < 0 || 
                        particle.position.y > 20 ||
                        Math.abs(particle.position.z) > 30) {
                        particle.position.set(
                            (Math.random() - 0.5) * 100,
                            Math.random() * 15 + 1,
                            (Math.random() - 0.5) * 60
                        );
                    }
                    
                    particle.rotation.x += 0.02;
                    particle.rotation.y += 0.02;
                });

                floatingRocks.forEach(function(rock) {
                    rock.position.add(rock.userData.velocity);
                    
                    if (Math.abs(rock.position.x) > 45 || 
                        rock.position.y < 1 || 
                        rock.position.y > 15 ||
                        Math.abs(rock.position.z) > 25) {
                        rock.position.set(
                            (Math.random() - 0.5) * 90,
                            Math.random() * 12 + 2,
                            (Math.random() - 0.5) * 50
                        );
                    }
                    
                    rock.rotation.x += rock.userData.rotationVelocity.x;
                    rock.rotation.y += rock.userData.rotationVelocity.y;
                    rock.rotation.z += rock.userData.rotationVelocity.z;
                });

                var forward = new THREE.Vector3();
                var right = new THREE.Vector3();
                
                forward.x = -Math.sin(yaw);
                forward.z = -Math.cos(yaw);
                
                right.x = -Math.sin(yaw + Math.PI / 2);
                right.z = -Math.cos(yaw + Math.PI / 2);

                velocity.set(0, 0, 0);

                if (moveForward) {
                    velocity.add(forward.multiplyScalar(moveSpeed));
                }
                if (moveBackward) {
                    velocity.add(forward.multiplyScalar(-moveSpeed));
                }
                if (moveLeft) {
                    velocity.add(right.multiplyScalar(moveSpeed));
                }
                if (moveRight) {
                    velocity.add(right.multiplyScalar(-moveSpeed));
                }

                camera.position.x += velocity.x;
                camera.position.z += velocity.z;

                camera.position.x = Math.max(-45, Math.min(45, camera.position.x));
                camera.position.z = Math.max(-25, Math.min(30, camera.position.z));

                if (rotateLeft) {
                    yaw += 0.04;
                }
                if (rotateRight) {
                    yaw -= 0.04;
                }

                if (isMouseDown) {
                    yaw -= mouseX;
                    pitch -= mouseY;
                    pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch));
                }

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