import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Play, Sparkles, Volume2, VolumeX } from 'lucide-react';
import { createEmptyInput, createMatchState, spawnBurst, spawnVisualEffect, stepMatch } from '../game/combatEngine';
import { elfSpriteCache } from '../game/elfSpritesLoader';
import { minotaurSpriteCache } from '../game/minotaurSpritesLoader';
import { necromancerSpriteCache } from '../game/necromancerSpritesLoader';
import { ninjaSpriteCache } from '../game/ninjaSpritesLoader';
import { priestSpriteCache } from '../game/priestSpritesLoader';
import { trollSpriteCache } from '../game/trollSpritesLoader';
import { jaylonSpriteCache } from '../game/jaylonSpritesLoader';
import { teslaSpriteCache } from '../game/teslaSpritesLoader';
import { beelzebuSpriteCache } from '../game/beelzebuSpritesLoader';
import { donoSpriteCache } from '../game/donoSpritesLoader';
import { adaoSpriteCache } from '../game/adaoSpritesLoader';
import { jackSpriteCache } from '../game/jackSpritesLoader';
import { renderArena } from '../game/pixelArenas';
import { renderParticles, renderProjectilesAndHazards } from '../game/pixelEffects';
import { renderFighter } from '../game/pixelSprites';
import { CHARACTERS, CHARACTER_LIST, GROUND_Y, STAGE_HEIGHT, STAGE_WIDTH } from '../game/roster';
import { formatFighterDisplayName, moveGridCursor } from '../game/selectHelpers';
import { ArenaId, CharacterId, Difficulty, GameMode, SpecialSlot } from '../game/types';
import { PixelPortrait } from './PixelPortrait';

interface CharacterSelectProps {
  mode: GameMode;
  difficulty: Difficulty;
  p1Char: CharacterId;
  p2Char: CharacterId;
  arenaId: ArenaId;
  muted: boolean;
  onSelectP1: (id: CharacterId) => void;
  onSelectP2: (id: CharacterId) => void;
  onDifficultyChange?: (difficulty: Difficulty) => void;
  onToggleMute: () => void;
  onBack: () => void;
  onContinue: () => void;
  onPreviewSound: (kind: 'select' | 'special' | 'victory') => void;
}

