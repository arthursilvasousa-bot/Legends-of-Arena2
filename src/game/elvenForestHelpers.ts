export interface ElvenParallaxShifts {
  farShift: number;
  castleShift: number;
  midShift: number;
  gnomeShift: number;
  floorShift: number;
}

export function clampValue(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export function smoothStep(edge0: number, edge1: number, x: number): number {
  const t = clampValue((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

/**
 * 6-layer parallax offsets clamped strictly within each layer's horizontal pad
 * so edges never reveal gaps during extreme corner camera pans.
 */
export function computeElvenParallaxShifts(cameraXOffset: number): ElvenParallaxShifts {
  return {
    farShift: clampValue(-cameraXOffset * 0.08, -18, 18),
    castleShift: clampValue(-cameraXOffset * 0.17, -19, 19),
    midShift: clampValue(-cameraXOffset * 0.36, -20, 20),
    gnomeShift: clampValue(-cameraXOffset * 0.36, -20, 20),
    floorShift: clampValue(-cameraXOffset * 0.85, -30, 30),
  };
}

export type GnomeBehaviorMode = 'peek_side' | 'peek_vertical' | 'watch_and_hide';

export interface GnomeSpec {
  id: string;
  x: number;
  y: number;
  mode: GnomeBehaviorMode;
  cyclePeriod: number;
  phaseOffset: number;
  peekX: number;
  peekY: number;
  scale: number;
  baseFacing: 1 | -1;
}

export interface GnomePoseState {
  /** 0 = tucked behind cover, 1 = peeking out observing the duel */
  visibility: number;
  offsetX: number;
  offsetY: number;
  headTilt: number;
  /** -1 looking left, +1 looking right toward active fighters */
  lookDir: number;
  /** 1 = eyes open, 0 = momentary blink */
  eyeOpen: number;
  handWave: number;
}

export const ELVEN_GNOME_SPECS: readonly GnomeSpec[] = [
  {
    id: 'gnome_left_trunk',
    x: 11,
    y: 78,
    mode: 'peek_side',
    cyclePeriod: 9.5,
    phaseOffset: 0.4,
    peekX: 5.5,
    peekY: -1.0,
    scale: 1,
    baseFacing: 1,
  },
  {
    id: 'gnome_right_rock_low',
    x: 400,
    y: 180,
    mode: 'watch_and_hide',
    cyclePeriod: 11.2,
    phaseOffset: 3.1,
    peekX: -2.0,
    peekY: -4.2,
    scale: 0.94,
    baseFacing: -1,
  },
  {
    id: 'gnome_right_trunk_high',
    x: 438,
    y: 144,
    mode: 'peek_side',
    cyclePeriod: 10.4,
    phaseOffset: 6.2,
    peekX: -3.8,
    peekY: -1.8,
    scale: 0.96,
    baseFacing: -1,
  },
  {
    id: 'gnome_left_sign_bush',
    x: 78,
    y: 168,
    mode: 'watch_and_hide',
    cyclePeriod: 12.6,
    phaseOffset: 5.4,
    peekX: 2.2,
    peekY: -5.0,
    scale: 0.84,
    baseFacing: 1,
  },
  {
    id: 'gnome_bridge_watcher',
    x: 304,
    y: 141,
    mode: 'peek_vertical',
    cyclePeriod: 13.8,
    phaseOffset: 8.7,
    peekX: 0,
    peekY: -4.5,
    scale: 0.72,
    baseFacing: -1,
  },
];

/**
 * Pure deterministic gnome peek/watch/hide animation & fighter-tracking state.
 * Gnomes stay strictly in background layers and never interfere with hitboxes.
 */
export function evaluateGnomeBehavior(
  gnome: GnomeSpec,
  time: number,
  focusX: number
): GnomePoseState {
  const safePeriod = Math.max(2, gnome.cyclePeriod);
  const phase = (((time + gnome.phaseOffset) % safePeriod) + safePeriod) % safePeriod;
  const u = phase / safePeriod;

  // Periodic cycle: emerge -> watch fighters -> subtle reaction -> tuck back behind cover
  let visibility = 0.25;
  if (gnome.mode === 'watch_and_hide') {
    if (u < 0.16) {
      visibility = smoothStep(0.02, 0.16, u);
    } else if (u < 0.62) {
      visibility = 1;
    } else if (u < 0.78) {
      visibility = 1 - smoothStep(0.62, 0.78, u);
    } else {
      visibility = 0;
    }
  } else if (gnome.mode === 'peek_vertical') {
    if (u < 0.2) {
      visibility = 0.08 + 0.92 * smoothStep(0.04, 0.2, u);
    } else if (u < 0.56) {
      visibility = 1;
    } else if (u < 0.74) {
      visibility = 1 - 0.92 * smoothStep(0.56, 0.74, u);
    } else {
      visibility = 0.08;
    }
  } else {
    // Always partially visible beside trunk, leaning out further while fighters engage
    if (u < 0.22) {
      visibility = 0.42 + 0.58 * smoothStep(0.03, 0.22, u);
    } else if (u < 0.68) {
      visibility = 1;
    } else if (u < 0.86) {
      visibility = 1 - 0.58 * smoothStep(0.68, 0.86, u);
    } else {
      visibility = 0.42;
    }
  }

  const idleBob = Math.sin(time * 2.1 + gnome.phaseOffset) * 0.45 * visibility;
  const dx = focusX - gnome.x;
  const lookDir = clampValue(dx / 150, -1, 1);

  // Occasional subtle glance & head nod following combat movement
  const headTilt =
    lookDir * 0.055 * visibility + Math.sin(time * 1.45 + gnome.phaseOffset * 1.7) * 0.03;

  // Natural blink roughly every ~4.3s for ~0.14s
  const blinkCycle = (((time + gnome.phaseOffset * 1.9) % 4.3) + 4.3) % 4.3;
  const eyeOpen = blinkCycle > 4.16 ? 0 : 1;

  // Discrete hand/pipe/lantern-wave micro-gesture while peeking
  const handWave = Math.sin(time * 3.4 + gnome.phaseOffset) * visibility;

  return {
    visibility,
    offsetX: gnome.peekX * visibility + lookDir * 0.85 * visibility,
    offsetY: gnome.peekY * visibility + idleBob,
    headTilt,
    lookDir,
    eyeOpen,
    handWave,
  };
}

export interface ButterflySpec {
  id: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  cyclePeriod: number;
  activeDuration: number;
  phaseOffset: number;
  colorPrimary: string;
  colorGlow: string;
}

export interface ButterflyState {
  visible: boolean;
  x: number;
  y: number;
  wingScaleX: number;
  alpha: number;
  heading: number;
}

export const ELVEN_BUTTERFLIES: readonly ButterflySpec[] = [
  {
    id: 0,
    startX: 38,
    startY: 146,
    endX: 192,
    endY: 118,
    cyclePeriod: 15,
    activeDuration: 7.2,
    phaseOffset: 1.0,
    colorPrimary: '#7dd3fc',
    colorGlow: '#c084fc',
  },
  {
    id: 1,
    startX: 438,
    startY: 162,
    endX: 282,
    endY: 132,
    cyclePeriod: 18,
    activeDuration: 7.8,
    phaseOffset: 6.5,
    colorPrimary: '#f0abfc',
    colorGlow: '#67e8f9',
  },
  {
    id: 2,
    startX: 162,
    startY: 184,
    endX: 332,
    endY: 166,
    cyclePeriod: 21,
    activeDuration: 6.6,
    phaseOffset: 12.2,
    colorPrimary: '#fde047',
    colorGlow: '#38bdf8',
  },
];

export function evaluateButterflyState(
  spec: ButterflySpec,
  time: number
): ButterflyState {
  const safePeriod = Math.max(4, spec.cyclePeriod);
  const phase = (((time + spec.phaseOffset) % safePeriod) + safePeriod) % safePeriod;
  if (phase > spec.activeDuration) {
    return {
      visible: false,
      x: spec.startX,
      y: spec.startY,
      wingScaleX: 1,
      alpha: 0,
      heading: 0,
    };
  }

  const t = clampValue(phase / spec.activeDuration, 0, 1);
  const arc = Math.sin(t * Math.PI);
  const flutterX = Math.sin(time * 2.9 + spec.id * 2.1) * 9;
  const flutterY = Math.sin(time * 4.4 + spec.id * 1.7) * 5 - arc * 16;

  const x = spec.startX + (spec.endX - spec.startX) * smoothStep(0, 1, t) + flutterX;
  const y = spec.startY + (spec.endY - spec.startY) * t + flutterY;

  const fadeIn = smoothStep(0, 0.14, t);
  const fadeOut = 1 - smoothStep(0.84, 1, t);
  const rawAlpha = clampValue(fadeIn * fadeOut, 0, 1);
  const visible = rawAlpha > 0.02;
  const alpha = visible ? rawAlpha : 0;

  const wingScaleX = 0.25 + 0.75 * Math.abs(Math.cos(time * 15 + spec.id * 1.9));
  const heading = (spec.endX >= spec.startX ? 1 : -1) * 0.22 + Math.cos(time * 3.1) * 0.14;

  return {
    visible,
    x,
    y,
    wingScaleX,
    alpha,
    heading,
  };
}

export function computeLanternFlicker(time: number, seed: number): number {
  return clampValue(
    0.84 + 0.1 * Math.sin(time * 7.8 + seed * 2.1) + 0.06 * Math.cos(time * 15.4 + seed * 1.3),
    0.68,
    1.05
  );
}

export function computeMushroomPulse(time: number, seed: number): number {
  return clampValue(0.65 + 0.35 * Math.sin(time * 1.85 + seed * 1.6), 0.3, 1.0);
}
