import { useEffect, useRef } from 'react';
import { ArrowLeft, MapPin, Shuffle, Swords, Volume2, VolumeX } from 'lucide-react';
import { createMatchState, stepMatch, createEmptyInput } from '../game/combatEngine';
import { adaoSpriteCache } from '../game/adaoSpritesLoader';
import { beelzebuSpriteCache } from '../game/beelzebuSpritesLoader';
import { donoSpriteCache } from '../game/donoSpritesLoader';
import { elfSpriteCache } from '../game/elfSpritesLoader';
import { jackSpriteCache } from '../game/jackSpritesLoader';
import { jaylonSpriteCache } from '../game/jaylonSpritesLoader';
import { minotaurSpriteCache } from '../game/minotaurSpritesLoader';
import { necromancerSpriteCache } from '../game/necromancerSpritesLoader';
import { ninjaSpriteCache } from '../game/ninjaSpritesLoader';
import { onElvenForestAssetsReady, onFavelaAssetsReady, renderArena } from '../game/pixelArenas';
import { renderFighter } from '../game/pixelSprites';
import { priestSpriteCache } from '../game/priestSpritesLoader';
import { ARENA_LIST, ARENAS, CHARACTERS, STAGE_HEIGHT, STAGE_WIDTH } from '../game/roster';
import { formatFighterDisplayName, moveArenaCursor, pickRandomArenaId } from '../game/selectHelpers';
import { teslaSpriteCache } from '../game/teslaSpritesLoader';
import { trollSpriteCache } from '../game/trollSpritesLoader';
import { ArenaId, CharacterId, Difficulty, GameMode } from '../game/types';
import { PixelPortrait } from './PixelPortrait';

interface StageSelectProps {
  mode: GameMode;
  difficulty: Difficulty;
  p1Char: CharacterId;
  p2Char: CharacterId;
  arenaId: ArenaId;
  muted: boolean;
  onSelectArena: (id: ArenaId) => void;
  onToggleMute: () => void;
  onBack: () => void;
  onFight: () => void;
  onPreviewSound: (kind: 'select' | 'special' | 'victory') => void;
}

function ArenaThumbCanvas({ arenaId }: { arenaId: ArenaId }) {
  const thumbRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let raf = 0;
    const draw = () => {
      const canvas = thumbRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.imageSmoothingEnabled = false;
      renderArena(ctx, arenaId, 1.2, 0);
    };
    draw();
    const unsubElven = arenaId === 'elven_forest' ? onElvenForestAssetsReady(draw) : null;
    const unsubFavela = arenaId === 'favela_vida_loka' ? onFavelaAssetsReady(draw) : null;
    let t1 = 0;
    let t2 = 0;
    // Redraw shortly after mount so pixel arena image textures finish decoding if loaded lazily
    raf = requestAnimationFrame(() => {
      draw();
      t1 = window.setTimeout(draw, 220);
      t2 = window.setTimeout(draw, 700);
    });
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      if (unsubElven) unsubElven();
      if (unsubFavela) unsubFavela();
    };
  }, [arenaId]);

  return (
    <canvas
      ref={thumbRef}
      width={STAGE_WIDTH}
      height={STAGE_HEIGHT}
      aria-hidden="true"
      className="w-full h-full object-cover pixelated block"
    />
  );
}

