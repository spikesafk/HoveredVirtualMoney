// 3D Map Engine: de_mirage_hvh (Mirage A Site Arena with Palace, Tetris, Stairs & Ticket Booth)
class HvHMap {
    constructor(scene) {
        this.scene = scene;
        this.colliders = [];
        this.penetrationWalls = [];
        this.spawnPoints = [
            new THREE.Vector3(-18, 1.0, 20),   // T Ramp
            new THREE.Vector3(-16, 4.2, -18),  // Palace Balcony
            new THREE.Vector3(18, 1.0, -18),   // CT Ticket Booth
            new THREE.Vector3(14, 1.0, 16),    // Connector
            new THREE.Vector3(-5, 1.0, 4),     // Tetris
            new THREE.Vector3(4, 1.0, -4)      // A Site Default
        ];

        this.buildMirageA();
    }

    buildMirageA() {
        const sandstoneTex = TextureFactory.createMirageSandstone();
        const floorTex = TextureFactory.createMirageFloor();
        const crateTex = TextureFactory.createCrateTexture();
        const woodTex = TextureFactory.createWallbangWoodTexture();

        sandstoneTex.repeat.set(6, 2);
        floorTex.repeat.set(16, 16);

        // 1. Mirage Floor (A site ground)
        const floorGeo = new THREE.PlaneGeometry(64, 64);
        const floorMat = new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.85 });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.scene.add(floor);

        // 2. Warm Desert Sky
        const skyGeo = new THREE.SphereGeometry(80, 16, 16);
        const skyMat = new THREE.MeshBasicMaterial({ color: 0x486581, side: THREE.BackSide });
        const sky = new THREE.Mesh(skyGeo, skyMat);
        this.scene.add(sky);

        // 3. Perimeter Boundary Walls (Desert Sandstone)
        this._addWall(0, 5, -32, 64, 10, 2, sandstoneTex, false); // North (CT Spawn direction)
        this._addWall(0, 5, 32, 64, 10, 2, sandstoneTex, false);  // South (T Ramp direction)
        this._addWall(-32, 5, 0, 2, 10, 64, sandstoneTex, false); // West (Palace direction)
        this._addWall(32, 5, 0, 2, 10, 64, sandstoneTex, false);  // East (Connector direction)

        // 4. PALACE & BALCONY (West side)
        // Palace Balcony Platform (Elevated at Y=3.5)
        this._addPlatform(-20, 2.0, -16, 12, 4.0, 14, sandstoneTex);
        // Palace Railing
        this._addWall(-14, 4.5, -16, 0.4, 1.2, 14, sandstoneTex, false);
        // Palace Wooden Entrance (PENETRABLE WALLBANG!)
        this._addWallbangPanel(-20, 5.5, -9, 8, 3.5, 0.4, woodTex);

        // 5. TETRIS (Center-West, stack of blocks near ramp)
        this._addCrate(-8, 1.0, 6, 2.5, 2.0, 2.5, crateTex);
        this._addCrate(-8, 2.5, 6, 2.0, 1.5, 2.0, crateTex);
        this._addCrate(-6, 1.0, 8, 2.5, 2.0, 2.5, crateTex);

        // 6. STAIRS & CONNECTOR (East side)
        // Stairs stepping platform
        this._addPlatform(12, 1.2, 2, 6, 2.4, 5, sandstoneTex);
        this._addPlatform(12, 0.6, 5, 6, 1.2, 3, sandstoneTex);
        // Connector wall cover
        this._addWall(16, 3.5, 12, 3, 7.0, 14, sandstoneTex, false);

        // 7. A SITE TRIPLE BOX & DEFAULT PLANT (Center of A Site)
        // Default Plant Box (Wood Penetrable)
        this._addWallbangPanel(0, 1.5, -4, 3.2, 3.0, 3.2, woodTex);
        this._addCrate(2.5, 1.0, -4, 2.0, 2.0, 2.0, crateTex);
        // Triple Box
        this._addCrate(0, 1.5, -14, 3.0, 3.0, 3.0, crateTex);
        this._addCrate(0, 3.8, -14, 2.2, 1.8, 2.2, crateTex);
        // Firebox
        this._addWallbangPanel(-12, 1.5, 0, 3.0, 3.0, 2.5, woodTex);

        // 8. TICKET BOOTH / CT SNIPER PLATFORM (North-East)
        this._addPlatform(16, 1.5, -20, 6, 3.0, 6, sandstoneTex);
        this._addCrate(15, 3.5, -20, 2.0, 1.5, 2.0, crateTex);

        // 9. Lighting (Warm Mirage desert sun)
        const ambLight = new THREE.AmbientLight(0xfff5e6, 0.55);
        this.scene.add(ambLight);

        const sun = new THREE.DirectionalLight(0xffeedd, 0.95);
        sun.position.set(30, 45, 25);
        sun.castShadow = true;
        sun.shadow.mapSize.width = 2048;
        sun.shadow.mapSize.height = 2048;
        sun.shadow.camera.near = 0.5;
        sun.shadow.camera.far = 110;
        sun.shadow.camera.left = -40;
        sun.shadow.camera.right = 40;
        sun.shadow.camera.top = 40;
        sun.shadow.camera.bottom = -40;
        this.scene.add(sun);

        const skyHemi = new THREE.HemisphereLight(0xfff0d0, 0x3d4852, 0.4);
        this.scene.add(skyHemi);
    }

    _addWall(x, y, z, w, h, d, tex, penetrable = false) {
        const geo = new THREE.BoxGeometry(w, h, d);
        const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 });
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
        const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 });
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
        const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.65 });
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
        const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 });
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
            // Check vertical collision
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
