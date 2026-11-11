// Procedural Sound Effects via Web Audio API - Zero external dependencies!
class SoundFX {
    constructor() {
        this.ctx = null;
        this.volume = 0.4;
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioCtx();
            this.initialized = true;
        } catch (e) {
            console.warn("Web Audio API not supported", e);
        }
    }

    playShoot(type = 'scar20') {
        if (!this.ctx) this.init();
        if (!this.ctx) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const t = this.ctx.currentTime;
        const master = this.ctx.createGain();
        master.gain.setValueAtTime(this.volume, t);
        master.connect(this.ctx.destination);

        if (type === 'scar20') {
            // Punchy military DMR crack
            const osc = this.ctx.createOscillator();
            const oscGain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(320, t);
            osc.frequency.exponentialRampToValueAtTime(40, t + 0.12);
            oscGain.gain.setValueAtTime(0.8, t);
            oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
            osc.connect(oscGain);
            oscGain.connect(master);
            osc.start(t);
            osc.stop(t + 0.13);

            // Noise burst
            this._noiseBurst(t, 0.15, 800, 0.7, master);
        } else if (type === 'scout') {
            // High velocity crack
            const osc = this.ctx.createOscillator();
            const oscGain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(650, t);
            osc.frequency.exponentialRampToValueAtTime(80, t + 0.18);
            oscGain.gain.setValueAtTime(0.9, t);
            oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.18);
            osc.connect(oscGain);
            oscGain.connect(master);
            osc.start(t);
            osc.stop(t + 0.19);

            this._noiseBurst(t, 0.22, 1200, 0.8, master);
        } else if (type === 'awp') {
            // Massive deep boom
            const osc = this.ctx.createOscillator();
            const oscGain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(260, t);
            osc.frequency.exponentialRampToValueAtTime(30, t + 0.35);
            oscGain.gain.setValueAtTime(1.0, t);
            oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.35);
            osc.connect(oscGain);
            oscGain.connect(master);
            osc.start(t);
            osc.stop(t + 0.36);

            this._noiseBurst(t, 0.45, 600, 1.0, master);
        } else if (type === 'deagle') {
            // Handcannon slap
            const osc = this.ctx.createOscillator();
            const oscGain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(450, t);
            osc.frequency.exponentialRampToValueAtTime(50, t + 0.2);
            oscGain.gain.setValueAtTime(0.95, t);
            oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
            osc.connect(oscGain);
            oscGain.connect(master);
            osc.start(t);
            osc.stop(t + 0.21);

            this._noiseBurst(t, 0.25, 900, 0.75, master);
        } else {
            // Duals / default
            const osc = this.ctx.createOscillator();
            const oscGain = this.ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(400, t);
            osc.frequency.exponentialRampToValueAtTime(60, t + 0.1);
            oscGain.gain.setValueAtTime(0.6, t);
            oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
            osc.connect(oscGain);
            oscGain.connect(master);
            osc.start(t);
            osc.stop(t + 0.11);

            this._noiseBurst(t, 0.1, 1400, 0.5, master);
        }
    }

    _noiseBurst(time, duration, filterFreq, gainAmt, destination) {
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }

        const whiteNoise = this.ctx.createBufferSource();
        whiteNoise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(filterFreq, time);
        filter.frequency.exponentialRampToValueAtTime(80, time + duration);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(gainAmt, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + duration);

        whiteNoise.connect(filter);
        filter.connect(gain);
        gain.connect(destination);

        whiteNoise.start(time);
        whiteNoise.stop(time + duration);
    }

    // Legendary Skeet / Gamesense hitsound (metallic crystal ping)
    playHitSound(isHeadshot = false) {
        if (!this.ctx) this.init();
        if (!this.ctx) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const t = this.ctx.currentTime;
        const master = this.ctx.createGain();
        master.gain.setValueAtTime(this.volume * 0.9, t);
        master.connect(this.ctx.destination);

        if (isHeadshot) {
            // High crisp Bell / Dink
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(2450, t);
            osc.frequency.exponentialRampToValueAtTime(1800, t + 0.15);

            gain.gain.setValueAtTime(0.9, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

            osc.connect(gain);
            gain.connect(master);
            osc.start(t);
            osc.stop(t + 0.23);

            // Second harmonic overtone
            const osc2 = this.ctx.createOscillator();
            const gain2 = this.ctx.createGain();
            osc2.type = 'triangle';
            osc2.frequency.setValueAtTime(4200, t);
            gain2.gain.setValueAtTime(0.4, t);
            gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
            osc2.connect(gain2);
            gain2.connect(master);
            osc2.start(t);
            osc2.stop(t + 0.13);
        } else {
            // Body hitmarker tick
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(1200, t);
            osc.frequency.exponentialRampToValueAtTime(400, t + 0.08);

            gain.gain.setValueAtTime(0.7, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

            osc.connect(gain);
            gain.connect(master);
            osc.start(t);
            osc.stop(t + 0.09);
        }
    }

    playJump() {
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(110, t);
        osc.frequency.exponentialRampToValueAtTime(220, t + 0.1);
        gain.gain.setValueAtTime(this.volume * 0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.1);
    }

    playScope() {
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, t);
        osc.frequency.setValueAtTime(1200, t + 0.03);
        gain.gain.setValueAtTime(this.volume * 0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.07);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.08);
    }
}

window.soundFX = new SoundFX();