export function StageSelect({
  mode,
  difficulty,
  p1Char,
  p2Char,
  arenaId,
  muted,
  onSelectArena,
  onToggleMute,
  onBack,
  onFight,
  onPreviewSound,
}: StageSelectProps) {
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const confirmedRef = useRef(false);
  const onFightRef = useRef(onFight);
  onFightRef.current = onFight;
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;

  const stageStateRef = useRef(createMatchState(p1Char, p2Char, arenaId, 'versus', 'normal', true));

  useEffect(() => {
    const fresh = createMatchState(p1Char, p2Char, arenaId, 'versus', 'normal', true);
    fresh.f1.x = 150;
    fresh.f2.x = 330;
    stageStateRef.current = fresh;
  }, [p1Char, p2Char, arenaId]);

  useEffect(() => {
    confirmedRef.current = false;
  }, []);

  // Keyboard navigation across the 3x2 stage grid + [Enter]/[K] confirm + [Escape] back
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        e.preventDefault();
        onBackRef.current();
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
        const cols =
          typeof window !== 'undefined' && window.innerWidth >= 1024
            ? 3
            : typeof window !== 'undefined' && window.innerWidth >= 640
            ? 2
            : 1;
        onSelectArena(moveArenaCursor(arenaId, dir, ARENA_LIST, cols));
        return;
      }

      if (e.code === 'KeyK' || (e.code === 'Enter' && !(document.activeElement instanceof HTMLButtonElement))) {
        e.preventDefault();
        if (!confirmedRef.current) {
          confirmedRef.current = true;
          onFightRef.current();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [arenaId, onSelectArena, onPreviewSound]);

  // Live animated arena backdrop with selected P1 & P2 fighters standing ready
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
      const state = stageStateRef.current;

      state.roundTimeLeft = 99;
      stepMatch(state, createEmptyInput(), createEmptyInput(), dt);

      const canvas = previewCanvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = false;
          const focusX = (state.f1.x + state.f2.x) * 0.5;
          renderArena(ctx, state.arenaId, globalTime, 0, focusX);
          renderFighter(ctx, state.f2, globalTime);
          renderFighter(ctx, state.f1, globalTime);
        }
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const p1Data = CHARACTERS[p1Char];
  const p2Data = CHARACTERS[p2Char];
  const p1Label = formatFighterDisplayName(p1Data);
  const p2Label = formatFighterDisplayName(p2Data);
  const p2Tag = mode === 'arcade' ? 'IA' : 'P2';
  const currentArena = ARENAS[arenaId] ?? ARENA_LIST[0];

  return (
    <div className="relative w-full h-full bg-[#09070d] text-[#f5efe6] flex flex-col justify-between overflow-y-auto lg:overflow-hidden">
      {/* Live Animated Selected Stage Backdrop */}
      <canvas
        ref={previewCanvasRef}
        width={STAGE_WIDTH}
        height={STAGE_HEIGHT}
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover pixelated pointer-events-none"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 50% 30%, rgba(28, 10, 42, 0.2) 0%, rgba(12, 7, 20, 0.72) 62%, rgba(7, 4, 12, 0.94) 100%)',
        }}
      />

      {/* TOP BAR */}
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
            <span className="hidden sm:inline text-xs font-bold uppercase tracking-wider text-slate-200 arcade-stroke-sm">
              {mode === 'arcade'
                ? `Arcade · ${difficulty === 'easy' ? 'Fácil' : difficulty === 'normal' ? 'Normal' : 'Difícil'}`
                : 'Versus Local (2P)'}
            </span>
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

        {/* Center Metallic Header Plaque */}
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
                  ESCOLHA O CENÁRIO
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

      {/* MAIN STAGE SELECTION CONTENT */}
      <main className="relative z-10 flex-1 flex flex-col justify-end px-3 sm:px-6 pb-2.5 gap-2.5 min-h-0 max-w-6xl w-full mx-auto">
        {/* Selected Fighters Summary Strip + Current Stage Info */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 items-stretch">
          {/* Matchup Plaque */}
          <div className="lg:col-span-5 bg-[#110d1b]/90 border border-[#5a6375] px-3 py-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-[2px] bg-gradient-to-b from-red-300 via-red-600 to-red-900 shrink-0">
                <PixelPortrait characterId={p1Char} size={42} className="border border-black" />
              </div>
              <div className="min-w-0">
                <span className="block text-[9px] font-black uppercase tracking-wider text-red-400">
                  Jogador 1
                </span>
                <span className="block font-arcade text-xs text-white truncate">{p1Label}</span>
              </div>
            </div>

            <span className="font-arcade text-xs sm:text-sm text-amber-400 italic shrink-0 px-1">
              VS
            </span>

            <div className="flex items-center gap-2 min-w-0 flex-row-reverse text-right">
              <div className="p-[2px] bg-gradient-to-b from-amber-200 via-amber-500 to-amber-800 shrink-0">
                <PixelPortrait characterId={p2Char} flip size={42} className="border border-black" />
              </div>
              <div className="min-w-0">
                <span className="block text-[9px] font-black uppercase tracking-wider text-amber-400">
                  {p2Tag}
                </span>
                <span className="block font-arcade text-xs text-white truncate">{p2Label}</span>
              </div>
            </div>
          </div>

          {/* Active Stage Details + Random Stage Button */}
          <div className="lg:col-span-7 bg-[#110d1b]/90 border border-amber-500/70 px-3.5 py-2 flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="font-arcade text-sm sm:text-base text-amber-300 truncate">
                  {currentArena.name}
                </span>
                <span className="hidden sm:inline text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate">
                  · {currentArena.subtitle}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 line-clamp-2 mt-0.5 leading-snug">
                {currentArena.description}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                onPreviewSound('select');
                onSelectArena(pickRandomArenaId(arenaId));
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1b202b] border border-[#687387] hover:border-amber-400 text-[11px] font-bold uppercase tracking-wider text-amber-200 cursor-pointer shrink-0 transition-colors"
            >
              <Shuffle className="w-3.5 h-3.5" />
              Aleatória
            </button>
          </div>
        </div>

        {/* 3x2 STAGE SELECTION GRID */}
        <section
          aria-label="Grade de Cenários"
          className="w-full bg-[#0e0a16]/90 border border-[#616a7a]/85 p-2.5 sm:p-3 shadow-[0_10px_30px_rgba(0,0,0,0.85)]"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {ARENA_LIST.map((ar) => {
              const selected = arenaId === ar.id;
              return (
                <button
                  key={ar.id}
                  type="button"
                  aria-label={ar.name}
                  aria-pressed={selected}
                  onClick={() => {
                    onPreviewSound('select');
                    onSelectArena(ar.id);
                  }}
                  className={`group relative flex flex-col p-[2px] text-left cursor-pointer transition-transform duration-150 hover:scale-[1.015] focus-visible:outline-2 focus-visible:outline-amber-300 ${
                    selected
                      ? 'bg-gradient-to-b from-amber-200 via-amber-400 to-amber-700 shadow-[0_0_18px_rgba(251,191,36,0.65)]'
                      : 'bg-gradient-to-b from-[#6b7588] via-[#2c313d] to-[#474f5e] hover:from-slate-300 hover:to-slate-500'
                  }`}
                >
                  <div className="relative w-full aspect-[16/7] bg-[#09070d] overflow-hidden border border-black">
                    <ArenaThumbCanvas arenaId={ar.id} />
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 bg-gradient-to-t from-[#09070d] via-transparent to-black/25"
                    />
                    {selected && (
                      <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 bg-amber-400 text-[#09070d] text-[9px] font-black uppercase tracking-wider shadow">
                        Selecionado
                      </span>
                    )}
                  </div>
                  <div className="w-full bg-[#100c18] border-x border-b border-black px-2.5 py-1.5 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div
                        className={`font-arcade text-xs truncate ${
                          selected ? 'text-amber-300' : 'text-white group-hover:text-amber-200'
                        }`}
                      >
                        {ar.name}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">{ar.subtitle}</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      </main>

      {/* BOTTOM CONFIRMATION BAR */}
      <footer className="relative z-10 w-full bg-gradient-to-b from-[#232833] via-[#13161e] to-[#0a0c11] border-t-2 border-[#7b8494] px-3 sm:px-6 py-2 shrink-0">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-200">
            <span className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 bg-[#0e1016] border border-[#6e7787] text-[10px] text-amber-300">
                WASD / Setas
              </kbd>
              Escolher Cenário
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 bg-[#0e1016] border border-[#6e7787] text-[10px] text-slate-200">
                Esc
              </kbd>
              Voltar
            </span>
          </div>

          <div className="text-xs font-bold uppercase tracking-wider text-slate-300 text-center truncate max-w-full">
            <span className="text-red-400">{p1Label}</span>
            {' '}vs{' '}
            <span className="text-amber-400">{p2Label}</span>
            {' '}· <span className="text-white">{currentArena.name}</span>
          </div>

          <div className="flex items-center gap-3 shrink-0 w-full sm:w-auto justify-center sm:justify-end">
            <span className="hidden md:flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-200">
              <kbd className="px-1.5 py-0.5 bg-[#0e1016] border border-[#6e7787] text-[10px] text-white">
                Enter / K
              </kbd>
              Confirmar
            </span>
            <button
              type="button"
              data-fight-start="true"
              onClick={onFight}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-2 bg-gradient-to-b from-red-500 via-red-600 to-red-800 hover:from-red-400 hover:to-red-700 active:translate-y-0.5 border-2 border-[#e2e8f0] text-white font-arcade text-sm font-bold uppercase tracking-wider shadow-[0_0_16px_rgba(220,38,38,0.65)] cursor-pointer transition-all"
            >
              <Swords className="w-4 h-4" />
              LUTAR!
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
