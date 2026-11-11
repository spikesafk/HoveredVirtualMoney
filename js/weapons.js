// CS:GO HvH Weapons Database and Mechanics
const WEAPONS = {
    scar20: {
        id: 'scar20',
        name: 'SCAR-20 Auto',
        type: 'sniper_auto',
        damage: 80,
        penetrationPower: 0.85, // Penetrates wooden cover easily
        fireRate: 0.24, // seconds between shots
        magSize: 20,
        reloadTime: 2.5,
        spread: 0.002, // Very low spread scoped
        inAirInaccuracy: 0.08,
        headshotMultiplier: 4.0,
        scopedFov: 35,
        canDoubleTap: true,
        soundType: 'scar20',
        recoil: 0.02
    },
    scout: {
        id: 'scout',
        name: 'SSG 08 Scout',
        type: 'sniper_bolt',
        damage: 88,
        penetrationPower: 0.65,
        fireRate: 1.25,
        magSize: 10,
        reloadTime: 2.8,
        spread: 0.001,
        inAirInaccuracy: 0.001, // Legendary CS:GO jump-scout feature: 100% accurate in mid-air!
        headshotMultiplier: 4.0,
        scopedFov: 32,
        canDoubleTap: false,
        soundType: 'scout',
        recoil: 0.04
    },
    awp: {
        id: 'awp',
        name: 'AWP Magnum',
        type: 'sniper_heavy',
        damage: 115,
        penetrationPower: 0.95,
        fireRate: 1.45,
        magSize: 10,
        reloadTime: 3.2,
        spread: 0.0005,
        inAirInaccuracy: 0.12,
        headshotMultiplier: 4.0,
        scopedFov: 25,
        canDoubleTap: false,
        soundType: 'awp',
        recoil: 0.07
    },
    deagle: {
        id: 'deagle',
        name: 'Desert Eagle',
        type: 'pistol_heavy',
        damage: 63,
        penetrationPower: 0.70,
        fireRate: 0.28,
        magSize: 7,
        reloadTime: 2.1,
        spread: 0.015,
        inAirInaccuracy: 0.06,
        headshotMultiplier: 4.0,
        scopedFov: null,
        canDoubleTap: true,
        soundType: 'deagle',
        recoil: 0.05
    },
    duals: {
        id: 'duals',
        name: 'Dual Berettas',
        type: 'pistol_dual',
        damage: 38,
        penetrationPower: 0.40,
        fireRate: 0.12,
        magSize: 30,
        reloadTime: 2.6,
        spread: 0.025,
        inAirInaccuracy: 0.04,
        headshotMultiplier: 4.0,
        scopedFov: null,
        canDoubleTap: false,
        soundType: 'duals',
        recoil: 0.015
    }
};

window.WEAPONS = WEAPONS;
