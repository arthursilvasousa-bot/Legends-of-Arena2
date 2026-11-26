import { Gamepad2, Shield, Swords } from 'lucide-react';

interface HowToPlayModalProps {
  onClose: () => void;
}

export function HowToPlayModal({ onClose }: HowToPlayModalProps) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-6 bg-[#070510]/80"
      role="dialog"
      aria-modal="true"
      aria-label="Como Jogar"
    >
      <div className="w-full max-w-3xl bg-[#120d1f]/95 border-2 border-amber-400 shadow-[0_0_32px_rgba(0,0,0,0.9)] p-4 sm:p-6 text-[#f5efe6] max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b-2 border-[#32244c] pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <Gamepad2 className="w-5 h-5 text-amber-300" />
            <h2 className="font-arcade text-lg sm:text-2xl text-amber-300 arcade-stroke-sm tracking-wider">
              COMO JOGAR
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 bg-[#1e1630] border border-[#4c3870] hover:border-amber-400 text-xs font-bold uppercase tracking-wider text-slate-200 cursor-pointer"
          >
            ESC · Fechar
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* JOGADOR 1 */}
          <section className="bg-[#0b0814]/90 border border-red-500/60 p-4 space-y-2.5">
            <div className="flex items-center gap-2 text-red-400 font-arcade text-xs sm:text-sm uppercase tracking-wider border-b border-red-900/50 pb-2">
              <Swords className="w-4 h-4" />
              <span>JOGADOR 1 (1P)</span>
            </div>
            <ul className="space-y-2 text-xs sm:text-sm">
              <li className="flex items-center justify-between gap-2">
                <kbd className="px-2 py-0.5 bg-[#1b142b] border border-[#4c3870] text-amber-300 font-mono-num font-bold">W A S D</kbd>
                <span className="text-slate-200 text-right">Movimentação (W pula · S agacha)</span>
              </li>
              <li className="flex items-center justify-between gap-2">
                <kbd className="px-2 py-0.5 bg-[#1b142b] border border-[#4c3870] text-amber-300 font-mono-num font-bold">F</kbd>
                <span className="text-slate-200 text-right">Soco (2× F = Soco Forte)</span>
              </li>
              <li className="flex items-center justify-between gap-2">
                <kbd className="px-2 py-0.5 bg-[#1b142b] border border-[#4c3870] text-amber-300 font-mono-num font-bold">G</kbd>
                <span className="text-slate-200 text-right">Chute (S + G = Rasteira · Ar + G = Voadora)</span>
              </li>
              <li className="flex items-center justify-between gap-2">
                <kbd className="px-2 py-0.5 bg-[#1b142b] border border-[#4c3870] text-amber-300 font-mono-num font-bold">H</kbd>
                <span className="text-slate-200 text-right">Defesa (S + H = Defesa Baixa)</span>
              </li>
              <li className="flex items-center justify-between gap-2">
                <kbd className="px-2 py-0.5 bg-[#1b142b] border border-[#4c3870] text-amber-300 font-mono-num font-bold">E ou F + G</kbd>
                <span className="text-slate-200 text-right">Agarrão (quebra defesa de perto)</span>
              </li>
              <li className="flex items-center justify-between gap-2">
                <kbd className="px-2 py-0.5 bg-[#1b142b] border border-[#4c3870] text-amber-300 font-mono-num font-bold">1–4 / R T Y U</kbd>
                <span className="text-slate-200 text-right">Especiais (1–4 no Arcade · R–U sempre)</span>
              </li>
            </ul>
          </section>

          {/* JOGADOR 2 */}
          <section className="bg-[#0b0814]/90 border border-amber-500/60 p-4 space-y-2.5">
            <div className="flex items-center gap-2 text-amber-300 font-arcade text-xs sm:text-sm uppercase tracking-wider border-b border-amber-900/50 pb-2">
              <Shield className="w-4 h-4" />
              <span>JOGADOR 2 (2P LOCAL)</span>
            </div>
            <ul className="space-y-2 text-xs sm:text-sm">
              <li className="flex items-center justify-between gap-2">
                <kbd className="px-2 py-0.5 bg-[#1b142b] border border-[#4c3870] text-amber-300 font-mono-num font-bold">Setas ↑ ← ↓ →</kbd>
                <span className="text-slate-200 text-right">Movimentação (↑ pula · ↓ agacha)</span>
              </li>
              <li className="flex items-center justify-between gap-2">
                <kbd className="px-2 py-0.5 bg-[#1b142b] border border-[#4c3870] text-amber-300 font-mono-num font-bold">1 (ou Num 1)</kbd>
                <span className="text-slate-200 text-right">Soco</span>
              </li>
              <li className="flex items-center justify-between gap-2">
                <kbd className="px-2 py-0.5 bg-[#1b142b] border border-[#4c3870] text-amber-300 font-mono-num font-bold">2 (ou Num 2)</kbd>
                <span className="text-slate-200 text-right">Chute</span>
              </li>
              <li className="flex items-center justify-between gap-2">
                <kbd className="px-2 py-0.5 bg-[#1b142b] border border-[#4c3870] text-amber-300 font-mono-num font-bold">3 (ou Num 3)</kbd>
                <span className="text-slate-200 text-right">Defesa</span>
              </li>
              <li className="flex items-center justify-between gap-2">
                <kbd className="px-2 py-0.5 bg-[#1b142b] border border-[#4c3870] text-amber-300 font-mono-num font-bold">0 ou 1 + 2</kbd>
                <span className="text-slate-200 text-right">Agarrão</span>
              </li>
              <li className="flex items-center justify-between gap-2">
                <kbd className="px-2 py-0.5 bg-[#1b142b] border border-[#4c3870] text-amber-300 font-mono-num font-bold">4, 5, 6, 7</kbd>
                <span className="text-slate-200 text-right">Habilidades Especiais 1 a 4</span>
              </li>
            </ul>
          </section>
        </div>

        <div className="mt-4 bg-[#0b0814]/90 border border-[#32244c] px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
          <span>
            <strong className="text-amber-300">Combate:</strong> Melhor de 3 rounds. Encadeie <strong className="text-white">F → F</strong> ou <strong className="text-white">F → G</strong> para combos e carregue energia para usar Especiais!
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 bg-[#1b142b] border border-[#4c3870] text-amber-300 font-mono-num">Esc / P</kbd> Pausar
          </span>
        </div>

        <div className="mt-5 flex justify-center">
          <button
            type="button"
            onClick={onClose}
            className="px-8 py-2.5 bg-amber-500 hover:bg-amber-400 active:translate-y-0.5 text-[#09070d] font-arcade text-sm font-bold uppercase tracking-wider border-2 border-[#09070d] shadow-[0_3px_0_#09070d] cursor-pointer"
          >
            VOLTAR
          </button>
        </div>
      </div>
    </div>
  );
}
