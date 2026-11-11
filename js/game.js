// Master HvH Game Loop, Renderer & Controller
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

        // Input state
        this.keys = {};
        this.mouse = { x: 0, y: 0, isLocked: false, leftDown: false, rightDown: false };
        this.isMenuOpen = false;
        this.gameStarted = false;

        // Loop timing & FPS
        this.lastTime = performance.now() / 1000;
        this.fpsCount = 0;
        this.fpsTimer = 0;
        this.currentFps = 144;

        this.init();
    }

    init() {
        // 1. Scene & Camera
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x11161d);
        this.scene.fog = new THREE.FogExp2(0x11161d, 0.015);

        this.camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 500);

        // 2. Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        // 3. Map & Visuals
        this.map = new HvHMap(this.scene);
        this.visuals = new HvHVisuals(this.scene, this.camera);
        this.network = new NetworkManager(this);
        this.network.init();

        // 4. Local Player
        const spawn = this.map.getRandomSpawn(0);
        this.localPlayer = new Player('local', 'You (Skeet)', true, 0x00d0ff);
        this.localPlayer.respawn(spawn);
        this.scene.add(this.localPlayer.rootGroup);
        this.allPlayers.push(this.localPlayer);

        // 5. Spawn Initial HvH Bots
        this.spawnBots(3);

        // 6. Setup Inputs & UI Listeners
        this._setupInputs();
        this._setupMenuUI();
        this._setupLobbyUI();

        window.addEventListener('resize', () => this._onResize());

        // Start animation loop
        requestAnimationFrame((t) => this._loop(t));
    }

    spawnBots(count) {
        // Remove existing bots
        for (const b of this.bots) {
            this.scene.remove(b.player.rootGroup);
            const idx = this.allPlayers.indexOf(b.player);
            if (idx !== -1) this.allPlayers.splice(idx, 1);
        }
        this.bots = [];

        const botProfiles = [
            { name: 'skeet_master_2018', weapon: 'scar20', preset: 'Skeet 2018 HvH' },
            { name: 'onetap_scout_god', weapon: 'scout', preset: 'Scout Tap God' },
            { name: 'neverlose_peeker', weapon: 'scar20', preset: 'Neverlose Aggressive' },
            { name: 'aimware_legacy', weapon: 'deagle', preset: 'Skeet 2018 HvH' }
        ];

        for (let i = 0; i < Math.min(count, botProfiles.length); i++) {
            const p = botProfiles[i];
            const bot = new HvHBot(`bot_${i}`, p.name, p.weapon, p.preset, this.map);
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
                this.toggleMenu();
            }

            // Weapon switching
            if (e.code === 'Digit1') this.localPlayer.setWeapon('scar20');
            if (e.code === 'Digit2') this.localPlayer.setWeapon('scout');
            if (e.code === 'Digit3') this.localPlayer.setWeapon('awp');
            if (e.code === 'Digit4') this.localPlayer.setWeapon('deagle');
            if (e.code === 'Digit5') this.localPlayer.setWeapon('duals');

            // Manual Scope with E
            if (e.code === 'KeyE') {
                if (this.localPlayer.weapon.scopedFov) {
                    this.localPlayer.isScoped = !this.localPlayer.isScoped;
                    if (window.soundFX) window.soundFX.playScope();
                }
            }

            // Reload
            if (e.code === 'KeyR') {
                this.localPlayer.ammo = this.localPlayer.weapon.magSize;
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });

        // Mouse look via PointerLock
        const overlay = document.getElementById('click-to-play');
        const playBtn = document.querySelector('.play-btn');

        if (overlay) {
            overlay.addEventListener('click', (e) => {
                this.startGame();
            });
        }
        if (playBtn) {
            playBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.startGame();
            });
        }

        this.renderer.domElement.addEventListener('click', () => {
            if (!this.mouse.isLocked && !this.isMenuOpen) {
                this.startGame();
            }
        });

        document.addEventListener('pointerlockchange', () => {
            this.mouse.isLocked = (document.pointerLockElement === this.renderer.domElement);
            if (overlay && !this.mouse.isLocked && !this.isMenuOpen && !this.gameStarted) {
                overlay.style.display = 'flex';
            }
        });

        document.addEventListener('mousemove', (e) => {
            if (!this.mouse.isLocked || this.isMenuOpen) return;

            const sensitivity = 0.0022;
            this.localPlayer.viewYaw -= e.movementX * sensitivity;
            this.localPlayer.viewPitch -= e.movementY * sensitivity;

            // Clamp vertical aim
            const maxPitch = Math.PI / 2 - 0.05;
            this.localPlayer.viewPitch = Math.max(-maxPitch, Math.min(maxPitch, this.localPlayer.viewPitch));
        });

        window.addEventListener('mousedown', (e) => {
            if (e.button === 0) this.mouse.leftDown = true;
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

    startGame() {
        this.gameStarted = true;
        if (window.soundFX) window.soundFX.init();
        try {
            this.renderer.domElement.requestPointerLock();
        } catch (err) {
            console.warn("Pointer lock request:", err);
        }
        const overlay = document.getElementById('click-to-play');
        if (overlay) overlay.style.display = 'none';
        this.mouse.isLocked = true;
    }

    toggleMenu(forceState) {
        this.isMenuOpen = (forceState !== undefined) ? forceState : !this.isMenuOpen;
        const menu = document.getElementById('cheat-menu');
        const overlay = document.getElementById('click-to-play');
        if (menu) {
            menu.style.display = this.isMenuOpen ? 'flex' : 'none';
        }

        if (this.isMenuOpen) {
            if (overlay) overlay.style.display = 'none';
            if (document.pointerLockElement) {
                document.exitPointerLock();
            }
        }
    }

    _setupMenuUI() {
        // Tab switching
        const tabs = document.querySelectorAll('.menu-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                const targetTab = tab.getAttribute('data-tab');
                document.querySelectorAll('.tab-content').forEach(c => {
                    c.classList.remove('active');
                });
                const activeContent = document.getElementById(`tab-${targetTab}`);
                if (activeContent) activeContent.classList.add('active');
            });
        });

        // Close Menu Button
        const closeBtn = document.getElementById('close-menu-btn');
        if (closeBtn) closeBtn.addEventListener('click', () => this.toggleMenu(false));

        // Floating Open Menu Button
        const openBtn = document.getElementById('open-menu-hud-btn');
        if (openBtn) openBtn.addEventListener('click', () => this.toggleMenu(true));

        // Presets selector
        const presetSelect = document.getElementById('preset-select');
        if (presetSelect) {
            presetSelect.addEventListener('change', (e) => {
                cheatConfig.applyPreset(e.target.value);
                this._syncMenuControls();
                this.visuals.addHitLog(`Loaded Config Preset: ${e.target.value}`, '#a4d037');
            });
        }

        // Weapon buttons in Misc tab
        document.querySelectorAll('.btn-weapon-select').forEach(btn => {
            btn.addEventListener('click', () => {
                const w = btn.getAttribute('data-weapon');
                this.localPlayer.setWeapon(w);
                this.visuals.addHitLog(`Equipped Weapon: ${this.localPlayer.weapon.name}`, '#00e5ff');
            });
        });

        // Bot Count Slider
        const botSlider = document.getElementById('bot-count-slider');
        const botVal = document.getElementById('bot-count-val');
        if (botSlider) {
            botSlider.addEventListener('input', (e) => {
                const count = parseInt(e.target.value);
                if (botVal) botVal.innerText = count;
                this.spawnBots(count);
            });
        }

        // Bind interactive controls
        this._bindConfigCheckbox('cfg-rage-enabled', 'ragebot', 'enabled');
        this._bindConfigCheckbox('cfg-rage-silent', 'ragebot', 'silent');
        this._bindConfigCheckbox('cfg-rage-autofire', 'ragebot', 'autoFire');
        this._bindConfigCheckbox('cfg-rage-autowall', 'ragebot', 'autoWall');
        this._bindConfigCheckbox('cfg-rage-autostop', 'ragebot', 'autoStop');
        this._bindConfigCheckbox('cfg-rage-autoscope', 'ragebot', 'autoScope');
        this._bindConfigCheckbox('cfg-rage-doubletap', 'ragebot', 'doubleTap');
        this._bindConfigSlider('cfg-rage-hitchance', 'ragebot', 'hitChance', 'val-rage-hitchance');
        this._bindConfigSlider('cfg-rage-mindamage', 'ragebot', 'minDamage', 'val-rage-mindamage');
        this._bindConfigCheckbox('cfg-rage-backtrack', 'ragebot', 'backtrack');
        this._bindConfigSlider('cfg-rage-btticks', 'ragebot', 'backtrackTicks', 'val-rage-btticks');
        this._bindConfigCheckbox('cfg-rage-resolver', 'ragebot', 'resolver');

        // Hitboxes multi-select
        this._bindConfigCheckbox('cfg-hb-head', 'ragebot.hitboxes', 'head');
        this._bindConfigCheckbox('cfg-hb-chest', 'ragebot.hitboxes', 'chest');
        this._bindConfigCheckbox('cfg-hb-stomach', 'ragebot.hitboxes', 'stomach');
        this._bindConfigCheckbox('cfg-hb-pelvis', 'ragebot.hitboxes', 'pelvis');
        this._bindConfigCheckbox('cfg-hb-arms', 'ragebot.hitboxes', 'arms');
        this._bindConfigCheckbox('cfg-hb-legs', 'ragebot.hitboxes', 'legs');

        // Anti-Aim
        this._bindConfigCheckbox('cfg-aa-enabled', 'antiaim', 'enabled');
        this._bindConfigSelect('cfg-aa-pitch', 'antiaim', 'pitch');
        this._bindConfigSelect('cfg-aa-yaw', 'antiaim', 'yaw');
        this._bindConfigSlider('cfg-aa-spinspeed', 'antiaim', 'spinSpeed', 'val-aa-spinspeed');
        this._bindConfigCheckbox('cfg-aa-desync', 'antiaim', 'desync');
        this._bindConfigSlider('cfg-aa-desyncangle', 'antiaim', 'desyncAngle', 'val-aa-desyncangle');
        this._bindConfigCheckbox('cfg-aa-lby', 'antiaim', 'lbyFlick');
        this._bindConfigCheckbox('cfg-aa-fakelag', 'antiaim', 'fakeLag');
        this._bindConfigSlider('cfg-aa-choke', 'antiaim', 'chokeTicks', 'val-aa-choke');

        // Visuals
        this._bindConfigCheckbox('cfg-esp-enabled', 'visuals', 'espEnabled');
        this._bindConfigCheckbox('cfg-esp-box', 'visuals', 'box');
        this._bindConfigCheckbox('cfg-esp-name', 'visuals', 'name');
        this._bindConfigCheckbox('cfg-esp-health', 'visuals', 'health');
        this._bindConfigCheckbox('cfg-esp-weapon', 'visuals', 'weapon');
        this._bindConfigCheckbox('cfg-esp-skeleton', 'visuals', 'skeleton');
        this._bindConfigCheckbox('cfg-esp-offscreen', 'visuals', 'offscreen');
        this._bindConfigCheckbox('cfg-esp-tracers', 'visuals', 'bulletTracers');
        this._bindConfigCheckbox('cfg-esp-thirdperson', 'visuals', 'thirdperson');
        this._bindConfigSlider('cfg-esp-tpdist', 'visuals', 'thirdpersonDist', 'val-esp-tpdist');
        this._bindConfigCheckbox('cfg-esp-fakeghost', 'visuals', 'showFakeAngle');

        // Misc
        this._bindConfigCheckbox('cfg-misc-bhop', 'misc', 'bunnyhop');
        this._bindConfigCheckbox('cfg-misc-autostrafe', 'misc', 'autoStrafe');
        this._bindConfigSlider('cfg-misc-fov', 'misc', 'fov', 'val-misc-fov');

        this._syncMenuControls();
    }

    _bindConfigCheckbox(elementId, section, key) {
        const el = document.getElementById(elementId);
        if (!el) return;
        el.addEventListener('change', (e) => {
            if (section.includes('.')) {
                const parts = section.split('.');
                cheatConfig[parts[0]][parts[1]][key] = e.target.checked;
            } else {
                cheatConfig[section][key] = e.target.checked;
            }
        });
    }

    _bindConfigSlider(elementId, section, key, valLabelId) {
        const el = document.getElementById(elementId);
        const valEl = document.getElementById(valLabelId);
        if (!el) return;
        el.addEventListener('input', (e) => {
            const val = parseInt(e.target.value);
            cheatConfig[section][key] = val;
            if (valEl) valEl.innerText = val;
        });
    }

    _bindConfigSelect(elementId, section, key) {
        const el = document.getElementById(elementId);
        if (!el) return;
        el.addEventListener('change', (e) => {
            cheatConfig[section][key] = e.target.value;
        });
    }

    _syncMenuControls() {
        const setCheck = (id, val) => { const el = document.getElementById(id); if (el) el.checked = !!val; };
        const setVal = (id, val, valId) => {
            const el = document.getElementById(id);
            if (el) el.value = val;
            const vl = document.getElementById(valId);
            if (vl) vl.innerText = val;
        };
        const setSelect = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };

        // Ragebot
        setCheck('cfg-rage-enabled', cheatConfig.ragebot.enabled);
        setCheck('cfg-rage-silent', cheatConfig.ragebot.silent);
        setCheck('cfg-rage-autofire', cheatConfig.ragebot.autoFire);
        setCheck('cfg-rage-autowall', cheatConfig.ragebot.autoWall);
        setCheck('cfg-rage-autostop', cheatConfig.ragebot.autoStop);
        setCheck('cfg-rage-autoscope', cheatConfig.ragebot.autoScope);
        setCheck('cfg-rage-doubletap', cheatConfig.ragebot.doubleTap);
        setVal('cfg-rage-hitchance', cheatConfig.ragebot.hitChance, 'val-rage-hitchance');
        setVal('cfg-rage-mindamage', cheatConfig.ragebot.minDamage, 'val-rage-mindamage');
        setCheck('cfg-rage-backtrack', cheatConfig.ragebot.backtrack);
        setVal('cfg-rage-btticks', cheatConfig.ragebot.backtrackTicks, 'val-rage-btticks');
        setCheck('cfg-rage-resolver', cheatConfig.ragebot.resolver);

        setCheck('cfg-hb-head', cheatConfig.ragebot.hitboxes.head);
        setCheck('cfg-hb-chest', cheatConfig.ragebot.hitboxes.chest);
        setCheck('cfg-hb-stomach', cheatConfig.ragebot.hitboxes.stomach);
        setCheck('cfg-hb-pelvis', cheatConfig.ragebot.hitboxes.pelvis);
        setCheck('cfg-hb-arms', cheatConfig.ragebot.hitboxes.arms);
        setCheck('cfg-hb-legs', cheatConfig.ragebot.hitboxes.legs);

        // AA
        setCheck('cfg-aa-enabled', cheatConfig.antiaim.enabled);
        setSelect('cfg-aa-pitch', cheatConfig.antiaim.pitch);
        setSelect('cfg-aa-yaw', cheatConfig.antiaim.yaw);
        setVal('cfg-aa-spinspeed', cheatConfig.antiaim.spinSpeed, 'val-aa-spinspeed');
        setCheck('cfg-aa-desync', cheatConfig.antiaim.desync);
        setVal('cfg-aa-desyncangle', cheatConfig.antiaim.desyncAngle, 'val-aa-desyncangle');
        setCheck('cfg-aa-lby', cheatConfig.antiaim.lbyFlick);
        setCheck('cfg-aa-fakelag', cheatConfig.antiaim.fakeLag);
        setVal('cfg-aa-choke', cheatConfig.antiaim.chokeTicks, 'val-aa-choke');

        // Visuals
        setCheck('cfg-esp-enabled', cheatConfig.visuals.espEnabled);
        setCheck('cfg-esp-box', cheatConfig.visuals.box);
        setCheck('cfg-esp-name', cheatConfig.visuals.name);
        setCheck('cfg-esp-health', cheatConfig.visuals.health);
        setCheck('cfg-esp-weapon', cheatConfig.visuals.weapon);
        setCheck('cfg-esp-skeleton', cheatConfig.visuals.skeleton);
        setCheck('cfg-esp-offscreen', cheatConfig.visuals.offscreen);
        setCheck('cfg-esp-tracers', cheatConfig.visuals.bulletTracers);
        setCheck('cfg-esp-thirdperson', cheatConfig.visuals.thirdperson);
        setVal('cfg-esp-tpdist', cheatConfig.visuals.thirdpersonDist, 'val-esp-tpdist');
        setCheck('cfg-esp-fakeghost', cheatConfig.visuals.showFakeAngle);

        // Misc
        setCheck('cfg-misc-bhop', cheatConfig.misc.bunnyhop);
        setCheck('cfg-misc-autostrafe', cheatConfig.misc.autoStrafe);
        setVal('cfg-misc-fov', cheatConfig.misc.fov, 'val-misc-fov');
    }

    _setupLobbyUI() {
        const createBtn = document.getElementById('btn-create-lobby');
        const joinBtn = document.getElementById('btn-join-lobby');
        const copyLinkBtn = document.getElementById('btn-copy-link');
        const roomStatus = document.getElementById('room-status-text');

        if (createBtn) {
            createBtn.addEventListener('click', () => {
                roomStatus.innerText = 'Creating room via WebRTC...';
                this.network.createRoom((id) => {
                    roomStatus.innerText = `Room Active: ${id}`;
                    const link = `${window.location.origin}${window.location.pathname}?room=${id}`;
                    document.getElementById('share-link-input').value = link;
                    document.getElementById('lobby-share-box').style.display = 'block';
                    this.visuals.addHitLog(`Lobby Created: ${id}`, '#00ffff');
                }, (err) => {
                    roomStatus.innerText = `Error: ${err.message}`;
                });
            });
        }

        if (joinBtn) {
            joinBtn.addEventListener('click', () => {
                const code = document.getElementById('room-code-input').value.trim();
                if (!code) return;
                roomStatus.innerText = `Connecting to ${code}...`;
                this.network.joinRoom(code, () => {
                    roomStatus.innerText = `Connected to room: ${code}!`;
                    this.visuals.addHitLog(`Joined room: ${code}`, '#00ff66');
                }, (err) => {
                    roomStatus.innerText = `Connection Failed: ${err.message}`;
                });
            });
        }

        if (copyLinkBtn) {
            copyLinkBtn.addEventListener('click', () => {
                const linkInput = document.getElementById('share-link-input');
                navigator.clipboard.writeText(linkInput.value);
                copyLinkBtn.innerText = 'Copied!';
                setTimeout(() => copyLinkBtn.innerText = 'Copy Link', 2000);
            });
        }
    }

    _onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    _loop(nowMs) {
        requestAnimationFrame((t) => this._loop(t));

        const now = nowMs / 1000;
        const dt = Math.min(0.05, now - this.lastTime);
        this.lastTime = now;

        // FPS counter
        this.fpsCount++;
        if (now - this.fpsTimer >= 1.0) {
            this.currentFps = this.fpsCount;
            this.fpsCount = 0;
            this.fpsTimer = now;
        }

        // 1. Process Local Player Movement & Physics
        this._updateLocalMovement(dt, now);

        // 2. Anti-Aim & Desync for Local Player
        this.localPlayer.updateAntiAim(cheatConfig, dt, now);
        this.localPlayer.recordBacktrack(now);

        // 3. Local Ragebot Scan & Fire
        const enemies = this.allPlayers.filter(p => p !== this.localPlayer && p.isAlive);
        this.ragebot.update(this.localPlayer, enemies, this.map, cheatConfig, now, (shotData) => {
            this._onShotEvent(shotData);
        });

        // 4. Update Bots
        for (const bot of this.bots) {
            bot.update(dt, now, this.allPlayers, (shotData) => {
                this._onShotEvent(shotData);
            });
        }

        // 5. Update Network Sync
        this.network.update(now);

        // 6. Camera Positioning (Firstperson vs Thirdperson)
        this._updateCamera();

        // 7. Visuals & 2D ESP Render
        this.visuals.update(nowMs, this.localPlayer, this.allPlayers, cheatConfig);

        // 8. Update HUD Elements
        this._updateHUD();

        // 9. Three.js Render Pass
        this.renderer.render(this.scene, this.camera);
    }

    _updateLocalMovement(dt, now) {
        if (!this.localPlayer.isAlive) {
            // Respawn after 2 seconds
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

        // Auto Bunnyhop: holding Space automatically hops upon touching ground
        const jumpPressed = this.keys['Space'] && (cheatConfig.misc.bunnyhop ? true : this.localPlayer.onGround);
        const crouchPressed = this.keys['ControlLeft'] || this.keys['KeyC'];

        this.localPlayer.updateMovement(moveVec, jumpPressed, crouchPressed, dt);
        this.map.resolveCollision(this.localPlayer);
    }

    _updateCamera() {
        const lp = this.localPlayer;
        const eyePos = lp.position.clone().add(new THREE.Vector3(0, lp.currentHeight, 0));

        // Adjust Camera FOV (Zoom for scoped snipers)
        let targetFov = cheatConfig.misc.fov || 95;
        if (lp.isScoped && lp.weapon.scopedFov) {
            targetFov = lp.weapon.scopedFov;
        }
        this.camera.fov += (targetFov - this.camera.fov) * 0.25;
        this.camera.updateProjectionMatrix();

        if (cheatConfig.visuals.thirdperson) {
            // Thirdperson camera orbiting behind player
            const dist = (cheatConfig.visuals.thirdpersonDist || 180) / 100; // units
            const dir = new THREE.Vector3(0, 0, dist)
                .applyEuler(new THREE.Euler(lp.viewPitch, lp.viewYaw, 0, 'YXZ'));

            this.camera.position.copy(eyePos).add(dir);
            this.camera.lookAt(eyePos);

            // Show local player model in 3rd person
            lp.realGroup.visible = true;
        } else {
            // Firstperson camera inside eyes
            this.camera.position.copy(eyePos);
            this.camera.rotation.order = 'YXZ';
            this.camera.rotation.y = lp.viewYaw;
            this.camera.rotation.x = lp.viewPitch;

            // Hide head in 1st person
            lp.headMesh.visible = false;
        }
    }

    _onShotEvent(shotData) {
        const { shooter, enemy, targetPoint, hitbox, damage, hitSuccess, missReason, isDoubleTap, btTick, hitchance, resReason } = shotData;

        // Visual Bullet Tracer
        const startPos = shooter.position.clone().add(new THREE.Vector3(0, 1.4, 0));
        this.visuals.addBulletTracer(startPos, targetPoint, shooter.isLocal);

        if (shooter.isLocal) {
            if (hitSuccess) {
                this.visuals.triggerHitmarker(hitbox === 'head');
                this.visuals.addFloatingDamage(targetPoint, `-${damage}`, hitbox === 'head' ? '#ff0033' : '#ffcc00');
                const log = `Hit ${enemy.name} in ${hitbox} for ${damage} dmg (${enemy.health} hp left) | bt: ${btTick}t | hc: ${hitchance}% | res: ${resReason}`;
                this.visuals.addHitLog(log, '#a4d037');
            } else {
                const log = `Missed shot against ${enemy.name} due to ${missReason || 'spread'} (hc: ${hitchance}%)`;
                this.visuals.addHitLog(log, '#ff3344');
            }

            // Broadcast shot over WebRTC if multiplayer
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
        if (ammoEl) ammoEl.innerText = `${this.localPlayer.ammo} / ${this.localPlayer.weapon.magSize}`;
        if (weaponEl) weaponEl.innerText = this.localPlayer.weapon.name;

        if (watermarkEl) {
            const tag = cheatConfig.misc.clanTag || 'gamesense';
            watermarkEl.innerText = `${tag} | fps: ${this.currentFps} | ping: ${this.network.isConnected ? '14' : '0'}ms | tick: 64`;
        }

        if (scopeOverlay) {
            scopeOverlay.style.display = this.localPlayer.isScoped ? 'block' : 'none';
        }
    }
}

// Global Startup
window.addEventListener('DOMContentLoaded', () => {
    window.game = new HvHGame();
});
