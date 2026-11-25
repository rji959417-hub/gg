import { useState } from 'react';
import { ChevronDown, ChevronUp, Play, Volume2, VolumeX } from 'lucide-react';
import { CharacterSkin } from '../game/types';
import { CHARACTER_SKINS } from '../game/weapons';
import { PWAInstallButton } from './PWAInstallButton';

interface LobbyOverlayProps {
  selectedSkin: CharacterSkin;
  totalCombatants: number;
  muted: boolean;
  onSelectSkin: (skin: CharacterSkin) => void;
  onSelectCombatants: (count: number) => void;
  onToggleMute: () => void;
  onStartMatch: () => void;
}

export function LobbyOverlay({
  selectedSkin,
  totalCombatants,
  muted,
  onSelectSkin,
  onSelectCombatants,
  onToggleMute,
  onStartMatch,
}: LobbyOverlayProps) {
  const [controlsOpen, setControlsOpen] = useState(false);

  return (
    <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between p-5">
      {/* Top Bar: Minimal Title + Audio Toggle (Zero Viewport Occlusion) */}
      <header className="flex items-start justify-between gap-6">
        <div className="pointer-events-auto">
          <h1
            className="text-3xl sm:text-4xl font-bold tracking-tight text-white uppercase drop-shadow"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Bermuda Strike
          </h1>
          <p className="mt-0.5 text-xs font-medium text-slate-200 tracking-wide">
            Battle Royale Island · Solo Survival · {selectedSkin.name} ({selectedSkin.title})
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <PWAInstallButton />
          <button
            type="button"
            onClick={onToggleMute}
            aria-label={muted ? 'Unmute Audio' : 'Mute Audio'}
            className="pointer-events-auto flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#0d1219]/90 border border-white/15 text-xs font-semibold text-slate-200 hover:bg-[#161e29] transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            {muted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-amber-400" />}
            <span>{muted ? 'Muted' : 'Audio On'}</span>
          </button>
        </div>
      </header>

      {/* Bottom Collapsible Tactical Dock */}
      <div className="flex flex-col items-center w-full">
        {controlsOpen && (
          <div className="pointer-events-auto mb-2.5 w-full max-w-[760px] rounded-xl bg-[#0b0f14]/92 border border-white/12 px-5 py-3.5 text-xs text-slate-200 shadow-2xl">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
              <div>
                <span className="text-amber-400 font-bold">WASD</span> · Move / Steer
              </div>
              <div>
                <span className="text-amber-400 font-bold">LMB / RMB</span> · Fire / Scope
              </div>
              <div>
                <span className="text-amber-400 font-bold">1-3 / 4(V)</span> · Gun / Fists
              </div>
              <div>
                <span className="text-amber-400 font-bold">Shift / C / Z</span> · Run / Sit / Prone
              </div>
              <div>
                <span className="text-amber-400 font-bold">R</span> · Reload Weapon
              </div>
              <div>
                <span className="text-amber-400 font-bold">G / Q</span> · Deploy Gloo Wall
              </div>
              <div>
                <span className="text-amber-400 font-bold">5 / H</span> · Use Medkit
              </div>
              <div>
                <span className="text-amber-400 font-bold">Space / F</span> · Jump / Loot
              </div>
            </div>
          </div>
        )}

        <div className="pointer-events-auto relative w-full max-w-[820px] rounded-xl bg-[#0b0f14]/92 border border-white/15 px-5 py-3.5 shadow-2xl">
          <button
            type="button"
            onClick={() => setControlsOpen((v) => !v)}
            className="absolute -top-7 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1 rounded-t-lg bg-[#0b0f14]/92 border border-b-0 border-white/15 text-[11px] font-semibold text-slate-300 hover:text-white cursor-pointer whitespace-nowrap"
          >
            {controlsOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            <span>Controls Guide</span>
          </button>

          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Character Skin Selector */}
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-semibold text-slate-400 whitespace-nowrap">Striker</span>
              <div className="flex items-center gap-1.5">
                {CHARACTER_SKINS.map((skin) => {
                  const active = skin.id === selectedSkin.id;
                  return (
                    <button
                      key={skin.id}
                      type="button"
                      onClick={() => onSelectSkin(skin)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                        active
                          ? 'bg-slate-800 text-white border border-amber-400/70'
                          : 'bg-slate-900/80 text-slate-300 border border-white/10 hover:bg-slate-800'
                      }`}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-sm shrink-0"
                        style={{ backgroundColor: skin.accentHex }}
                      />
                      <span>{skin.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Lobby Size */}
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-semibold text-slate-400 whitespace-nowrap">Players</span>
              <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-900 border border-white/10">
                {[24, 36, 48].map((count) => {
                  const active = totalCombatants === count;
                  return (
                    <button
                      key={count}
                      type="button"
                      onClick={() => onSelectCombatants(count)}
                      className={`px-2.5 py-1 rounded-md text-xs font-mono font-bold tabular-nums transition-colors cursor-pointer ${
                        active ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      {count}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Primary Deploy CTA */}
            <button
              type="button"
              onClick={onStartMatch}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm tracking-wide uppercase transition-colors cursor-pointer whitespace-nowrap shrink-0 shadow-lg"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Start Match</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
