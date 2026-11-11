// First-Person 3D Viewmodel & Animated Weapon Models Engine
class ViewmodelManager {
    constructor(camera) {
        this.camera = camera;
        this.weaponGroup = new THREE.Group();
        this.camera.add(this.weaponGroup);

        this.currentMesh = null;
        this.currentWeaponKey = 'scout';

        // Viewmodel positioning & animation
        this.basePos = new THREE.Vector3(0.28, -0.25, -0.55);
        this.baseRot = new THREE.Euler(0.04, -0.06, 0);

        this.weaponGroup.position.copy(this.basePos);
        this.weaponGroup.rotation.copy(this.baseRot);

        this.recoilOffset = 0;
        this.inspectProgress = 0;
        this.isInspecting = false;
        this.bobTimer = 0;

        this.buildWeaponModel('scout');
    }

    buildWeaponModel(weaponKey) {
        this.currentWeaponKey = weaponKey;
        // Clear previous model
        while (this.weaponGroup.children.length > 0) {
            const obj = this.weaponGroup.children[0];
            this.weaponGroup.remove(obj);
        }

        const skins = window.skinManager.currentSkins;
        const skinKey = skins[weaponKey] || 'default';
        const mat = window.skinManager.getSkinMaterial(weaponKey, skinKey);

        const darkMetalMat = new THREE.MeshStandardMaterial({ color: 0x181a1f, roughness: 0.35, metalness: 0.8 });
        const scopeLensMat = new THREE.MeshBasicMaterial({ color: 0x00d0ff, transparent: true, opacity: 0.75 });

        const model = new THREE.Group();

        if (weaponKey === 'scout') {
            // SSG 08 Scout Model
            // Main Body / Stock
            const bodyGeo = new THREE.BoxGeometry(0.07, 0.12, 0.72);
            const bodyMesh = new THREE.Mesh(bodyGeo, mat);
            bodyMesh.position.set(0, 0, 0);
            model.add(bodyMesh);

            // Barrel
            const barrelGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.55, 12);
            const barrelMesh = new THREE.Mesh(barrelGeo, darkMetalMat);
            barrelMesh.rotation.x = Math.PI / 2;
            barrelMesh.position.set(0, 0.03, -0.55);
            model.add(barrelMesh);

            // Sniper Scope
            const scopeGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.38, 16);
            const scopeMesh = new THREE.Mesh(scopeGeo, darkMetalMat);
            scopeMesh.rotation.x = Math.PI / 2;
            scopeMesh.position.set(0, 0.11, -0.08);
            model.add(scopeMesh);

            // Scope Lens
            const lensGeo = new THREE.CircleGeometry(0.032, 16);
            const lensMesh = new THREE.Mesh(lensGeo, scopeLensMat);
            lensMesh.position.set(0, 0.11, -0.27);
            model.add(lensMesh);

            // Magazine
            const magGeo = new THREE.BoxGeometry(0.05, 0.16, 0.14);
            const magMesh = new THREE.Mesh(magGeo, darkMetalMat);
            magMesh.position.set(0, -0.1, -0.05);
            magMesh.rotation.x = 0.15;
            model.add(magMesh);

