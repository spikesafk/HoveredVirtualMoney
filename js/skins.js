// CS:GO HvH Skinchanger & Procedural Skin Textures Engine
class SkinManager {
    constructor() {
        this.currentSkins = {
            scout: 'dragonfire',
            scar20: 'bloodsport',
            awp: 'dragonlore',
            deagle: 'printstream',
            duals: 'cobalt',
            knifeType: 'karambit',
            knifeSkin: 'doppler_ruby',
            agent: 'ct_fbi',
            nickname: localStorage.getItem('hvh_nick') || 'HvH_God_2018',
            avatar: localStorage.getItem('hvh_avatar') || 'skeet'
        };

        this.skinCache = new Map();
        this.loadSavedSkins();
    }

    loadSavedSkins() {
        try {
            const saved = localStorage.getItem('hvh_skins_cfg');
            if (saved) {
                const parsed = JSON.parse(saved);
                this.currentSkins = Object.assign(this.currentSkins, parsed);
            }
        } catch (e) {
            console.warn("Failed to load saved skins", e);
        }
    }

    saveSkins() {
        try {
            localStorage.setItem('hvh_skins_cfg', JSON.stringify(this.currentSkins));
            localStorage.setItem('hvh_nick', this.currentSkins.nickname);
            localStorage.setItem('hvh_avatar', this.currentSkins.avatar);
        } catch (e) {}
    }

    // Procedural Skin Texture Generator (No external PNG downloads needed!)
    getSkinMaterial(weaponId, skinId) {
        const cacheKey = `${weaponId}_${skinId}`;
        if (this.skinCache.has(cacheKey)) {
            return this.skinCache.get(cacheKey);
        }

        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');

        let roughness = 0.3;
        let metalness = 0.5;

        if (skinId === 'dragonfire') {
            // SSG 08 Dragonfire - fiery scales, raging flame gradient
            const grad = ctx.createLinearGradient(0, 0, 512, 512);
            grad.addColorStop(0, '#ff1100');
            grad.addColorStop(0.4, '#ff6600');
            grad.addColorStop(0.8, '#ffbb00');
            grad.addColorStop(1, '#1a0000');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, 512, 512);

            // Scales
            ctx.fillStyle = 'rgba(255, 220, 100, 0.4)';
            for (let y = 0; y < 512; y += 32) {
                for (let x = 0; x < 512; x += 32) {
                    ctx.beginPath();
                    ctx.arc(x + ((y % 64 === 0) ? 16 : 0), y, 12, 0, Math.PI);
                    ctx.fill();
                }
            }
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 36px monospace';
            ctx.fillText('DRAGONFIRE', 120, 260);
            roughness = 0.25;
            metalness = 0.6;
        } else if (skinId === 'dragonlore') {
            // AWP Dragon Lore - Rich regal gold with green dragon motif
            const grad = ctx.createLinearGradient(0, 0, 512, 512);
            grad.addColorStop(0, '#f5c542');
            grad.addColorStop(0.5, '#c99718');
            grad.addColorStop(1, '#664d08');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, 512, 512);

            // Celtic knotwork & dragon emblem
            ctx.strokeStyle = '#2d6a4f';
            ctx.lineWidth = 14;
            ctx.strokeRect(30, 30, 452, 452);
            ctx.strokeRect(60, 60, 392, 392);