export function CharacterSelect({
  mode,
  difficulty,
  p1Char,
  p2Char,
  arenaId,
  muted,
  onSelectP1,
  onSelectP2,
  onDifficultyChange,
  onToggleMute,
  onBack,
  onContinue,
  onPreviewSound,
}: CharacterSelectProps) {
  const [activeSlot, setActiveSlot] = useState<1 | 2>(1);
  const [activeDemoLabel, setActiveDemoLabel] = useState<string>('');
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const confirmedRef = useRef(false);
  const onContinueRef = useRef(onContinue);
  onContinueRef.current = onContinue;

  const inspectedCharId = activeSlot === 1 ? p1Char : p2Char;
  const inspectedChar = CHARACTERS[inspectedCharId];
  const oppCharId = activeSlot === 1 ? p2Char : p1Char;

  // Live background arena + fighters showcase simulation
  const demoStateRef = useRef(createMatchState(inspectedCharId, oppCharId, arenaId, 'versus', 'normal', true));
  const pendingSpecialRef = useRef<SpecialSlot | 'finisher' | null>(null);
  const demoAdaoHoldTimerRef = useRef(0);

  useEffect(() => {
    const fresh = createMatchState(inspectedCharId, oppCharId, arenaId, 'versus', 'normal', true);
    fresh.f1.x = 148;
    fresh.f2.x = 332;
    fresh.f1.energy = 100;
    if (fresh.f1.characterId === 'jack') {
      fresh.f1.jackKnives = 5;
    }
    demoStateRef.current = fresh;
    demoAdaoHoldTimerRef.current = 0;
    setActiveDemoLabel('');
  }, [inspectedCharId, oppCharId, arenaId]);

  useEffect(() => {
    confirmedRef.current = false;
  }, []);

  // Keyboard navigation across the 5x2 metallic portrait grid + [Enter]/[K] confirm
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Tab') {
        e.preventDefault();
        onPreviewSound('select');
        setActiveSlot((prev) => (prev === 1 ? 2 : 1));
        return;
      }

      let dir: 'left' | 'right' | 'up' | 'down' | null = null;
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') dir = 'left';
      else if (e.code === 'ArrowRight' || e.code === 'KeyD') dir = 'right';
      else if (e.code === 'ArrowUp' || e.code === 'KeyW') dir = 'up';
      else if (e.code === 'ArrowDown' || e.code === 'KeyS') dir = 'down';

      if (dir) {
        e.preventDefault();
        onPreviewSound('select');
        const currentId = activeSlot === 1 ? p1Char : p2Char;
        const activeCols = typeof window !== 'undefined' && window.innerWidth < 640 ? 2 : 6;
        const nextId = moveGridCursor(currentId, dir, CHARACTER_LIST, activeCols);
        if (activeSlot === 1) onSelectP1(nextId);
        else onSelectP2(nextId);
        return;
      }

      if (e.code === 'KeyK' || (e.code === 'Enter' && !(document.activeElement instanceof HTMLButtonElement))) {
        e.preventDefault();
        if (!confirmedRef.current) {
          confirmedRef.current = true;
          onContinueRef.current();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeSlot, p1Char, p2Char, onSelectP1, onSelectP2, onPreviewSound]);

  useEffect(() => {
    ninjaSpriteCache.ensureLoaded();
    minotaurSpriteCache.ensureLoaded();
    elfSpriteCache.ensureLoaded();
    priestSpriteCache.ensureLoaded();
    necromancerSpriteCache.ensureLoaded();
    trollSpriteCache.ensureLoaded();
    jaylonSpriteCache.ensureLoaded();
    teslaSpriteCache.ensureLoaded();
    beelzebuSpriteCache.ensureLoaded();
    donoSpriteCache.ensureLoaded();
    adaoSpriteCache.ensureLoaded();
    jackSpriteCache.ensureLoaded();
    let raf = 0;
    let last = performance.now();
    const start = last;

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const globalTime = (now - start) / 1000;
      const state = demoStateRef.current;

      state.f1.energy = 100;
      state.f2.hp = state.f2.maxHp;
      state.f1.hp = state.f1.maxHp;
      state.roundTimeLeft = 99;

      const p1In = createEmptyInput();
      const pending = pendingSpecialRef.current;
      if (pending) {
        pendingSpecialRef.current = null;
        if (pending === 'finisher') {
          state.f1.action = 'victory';
          state.f1.actionTime = 0;
          state.f1.actionDuration = 2.2;
          state.roundPhase = 'finisher';
          state.phaseTimer = 2.2;
          if (state.f1.characterId === 'ninja') {
            spawnVisualEffect(state, {
              kind: 'fx_fumaca',
              x: state.f1.x,
              y: GROUND_Y - 34,
              facing: state.f1.facing,
              scale: 0.78,
              maxLife: 0.75,
            });
            spawnVisualEffect(state, {
              kind: 'fx_explosao',
              x: state.f1.x,
              y: GROUND_Y - 32,
              facing: state.f1.facing,
              scale: 0.72,
              maxLife: 0.6,
            });
            spawnVisualEffect(state, {
              kind: 'fx_aura',
              x: state.f1.x,
              y: GROUND_Y - 32,
              facing: state.f1.facing,
              scale: 0.7,
              maxLife: 1.4,
            });
          } else if (state.f1.characterId === 'elf') {
            spawnVisualEffect(state, {
              kind: 'fx_elf_gold_crescent',
              x: state.f1.x + state.f1.facing * 26,
              y: GROUND_Y - 36,
              facing: state.f1.facing,
              scale: 0.72,
              maxLife: 0.75,
            });
            spawnVisualEffect(state, {
              kind: 'fx_elf_gold_beam',
              x: state.f1.x + state.f1.facing * 124,
              y: GROUND_Y - 36,
              vx: state.f1.facing * 60,
              facing: state.f1.facing,
              scale: 0.52,
              maxLife: 1.25,
            });
          } else if (state.f1.characterId === 'priest') {
            spawnVisualEffect(state, {
              kind: 'fx_priest_golden_aura',
              x: state.f1.x,
              y: GROUND_Y - 34,
              facing: state.f1.facing,
              scale: 0.78,
              maxLife: 1.35,
            });
            spawnVisualEffect(state, {
              kind: 'fx_priest_holy_sigil',
              x: state.f1.x + state.f1.facing * 24,
              y: GROUND_Y - 36,
              facing: state.f1.facing,
              scale: 0.74,
              maxLife: 1.15,
            });
            spawnVisualEffect(state, {
              kind: 'fx_priest_light_pillar',
              x: state.f1.x + state.f1.facing * 32,
              y: GROUND_Y - 40,
              facing: state.f1.facing,
              scale: 0.85,
              maxLife: 1.3,
            });
            spawnVisualEffect(state, {
              kind: 'fx_priest_particles',
              x: state.f1.x + state.f1.facing * 16,
              y: GROUND_Y - 38,
              facing: state.f1.facing,
              scale: 0.72,
              maxLife: 1.1,
            });
          } else if (state.f1.characterId === 'necromancer') {
            spawnVisualEffect(state, {
              kind: 'fx_necro_aura',
              x: state.f1.x,
              y: GROUND_Y - 22,
              facing: state.f1.facing,
              scale: 0.78,
              maxLife: 1.4,
            });
            spawnVisualEffect(state, {
              kind: 'fx_necro_sigils',
              x: state.f1.x + state.f1.facing * 26,
              y: GROUND_Y - 38,
              facing: state.f1.facing,
              scale: 0.72,
              maxLife: 1.25,
            });
            spawnVisualEffect(state, {
              kind: 'fx_necro_skulls',
              x: state.f2.x,
              y: GROUND_Y - 40,
              facing: state.f1.facing,
              scale: 0.68,
              maxLife: 1.15,
            });
            spawnVisualEffect(state, {
              kind: 'fx_necro_soul_explosion',
              x: state.f2.x,
              y: GROUND_Y - 32,
              facing: state.f1.facing,
              scale: 0.76,
              maxLife: 0.9,
            });
          } else if (state.f1.characterId === 'minotaur') {
            spawnVisualEffect(state, {
              kind: 'fx_minotaur_fury_aura',
              x: state.f1.x,
              y: GROUND_Y - 36,
              facing: state.f1.facing,
              scale: 0.68,
              maxLife: 1.4,
            });
            spawnVisualEffect(state, {
              kind: 'fx_minotaur_earth_impact',
              x: state.f1.x,
              y: GROUND_Y - 14,
              facing: state.f1.facing,
              scale: 0.64,
              maxLife: 0.95,
            });
            spawnVisualEffect(state, {
              kind: 'fx_minotaur_shockwave',
              x: state.f1.x + state.f1.facing * 20,
              y: GROUND_Y - 22,
              facing: state.f1.facing,
              scale: 0.62,
              maxLife: 0.85,
            });
            spawnVisualEffect(state, {
              kind: 'fx_minotaur_rocks',
              x: state.f1.x,
              y: GROUND_Y - 28,
              facing: state.f1.facing,
              scale: 0.58,
              maxLife: 0.9,
            });
            spawnBurst(state, state.f1.x, GROUND_Y - 30, '#fbbf24', '#ea580c', 18, 130, 'spark');
          } else if (state.f1.characterId === 'troll') {
            spawnVisualEffect(state, {
              kind: 'fx_troll_fury_aura',
              x: state.f1.x,
              y: GROUND_Y - 34,
              facing: state.f1.facing,
              scale: 0.68,
              maxLife: 1.4,
            });
            spawnVisualEffect(state, {
              kind: 'fx_troll_earth_explosion',
              x: state.f1.x,
              y: GROUND_Y - 18,
              facing: state.f1.facing,
              scale: 0.64,
              maxLife: 0.9,
            });
            spawnVisualEffect(state, {
              kind: 'fx_troll_fury_particles',
              x: state.f1.x,
              y: GROUND_Y - 38,
              facing: state.f1.facing,
              scale: 0.62,
              maxLife: 1.1,
            });
            spawnBurst(state, state.f1.x, GROUND_Y - 32, '#ef4444', '#f97316', 18, 130, 'spark');
          } else if (state.f1.characterId === 'jaylon') {
            spawnVisualEffect(state, {
              kind: 'fx_jaylon_smoke',
              x: state.f1.x + state.f1.facing * 12,
              y: GROUND_Y - 58,
              vx: state.f1.facing * 10,
              vy: -22,
              facing: state.f1.facing,
              scale: 0.52,
              maxLife: 1.25,
            });
            spawnBurst(state, state.f1.x, GROUND_Y - 34, '#ec4899', '#facc15', 18, 125, 'spark');
          } else if (state.f1.characterId === 'tesla') {
            spawnVisualEffect(state, {
              kind: 'tesla_special1_impact',
              x: state.f1.x,
              y: GROUND_Y - 34,
              facing: state.f1.facing,
              scale: 0.52,
              maxLife: 1.0,
            });
            spawnBurst(state, state.f1.x, GROUND_Y - 34, '#22d3ee', '#f59e0b', 20, 130, 'spark');
          } else if (state.f1.characterId === 'beelzebu') {
            spawnVisualEffect(state, {
              kind: 'beelzebu_dominio_active',
              x: state.f1.x,
              y: GROUND_Y - 46,
              facing: state.f1.facing,
              scale: 0.42,
              maxLife: 1.45,
            });
            spawnVisualEffect(state, {
              kind: 'beelzebu_cranio_impact',
              x: state.f2.x,
              y: GROUND_Y - 38,
              facing: state.f1.facing,
              scale: 0.34,
              maxLife: 0.9,
            });
            spawnBurst(state, state.f1.x, GROUND_Y - 34, '#a855f7', '#e879f9', 22, 135, 'spark');
          } else if (state.f1.characterId === 'dono') {
            spawnVisualEffect(state, {
              kind: 'dono_atividade_wave',
              x: state.f1.x,
              y: GROUND_Y - 40,
              facing: state.f1.facing,
              scale: 0.72,
              maxLife: 1.25,
            });
            spawnVisualEffect(state, {
              kind: 'dono_maryjuana_cloud',
              x: state.f1.x + state.f1.facing * 12,
              y: GROUND_Y - 56,
              vx: state.f1.facing * 10,
              vy: -16,
              facing: state.f1.facing,
              scale: 0.62,
              maxLife: 1.2,
            });
            spawnBurst(state, state.f1.x, GROUND_Y - 36, '#facc15', '#a855f7', 22, 130, 'spark');
          } else if (state.f1.characterId === 'adao') {
            spawnVisualEffect(state, {
              kind: 'adao_copy_aura',
              x: state.f1.x,
              y: GROUND_Y - 38,
              facing: state.f1.facing,
              scale: 0.9,
              maxLife: 1.15,
            });
            spawnVisualEffect(state, {
              kind: 'adao_time_fist_flash',
              x: state.f1.x + state.f1.facing * 42,
              y: GROUND_Y - 36,
              facing: state.f1.facing,
              scale: 0.85,
              maxLife: 0.85,
            });
            spawnBurst(state, state.f1.x, GROUND_Y - 36, '#a855f7', '#fde047', 24, 140, 'spark');
          } else if (state.f1.characterId === 'jack') {
            spawnVisualEffect(state, {
              kind: 'jack_soul_eye',
              x: state.f1.x,
              y: GROUND_Y - 46,
              facing: state.f1.facing,
              scale: 0.46,
              maxLife: 1.25,
            });
            spawnVisualEffect(state, {
              kind: 'jack_blood_splash',
              x: state.f1.x + state.f1.facing * 14,
              y: GROUND_Y - 34,
              facing: state.f1.facing,
              scale: 0.42,
              maxLife: 0.9,
            });
            spawnVisualEffect(state, {
              kind: 'jack_scissor_spin',
              x: state.f1.x,
              y: GROUND_Y - 34,
              facing: state.f1.facing,
              scale: 0.42,
              maxLife: 0.8,
            });
            spawnBurst(state, state.f1.x, GROUND_Y - 36, '#dc2626', '#a855f7', 22, 135, 'spark');
          }
        } else {
          state.roundPhase = 'fighting';
          state.f1.x = 148;
          state.f2.x = 332;
          state.f1.action = 'idle';
          state.f1.specialLockTime = 0;
          state.f1.special1Cooldown = 0;
          state.f1.specialCooldowns = { special1: 0, special2: 0, special3: 0, special4: 0 };
          state.f1.cageUsesThisRound = 0;
          state.f2.specialLockTime = 0;
          if (state.f1.characterId === 'jack') {
            state.f1.jackKnives = Math.max(5, state.f1.jackKnives);
          }
          demoAdaoHoldTimerRef.current = 0;
          if (pending === 'special1') p1In.special1Pressed = true;
          if (pending === 'special2') p1In.special2Pressed = true;
          if (pending === 'special3') {
            if (state.f1.characterId === 'adao') {
              demoAdaoHoldTimerRef.current = 2.15;
              p1In.special3Pressed = true;
              p1In.special3Held = true;
            } else {
              state.f1.hp = Math.round(state.f1.maxHp * 0.65);
              p1In.special3Pressed = true;
            }
          }
          if (pending === 'special4') {
            state.f1.furyTime = 0;
            state.f1.furyCooldown = 0;
            state.f1.furyReverseTime = 0;
            p1In.special4Pressed = true;
          }
        }
      }

      if (demoAdaoHoldTimerRef.current > 0) {
        demoAdaoHoldTimerRef.current = Math.max(0, demoAdaoHoldTimerRef.current - dt);
        p1In.special3Held = true;
      }

      if (state.roundPhase === 'finisher' && state.phaseTimer <= 0.1) {
        state.roundPhase = 'fighting';
        state.f1.action = 'idle';
      }

      stepMatch(state, p1In, createEmptyInput(), dt);

      const canvas = previewCanvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = false;
          renderArena(ctx, state.arenaId, globalTime, 0);
          renderFighter(ctx, state.f2, globalTime);
          renderFighter(ctx, state.f1, globalTime);
          renderProjectilesAndHazards(ctx, state, globalTime);
          renderParticles(ctx, state);
        }
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const handleCardClick = (id: CharacterId) => {
    onPreviewSound('select');
    if (activeSlot === 1) {
      onSelectP1(id);
    } else {
      onSelectP2(id);
    }
  };

  const triggerDemo = (slot: SpecialSlot | 'finisher', label: string) => {
    pendingSpecialRef.current = slot;
    setActiveDemoLabel(label);
    onPreviewSound(slot === 'finisher' ? 'victory' : 'special');
  };

  const p1Data = CHARACTERS[p1Char];
  const p2Data = CHARACTERS[p2Char];
  const p1Label = formatFighterDisplayName(p1Data);
  const p2Label = formatFighterDisplayName(p2Data);
  const p2Tag = mode === 'arcade' ? 'IA' : 'P2';

  return (
    <div className="relative w-full h-full bg-[#09070d] text-[#f5efe6] flex flex-col justify-between overflow-y-auto lg:overflow-hidden">
      {/* Live Animated Arena Stage Backdrop */}
      <canvas
        ref={previewCanvasRef}
        width={STAGE_WIDTH}
        height={STAGE_HEIGHT}
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover pixelated pointer-events-none"
      />
      {/* Tekken-style Dark Crimson-Purple Vignette Scrim */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 50% 32%, rgba(28, 10, 42, 0.25) 0%, rgba(12, 7, 20, 0.72) 60%, rgba(7, 4, 12, 0.94) 100%)',
        }}
      />

      {/* TOP BAR: Back + Tekken 5 "ESCOLHA SEU LUTADOR" Banner + 30s Timer + Audio */}
      <header className="relative z-10 flex flex-col items-center pt-2 sm:pt-3 px-3 sm:px-6 shrink-0">
        <div className="w-full flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#161922]/95 border border-[#687387] hover:border-amber-400 text-xs font-bold uppercase tracking-wider text-slate-100 cursor-pointer shrink-0 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {mode === 'arcade' && onDifficultyChange ? (
              <div
                className="flex items-center bg-[#161922]/95 border border-[#687387] p-0.5"
                role="group"
                aria-label="Dificuldade Arcade"
              >
                {(['easy', 'normal', 'hard'] as Difficulty[]).map((d) => (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={difficulty === d}
                    onClick={() => {
                      onPreviewSound('select');
                      onDifficultyChange(d);
                    }}
                    className={`px-2 py-1 text-[10px] sm:text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors ${
                      difficulty === d
                        ? 'bg-amber-500 text-[#09070d]'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {d === 'easy' ? 'Fácil' : d === 'normal' ? 'Normal' : 'Difícil'}
                  </button>
                ))}
              </div>
            ) : (
              <span className="hidden sm:inline text-xs font-bold uppercase tracking-wider text-slate-200 arcade-stroke-sm">
                {mode === 'arcade'
                  ? `Arcade · ${difficulty === 'easy' ? 'Fácil' : difficulty === 'normal' ? 'Normal' : 'Difícil'}`
                  : 'Versus Local (2P)'}
              </span>
            )}
            <button
              type="button"
              onClick={onToggleMute}
              aria-label={muted ? 'Ativar áudio' : 'Silenciar áudio'}
              className="w-9 h-9 flex items-center justify-center bg-[#161922]/95 border border-[#687387] hover:border-amber-400 text-slate-100 cursor-pointer shrink-0 transition-colors"
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Center Beveled Metallic Header Plaque + Crimson Wing Streaks */}
        <div className="-mt-7 sm:-mt-8 flex flex-col items-center pointer-events-none select-none">
          <div className="relative flex items-center justify-center">
            <div
              aria-hidden="true"
              className="hidden sm:block w-24 md:w-36 h-[3px] bg-gradient-to-r from-transparent via-red-600 to-red-500 -mr-2"
            />
            <div
              className="px-6 sm:px-10 py-1.5 bg-gradient-to-b from-[#cfd6e0] via-[#48505e] to-[#9aa3b2] p-[2px] shadow-[0_6px_18px_rgba(0,0,0,0.85)]"
              style={{ clipPath: 'polygon(3% 0%, 97% 0%, 94% 100%, 6% 100%)' }}
            >
              <div
                className="px-5 sm:px-9 py-1 bg-gradient-to-b from-[#232730] via-[#12141a] to-[#0a0b0f]"
                style={{ clipPath: 'polygon(3% 0%, 97% 0%, 94% 100%, 6% 100%)' }}
              >
                <h1 className="font-arcade text-sm sm:text-xl md:text-2xl font-bold italic tracking-wider uppercase text-white arcade-stroke-sm whitespace-nowrap">
                  ESCOLHA SEU LUTADOR
                </h1>
              </div>
            </div>
            <div
              aria-hidden="true"
              className="hidden sm:block w-24 md:w-36 h-[3px] bg-gradient-to-l from-transparent via-red-600 to-red-500 -ml-2"
            />
          </div>
        </div>
      </header>

      {/* MIDDLE OPEN STAGE + P1 (RED) & OPPONENT (GOLD) IDENTITY PLATES */}
      <div className="relative z-10 flex-1 flex flex-col justify-end px-3 sm:px-6 pb-2 gap-2.5 min-h-0 max-w-6xl w-full mx-auto">
        {/* Optional Live Special Demo Status Tag */}
        {activeDemoLabel && (
          <div className="self-center px-3 py-1 bg-[#110d1a]/90 border border-amber-400/70 text-[11px] font-bold uppercase tracking-wider text-amber-300 shadow-md">
            Demonstração: {activeDemoLabel}
          </div>
        )}

        {/* P1 & Opponent Indicators with Exact Portraits & Selected Fighter Names (No giant splash art) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-4 items-stretch">
          {/* Jogador 1 Card (Red Metallic Frame) */}
          <button
            type="button"
            onClick={() => {
              onPreviewSound('select');
              setActiveSlot(1);
            }}
            className={`relative flex items-center gap-3 px-3 py-2 text-left cursor-pointer transition-all ${
              activeSlot === 1
                ? 'bg-gradient-to-r from-[#2c0c13]/95 via-[#18121f]/92 to-[#120e1a]/90 border-2 border-red-500 shadow-[0_0_18px_rgba(239,68,68,0.45)]'
                : 'bg-[#120e1a]/88 border-2 border-[#4d2530] hover:border-red-500/80'
            }`}
          >
            <div className="p-[2px] bg-gradient-to-b from-red-300 via-red-600 to-red-900 shrink-0">
              <PixelPortrait characterId={p1Char} size={60} className="border border-black" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-red-400">
                  Jogador 1 (1P)
                </span>
                {activeSlot === 1 && (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-red-200">
                    Selecionando
                  </span>
                )}
              </div>
              <div className="font-arcade text-sm sm:text-base text-white truncate leading-tight mt-0.5">
                {p1Label}
              </div>
              <div className="text-[11px] text-slate-300 truncate">
                {p1Data.title} · {p1Data.style}
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5 text-[10px] text-slate-300 font-semibold">
                <span>VIDA <strong className="font-mono-num text-white">{p1Data.maxHp}</strong></span>
                <span>FOR <strong className="font-mono-num text-red-300">{p1Data.stats.power}/5</strong></span>
                <span>VEL <strong className="font-mono-num text-amber-300">{p1Data.stats.speed}/5</strong></span>
                <span>ALC <strong className="font-mono-num text-cyan-300">{p1Data.stats.range}/5</strong></span>
                <span>DEF <strong className="font-mono-num text-emerald-300">{p1Data.stats.defense}/5</strong></span>
              </div>
            </div>
          </button>

          {/* Oponente IA / Jogador 2 Card (Gold Metallic Frame) */}
          <button
            type="button"
            onClick={() => {
              onPreviewSound('select');
              setActiveSlot(2);
            }}
            className={`relative flex items-center gap-3 px-3 py-2 text-left cursor-pointer transition-all ${
              activeSlot === 2
                ? 'bg-gradient-to-l from-[#2b1f09]/95 via-[#18141d]/92 to-[#120e1a]/90 border-2 border-amber-400 shadow-[0_0_18px_rgba(251,191,36,0.42)]'
                : 'bg-[#120e1a]/88 border-2 border-[#4d3c1f] hover:border-amber-400/80'
            }`}
          >
            <div className="p-[2px] bg-gradient-to-b from-amber-200 via-amber-500 to-amber-800 shrink-0 md:order-2">
              <PixelPortrait characterId={p2Char} flip size={60} className="border border-black" />
            </div>
            <div className="min-w-0 flex-1 md:text-right md:order-1">
              <div className="flex items-center justify-between md:flex-row-reverse gap-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-amber-400">
                  {mode === 'arcade' ? 'Oponente IA' : 'Jogador 2 (P2)'}
                </span>
                {activeSlot === 2 && (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-200">
                    Selecionando
                  </span>
                )}
              </div>
              <div className="font-arcade text-sm sm:text-base text-white truncate leading-tight mt-0.5">
                {p2Label}
              </div>
              <div className="text-[11px] text-slate-300 truncate">
                {p2Data.title} · {p2Data.style}
              </div>
              <div className="flex flex-wrap items-center md:justify-end gap-x-3 gap-y-0.5 mt-0.5 text-[10px] text-slate-300 font-semibold">
                <span>VIDA <strong className="font-mono-num text-white">{p2Data.maxHp}</strong></span>
                <span>FOR <strong className="font-mono-num text-red-300">{p2Data.stats.power}/5</strong></span>
                <span>VEL <strong className="font-mono-num text-amber-300">{p2Data.stats.speed}/5</strong></span>
                <span>ALC <strong className="font-mono-num text-cyan-300">{p2Data.stats.range}/5</strong></span>
                <span>DEF <strong className="font-mono-num text-emerald-300">{p2Data.stats.defense}/5</strong></span>
              </div>
            </div>
          </button>
        </div>

        {/* CENTERPIECE: TEKKEN 5 METALLIC SQUARE PORTRAIT GRID (6 columns x 2 rows) */}
        <section
          aria-label="Grade de Lutadores"
          className="w-full max-w-[660px] mx-auto pt-3 pb-2 px-2.5 bg-[#0e0a16]/88 border border-[#616a7a]/85 shadow-[0_10px_30px_rgba(0,0,0,0.85)]"
        >
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 sm:gap-2">
            {CHARACTER_LIST.map((ch) => {
              const isP1 = p1Char === ch.id;
              const isP2 = p2Char === ch.id;
              const frameGradient =
                isP1 && isP2
                  ? 'bg-gradient-to-r from-red-500 via-amber-400 to-amber-300 shadow-[0_0_18px_rgba(245,158,11,0.8)]'
                  : isP1
                  ? 'bg-gradient-to-b from-red-300 via-red-500 to-red-900 shadow-[0_0_18px_rgba(239,68,68,0.88)]'
                  : isP2
                  ? 'bg-gradient-to-b from-amber-200 via-amber-400 to-amber-800 shadow-[0_0_16px_rgba(251,191,36,0.82)]'
                  : 'bg-gradient-to-b from-[#9aa3b2] via-[#313744] to-[#5e6675] hover:from-[#e2e8f0] hover:via-[#475569] hover:to-[#94a3b8] shadow-[0_4px_10px_rgba(0,0,0,0.85)]';

              return (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => handleCardClick(ch.id)}
                  aria-label={`${ch.name}${isP1 ? ' (Jogador 1)' : ''}${isP2 ? ` (${p2Tag})` : ''}`}
                  aria-pressed={isP1 || isP2}
                  className={`relative flex flex-col p-[3px] transition-transform duration-150 hover:scale-[1.04] cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-300 ${frameGradient}`}
                >
                  {/* Protruding Tekken 5 P1 / Opponent Slanted Corner Indicators */}
                  {isP1 && (
                    <span
                      className="absolute -top-2.5 left-0.5 z-20 px-1.5 py-[1px] bg-red-600 border border-red-200 text-white text-[9px] sm:text-[10px] font-black italic tracking-wider shadow-[0_2px_6px_rgba(0,0,0,0.9)] -skew-x-12 leading-tight"
                    >
                      P1
                    </span>
                  )}
                  {isP2 && (
                    <span
                      className="absolute -top-2.5 right-0.5 z-20 px-1.5 py-[1px] bg-amber-400 border border-amber-100 text-[#09070d] text-[9px] sm:text-[10px] font-black italic tracking-wider shadow-[0_2px_6px_rgba(0,0,0,0.9)] -skew-x-12 leading-tight"
                    >
                      {p2Tag}
                    </span>
                  )}

                  {/* Uncropped Square Metallic Well + Nameplate Cleanly Below Portrait */}
                  <div className="relative w-full aspect-square bg-[#09070d] border border-black overflow-hidden">
                    <PixelPortrait characterId={ch.id} fill />
                  </div>
                  <div className="w-full bg-[#09070d]/95 border-x border-b border-black px-0.5 py-0.5">
                    <span className="block text-[8.5px] sm:text-[9.5px] font-bold uppercase tracking-normal text-white text-center truncate leading-tight">
                      {ch.name}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* SPECIAL MOVE PREVIEW BAR (4 Specials + Finisher Demo) */}
        <div className="w-full max-w-[780px] mx-auto bg-[#110e19]/92 border border-[#4a5160] px-3 py-2 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1.5 text-[10px] font-bold uppercase tracking-wider">
            <span className="text-slate-300">Golpes de {inspectedChar.name}</span>
            <span className="text-red-300 truncate">Clique para testar na arena</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
            {(['special1', 'special2', 'special3', 'special4'] as SpecialSlot[]).map((slot, idx) => {
              const sp = inspectedChar.specials[slot];
              const keyBadge = ['1 / R', '2 / T', '3 / Y', '4 / U'][idx];
              return (
                <button
                  key={slot}
                  type="button"
                  onClick={() => triggerDemo(slot, sp.name)}
                  title={`${sp.name}: ${sp.description}`}
                  className="flex flex-col justify-between px-2.5 py-1.5 bg-[#1a1d26] border border-[#3b4250] hover:border-amber-400 text-left cursor-pointer transition-colors"
                >
                  <span className="flex items-center justify-between gap-1 text-[9px] font-bold text-amber-400 leading-none">
                    <span>{keyBadge}</span>
                    <Play className="w-2.5 h-2.5 shrink-0" />
                  </span>
                  <span className="text-[10px] font-bold text-white leading-tight mt-0.5 line-clamp-2">
                    {sp.name}
                  </span>
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => triggerDemo('finisher', 'Finalização')}
              title={inspectedChar.finisherText}
              className="col-span-2 sm:col-span-1 flex flex-col justify-between px-2.5 py-1.5 bg-red-950/75 border border-red-500/70 hover:border-amber-400 text-left cursor-pointer transition-colors"
            >
              <span className="flex items-center justify-between gap-1 text-[9px] font-bold text-red-300 leading-none">
                <span>Vitória</span>
                <Sparkles className="w-2.5 h-2.5 shrink-0" />
              </span>
              <span className="text-[10px] font-bold text-amber-200 leading-tight mt-0.5">
                Finalização
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* BOTTOM TEKKEN 5 BRUSHED METAL CONFIRMATION BAR */}
      <footer className="relative z-10 w-full bg-gradient-to-b from-[#232833] via-[#13161e] to-[#0a0c11] border-t-2 border-[#7b8494] px-3 sm:px-6 py-2 shrink-0">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          {/* Left Control Indications */}
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-200">
            <span className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 bg-[#0e1016] border border-[#6e7787] text-[10px] text-amber-300">
                WASD / Setas
              </kbd>
              Selecionar
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 bg-[#0e1016] border border-[#6e7787] text-[10px] text-red-300">
                Tab
              </kbd>
              Alternar P1/{p2Tag}
            </span>
          </div>

          {/* Center Matchup Summary */}
          <div className="text-xs font-bold uppercase tracking-wider text-slate-300 text-center truncate max-w-full">
            <span className="text-red-400">{p1Label}</span>
            {' '}vs{' '}
            <span className="text-amber-400">{p2Label}</span>
          </div>

          {/* Right Confirm Cue + Primary Continue to Stage Select Button */}
          <div className="flex items-center gap-3 shrink-0 w-full sm:w-auto justify-center sm:justify-end">
            <span className="hidden md:flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-200">
              <kbd className="px-1.5 py-0.5 bg-[#0e1016] border border-[#6e7787] text-[10px] text-white">
                Enter / K
              </kbd>
              Confirmar
            </span>
            <button
              type="button"
              data-stage-next="true"
              onClick={onContinue}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2 bg-gradient-to-b from-amber-400 via-amber-500 to-amber-700 hover:from-amber-300 hover:to-amber-600 active:translate-y-0.5 border-2 border-[#fef3c7] text-[#09070d] font-arcade text-xs sm:text-sm font-bold uppercase tracking-wider shadow-[0_0_16px_rgba(245,158,11,0.55)] cursor-pointer transition-all"
            >
              ESCOLHER CENÁRIO
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
