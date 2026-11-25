import { useEffect, useRef } from 'react';
import { HudSnapshot } from '../game/types';
import { ISLAND_PLAYABLE_RADIUS, RING_ROAD_RADIUS } from '../game/terrain';
import { MAP_SETTLEMENT_CENTERS } from '../game/models';

interface MinimapProps {
  hud: HudSnapshot;
}

export function Minimap({ hud }: MinimapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 128;
    const half = size / 2;
    const scale = half / (ISLAND_PLAYABLE_RADIUS * 1.08);

    ctx.clearRect(0, 0, size, size);

    // Clip to circle
    ctx.save();
    ctx.beginPath();
    ctx.arc(half, half, half - 2, 0, Math.PI * 2);
    ctx.clip();

    // Water & Island disc
    ctx.fillStyle = '#0c3547';
    ctx.fillRect(0, 0, size, size);

    ctx.fillStyle = '#2e4c2a';
    ctx.beginPath();
    ctx.arc(half, half, ISLAND_PLAYABLE_RADIUS * scale, 0, Math.PI * 2);
    ctx.fill();

    // Crossroads dirt roads & ring road
    ctx.strokeStyle = '#6e5c45';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(half - 222 * scale, half);
    ctx.lineTo(half + 222 * scale, half);
    ctx.moveTo(half, half - 222 * scale);
    ctx.lineTo(half, half + 222 * scale);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(half, half, RING_ROAD_RADIUS * scale, 0, Math.PI * 2);
    ctx.stroke();

    // Settlement compound markers
    ctx.fillStyle = 'rgba(203, 213, 225, 0.45)';
    for (const s of MAP_SETTLEMENT_CENTERS) {
      const sx = half + s.x * scale;
      const sz = half + s.z * scale;
      ctx.fillRect(sx - 2, sz - 2, 4, 4);
    }

    // Next safe zone (white dashed circle)
    ctx.save();
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = 'rgba(255,255,255,0.65)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(
      half + hud.nextZoneCenterX * scale,
      half + hud.nextZoneCenterZ * scale,
      hud.nextZoneRadius * scale,
      0,
      Math.PI * 2
    );
    ctx.stroke();
    ctx.restore();

    // Current safe zone (cyan circle)
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(
      half + hud.zoneCenterX * scale,
      half + hud.zoneCenterZ * scale,
      hud.zoneRadius * scale,
      0,
      Math.PI * 2
    );
    ctx.stroke();

    // Radar blips (gunfire & airdrop)
    for (const blip of hud.minimapBlips) {
      const bx = half + blip.x * scale;
      const bz = half + blip.z * scale;
      if (blip.type === 'airdrop') {
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(bx - 3, bz - 3, 6, 6);
      } else {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(bx, bz, 2.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Player cone & marker
    const px = half + hud.playerX * scale;
    const pz = half + hud.playerZ * scale;

    ctx.save();
    ctx.translate(px, pz);
    // Three.js +Z is down on minimap, +X is right, yaw rotates from +Z toward +X
    ctx.rotate(-hud.playerYaw + Math.PI);

    // View cone
    ctx.fillStyle = 'rgba(251, 191, 36, 0.25)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-10, -18);
    ctx.lineTo(10, -18);
    ctx.closePath();
    ctx.fill();

    // Player arrow
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.moveTo(0, -5);
    ctx.lineTo(4, 4);
    ctx.lineTo(0, 2);
    ctx.lineTo(-4, 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.restore();

    // Outer tactical border ring
    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(half, half, half - 1.5, 0, Math.PI * 2);
    ctx.stroke();
  }, [hud]);

  return (
    <div className="relative w-32 h-32 rounded-full bg-[#0b0f14]/90 shadow-lg">
      <canvas ref={canvasRef} width={128} height={128} className="w-32 h-32 block" />
      <span className="absolute top-1 left-1/2 -translate-x-1/2 text-[10px] font-mono font-bold text-slate-300">
        N
      </span>
    </div>
  );
}
