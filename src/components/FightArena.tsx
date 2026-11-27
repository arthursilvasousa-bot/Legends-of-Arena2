import { useCallback, useEffect, useRef, useState } from 'react';
import { Gamepad2, Pause, RotateCcw, Shield, Trophy, Users, Volume2, VolumeX } from 'lucide-react';
import { soundEngine } from '../game/audio';
import {
  computeAiInputs,
  createEmptyInput,
  createMatchState,
  stepMatch,
} from '../game/combatEngine';
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
import { ADAO_SPECIAL3_CHARGE_DURATION } from '../game/adaoAnimator';
import { adaoSpriteCache } from '../game/adaoSpritesLoader';
import { renderArena } from '../game/pixelArenas';
import { renderParticles, renderProjectilesAndHazards } from '../game/pixelEffects';
import { renderFighter } from '../game/pixelSprites';
import { ARENAS, CHARACTERS, STAGE_HEIGHT, STAGE_WIDTH } from '../game/roster';
import { ArenaId, CharacterId, Difficulty, GameMode, InputState, MatchState, RoundPhase } from '../game/types';
import { PixelPortrait } from './PixelPortrait';

interface FightArenaProps {
  mode: GameMode;
  difficulty: Difficulty;
  p1Char: CharacterId;
  p2Char: CharacterId;
  arenaId: ArenaId;
  arcadeStage: number;
  arcadeTotalStages: number;
  muted: boolean;
  particlesEnabled?: boolean;
  visualEffectsEnabled?: boolean;
  tournamentActive?: boolean;
  onToggleMute: () => void;
  onPauseChange: (paused: boolean) => void;
  onMatchOver: (winnerSlot: 1 | 2, scoreLabel?: string) => void;
  onNextArcadeOpponent: () => void;
  onReturnToTournament?: () => void;
  onGoToSelect: () => void;
  onGoToTitle: () => void;
}

interface HudSnapshot {
  roundNumber: number;
  roundPhase: RoundPhase;
  roundBannerText: string;
  p1Rounds: number;
  p2Rounds: number;
  p1Combo: number;
  p2Combo: number;
  p1Energy: number;
  p2Energy: number;
  p1FurySec: number;
  p1FuryCooldownSec: number;
  p2FurySec: number;
  p2FuryCooldownSec: number;
  p1SpecialLockSec: number;
  p2SpecialLockSec: number;
  p1PoisonSec: number;
  p2PoisonSec: number;
  p1CageUses: number;
  p2CageUses: number;
  p1DonoAmmo: number;
  p2DonoAmmo: number;
  p1DonoReloadTenths: number;
  p2DonoReloadTenths: number;
  p1DonoCamoTenths: number;
  p2DonoCamoTenths: number;
  p1DonoSpeedTenths: number;
  p2DonoSpeedTenths: number;
  p1DonoEnergyFlash: boolean;
  p2DonoEnergyFlash: boolean;
  p1AdaoChargePct: number;
  p2AdaoChargePct: number;
  p1AdaoCopiedName: string;
  p2AdaoCopiedName: string;
  winnerSlot: 1 | 2 | null;
  p1Damage: number;
  p2Damage: number;
  p1MaxCombo: number;
  p2MaxCombo: number;
  elapsedTime: number;
}

