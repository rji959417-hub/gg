import { PointerEvent, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Crosshair,
  Hand,
  Heart,
  LogOut,
  RotateCw,
  Shield,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { HudSnapshot } from '../game/types';
import { Minimap } from './Minimap';

interface GameHudProps {
  hud: HudSnapshot;
  muted: boolean;
  onToggleMute: () => void;
  onSelectSlot: (slot: 0 | 1 | 2 | 3) => void;
  onUseMedkit: () => void;
  onDeployGloo: () => void;
  onReload: () => void;
  onCutParachute: () => void;
  onPickupLoot: () => void;
  onReturnLobby: () => void;
  onRequestAimLock: () => void;
  onTouchFireStart: () => void;
  onTouchFireEnd: () => void;
  onTouchAdsToggle: () => void;
  onSetStance: (stance: 'stand' | 'crouch' | 'prone') => void;
  onToggleSprint: () => void;
  onJump: () => void;
  onJoystickMove: (x: number, y: number) => void;
}

function VirtualJoystick({
  onMove,
  isSprinting,
}: {
  onMove: (x: number, y: number) => void;
  isSprinting: boolean;
}) {
  const baseRef = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState<{ x: number; y: number; active: boolean }>({
    x: 0,
    y: 0,
    active: false,
  });
  const maxRadius = 42;

  const updateFromPointer = (clientX: number, clientY: number) => {
    const el = baseRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > maxRadius) {
      dx = (dx / dist) * maxRadius;
      dy = (dy / dist) * maxRadius;
    }
    setKnob({ x: dx, y: dy, active: true });
    // Screen +Y is down, so negate dy so dragging up yields positive forward (+1)
    onMove(dx / maxRadius, -dy / maxRadius);
  };

  const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    updateFromPointer(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!knob.active) return;
    e.stopPropagation();
    updateFromPointer(e.clientX, e.clientY);
  };

  const handlePointerEnd = (e: PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    setKnob({ x: 0, y: 0, active: false });
    onMove(0, 0);
  };

  return (
    <div
      ref={baseRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      className={`pointer-events-auto relative w-28 h-28 rounded-full border-2 touch-none select-none flex items-center justify-center cursor-grab active:cursor-grabbing ${
        isSprinting
          ? 'bg-[#0b0f14]/80 border-amber-400/70'
          : 'bg-[#0b0f14]/75 border-white/25'
      }`}
    >
      <div className="absolute inset-3 rounded-full border border-white/10 pointer-events-none" />
      <span className="absolute top-1.5 text-[8px] font-bold tracking-wider uppercase text-amber-300/80 pointer-events-none">
        Sprint
      </span>
      <div
        className={`w-11 h-11 rounded-full border shadow-lg pointer-events-none transition-transform duration-75 ${
          knob.active
            ? 'bg-amber-400 border-amber-200'
            : 'bg-slate-200/85 border-white/60'
        }`}
        style={{
          transform: `translate(${knob.x}px, ${knob.y}px)`,
        }}
      />
    </div>
  );
}

