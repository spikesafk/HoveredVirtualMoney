// Advanced HvH Resolver Engine: Brute Force, LBY Prediction & Desync Inversion
class HvHResolver {
    constructor() {
        // Track per-enemy resolver records
        this.enemyRecords = new Map();
    }

    getRecord(enemyId) {
        if (!this.enemyRecords.has(enemyId)) {
            this.enemyRecords.set(enemyId, {
                missedShots: 0,
                bruteIndex: 0,
                resolvedSide: 1, // 1 for right (+58°), -1 for left (-58°)
                lastHitTime: 0,
                lastMissReason: 'none',
                lbyTimer: 0,
                modeUsed: 'adaptive'
            });
        }
        return this.enemyRecords.get(enemyId);
    }

    // Resolves enemy angle to pinpoint their true hitbox
    resolveEnemy(enemy, mode = 'adaptive') {
        const record = this.getRecord(enemy.id);
        const moving = enemy.velocity.lengthSq() > 0.5;

        let resolvedYaw = enemy.fakeYaw;
        let resolverReason = 'default';

        if (moving) {
            // In CS:GO netcode, when a player moves > 1.1 units/s, LBY is authoritative and matches movement!
            const moveYaw = Math.atan2(enemy.velocity.x, enemy.velocity.z);
            resolvedYaw = moveYaw;
            resolverReason = 'lby_moving';
        } else {
            // Stationary target using Desync Anti-Aim
            if (mode === 'brute') {
                // Brute-force cycle through possible desync offsets
                const bruteAngles = [
                    58 * (Math.PI / 180),  // Right desync
                    -58 * (Math.PI / 180), // Left desync (invert)
                    0,                     // Center / zero desync
                    29 * (Math.PI / 180),  // Half delta
                    -29 * (Math.PI / 180)
                ];
                const offset = bruteAngles[record.bruteIndex % bruteAngles.length];
                resolvedYaw = enemy.fakeYaw + offset;
                resolverReason = `brute_step_${record.bruteIndex}`;
            } else if (mode === 'lby') {
                // Predict LBY break based on last flick
                resolvedYaw = enemy.lby || (enemy.fakeYaw + 58 * (Math.PI / 180));
                resolverReason = 'lby_predict';
            } else {
                // Adaptive: combines side-switch on miss with delta tracking
                const desyncOffset = record.resolvedSide * 58 * (Math.PI / 180);
                resolvedYaw = enemy.fakeYaw + desyncOffset;
                resolverReason = (record.resolvedSide > 0) ? 'adaptive_right' : 'adaptive_left';
            }
        }

        return {
            resolvedYaw: resolvedYaw,
            reason: resolverReason,
            record: record
        };
    }

    // Called when a shot misses or hits
    onShotEvent(enemyId, hitSuccess, missReason = 'spread') {
        const record = this.getRecord(enemyId);
        if (hitSuccess) {
            record.lastHitTime = performance.now();
            record.missedShots = 0; // Lock on current resolved configuration
        } else {
            record.missedShots++;
            record.bruteIndex++;
            record.resolvedSide *= -1; // Invert side on miss! (Classic HvH resolver brute)
            record.lastMissReason = missReason;
        }
    }
}

window.hvhResolver = new HvHResolver();
