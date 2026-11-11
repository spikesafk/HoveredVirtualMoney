// Player Entity with complete CS:GO HvH Hitbox architecture, Anti-Aim & Backtrack
class Player {
    constructor(id, name, isLocal = false, color = 0x2288ff) {
        this.id = id;
        this.name = name;
        this.isLocal = isLocal;
        this.color = color;

        // Position & Physics
        this.position = new THREE.Vector3(0, 1.0, 0);
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.onGround = true;
        this.isCrouching = false;
        this.viewHeight = 1.65;
        this.crouchHeight = 1.15;
        this.currentHeight = 1.65;
        this.speed = 7.5; // Base move speed
        this.bhopSpeed = 7.5;

        // Angles (in Radians)
        this.viewYaw = 0;   // Player's actual aim camera yaw
        this.viewPitch = 0; // Player's actual aim camera pitch
        this.renderYaw = 0; // Visual model yaw (modified by Anti-Aim)
        this.renderPitch = 0;
        this.realYaw = 0;   // Authoritative real hitbox angle
        this.fakeYaw = 0;   // Desync fake angle seen by enemies
        this.lby = 0;       // Lower Body Yaw
        this.lastLbyUpdate = 0;

        // Health & Combat
        this.health = 100;
        this.armor = 100;
        this.isAlive = true;
        this.kills = 0;
        this.deaths = 0;

        // Weapons
        this.currentWeaponKey = 'scar20';
        this.weapon = WEAPONS[this.currentWeaponKey];
        this.ammo = this.weapon.magSize;
        this.isReloading = false;
        this.reloadTimer = 0;
        this.nextShotTime = 0;
        this.doubleTapReady = true;
        this.isScoped = false;

        // Anti-Aim & Fake Lag State
        this.spinAngle = 0;
        this.jitterSign = 1;
        this.chokedTicks = 0;
        this.fakeLagBuffer = [];

        // Backtrack History (16 ticks buffer)
        this.backtrackRecords = [];
        this.maxBacktrackRecords = 16;

        // Resolver state on enemies (tracks how this player resolves opponents)
        this.resolvedSide = 1;
        this.missedShots = 0;

        // Three.js 3D Meshes
        this.rootGroup = new THREE.Group();
        this.realGroup = new THREE.Group(); // Real hitboxes
        this.fakeGroup = new THREE.Group(); // Desync ghost

        this.hitboxes = {};
        this._buildHitboxModel();

        this.rootGroup.add(this.realGroup);
        this.rootGroup.add(this.fakeGroup);

        // Hide fake ghost for enemies by default, show on local player if enabled
        this.fakeGroup.visible = false;
    }

