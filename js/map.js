// HvH 3D Arena (aim_ag_texture style dev map with wallbangable panels)
class HvHMap {
    constructor(scene) {
        this.scene = scene;
        this.colliders = []; // For player movement collision
        this.penetrationWalls = []; // For Auto-Wall raycast damage calculation
        this.spawnPoints = [
            new THREE.Vector3(-22, 1.0, -18),
            new THREE.Vector3(22, 1.0, 18),
            new THREE.Vector3(-22, 1.0, 18),
            new THREE.Vector3(22, 1.0, -18),
            new THREE.Vector3(0, 1.0, -22),
            new THREE.Vector3(0, 1.0, 22)
        ];

        this.buildArena();
    }

    buildArena() {
        // Textures
        const devOrange = TextureFactory.createDevGrid('#d66b1a', '#aa4e0a', '#ffffff');
        const devGray = TextureFactory.createDevGrid('#3c444d', '#2c333a', '#788896');
        const floorTex = TextureFactory.createFloorGrid();
        const crateTex = TextureFactory.createCrateTexture();
        const woodTex = TextureFactory.createWallbangWoodTexture();

        devOrange.repeat.set(12, 3);
        devGray.repeat.set(8, 2);
        floorTex.repeat.set(16, 16);

        // 1. Floor (60x60 units)
        const floorGeo = new THREE.PlaneGeometry(64, 64);
        const floorMat = new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.8 });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.scene.add(floor);

        // 2. Ceiling / Skybox dome
        const skyGeo = new THREE.SphereGeometry(70, 16, 16);
        const skyMat = new THREE.MeshBasicMaterial({ color: 0x14181f, side: THREE.BackSide });
        const sky = new THREE.Mesh(skyGeo, skyMat);
        this.scene.add(sky);

        // 3. Perimeter Boundary Walls
        this._addWall(0, 4, -32, 64, 8, 1.5, devOrange, false); // North
        this._addWall(0, 4, 32, 64, 8, 1.5, devOrange, false);  // South
        this._addWall(-32, 4, 0, 1.5, 8, 64, devOrange, false); // West
        this._addWall(32, 4, 0, 1.5, 8, 64, devOrange, false);  // East

        // 4. Center Pillars & Cover (Solid)
        this._addCrate(0, 2, 0, 4, 4, 4, crateTex);
        this._addCrate(-12, 1.5, -6, 3, 3, 3, crateTex);
        this._addCrate(12, 1.5, 6, 3, 3, 3, crateTex);
        this._addCrate(-12, 1.5, 6, 3, 3, 3, crateTex);
        this._addCrate(12, 1.5, -6, 3, 3, 3, crateTex);

        // 5. PENETRABLE Wooden Partitions (Auto-Wall / Wallbang zones!)
        this._addWallbangPanel(0, 2, -12, 10, 4, 0.4, woodTex);
        this._addWallbangPanel(0, 2, 12, 10, 4, 0.4, woodTex);
        this._addWallbangPanel(-16, 2, 0, 0.4, 4, 10, woodTex);
        this._addWallbangPanel(16, 2, 0, 0.4, 4, 10, woodTex);

        // 6. Elevated Sniping Platforms (Stairs / Ramps)
        this._addPlatform(-20, 1.5, -20, 8, 3, 8, devGray);
        this._addPlatform(20, 1.5, 20, 8, 3, 8, devGray);

        // 7. Lighting
        const ambLight = new THREE.AmbientLight(0xffffff, 0.45);
        this.scene.add(ambLight);

        const sun = new THREE.DirectionalLight(0xfff5e6, 0.85);
        sun.position.set(25, 40, 20);
        sun.castShadow = true;
        sun.shadow.mapSize.width = 2048;
        sun.shadow.mapSize.height = 2048;
        sun.shadow.camera.near = 0.5;
        sun.shadow.camera.far = 100;
        sun.shadow.camera.left = -35;
        sun.shadow.camera.right = 35;
        sun.shadow.camera.top = 35;
        sun.shadow.camera.bottom = -35;
        this.scene.add(sun);

        const pointLight = new THREE.PointLight(0x00d0ff, 0.5, 30);
        pointLight.position.set(0, 12, 0);
        this.scene.add(pointLight);
    }

    _addWall(x, y, z, w, h, d, tex, penetrable = false) {
        const geo = new THREE.BoxGeometry(w, h, d);
        const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.scene.add(mesh);

        const box = new THREE.Box3().setFromObject(mesh);
        this.colliders.push({ mesh, box, penetrable, thickness: Math.min(w, d) });
    }

    _addCrate(x, y, z, w, h, d, tex) {
        const geo = new THREE.BoxGeometry(w, h, d);
        const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.scene.add(mesh);

        const box = new THREE.Box3().setFromObject(mesh);
        this.colliders.push({ mesh, box, penetrable: false, thickness: Math.min(w, d) });
    }

    _addWallbangPanel(x, y, z, w, h, d, tex) {
        const geo = new THREE.BoxGeometry(w, h, d);
        const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.scene.add(mesh);

        const box = new THREE.Box3().setFromObject(mesh);
        const col = { mesh, box, penetrable: true, thickness: Math.min(w, d) };
        this.colliders.push(col);
        this.penetrationWalls.push(col);
    }

    _addPlatform(x, y, z, w, h, d, tex) {
        const geo = new THREE.BoxGeometry(w, h, d);
        const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.scene.add(mesh);

        const box = new THREE.Box3().setFromObject(mesh);
        this.colliders.push({ mesh, box, penetrable: false, thickness: Math.min(w, d) });
    }

    // Resolves player position collisions against arena objects
    resolveCollision(player) {
        const pRadius = 0.45;
        const pMinX = player.position.x - pRadius;
        const pMaxX = player.position.x + pRadius;
        const pMinZ = player.position.z - pRadius;
        const pMaxZ = player.position.z + pRadius;
        const pY = player.position.y;

        // Arena boundary clamp
        player.position.x = Math.max(-30, Math.min(30, player.position.x));
        player.position.z = Math.max(-30, Math.min(30, player.position.z));

        for (const col of this.colliders) {
            const b = col.box;
            if (pY < b.min.y || pY - 0.9 > b.max.y) continue;

            if (pMaxX > b.min.x && pMinX < b.max.x && pMaxZ > b.min.z && pMinZ < b.max.z) {
                // Find shortest pushout direction
                const dx1 = pMaxX - b.min.x;
                const dx2 = b.max.x - pMinX;
                const dz1 = pMaxZ - b.min.z;
                const dz2 = b.max.z - pMinZ;

                const minDelta = Math.min(dx1, dx2, dz1, dz2);
                if (minDelta === dx1) player.position.x -= dx1;
                else if (minDelta === dx2) player.position.x += dx2;
                else if (minDelta === dz1) player.position.z -= dz1;
                else if (minDelta === dz2) player.position.z += dz2;
            }
        }
    }

    getRandomSpawn(excludeIndex = -1) {
        let idx = Math.floor(Math.random() * this.spawnPoints.length);
        if (idx === excludeIndex) idx = (idx + 1) % this.spawnPoints.length;
        return this.spawnPoints[idx].clone();
    }
}

window.HvHMap = HvHMap;
