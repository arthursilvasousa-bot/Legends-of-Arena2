export type TitleMenuItemId = 'play' | 'versus' | 'tournament' | 'settings' | 'howto';

export interface TitleMenuItem {
  id: TitleMenuItemId;
  label: string;
}

export const TITLE_MENU_ITEMS: TitleMenuItem[] = [
  { id: 'play', label: 'JOGAR' },
  { id: 'versus', label: '2 JOGADORES LOCAL' },
  { id: 'tournament', label: 'TORNEIO' },
  { id: 'settings', label: 'CONFIGURAÇÕES' },
  { id: 'howto', label: 'COMO JOGAR' },
];

export const INTRO_TOTAL_DURATION = 2.6;

export interface IntroPhases {
  sky: number;
  moon: number;
  mountains: number;
  logo: number;
  logoSweep: number;
  menu: number;
  cursor: number;
  isReady: boolean;
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function easeOutCubic(t: number): number {
  const x = clamp01(t);
  return 1 - Math.pow(1 - x, 3);
}

export function moveTitleMenuIndex(
  currentIndex: number,
  delta: number,
  total: number = TITLE_MENU_ITEMS.length
): number {
  if (total <= 0) return 0;
  return (((currentIndex + delta) % total) + total) % total;
}

export function computeIntroPhases(elapsedSeconds: number, skipped: boolean): IntroPhases {
  if (skipped || elapsedSeconds >= INTRO_TOTAL_DURATION) {
    return {
      sky: 1,
      moon: 1,
      mountains: 1,
      logo: 1,
      logoSweep: 1,
      menu: 1,
      cursor: 1,
      isReady: true,
    };
  }
  const t = Math.max(0, elapsedSeconds);
  return {
    sky: easeOutCubic((t - 0.05) / 0.45),
    moon: easeOutCubic((t - 0.25) / 0.55),
    mountains: easeOutCubic((t - 0.55) / 0.6),
    logo: easeOutCubic((t - 0.95) / 0.55),
    logoSweep: clamp01((t - 1.25) / 0.65),
    menu: easeOutCubic((t - 1.55) / 0.5),
    cursor: easeOutCubic((t - 2.05) / 0.35),
    isReady: t >= 2.15,
  };
}