            // Stock / Cheek rest
            const stockGeo = new THREE.BoxGeometry(0.06, 0.14, 0.28);
            const stockMesh = new THREE.Mesh(stockGeo, mat);
            stockMesh.position.set(0, -0.02, 0.42);
            model.add(stockMesh);

        } else if (weaponKey === 'scar20') {
            // SCAR-20 Auto Sniper
            const bodyGeo = new THREE.BoxGeometry(0.08, 0.15, 0.85);
            const bodyMesh = new THREE.Mesh(bodyGeo, mat);
            model.add(bodyMesh);

            const barrelGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.65, 12);
            const barrelMesh = new THREE.Mesh(barrelGeo, darkMetalMat);
            barrelMesh.rotation.x = Math.PI / 2;
            barrelMesh.position.set(0, 0.04, -0.65);
            model.add(barrelMesh);

            const scopeGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.45, 16);
            const scopeMesh = new THREE.Mesh(scopeGeo, darkMetalMat);
            scopeMesh.rotation.x = Math.PI / 2;
            scopeMesh.position.set(0, 0.13, -0.12);
            model.add(scopeMesh);

            const magGeo = new THREE.BoxGeometry(0.06, 0.22, 0.16);
            const magMesh = new THREE.Mesh(magGeo, darkMetalMat);
            magMesh.position.set(0, -0.14, -0.08);
            model.add(magMesh);

        } else if (weaponKey === 'awp') {
            // AWP Magnum
            const bodyGeo = new THREE.BoxGeometry(0.085, 0.16, 0.95);
            const bodyMesh = new THREE.Mesh(bodyGeo, mat);
            model.add(bodyMesh);

            const barrelGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.8, 12);
            const barrelMesh = new THREE.Mesh(barrelGeo, darkMetalMat);
            barrelMesh.rotation.x = Math.PI / 2;
            barrelMesh.position.set(0, 0.05, -0.8);
            model.add(barrelMesh);

            // Muzzle brake
            const muzzleGeo = new THREE.BoxGeometry(0.06, 0.06, 0.12);
            const muzzleMesh = new THREE.Mesh(muzzleGeo, darkMetalMat);
            muzzleMesh.position.set(0, 0.05, -1.2);
            model.add(muzzleMesh);

            const scopeGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.5, 16);
            const scopeMesh = new THREE.Mesh(scopeGeo, darkMetalMat);
            scopeMesh.rotation.x = Math.PI / 2;
            scopeMesh.position.set(0, 0.14, -0.15);
            model.add(scopeMesh);

        } else if (weaponKey === 'deagle') {
            // Desert Eagle Handcannon
            const slideGeo = new THREE.BoxGeometry(0.065, 0.09, 0.42);
            const slideMesh = new THREE.Mesh(slideGeo, mat);
            slideMesh.position.set(0, 0.05, -0.1);
            model.add(slideMesh);

            const gripGeo = new THREE.BoxGeometry(0.06, 0.22, 0.12);
            const gripMesh = new THREE.Mesh(gripGeo, darkMetalMat);
            gripMesh.position.set(0, -0.08, 0.06);
            gripMesh.rotation.x = 0.25;
            model.add(gripMesh);

            const barrelHole = new THREE.CylinderGeometry(0.02, 0.02, 0.05, 12);
            const holeMesh = new THREE.Mesh(barrelHole, darkMetalMat);
            holeMesh.rotation.x = Math.PI / 2;
            holeMesh.position.set(0, 0.05, -0.32);
            model.add(holeMesh);

        } else if (weaponKey === 'knife') {
            // Karambit / Knife
            const knifeType = skins.knifeType || 'karambit';
            const knifeMat = window.skinManager.getSkinMaterial('knife', skins.knifeSkin || 'doppler_ruby');

            // Handle
            const handleGeo = new THREE.BoxGeometry(0.045, 0.14, 0.08);
            const handleMesh = new THREE.Mesh(handleGeo, darkMetalMat);
            handleMesh.position.set(0, -0.05, 0.1);
            handleMesh.rotation.x = 0.4;
            model.add(handleMesh);

            // Ring at bottom (Karambit finger ring)
            const ringGeo = new THREE.TorusGeometry(0.035, 0.012, 8, 16);
            const ringMesh = new THREE.Mesh(ringGeo, darkMetalMat);
            ringMesh.position.set(0, -0.13, 0.14);
            model.add(ringMesh);

            // Curved Talon Blade
            const bladeGeo = new THREE.BoxGeometry(0.02, 0.09, 0.32);
            const bladeMesh = new THREE.Mesh(bladeGeo, knifeMat);
            bladeMesh.position.set(0, 0.05, -0.12);
            bladeMesh.rotation.x = -0.35;
            model.add(bladeMesh);
        }

        this.currentMesh = model;
        this.weaponGroup.add(model);
    }

    onShoot() {
        this.recoilOffset = 0.08;
    }

    inspect() {
        this.isInspecting = true;
        this.inspectProgress = 0;
    }

    update(dt, isMoving, isScoped) {
        // Hide viewmodel when scoped in with sniper
        this.weaponGroup.visible = !isScoped;
        if (!this.weaponGroup.visible) return;

        // Recoil kick recovery
        this.recoilOffset *= Math.max(0, 1.0 - 15.0 * dt);

        // Breathing / Walking Bobbing
        if (isMoving) {
            this.bobTimer += dt * 10;
        } else {
            this.bobTimer += dt * 2.5;
        }
        const bobX = Math.sin(this.bobTimer) * 0.015;
        const bobY = Math.abs(Math.cos(this.bobTimer)) * 0.018;

        // Inspect animation (spinning karambit / tilting weapon)
        let inspectRotX = 0;
        let inspectRotY = 0;
        let inspectRotZ = 0;

        if (this.isInspecting) {
            this.inspectProgress += dt * 2.2;
            if (this.inspectProgress >= Math.PI * 2) {
                this.isInspecting = false;
                this.inspectProgress = 0;
            } else {
                inspectRotY = Math.sin(this.inspectProgress) * 0.8;
                inspectRotZ = Math.sin(this.inspectProgress * 2) * 0.4;
            }
        }

        this.weaponGroup.position.set(
            this.basePos.x + bobX,
            this.basePos.y - bobY - this.recoilOffset * 0.4,
            this.basePos.z + this.recoilOffset
        );

        this.weaponGroup.rotation.set(
            this.baseRot.x + this.recoilOffset * 0.8 + inspectRotX,
            this.baseRot.y + inspectRotY,
            this.baseRot.z + bobX * 1.5 + inspectRotZ
        );
    }
}

window.ViewmodelManager = ViewmodelManager;
