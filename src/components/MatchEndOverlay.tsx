import { RotateCcw, Trophy } from 'lucide-react';
import { HudSnapshot } from '../game/types';

interface MatchEndOverlayProps {
  hud: HudSnapshot;
  onPlayAgain: () => void;
  onReturnLobby: () => void;
}

export function MatchEndOverlay({ hud, onPlayAgain, onReturnLobby }: MatchEndOverlayProps) {
  const accuracy =
    hud.shotsFired > 0 ? Math.min(100, Math.round((hud.shotsHit / hud.shotsFired) * 100)) : 0;
  const mins = Math.floor(hud.survivalTime / 60);
  const secs = Math.floor(hud.survivalTime % 60);
  const formattedTime = `${mins}:${secs.toString().padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-[#070a0f]/82 p-6">
      <div className="w-full max-w-lg rounded-2xl bg-[#0f151e] border border-white/15 p-7 shadow-2xl">
        <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {hud.isBooyah
                ? 'Last Survivor Standing'
                : `Eliminated by ${hud.eliminatedBy || 'Enemy'}`}
            </p>
            <h2
              className={`mt-1 text-4xl font-bold uppercase tracking-tight ${
                hud.isBooyah ? 'text-amber-400' : 'text-red-400'
              }`}
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {hud.isBooyah ? 'BOOYAH!' : `Rank #${hud.placement}`}
            </h2>
          </div>

          <div
            className={`w-14 h-14 rounded-xl flex items-center justify-center border ${
              hud.isBooyah
                ? 'bg-amber-500/15 border-amber-400/50 text-amber-400'
                : 'bg-slate-800 border-white/10 text-slate-300'
            }`}
          >
            <Trophy className="w-7 h-7" />
          </div>
        </div>

        {/* Combat Summary Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-6">
          <div>
            <div className="text-xs text-slate-400">Eliminations</div>
            <div className="mt-1 font-mono text-2xl font-bold text-white tabular-nums">
              {hud.kills}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Headshots</div>
            <div className="mt-1 font-mono text-2xl font-bold text-amber-400 tabular-nums">
              {hud.headshots}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Damage</div>
            <div className="mt-1 font-mono text-2xl font-bold text-white tabular-nums">
              {hud.damageDealt}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Survived</div>
            <div className="mt-1 font-mono text-2xl font-bold text-white tabular-nums">
              {formattedTime}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-400 border-t border-white/10 pt-4 pb-6">
          <span>
            Placement: <strong className="text-slate-200 font-mono">#{hud.placement}/{hud.totalCombatants}</strong>
          </span>
          <span>
            Accuracy: <strong className="text-slate-200 font-mono">{accuracy}%</strong>
          </span>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onReturnLobby}
            className="px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors cursor-pointer"
          >
            Back to Lobby
          </button>
          <button
            type="button"
            onClick={onPlayAgain}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold uppercase tracking-wide transition-colors cursor-pointer"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            <RotateCcw className="w-4 h-4" />
            <span>Play Again</span>
          </button>
        </div>
      </div>
    </div>
  );
}
