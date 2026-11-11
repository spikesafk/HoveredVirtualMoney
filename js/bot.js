// HvH AI Bot System: Simulates real players using Anti-Aim, Spinbot, Ragebot & Bhop
class HvHBot {
    constructor(id, name, weaponKey, configPreset, map) {
        this.player = new Player(id, name, false, 0xff3355);
        this.player.setWeapon(weaponKey);
        this.config = JSON.parse(JSON.stringify(cheatConfig.presets[configPreset] || cheatConfig.presets['Skeet 2018 HvH']));
        this.ragebot = new Ragebot();
        this.map = map;

        // AI Navigation & Movement State
        this.targetPos = map.getRandomSpawn();
        this.moveDir = new THREE.Vector3();
        this.jumpTimer = 0;
        this.nextChangeDir = 0;
        this.respawnTimer = 0;
    }

    update(dt, now, allPlayers, onShootCallback) {
        // Handle Respawn if dead
        if (!this.player.isAlive) {
            if (this.respawnTimer === 0) {
                this.respawnTimer = now + 2.5;
            } else if (now >= this.respawnTimer) {
                const spawn = this.map.getRandomSpawn();
                this.player.respawn(spawn);
                this.respawnTimer = 0;
            }
            return;
        }

        // 1. Navigation AI (Patrols arena, peeks corners)
        if (now > this.nextChangeDir || this.player.position.distanceTo(this.targetPos) < 2.0) {
            this.targetPos = this.map.getRandomSpawn();
            this.nextChangeDir = now + 4.0 + Math.random() * 3.0;
        }

        const toTarget = this.targetPos.clone().sub(this.player.position);
        toTarget.y = 0;
        if (toTarget.lengthSq() > 0.1) {
            toTarget.normalize();
            this.moveDir.copy(toTarget);
        }

        // Auto Bunnyhop Simulation
        let jump = false;
        if (now > this.jumpTimer) {
            jump = true;
            this.jumpTimer = now + 0.8 + Math.random() * 0.4;
        }

        // Move Player Physics
        this.player.updateMovement(this.moveDir, jump, false, dt);
        this.map.resolveCollision(this.player);

        // 2. Anti-Aim Update (Spinbot / Desync / Emotion Pitch)
        this.player.updateAntiAim(this.config, dt, now);

        // Record Backtrack History for other players to shoot
        this.player.recordBacktrack(now);

        // 3. Bot Ragebot (Scans player & other bots to shoot)
        const enemies = allPlayers.filter(p => p !== this.player && p.isAlive);
        this.ragebot.update(this.player, enemies, this.map, this.config, now, onShootCallback);
    }
}

window.HvHBot = HvHBot;
