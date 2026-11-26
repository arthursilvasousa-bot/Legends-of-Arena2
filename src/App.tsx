import { useCallback, useEffect, useState } from 'react';
import { CharacterSelect } from './components/CharacterSelect';
import { FightArena } from './components/FightArena';
import { TitleScreen } from './components/TitleScreen';
import { TournamentScreen } from './components/TournamentScreen';
import { soundEngine } from './game/audio';
import { CHARACTERS, CHARACTER_LIST } from './game/roster';
import { GameSettings, loadSettings, saveSettings } from './game/settings';
import {
  TournamentBracket,
  TournamentMatch,
  recordMatchWinner,
  simulateCpuMatch,
} from './game/tournament';
import { AppScreen, ArenaId, CharacterId, Difficulty, GameMode } from './game/types';

export default function App() {
  const [screen, setScreen] = useState<AppScreen>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1') {
        return 'playing';
      }
    }
    return 'title';
  });

  const [settings, setSettings] = useState<GameSettings>(() => loadSettings());
  const [mode, setMode] = useState<GameMode>('arcade');
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [p1Char, setP1Char] = useState<CharacterId>('ninja');
  const [p2Char, setP2Char] = useState<CharacterId>('minotaur');
  const [arenaId, setArenaId] = useState<ArenaId>('shadow_temple');
  const [arcadeStage, setArcadeStage] = useState(1);
  const [muted, setMuted] = useState(false);

  const [tournamentBracket, setTournamentBracket] = useState<TournamentBracket | null>(null);
  const [activeTournamentMatch, setActiveTournamentMatch] = useState<TournamentMatch | null>(null);

  const arcadeOpponents = CHARACTER_LIST.filter((c) => c.id !== p1Char);
  const arcadeTotalStages = arcadeOpponents.length;

  // Keep document.body.dataset.state synced with AppScreen
  useEffect(() => {
    document.body.dataset.state = screen;
  }, [screen]);

  // Apply persisted settings to soundEngine whenever updated
  useEffect(() => {
    soundEngine.applySettings(settings);
  }, [settings]);

  const handleUpdateSettings = useCallback((next: GameSettings) => {
    const saved = saveSettings(next);
    setSettings(saved);
    soundEngine.applySettings(saved);
  }, []);

  const handleToggleMute = useCallback(() => {
    const next = soundEngine.toggleMute();
    setMuted(next);
  }, []);

  const handleOpenSelectWithMode = useCallback((nextMode: GameMode) => {
    soundEngine.unlock();
    soundEngine.startBgm('menu');
    setMode(nextMode);
    setActiveTournamentMatch(null);
    setScreen('select');
  }, []);

  const handleOpenTournament = useCallback(() => {
    soundEngine.unlock();
    soundEngine.startBgm('menu');
    setScreen('tournament');
  }, []);

  const handleStartFight = useCallback(() => {
    soundEngine.unlock();
    soundEngine.playUiConfirm();
    soundEngine.startBgm('fight');
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setActiveTournamentMatch(null);
    setArcadeStage(1);
    if (mode === 'arcade') {
      const firstOpp = CHARACTER_LIST.find((c) => c.id !== p1Char) ?? CHARACTER_LIST[1];
      setP2Char(firstOpp.id);
    }
    setScreen('playing');
  }, [mode, p1Char]);

  const handleNextArcadeOpponent = useCallback(() => {
    soundEngine.playUiConfirm();
    const opps = CHARACTER_LIST.filter((c) => c.id !== p1Char);
    const nextIdx = Math.min(opps.length - 1, arcadeStage);
    const nextOpp = opps[nextIdx];
    setArcadeStage((s) => s + 1);
    setP2Char(nextOpp.id);
    setArenaId(nextOpp.homeArena);
    setScreen('playing');
  }, [arcadeStage, p1Char]);

  const handlePlayTournamentMatch = useCallback(
    (match: TournamentMatch) => {
      if (!match.p1 || !match.p2 || !tournamentBracket) return;
      soundEngine.unlock();
      soundEngine.startBgm('fight');
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      const bothHuman = match.p1.control === 'human' && match.p2.control === 'human';
      setMode(bothHuman ? 'versus' : 'arcade');
      setDifficulty(tournamentBracket.difficulty);
      setP1Char(match.p1.characterId);
      setP2Char(match.p2.characterId);
      setArenaId(match.arenaId);
      setArcadeStage(1);
      setActiveTournamentMatch(match);
      setScreen('playing');
    },
    [tournamentBracket]
  );

  const handleSimulateTournamentMatch = useCallback((match: TournamentMatch) => {
    if (!match.p1 || !match.p2) return;
    const result = simulateCpuMatch(match.p1, match.p2);
    setTournamentBracket((prev) =>
      prev
        ? recordMatchWinner(
            prev,
            match.roundIndex,
            match.matchIndex,
            result.winnerSide,
            result.scoreLabel
          )
        : prev
    );
  }, []);

  const handlePauseChange = useCallback((paused: boolean) => {
    setScreen((prev) => {
      if (prev === 'gameover') return prev;
      return paused ? 'paused' : 'playing';
    });
  }, []);

  const handleMatchOver = useCallback(
    (winnerSlot: 1 | 2, scoreLabel?: string) => {
      if (activeTournamentMatch) {
        setTournamentBracket((prev) =>
          prev
            ? recordMatchWinner(
                prev,
                activeTournamentMatch.roundIndex,
                activeTournamentMatch.matchIndex,
                winnerSlot,
                scoreLabel ?? '2 - 0'
              )
            : prev
        );
      }
      setScreen('gameover');
    },
    [activeTournamentMatch]
  );

  const handleReturnToTournament = useCallback(() => {
    soundEngine.playUiConfirm();
    soundEngine.startBgm('menu');
    setActiveTournamentMatch(null);
    setScreen('tournament');
  }, []);

  const handleGoToSelect = useCallback(() => {
    soundEngine.playUiSelect();
    soundEngine.startBgm('menu');
    setActiveTournamentMatch(null);
    setScreen('select');
  }, []);

  const handleGoToTitle = useCallback(() => {
    soundEngine.playUiBack();
    soundEngine.startBgm('menu');
    setActiveTournamentMatch(null);
    setScreen('title');
  }, []);

  const handlePreviewSound = useCallback((kind: 'select' | 'special' | 'victory') => {
    soundEngine.unlock();
    if (kind === 'select') soundEngine.playUiSelect();
    else if (kind === 'special') soundEngine.playSpecial();
    else soundEngine.playVictory();
  }, []);

  return (
    <div className="w-screen h-screen overflow-hidden bg-[#09070d]">
      {screen === 'title' && (
        <TitleScreen
          settings={settings}
          muted={muted}
          onUpdateSettings={handleUpdateSettings}
          onToggleMute={handleToggleMute}
          onPlayArcade={() => handleOpenSelectWithMode('arcade')}
          onPlayVersus={() => handleOpenSelectWithMode('versus')}
          onOpenTournament={handleOpenTournament}
        />
      )}

      {screen === 'select' && (
        <CharacterSelect
          mode={mode}
          difficulty={difficulty}
          p1Char={p1Char}
          p2Char={p2Char}
          arenaId={arenaId}
          muted={muted}
          onSelectP1={(id) => {
            setP1Char(id);
            if (mode === 'arcade') {
              const firstOpp = CHARACTER_LIST.find((c) => c.id !== id) ?? CHARACTER_LIST[1];
              setP2Char(firstOpp.id);
              setArenaId(CHARACTERS[id].homeArena);
            }
          }}
          onSelectP2={(id) => setP2Char(id)}
          onSelectArena={(id) => setArenaId(id)}
          onDifficultyChange={(d) => setDifficulty(d)}
          onToggleMute={handleToggleMute}
          onBack={handleGoToTitle}
          onFight={handleStartFight}
          onPreviewSound={handlePreviewSound}
        />
      )}

      {screen === 'tournament' && (
        <TournamentScreen
          bracket={tournamentBracket}
          onStartBracket={(b) => setTournamentBracket(b)}
          onPlayMatch={handlePlayTournamentMatch}
          onSimulateMatch={handleSimulateTournamentMatch}
          onResetBracket={() => setTournamentBracket(null)}
          onBackToMenu={handleGoToTitle}
          onUiSound={(kind) => {
            soundEngine.unlock();
            if (kind === 'select') soundEngine.playUiSelect();
            else if (kind === 'confirm') soundEngine.playUiConfirm();
            else soundEngine.playUiBack();
          }}
        />
      )}

      {(screen === 'playing' || screen === 'paused' || screen === 'gameover') && (
        <FightArena
          mode={mode}
          difficulty={difficulty}
          p1Char={p1Char}
          p2Char={p2Char}
          arenaId={arenaId}
          arcadeStage={arcadeStage}
          arcadeTotalStages={arcadeTotalStages}
          muted={muted}
          particlesEnabled={settings.particlesEnabled}
          visualEffectsEnabled={settings.visualEffectsEnabled}
          tournamentActive={activeTournamentMatch !== null}
          onToggleMute={handleToggleMute}
          onPauseChange={handlePauseChange}
          onMatchOver={handleMatchOver}
          onNextArcadeOpponent={handleNextArcadeOpponent}
          onReturnToTournament={handleReturnToTournament}
          onGoToSelect={handleGoToSelect}
          onGoToTitle={handleGoToTitle}
        />
      )}
    </div>
  );
}