    _buildHitboxModel() {
        // Material definitions
        const realMat = new THREE.MeshStandardMaterial({
            color: this.color,
            roughness: 0.4,
            metalness: 0.2
        });

        // Ghost desync material (semi-transparent cyan/lime)
        const fakeMat = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            wireframe: true,
            transparent: true,
            opacity: 0.45
        });

        // 1. Head (Sphere / Box)
        const headGeo = new THREE.SphereGeometry(0.24, 16, 16);
        this.headMesh = new THREE.Mesh(headGeo, realMat);
        this.headMesh.position.set(0, 1.62, 0);
        this.headMesh.castShadow = true;
        this.realGroup.add(this.headMesh);

        // 2. Chest (Upper Torso)
        const chestGeo = new THREE.BoxGeometry(0.55, 0.35, 0.3);
        this.chestMesh = new THREE.Mesh(chestGeo, realMat);
        this.chestMesh.position.set(0, 1.25, 0);
        this.chestMesh.castShadow = true;
        this.realGroup.add(this.chestMesh);

        // 3. Stomach & Pelvis
        const stomachGeo = new THREE.BoxGeometry(0.5, 0.28, 0.28);
        this.stomachMesh = new THREE.Mesh(stomachGeo, realMat);
        this.stomachMesh.position.set(0, 0.95, 0);
        this.realGroup.add(this.stomachMesh);

        const pelvisGeo = new THREE.BoxGeometry(0.48, 0.22, 0.28);
        this.pelvisMesh = new THREE.Mesh(pelvisGeo, realMat);
        this.pelvisMesh.position.set(0, 0.72, 0);
        this.realGroup.add(this.pelvisMesh);

        // 4. Arms
        const armGeo = new THREE.BoxGeometry(0.18, 0.55, 0.18);
        this.leftArm = new THREE.Mesh(armGeo, realMat);
        this.leftArm.position.set(-0.38, 1.15, 0);
        this.realGroup.add(this.leftArm);

        this.rightArm = new THREE.Mesh(armGeo, realMat);
        this.rightArm.position.set(0.38, 1.15, 0);
        this.realGroup.add(this.rightArm);

        // 5. Legs
        const legGeo = new THREE.BoxGeometry(0.22, 0.65, 0.22);
        this.leftLeg = new THREE.Mesh(legGeo, realMat);
        this.leftLeg.position.set(-0.16, 0.35, 0);
        this.realGroup.add(this.leftLeg);

        this.rightLeg = new THREE.Mesh(legGeo, realMat);
        this.rightLeg.position.set(0.16, 0.35, 0);
        this.realGroup.add(this.rightLeg);

        // Gun model in hands
        const gunGeo = new THREE.BoxGeometry(0.12, 0.16, 0.85);
        const gunMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.8, roughness: 0.3 });
        this.gunMesh = new THREE.Mesh(gunGeo, gunMat);
        this.gunMesh.position.set(0.25, 1.25, 0.45);
        this.realGroup.add(this.gunMesh);

        // Build Ghost Desync Model
        const fakeHead = new THREE.Mesh(headGeo, fakeMat);
        fakeHead.position.set(0, 1.62, 0);
        this.fakeGroup.add(fakeHead);

        const fakeChest = new THREE.Mesh(chestGeo, fakeMat);
        fakeChest.position.set(0, 1.25, 0);
        this.fakeGroup.add(fakeChest);

        const fakePelvis = new THREE.Mesh(pelvisGeo, fakeMat);
        fakePelvis.position.set(0, 0.72, 0);
        this.fakeGroup.add(fakePelvis);

        // Register Hitboxes with Radii / Extents for Precision Raycasting
        this.hitboxDefs = [
            { id: 'head', mesh: this.headMesh, radius: 0.26, mult: 4.0, group: 'head' },
            { id: 'chest', mesh: this.chestMesh, radius: 0.35, mult: 1.0, group: 'chest' },
            { id: 'stomach', mesh: this.stomachMesh, radius: 0.32, mult: 1.25, group: 'stomach' },
            { id: 'pelvis', mesh: this.pelvisMesh, radius: 0.30, mult: 1.1, group: 'pelvis' },
            { id: 'leftArm', mesh: this.leftArm, radius: 0.22, mult: 0.8, group: 'arms' },
            { id: 'rightArm', mesh: this.rightArm, radius: 0.22, mult: 0.8, group: 'arms' },
            { id: 'leftLeg', mesh: this.leftLeg, radius: 0.25, mult: 0.75, group: 'legs' },
            { id: 'rightLeg', mesh: this.rightLeg, radius: 0.25, mult: 0.75, group: 'legs' }
        ];
    }

    setWeapon(key) {
        if (!WEAPONS[key]) return;
        this.currentWeaponKey = key;
        this.weapon = WEAPONS[key];
        this.ammo = this.weapon.magSize;
        this.isReloading = false;
        this.isScoped = false;
    }

    // Update Anti-Aim (Pitch, Yaw, Desync, Jitter, Spinbot, LBY)
    updateAntiAim(cfg, dt, now) {
        if (!cfg.antiaim.enabled) {
            this.realYaw = this.viewYaw;
            this.realPitch = this.viewPitch;
            this.fakeYaw = this.viewYaw;
            this.realGroup.rotation.y = this.realYaw;
            this.realGroup.rotation.x = this.realPitch;
            return;
        }

        // 1. Pitch Manipulation
        if (cfg.antiaim.pitch === 'down') {
            // Classic Emotion/Down pitch: head buried down
            this.realPitch = -1.55; // ~-89 degrees
        } else if (cfg.antiaim.pitch === 'up') {
            this.realPitch = 1.55; // Up
        } else if (cfg.antiaim.pitch === 'jitter') {
            this.realPitch = (Math.sin(now * 15) > 0) ? -1.55 : 0;
        } else {
            this.realPitch = 0;
        }

        // 2. Yaw Manipulation
        let baseYaw = this.viewYaw;

        if (cfg.antiaim.yaw === 'backward') {
            // Turn back to enemy
            baseYaw += Math.PI;
        } else if (cfg.antiaim.yaw === 'spin') {
            this.spinAngle = (this.spinAngle + cfg.antiaim.spinSpeed * dt * 2.0) % (Math.PI * 2);
            baseYaw = this.spinAngle;
        } else if (cfg.antiaim.yaw === 'jitter') {
            this.jitterSign = (Math.floor(now * 10) % 2 === 0) ? 1 : -1;
            baseYaw += Math.PI + (this.jitterSign * 0.6);
        }

        // 3. Desync / Fake Angle (The heart of HvH!)
        // In CS:GO, desync creates a fake matrix up to 58 degrees off the real hitbox
        const maxDesyncRad = (cfg.antiaim.desyncAngle || 58) * (Math.PI / 180);
        const side = cfg.antiaim.desyncSide || 1;

        if (cfg.antiaim.desync) {
            this.fakeYaw = baseYaw;
            this.realYaw = baseYaw + (side * maxDesyncRad);

            // LBY Flick (breaks brute resolvers)
            if (cfg.antiaim.lbyFlick && now - this.lastLbyUpdate > 1.1) {
                this.realYaw += Math.PI * 0.65; // Massive flick for 1 tick
                this.lastLbyUpdate = now;
            }
        } else {
            this.realYaw = baseYaw;
            this.fakeYaw = baseYaw;
        }

        // Apply Rotations to 3D models
        this.realGroup.rotation.y = this.realYaw;
        this.headMesh.rotation.x = this.realPitch;

        this.fakeGroup.rotation.y = this.fakeYaw;
        this.fakeGroup.visible = this.isLocal && cfg.visuals.thirdperson && cfg.visuals.showFakeAngle;
    }

    // Lag Compensation / Record Backtrack Ticks
    recordBacktrack(now) {
        // Collect current world positions of all hitboxes
        const hitboxesSnapshot = {};
        for (const def of this.hitboxDefs) {
            const worldPos = new THREE.Vector3();
            def.mesh.getWorldPosition(worldPos);
            hitboxesSnapshot[def.id] = {
                pos: worldPos,
                radius: def.radius,
                mult: def.mult,
                group: def.group
            };
        }

        this.backtrackRecords.unshift({
            timestamp: now,
            pos: this.position.clone(),
            realYaw: this.realYaw,
            realPitch: this.realPitch,
            hitboxes: hitboxesSnapshot
        });

        if (this.backtrackRecords.length > this.maxBacktrackRecords) {
            this.backtrackRecords.pop();
        }
    }

    // CS:GO Style Bunnyhop & Movement Physics
    updateMovement(moveVec, jumpPressed, crouchPressed, dt) {
        if (!this.isAlive) return;

        // Crouch handling
        const targetHeight = crouchPressed ? this.crouchHeight : this.viewHeight;
        this.currentHeight += (targetHeight - this.currentHeight) * Math.min(1.0, dt * 14);
        this.isCrouching = crouchPressed;

        // Speed modifications
        let maxSpeed = this.speed;
        if (this.isCrouching) maxSpeed *= 0.55;
        if (this.isScoped) maxSpeed *= 0.45;

        // Ground check
        if (this.position.y <= 1.0) {
            this.position.y = 1.0;
            this.velocity.y = 0;
            this.onGround = true;
        } else {
            this.onGround = false;
            this.velocity.y -= 25.0 * dt; // Gravity
        }

        // Jump / Bunnyhop
        if (jumpPressed && this.onGround) {
            this.velocity.y = 8.5; // Jump velocity
            this.onGround = false;
            if (window.soundFX) window.soundFX.playJump();

            // Bhop momentum gain
            if (this.bhopSpeed < 18.0) {
                this.bhopSpeed += 0.8;
            }
        }

        // Friction & Ground Acceleration
        if (this.onGround) {
            this.velocity.x *= Math.max(0, 1.0 - 8.0 * dt);
            this.velocity.z *= Math.max(0, 1.0 - 8.0 * dt);

            if (moveVec.lengthSq() > 0.01) {
                const moveDir = moveVec.clone().normalize();
                this.velocity.x += moveDir.x * maxSpeed * 10.0 * dt;
                this.velocity.z += moveDir.z * maxSpeed * 10.0 * dt;
            } else {
                this.bhopSpeed = this.speed;
            }
        } else {
            // Air Strafe Mechanics (Gain speed by turning into strafe direction)
            if (moveVec.lengthSq() > 0.01) {
                const moveDir = moveVec.clone().normalize();
                this.velocity.x += moveDir.x * this.bhopSpeed * 3.5 * dt;
                this.velocity.z += moveDir.z * this.bhopSpeed * 3.5 * dt;
            }
        }

        // Apply velocity
        this.position.x += this.velocity.x * dt;
        this.position.y += this.velocity.y * dt;
        this.position.z += this.velocity.z * dt;

        // Sync 3D group position
        this.rootGroup.position.copy(this.position);
    }

    takeDamage(damage, hitGroup, attackerName) {
        if (!this.isAlive) return;

        this.health = Math.max(0, this.health - damage);

        if (this.health <= 0) {
            this.isAlive = false;
            this.deaths++;
            this.rootGroup.visible = false;
            return true; // Fatal kill
        }
        return false;
    }

    respawn(spawnPos) {
        this.position.copy(spawnPos);
        this.velocity.set(0, 0, 0);
        this.health = 100;
        this.armor = 100;
        this.isAlive = true;
        this.ammo = this.weapon.magSize;
        this.isReloading = false;
        this.rootGroup.visible = true;
        this.rootGroup.position.copy(this.position);
    }

    // Get current world position of any hitbox (Head, Chest, etc.)
    getHitboxWorldPos(hitboxId) {
        const mesh = this.hitboxDefs.find(h => h.id === hitboxId)?.mesh;
        if (!mesh) return this.position.clone().add(new THREE.Vector3(0, 1.5, 0));
        const v = new THREE.Vector3();
        mesh.getWorldPosition(v);
        return v;
    }
}

window.Player = Player;
