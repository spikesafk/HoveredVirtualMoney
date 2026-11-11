// Full CS:GO HvH Ragebot Engine: Hitbox Multipoint, Auto-Wall, Hitchance, Backtrack & Double-Tap
class Ragebot {
    constructor() {
        this.raycaster = new THREE.Raycaster();
        this.lastShotTime = 0;
        this.doubleTapPending = false;
        this.doubleTapTarget = null;
    }

    update(shooter, enemies, map, cfg, now, onShootCallback) {
        if (!cfg.ragebot.enabled || !shooter.isAlive || shooter.ammo <= 0) return;
        if (now < shooter.nextShotTime) {
            // Handle pending double-tap second shot
            if (this.doubleTapPending && now >= this.lastShotTime + 0.05) {
                this.doubleTapPending = false;
                if (this.doubleTapTarget && this.doubleTapTarget.enemy.isAlive) {
                    this._executeShot(shooter, this.doubleTapTarget.enemy, this.doubleTapTarget.point, this.doubleTapTarget.hitbox, this.doubleTapTarget.dmg, cfg, now, onShootCallback, true);
                }
            }
            return;
        }

        const eyePos = shooter.position.clone().add(new THREE.Vector3(0, shooter.currentHeight, 0));

        let bestTarget = null;
        let highestDamage = -1;

        // Scan all living enemies
        for (const enemy of enemies) {
            if (!enemy.isAlive || enemy === shooter) continue;

            // Target current hitboxes
            const targetScan = this._scanPlayerHitboxes(shooter, eyePos, enemy, map, cfg, now, false);
            if (targetScan && targetScan.damage > highestDamage && targetScan.damage >= cfg.ragebot.minDamage) {
                highestDamage = targetScan.damage;
                bestTarget = {
                    enemy: enemy,
                    point: targetScan.point,
                    hitbox: targetScan.hitbox,
                    dmg: targetScan.damage,
                    backtrackTick: 0,
                    resolvedYaw: targetScan.resolvedYaw,
                    resolverReason: targetScan.resolverReason
                };
            }

            // Scan Backtrack Ticks (if enabled and current position isn't lethal enough)
            if (cfg.ragebot.backtrack && enemy.backtrackRecords.length > 0 && highestDamage < 100) {
                const maxTicks = Math.min(enemy.backtrackRecords.length, cfg.ragebot.backtrackTicks);
                for (let t = 1; t < maxTicks; t++) {
                    const record = enemy.backtrackRecords[t];
                    if (!record || !record.hitboxes) continue;

                    const btScan = this._scanBacktrackRecord(shooter, eyePos, enemy, record, map, cfg);
                    if (btScan && btScan.damage > highestDamage && btScan.damage >= cfg.ragebot.minDamage) {
                        highestDamage = btScan.damage;
                        bestTarget = {
                            enemy: enemy,
                            point: btScan.point,
                            hitbox: btScan.hitbox,
                            dmg: btScan.damage,
                            backtrackTick: t,
                            resolvedYaw: record.realYaw,
                            resolverReason: 'backtrack'
                        };
                    }
                }
            }
        }

        if (!bestTarget) return;

        // Calculate Hit Chance
        const hitchance = this._calculateHitchance(shooter, eyePos, bestTarget.point);
        if (hitchance < cfg.ragebot.hitChance) {
            return; // Don't fire if below user hitchance threshold
        }

        // Auto-Stop (Immediately stops player momentum for maximum accuracy)
        if (cfg.ragebot.autoStop && shooter.onGround) {
            shooter.velocity.x *= 0.1;
            shooter.velocity.z *= 0.1;
        }

        // Auto-Scope (Snipers automatically scope in before firing)
        if (cfg.ragebot.autoScope && shooter.weapon.scopedFov && !shooter.isScoped) {
            shooter.isScoped = true;
            if (window.soundFX) window.soundFX.playScope();
        }

        // Auto-Fire: Trigger pulled!
        if (cfg.ragebot.autoFire) {
            this._executeShot(shooter, bestTarget.enemy, bestTarget.point, bestTarget.hitbox, bestTarget.dmg, cfg, now, onShootCallback, false, bestTarget.backtrackTick, hitchance, bestTarget.resolverReason);

            // Double-Tap trigger
            if (cfg.ragebot.doubleTap && shooter.weapon.canDoubleTap && shooter.ammo >= 2) {
                this.doubleTapPending = true;
                this.doubleTapTarget = bestTarget;
            }
        }
    }

    _scanPlayerHitboxes(shooter, eyePos, enemy, map, cfg, now, isBacktrack = false) {
        // Resolve enemy angle
        let resolvedYaw = enemy.fakeYaw;
        let resolverReason = 'none';

        if (cfg.ragebot.resolver) {
            const resData = window.hvhResolver.resolveEnemy(enemy, cfg.ragebot.resolverMode);
            resolvedYaw = resData.resolvedYaw;
            resolverReason = resData.reason;
        }

        // Active hitboxes based on config
        const candidateHitboxes = [];
        if (cfg.ragebot.hitboxes.head) candidateHitboxes.push('head');
        if (cfg.ragebot.hitboxes.chest) candidateHitboxes.push('chest');
        if (cfg.ragebot.hitboxes.stomach) candidateHitboxes.push('stomach');
        if (cfg.ragebot.hitboxes.pelvis) candidateHitboxes.push('pelvis');
        if (cfg.ragebot.hitboxes.arms) { candidateHitboxes.push('leftArm'); candidateHitboxes.push('rightArm'); }
        if (cfg.ragebot.hitboxes.legs) { candidateHitboxes.push('leftLeg'); candidateHitboxes.push('rightLeg'); }

        let bestHit = null;
        let maxDmg = -1;

        for (const hid of candidateHitboxes) {
            const hDef = enemy.hitboxDefs.find(h => h.id === hid);
            if (!hDef) continue;

            const targetPos = enemy.getHitboxWorldPos(hid);

            // Evaluate Penetration / Auto-Wall
            const penResult = this._simulateAutoWall(eyePos, targetPos, shooter.weapon, map, cfg.ragebot.autoWall);
            if (penResult.canHit) {
                const effectiveDamage = Math.round(shooter.weapon.damage * hDef.mult * penResult.damageMultiplier);
                if (effectiveDamage > maxDmg) {
                    maxDmg = effectiveDamage;
                    bestHit = {
                        point: targetPos,
                        hitbox: hid,
                        damage: effectiveDamage,
                        resolvedYaw: resolvedYaw,
                        resolverReason: resolverReason
                    };
                }
            }
        }

        return bestHit;
    }

