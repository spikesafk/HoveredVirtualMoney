// WebRTC Multiplayer System with Room Browser, Passwords & Privacy
class NetworkManager {
    constructor(game) {
        this.game = game;
        this.peer = null;
        this.connections = new Map(); // PeerId -> DataConnection
        this.hostConn = null;
        this.isHost = false;
        this.isConnected = false;
        this.roomId = null;
        this.roomConfig = {
            name: 'HvH Arena',
            hasPassword: false,
            password: '',
            maxPlayers: 8
        };

        this.remotePlayers = new Map(); // PeerId -> Player
        this.lastBroadcast = 0;
        this.broadcastRate = 1 / 30; // 30Hz tickrate

        // Simulated & Live Room Directory
        this.publicRooms = [
            { id: 'mirage-hvh-1', name: '🔴 [EU] SKEET 2018 HVH ONLY // MIRAGE', players: 3, max: 8, hasPassword: false, ping: 18 },
            { id: 'scout-gods-ru', name: '🟡 [RU] SCOUT TAP GODS (100% JUMP)', players: 2, max: 4, hasPassword: false, ping: 12 },
            { id: 'neverlose-duel', name: '🔒 [DUEL] Neverlose 1v1 Private Room', players: 1, max: 2, hasPassword: true, ping: 24 }
        ];
    }

    init() {
        const params = new URLSearchParams(window.location.search);
        const roomParam = params.get('room');
        const passParam = params.get('pwd');

        if (roomParam) {
            // Auto-join room from URL link
            setTimeout(() => {
                this.joinRoom(roomParam, passParam || '', () => {
                    this.game.startOnlineMatch(roomParam);
                });
            }, 500);
        }
    }

    // Host room with privacy and optional password
    createRoom(roomName, hasPassword, password, maxPlayers, onSuccess, onError) {
        const cleanId = 'hvh-' + Math.floor(1000 + Math.random() * 9000);
        this.roomConfig = {
            name: roomName || 'HvH Custom Room',
            hasPassword: !!hasPassword,
            password: password || '',
            maxPlayers: parseInt(maxPlayers) || 8
        };

        this._initPeer(cleanId, (id) => {
            this.isHost = true;
            this.isConnected = true;
            this.roomId = id;

            // Add room to local directory
            this.publicRooms.unshift({
                id: id,
                name: this.roomConfig.name,
                players: 1,
                max: this.roomConfig.maxPlayers,
                hasPassword: this.roomConfig.hasPassword,
                ping: 5
            });

            if (onSuccess) onSuccess(id, this.roomConfig);
        }, onError);
    }

    // Join room with optional password verification
    joinRoom(targetRoomId, passwordInput, onSuccess, onError) {
        const myId = 'hvh-peer-' + Math.floor(1000 + Math.random() * 9000);
        this._initPeer(myId, () => {
            this.isHost = false;
            this.roomId = targetRoomId;

            const conn = this.peer.connect(targetRoomId, { reliable: false });
            this._setupConnection(conn);
            this.hostConn = conn;

            conn.on('open', () => {
                // Send join handshake with password & player profile
                conn.send({
                    type: 'HANDSHAKE',
                    name: window.skinManager.currentSkins.nickname,
                    avatar: window.skinManager.currentSkins.avatar,
                    weapon: this.game.localPlayer.currentWeaponKey,
                    agent: window.skinManager.currentSkins.agent,
                    password: passwordInput || ''
                });
            });

            conn.on('data', (data) => {
                if (data.type === 'HANDSHAKE_ACCEPT') {
                    this.isConnected = true;
                    if (onSuccess) onSuccess(targetRoomId);
                } else if (data.type === 'HANDSHAKE_DENIED') {
                    alert('Ошибка подключения: ' + (data.reason || 'Неверный пароль'));
                    if (onError) onError(new Error(data.reason));
                }
            });

            conn.on('error', (err) => {
                console.error("Connection error:", err);
                if (onError) onError(err);
            });
        }, onError);
    }

    _initPeer(id, onOpen, onError) {
        if (typeof Peer === 'undefined') {
            console.warn("PeerJS library not loaded");
            if (onError) onError(new Error("PeerJS not loaded"));
            return;
        }

        try {
            this.peer = new Peer(id, {
                debug: 1,
                config: {
                    iceServers: [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:global.stun.twilio.com:3478' }
                    ]
                }
            });

            this.peer.on('open', (assignedId) => {
                if (onOpen) onOpen(assignedId);
            });

            this.peer.on('connection', (conn) => {
                this._setupConnection(conn);
            });

            this.peer.on('error', (err) => {
                console.error("PeerJS error:", err);
                if (onError) onError(err);
            });
        } catch (e) {
            if (onError) onError(e);
        }
    }

    _setupConnection(conn) {
        this.connections.set(conn.peer, conn);

        conn.on('data', (data) => {
            this._handleMessage(conn.peer, data, conn);
        });

        conn.on('close', () => {
            this.connections.delete(conn.peer);
            this._removeRemotePlayer(conn.peer);
        });
    }