export function GameHud({
  hud,
  muted,
  onToggleMute,
  onSelectSlot,
  onUseMedkit,
  onDeployGloo,
  onReload,
  onCutParachute,
  onPickupLoot,
  onReturnLobby,
  onRequestAimLock,
  onTouchFireStart,
  onTouchFireEnd,
  onTouchAdsToggle,
  onSetStance,
  onToggleSprint,
  onJump,
  onJoystickMove,
}: GameHudProps) {
  const [controlsCollapsed, setControlsCollapsed] = useState(true);
  const [joyOpen, setJoyOpen] = useState(true);
  const activeWeapon = hud.activeSlot !== 3 ? hud.weapons[hud.activeSlot] : null;
  const isFists = hud.combatMode === 'fists';
  const isSniperAds = hud.isAds && activeWeapon?.spec.id === 'awm';

  return (
    <div className="pointer-events-none fixed inset-0 z-10 overflow-hidden">
      {/* Damage Vignette Flash */}
      {(hud.damageFlash > 0.02 || hud.outsideZone) && (
        <div
          className="fixed inset-0 pointer-events-none transition-opacity duration-150"
          style={{
            boxShadow: hud.outsideZone
              ? 'inset 0 0 90px rgba(6, 182, 212, 0.65)'
              : `inset 0 0 95px rgba(239, 68, 68, ${hud.damageFlash * 0.7})`,
          }}
        />
      )}

      {/* 4x Sniper Scope Overlay */}
      {isSniperAds && (
        <div className="fixed inset-0 pointer-events-none flex items-center justify-center">
          <div className="relative w-full h-full flex items-center justify-center bg-black/55">
            <div className="w-[min(70vh,70vw)] h-[min(70vh,70vw)] rounded-full border-4 border-slate-900 bg-transparent shadow-[0_0_0_9999px_rgba(0,0,0,0.78)] relative flex items-center justify-center">
              <div className="absolute inset-x-0 top-1/2 h-[1px] bg-black/80" />
              <div className="absolute inset-y-0 left-1/2 w-[1px] bg-black/80" />
              <div className="w-2 h-2 rounded-full bg-red-500" />
            </div>
          </div>
        </div>
      )}

      {/* Dynamic TPS Crosshair & Hitmarker */}
      {hud.phase === 'playing' && !isSniperAds && (
        <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <div className="relative w-2 h-2">
            {/* Center Dot */}
            <div
              className={`w-1.5 h-1.5 rounded-full -translate-x-1/2 -translate-y-1/2 ${
                hud.aimingAtEnemy ? 'bg-red-500' : 'bg-white'
              }`}
            />
            {!isFists && (
              <>
                <span
                  className={`absolute left-1/2 -translate-x-1/2 w-[2px] h-2.5 ${
                    hud.aimingAtEnemy ? 'bg-red-500' : 'bg-white/90'
                  }`}
                  style={{ bottom: `${hud.crosshairSpread}px` }}
                />
                <span
                  className={`absolute left-1/2 -translate-x-1/2 w-[2px] h-2.5 ${
                    hud.aimingAtEnemy ? 'bg-red-500' : 'bg-white/90'
                  }`}
                  style={{ top: `${hud.crosshairSpread}px` }}
                />
                <span
                  className={`absolute top-1/2 -translate-y-1/2 h-[2px] w-2.5 ${
                    hud.aimingAtEnemy ? 'bg-red-500' : 'bg-white/90'
                  }`}
                  style={{ right: `${hud.crosshairSpread}px` }}
                />
                <span
                  className={`absolute top-1/2 -translate-y-1/2 h-[2px] w-2.5 ${
                    hud.aimingAtEnemy ? 'bg-red-500' : 'bg-white/90'
                  }`}
                  style={{ left: `${hud.crosshairSpread}px` }}
                />
              </>
            )}

            {/* Hitmarker X */}
            {hud.hitMarkerType !== 'none' && (
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6">
                <span
                  className={`absolute left-1/2 top-1/2 w-4 h-[2.5px] -translate-x-1/2 -translate-y-1/2 rotate-45 ${
                    hud.hitMarkerType === 'head' ? 'bg-red-500' : 'bg-white'
                  }`}
                />
                <span
                  className={`absolute left-1/2 top-1/2 w-4 h-[2.5px] -translate-x-1/2 -translate-y-1/2 -rotate-45 ${
                    hud.hitMarkerType === 'head' ? 'bg-red-500' : 'bg-white'
                  }`}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating Damage Numbers */}
      {hud.damageNumbers.map((d) => (
        <div
          key={d.id}
          className="fixed pointer-events-none animate-hit-pop font-mono font-bold tabular-nums drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]"
          style={{
            left: `${d.screenX}px`,
            top: `${d.screenY}px`,
            color: d.headshot ? '#ef4444' : '#ffffff',
            fontSize: d.headshot ? '22px' : '16px',
          }}
        >
          {d.amount}
        </div>
      ))}

      {/* Top HUD Row */}
      <div className="flex items-start justify-between p-4">
        {/* Top-Left: Minimap & Utility Actions */}
        <div className="flex items-start gap-3">
          <Minimap hud={hud} />
          <div className="pointer-events-auto flex flex-col gap-1.5">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={onToggleMute}
              aria-label="Toggle Mute"
              className="flex items-center justify-center w-9 h-9 rounded-lg bg-[#0b0f14]/88 border border-white/15 text-slate-200 hover:bg-slate-800 cursor-pointer"
            >
              {muted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-amber-400" />}
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={onReturnLobby}
              aria-label="Exit to Lobby"
              className="flex items-center justify-center w-9 h-9 rounded-lg bg-[#0b0f14]/88 border border-white/15 text-slate-200 hover:bg-red-950 hover:border-red-500/40 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
            {(hud.phase === 'playing' || hud.phase === 'parachute') && (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setJoyOpen((v) => !v)}
                className={`px-2 py-1 rounded-md border text-[10px] font-bold uppercase cursor-pointer ${
                  joyOpen
                    ? 'bg-amber-500 text-slate-950 border-amber-400'
                    : 'bg-[#0b0f14]/88 border-white/15 text-slate-200 hover:bg-slate-800'
                }`}
              >
                Joy
              </button>
            )}
          </div>
        </div>

        {/* Top-Center Transient Event Banner */}
        <div className="flex flex-col items-center gap-2 max-w-md text-center">
          {hud.bannerMessage && (
            <div
              className="px-4 py-1.5 rounded-lg bg-[#0b0f14]/90 border border-amber-400/50 text-xs sm:text-sm font-bold tracking-wide text-amber-300 uppercase"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {hud.bannerMessage}
            </div>
          )}
          {hud.outsideZone && (
            <div className="px-3.5 py-1 rounded-md bg-cyan-950/90 border border-cyan-400/60 text-xs font-bold text-cyan-200">
              Outside Safe Zone — Move Inward
            </div>
          )}
          {!hud.pointerLocked && hud.phase === 'playing' && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={onRequestAimLock}
              className="pointer-events-auto px-3 py-1 rounded-md bg-[#0b0f14]/85 border border-white/20 text-[11px] font-medium text-slate-200 hover:bg-slate-800 cursor-pointer"
            >
              Drag Screen to Aim · Optional: Lock Mouse Cursor
            </button>
          )}
        </div>

        {/* Top-Right: Alive, Kills, Zone Timer & Kill Feed */}
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-4 px-4 py-2 rounded-lg bg-[#0b0f14]/90 border border-white/15 text-xs font-semibold">
            <div className="flex items-baseline gap-1.5">
              <span className="text-slate-400">Alive</span>
              <span className="font-mono text-base font-bold text-white tabular-nums">
                {hud.aliveCount}
              </span>
            </div>
            <span className="text-slate-600">·</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-slate-400">Kills</span>
              <span className="font-mono text-base font-bold text-amber-400 tabular-nums">
                {hud.kills}
              </span>
            </div>
            <span className="text-slate-600">·</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-cyan-400">Zone {hud.zonePhase}</span>
              <span className="font-mono text-sm font-bold text-slate-100 tabular-nums">
                {hud.zoneTimeRemaining}s
              </span>
            </div>
          </div>

          {/* Kill Feed (Clean unboxed rows) */}
          <div className="flex flex-col items-end gap-1">
            {hud.killFeed.map((entry) => (
              <div
                key={entry.id}
                className={`px-2.5 py-0.5 rounded bg-[#0b0f14]/80 text-[11px] font-medium whitespace-nowrap ${
                  entry.isPlayerInvolved ? 'text-amber-300 border border-amber-500/30' : 'text-slate-300'
                }`}
              >
                <span className="font-semibold">{entry.killer}</span>
                <span className="mx-1.5 text-slate-500">
                  [{entry.weapon}
                  {entry.headshot ? ' · HS' : ''}]
                </span>
                <span className="font-semibold text-red-400">{entry.victim}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Parachute Drop Center Action */}
      {hud.phase === 'parachute' && (
        <div className="fixed bottom-28 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
          <div className="px-4 py-1.5 rounded-lg bg-[#0b0f14]/90 border border-white/15 font-mono text-sm font-bold text-white tabular-nums">
            ALTITUDE {hud.altitude}m
          </div>
          {hud.chuteOpen && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={onCutParachute}
              className="pointer-events-auto px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wide cursor-pointer"
            >
              Fast Dive [Space / F]
            </button>
          )}
        </div>
      )}

      {/* Nearby Loot Prompt + Action Progress */}
      <div className="fixed bottom-32 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
        {hud.healingProgress > 0 && (
          <div className="w-48 px-3 py-1.5 rounded-lg bg-[#0b0f14]/92 border border-emerald-500/50">
            <div className="flex justify-between text-[11px] font-semibold text-emerald-300 mb-1">
              <span>Using Medkit</span>
              <span className="font-mono tabular-nums">{Math.round(hud.healingProgress * 100)}%</span>
            </div>
            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500"
                style={{ width: `${hud.healingProgress * 100}%` }}
              />
            </div>
          </div>
        )}

        {hud.reloadingProgress > 0 && (
          <div className="w-44 px-3 py-1.5 rounded-lg bg-[#0b0f14]/92 border border-amber-500/50">
            <div className="flex justify-between text-[11px] font-semibold text-amber-300 mb-1">
              <span>Reloading</span>
              <span className="font-mono tabular-nums">{Math.round(hud.reloadingProgress * 100)}%</span>
            </div>
            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-400"
                style={{ width: `${hud.reloadingProgress * 100}%` }}
              />
            </div>
          </div>
        )}

        {hud.nearbyLootLabel && hud.phase === 'playing' && (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={onPickupLoot}
            className="pointer-events-auto px-4 py-1.5 rounded-lg bg-[#0b0f14]/92 border border-amber-400/60 text-xs font-semibold text-amber-200 hover:bg-slate-800 cursor-pointer"
          >
            [F] Equip {hud.nearbyLootLabel}
          </button>
        )}
      </div>

      {/* Free Fire Style 360-Degree Virtual Joystick (Visible by default, Toggleable via Joy) */}
      {(hud.phase === 'playing' || hud.phase === 'parachute') && joyOpen && (
        <div className="fixed left-5 bottom-24">
          <VirtualJoystick onMove={onJoystickMove} isSprinting={hud.isSprinting} />
        </div>
      )}

      {/* Quick Action Stance & Fire/Punch Controls (Right Edge) */}
      {hud.phase === 'playing' && (
        <div className="pointer-events-auto fixed right-4 bottom-24 flex flex-col items-end gap-2 select-none">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={onToggleSprint}
              className={`px-3 py-2 rounded-lg border text-xs font-bold uppercase cursor-pointer ${
                hud.isSprinting
                  ? 'bg-amber-500 text-slate-950 border-amber-400'
                  : 'bg-[#0b0f14]/90 border-white/15 text-slate-200 hover:bg-slate-800'
              }`}
            >
              Run
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onSetStance('crouch')}
              className={`px-3 py-2 rounded-lg border text-xs font-bold uppercase cursor-pointer ${
                hud.isCrouching
                  ? 'bg-amber-500 text-slate-950 border-amber-400'
                  : 'bg-[#0b0f14]/90 border-white/15 text-slate-200 hover:bg-slate-800'
              }`}
            >
              Crouch [C]
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onSetStance('prone')}
              className={`px-3 py-2 rounded-lg border text-xs font-bold uppercase cursor-pointer ${
                hud.isProne
                  ? 'bg-amber-500 text-slate-950 border-amber-400'
                  : 'bg-[#0b0f14]/90 border-white/15 text-slate-200 hover:bg-slate-800'
              }`}
            >
              Prone [Z]
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={onJump}
              className="px-3 py-2 rounded-lg bg-[#0b0f14]/90 border border-white/15 text-xs font-bold uppercase text-slate-200 hover:bg-slate-800 cursor-pointer"
            >
              Jump
            </button>
          </div>

          {joyOpen && (
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={onTouchAdsToggle}
                aria-label="Toggle Scope"
                className={`w-12 h-12 rounded-full border flex items-center justify-center cursor-pointer ${
                  hud.isAds
                    ? 'bg-amber-500 text-slate-950 border-amber-300'
                    : 'bg-[#0b0f14]/90 border-white/25 text-white'
                }`}
              >
                <Crosshair className="w-5 h-5" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onPointerDown={onTouchFireStart}
                onPointerUp={onTouchFireEnd}
                onPointerLeave={onTouchFireEnd}
                onPointerCancel={onTouchFireEnd}
                className="w-16 h-16 rounded-full bg-red-600/95 border-2 border-red-300/60 text-white font-bold text-xs tracking-wider flex items-center justify-center active:scale-95 shadow-lg cursor-pointer"
              >
                {isFists ? 'PUNCH' : 'FIRE'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Unified Bottom Combat Dock (<= 12% viewport height, Zero Backdrop-Blur) */}
      {hud.phase === 'playing' && (
        <div className="fixed bottom-3 left-1/2 -translate-x-1/2 w-[min(940px,96vw)] flex flex-col items-center">
          {!controlsCollapsed && (
            <div className="pointer-events-auto mb-1.5 px-4 py-1.5 rounded-lg bg-[#0b0f14]/92 border border-white/12 text-[11px] font-mono text-slate-300 flex flex-wrap justify-center gap-x-4 gap-y-1">
              <span>WASD Move</span>
              <span>LMB Shoot/Punch</span>
              <span>RMB Scope</span>
              <span>1-3 Guns · 4/V Fists</span>
              <span>Shift Run · C Sit · Z Prone</span>
              <span>R Reload · G Gloo · 5/H Medkit</span>
            </div>
          )}

          <div className="pointer-events-auto relative w-full rounded-xl bg-[#0b0f14]/92 border border-white/15 px-3.5 py-2 shadow-xl flex flex-wrap items-center justify-between gap-2.5">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setControlsCollapsed((v) => !v)}
              className="absolute -top-6 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2.5 py-0.5 rounded-t-md bg-[#0b0f14]/92 border border-b-0 border-white/15 text-[10px] font-semibold text-slate-400 hover:text-white cursor-pointer"
            >
              {controlsCollapsed ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              <span>Keys</span>
            </button>

            {/* HP & Armor + Tactical Utilities */}
            <div className="flex items-center gap-2.5 min-w-[220px]">
              <div className="flex-1 space-y-1.5">
                <div className="flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <div className="flex-1 h-2 bg-slate-800 rounded-sm overflow-hidden">
                    <div
                      className="h-full bg-sky-400 transition-[width] duration-150"
                      style={{ width: `${(hud.armor / hud.maxArmor) * 100}%` }}
                    />
                  </div>
                  <span className="font-mono text-[11px] font-bold text-sky-300 tabular-nums w-7 text-right">
                    {hud.armor}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Heart className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <div className="flex-1 h-2.5 bg-slate-800 rounded-sm overflow-hidden">
                    <div
                      className={`h-full transition-[width] duration-150 ${
                        hud.hp < 60 ? 'bg-red-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${(hud.hp / hud.maxHp) * 100}%` }}
                    />
                  </div>
                  <span className="font-mono text-xs font-bold text-white tabular-nums w-7 text-right">
                    {hud.hp}
                  </span>
                </div>
              </div>

              {/* Medkit & Gloo Wall */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={onUseMedkit}
                  className="flex flex-col items-center justify-center px-2 py-1 rounded-lg bg-slate-900 border border-emerald-500/40 hover:bg-slate-800 cursor-pointer"
                >
                  <span className="text-[10px] font-bold text-emerald-400">[5] MED</span>
                  <span className="font-mono text-xs font-bold text-white tabular-nums">x{hud.medkits}</span>
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={onDeployGloo}
                  className="flex flex-col items-center justify-center px-2 py-1 rounded-lg bg-slate-900 border border-cyan-500/40 hover:bg-slate-800 cursor-pointer"
                >
                  <span className="text-[10px] font-bold text-cyan-400">[G] GLOO</span>
                  <span className="font-mono text-xs font-bold text-white tabular-nums">x{hud.glooWalls}</span>
                </button>
              </div>
            </div>

            {/* Weapon Slots 1 / 2 / 3 + Slot 4 Fists */}
            <div className="flex items-center gap-1.5">
              {([0, 1, 2] as const).map((slotIdx) => {
                const w = hud.weapons[slotIdx];
                const active = hud.activeSlot === slotIdx;
                return (
                  <button
                    key={slotIdx}
                    type="button"
                    disabled={!w}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => onSelectSlot(slotIdx)}
                    className={`flex flex-col justify-between px-2.5 py-1.5 rounded-lg border text-left min-w-[84px] transition-colors ${
                      !w
                        ? 'bg-slate-950/60 border-white/5 text-slate-600 cursor-default'
                        : active
                        ? 'bg-slate-800 border-amber-400/80 text-white cursor-pointer'
                        : 'bg-slate-900/90 border-white/10 text-slate-300 hover:bg-slate-800 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-[10px] font-mono">
                      <span className="text-slate-400">[{slotIdx + 1}]</span>
                      <span style={{ color: w ? w.spec.accentHex : undefined }}>
                        {w ? w.spec.category : 'Empty'}
                      </span>
                    </div>
                    <div className="text-xs font-bold truncate max-w-[96px]">
                      {w ? w.spec.name : '---'}
                    </div>
                  </button>
                );
              })}

              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onSelectSlot(3)}
                className={`flex flex-col justify-between px-2.5 py-1.5 rounded-lg border text-left min-w-[74px] transition-colors cursor-pointer ${
                  isFists
                    ? 'bg-amber-500/20 border-amber-400 text-white'
                    : 'bg-slate-900/90 border-white/10 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center justify-between gap-1.5 text-[10px] font-mono">
                  <span className="text-slate-400">[4/V]</span>
                  <Hand className="w-3 h-3 text-amber-400" />
                </div>
                <div className="text-xs font-bold">Fists</div>
              </button>
            </div>

            {/* Active Magazine / Melee & Reload */}
            <div className="flex items-center gap-2">
              <div className="text-right font-mono tabular-nums min-w-[68px]">
                {isFists ? (
                  <>
                    <div className="text-sm font-bold leading-none text-amber-400 uppercase">Melee</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Bare Hands</div>
                  </>
                ) : (
                  <>
                    <div className="text-xl font-bold leading-none text-white">
                      {activeWeapon ? activeWeapon.ammoInMag : 0}
                      <span className="text-xs text-slate-400 font-normal">
                        /{activeWeapon ? activeWeapon.reserveAmmo : 0}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {activeWeapon ? activeWeapon.spec.name : 'Unarmed'}
                    </div>
                  </>
                )}
              </div>
              {!isFists && (
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={onReload}
                  aria-label="Reload"
                  className="flex items-center justify-center w-9 h-9 rounded-lg bg-slate-900 border border-white/15 text-slate-200 hover:bg-slate-800 cursor-pointer"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
