import { useCallback, useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { soundEngine } from '../game/audio';
import { GameSettings, getQualityProfile } from '../game/settings';
import {
  INTRO_TOTAL_DURATION,
  TITLE_MENU_ITEMS,
  TitleMenuItemId,
  computeIntroPhases,
  moveTitleMenuIndex,
} from '../game/titleMenuHelpers';
import { TITLE_HEIGHT, TITLE_WIDTH, TitleSceneRenderer } from '../game/titleSceneRenderer';
import { HowToPlayModal } from './HowToPlayModal';
import { PixelHandCursor } from './PixelHandCursor';
import { SettingsModal } from './SettingsModal';

interface TitleScreenProps {
  settings: GameSettings;
  muted: boolean;
  onUpdateSettings: (next: GameSettings) => void;
  onToggleMute: () => void;
  onPlayArcade: () => void;
  onPlayVersus: () => void;
  onOpenTournament: () => void;
}

let hasPlayedTitleIntro = false;

export function TitleScreen({
  settings,
  muted,
  onUpdateSettings,
  onToggleMute,
  onPlayArcade,
  onPlayVersus,
  onOpenTournament,
}: TitleScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<TitleSceneRenderer | null>(null);
  const settingsRef = useRef<GameSettings>(settings);
  settingsRef.current = settings;

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [pressedIndex, setPressedIndex] = useState<number | null>(null);
  const [subPanel, setSubPanel] = useState<'none' | 'settings' | 'howto'>('none');
  const [introSkipped, setIntroSkipped] = useState(() => hasPlayedTitleIntro);
  const [introPhases, setIntroPhases] = useState(() => computeIntroPhases(0, hasPlayedTitleIntro));
  const [transitioningOut, setTransitioningOut] = useState(false);

  const parallaxTargetRef = useRef({ x: 0, y: 0 });
  const parallaxCurrentRef = useRef({ x: 0, y: 0 });
  const introSkippedRef = useRef(hasPlayedTitleIntro);
  introSkippedRef.current = introSkipped;

  const unlockAndStartMenuBgm = useCallback(() => {
    soundEngine.unlock();
    soundEngine.startBgm('menu');
  }, []);

  // Animated 16-bit Pixel-Art Scene Loop (Moon, Clouds, Horizon, Castle, Parallax Mountains, Particles)
  useEffect(() => {
    if (!rendererRef.current) {
      rendererRef.current = new TitleSceneRenderer();
    }
    const renderer = rendererRef.current;
    let raf = 0;
    const startTime = performance.now();
    let lastFrameTime = startTime;
    let lastUiSync = 0;

    const tick = (now: number) => {
      const quality = getQualityProfile(settingsRef.current);
      const minFrameMs = 1000 / quality.targetFps;
      const elapsedSinceLast = now - lastFrameTime;

      if (elapsedSinceLast >= minFrameMs - 1) {
        const dt = Math.min(elapsedSinceLast / 1000, 0.05);
        lastFrameTime = now;
        const elapsed = (now - startTime) / 1000;
        const phases = computeIntroPhases(elapsed, introSkippedRef.current);

        // Smooth mouse parallax damping
        parallaxCurrentRef.current.x +=
          (parallaxTargetRef.current.x - parallaxCurrentRef.current.x) * Math.min(1, dt * 6);
        parallaxCurrentRef.current.y +=
          (parallaxTargetRef.current.y - parallaxCurrentRef.current.y) * Math.min(1, dt * 6);

        renderer.updateParticles(dt, quality);

        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            renderer.render(
              ctx,
              elapsed,
              parallaxCurrentRef.current.x,
              parallaxCurrentRef.current.y,
              phases,
              quality
            );
          }
        }

        // Sync React intro overlay opacities smoothly (~20Hz until fully settled at cursor=1)
        if (now - lastUiSync > 45) {
          lastUiSync = now;
          if (phases.cursor >= 1) {
            hasPlayedTitleIntro = true;
          }
          setIntroPhases((prev) => {
            if (prev.isReady && prev.cursor >= 1 && phases.isReady && phases.cursor >= 1) {
              return prev;
            }
            return phases;
          });
        }
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const activateOption = useCallback(
    (id: TitleMenuItemId, index: number) => {
      if (transitioningOut) return;
      unlockAndStartMenuBgm();
      setSelectedIndex(index);
      setPressedIndex(index);

      if (id === 'settings') {
        soundEngine.playPanelOpen();
        setTimeout(() => setPressedIndex(null), 130);
        setSubPanel('settings');
        return;
      }

      if (id === 'howto') {
        soundEngine.playPanelOpen();
        setTimeout(() => setPressedIndex(null), 130);
        setSubPanel('howto');
        return;
      }

      soundEngine.playUiConfirm();
      setTransitioningOut(true);
      window.setTimeout(() => {
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
        if (id === 'play') {
          onPlayArcade();
        } else if (id === 'versus') {
          onPlayVersus();
        } else if (id === 'tournament') {
          onOpenTournament();
        }
      }, 240);
    },
    [transitioningOut, unlockAndStartMenuBgm, onPlayArcade, onPlayVersus, onOpenTournament]
  );

  // Keyboard navigation & intro skip (blocks combat controls while in menu)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Allow skipping intro with any key
      if (!introPhases.isReady) {
        e.preventDefault();
        hasPlayedTitleIntro = true;
        setIntroSkipped(true);
        setIntroPhases(computeIntroPhases(INTRO_TOTAL_DURATION, true));
        unlockAndStartMenuBgm();
        return;
      }

      if (subPanel !== 'none') {
        if (e.code === 'Escape') {
          e.preventDefault();
          soundEngine.playUiBack();
          setSubPanel('none');
        }
        return;
      }

      if (transitioningOut) return;

      if (e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        unlockAndStartMenuBgm();
        soundEngine.playUiSelect();
        setSelectedIndex((prev) => moveTitleMenuIndex(prev, -1));
      } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        e.preventDefault();
        unlockAndStartMenuBgm();
        soundEngine.playUiSelect();
        setSelectedIndex((prev) => moveTitleMenuIndex(prev, 1));
      } else if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        const item = TITLE_MENU_ITEMS[selectedIndex];
        if (item) {
          activateOption(item.id, selectedIndex);
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [introPhases.isReady, subPanel, transitioningOut, selectedIndex, activateOption, unlockAndStartMenuBgm]);

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const nx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const ny = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    parallaxTargetRef.current = { x: nx, y: ny };
  };

  const handleSkipIntroClick = () => {
    unlockAndStartMenuBgm();
    if (!introPhases.isReady) {
      hasPlayedTitleIntro = true;
      setIntroSkipped(true);
      setIntroPhases(computeIntroPhases(INTRO_TOTAL_DURATION, true));
    }
  };

  return (
    <main
      onMouseMove={handleMouseMove}
      onClick={handleSkipIntroClick}
      className="relative w-full h-full overflow-hidden bg-[#05050d] flex flex-col items-center justify-between select-none"
    >
      {/* Animated Multi-Layer 16-bit Pixel Art Scene Canvas */}
      <canvas
        ref={canvasRef}
        data-testid="title-scene-canvas"
        width={TITLE_WIDTH}
        height={TITLE_HEIGHT}
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover pixelated pointer-events-none"
      />

      {/* Cinematic Fade-Out Transition Overlay when leaving Menu */}
      <div
        aria-hidden="true"
        className={`fixed inset-0 z-50 bg-[#05050d] pointer-events-none transition-opacity duration-250 ${
          transitioningOut ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Top-Right Compact Audio Mute Toggle */}
      <div className="relative z-20 w-full flex justify-end px-4 pt-3 sm:px-6 sm:pt-4 pointer-events-none">
        <button
          type="button"
          tabIndex={-1}
          onClick={(e) => {
            e.stopPropagation();
            soundEngine.unlock();
            onToggleMute();
          }}
          aria-label={muted ? 'Ativar áudio' : 'Silenciar áudio'}
          className="pointer-events-auto w-10 h-10 flex items-center justify-center bg-[#120d22]/85 border-2 border-[#4a376e] text-amber-200 hover:border-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
        >
          {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>
      </div>

      {/* 16:9 Safe Centerpiece Composition: Logo + 5 Menu Options */}
      <div className="relative z-10 w-full max-w-[1180px] flex-1 flex flex-col items-center justify-center px-4 -mt-3 sm:-mt-5">
        {/* LEGENDS OF THE ARENA Logo with Fade-in, Energy Aura & Letter-Masked Shine Sweep */}
        <div
          style={{
            opacity: introPhases.logo,
            transform: `scale(${0.94 + introPhases.logo * 0.06})`,
          }}
          className="relative w-full max-w-[min(800px,88vw)] sm:max-w-[min(800px,66vw)] mb-2 sm:mb-3 transition-transform duration-150"
        >
          {settings.visualEffectsEnabled && (
            <div
              aria-hidden="true"
              className="absolute -inset-4 pointer-events-none opacity-40"
              style={{
                background:
                  'radial-gradient(ellipse at center, rgba(251,191,36,0.28) 0%, rgba(168,85,247,0.22) 48%, transparent 72%)',
              }}
            />
          )}

          <div className="relative">
            <img
              src="/assets/ui/legends_logo.png"
              alt="Legends of the Arena"
              draggable={false}
              className="w-full h-auto block pixelated drop-shadow-[0_6px_12px_rgba(0,0,0,0.85)]"
            />

            {/* Diagonal Light Sweep strictly masked to the logo silhouette */}
            {settings.visualEffectsEnabled && introPhases.logo > 0.85 && (
              <div
                aria-hidden="true"
                className="absolute inset-0 pointer-events-none overflow-hidden"
                style={{
                  maskImage: 'url(/assets/ui/legends_logo.png)',
                  WebkitMaskImage: 'url(/assets/ui/legends_logo.png)',
                  maskSize: '100% 100%',
                  WebkitMaskSize: '100% 100%',
                  maskRepeat: 'no-repeat',
                  WebkitMaskRepeat: 'no-repeat',
                }}
              >
                <div
                  className="animate-logo-shine absolute inset-y-0 w-1/3"
                  style={{
                    background:
                      'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.55) 50%, transparent 100%)',
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* 5 Central Arcade Menu Options */}
        <nav
          aria-label="Menu Principal"
          style={{
            opacity: introPhases.menu,
            transform: `translateY(${(1 - introPhases.menu) * 14}px)`,
          }}
          className="flex flex-col items-center gap-1 sm:gap-1.5 mt-1 sm:mt-2"
        >
          {TITLE_MENU_ITEMS.map((item, idx) => {
            const isSelected = selectedIndex === idx;
            const isPressed = pressedIndex === idx;
            return (
              <button
                key={item.id}
                type="button"
                data-start={item.id === 'play' ? 'true' : undefined}
                aria-current={isSelected ? 'true' : undefined}
                onMouseEnter={() => {
                  if (!introPhases.isReady || subPanel !== 'none') return;
                  if (selectedIndex !== idx) {
                    unlockAndStartMenuBgm();
                    soundEngine.playUiSelect();
                    setSelectedIndex(idx);
                  }
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!introPhases.isReady) {
                    handleSkipIntroClick();
                    return;
                  }
                  activateOption(item.id, idx);
                }}
                className={`relative flex items-center justify-center px-6 py-0.5 sm:py-1 font-arcade uppercase tracking-wider cursor-pointer transition-all duration-150 focus:outline-none ${
                  isPressed
                    ? 'scale-95 text-white'
                    : isSelected
                    ? 'scale-[1.08] text-[#fef08a]'
                    : 'text-[#f59e0b] hover:text-[#fde047]'
                }`}
                style={{
                  fontSize: 'clamp(0.95rem, 2.25vw, 1.65rem)',
                  lineHeight: 1.25,
                  textShadow: isSelected
                    ? '-2px -2px 0 #09070d, 2px -2px 0 #09070d, -2px 2px 0 #09070d, 2px 2px 0 #09070d, 0 4px 0 #09070d, 0 0 14px rgba(251, 191, 36, 0.72)'
                    : '-2px -2px 0 #09070d, 2px -2px 0 #09070d, -2px 2px 0 #09070d, 2px 2px 0 #09070d, 0 3px 0 #09070d',
                }}
              >
                {/* Animated Pixel-Art Gloved Hand Cursor tracking active option */}
                {isSelected && introPhases.cursor > 0.05 && (
                  <span
                    style={{ opacity: introPhases.cursor }}
                    className="absolute right-full mr-1 sm:mr-2.5 flex items-center pointer-events-none animate-cursor-bob"
                  >
                    <PixelHandCursor className="w-7 h-5 sm:w-10 sm:h-7 drop-shadow-[0_3px_0_#09070d]" />
                  </span>
                )}
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer: 3° ANO "B" with Flanking Golden Lines & © 2026 LEGENDS OF THE ARENA */}
      <footer
        style={{ opacity: introPhases.menu }}
        className="relative z-10 w-full flex flex-col items-center gap-1 pb-3 sm:pb-4 px-4 pointer-events-none"
      >
        <div className="flex items-center justify-center gap-3 sm:gap-5 w-full max-w-md">
          <span
            aria-hidden="true"
            className="h-[2px] flex-1 max-w-[110px] bg-gradient-to-r from-transparent via-amber-400 to-amber-300 shadow-[0_1px_0_#09070d]"
          />
          <span className="font-arcade text-sm sm:text-lg md:text-xl text-amber-400 arcade-stroke tracking-widest whitespace-nowrap">
            3° ANO &quot;B&quot;
          </span>
          <span
            aria-hidden="true"
            className="h-[2px] flex-1 max-w-[110px] bg-gradient-to-l from-transparent via-amber-400 to-amber-300 shadow-[0_1px_0_#09070d]"
          />
        </div>
        <div className="font-arcade text-[10px] sm:text-xs md:text-sm text-amber-400/95 arcade-stroke tracking-wider text-center">
          © 2026 LEGENDS OF THE ARENA
        </div>
      </footer>

      {/* CONFIGURAÇÕES Modal */}
      {subPanel === 'settings' && (
        <SettingsModal
          settings={settings}
          onChange={onUpdateSettings}
          onClose={() => setSubPanel('none')}
          onPreviewSound={(kind) => {
            soundEngine.unlock();
            if (kind === 'select') soundEngine.playUiSelect();
            else if (kind === 'confirm') soundEngine.playUiConfirm();
            else soundEngine.playUiBack();
          }}
        />
      )}

      {/* COMO JOGAR Modal */}
      {subPanel === 'howto' && (
        <HowToPlayModal
          onClose={() => {
            soundEngine.unlock();
            soundEngine.playUiBack();
            setSubPanel('none');
          }}
        />
      )}
    </main>
  );
}
