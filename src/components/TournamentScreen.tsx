import { useState } from 'react';
import { ArrowLeft, Cpu, Play, Shuffle, Swords, Trophy, User } from 'lucide-react';
import { CHARACTERS, CHARACTER_LIST } from '../game/roster';
import { formatFighterDisplayName } from '../game/selectHelpers';
import {
  TournamentBracket,
  TournamentMatch,
  TournamentParticipant,
  TournamentSize,
  createDefaultParticipants,
  createTournamentBracket,
  getNextPendingMatch,
  getRoundTitle,
} from '../game/tournament';
import { CharacterId, Difficulty } from '../game/types';
import { PixelPortrait } from './PixelPortrait';

interface TournamentScreenProps {
  bracket: TournamentBracket | null;
  onStartBracket: (bracket: TournamentBracket) => void;
  onPlayMatch: (match: TournamentMatch) => void;
  onSimulateMatch: (match: TournamentMatch) => void;
  onResetBracket: () => void;
  onBackToMenu: () => void;
  onUiSound: (kind: 'select' | 'confirm' | 'back') => void;
}

export function TournamentScreen({
  bracket,
  onStartBracket,
  onPlayMatch,
  onSimulateMatch,
  onResetBracket,
  onBackToMenu,
  onUiSound,
}: TournamentScreenProps) {
  const [size, setSize] = useState<TournamentSize>(4);
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [participants, setParticipants] = useState<TournamentParticipant[]>(() =>
    createDefaultParticipants(4)
  );
  const [editingSeed, setEditingSeed] = useState<number | null>(null);

  const handleSizeChange = (nextSize: TournamentSize) => {
    onUiSound('select');
    setSize(nextSize);
    setEditingSeed(null);
    setParticipants((prev) => {
      const defaults = createDefaultParticipants(nextSize);
      return defaults.map((def, idx) => (prev[idx] ? { ...prev[idx], seed: idx + 1 } : def));
    });
  };

  const handleRandomize = () => {
    onUiSound('select');
    const pool = [...CHARACTER_LIST].sort(() => Math.random() - 0.5).slice(0, size);
    setParticipants(
      pool.map((ch, idx) => ({
        seed: idx + 1,
        characterId: ch.id,
        control: idx === 0 ? 'human' : 'ai',
      }))
    );
  };

  const handleToggleControl = (seed: number) => {
    onUiSound('select');
    setParticipants((prev) =>
      prev.map((p) =>
        p.seed === seed ? { ...p, control: p.control === 'human' ? 'ai' : 'human' } : p
      )
    );
  };

  const handleAssignCharacter = (seed: number, characterId: CharacterId) => {
    onUiSound('select');
    setParticipants((prev) =>
      prev.map((p) => (p.seed === seed ? { ...p, characterId } : p))
    );
    setEditingSeed(null);
  };

  const handleLaunchTournament = () => {
    onUiSound('confirm');
    onStartBracket(createTournamentBracket(participants, difficulty));
  };

  const nextMatch = bracket ? getNextPendingMatch(bracket) : null;

  return (
    <div className="relative w-full h-full bg-[#09070d] text-[#f5efe6] flex flex-col justify-between overflow-y-auto">
      {/* Subtle dark fantasy radial background */}
      <div
        aria-hidden="true"
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 50% 15%, rgba(67, 25, 112, 0.42) 0%, rgba(16, 10, 32, 0.92) 60%, #07050c 100%)',
        }}
      />

      {/* Header */}
      <header className="relative z-10 flex flex-wrap items-center justify-between gap-2 px-4 sm:px-6 py-3 border-b-2 border-[#31224a] bg-[#0e0a18]/90 shrink-0">
        <button
          type="button"
          onClick={() => {
            onUiSound('back');
            onBackToMenu();
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1a1329] border border-[#4c3870] hover:border-amber-400 text-xs font-bold uppercase tracking-wider cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar ao Menu
        </button>

        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-400" />
          <h1 className="font-arcade text-base sm:text-xl text-amber-300 arcade-stroke-sm tracking-wider">
            TORNEIO DA ARENA
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {bracket && (
            <button
              type="button"
              onClick={() => {
                onUiSound('back');
                onResetBracket();
              }}
              className="px-3 py-1.5 bg-[#1a1329] border border-[#4c3870] hover:border-amber-400 text-xs font-bold uppercase tracking-wider cursor-pointer"
            >
              Novo Torneio
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-4 flex flex-col gap-4 justify-center">
        {!bracket ? (
          /* SETUP PHASE */
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-[#120d1f]/95 border-2 border-[#3b2d54] p-3 sm:p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300 mr-1">
                  Participantes:
                </span>
                {([4, 8] as TournamentSize[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={size === s}
                    onClick={() => handleSizeChange(s)}
                    className={`px-3 py-1.5 border text-xs font-arcade cursor-pointer ${
                      size === s
                        ? 'bg-amber-500 text-[#09070d] border-amber-300'
                        : 'bg-[#1a1329] text-slate-300 border-[#3b2d54] hover:border-amber-400'
                    }`}
                  >
                    {s} Lutadores
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300 mr-1">
                  Dificuldade IA:
                </span>
                {(['easy', 'normal', 'hard'] as Difficulty[]).map((d) => (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={difficulty === d}
                    onClick={() => {
                      onUiSound('select');
                      setDifficulty(d);
                    }}
                    className={`px-2.5 py-1.5 border text-xs font-bold uppercase cursor-pointer ${
                      difficulty === d
                        ? 'bg-red-700 text-white border-red-400'
                        : 'bg-[#1a1329] text-slate-300 border-[#3b2d54] hover:border-amber-400'
                    }`}
                  >
                    {d === 'easy' ? 'Fácil' : d === 'normal' ? 'Normal' : 'Difícil'}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={handleRandomize}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1b142b] border border-[#4c3870] hover:border-amber-400 text-xs font-bold uppercase text-amber-200 cursor-pointer"
              >
                <Shuffle className="w-3.5 h-3.5" />
                Sortear Chaves
              </button>
            </div>

            {/* Participant Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {participants.map((p) => {
                const def = CHARACTERS[p.characterId];
                const isEditing = editingSeed === p.seed;
                return (
                  <div
                    key={p.seed}
                    className={`bg-[#120d1f]/95 border-2 p-2.5 flex flex-col gap-2 ${
                      isEditing ? 'border-amber-400' : 'border-[#3b2d54]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-arcade text-amber-400">
                        CHAVE #{p.seed}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleToggleControl(p.seed)}
                        className={`flex items-center gap-1 px-2 py-0.5 border text-[10px] font-bold uppercase cursor-pointer ${
                          p.control === 'human'
                            ? 'bg-red-700/80 border-red-400 text-white'
                            : 'bg-[#1b142b] border-[#4c3870] text-slate-300'
                        }`}
                      >
                        {p.control === 'human' ? (
                          <>
                            <User className="w-3 h-3" /> Jogador
                          </>
                        ) : (
                          <>
                            <Cpu className="w-3 h-3" /> IA
                          </>
                        )}
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        onUiSound('select');
                        setEditingSeed(isEditing ? null : p.seed);
                      }}
                      className="flex items-center gap-2.5 text-left hover:bg-[#1a1329] p-1 border border-transparent hover:border-amber-400/60 cursor-pointer transition-colors"
                    >
                      <PixelPortrait
                        characterId={p.characterId}
                        size={48}
                        className="border border-amber-400/60 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="font-arcade text-xs text-white truncate">
                          {formatFighterDisplayName(def)}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">{def.title}</div>
                        <div className="text-[10px] text-amber-300 mt-0.5">
                          {isEditing ? 'Escolha abaixo ▲' : 'Trocar lutador'}
                        </div>
                      </div>
                    </button>

                    {isEditing && (
                      <div className="grid grid-cols-5 gap-1 pt-1 border-t border-[#2a1f3d]">
                        {CHARACTER_LIST.map((ch) => (
                          <button
                            key={ch.id}
                            type="button"
                            onClick={() => handleAssignCharacter(p.seed, ch.id)}
                            title={ch.name}
                            aria-label={`Selecionar ${ch.name} para Chave ${p.seed}`}
                            className={`aspect-square border overflow-hidden cursor-pointer ${
                              ch.id === p.characterId
                                ? 'border-amber-400 ring-1 ring-amber-300'
                                : 'border-[#3b2d54] hover:border-white'
                            }`}
                          >
                            <PixelPortrait characterId={ch.id} fill />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex justify-center pt-1">
              <button
                type="button"
                onClick={handleLaunchTournament}
                className="flex items-center gap-2.5 px-10 py-3 bg-amber-500 hover:bg-amber-400 active:translate-y-0.5 text-[#09070d] font-arcade text-sm sm:text-base font-bold uppercase tracking-wider border-2 border-[#09070d] shadow-[0_4px_0_#09070d] cursor-pointer"
              >
                <Swords className="w-5 h-5" />
                INICIAR TORNEIO
              </button>
            </div>
          </div>
        ) : (
          /* BRACKET PHASE */
          <div className="space-y-4">
            {/* Champion Banner */}
            {bracket.champion && (
              <div
                role="status"
                className="bg-gradient-to-r from-[#281608] via-[#1d122e] to-[#281608] border-2 border-amber-400 p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-[0_0_24px_rgba(251,191,36,0.35)]"
              >
                <div className="flex items-center gap-4">
                  <PixelPortrait
                    characterId={bracket.champion.characterId}
                    size={72}
                    className="border-2 border-amber-400 shrink-0"
                  />
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-arcade text-amber-300">
                      <Trophy className="w-4 h-4" />
                      CAMPEÃO DO TORNEIO!
                    </div>
                    <div className="font-arcade text-xl sm:text-2xl text-white mt-0.5">
                      {formatFighterDisplayName(CHARACTERS[bracket.champion.characterId])}
                    </div>
                    <p className="text-xs sm:text-sm text-amber-200/90 italic mt-0.5">
                      {CHARACTERS[bracket.champion.characterId].victoryQuote}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onUiSound('confirm');
                    onResetBracket();
                  }}
                  className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-[#09070d] font-arcade text-xs sm:text-sm font-bold uppercase cursor-pointer shrink-0"
                >
                  NOVO TORNEIO
                </button>
              </div>
            )}

            {/* Next Active Match Action Bar */}
            {nextMatch && nextMatch.p1 && nextMatch.p2 && (
              <div className="bg-[#150e26]/95 border-2 border-amber-400 p-3 sm:p-4 flex flex-col md:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <PixelPortrait characterId={nextMatch.p1.characterId} size={46} className="border border-red-400" />
                  <div className="text-center md:text-left">
                    <div className="text-[10px] font-arcade text-amber-300 uppercase">
                      PRÓXIMO CONFRONTO · {getRoundTitle(nextMatch.roundIndex, bracket.rounds.length)}
                    </div>
                    <div className="font-arcade text-sm sm:text-base text-white">
                      <span className="text-red-300">
                        {formatFighterDisplayName(CHARACTERS[nextMatch.p1.characterId])}
                      </span>
                      {' '}VS{' '}
                      <span className="text-amber-300">
                        {formatFighterDisplayName(CHARACTERS[nextMatch.p2.characterId])}
                      </span>
                    </div>
                  </div>
                  <PixelPortrait characterId={nextMatch.p2.characterId} flip size={46} className="border border-amber-400" />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onUiSound('confirm');
                      onPlayMatch(nextMatch);
                    }}
                    className="flex items-center gap-2 px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white font-arcade text-xs sm:text-sm font-bold uppercase border-2 border-amber-300 cursor-pointer"
                  >
                    <Play className="w-4 h-4" />
                    LUTAR NA ARENA
                  </button>
                  {nextMatch.p1.control === 'ai' && nextMatch.p2.control === 'ai' && (
                    <button
                      type="button"
                      onClick={() => {
                        onUiSound('select');
                        onSimulateMatch(nextMatch);
                      }}
                      className="flex items-center gap-1.5 px-4 py-2.5 bg-[#1f1735] hover:bg-[#2c214a] border border-[#564080] text-amber-200 font-bold text-xs uppercase cursor-pointer"
                    >
                      <Cpu className="w-4 h-4" />
                      Simular IA
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Bracket Columns */}
            <div
              className={`grid gap-3 ${
                bracket.rounds.length === 3 ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2'
              }`}
            >
              {bracket.rounds.map((round, rIdx) => (
                <div key={rIdx} className="bg-[#110c1c]/90 border border-[#3b2d54] p-3 flex flex-col gap-3">
                  <div className="font-arcade text-xs text-amber-300 text-center border-b border-[#2b1f42] pb-2 tracking-wider">
                    {getRoundTitle(rIdx, bracket.rounds.length)}
                  </div>
                  <div className="flex-1 flex flex-col justify-around gap-2.5">
                    {round.map((m) => {
                      const isCurrent = nextMatch?.id === m.id;
                      return (
                        <div
                          key={m.id}
                          className={`border p-2.5 space-y-1.5 ${
                            isCurrent
                              ? 'bg-[#1f1536] border-amber-400 shadow-[0_0_14px_rgba(251,191,36,0.28)]'
                              : m.winner
                              ? 'bg-[#0e0a17] border-emerald-500/50'
                              : 'bg-[#0c0914] border-[#2e2345]'
                          }`}
                        >
                          {[
                            { side: 1 as const, p: m.p1 },
                            { side: 2 as const, p: m.p2 },
                          ].map(({ side, p }) => {
                            const isWinner = m.winnerSide === side;
                            const isLoser = m.winnerSide !== null && m.winnerSide !== side;
                            return (
                              <div
                                key={side}
                                className={`flex items-center justify-between gap-2 px-2 py-1 border ${
                                  isWinner
                                    ? 'bg-emerald-950/60 border-emerald-400/70 text-white'
                                    : isLoser
                                    ? 'bg-[#09070d] border-[#1f182e] text-slate-500'
                                    : 'bg-[#140f22] border-[#2b2040] text-slate-200'
                                }`}
                              >
                                {p ? (
                                  <div className="flex items-center gap-2 min-w-0">
                                    <PixelPortrait characterId={p.characterId} size={26} />
                                    <span className="text-xs font-bold truncate">
                                      {formatFighterDisplayName(CHARACTERS[p.characterId])}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-xs text-slate-500 italic">Aguardando vencedor...</span>
                                )}
                                <span className="text-[10px] font-bold uppercase shrink-0 text-amber-300">
                                  {isWinner ? 'VENCEU' : p ? (p.control === 'human' ? '1P/2P' : 'IA') : ''}
                                </span>
                              </div>
                            );
                          })}
                          {m.scoreLabel && (
                            <div className="text-[10px] text-center font-mono-num text-emerald-300">
                              Resultado: {m.scoreLabel}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