            ctx.fillStyle = '#1b4332';
            ctx.font = 'bold 44px serif';
            ctx.textAlign = 'center';
            ctx.fillText('DRAGON LORE', 256, 260);
            ctx.fillText('2018 SKEET EDITION', 256, 320);
            roughness = 0.2;
            metalness = 0.8;
        } else if (skinId === 'bloodsport') {
            // SCAR-20 Bloodsport - aggressive racing red & white decals
            ctx.fillStyle = '#b30000';
            ctx.fillRect(0, 0, 512, 512);

            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 80, 512, 60);
            ctx.fillRect(0, 340, 512, 40);

            ctx.fillStyle = '#111111';
            ctx.font = 'bold 48px sans-serif';
            ctx.fillText('BLOODSPORT // 04', 30, 130);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 30px monospace';
            ctx.fillText('VOLTAGE / AUTO-WALL 100%', 30, 240);
            ctx.fillText('TARGET ACQUIRED', 30, 300);
            roughness = 0.3;
            metalness = 0.4;
        } else if (skinId === 'printstream') {
            // Deagle Printstream - Pearlescent white with XX iridescent holographic decals
            const grad = ctx.createLinearGradient(0, 0, 512, 512);
            grad.addColorStop(0, '#f0f4f8');
            grad.addColorStop(0.5, '#e2e8f0');
            grad.addColorStop(1, '#cbd5e1');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, 512, 512);

            ctx.fillStyle = '#111827';
            ctx.fillRect(40, 180, 432, 100);

            ctx.fillStyle = '#00ffcc';
            ctx.font = 'bold 64px monospace';
            ctx.fillText('X X X X', 120, 255);

            ctx.fillStyle = '#ff00aa';
            ctx.font = 'bold 24px monospace';
            ctx.fillText('PRINTSTREAM // DEAGLE', 60, 340);
            roughness = 0.15;
            metalness = 0.85;
        } else if (skinId === 'doppler_ruby') {
            // Knife Doppler Ruby - Glossy crystal blood-red
            const grad = ctx.createRadialGradient(256, 256, 30, 256, 256, 300);
            grad.addColorStop(0, '#ff1a40');
            grad.addColorStop(0.6, '#b3001e');
            grad.addColorStop(1, '#3b0008');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, 512, 512);

            ctx.strokeStyle = '#ff6680';
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.arc(256, 256, 180, 0, Math.PI * 2);
            ctx.stroke();
            roughness = 0.1;
            metalness = 0.95;
        } else if (skinId === 'doppler_sapphire') {
            // Knife Doppler Sapphire - Electric royal blue gem
            const grad = ctx.createRadialGradient(256, 256, 30, 256, 256, 300);
            grad.addColorStop(0, '#00d4ff');
            grad.addColorStop(0.6, '#0044ff');
            grad.addColorStop(1, '#00083b');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, 512, 512);

            ctx.strokeStyle = '#80e5ff';
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.arc(256, 256, 180, 0, Math.PI * 2);
            ctx.stroke();
            roughness = 0.1;
            metalness = 0.95;
        } else if (skinId === 'fade') {
            // 100% Fade - Purple to Pink to Amber gold
            const grad = ctx.createLinearGradient(0, 0, 512, 512);
            grad.addColorStop(0, '#7b2cbf');
            grad.addColorStop(0.4, '#f72585');
            grad.addColorStop(0.8, '#ffb703');
            grad.addColorStop(1, '#fb8500');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, 512, 512);
            roughness = 0.15;
            metalness = 0.9;
        } else if (skinId === 'asiimov') {
            // AWP Asiimov - Iconic sci-fi white, orange, and matte black
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, 512, 512);

            ctx.fillStyle = '#ff6600';
            ctx.beginPath();
            ctx.moveTo(0, 0); ctx.lineTo(300, 0); ctx.lineTo(150, 250); ctx.lineTo(0, 250);
            ctx.fill();

            ctx.fillStyle = '#1e1e1e';
            ctx.beginPath();
            ctx.moveTo(512, 512); ctx.lineTo(250, 512); ctx.lineTo(350, 300); ctx.lineTo(512, 300);
            ctx.fill();

            ctx.fillStyle = '#ff6600';
            ctx.fillRect(200, 360, 250, 40);

            ctx.fillStyle = '#111111';
            ctx.font = 'bold 36px sans-serif';
            ctx.fillText('ASIIMOV // 01', 200, 330);
            roughness = 0.4;
            metalness = 0.1;
        } else {
            // Default / Clean matte
            ctx.fillStyle = '#1e232a';
            ctx.fillRect(0, 0, 512, 512);
            ctx.strokeStyle = '#3a4452';
            ctx.lineWidth = 8;
            ctx.strokeRect(10, 10, 492, 492);
            roughness = 0.5;
            metalness = 0.5;
        }

        const texture = new THREE.CanvasTexture(canvas);
        const mat = new THREE.MeshStandardMaterial({
            map: texture,
            roughness: roughness,
            metalness: metalness
        });

        this.skinCache.set(cacheKey, mat);
        return mat;
    }
}

window.skinManager = new SkinManager();
