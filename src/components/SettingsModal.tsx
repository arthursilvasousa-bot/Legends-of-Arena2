import { useEffect, useState } from 'react';
import { Monitor, Sparkles, Volume2, VolumeX } from 'lucide-react';
import { GameSettings, GraphicsQuality } from '../game/settings';

interface SettingsModalProps {
  settings: GameSettings;
  onChange: (next: GameSettings) => void;
  onClose: () => void;
  onPreviewSound: (kind: 'select' | 'confirm' | 'back') => void;
}

export function SettingsModal({
  settings,
  onChange,
  onClose,
  onPreviewSound,
}: SettingsModalProps) {
  const [isFullscreen, setIsFullscreen] = useState<boolean>(() =>
    typeof document !== 'undefined' ? Boolean(document.fullscreenElement) : false
  );
  const [fullscreenNote, setFullscreenNote] = useState<string>('');

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const handleToggleFullscreen = async () => {
    onPreviewSound('select');
    setFullscreenNote('');
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      setFullscreenNote('Tela cheia indisponível neste navegador/janela.');
    }
  };

  const update = (patch: Partial<GameSettings>) => {
    onChange({ ...settings, ...patch });
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-6 bg-[#070510]/78 animate-[fadeIn_180ms_ease-out]"
      role="dialog"
      aria-modal="true"
      aria-label="Configurações"
    >
      <div className="w-full max-w-2xl bg-[#120d1f]/95 border-2 border-amber-400 shadow-[0_0_32px_rgba(0,0,0,0.9)] p-4 sm:p-6 text-[#f5efe6] max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b-2 border-[#32244c] pb-3 mb-4">
          <h2 className="font-arcade text-lg sm:text-2xl text-amber-300 arcade-stroke-sm tracking-wider">
            CONFIGURAÇÕES
          </h2>
          <button
            type="button"
            onClick={() => {
              onPreviewSound('back');
              onClose();
            }}
            className="px-3 py-1 bg-[#1e1630] border border-[#4c3870] hover:border-amber-400 text-xs font-bold uppercase tracking-wider text-slate-200 cursor-pointer"
          >
            ESC · Fechar
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* ÁUDIO */}
          <section className="bg-[#0b0814]/90 border border-[#32244c] p-3.5 space-y-3">
            <div className="flex items-center gap-2 text-amber-300 font-arcade text-xs uppercase tracking-wider border-b border-[#241a38] pb-2">
              <Volume2 className="w-4 h-4" />
              <span>Áudio</span>
            </div>

            <label className="block space-y-1">
              <div className="flex justify-between text-xs font-bold text-slate-200">
                <span>Volume Geral</span>
                <span className="font-mono-num text-amber-300">{settings.masterVolume}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={settings.masterVolume}
                aria-label="Volume Geral"
                onChange={(e) => update({ masterVolume: Number(e.target.value) })}
                className="w-full accent-amber-400 cursor-pointer"
              />
            </label>

            <label className="block space-y-1">
              <div className="flex justify-between text-xs font-bold text-slate-200">
                <span>Volume da Música</span>
                <span className="font-mono-num text-amber-300">{settings.musicVolume}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={settings.musicVolume}
                aria-label="Volume da Música"
                onChange={(e) => update({ musicVolume: Number(e.target.value) })}
                className="w-full accent-amber-400 cursor-pointer"
              />
            </label>

            <label className="block space-y-1">
              <div className="flex justify-between text-xs font-bold text-slate-200">
                <span>Volume dos Efeitos Sonoros</span>
                <span className="font-mono-num text-amber-300">{settings.sfxVolume}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={settings.sfxVolume}
                aria-label="Volume dos Efeitos Sonoros"
                onChange={(e) => update({ sfxVolume: Number(e.target.value) })}
                onMouseUp={() => onPreviewSound('select')}
                className="w-full accent-amber-400 cursor-pointer"
              />
            </label>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                aria-pressed={settings.musicEnabled}
                onClick={() => {
                  const next = !settings.musicEnabled;
                  update({ musicEnabled: next });
                  onPreviewSound('select');
                }}
                className={`flex items-center justify-center gap-1.5 px-2.5 py-2 border text-xs font-bold uppercase cursor-pointer transition-colors ${
                  settings.musicEnabled
                    ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                    : 'bg-[#171224] border-[#3a2b54] text-slate-400'
                }`}
              >
                {settings.musicEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                <span>Música: {settings.musicEnabled ? 'Ligada' : 'Desligada'}</span>
              </button>

              <button
                type="button"
                aria-pressed={settings.sfxEnabled}
                onClick={() => {
                  const next = !settings.sfxEnabled;
                  update({ sfxEnabled: next });
                  if (next) onPreviewSound('select');
                }}
                className={`flex items-center justify-center gap-1.5 px-2.5 py-2 border text-xs font-bold uppercase cursor-pointer transition-colors ${
                  settings.sfxEnabled
                    ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                    : 'bg-[#171224] border-[#3a2b54] text-slate-400'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Efeitos: {settings.sfxEnabled ? 'Ligados' : 'Desligados'}</span>
              </button>
            </div>
          </section>

          {/* VÍDEO */}
          <section className="bg-[#0b0814]/90 border border-[#32244c] p-3.5 space-y-3">
            <div className="flex items-center gap-2 text-amber-300 font-arcade text-xs uppercase tracking-wider border-b border-[#241a38] pb-2">
              <Monitor className="w-4 h-4" />
              <span>Vídeo</span>
            </div>

            <div>
              <div className="text-xs font-bold text-slate-200 mb-1.5">Modo de Exibição</div>
              <button
                type="button"
                onClick={handleToggleFullscreen}
                aria-pressed={isFullscreen}
                className={`w-full py-2 px-3 border text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors ${
                  isFullscreen
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                    : 'bg-[#1b142b] border-[#4c3870] hover:border-amber-400 text-white'
                }`}
              >
                Tela Cheia: {isFullscreen ? 'Ativada (Sair)' : 'Desativada (Ativar)'}
              </button>
              {fullscreenNote && (
                <p className="text-[11px] text-amber-300 mt-1">{fullscreenNote}</p>
              )}
            </div>

            <div>
              <div className="text-xs font-bold text-slate-200 mb-1.5">Qualidade Gráfica</div>
              <div className="grid grid-cols-3 gap-1.5" role="group" aria-label="Qualidade Gráfica">
                {(['low', 'medium', 'high'] as GraphicsQuality[]).map((q) => (
                  <button
                    key={q}
                    type="button"
                    aria-pressed={settings.graphicsQuality === q}
                    onClick={() => {
                      onPreviewSound('select');
                      update({ graphicsQuality: q });
                    }}
                    className={`py-1.5 px-2 border text-xs font-bold uppercase cursor-pointer transition-colors ${
                      settings.graphicsQuality === q
                        ? 'bg-amber-500 text-[#09070d] border-amber-300'
                        : 'bg-[#171224] border-[#3a2b54] text-slate-300 hover:border-amber-400'
                    }`}
                  >
                    {q === 'low' ? 'Baixa' : q === 'medium' ? 'Média' : 'Alta'}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                aria-pressed={settings.particlesEnabled}
                onClick={() => {
                  onPreviewSound('select');
                  update({ particlesEnabled: !settings.particlesEnabled });
                }}
                className={`w-full flex items-center justify-between px-3 py-2 border text-xs font-bold uppercase cursor-pointer transition-colors ${
                  settings.particlesEnabled
                    ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                    : 'bg-[#171224] border-[#3a2b54] text-slate-400'
                }`}
              >
                <span>Partículas</span>
                <span>{settings.particlesEnabled ? 'ATIVADAS' : 'DESATIVADAS'}</span>
              </button>

              <button
                type="button"
                aria-pressed={settings.visualEffectsEnabled}
                onClick={() => {
                  onPreviewSound('select');
                  update({ visualEffectsEnabled: !settings.visualEffectsEnabled });
                }}
                className={`w-full flex items-center justify-between px-3 py-2 border text-xs font-bold uppercase cursor-pointer transition-colors ${
                  settings.visualEffectsEnabled
                    ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                    : 'bg-[#171224] border-[#3a2b54] text-slate-400'
                }`}
              >
                <span>Efeitos Visuais</span>
                <span>{settings.visualEffectsEnabled ? 'ATIVADOS' : 'DESATIVADOS'}</span>
              </button>
            </div>
          </section>
        </div>

        {/* NAVEGAÇÃO */}
        <div className="mt-5 pt-4 border-t border-[#32244c] flex justify-center">
          <button
            type="button"
            onClick={() => {
              onPreviewSound('back');
              onClose();
            }}
            className="px-8 py-2.5 bg-amber-500 hover:bg-amber-400 active:translate-y-0.5 text-[#09070d] font-arcade text-sm font-bold uppercase tracking-wider border-2 border-[#09070d] shadow-[0_3px_0_#09070d] cursor-pointer"
          >
            VOLTAR AO MENU
          </button>
        </div>
      </div>
    </div>
  );
}
