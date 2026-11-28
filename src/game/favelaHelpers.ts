export interface FavelaParallaxShifts {
  farShift: number;
  hillsShift: number;
  crowdShift: number;
  midShift: number;
  floorShift: number;
}

export function clampFavela(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

/**
 * 5-layer horizontal parallax offsets clamped cleanly inside each layer's
 * horizontal safety padding (20px far/hills/mid, 30px floor) so extreme corner
 * camera pans never expose blank canvas edges.
 */
export function computeFavelaParallaxShifts(cameraXOffset: number): FavelaParallaxShifts {
  return {
    farShift: clampFavela(-cameraXOffset * 0.1, -18, 18),
    hillsShift: clampFavela(-cameraXOffset * 0.24, -19, 19),
    crowdShift: clampFavela(-cameraXOffset * 0.42, -20, 20),
    midShift: clampFavela(-cameraXOffset * 0.45, -20, 20),
    floorShift: clampFavela(-cameraXOffset * 0.85, -30, 30),
  };
}

export type SpectatorZone = 'balcony' | 'fence';

export interface FavelaSpectatorSpec {
  id: number;
  zone: SpectatorZone;
  x: number;
  baseY: number;
  height: number;
  width: number;
  seed: number;
  jumpGroup: boolean;
  twoArms: boolean;
  hasCap: boolean;
  shirtColor: string;
  shirtShade: string;
  skinColor: string;
}

export interface FavelaSpectatorPose {
  x: number;
  y: number;
  shoulderY: number;
  headY: number;
  jumpOffset: number;
  headBob: number;
  leftArmRaise: number;
  rightArmRaise: number;
}

export const FAVELA_CROWD_SPECS: readonly FavelaSpectatorSpec[] = [
  // Left balcony spectators behind the FAVELA concrete wall (feet at ~150, heads at ~124..130)
  { id: 0, zone: 'balcony', x: 65, baseY: 150, height: 26, width: 9, seed: 0.4, jumpGroup: false, twoArms: false, hasCap: true, shirtColor: '#1b2236', shirtShade: '#101424', skinColor: '#9e6547' },
  { id: 1, zone: 'balcony', x: 77, baseY: 151, height: 27, width: 10, seed: 1.3, jumpGroup: true, twoArms: true, hasCap: false, shirtColor: '#23283d', shirtShade: '#131727', skinColor: '#875339' },
  { id: 2, zone: 'balcony', x: 89, baseY: 150, height: 25, width: 9, seed: 2.2, jumpGroup: false, twoArms: false, hasCap: false, shirtColor: '#1e253a', shirtShade: '#111524', skinColor: '#b57857' },
  { id: 3, zone: 'balcony', x: 118, baseY: 151, height: 27, width: 9, seed: 3.1, jumpGroup: true, twoArms: false, hasCap: true, shirtColor: '#21293f', shirtShade: '#131726', skinColor: '#965e41' },
  { id: 4, zone: 'balcony', x: 129, baseY: 150, height: 26, width: 9, seed: 4.0, jumpGroup: false, twoArms: true, hasCap: false, shirtColor: '#181e30', shirtShade: '#0d111e', skinColor: '#ab6e4e' },

  // Main fence spectators cheering behind the chain-link steel mesh (x: 152..386)
  // Heads sit naturally at y=130..136 above the fence top rail (y=148), torsos/legs behind the diamond wire mesh
  { id: 5, zone: 'fence', x: 153, baseY: 180, height: 47, width: 11, seed: 0.7, jumpGroup: true, twoArms: false, hasCap: true, shirtColor: '#1f263b', shirtShade: '#111525', skinColor: '#ad7150' },
  { id: 6, zone: 'fence', x: 168, baseY: 181, height: 49, width: 12, seed: 1.9, jumpGroup: false, twoArms: true, hasCap: false, shirtColor: '#252c43', shirtShade: '#141829', skinColor: '#8a553b' },
  { id: 7, zone: 'fence', x: 184, baseY: 180, height: 46, width: 11, seed: 2.8, jumpGroup: true, twoArms: false, hasCap: false, shirtColor: '#1c2336', shirtShade: '#101422', skinColor: '#bd7f5c' },
  { id: 8, zone: 'fence', x: 199, baseY: 181, height: 48, width: 11, seed: 3.6, jumpGroup: false, twoArms: false, hasCap: true, shirtColor: '#23293f', shirtShade: '#131728', skinColor: '#985f42' },
  { id: 9, zone: 'fence', x: 215, baseY: 180, height: 46, width: 11, seed: 4.5, jumpGroup: true, twoArms: true, hasCap: false, shirtColor: '#20273c', shirtShade: '#121625', skinColor: '#b07452' },
  { id: 10, zone: 'fence', x: 232, baseY: 181, height: 48, width: 12, seed: 5.4, jumpGroup: false, twoArms: false, hasCap: false, shirtColor: '#282f47', shirtShade: '#161a2c', skinColor: '#824e36' },
  { id: 11, zone: 'fence', x: 249, baseY: 180, height: 47, width: 11, seed: 6.1, jumpGroup: true, twoArms: false, hasCap: true, shirtColor: '#1b2236', shirtShade: '#0f1321', skinColor: '#b57856' },
  { id: 12, zone: 'fence', x: 266, baseY: 181, height: 48, width: 11, seed: 0.9, jumpGroup: false, twoArms: true, hasCap: false, shirtColor: '#242b42', shirtShade: '#141828', skinColor: '#965e41' },
  { id: 13, zone: 'fence', x: 283, baseY: 180, height: 46, width: 11, seed: 2.3, jumpGroup: true, twoArms: false, hasCap: false, shirtColor: '#1e253a', shirtShade: '#111524', skinColor: '#b07452' },
  { id: 14, zone: 'fence', x: 300, baseY: 181, height: 49, width: 12, seed: 3.9, jumpGroup: true, twoArms: true, hasCap: true, shirtColor: '#272e46', shirtShade: '#15192b', skinColor: '#88543a' },
  { id: 15, zone: 'fence', x: 317, baseY: 180, height: 45, width: 10, seed: 4.8, jumpGroup: false, twoArms: false, hasCap: false, shirtColor: '#1d2438', shirtShade: '#101423', skinColor: '#ba7c59' },
  { id: 16, zone: 'fence', x: 333, baseY: 181, height: 47, width: 11, seed: 5.9, jumpGroup: true, twoArms: false, hasCap: true, shirtColor: '#232a41', shirtShade: '#131727', skinColor: '#9a6144' },
  { id: 17, zone: 'fence', x: 350, baseY: 180, height: 48, width: 11, seed: 1.2, jumpGroup: false, twoArms: true, hasCap: false, shirtColor: '#20273c', shirtShade: '#121625', skinColor: '#8e583d' },
  { id: 18, zone: 'fence', x: 367, baseY: 181, height: 47, width: 11, seed: 2.6, jumpGroup: true, twoArms: false, hasCap: true, shirtColor: '#262d44', shirtShade: '#15192a', skinColor: '#af7250' },
  { id: 19, zone: 'fence', x: 382, baseY: 180, height: 46, width: 10, seed: 3.5, jumpGroup: false, twoArms: false, hasCap: false, shirtColor: '#1b2134', shirtShade: '#0f1320', skinColor: '#8a563c' },
];

/**
 * Evaluates smooth natural cheering / bouncing / jumping motion for a single spectator.
 */
export function evaluateFavelaSpectator(
  spec: FavelaSpectatorSpec,
  time: number
): FavelaSpectatorPose {
  const cheerPulse = 0.5 + 0.5 * Math.sin(time * 3.1 + spec.seed * 1.9);
  const armWave = Math.sin(time * 5.2 + spec.seed * 2.7);
  const armWaveAlt = Math.cos(time * 4.6 + spec.seed * 1.4);

  // Periodic natural jump hops for jumpGroup spectators (staggered, not robotic)
  let jumpOffset = 0;
  if (spec.jumpGroup) {
    const cycle = (((time * 0.72 + spec.seed * 0.63) % 2.4) + 2.4) % 2.4;
    if (cycle < 0.52) {
      jumpOffset = Math.sin((cycle / 0.52) * Math.PI) * 3.8;
    }
  }

  const headBob = Math.sin(time * 3.8 + spec.seed * 2.1) * 0.65 + (jumpOffset > 0.5 ? 0.45 : 0);
  const leftArmRaise = clampFavela(0.35 + cheerPulse * 0.45 + armWave * 0.35, 0, 1);
  const rightArmRaise = spec.twoArms
    ? clampFavela(0.4 + cheerPulse * 0.45 + armWaveAlt * 0.35, 0, 1)
    : clampFavela(0.15 + Math.max(0, armWaveAlt) * 0.5, 0, 1);

  const y = spec.baseY - jumpOffset;
  const headY = y - spec.height + headBob;
  const shoulderY = y - spec.height + 7;

  return {
    x: spec.x,
    y,
    shoulderY,
    headY,
    jumpOffset,
    headBob,
    leftArmRaise,
    rightArmRaise,
  };
}

export interface HelicopterState {
  x: number;
  y: number;
  tilt: number;
  rotorSpanHalf: number;
  tailPulse: number;
}

/**
 * Smooth sky patrol + subtle altitude hover + spinning main & tail rotor cycle.
 */
export function evaluateHelicopterState(time: number): HelicopterState {
  // Patrols smoothly back and forth across the upper-left / center sky behind buildings/palms
  const patrol = Math.sin(time * 0.14);
  const x = 152 + patrol * 46;
  const y = 52 + Math.sin(time * 1.35) * 2.4 + Math.cos(time * 0.6) * 1.1;
  // Subtle forward nose pitch in direction of horizontal velocity
  const velSign = Math.cos(time * 0.14);
  const tilt = velSign * 0.035;
  // Spinning main rotor disc span shrinks and grows cleanly at high RPM
  const rotorSpanHalf = 6 + Math.abs(Math.cos(time * 42)) * 18;
  const tailPulse = 0.45 + 0.55 * Math.abs(Math.sin(time * 48));

  return {
    x,
    y,
    tilt,
    rotorSpanHalf,
    tailPulse,
  };
}

/**
 * Horizontal cloth wave displacement along a hanging flag strip.
 * Anchored firmly at rowNorm === 0 (top bracket/rod) so flags never detach.
 */
export function computeFlagWaveOffset(time: number, rowNorm: number, seed: number): number {
  const anchorWeight = clampFavela(rowNorm, 0, 1);
  if (anchorWeight <= 0) return 0;
  const gust = Math.sin(time * 2.6 - rowNorm * 3.4 + seed) * 1.9;
  const ripple = Math.sin(time * 5.3 - rowNorm * 5.1 + seed * 1.7) * 0.65;
  return (gust + ripple) * anchorWeight;
}

/**
 * Rhythmic subtle subwoofer cone expansion matching the street sound system.
 */
export function computeSpeakerPulse(time: number): number {
  const beat = (((time * 1.95) % 1) + 1) % 1;
  const thump = beat < 0.22 ? Math.sin((beat / 0.22) * Math.PI) : 0;
  const sub = beat >= 0.48 && beat < 0.65 ? Math.sin(((beat - 0.48) / 0.17) * Math.PI) * 0.55 : 0;
  return clampFavela(thump + sub, 0, 1);
}