    _handleMessage(senderId, data, conn) {
        if (!data || !data.type) return;

        if (data.type === 'HANDSHAKE') {
            // Password verification if host
            if (this.isHost) {
                if (this.roomConfig.hasPassword && data.password !== this.roomConfig.password) {
                    conn.send({ type: 'HANDSHAKE_DENIED', reason: 'Неверный пароль комнаты!' });
                    return;
                }
                if (this.connections.size > this.roomConfig.maxPlayers) {
                    conn.send({ type: 'HANDSHAKE_DENIED', reason: 'Комната заполнена!' });
                    return;
                }

                conn.send({ type: 'HANDSHAKE_ACCEPT' });
                this._addRemotePlayer(senderId, data.name, data.weapon, data.agent);

                // Inform existing players
                this.broadcast({
                    type: 'PLAYER_ENTERED',
                    id: senderId,
                    name: data.name,
                    weapon: data.weapon,
                    agent: data.agent
                }, senderId);
            }
        } else if (data.type === 'PLAYER_ENTERED') {
            this._addRemotePlayer(data.id, data.name, data.weapon, data.agent);
        } else if (data.type === 'STATE') {
            const p = this.remotePlayers.get(senderId);
            if (p) {
                p.position.set(data.x, data.y, data.z);
                p.viewYaw = data.viewYaw;
                p.viewPitch = data.viewPitch;
                p.realYaw = data.realYaw;
                p.fakeYaw = data.fakeYaw;
                p.health = data.hp;
                p.isAlive = data.alive;
                p.isScoped = data.scoped;
                p.rootGroup.position.copy(p.position);
                p.realGroup.rotation.y = p.realYaw;
                p.headMesh.rotation.x = data.pitch;
                p.rootGroup.visible = p.isAlive;
            }

            if (this.isHost) {
                this.broadcast(data, senderId);
            }
        } else if (data.type === 'SHOOT') {
            const shooter = this.remotePlayers.get(senderId) || (this.isHost ? this.game.localPlayer : null);
            if (shooter) {
                const targetPt = new THREE.Vector3(data.targetX, data.targetY, data.targetZ);
                if (this.game.visuals) {
                    this.game.visuals.addBulletTracer(shooter.position.clone().add(new THREE.Vector3(0, 1.4, 0)), targetPt, false);
                }
                if (window.soundFX) {
                    window.soundFX.playShoot(data.weaponSound || 'scout');
                }
            }

            if (this.isHost) {
                this.broadcast(data, senderId);
            }
        }
    }

    _addRemotePlayer(id, name, weaponKey, agentKey) {
        if (this.remotePlayers.has(id)) return;
        const p = new Player(id, name || 'Enemy', false, 0xff0055);
        p.setWeapon(weaponKey || 'scout');
        this.game.scene.add(p.rootGroup);
        this.remotePlayers.set(id, p);
        this.game.allPlayers.push(p);

        if (this.game.visuals) {
            this.game.visuals.addHitLog(`Player ${name} joined match`, '#00ffff');
        }
    }

    _removeRemotePlayer(id) {
        const p = this.remotePlayers.get(id);
        if (p) {
            this.game.scene.remove(p.rootGroup);
            const idx = this.game.allPlayers.indexOf(p);
            if (idx !== -1) this.game.allPlayers.splice(idx, 1);
            this.remotePlayers.delete(id);
        }
    }

    broadcast(data, excludePeerId = null) {
        for (const [peerId, conn] of this.connections) {
            if (peerId !== excludePeerId && conn.open) {
                conn.send(data);
            }
        }
    }

    sendToHost(data) {
        if (this.hostConn && this.hostConn.open) {
            this.hostConn.send(data);
        }
    }

    sendShotEvent(shotData) {
        const payload = {
            type: 'SHOOT',
            targetX: shotData.targetPoint.x,
            targetY: shotData.targetPoint.y,
            targetZ: shotData.targetPoint.z,
            hitbox: shotData.hitbox,
            damage: shotData.damage,
            weaponSound: shotData.shooter.weapon.soundType
        };

        if (this.isHost) {
            this.broadcast(payload);
        } else {
            this.sendToHost(payload);
        }
    }

    update(now) {
        if (!this.isConnected) return;
        if (now - this.lastBroadcast < this.broadcastRate) return;
        this.lastBroadcast = now;

        const lp = this.game.localPlayer;
        const statePayload = {
            type: 'STATE',
            x: lp.position.x,
            y: lp.position.y,
            z: lp.position.z,
            viewYaw: lp.viewYaw,
            viewPitch: lp.viewPitch,
            realYaw: lp.realYaw,
            fakeYaw: lp.fakeYaw,
            pitch: lp.realPitch,
            hp: lp.health,
            alive: lp.isAlive,
            scoped: lp.isScoped
        };

        if (this.isHost) {
            this.broadcast(statePayload);
        } else {
            this.sendToHost(statePayload);
        }
    }
}

window.NetworkManager = NetworkManager;