    _scanBacktrackRecord(shooter, eyePos, enemy, record, map, cfg) {
        let bestHit = null;
        let maxDmg = -1;

        for (const hid in record.hitboxes) {
            const hData = record.hitboxes[hid];
            if (!cfg.ragebot.hitboxes[hData.group]) continue;

            const targetPos = hData.pos;
            const penResult = this._simulateAutoWall(eyePos, targetPos, shooter.weapon, map, cfg.ragebot.autoWall);
            if (penResult.canHit) {
                const effectiveDamage = Math.round(shooter.weapon.damage * hData.mult * penResult.damageMultiplier);
                if (effectiveDamage > maxDmg) {
                    maxDmg = effectiveDamage;
                    bestHit = {
                        point: targetPos,
                        hitbox: hid,
                        damage: effectiveDamage
                    };
                }
            }
        }

        return bestHit;
    }

    _simulateAutoWall(eyePos, targetPos, weapon, map, autoWallEnabled) {
        const dir = targetPos.clone().sub(eyePos);
        const dist = dir.length();
        dir.normalize();

        const ray = new THREE.Ray(eyePos, dir);
        let penetratedWalls = 0;
        let totalWallThickness = 0;

        for (const col of map.colliders) {
            const intersection = ray.intersectBox(col.box, new THREE.Vector3());
            if (intersection && eyePos.distanceTo(intersection) < dist) {
                if (!col.penetrable || !autoWallEnabled) {
                    return { canHit: false, damageMultiplier: 0 };
                }
                penetratedWalls++;
                totalWallThickness += (col.thickness || 0.4);
                if (penetratedWalls > 2 || totalWallThickness > 1.2) {
                    return { canHit: false, damageMultiplier: 0 };
                }
            }
        }

        // Penetration damage decay
        const penDmg = Math.max(0.15, weapon.penetrationPower - (totalWallThickness * 0.35));
        return {
            canHit: true,
            damageMultiplier: (penetratedWalls > 0) ? penDmg : 1.0
        };
    }

    _calculateHitchance(shooter, eyePos, targetPos) {
        // SSG-08 (Scout) in CS:GO has 100% jumping accuracy!
        if (shooter.currentWeaponKey === 'scout' && !shooter.onGround) {
            return 100;
        }

        let inaccuracy = shooter.weapon.spread;
        if (!shooter.onGround) inaccuracy += shooter.weapon.inAirInaccuracy;
        if (shooter.velocity.lengthSq() > 1.0) inaccuracy += 0.04;
        if (shooter.weapon.scopedFov && !shooter.isScoped) inaccuracy += 0.10;

        const dist = eyePos.distanceTo(targetPos);
        const spreadRadius = inaccuracy * dist;
        const targetRadius = 0.32; // Average hitbox radius

        const ratio = targetRadius / Math.max(0.01, spreadRadius);
        const hc = Math.min(100, Math.max(5, Math.round(ratio * 75)));
        return hc;
    }

    _executeShot(shooter, enemy, targetPoint, hitbox, damage, cfg, now, onShootCallback, isDoubleTap = false, btTick = 0, hc = 75, resReason = 'default') {
        shooter.ammo--;
        shooter.nextShotTime = now + (isDoubleTap ? 0.05 : shooter.weapon.fireRate);
        this.lastShotTime = now;

        // Weapon Audio
        if (window.soundFX) {
            window.soundFX.playShoot(shooter.weapon.soundType);
        }

        // Check if shot resolves or misses due to fake angle
        let hitSuccess = true;
        let missReason = null;

        // Spread check
        if (Math.random() * 100 > hc) {
            hitSuccess = false;
            missReason = 'spread';
        }

        // Resolver check: if enemy is using desync and stationary, did our resolver guess right?
        if (hitSuccess && enemy.fakeYaw !== enemy.realYaw && cfg.ragebot.resolver) {
            const desyncDelta = Math.abs(enemy.realYaw - enemy.fakeYaw);
            if (desyncDelta > 0.4 && resReason.includes('step_0') && Math.random() < 0.35) {
                hitSuccess = false;
                missReason = 'resolver';
            }
        }

        // Notify resolver of outcome
        window.hvhResolver.onShotEvent(enemy.id, hitSuccess, missReason);

        if (hitSuccess) {
            const isFatal = enemy.takeDamage(damage, hitbox, shooter.name);
            if (isFatal) shooter.kills++;

            if (shooter.isLocal && window.soundFX) {
                window.soundFX.playHitSound(hitbox === 'head');
            }
        }

        // Invoke callback for visual tracers, hitmarkers & hitlogs
        if (onShootCallback) {
            onShootCallback({
                shooter,
                enemy,
                targetPoint,
                hitbox,
                damage: hitSuccess ? damage : 0,
                hitSuccess,
                missReason,
                isDoubleTap,
                btTick,
                hitchance: hc,
                resReason
            });
        }
    }
}

window.Ragebot = Ragebot;
