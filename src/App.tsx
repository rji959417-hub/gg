/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from 'react';
import { BattleRoyaleEngine } from './game/engine';
import { CharacterSkin, HudSnapshot } from './game/types';
import { CHARACTER_SKINS } from './game/weapons';
import { gameAudio } from './game/audio';
import { LobbyOverlay } from './components/LobbyOverlay';
import { GameHud } from './components/GameHud';
import { MatchEndOverlay } from './components/MatchEndOverlay';

const INITIAL_HUD: HudSnapshot = {
  phase: 'lobby',
  pointerLocked: false,
  hp: 200,
  maxHp: 200,
  armor: 0,
  maxArmor: 150,
  medkits: 1,
  glooWalls: 2,
  healingProgress: 0,
  reloadingProgress: 0,
  aliveCount: 36,
  totalCombatants: 36,
  kills: 0,
  headshots: 0,
  damageDealt: 0,
  shotsFired: 0,
  shotsHit: 0,
  survivalTime: 0,
  placement: 36,
  isBooyah: false,
  eliminatedBy: '',
  weapons: [null, null, null],
  activeSlot: 0,
  combatMode: 'gun',
  stance: 'stand',
  isAds: false,
  isCrouching: false,
  isProne: false,
  isSprinting: false,
  crosshairSpread: 14,
  aimingAtEnemy: false,
  hitMarkerType: 'none',
  hitMarkerTime: 0,
  altitude: 0,
  chuteOpen: false,
  nearbyLootLabel: null,
  zonePhase: 1,
  zoneShrinking: false,
  zoneTimeRemaining: 34,
  outsideZone: false,
  zoneRadius: 248,
  zoneCenterX: 0,
  zoneCenterZ: 0,
  nextZoneRadius: 165,
  nextZoneCenterX: 0,
  nextZoneCenterZ: 0,
  playerX: 0,
  playerZ: 0,
  playerYaw: 0,
  damageFlash: 0,
  damageDirectionAngle: null,
  killFeed: [],
  damageNumbers: [],
  minimapBlips: [],
  bannerMessage: null,
};

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<BattleRoyaleEngine | null>(null);

  const [hud, setHud] = useState<HudSnapshot>(INITIAL_HUD);
  const [selectedSkin, setSelectedSkin] = useState<CharacterSkin>(CHARACTER_SKINS[0]);
  const [totalCombatants, setTotalCombatants] = useState<number>(36);
  const [muted, setMuted] = useState<boolean>(false);
  const [webglError, setWebglError] = useState<string | null>(null);

  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    try {
      const engine = new BattleRoyaleEngine(container, (snapshot) => {
        setHud(snapshot);
      });
      engineRef.current = engine;

      return () => {
        engine.dispose();
        engineRef.current = null;
      };
    } catch (err) {
      setWebglError(err instanceof Error ? err.message : 'WebGL initialization failed.');
    }
  }, []);

  const handleSelectSkin = (skin: CharacterSkin) => {
    setSelectedSkin(skin);
    engineRef.current?.setSkin(skin);
  };

  const handleSelectCombatants = (count: number) => {
    setTotalCombatants(count);
    engineRef.current?.setTotalCombatants(count);
  };

  const handleToggleMute = () => {
    const next = !muted;
    setMuted(next);
    gameAudio.setMuted(next);
  };

  const handleStartMatch = () => {
    engineRef.current?.startMatch();
  };

  const handleReturnLobby = () => {
    engineRef.current?.returnToLobby();
  };

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#0b0f14]">
      {/* Dedicated isolated WebGL mount container */}
      <div ref={canvasMountRef} className="w-full h-full" />

      {webglError && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#0b0f14] p-6 text-center">
          <div className="max-w-md rounded-xl bg-[#111827] border border-white/15 p-6">
            <h2 className="text-lg font-bold text-white">3D Graphics Unavailable</h2>
            <p className="mt-2 text-sm text-slate-300">{webglError}</p>
          </div>
        </div>
      )}

      {!webglError && hud.phase === 'lobby' && (
        <LobbyOverlay
          selectedSkin={selectedSkin}
          totalCombatants={totalCombatants}
          muted={muted}
          onSelectSkin={handleSelectSkin}
          onSelectCombatants={handleSelectCombatants}
          onToggleMute={handleToggleMute}
          onStartMatch={handleStartMatch}
        />
      )}

      {!webglError && (hud.phase === 'parachute' || hud.phase === 'playing') && (
        <GameHud
          hud={hud}
          muted={muted}
          onToggleMute={handleToggleMute}
          onSelectSlot={(slot) => engineRef.current?.selectWeaponSlot(slot)}
          onUseMedkit={() => engineRef.current?.useMedkit()}
          onDeployGloo={() => engineRef.current?.deployGlooWall()}
          onReload={() => engineRef.current?.triggerReload()}
          onCutParachute={() => engineRef.current?.cutParachute()}
          onPickupLoot={() => engineRef.current?.interactNearbyLoot()}
          onReturnLobby={handleReturnLobby}
          onRequestAimLock={() => engineRef.current?.requestPointerLock()}
          onTouchFireStart={() => engineRef.current?.startFiring()}
          onTouchFireEnd={() => engineRef.current?.stopFiring()}
          onTouchAdsToggle={() => {
            if (engineRef.current) engineRef.current.input.ads = !engineRef.current.input.ads;
          }}
          onSetStance={(stance) => engineRef.current?.setStance(stance)}
          onToggleSprint={() => engineRef.current?.toggleSprint()}
          onJump={() => engineRef.current?.triggerJump()}
          onJoystickMove={(x, y) => engineRef.current?.setJoystickMove(x, y)}
        />
      )}

      {!webglError && hud.phase === 'ended' && (
        <MatchEndOverlay
          hud={hud}
          onPlayAgain={handleStartMatch}
          onReturnLobby={handleReturnLobby}
        />
      )}
    </main>
  );
}