export function FightArena({
  mode,
  difficulty,
  p1Char,
  p2Char,
  arenaId,
  arcadeStage,
  arcadeTotalStages,
  muted,
  particlesEnabled = true,
  visualEffectsEnabled = true,
  tournamentActive = false,
  onToggleMute,
  onPauseChange,
  onMatchOver,
  onNextArcadeOpponent,
  onReturnToTournament,
  onGoToSelect,
  onGoToTitle,
}: FightArenaProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const p1HpBarRef = useRef<HTMLDivElement | null>(null);
  const p1GhostBarRef = useRef<HTMLDivElement | null>(null);
  const p2HpBarRef = useRef<HTMLDivElement | null>(null);
  const p2GhostBarRef = useRef<HTMLDivElement | null>(null);
  const p1EnergyBarRef = useRef<HTMLDivElement | null>(null);
  const p2EnergyBarRef = useRef<HTMLDivElement | null>(null);
  const timerTextRef = useRef<HTMLDivElement | null>(null);

  const [isPaused, setIsPaused] = useState(false);
  const [showTouch, setShowTouch] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 920 || 'ontouchstart' in window;
  });

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth < 920) {
        setShowTouch(true);
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const [hud, setHud] = useState<HudSnapshot>({
    roundNumber: 1,
    roundPhase: 'intro',
    roundBannerText: 'ROUND 1',
    p1Rounds: 0,
    p2Rounds: 0,
    p1Combo: 0,
    p2Combo: 0,
    p1Energy: 50,
    p2Energy: 50,
    p1FurySec: 0,
    p1FuryCooldownSec: 0,
    p2FurySec: 0,
    p2FuryCooldownSec: 0,
    p1SpecialLockSec: 0,
    p2SpecialLockSec: 0,
    p1PoisonSec: 0,
    p2PoisonSec: 0,
    p1CageUses: 0,
    p2CageUses: 0,
    p1DonoAmmo: 5,
    p2DonoAmmo: 5,
    p1DonoReloadTenths: 0,
    p2DonoReloadTenths: 0,
    p1DonoCamoTenths: 0,
    p2DonoCamoTenths: 0,
    p1DonoSpeedTenths: 0,
    p2DonoSpeedTenths: 0,
    p1DonoEnergyFlash: false,
    p2DonoEnergyFlash: false,
    p1AdaoChargePct: 0,
    p2AdaoChargePct: 0,
    p1AdaoCopiedName: '',
    p2AdaoCopiedName: '',
    winnerSlot: null,
    p1Damage: 0,
    p2Damage: 0,
    p1MaxCombo: 0,
    p2MaxCombo: 0,
    elapsedTime: 0,
  });

  const matchRef = useRef<MatchState>(createMatchState(p1Char, p2Char, arenaId, mode, difficulty));
  const pausedRef = useRef(false);
  const particlesEnabledRef = useRef(particlesEnabled);
  particlesEnabledRef.current = particlesEnabled;
  const visualEffectsEnabledRef = useRef(visualEffectsEnabled);
  visualEffectsEnabledRef.current = visualEffectsEnabled;
  const heldCodesRef = useRef<Set<string>>(new Set());
  const p1QueueRef = useRef<Partial<InputState>>({});
  const p2QueueRef = useRef<Partial<InputState>>({});
  const touchHeldRef = useRef<{
    left: boolean;
    right: boolean;
    up: boolean;
    down: boolean;
    block: boolean;
    special3: boolean;
  }>({
    left: false,
    right: false,
    up: false,
    down: false,
    block: false,
    special3: false,
  });

  const syncPaused = useCallback(
    (next: boolean) => {
      pausedRef.current = next;
      setIsPaused(next);
      onPauseChange(next);
      if (next) {
        heldCodesRef.current.clear();
      }
    },
    [onPauseChange]
  );

  const handleRestartMatch = useCallback(() => {
    soundEngine.playUiConfirm();
    matchRef.current = createMatchState(p1Char, p2Char, arenaId, mode, difficulty);
    heldCodesRef.current.clear();
    p1QueueRef.current = {};
    p2QueueRef.current = {};
    syncPaused(false);
    setHud({
      roundNumber: 1,
      roundPhase: 'intro',
      roundBannerText: 'ROUND 1',
      p1Rounds: 0,
      p2Rounds: 0,
      p1Combo: 0,
      p2Combo: 0,
      p1Energy: 50,
      p2Energy: 50,
      p1FurySec: 0,
      p1FuryCooldownSec: 0,
      p2FurySec: 0,
      p2FuryCooldownSec: 0,
      p1SpecialLockSec: 0,
      p2SpecialLockSec: 0,
      p1PoisonSec: 0,
      p2PoisonSec: 0,
      p1CageUses: 0,
      p2CageUses: 0,
      p1DonoAmmo: 5,
      p2DonoAmmo: 5,
      p1DonoReloadTenths: 0,
      p2DonoReloadTenths: 0,
      p1DonoCamoTenths: 0,
      p2DonoCamoTenths: 0,
      p1DonoSpeedTenths: 0,
      p2DonoSpeedTenths: 0,
      p1DonoEnergyFlash: false,
      p2DonoEnergyFlash: false,
      p1AdaoChargePct: 0,
      p2AdaoChargePct: 0,
      p1AdaoCopiedName: '',
      p2AdaoCopiedName: '',
      winnerSlot: null,
      p1Damage: 0,
      p2Damage: 0,
      p1MaxCombo: 0,
      p2MaxCombo: 0,
      elapsedTime: 0,
    });
  }, [p1Char, p2Char, arenaId, mode, difficulty, syncPaused]);

  // Reset match if matchup/arena props change
  useEffect(() => {
    handleRestartMatch();
  }, [handleRestartMatch]);

  // Keyboard Listeners (isolated, clearing on blur)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.code === 'ArrowUp' ||
        e.code === 'ArrowDown' ||
        e.code === 'ArrowLeft' ||
        e.code === 'ArrowRight' ||
        e.code === 'Space'
      ) {
        e.preventDefault();
      }

      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (!e.repeat && matchRef.current.roundPhase !== 'match_over') {
          syncPaused(!pausedRef.current);
        }
        return;
      }

      if (pausedRef.current) return;

      const isNew = !heldCodesRef.current.has(e.code);
      heldCodesRef.current.add(e.code);
      if (!isNew) return;

      soundEngine.unlock();

      // P1 One-Shot Actions
      if (e.code === 'KeyF') p1QueueRef.current.punchPressed = true;
      if (e.code === 'KeyG') p1QueueRef.current.kickPressed = true;
      if (e.code === 'KeyE') p1QueueRef.current.grabPressed = true;
      if (e.code === 'KeyR') p1QueueRef.current.special1Pressed = true;
      if (e.code === 'KeyT') p1QueueRef.current.special2Pressed = true;
      if (e.code === 'KeyY') p1QueueRef.current.special3Pressed = true;
      if (e.code === 'KeyU') p1QueueRef.current.special4Pressed = true;

      if (matchRef.current.mode === 'arcade') {
        // Keys 1-4 trigger Specials 1-4 in 1P Arcade mode
        if (e.code === 'Digit1' || e.code === 'Numpad1') p1QueueRef.current.special1Pressed = true;
        if (e.code === 'Digit2' || e.code === 'Numpad2') p1QueueRef.current.special2Pressed = true;
        if (e.code === 'Digit3' || e.code === 'Numpad3') p1QueueRef.current.special3Pressed = true;
        if (e.code === 'Digit4' || e.code === 'Numpad4') p1QueueRef.current.special4Pressed = true;
      } else {
        // P2 One-Shot Actions in 2P Versus mode (top row digits & Numpad)
        if (e.code === 'Digit1' || e.code === 'Numpad1') p2QueueRef.current.punchPressed = true;
        if (e.code === 'Digit2' || e.code === 'Numpad2') p2QueueRef.current.kickPressed = true;
        if (e.code === 'Digit0' || e.code === 'Numpad0') p2QueueRef.current.grabPressed = true;
        if (e.code === 'Digit4' || e.code === 'Numpad4') p2QueueRef.current.special1Pressed = true;
        if (e.code === 'Digit5' || e.code === 'Numpad5') p2QueueRef.current.special2Pressed = true;
        if (e.code === 'Digit6' || e.code === 'Numpad6') p2QueueRef.current.special3Pressed = true;
        if (e.code === 'Digit7' || e.code === 'Numpad7') p2QueueRef.current.special4Pressed = true;
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      heldCodesRef.current.delete(e.code);
    };

    const clearHeld = () => {
      heldCodesRef.current.clear();
      touchHeldRef.current = { left: false, right: false, up: false, down: false, block: false, special3: false };
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', clearHeld);
    document.addEventListener('visibilitychange', clearHeld);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', clearHeld);
      document.removeEventListener('visibilitychange', clearHeld);
    };
  }, [syncPaused]);

  // Main 60FPS Simulation & Render Loop (never tears down on React state changes)
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
    let raf = 0;
    let last = performance.now();
    const start = last;
    let lastSnapshotKey = '';
    let reportedMatchOver = false;

    const tick = (now: number) => {
      const rawDt = (now - last) / 1000;
      last = now;
      const dt = Math.min(rawDt, 0.05);
      const globalTime = (now - start) / 1000;
      const state = matchRef.current;

      if (!pausedRef.current) {
        const held = heldCodesRef.current;
        const tHeld = touchHeldRef.current;

        const p1Input: InputState = {
          ...createEmptyInput(),
          left: held.has('KeyA') || tHeld.left,
          right: held.has('KeyD') || tHeld.right,
          up: held.has('KeyW') || tHeld.up,
          down: held.has('KeyS') || tHeld.down,
          block: held.has('KeyH') || tHeld.block,
          special3Held:
            held.has('KeyY') ||
            (state.mode === 'arcade' && (held.has('Digit3') || held.has('Numpad3'))) ||
            tHeld.special3,
          ...p1QueueRef.current,
        };
        p1QueueRef.current = {};

        let p2Input: InputState;
        if (state.mode === 'arcade') {
          p2Input = computeAiInputs(state, dt);
        } else {
          p2Input = {
            ...createEmptyInput(),
            left: held.has('ArrowLeft'),
            right: held.has('ArrowRight'),
            up: held.has('ArrowUp'),
            down: held.has('ArrowDown'),
            block: held.has('Digit3') || held.has('Numpad3'),
            special3Held: held.has('Digit6') || held.has('Numpad6'),
            ...p2QueueRef.current,
          };
        }
        p2QueueRef.current = {};

        stepMatch(state, p1Input, p2Input, dt);

        // Process discrete audio events
        for (const ev of state.events) {
          if (ev.type === 'hit_light') soundEngine.playHitLight();
          else if (ev.type === 'hit_heavy') soundEngine.playHitHeavy();
          else if (ev.type === 'block') soundEngine.playBlock();
          else if (ev.type === 'grab') soundEngine.playGrab();
          else if (ev.type === 'jump') soundEngine.playJump();
          else if (ev.type === 'land') soundEngine.playLand();
          else if (ev.type === 'special') soundEngine.playSpecial();
          else if (ev.type === 'teleport') soundEngine.playTeleport();
          else if (ev.type === 'round_start') soundEngine.playRoundStart();
          else if (ev.type === 'ko') soundEngine.playKo();
          else if (ev.type === 'victory') soundEngine.playVictory();
        }
      }

      // Direct DOM bar & timer updates (zero React reconciliation at 60Hz!)
      const p1Pct = Math.max(0, Math.min(100, (state.f1.hp / state.f1.maxHp) * 100));
      const p1GhostPct = Math.max(0, Math.min(100, (state.f1.ghostHp / state.f1.maxHp) * 100));
      const p2Pct = Math.max(0, Math.min(100, (state.f2.hp / state.f2.maxHp) * 100));
      const p2GhostPct = Math.max(0, Math.min(100, (state.f2.ghostHp / state.f2.maxHp) * 100));

      if (p1HpBarRef.current) p1HpBarRef.current.style.width = `${p1Pct}%`;
      if (p1GhostBarRef.current) p1GhostBarRef.current.style.width = `${p1GhostPct}%`;
      if (p2HpBarRef.current) p2HpBarRef.current.style.width = `${p2Pct}%`;
      if (p2GhostBarRef.current) p2GhostBarRef.current.style.width = `${p2GhostPct}%`;
      if (p1EnergyBarRef.current) p1EnergyBarRef.current.style.width = `${Math.round(state.f1.energy)}%`;
      if (p2EnergyBarRef.current) p2EnergyBarRef.current.style.width = `${Math.round(state.f2.energy)}%`;
      if (timerTextRef.current) {
        timerTextRef.current.textContent = String(Math.ceil(state.roundTimeLeft)).padStart(2, '0');
      }

      // Discrete HUD snapshot check
      const p1Can = Math.floor(state.f1.energy / 5);
      const p2Can = Math.floor(state.f2.energy / 5);
      const p1FurySec = state.f1.characterId === 'troll' ? Math.ceil(state.f1.furyTime) : 0;
      const p1FuryCooldownSec = state.f1.characterId === 'troll' && state.f1.furyTime <= 0 ? Math.ceil(state.f1.furyCooldown) : 0;
      const p2FurySec = state.f2.characterId === 'troll' ? Math.ceil(state.f2.furyTime) : 0;
      const p2FuryCooldownSec = state.f2.characterId === 'troll' && state.f2.furyTime <= 0 ? Math.ceil(state.f2.furyCooldown) : 0;
      const p1SpecialLockSec = state.f1.specialLockTime > 0 ? Math.ceil(state.f1.specialLockTime) : 0;
      const p2SpecialLockSec = state.f2.specialLockTime > 0 ? Math.ceil(state.f2.specialLockTime) : 0;
      const p1PoisonSec = state.f1.poisonTime > 0 ? Math.ceil(state.f1.poisonTime) : 0;
      const p2PoisonSec = state.f2.poisonTime > 0 ? Math.ceil(state.f2.poisonTime) : 0;
      const p1CageUses = state.f1.characterId === 'tesla' ? state.f1.cageUsesThisRound : 0;
      const p2CageUses = state.f2.characterId === 'tesla' ? state.f2.cageUsesThisRound : 0;
      const p1DonoAmmo = state.f1.characterId === 'dono' ? state.f1.donoAmmo : 0;
      const p2DonoAmmo = state.f2.characterId === 'dono' ? state.f2.donoAmmo : 0;
      const p1DonoReloadTenths = state.f1.characterId === 'dono' && state.f1.donoReloadTimer > 0 ? Math.ceil(state.f1.donoReloadTimer * 10) : 0;
      const p2DonoReloadTenths = state.f2.characterId === 'dono' && state.f2.donoReloadTimer > 0 ? Math.ceil(state.f2.donoReloadTimer * 10) : 0;
      const p1DonoCamoTenths = state.f1.characterId === 'dono' && state.f1.donoCamoTime > 0 ? Math.ceil(state.f1.donoCamoTime * 10) : 0;
      const p2DonoCamoTenths = state.f2.characterId === 'dono' && state.f2.donoCamoTime > 0 ? Math.ceil(state.f2.donoCamoTime * 10) : 0;
      const p1DonoSpeedTenths = state.f1.characterId === 'dono' && state.f1.donoSpeedTime > 0 ? Math.ceil(state.f1.donoSpeedTime * 10) : 0;
      const p2DonoSpeedTenths = state.f2.characterId === 'dono' && state.f2.donoSpeedTime > 0 ? Math.ceil(state.f2.donoSpeedTime * 10) : 0;
      const p1DonoEnergyFlash = state.f1.characterId === 'dono' && state.f1.donoEnergyGainFlash > 0;
      const p2DonoEnergyFlash = state.f2.characterId === 'dono' && state.f2.donoEnergyGainFlash > 0;
      const p1AdaoChargePct =
        state.f1.characterId === 'adao' && state.f1.adaoChargingSpecial3
          ? Math.min(100, Math.round((state.f1.adaoChargeTime / ADAO_SPECIAL3_CHARGE_DURATION) * 100))
          : 0;
      const p2AdaoChargePct =
        state.f2.characterId === 'adao' && state.f2.adaoChargingSpecial3
          ? Math.min(100, Math.round((state.f2.adaoChargeTime / ADAO_SPECIAL3_CHARGE_DURATION) * 100))
          : 0;
      const p1AdaoCopiedName =
        state.f1.characterId === 'adao' && state.f1.adaoCopiedSpecial
          ? state.f1.adaoCopiedSpecial.name.replace('Replicação: ', '')
          : '';
      const p2AdaoCopiedName =
        state.f2.characterId === 'adao' && state.f2.adaoCopiedSpecial
          ? state.f2.adaoCopiedSpecial.name.replace('Replicação: ', '')
          : '';
      const snapKey = `${state.roundNumber}|${state.roundPhase}|${state.roundBannerText}|${state.f1.roundsWon}|${state.f2.roundsWon}|${state.f1.comboCount}|${state.f2.comboCount}|${p1Can}|${p2Can}|${p1FurySec}|${p1FuryCooldownSec}|${p2FurySec}|${p2FuryCooldownSec}|${p1SpecialLockSec}|${p2SpecialLockSec}|${p1PoisonSec}|${p2PoisonSec}|${p1CageUses}|${p2CageUses}|${p1DonoAmmo}|${p2DonoAmmo}|${p1DonoReloadTenths}|${p2DonoReloadTenths}|${p1DonoCamoTenths}|${p2DonoCamoTenths}|${p1DonoSpeedTenths}|${p2DonoSpeedTenths}|${p1DonoEnergyFlash}|${p2DonoEnergyFlash}|${Math.floor(p1AdaoChargePct / 5)}|${Math.floor(p2AdaoChargePct / 5)}|${p1AdaoCopiedName}|${p2AdaoCopiedName}`;
      if (snapKey !== lastSnapshotKey) {
        lastSnapshotKey = snapKey;
        setHud({
          roundNumber: state.roundNumber,
          roundPhase: state.roundPhase,
          roundBannerText: state.roundBannerText,
          p1Rounds: state.f1.roundsWon,
          p2Rounds: state.f2.roundsWon,
          p1Combo: state.f1.comboCount,
          p2Combo: state.f2.comboCount,
          p1Energy: Math.round(state.f1.energy),
          p2Energy: Math.round(state.f2.energy),
          p1FurySec,
          p1FuryCooldownSec,
          p2FurySec,
          p2FuryCooldownSec,
          p1SpecialLockSec,
          p2SpecialLockSec,
          p1PoisonSec,
          p2PoisonSec,
          p1CageUses,
          p2CageUses,
          p1DonoAmmo,
          p2DonoAmmo,
          p1DonoReloadTenths,
          p2DonoReloadTenths,
          p1DonoCamoTenths,
          p2DonoCamoTenths,
          p1DonoSpeedTenths,
          p2DonoSpeedTenths,
          p1DonoEnergyFlash,
          p2DonoEnergyFlash,
          p1AdaoChargePct,
          p2AdaoChargePct,
          p1AdaoCopiedName,
          p2AdaoCopiedName,
          winnerSlot: state.winnerSlot,
          p1Damage: state.f1.totalDamageDealt,
          p2Damage: state.f2.totalDamageDealt,
          p1MaxCombo: state.f1.maxComboAchieved,
          p2MaxCombo: state.f2.maxComboAchieved,
          elapsedTime: state.elapsedMatchTime,
        });

        if (state.roundPhase === 'match_over' && state.winnerSlot && !reportedMatchOver) {
          reportedMatchOver = true;
          const scoreLabel =
            state.winnerSlot === 1
              ? `${state.f1.roundsWon} - ${state.f2.roundsWon}`
              : `${state.f2.roundsWon} - ${state.f1.roundsWon}`;
          onMatchOver(state.winnerSlot, scoreLabel);
        }
      }

      // Render Canvas
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = false;
          const shakeMag = visualEffectsEnabledRef.current
            ? state.shakeTrauma * state.shakeTrauma * 6
            : 0;
          const shakeX = shakeMag > 0.2 ? Math.round((Math.random() - 0.5) * 2 * shakeMag) : 0;
          const shakeY = shakeMag > 0.2 ? Math.round((Math.random() - 0.5) * 2 * shakeMag) : 0;

          ctx.save();
          ctx.translate(shakeX, shakeY);
          const midOffset =
            state.roundPhase === 'finisher' || state.roundPhase === 'match_over'
              ? 0
              : ((state.f1.x + state.f2.x) * 0.5 - STAGE_WIDTH * 0.5) * 0.35;
          renderArena(ctx, state.arenaId, globalTime, midOffset);
          renderFighter(ctx, state.f1, globalTime);
          renderFighter(ctx, state.f2, globalTime);
          renderProjectilesAndHazards(ctx, state, globalTime);
          if (particlesEnabledRef.current) {
            renderParticles(ctx, state);
          }
          ctx.restore();
        }
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [onMatchOver]);

  const p1Def = CHARACTERS[p1Char];
  const p2Def = CHARACTERS[p2Char];
  const arenaDef = ARENAS[arenaId];
  const winnerDef = hud.winnerSlot === 1 ? p1Def : hud.winnerSlot === 2 ? p2Def : null;

  const setTouchDir = (key: keyof typeof touchHeldRef.current, val: boolean) => {
    soundEngine.unlock();
    touchHeldRef.current[key] = val;
  };

  const triggerP1Action = (key: keyof InputState) => {
    soundEngine.unlock();
    (p1QueueRef.current as Record<string, boolean>)[key] = true;
  };

  return (
    <div className="relative w-full h-full bg-[#09070d] flex flex-col items-center justify-center overflow-hidden">
      {/* Isolated Pixel-Art Stage Container */}
      <div className="relative w-full max-w-[1440px] aspect-video max-h-full bg-[#09070d] shadow-2xl overflow-hidden">
        <canvas
          ref={canvasRef}
          data-testid="fight-canvas"
          width={STAGE_WIDTH}
          height={STAGE_HEIGHT}
          className="w-full h-full object-contain pixelated block"
        />

        {/* Reference-Matched Arcade HUD Overlay (pointer-events: none) */}
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-1.5 sm:p-4 md:p-5">
          {/* TOP BAR: Portraits + Lime Green HP Bars + Centered Timer */}
          <div className="flex items-start justify-between gap-1.5 sm:gap-4 w-full">
            {/* P1 Cluster */}
            <div className="flex items-start gap-1.5 sm:gap-2 flex-1 min-w-0 max-w-[44%]">
              <div className="relative shrink-0 bg-[#140e1f] border-2 sm:border-[3px] border-[#09070d] shadow-[0_2px_0_#09070d] outline outline-2 outline-red-500">
                <PixelPortrait characterId={p1Char} size={34} className="w-8 h-8 sm:w-16 sm:h-16" />
              </div>

              <div className="flex-1 min-w-0 pt-0.5 sm:pt-1">
                {/* Health Bar Track */}
                <div className="relative h-3.5 sm:h-6 bg-[#26222c] border-2 sm:border-[3px] border-[#09070d] shadow-[0_2px_0_#09070d]">
                  <div
                    ref={p1GhostBarRef}
                    style={{ width: '100%' }}
                    className="absolute inset-y-0 left-0 bg-red-500 transition-none"
                  />
                  <div
                    ref={p1HpBarRef}
                    style={{ width: '100%' }}
                    className="absolute inset-y-0 left-0 bg-[#65e82a] border-r-2 border-white/70 transition-none"
                  />
                </div>

                {/* Name + Round Win Pips */}
                <div className="flex items-center justify-between mt-0.5 sm:mt-1 gap-1">
                  <span className="font-arcade italic text-[9px] sm:text-sm md:text-base text-white arcade-stroke-sm truncate">
                    {p1Def.name.toUpperCase()}{' '}
                    <span className="hidden sm:inline">
                      · {!p1Def.playerName || p1Def.name.toLowerCase() === p1Def.playerName.toLowerCase() ? '1P' : p1Def.playerName.toUpperCase()}
                    </span>
                  </span>
                  <div className="flex items-center gap-0.5 sm:gap-1 shrink-0" aria-label={`Rounds vencidos P1: ${hud.p1Rounds}`}>
                    {[0, 1].map((idx) => (
                      <span
                        key={idx}
                        className={`w-3.5 h-3.5 sm:w-5 sm:h-5 flex items-center justify-center border border-[#09070d] sm:border-2 text-[8px] sm:text-[10px] font-arcade font-bold ${
                          idx < hud.p1Rounds ? 'bg-amber-400 text-[#09070d]' : 'bg-[#1a1426] text-slate-600'
                        }`}
                      >
                        V
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Center Arcade Timer & Round Indicator */}
            <div className="flex flex-col items-center shrink-0 -mt-0.5 sm:-mt-1 px-0.5">
              <div
                ref={timerTextRef}
                data-testid="round-timer"
                className="font-arcade text-lg sm:text-4xl md:text-5xl text-white arcade-stroke font-mono-num leading-none"
              >
                99
              </div>
              <div className="text-[8px] sm:text-xs font-arcade text-amber-400 arcade-stroke-sm mt-0.5 whitespace-nowrap">
                R{hud.roundNumber} {mode === 'arcade' ? `· ${arcadeStage}/${arcadeTotalStages}` : ''}
              </div>
            </div>

            {/* P2 / CPU Cluster */}
            <div className="flex items-start gap-1.5 sm:gap-2 flex-1 min-w-0 max-w-[44%] flex-row-reverse">
              <div className="relative shrink-0 bg-[#140e1f] border-2 sm:border-[3px] border-[#09070d] shadow-[0_2px_0_#09070d] outline outline-2 outline-amber-400">
                <PixelPortrait characterId={p2Char} flip size={34} className="w-8 h-8 sm:w-16 sm:h-16" />
              </div>

              <div className="flex-1 min-w-0 pt-0.5 sm:pt-1">
                {/* Mirrored Health Bar Track */}
                <div className="relative h-3.5 sm:h-6 bg-[#26222c] border-2 sm:border-[3px] border-[#09070d] shadow-[0_2px_0_#09070d]">
                  <div
                    ref={p2GhostBarRef}
                    style={{ width: '100%' }}
                    className="absolute inset-y-0 right-0 bg-red-500 transition-none"
                  />
                  <div
                    ref={p2HpBarRef}
                    style={{ width: '100%' }}
                    className="absolute inset-y-0 right-0 bg-[#65e82a] border-l-2 border-white/70 transition-none"
                  />
                </div>

                {/* Mirrored Name + Round Pips */}
                <div className="flex items-center justify-between flex-row-reverse mt-0.5 sm:mt-1 gap-1">
                  <span className="font-arcade italic text-[9px] sm:text-sm md:text-base text-white arcade-stroke-sm truncate">
                    {p2Def.name.toUpperCase()}{' '}
                    <span className="hidden sm:inline">
                      · {mode === 'arcade' ? 'IA' : !p2Def.playerName || p2Def.name.toLowerCase() === p2Def.playerName.toLowerCase() ? '2P' : p2Def.playerName.toUpperCase()}
                    </span>
                  </span>
                  <div className="flex items-center gap-0.5 sm:gap-1 shrink-0" aria-label={`Rounds vencidos P2: ${hud.p2Rounds}`}>
                    {[0, 1].map((idx) => (
                      <span
                        key={idx}
                        className={`w-3.5 h-3.5 sm:w-5 sm:h-5 flex items-center justify-center border border-[#09070d] sm:border-2 text-[8px] sm:text-[10px] font-arcade font-bold ${
                          idx < hud.p2Rounds ? 'bg-amber-400 text-[#09070d]' : 'bg-[#1a1426] text-slate-600'
                        }`}
                      >
                        V
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CENTER CALLOUTS: Combo Counters & Round Banner */}
          <div className="relative flex-1 flex items-center justify-center">
            {hud.p1Combo >= 2 && (
              <div className="absolute left-3 top-6 font-arcade text-amber-300 text-sm sm:text-xl arcade-stroke">
                {hud.p1Combo} HITS COMBO!
              </div>
            )}
            {hud.p2Combo >= 2 && (
              <div className="absolute right-3 top-6 font-arcade text-red-400 text-sm sm:text-xl arcade-stroke">
                {hud.p2Combo} HITS COMBO!
              </div>
            )}

            {hud.roundBannerText && (
              <div
                className={`flex flex-col items-center gap-2 text-center px-4 ${
                  hud.roundPhase === 'finisher' ? '-translate-y-8 sm:-translate-y-14' : ''
                }`}
              >
                <div
                  data-testid="round-banner"
                  className="font-arcade text-xl sm:text-4xl md:text-5xl text-amber-400 arcade-stroke tracking-wider"
                >
                  {hud.roundBannerText}
                </div>
                {hud.roundPhase === 'finisher' && winnerDef && (
                  <p
                    data-testid="finisher-victory-quote"
                    className="animate-victory-quote max-w-xl bg-[#09070d]/85 border border-amber-400/70 px-3 py-1.5 text-xs sm:text-sm md:text-base text-amber-200 italic arcade-stroke-sm shadow-lg"
                  >
                    “{winnerDef.victoryQuote.replace(/^[“"]|[”"]$/g, '')}”
                  </p>
                )}
              </div>
            )}
          </div>

          {/* BOTTOM BAR: Cyan Special Energy Gauges + Utility Controls */}
          <div className="flex items-end justify-between gap-2 sm:gap-3 w-full">
            {/* P1 Special Meter */}
            <div className="w-[34%] sm:w-[38%] max-w-[340px]">
              {( (p1Char === 'dono' && (hud.p1DonoCamoTenths > 0 || hud.p1DonoSpeedTenths > 0 || hud.p1DonoEnergyFlash)) ||
                (p1Char === 'adao' && (hud.p1AdaoChargePct > 0 || Boolean(hud.p1AdaoCopiedName))) ||
                hud.p1SpecialLockSec > 0 ||
                hud.p1PoisonSec > 0 ) && (
                <div className="hidden sm:flex flex-wrap items-center gap-1.5 text-[10px] font-bold arcade-stroke-sm mb-1">
                  {p1Char === 'adao' && hud.p1AdaoChargePct > 0 && (
                    <span data-testid="p1-adao-charge" className="whitespace-nowrap text-purple-200 bg-purple-950/95 px-1.5 py-0.5 border border-purple-400">
                      CARREGANDO {hud.p1AdaoChargePct}%
                    </span>
                  )}
                  {p1Char === 'adao' && hud.p1AdaoCopiedName && (
                    <span data-testid="p1-adao-copy" className="whitespace-nowrap text-red-200 bg-red-950/90 px-1.5 py-0.5 border border-red-400">
                      CÓPIA: {hud.p1AdaoCopiedName.toUpperCase()}
                    </span>
                  )}
                  {p1Char === 'dono' && hud.p1DonoCamoTenths > 0 && (
                    <span data-testid="p1-dono-camo" className="whitespace-nowrap text-slate-100 bg-slate-800/90 px-1.5 py-0.5 border border-slate-400">
                      CAMUFLAGEM {(hud.p1DonoCamoTenths / 10).toFixed(1)}s
                    </span>
                  )}
                  {p1Char === 'dono' && hud.p1DonoSpeedTenths > 0 && (
                    <span data-testid="p1-dono-speed" className="whitespace-nowrap text-emerald-200 bg-emerald-950/90 px-1.5 py-0.5 border border-emerald-400">
                      1.5x VEL {(hud.p1DonoSpeedTenths / 10).toFixed(1)}s
                    </span>
                  )}
                  {p1Char === 'dono' && hud.p1DonoEnergyFlash && (
                    <span data-testid="p1-dono-atividade" className="whitespace-nowrap text-fuchsia-200 bg-purple-950/90 px-1.5 py-0.5 border border-purple-400">
                      ATIVIDADE +25%
                    </span>
                  )}
                  {hud.p1SpecialLockSec > 0 && (
                    <span data-testid="p1-special-lock" className="whitespace-nowrap text-sky-200 bg-sky-900/80 px-1.5 py-0.5 border border-cyan-400">
                      BLOQUEADO {hud.p1SpecialLockSec}s
                    </span>
                  )}
                  {hud.p1PoisonSec > 0 && (
                    <span data-testid="p1-poison-status" className="whitespace-nowrap text-fuchsia-200 bg-purple-950/90 px-1.5 py-0.5 border border-fuchsia-400">
                      ENVENENADO {hud.p1PoisonSec}s
                    </span>
                  )}
                </div>
              )}
              <div className="hidden sm:flex items-center justify-between gap-2 text-[10px] font-bold text-cyan-300 arcade-stroke-sm mb-0.5">
                <span className="flex items-center gap-1.5 whitespace-nowrap">
                  <span>ENERGIA ESPECIAL</span>
                  {p1Char === 'troll' && hud.p1FurySec > 0 && (
                    <span data-testid="p1-fury-status" className="text-red-400 font-arcade">
                      · FÚRIA {hud.p1FurySec}s
                    </span>
                  )}
                  {p1Char === 'troll' && hud.p1FurySec <= 0 && hud.p1FuryCooldownSec > 0 && (
                    <span data-testid="p1-fury-status" className="text-amber-300">
                      · RECARGA {hud.p1FuryCooldownSec}s
                    </span>
                  )}
                  {p1Char === 'tesla' && (
                    <span
                      data-testid="p1-cage-counter"
                      className={hud.p1CageUses >= 2 ? 'text-rose-400 font-bold' : 'text-amber-300 font-bold'}
                    >
                      · GAIOLA {hud.p1CageUses}/2
                    </span>
                  )}
                  {p1Char === 'dono' && (
                    <span
                      data-testid="p1-dono-ammo"
                      className={
                        hud.p1DonoReloadTenths > 0
                          ? 'text-amber-300 bg-amber-950/90 px-1 border border-amber-400 font-bold'
                          : 'text-amber-200 font-bold'
                      }
                    >
                      {hud.p1DonoReloadTenths > 0
                        ? `· RECARGA ${(hud.p1DonoReloadTenths / 10).toFixed(1)}s`
                        : `· PISTOLA ${hud.p1DonoAmmo}/5`}
                    </span>
                  )}
                </span>
                <span className="whitespace-nowrap shrink-0">{mode === 'arcade' ? '1·2·3·4 / R·T·Y·U' : 'R · T · Y · U'}</span>
              </div>
              {p1Char === 'dono' && (
                <div className="flex sm:hidden items-center gap-1 text-[8px] font-bold mb-0.5">
                  <span className={hud.p1DonoReloadTenths > 0 ? 'text-amber-300' : 'text-amber-200'}>
                    {hud.p1DonoReloadTenths > 0
                      ? `RECARGA ${(hud.p1DonoReloadTenths / 10).toFixed(1)}s`
                      : `PISTOLA ${hud.p1DonoAmmo}/5`}
                  </span>
                  {hud.p1DonoCamoTenths > 0 && <span className="text-slate-200">· CAMO</span>}
                  {hud.p1DonoSpeedTenths > 0 && <span className="text-emerald-300">· 1.5x</span>}
                </div>
              )}
              <div className="relative h-2.5 sm:h-4 bg-[#140e1f] border-2 border-[#09070d] shadow-[0_2px_0_#09070d]">
                <div
                  ref={p1EnergyBarRef}
                  style={{ width: '50%' }}
                  className="absolute inset-y-0 left-0 bg-cyan-400 transition-none"
                />
                <div className="absolute inset-0 grid grid-cols-4 pointer-events-none">
                  <span className="border-r border-[#09070d]/70" />
                  <span className="border-r border-[#09070d]/70" />
                  <span className="border-r border-[#09070d]/70" />
                  <span />
                </div>
              </div>
            </div>

            {/* Center Utility Controls (pointer-events: auto) */}
            <div className="pointer-events-auto flex items-center gap-1 sm:gap-1.5 pb-0.5">
              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  onToggleMute();
                }}
                aria-label={muted ? 'Ativar áudio' : 'Silenciar áudio'}
                className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center bg-[#140e1f]/90 border-2 border-[#09070d] text-slate-200 hover:text-amber-300 cursor-pointer"
              >
                {muted ? <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
              </button>
              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  setShowTouch((v) => !v);
                }}
                aria-label="Alternar controles na tela"
                title="Controles na tela"
                className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center border-2 border-[#09070d] cursor-pointer ${
                  showTouch ? 'bg-amber-500 text-[#09070d]' : 'bg-[#140e1f]/90 text-slate-200 hover:text-amber-300'
                }`}
              >
                <Gamepad2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  syncPaused(!pausedRef.current);
                }}
                aria-label="Pausar combate"
                className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center bg-[#140e1f]/90 border-2 border-[#09070d] text-slate-200 hover:text-amber-300 cursor-pointer"
              >
                <Pause className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>

            {/* P2 Special Meter */}
            <div className="w-[34%] sm:w-[38%] max-w-[340px]">
              {( (p2Char === 'dono' && (hud.p2DonoCamoTenths > 0 || hud.p2DonoSpeedTenths > 0 || hud.p2DonoEnergyFlash)) ||
                (p2Char === 'adao' && (hud.p2AdaoChargePct > 0 || Boolean(hud.p2AdaoCopiedName))) ||
                hud.p2SpecialLockSec > 0 ||
                hud.p2PoisonSec > 0 ) && (
                <div className="hidden sm:flex flex-wrap justify-end items-center gap-1.5 text-[10px] font-bold arcade-stroke-sm mb-1">
                  {hud.p2PoisonSec > 0 && (
                    <span data-testid="p2-poison-status" className="whitespace-nowrap text-fuchsia-200 bg-purple-950/90 px-1.5 py-0.5 border border-fuchsia-400">
                      ENVENENADO {hud.p2PoisonSec}s
                    </span>
                  )}
                  {hud.p2SpecialLockSec > 0 && (
                    <span data-testid="p2-special-lock" className="whitespace-nowrap text-sky-200 bg-sky-900/80 px-1.5 py-0.5 border border-cyan-400">
                      BLOQUEADO {hud.p2SpecialLockSec}s
                    </span>
                  )}
                  {p2Char === 'adao' && hud.p2AdaoChargePct > 0 && (
                    <span data-testid="p2-adao-charge" className="whitespace-nowrap text-purple-200 bg-purple-950/95 px-1.5 py-0.5 border border-purple-400">
                      CARREGANDO {hud.p2AdaoChargePct}%
                    </span>
                  )}
                  {p2Char === 'adao' && hud.p2AdaoCopiedName && (
                    <span data-testid="p2-adao-copy" className="whitespace-nowrap text-red-200 bg-red-950/90 px-1.5 py-0.5 border border-red-400">
                      CÓPIA: {hud.p2AdaoCopiedName.toUpperCase()}
                    </span>
                  )}
                  {p2Char === 'dono' && hud.p2DonoEnergyFlash && (
                    <span data-testid="p2-dono-atividade" className="whitespace-nowrap text-fuchsia-200 bg-purple-950/90 px-1.5 py-0.5 border border-purple-400">
                      ATIVIDADE +25%
                    </span>
                  )}
                  {p2Char === 'dono' && hud.p2DonoSpeedTenths > 0 && (
                    <span data-testid="p2-dono-speed" className="whitespace-nowrap text-emerald-200 bg-emerald-950/90 px-1.5 py-0.5 border border-emerald-400">
                      1.5x VEL {(hud.p2DonoSpeedTenths / 10).toFixed(1)}s
                    </span>
                  )}
                  {p2Char === 'dono' && hud.p2DonoCamoTenths > 0 && (
                    <span data-testid="p2-dono-camo" className="whitespace-nowrap text-slate-100 bg-slate-800/90 px-1.5 py-0.5 border border-slate-400">
                      CAMUFLAGEM {(hud.p2DonoCamoTenths / 10).toFixed(1)}s
                    </span>
                  )}
                </div>
              )}
              <div className="hidden sm:flex items-center justify-between gap-2 text-[10px] font-bold text-cyan-300 arcade-stroke-sm mb-0.5">
                <span className="whitespace-nowrap shrink-0">4 · 5 · 6 · 7</span>
                <span className="flex items-center gap-1.5 whitespace-nowrap">
                  {p2Char === 'tesla' && (
                    <span
                      data-testid="p2-cage-counter"
                      className={hud.p2CageUses >= 2 ? 'text-rose-400 font-bold' : 'text-amber-300 font-bold'}
                    >
                      GAIOLA {hud.p2CageUses}/2 ·
                    </span>
                  )}
                  {p2Char === 'troll' && hud.p2FurySec > 0 && (
                    <span data-testid="p2-fury-status" className="text-red-400 font-arcade">
                      FÚRIA {hud.p2FurySec}s ·
                    </span>
                  )}
                  {p2Char === 'dono' && (
                    <span
                      data-testid="p2-dono-ammo"
                      className={
                        hud.p2DonoReloadTenths > 0
                          ? 'text-amber-300 bg-amber-950/90 px-1 border border-amber-400 font-bold'
                          : 'text-amber-200 font-bold'
                      }
                    >
                      {hud.p2DonoReloadTenths > 0
                        ? `RECARGA ${(hud.p2DonoReloadTenths / 10).toFixed(1)}s ·`
                        : `PISTOLA ${hud.p2DonoAmmo}/5 ·`}
                    </span>
                  )}
                  {p2Char === 'troll' && hud.p2FurySec <= 0 && hud.p2FuryCooldownSec > 0 && (
                    <span data-testid="p2-fury-status" className="text-amber-300">
                      RECARGA {hud.p2FuryCooldownSec}s ·
                    </span>
                  )}
                  <span>ENERGIA ESPECIAL</span>
                </span>
              </div>
              <div className="relative h-2.5 sm:h-4 bg-[#140e1f] border-2 border-[#09070d] shadow-[0_2px_0_#09070d]">
                <div
                  ref={p2EnergyBarRef}
                  style={{ width: '50%' }}
                  className="absolute inset-y-0 right-0 bg-cyan-400 transition-none"
                />
                <div className="absolute inset-0 grid grid-cols-4 pointer-events-none">
                  <span className="border-r border-[#09070d]/70" />
                  <span className="border-r border-[#09070d]/70" />
                  <span className="border-r border-[#09070d]/70" />
                  <span />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ON-SCREEN TOUCH CONTROLS (Shown on mobile/touch or when toggled) */}
      {showTouch && hud.roundPhase !== 'match_over' && !isPaused && (
        <div
          data-testid="touch-controls"
          className="w-full max-w-[1440px] px-2 sm:px-3 py-2 flex items-center justify-between gap-2 bg-[#110c1b] border-t-2 border-[#2d2142] shrink-0"
        >
          {/* Left Directional Pad */}
          <div className="grid grid-cols-3 gap-1 w-28 sm:w-44 shrink-0">
            <div />
            <button
              type="button"
              onPointerDown={() => setTouchDir('up', true)}
              onPointerUp={() => setTouchDir('up', false)}
              onPointerLeave={() => setTouchDir('up', false)}
              onPointerCancel={() => setTouchDir('up', false)}
              className="h-10 sm:h-11 bg-[#1e162e] active:bg-amber-500 active:text-[#09070d] border-2 border-[#3c2d57] font-bold text-sm touch-none cursor-pointer"
              aria-label="Pular"
            >
              ▲
            </button>
            <div />
            <button
              type="button"
              onPointerDown={() => setTouchDir('left', true)}
              onPointerUp={() => setTouchDir('left', false)}
              onPointerLeave={() => setTouchDir('left', false)}
              onPointerCancel={() => setTouchDir('left', false)}
              className="h-10 sm:h-11 bg-[#1e162e] active:bg-amber-500 active:text-[#09070d] border-2 border-[#3c2d57] font-bold text-sm touch-none cursor-pointer"
              aria-label="Mover esquerda"
            >
              ◀
            </button>
            <button
              type="button"
              onPointerDown={() => setTouchDir('down', true)}
              onPointerUp={() => setTouchDir('down', false)}
              onPointerLeave={() => setTouchDir('down', false)}
              onPointerCancel={() => setTouchDir('down', false)}
              className="h-10 sm:h-11 bg-[#1e162e] active:bg-amber-500 active:text-[#09070d] border-2 border-[#3c2d57] font-bold text-sm touch-none cursor-pointer"
              aria-label="Agachar"
            >
              ▼
            </button>
            <button
              type="button"
              onPointerDown={() => setTouchDir('right', true)}
              onPointerUp={() => setTouchDir('right', false)}
              onPointerLeave={() => setTouchDir('right', false)}
              onPointerCancel={() => setTouchDir('right', false)}
              className="h-10 sm:h-11 bg-[#1e162e] active:bg-amber-500 active:text-[#09070d] border-2 border-[#3c2d57] font-bold text-sm touch-none cursor-pointer"
              aria-label="Mover direita"
            >
              ▶
            </button>
          </div>

          {/* Right Combat & Specials Cluster */}
          <div className="grid grid-cols-4 gap-1 sm:gap-1.5 flex-1 max-w-[260px] sm:max-w-[340px]">
            <button
              type="button"
              onPointerDown={() => triggerP1Action('punchPressed')}
              className="h-10 sm:h-11 px-1 bg-red-800 active:bg-red-500 border-2 border-red-400 text-[9px] sm:text-[11px] font-bold uppercase touch-none cursor-pointer truncate"
            >
              Soco
            </button>
            <button
              type="button"
              onPointerDown={() => triggerP1Action('kickPressed')}
              className="h-10 sm:h-11 px-1 bg-orange-800 active:bg-orange-500 border-2 border-orange-400 text-[9px] sm:text-[11px] font-bold uppercase touch-none cursor-pointer truncate"
            >
              Chute
            </button>
            <button
              type="button"
              onPointerDown={() => setTouchDir('block', true)}
              onPointerUp={() => setTouchDir('block', false)}
              onPointerLeave={() => setTouchDir('block', false)}
              onPointerCancel={() => setTouchDir('block', false)}
              className="h-10 sm:h-11 px-1 bg-sky-900 active:bg-sky-500 border-2 border-sky-400 text-[9px] sm:text-[11px] font-bold uppercase touch-none cursor-pointer truncate"
            >
              Defesa
            </button>
            <button
              type="button"
              onPointerDown={() => triggerP1Action('grabPressed')}
              className="h-10 sm:h-11 px-1 bg-amber-800 active:bg-amber-500 border-2 border-amber-400 text-[9px] sm:text-[11px] font-bold uppercase touch-none cursor-pointer truncate"
            >
              Agarrão
            </button>
            {(['special1', 'special2', 'special3', 'special4'] as const).map((slot, idx) => {
              const sp = p1Def.specials[slot];
              const isLocked = hud.p1SpecialLockSec > 0;
              const isCageExhausted = p1Char === 'tesla' && slot === 'special4' && hud.p1CageUses >= 2;
              const isDonoReloading = p1Char === 'dono' && slot === 'special1' && (hud.p1DonoReloadTenths > 0 || hud.p1DonoAmmo <= 0);
              const canCast = hud.p1Energy >= sp.energyCost && !isLocked && !isCageExhausted && !isDonoReloading;
              const pressedKey =
                slot === 'special1'
                  ? 'special1Pressed'
                  : slot === 'special2'
                  ? 'special2Pressed'
                  : slot === 'special3'
                  ? 'special3Pressed'
                  : 'special4Pressed';
              const suffix = isLocked
                ? ` 🔒${hud.p1SpecialLockSec}s`
                : p1Char === 'tesla' && slot === 'special4'
                ? ` (${hud.p1CageUses}/2)`
                : p1Char === 'dono' && slot === 'special1'
                ? hud.p1DonoReloadTenths > 0
                  ? ` ⏳${(hud.p1DonoReloadTenths / 10).toFixed(1)}`
                  : ` (${hud.p1DonoAmmo}/5)`
                : '';
              return (
                <button
                  key={slot}
                  type="button"
                  onPointerDown={() => {
                    if (slot === 'special3') {
                      setTouchDir('special3', true);
                    }
                    triggerP1Action(pressedKey);
                  }}
                  onPointerUp={slot === 'special3' ? () => setTouchDir('special3', false) : undefined}
                  onPointerLeave={slot === 'special3' ? () => setTouchDir('special3', false) : undefined}
                  onPointerCancel={slot === 'special3' ? () => setTouchDir('special3', false) : undefined}
                  aria-label={`Especial ${idx + 1}: ${sp.name}`}
                  title={`${sp.name} (${sp.energyCost} Energia)`}
                  className={`h-9 sm:h-10 px-0.5 border text-[7.5px] sm:text-[10px] font-bold touch-none cursor-pointer truncate ${
                    canCast
                      ? 'bg-purple-900 active:bg-purple-500 border-purple-400 text-white'
                      : 'bg-[#1a1329] border-[#3a2b54] text-slate-500'
                  }`}
                >
                  {idx + 1}·{sp.name.split(' ')[0]}
                  {suffix}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* PAUSE MODAL */}
      {isPaused && hud.roundPhase !== 'match_over' && (
        <div className="fixed inset-0 z-30 bg-[#09070d]/85 flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-label="Combate Pausado"
            className="w-full max-w-md bg-[#140e1f] border-2 border-amber-500 p-6 arcade-box text-center"
          >
            <div className="flex items-center justify-center gap-2 text-amber-400 mb-1">
              <Shield className="w-5 h-5" />
              <span className="text-xs font-bold uppercase tracking-widest">{arenaDef.name}</span>
            </div>
            <h2 className="font-arcade text-2xl text-white mb-5">PAUSA</h2>

            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => syncPaused(false)}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-[#09070d] font-arcade text-sm font-bold uppercase cursor-pointer"
              >
                Continuar
              </button>
              <button
                type="button"
                onClick={handleRestartMatch}
                className="w-full py-2.5 bg-[#221836] hover:bg-[#2d2047] border border-[#493769] text-white font-bold text-sm uppercase cursor-pointer"
              >
                Reiniciar Combate
              </button>
              {tournamentActive && onReturnToTournament ? (
                <button
                  type="button"
                  onClick={onReturnToTournament}
                  className="w-full py-2.5 bg-[#221836] hover:bg-[#2d2047] border border-[#493769] text-white font-bold text-sm uppercase cursor-pointer"
                >
                  Voltar ao Torneio
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onGoToSelect}
                  className="w-full py-2.5 bg-[#221836] hover:bg-[#2d2047] border border-[#493769] text-white font-bold text-sm uppercase cursor-pointer"
                >
                  Seleção de Lutadores
                </button>
              )}
              <button
                type="button"
                onClick={onGoToTitle}
                className="w-full py-2.5 bg-[#191127] hover:bg-[#251938] border border-[#3a2b54] text-slate-300 font-bold text-sm uppercase cursor-pointer"
              >
                Menu Principal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VICTORY / GAME OVER MODAL */}
      {hud.roundPhase === 'match_over' && winnerDef && (
        <div className="fixed inset-0 z-30 bg-[#09070d]/88 flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-label={mode === 'arcade' && hud.winnerSlot === 2 ? 'Game Over' : 'Vitória na Arena'}
            className="w-full max-w-lg bg-[#140e1f] border-2 border-amber-500 p-6 arcade-box text-center"
          >
            <div className="flex items-center justify-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-widest mb-2">
              <Trophy className="w-4 h-4" />
              {mode === 'arcade' && hud.winnerSlot === 2
                ? 'GAME OVER'
                : mode === 'arcade' && arcadeStage >= arcadeTotalStages
                ? 'CAMPEÃO SUPREMO DA ARENA!'
                : `VITÓRIA DO JOGADOR ${hud.winnerSlot}`}
            </div>

            <div className="flex items-center justify-center gap-4 mb-4">
              <PixelPortrait
                characterId={winnerDef.id}
                size={84}
                className="border-2 border-amber-400 shrink-0"
              />
              <div className="text-left">
                <h2 className="font-arcade text-xl sm:text-2xl text-white">
                  {!winnerDef.playerName || winnerDef.name.toLowerCase() === winnerDef.playerName.toLowerCase()
                    ? winnerDef.name
                    : `${winnerDef.name} (${winnerDef.playerName})`}
                </h2>
                <p
                  data-testid="victory-quote"
                  className="animate-victory-quote text-xs sm:text-sm text-amber-300 italic mt-1"
                >
                  “{winnerDef.victoryQuote.replace(/^[“"]|[”"]$/g, '')}”
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {winnerDef.finisherText}
                </p>
              </div>
            </div>

            {/* 3 Tabular Match Stats */}
            <div className="grid grid-cols-3 gap-2 mb-5 bg-[#0e0a17] border border-[#2d2142] p-3">
              <div>
                <div className="text-[10px] font-bold uppercase text-slate-400">Placar</div>
                <div className="font-mono-num text-lg font-bold text-white">
                  {hud.p1Rounds} - {hud.p2Rounds}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase text-slate-400">Maior Combo</div>
                <div className="font-mono-num text-lg font-bold text-amber-400">
                  {Math.max(hud.p1MaxCombo, hud.p2MaxCombo)}x
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase text-slate-400">Dano Total</div>
                <div className="font-mono-num text-lg font-bold text-cyan-300">
                  {hud.winnerSlot === 1 ? hud.p1Damage : hud.p2Damage}
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5">
              {tournamentActive && onReturnToTournament && (
                <button
                  type="button"
                  onClick={onReturnToTournament}
                  className="flex-1 py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-[#09070d] font-arcade text-xs sm:text-sm font-bold uppercase cursor-pointer"
                >
                  Avançar no Torneio
                </button>
              )}

              {!tournamentActive && mode === 'arcade' && hud.winnerSlot === 1 && arcadeStage < arcadeTotalStages && (
                <button
                  type="button"
                  onClick={onNextArcadeOpponent}
                  className="flex-1 py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-[#09070d] font-arcade text-xs sm:text-sm font-bold uppercase cursor-pointer"
                >
                  Próximo Desafiante ({arcadeStage + 1}/{arcadeTotalStages})
                </button>
              )}

              <button
                type="button"
                data-start="true"
                onClick={handleRestartMatch}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-amber-500 hover:bg-amber-400 text-[#09070d] font-arcade text-xs sm:text-sm font-bold uppercase cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                Jogar Novamente
              </button>

              {!tournamentActive && (
                <button
                  type="button"
                  onClick={onGoToSelect}
                  className="flex items-center justify-center gap-1.5 py-3 px-4 bg-[#221836] hover:bg-[#2d2047] border border-[#493769] text-white font-bold text-xs uppercase cursor-pointer"
                >
                  <Users className="w-4 h-4" />
                  Lutadores
                </button>
              )}

              <button
                type="button"
                onClick={onGoToTitle}
                className="py-3 px-4 bg-[#191127] hover:bg-[#251938] border border-[#3a2b54] text-slate-300 font-bold text-xs uppercase cursor-pointer"
              >
                Menu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
