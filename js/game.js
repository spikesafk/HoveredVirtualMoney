// Master HvH Game Loop, 3D Renderer, Viewmodel & Main Menu Controller
class HvHGame {
    constructor() {
        this.container = document.getElementById('canvas-container');
        this.scene = null;
        this.camera = null;
        this.renderer = null;

        this.localPlayer = null;
        this.allPlayers = [];
        this.bots = [];

        this.map = null;
        this.ragebot = new Ragebot();
        this.visuals = null;
        this.network = null;
        this.viewmodel = null;

        // Game State
        this.inMainMenu = true;
        this.isMenuOpen = false;
        this.currentCheatTheme = 'skeet';

        // Input state
        this.keys = {};
        this.mouse = { x: 0, y: 0, isLocked: false, leftDown: false, rightDown: false };

        // Loop timing & FPS
        this.lastTime = performance.now() / 1000;
        this.fpsCount = 0;
        this.fpsTimer = 0;
        this.currentFps = 144;
        this.menuOrbitAngle = 0;

        this.init();
    }

    init() {
        // 1. Scene & Camera
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x486581);
        this.scene.fog = new THREE.FogExp2(0x486581, 0.012);

        this.camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.05, 500);

        // 2. Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        // 3. Map (de_mirage_hvh) & Visuals
        this.map = new HvHMap(this.scene);
        this.visuals = new HvHVisuals(this.scene, this.camera);
        this.network = new NetworkManager(this);

        // 4. Viewmodel
        this.viewmodel = new ViewmodelManager(this.camera);

        // 5. Local Player (Default weapon: SSG 08 Scout!)
        const spawn = this.map.getRandomSpawn(0);
        this.localPlayer = new Player('local', window.skinManager.currentSkins.nickname, true, 0x00d0ff);
        this.localPlayer.setWeapon('scout'); // Standard SSG-08 starting weapon!
        this.localPlayer.respawn(spawn);
        this.scene.add(this.localPlayer.rootGroup);
        this.allPlayers.push(this.localPlayer);

        // 6. Setup Listeners
        this._setupInputs();
        this._setupMainMenuUI();
        this._setupCheatMenuUI();

        // 7. Initialize Network
        this.network.init();

        window.addEventListener('resize', () => this._onResize());

        // Start animation loop
        requestAnimationFrame((t) => this._loop(t));
    }

    startPractice(botCount = 3, botConfig = 'Skeet 2018 HvH') {
        this.inMainMenu = false;
        document.getElementById('main-menu').style.display = 'none';
        document.getElementById('hud-bottom').style.display = 'flex';
        document.getElementById('hud-action-bar').style.display = 'flex';

        this.spawnBots(botCount, botConfig);
        this.localPlayer.respawn(this.map.getRandomSpawn(0));
        this.viewmodel.buildWeaponModel(this.localPlayer.currentWeaponKey);

        this.lockMouse();
        if (window.soundFX) window.soundFX.init();
    }

    startOnlineMatch(roomId) {
        this.inMainMenu = false;
        document.getElementById('main-menu').style.display = 'none';
        document.getElementById('hud-bottom').style.display = 'flex';
        document.getElementById('hud-action-bar').style.display = 'flex';

        // Clear bots for clean online match
        this.spawnBots(0);
        this.localPlayer.respawn(this.map.getRandomSpawn(0));
        this.viewmodel.buildWeaponModel(this.localPlayer.currentWeaponKey);

        this.lockMouse();
        if (window.soundFX) window.soundFX.init();
    }

    returnToMainMenu() {
        this.inMainMenu = true;
        this.isMenuOpen = false;
        document.getElementById('main-menu').style.display = 'flex';
        document.getElementById('cheat-menu').style.display = 'none';
        document.getElementById('hud-bottom').style.display = 'none';
        document.getElementById('hud-action-bar').style.display = 'none';

        if (document.pointerLockElement) {
            document.exitPointerLock();
        }
    }

    setCheatTheme(theme) {
        this.currentCheatTheme = theme;
        const validThemes = ['skeet', 'neverlose', 'nixware', 'onetap'];
        validThemes.forEach(t => document.body.classList.remove(`theme-${t}`));
        document.body.classList.add(`theme-${theme}`);

        // Update active buttons in menu header
        document.querySelectorAll('.theme-pill-btn').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-theme') === theme);
        });
    }

    spawnBots(count, botConfigPreset = 'Skeet 2018 HvH') {
        for (const b of this.bots) {
            this.scene.remove(b.player.rootGroup);
            const idx = this.allPlayers.indexOf(b.player);
            if (idx !== -1) this.allPlayers.splice(idx, 1);
        }
        this.bots = [];

        const botProfiles = [
            { name: 'skeet_master_2018', weapon: 'scout', preset: 'Scout Tap God' },
            { name: 'onetap_god_aSite', weapon: 'scar20', preset: 'Skeet 2018 HvH' },
            { name: 'neverlose_peeker', weapon: 'scout', preset: 'Neverlose Aggressive' },
            { name: 'nixware_user', weapon: 'deagle', preset: 'Skeet 2018 HvH' },
            { name: 'aimware_legacy', weapon: 'awp', preset: 'Skeet 2018 HvH' },
            { name: 'tap_legend', weapon: 'scout', preset: 'Scout Tap God' }
        ];

        for (let i = 0; i < Math.min(count, botProfiles.length); i++) {
            const p = botProfiles[i];
            const bot = new HvHBot(`bot_${i}`, p.name, p.weapon, botConfigPreset || p.preset, this.map);
            bot.player.respawn(this.map.getRandomSpawn(i + 1));
            this.scene.add(bot.player.rootGroup);
            this.bots.push(bot);
            this.allPlayers.push(bot.player);
        }
    }

    _setupInputs() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;

            // Toggle Cheat Menu with INSERT or DELETE or M
            if (e.code === 'Insert' || e.code === 'Delete' || e.code === 'KeyM') {
                if (!this.inMainMenu) {
                    this.toggleMenu();
                }
            }

            // Inspect Weapon with F
            if (e.code === 'KeyF') {
                if (this.viewmodel) this.viewmodel.inspect();
            }

            // Weapon switching
            if (e.code === 'Digit1') this.switchWeapon('scout'); // Standard 1: SSG 08 Scout
            if (e.code === 'Digit2') this.switchWeapon('scar20'); // 2: SCAR-20 Auto
            if (e.code === 'Digit3') this.switchWeapon('knife');  // 3: Knife / Karambit
            if (e.code === 'Digit4') this.switchWeapon('deagle'); // 4: Deagle
            if (e.code === 'Digit5') this.switchWeapon('awp');    // 5: AWP

            // Manual Scope with E
            if (e.code === 'KeyE') {
                if (this.localPlayer.weapon.scopedFov) {
                    this.localPlayer.isScoped = !this.localPlayer.isScoped;
                    if (window.soundFX) window.soundFX.playScope();
                }
            }

            // Reload with R
            if (e.code === 'KeyR') {
                this.localPlayer.ammo = this.localPlayer.weapon.magSize;
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });

        // Pointer Lock & Mouse Look
        this.renderer.domElement.addEventListener('click', () => {
            if (!this.inMainMenu && !this.mouse.isLocked && !this.isMenuOpen) {
                this.lockMouse();
            }
        });

        document.addEventListener('pointerlockchange', () => {
            this.mouse.isLocked = (document.pointerLockElement === this.renderer.domElement);
        });

        document.addEventListener('mousemove', (e) => {
            if (!this.mouse.isLocked || this.isMenuOpen || this.inMainMenu) return;

            const sensitivity = 0.0022;
            this.localPlayer.viewYaw -= e.movementX * sensitivity;
            this.localPlayer.viewPitch -= e.movementY * sensitivity;

            const maxPitch = Math.PI / 2 - 0.05;
            this.localPlayer.viewPitch = Math.max(-maxPitch, Math.min(maxPitch, this.localPlayer.viewPitch));
        });

        window.addEventListener('mousedown', (e) => {
            if (this.inMainMenu || this.isMenuOpen) return;

            if (e.button === 0) {
                this.mouse.leftDown = true;
                // Manual fire fallback if ragebot is off
                if (!cheatConfig.ragebot.enabled || !cheatConfig.ragebot.autoFire) {
                    this._manualFire();
                }
            }
            if (e.button === 2) {
                this.mouse.rightDown = true;
                if (this.localPlayer.weapon.scopedFov) {
                    this.localPlayer.isScoped = !this.localPlayer.isScoped;
                    if (window.soundFX) window.soundFX.playScope();
                }
            }
        });

        window.addEventListener('mouseup', (e) => {
            if (e.button === 0) this.mouse.leftDown = false;
            if (e.button === 2) this.mouse.rightDown = false;
        });

        window.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    _manualFire() {
        if (!this.localPlayer.isAlive || this.localPlayer.ammo <= 0) return;
        const now = performance.now() / 1000;
        if (now < this.localPlayer.nextShotTime) return;

        this.localPlayer.ammo--;
        this.localPlayer.nextShotTime = now + this.localPlayer.weapon.fireRate;
        if (window.soundFX) window.soundFX.playShoot(this.localPlayer.weapon.soundType);
        if (this.viewmodel) this.viewmodel.onShoot();
    }

    switchWeapon(weaponKey) {
        if (!WEAPONS[weaponKey]) return;
        this.localPlayer.setWeapon(weaponKey);
        if (this.viewmodel) this.viewmodel.buildWeaponModel(weaponKey);
        this.visuals.addHitLog(`Equipped: ${this.localPlayer.weapon.name}`, '#00e5ff');
    }

    lockMouse() {
        if (window.soundFX) window.soundFX.init();
        try {
            this.renderer.domElement.requestPointerLock();
        } catch (err) {}
        this.mouse.isLocked = true;
    }

    toggleMenu(forceState) {
        this.isMenuOpen = (forceState !== undefined) ? forceState : !this.isMenuOpen;
        const menu = document.getElementById('cheat-menu');
        if (menu) {
            menu.style.display = this.isMenuOpen ? 'flex' : 'none';
        }

        if (this.isMenuOpen && document.pointerLockElement) {
            document.exitPointerLock();
        }
    }

    _setupMainMenuUI() {
        // Main Navigation tabs
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                navItems.forEach(n => n.classList.remove('active'));
                item.classList.add('active');

                const viewKey = item.getAttribute('data-view');
                document.querySelectorAll('.menu-view').forEach(v => v.classList.remove('active'));
                const targetView = document.getElementById(`view-${viewKey}`);
                if (targetView) targetView.classList.add('active');
            });
        });

        // Start Practice Bot Match Button
        const startPracticeBtn = document.getElementById('btn-start-practice');
        if (startPracticeBtn) {
            startPracticeBtn.addEventListener('click', () => {
                const count = parseInt(document.getElementById('practice-bot-count').value) || 3;
                const preset = document.getElementById('practice-bot-preset').value;
                this.startPractice(count, preset);
            });
        }

        // Create Room in Multiplayer
        const createRoomBtn = document.getElementById('btn-modal-create-room');
        if (createRoomBtn) {
            createRoomBtn.addEventListener('click', () => {
                const name = document.getElementById('create-room-name').value.trim() || 'HvH Mirage Arena';
                const hasPass = document.getElementById('create-room-pass-check').checked;
                const pass = document.getElementById('create-room-pass-input').value.trim();
                const maxP = document.getElementById('create-room-max-select').value;

                this.network.createRoom(name, hasPass, pass, maxP, (id) => {
                    this.startOnlineMatch(id);
                    this.visuals.addHitLog(`Created Room: ${name} [${id}]`, '#00ffcc');
                });
            });
        }

        // Direct Room Code Join
        const directJoinBtn = document.getElementById('btn-direct-join');
        if (directJoinBtn) {
            directJoinBtn.addEventListener('click', () => {
                const code = document.getElementById('direct-room-code').value.trim();
                const pass = document.getElementById('direct-room-pass').value.trim();
                if (!code) return;
                this.network.joinRoom(code, pass, () => {
                    this.startOnlineMatch(code);
                });
            });
        }

        // Nickname Edit
        const nickInput = document.getElementById('profile-nick-input');
        if (nickInput) {
            nickInput.value = window.skinManager.currentSkins.nickname;
            nickInput.addEventListener('change', (e) => {
                window.skinManager.currentSkins.nickname = e.target.value.trim() || 'HvH_Legend';
                window.skinManager.saveSkins();
                this.localPlayer.name = window.skinManager.currentSkins.nickname;
            });
        }

        // Skinchanger UI Cards
        this._setupSkinchangerUI();
    }

    _setupSkinchangerUI() {
        const skinTabs = document.querySelectorAll('.skin-tab-btn');
        skinTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                skinTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                const cat = tab.getAttribute('data-cat');
                document.querySelectorAll('.skin-category-panel').forEach(p => p.style.display = 'none');
                const target = document.getElementById(`skin-cat-${cat}`);
                if (target) target.style.display = 'grid';
            });
        });

        // Equip skin click listener
        document.querySelectorAll('.skin-card').forEach(card => {
            card.addEventListener('click', () => {
                const weapon = card.getAttribute('data-weapon');
                const skin = card.getAttribute('data-skin');

                if (weapon === 'knife') {
                    window.skinManager.currentSkins.knifeSkin = skin;
                } else {
                    window.skinManager.currentSkins[weapon] = skin;
                }
                window.skinManager.saveSkins();

                // Re-equip visual
                if (this.viewmodel && this.localPlayer.currentWeaponKey === weapon) {
                    this.viewmodel.buildWeaponModel(weapon);
                }

                // Update UI active card
                card.parentElement.querySelectorAll('.skin-card').forEach(c => c.classList.remove('equipped'));
                card.classList.add('equipped');
            });
        });
    }

    _setupCheatMenuUI() {
        // Theme Pills in Cheat Menu Titlebar
        document.querySelectorAll('.theme-pill-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const theme = btn.getAttribute('data-theme');
                this.setCheatTheme(theme);
            });
        });

        // Return to Main Menu Button
        const mainMenuBtn = document.getElementById('btn-return-main-menu');
        if (mainMenuBtn) mainMenuBtn.addEventListener('click', () => this.returnToMainMenu());

        const openMenuBtn = document.getElementById('open-menu-hud-btn');
        if (openMenuBtn) openMenuBtn.addEventListener('click', () => this.toggleMenu(true));

        const closeBtn = document.getElementById('close-menu-btn');
        if (closeBtn) closeBtn.addEventListener('click', () => this.toggleMenu(false));

        // Tab Switching in Cheat Menu
        const tabs = document.querySelectorAll('.menu-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                const targetTab = tab.getAttribute('data-tab');
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                const activeContent = document.getElementById(`tab-${targetTab}`);
                if (activeContent) activeContent.classList.add('active');
            });
        });
    }

    _onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    _loop(nowMs) {
        requestAnimationFrame((t) => this._loop(t));

        const now = nowMs / 1000;
        const dt = Math.max(0.001, Math.min(0.05, now - this.lastTime));
        this.lastTime = now;

        this.fpsCount++;
        if (now - this.fpsTimer >= 1.0) {
            this.currentFps = this.fpsCount;
            this.fpsCount = 0;
            this.fpsTimer = now;
        }

        // If in Main Menu: cinematic orbiting camera around Mirage A site
        if (this.inMainMenu) {
            this.menuOrbitAngle += dt * 0.25;
            const radius = 24;
            this.camera.position.set(
                Math.cos(this.menuOrbitAngle) * radius,
                14,
                Math.sin(this.menuOrbitAngle) * radius
            );
            this.camera.lookAt(0, 2, 0);
            this.viewmodel.weaponGroup.visible = false;
            this.renderer.render(this.scene, this.camera);
            return;
        }

        // In-game simulation
        this._updateLocalMovement(dt, now);
        this.localPlayer.updateAntiAim(cheatConfig, dt, now);
        this.localPlayer.recordBacktrack(now);

        // Local Ragebot Scan & Fire
        const enemies = this.allPlayers.filter(p => p !== this.localPlayer && p.isAlive);
        this.ragebot.update(this.localPlayer, enemies, this.map, cheatConfig, now, (shotData) => {
            this._onShotEvent(shotData);
        });

        // Bots Update
        for (const bot of this.bots) {
            bot.update(dt, now, this.allPlayers, (shotData) => {
                this._onShotEvent(shotData);
            });
        }

        // Network Sync Update
        this.network.update(now);

        // Camera & Viewmodel Update
        this._updateCamera();
        const isMoving = this.localPlayer.velocity.lengthSq() > 0.5;
        this.viewmodel.update(dt, isMoving, this.localPlayer.isScoped);

        // Visuals & ESP Render
        this.visuals.update(nowMs, this.localPlayer, this.allPlayers, cheatConfig);

        // HUD Update
        this._updateHUD();

        // Three.js Render Pass
        this.renderer.render(this.scene, this.camera);
    }

    _updateLocalMovement(dt, now) {
        if (!this.localPlayer.isAlive) {
            if (this.keys['Space']) {
                this.localPlayer.respawn(this.map.getRandomSpawn());
            }
            return;
        }

        const moveVec = new THREE.Vector3(0, 0, 0);
        const forward = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(0, this.localPlayer.viewYaw, 0));
        const right = new THREE.Vector3(1, 0, 0).applyEuler(new THREE.Euler(0, this.localPlayer.viewYaw, 0));

        if (this.keys['KeyW']) moveVec.add(forward);
        if (this.keys['KeyS']) moveVec.sub(forward);
        if (this.keys['KeyA']) moveVec.sub(right);
        if (this.keys['KeyD']) moveVec.add(right);

        const jumpPressed = this.keys['Space'] && (cheatConfig.misc.bunnyhop ? true : this.localPlayer.onGround);
        const crouchPressed = this.keys['ControlLeft'] || this.keys['KeyC'];

        this.localPlayer.updateMovement(moveVec, jumpPressed, crouchPressed, dt);
        this.map.resolveCollision(this.localPlayer);
    }

    _updateCamera() {
        const lp = this.localPlayer;
        const eyePos = lp.position.clone().add(new THREE.Vector3(0, lp.currentHeight, 0));

        let targetFov = cheatConfig.misc.fov || 95;
        if (lp.isScoped && lp.weapon.scopedFov) {
            targetFov = lp.weapon.scopedFov;
        }
        this.camera.fov += (targetFov - this.camera.fov) * 0.25;
        this.camera.updateProjectionMatrix();

        if (cheatConfig.visuals.thirdperson) {
            const dist = (cheatConfig.visuals.thirdpersonDist || 180) / 100;
            const dir = new THREE.Vector3(0, 0, dist)
                .applyEuler(new THREE.Euler(lp.viewPitch, lp.viewYaw, 0, 'YXZ'));

            this.camera.position.copy(eyePos).add(dir);
            this.camera.lookAt(eyePos);
            lp.realGroup.visible = true;
        } else {
            this.camera.position.copy(eyePos);
            this.camera.rotation.order = 'YXZ';
            this.camera.rotation.y = lp.viewYaw;
            this.camera.rotation.x = lp.viewPitch;
            lp.headMesh.visible = false;
        }
    }

    _onShotEvent(shotData) {
        const { shooter, enemy, targetPoint, hitbox, damage, hitSuccess, missReason, isDoubleTap, btTick, hitchance, resReason } = shotData;

        const startPos = shooter.position.clone().add(new THREE.Vector3(0, 1.4, 0));
        this.visuals.addBulletTracer(startPos, targetPoint, shooter.isLocal);

        if (shooter.isLocal) {
            if (this.viewmodel) this.viewmodel.onShoot();

            if (hitSuccess) {
                this.visuals.triggerHitmarker(hitbox === 'head');
                this.visuals.addFloatingDamage(targetPoint, `-${damage}`, hitbox === 'head' ? '#ff0033' : '#ffcc00');
                const log = `Hit ${enemy.name} in ${hitbox} for ${damage} dmg (${enemy.health} hp left) | bt: ${btTick}t | hc: ${hitchance}% | res: ${resReason}`;
                this.visuals.addHitLog(log, '#a4d037');
            } else {
                const log = `Missed shot against ${enemy.name} due to ${missReason || 'spread'} (hc: ${hitchance}%)`;
                this.visuals.addHitLog(log, '#ff3344');
            }

            if (this.network.isConnected) {
                this.network.sendShotEvent(shotData);
            }
        }
    }

    _updateHUD() {
        const hpEl = document.getElementById('hud-hp');
        const ammoEl = document.getElementById('hud-ammo');
        const weaponEl = document.getElementById('hud-weapon');
        const watermarkEl = document.getElementById('watermark');
        const scopeOverlay = document.getElementById('scope-overlay');

        if (hpEl) hpEl.innerText = this.localPlayer.health;
        if (ammoEl) {
            ammoEl.innerText = this.localPlayer.weapon.isMelee ? '∞' : `${this.localPlayer.ammo} / ${this.localPlayer.weapon.magSize}`;
        }
        if (weaponEl) weaponEl.innerText = this.localPlayer.weapon.name;

        if (watermarkEl) {
            const tag = cheatConfig.misc.clanTag || 'gamesense';
            watermarkEl.innerText = `${tag} | map: de_mirage | fps: ${this.currentFps} | ping: ${this.network.isConnected ? '14' : '0'}ms | tick: 64`;
        }

        if (scopeOverlay) {
            scopeOverlay.style.display = this.localPlayer.isScoped ? 'block' : 'none';
        }
    }
}

// Global Startup (Guards against readyState interactive/complete)
function initHvHGame() {
    if (!window.game) {
        window.game = new HvHGame();
    }
}

if (document.readyState === 'complete' || document.readyState === 'interactive') {
    initHvHGame();
} else {
    document.addEventListener('DOMContentLoaded', initHvHGame);
    window.addEventListener('load', initHvHGame);
}
