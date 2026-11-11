// CS:GO HvH Visuals Engine: 2D ESP, Skeletons, Chams, Bullet Tracers, Hitmarkers & Event Logs
class HvHVisuals {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;

        // 2D Canvas Overlay for ESP
        this.espCanvas = document.getElementById('esp-canvas');
        this.ctx = this.espCanvas ? this.espCanvas.getContext('2d') : null;

        // Tracers and Beams
        this.tracers = [];
        this.floatingTexts = [];
        this.hitmarkerTimer = 0;
        this.hitmarkerColor = '#ffffff';

        // Hitlog buffer
        this.logs = [];
        this.maxLogs = 8;

        this._setupResize();
    }

    _setupResize() {
        if (!this.espCanvas) return;
        const resize = () => {
            this.espCanvas.width = window.innerWidth;
            this.espCanvas.height = window.innerHeight;
        };
        window.addEventListener('resize', resize);
        resize();
    }

    addHitLog(text, color = '#a4d037') {
        const timestamp = new Date().toLocaleTimeString();
        this.logs.unshift({ text, color, time: performance.now() });
        if (this.logs.length > this.maxLogs) this.logs.pop();

        // Also update HTML log element if exists
        const logContainer = document.getElementById('event-logs');
        if (logContainer) {
            const row = document.createElement('div');
            row.className = 'log-entry';
            row.style.color = color;
            row.innerHTML = `<span class="log-tag">[gamesense]</span> ${text}`;
            logContainer.prepend(row);
            while (logContainer.children.length > 8) {
                logContainer.removeChild(logContainer.lastChild);
            }
            setTimeout(() => {
                if (row.parentNode) row.style.opacity = '0.4';
            }, 5000);
        }
    }

    triggerHitmarker(isHeadshot = false) {
        this.hitmarkerTimer = performance.now() + 180;
        this.hitmarkerColor = isHeadshot ? '#ff0033' : '#ffffff';
    }

    addBulletTracer(startPos, endPos, isLocal = true) {
        const color = isLocal ? 0x00e5ff : 0xff0055;
        const mat = new THREE.LineBasicMaterial({
            color: color,
            linewidth: 2,
            transparent: true,
            opacity: 0.95
        });

        const geo = new THREE.BufferGeometry().setFromPoints([startPos, endPos]);
        const line = new THREE.Line(geo, mat);
        this.scene.add(line);

        this.tracers.push({
            line: line,
            createTime: performance.now(),
            duration: 900 // ms
        });
    }

    addFloatingDamage(worldPos, text, color = '#ffcc00') {
        this.floatingTexts.push({
            pos: worldPos.clone(),
            text: text,
            color: color,
            createTime: performance.now(),
            duration: 1200
        });
    }

    update(now, localPlayer, enemies, cfg) {
        // 1. Update and expire bullet tracer lines
        for (let i = this.tracers.length - 1; i >= 0; i--) {
            const tr = this.tracers[i];
            const age = now - tr.createTime;
            if (age >= tr.duration) {
                this.scene.remove(tr.line);
                tr.line.geometry.dispose();
                tr.line.material.dispose();
                this.tracers.splice(i, 1);
            } else {
                tr.line.material.opacity = 0.95 * (1.0 - (age / tr.duration));
            }
        }

        // 2. Clear & Render 2D ESP Canvas
        if (!this.ctx || !this.espCanvas) return;
        this.ctx.clearRect(0, 0, this.espCanvas.width, this.espCanvas.height);

        // Render Hitmarker
        if (now < this.hitmarkerTimer) {
            this._drawHitmarker();
        }

        if (!cfg.visuals.espEnabled) return;

        // Render ESP for all enemies
        for (const enemy of enemies) {
            if (!enemy.isAlive || enemy === localPlayer) continue;
            this._renderEnemyESP(localPlayer, enemy, cfg, now);
        }

        // Render Floating Damage Numbers
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const ft = this.floatingTexts[i];
            const age = now - ft.createTime;
            if (age >= ft.duration) {
                this.floatingTexts.splice(i, 1);
            } else {
                const screenPos = this._toScreen(ft.pos.clone().add(new THREE.Vector3(0, (age / ft.duration) * 0.8, 0)));
                if (screenPos.visible) {
                    this.ctx.font = 'bold 16px monospace';
                    this.ctx.fillStyle = ft.color;
                    this.ctx.shadowColor = '#000000';
                    this.ctx.shadowBlur = 4;
                    this.ctx.fillText(ft.text, screenPos.x, screenPos.y);
                    this.ctx.shadowBlur = 0;
                }
            }
        }
    }

    _renderEnemyESP(localPlayer, enemy, cfg, now) {
        // Project head and feet positions
        const headWorld = enemy.getHitboxWorldPos('head').add(new THREE.Vector3(0, 0.25, 0));
        const feetWorld = enemy.position.clone();

        const headScreen = this._toScreen(headWorld);
        const feetScreen = this._toScreen(feetWorld);

        // Offscreen Indicator check (if enemy is behind screen)
        if (!headScreen.visible || !feetScreen.visible) {
            if (cfg.visuals.offscreen) {
                this._drawOffscreenIndicator(localPlayer, enemy);
            }
            return;
        }

        const boxHeight = Math.abs(feetScreen.y - headScreen.y);
        const boxWidth = boxHeight * 0.55;
        const boxX = headScreen.x - (boxWidth / 2);
        const boxY = headScreen.y;

        // 1. 2D Box ESP
        if (cfg.visuals.box) {
            this.ctx.strokeStyle = '#000000'; // Black outline
            this.ctx.lineWidth = 3;
            this.ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);

            this.ctx.strokeStyle = cfg.visuals.boxColor || '#a4d037';
            this.ctx.lineWidth = 1.5;
            this.ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);
        }

        // 2. Health Bar (Left side)
        if (cfg.visuals.health) {
            const barW = 3;
            const barX = boxX - barW - 3;
            const hpRatio = Math.max(0, Math.min(1.0, enemy.health / 100));
            const fillH = boxHeight * hpRatio;

            // Bar background
            this.ctx.fillStyle = '#111111';
            this.ctx.fillRect(barX - 1, boxY - 1, barW + 2, boxHeight + 2);

            // Bar fill (green to red)
            const r = Math.round(255 * (1.0 - hpRatio));
            const g = Math.round(255 * hpRatio);
            this.ctx.fillStyle = `rgb(${r},${g},0)`;
            this.ctx.fillRect(barX, boxY + (boxHeight - fillH), barW, fillH);

            if (enemy.health < 100) {
                this.ctx.fillStyle = '#ffffff';
                this.ctx.font = '9px monospace';
                this.ctx.fillText(`${enemy.health}`, barX - 12, boxY + (boxHeight - fillH) + 6);
            }
        }

        // 3. Name ESP (Top)
        if (cfg.visuals.name) {
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = 'bold 11px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(enemy.name, boxX + (boxWidth / 2), boxY - 5);
        }

        // 4. Weapon ESP (Bottom)
        if (cfg.visuals.weapon) {
            this.ctx.fillStyle = '#dddddd';
            this.ctx.font = '10px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(enemy.weapon.name.toUpperCase(), boxX + (boxWidth / 2), boxY + boxHeight + 13);
        }

        // 5. HvH Flags (Right side)
        this.ctx.textAlign = 'left';
        this.ctx.font = '9px monospace';
        let flagY = boxY + 10;

        // Desync Flag
        if (enemy.fakeYaw !== enemy.realYaw) {
            this.ctx.fillStyle = '#00ffff';
            this.ctx.fillText('FAKE', boxX + boxWidth + 4, flagY);
            flagY += 11;
        }

        // Resolved Status
        const res = window.hvhResolver.getRecord(enemy.id);
        if (res && res.lastHitTime > 0) {
            this.ctx.fillStyle = '#a4d037';
            this.ctx.fillText('RESOLVED', boxX + boxWidth + 4, flagY);
            flagY += 11;
        }

        // Backtrack Available Flag
        if (cfg.ragebot.backtrack && enemy.backtrackRecords.length > 3) {
            this.ctx.fillStyle = '#ffaa00';
            this.ctx.fillText(`BT: ${enemy.backtrackRecords.length}T`, boxX + boxWidth + 4, flagY);
            flagY += 11;
        }

        // 6. Skeleton ESP
        if (cfg.visuals.skeleton) {
            this._drawSkeleton(enemy);
        }
    }

    _drawSkeleton(enemy) {
        const points = [
            'head', 'chest', 'pelvis', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg'
        ].map(id => ({ id, pt: this._toScreen(enemy.getHitboxWorldPos(id)) }));

        const head = points.find(p => p.id === 'head');
        const chest = points.find(p => p.id === 'chest');
        const pelvis = points.find(p => p.id === 'pelvis');
        const lArm = points.find(p => p.id === 'leftArm');
        const rArm = points.find(p => p.id === 'rightArm');
        const lLeg = points.find(p => p.id === 'leftLeg');
        const rLeg = points.find(p => p.id === 'rightLeg');

        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 1.2;

        const drawBone = (p1, p2) => {
            if (p1 && p2 && p1.pt.visible && p2.pt.visible) {
                this.ctx.beginPath();
                this.ctx.moveTo(p1.pt.x, p1.pt.y);
                this.ctx.lineTo(p2.pt.x, p2.pt.y);
                this.ctx.stroke();
            }
        };

        drawBone(head, chest);
        drawBone(chest, pelvis);
        drawBone(chest, lArm);
        drawBone(chest, rArm);
        drawBone(pelvis, lLeg);
        drawBone(pelvis, rLeg);
    }

    _drawHitmarker() {
        const cx = this.espCanvas.width / 2;
        const cy = this.espCanvas.height / 2;
        const size = 7;
        const gap = 3;

        this.ctx.strokeStyle = this.hitmarkerColor;
        this.ctx.lineWidth = 1.8;

        this.ctx.beginPath();
        // Top-left
        this.ctx.moveTo(cx - gap, cy - gap);
        this.ctx.lineTo(cx - gap - size, cy - gap - size);
        // Top-right
        this.ctx.moveTo(cx + gap, cy - gap);
        this.ctx.lineTo(cx + gap + size, cy - gap - size);
        // Bottom-left
        this.ctx.moveTo(cx - gap, cy + gap);
        this.ctx.lineTo(cx - gap - size, cy + gap + size);
        // Bottom-right
        this.ctx.moveTo(cx + gap, cy + gap);
        this.ctx.lineTo(cx + gap + size, cy + gap + size);
        this.ctx.stroke();
    }

    _drawOffscreenIndicator(localPlayer, enemy) {
        const localForward = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(0, localPlayer.viewYaw, 0));
        const localPos = localPlayer.position;
        const enemyDir = enemy.position.clone().sub(localPos).normalize();

        const angle = Math.atan2(enemyDir.x, enemyDir.z) - localPlayer.viewYaw;
        const cx = this.espCanvas.width / 2;
        const cy = this.espCanvas.height / 2;
        const radius = Math.min(cx, cy) * 0.85;

        const screenAngle = angle - Math.PI / 2;
        const arrowX = cx + Math.cos(screenAngle) * radius;
        const arrowY = cy + Math.sin(screenAngle) * radius;

        this.ctx.save();
        this.ctx.translate(arrowX, arrowY);
        this.ctx.rotate(screenAngle + Math.PI / 2);

        this.ctx.fillStyle = '#ff2244';
        this.ctx.beginPath();
        this.ctx.moveTo(0, -10);
        this.ctx.lineTo(-8, 8);
        this.ctx.lineTo(8, 8);
        this.ctx.closePath();
        this.ctx.fill();

        this.ctx.restore();
    }

    _toScreen(worldVec) {
        const v = worldVec.clone().project(this.camera);
        const halfW = this.espCanvas.width / 2;
        const halfH = this.espCanvas.height / 2;

        return {
            x: (v.x * halfW) + halfW,
            y: -(v.y * halfH) + halfH,
            visible: v.z < 1.0 && Math.abs(v.x) <= 1.2 && Math.abs(v.y) <= 1.2
        };
    }
}

window.HvHVisuals = HvHVisuals;
