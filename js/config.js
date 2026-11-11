// Master Cheat Configuration State and Preset Management
class CheatConfig {
    constructor() {
        this.ragebot = {
            enabled: true,
            silent: true,
            autoFire: true,
            autoWall: true,
            autoStop: true,
            autoScope: true,
            doubleTap: true,
            hitChance: 75,
            minDamage: 25,
            hitboxes: {
                head: true,
                chest: true,
                stomach: true,
                pelvis: true,
                arms: false,
                legs: false
            },
            backtrack: true,
            backtrackTicks: 12,
            resolver: true,
            resolverMode: 'adaptive' // 'brute', 'lby', 'adaptive'
        };

        this.antiaim = {
            enabled: true,
            pitch: 'down', // 'down' (-89°), 'zero', 'up' (89°), 'jitter'
            yaw: 'backward', // 'backward', 'spin', 'jitter'
            spinSpeed: 15,
            desync: true,
            desyncAngle: 58, // Max desync delta in CS:GO is 58 degrees
            desyncSide: 1, // 1 for right, -1 for left
            lbyFlick: true,
            fakeLag: true,
            chokeTicks: 8 // Max 14 ticks
        };

        this.visuals = {
            espEnabled: true,
            box: true,
            boxColor: '#a4d037', // Skeet green
            name: true,
            health: true,
            weapon: true,
            skeleton: true,
            offscreen: true,
            bulletTracers: true,
            tracerColorLocal: '#00e5ff',
            tracerColorEnemy: '#ff0055',
            hitmarkers: true,
            damageIndicator: true,
            chams: true,
            chamsType: 'solid', // 'solid', 'wireframe', 'flat'
            chamsColorVis: '#a4d037',
            chamsColorWall: '#9d00ff',
            thirdperson: true,
            thirdpersonDist: 180,
            showFakeAngle: true // Renders ghost desync anti-aim model!
        };

        this.misc = {
            bunnyhop: true,
            autoStrafe: true,
            fov: 95,
            clanTag: 'gamesense',
            hitLog: true,
            watermark: true
        };

        this.presets = {
            'Skeet 2018 HvH': {
                ragebot: { enabled: true, silent: true, autoFire: true, autoWall: true, autoStop: true, autoScope: true, doubleTap: true, hitChance: 78, minDamage: 30, hitboxes: { head: true, chest: true, stomach: true, pelvis: true, arms: false, legs: false }, backtrack: true, backtrackTicks: 12, resolver: true, resolverMode: 'adaptive' },
                antiaim: { enabled: true, pitch: 'down', yaw: 'backward', spinSpeed: 15, desync: true, desyncAngle: 58, desyncSide: 1, lbyFlick: true, fakeLag: true, chokeTicks: 8 },
                visuals: { espEnabled: true, box: true, boxColor: '#a4d037', name: true, health: true, weapon: true, skeleton: true, offscreen: true, bulletTracers: true, tracerColorLocal: '#00e5ff', tracerColorEnemy: '#ff0055', hitmarkers: true, damageIndicator: true, chams: true, chamsType: 'solid', chamsColorVis: '#a4d037', chamsColorWall: '#9d00ff', thirdperson: true, thirdpersonDist: 180, showFakeAngle: true },
                misc: { bunnyhop: true, autoStrafe: true, fov: 95, clanTag: 'gamesense', hitLog: true }
            },
            'Neverlose Aggressive': {
                ragebot: { enabled: true, silent: true, autoFire: true, autoWall: true, autoStop: true, autoScope: true, doubleTap: true, hitChance: 65, minDamage: 20, hitboxes: { head: true, chest: true, stomach: true, pelvis: true, arms: true, legs: false }, backtrack: true, backtrackTicks: 14, resolver: true, resolverMode: 'brute' },
                antiaim: { enabled: true, pitch: 'down', yaw: 'jitter', spinSpeed: 25, desync: true, desyncAngle: 58, desyncSide: -1, lbyFlick: true, fakeLag: true, chokeTicks: 12 },
                visuals: { espEnabled: true, box: true, boxColor: '#00d0ff', name: true, health: true, weapon: true, skeleton: true, offscreen: true, bulletTracers: true, tracerColorLocal: '#00ffff', tracerColorEnemy: '#ff0033', hitmarkers: true, damageIndicator: true, chams: true, chamsType: 'wireframe', chamsColorVis: '#00d0ff', chamsColorWall: '#ff00aa', thirdperson: true, thirdpersonDist: 190, showFakeAngle: true },
                misc: { bunnyhop: true, autoStrafe: true, fov: 100, clanTag: 'neverlose', hitLog: true }
            },
            'Scout Tap God': {
                ragebot: { enabled: true, silent: true, autoFire: true, autoWall: false, autoStop: true, autoScope: true, doubleTap: false, hitChance: 85, minDamage: 70, hitboxes: { head: true, chest: false, stomach: false, pelvis: false, arms: false, legs: false }, backtrack: true, backtrackTicks: 16, resolver: true, resolverMode: 'adaptive' },
                antiaim: { enabled: true, pitch: 'down', yaw: 'spin', spinSpeed: 30, desync: true, desyncAngle: 55, desyncSide: 1, lbyFlick: false, fakeLag: true, chokeTicks: 6 },
                visuals: { espEnabled: true, box: true, boxColor: '#ffff00', name: true, health: true, weapon: true, skeleton: true, offscreen: true, bulletTracers: true, tracerColorLocal: '#ffe600', tracerColorEnemy: '#ff3300', hitmarkers: true, damageIndicator: true, chams: true, chamsType: 'flat', chamsColorVis: '#ffff00', chamsColorWall: '#ff0055', thirdperson: true, thirdpersonDist: 160, showFakeAngle: true },
                misc: { bunnyhop: true, autoStrafe: true, fov: 90, clanTag: 'onetap', hitLog: true }
            },
            'Legit (Irony)': {
                ragebot: { enabled: false, silent: false, autoFire: false, autoWall: false, autoStop: false, autoScope: false, doubleTap: false, hitChance: 0, minDamage: 1, hitboxes: { head: true, chest: true, stomach: true, pelvis: true, arms: true, legs: true }, backtrack: false, backtrackTicks: 0, resolver: false, resolverMode: 'brute' },
                antiaim: { enabled: false, pitch: 'zero', yaw: 'backward', spinSpeed: 0, desync: false, desyncAngle: 0, desyncSide: 1, lbyFlick: false, fakeLag: false, chokeTicks: 1 },
                visuals: { espEnabled: true, box: true, boxColor: '#ffffff', name: true, health: true, weapon: false, skeleton: false, offscreen: false, bulletTracers: false, tracerColorLocal: '#ffffff', tracerColorEnemy: '#ffffff', hitmarkers: true, damageIndicator: false, chams: false, chamsType: 'solid', chamsColorVis: '#ffffff', chamsColorWall: '#ffffff', thirdperson: false, thirdpersonDist: 150, showFakeAngle: false },
                misc: { bunnyhop: true, autoStrafe: false, fov: 90, clanTag: 'hvh.party', hitLog: true }
            }
        };
    }

    applyPreset(name) {
        if (!this.presets[name]) return;
        const p = JSON.parse(JSON.stringify(this.presets[name]));
        this.ragebot = Object.assign(this.ragebot, p.ragebot);
        this.antiaim = Object.assign(this.antiaim, p.antiaim);
        this.visuals = Object.assign(this.visuals, p.visuals);
        this.misc = Object.assign(this.misc, p.misc);
    }

    exportJSON() {
        return JSON.stringify({
            ragebot: this.ragebot,
            antiaim: this.antiaim,
            visuals: this.visuals,
            misc: this.misc
        }, null, 2);
    }

    importJSON(str) {
        try {
            const data = JSON.parse(str);
            if (data.ragebot) this.ragebot = Object.assign(this.ragebot, data.ragebot);
            if (data.antiaim) this.antiaim = Object.assign(this.antiaim, data.antiaim);
            if (data.visuals) this.visuals = Object.assign(this.visuals, data.visuals);
            if (data.misc) this.misc = Object.assign(this.misc, data.misc);
            return true;
        } catch (e) {
            console.error("Failed to parse config JSON", e);
            return false;
        }
    }
}

window.cheatConfig = new CheatConfig();
