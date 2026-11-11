// Procedural Textures & Materials for Three.js (No external asset downloads needed!)
class TextureFactory {
    static createDevGrid(primaryColor = '#e07a22', secondaryColor = '#b85f14', lineColor = '#ffffff') {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');

        // Background
        ctx.fillStyle = primaryColor;
        ctx.fillRect(0, 0, 512, 512);

        // Inner tile
        ctx.fillStyle = secondaryColor;
        ctx.fillRect(16, 16, 480, 480);

        // Grid lines
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = 4;
        ctx.strokeRect(16, 16, 480, 480);

        // Cross in center
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(256, 16); ctx.lineTo(256, 496);
        ctx.moveTo(16, 256); ctx.lineTo(496, 256);
        ctx.stroke();

        // Measurement text
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 32px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('DEV 128', 256, 140);
        ctx.fillText('HVH', 256, 380);

        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        return tex;
    }

    static createFloorGrid() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#22262a';
        ctx.fillRect(0, 0, 512, 512);

        ctx.fillStyle = '#2b3036';
        ctx.fillRect(8, 8, 496, 496);

        ctx.strokeStyle = '#3e464f';
        ctx.lineWidth = 3;
        ctx.strokeRect(8, 8, 496, 496);

        ctx.strokeStyle = '#4e5863';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(256, 8); ctx.lineTo(256, 504);
        ctx.moveTo(8, 256); ctx.lineTo(504, 256);
        ctx.stroke();

        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        return tex;
    }

    static createCrateTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#7a5a3a';
        ctx.fillRect(0, 0, 512, 512);

        // Frame
        ctx.fillStyle = '#5c4125';
        ctx.fillRect(20, 20, 472, 472);

        // Diagonal braces
        ctx.strokeStyle = '#422e17';
        ctx.lineWidth = 36;
        ctx.beginPath();
        ctx.moveTo(30, 30); ctx.lineTo(482, 482);
        ctx.moveTo(482, 30); ctx.lineTo(30, 482);
        ctx.stroke();

        ctx.strokeStyle = '#a68058';
        ctx.lineWidth = 8;
        ctx.strokeRect(30, 30, 452, 452);

        // Stencil text
        ctx.fillStyle = '#ffaa33';
        ctx.font = 'bold 48px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('CS:GO', 256, 220);
        ctx.fillText('HVH-CRATE', 256, 310);

        const tex = new THREE.CanvasTexture(canvas);
        return tex;
    }

    static createWallbangWoodTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');

        // Plywood / thin partition look
        ctx.fillStyle = '#a67c52';
        ctx.fillRect(0, 0, 512, 512);

        ctx.fillStyle = '#8f653b';
        for (let i = 0; i < 512; i += 64) {
            ctx.fillRect(i, 0, 4, 512);
        }

        ctx.fillStyle = '#222';
        ctx.font = 'bold 32px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('[ PENETRABLE ]', 256, 260);

        const tex = new THREE.CanvasTexture(canvas);
        return tex;
    }

    static createMirageSandstone() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');

        // Warm desert sandstone bricks
        ctx.fillStyle = '#d9b48f';
        ctx.fillRect(0, 0, 512, 512);

        ctx.strokeStyle = '#b8926d';
        ctx.lineWidth = 4;

        // Brick pattern
        const rowH = 64;
        const brickW = 128;
        for (let y = 0; y < 512; y += rowH) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(512, y);
            ctx.stroke();

            const offset = (y % (rowH * 2) === 0) ? 0 : brickW / 2;
            for (let x = offset; x < 512 + brickW; x += brickW) {
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(x, y + rowH);
                ctx.stroke();
            }
        }

        ctx.fillStyle = 'rgba(0,0,0,0.06)';
        for (let i = 0; i < 200; i++) {
            ctx.fillRect(Math.random() * 512, Math.random() * 512, 3, 3);
        }

        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        return tex;
    }

    static createMirageFloor() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');

        // Mirage pavement stone tiles
        ctx.fillStyle = '#c4a682';
        ctx.fillRect(0, 0, 512, 512);

        ctx.strokeStyle = '#9c7f5f';
        ctx.lineWidth = 3;
        for (let x = 0; x < 512; x += 64) {
            ctx.beginPath();
            ctx.moveTo(x, 0); ctx.lineTo(x, 512);
            ctx.stroke();
        }
        for (let y = 0; y < 512; y += 64) {
            ctx.beginPath();
            ctx.moveTo(0, y); ctx.lineTo(512, y);
            ctx.stroke();
        }

        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        return tex;
    }
}

window.TextureFactory = TextureFactory;
