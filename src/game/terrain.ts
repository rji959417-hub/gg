import * as THREE from 'three';
import { ProceduralTextureSet } from './textures';

export const ISLAND_PLAYABLE_RADIUS = 248;
export const TERRAIN_SIZE = 780;
export const RING_ROAD_RADIUS = 118;

/**
 * Deterministic multi-octave rugged island heightfield.
 * Returns Y height in meters at world (x, z).
 * Features steep ridged peaks, deep valleys, uneven rocky moguls,
 * a small flat lobby pad near (0, 6), and rocky coastal cliffs sloping below sea level.
 */
export function groundHeightAt(x: number, z: number): number {
  const dist = Math.sqrt(x * x + z * z);

  // Base island falloff beyond playable radius
  const islandMask = THREE.MathUtils.smoothstep(292 - dist, 0, 68);

  // Ridged mountain peaks & spine formations
  const ridgeWave1 = 1 - Math.abs(Math.sin(x * 0.017 + z * 0.013));
  const ridgeWave2 = 1 - Math.abs(Math.cos(x * 0.023 - z * 0.019));
  const ridges = Math.pow(ridgeWave1, 1.8) * 9.5 + Math.pow(ridgeWave2, 1.7) * 6.8;

  // Deep valleys & rolling highlands
  const valley1 = Math.sin(x * 0.019 + 0.8) * Math.cos(z * 0.021 - 0.5) * 5.8;
  const hills = Math.sin((x + 48) * 0.042 + z * 0.031) * 3.1;

  // Uneven rugged rocky moguls & crags
  const crags =
    Math.cos(x * 0.075 - z * 0.068) * 1.35 +
    Math.sin(x * 0.13 + z * 0.11) * 0.58 +
    Math.cos((x - z) * 0.19) * 0.28;

  // Keep only the immediate lobby pedestal spot (0, 6) fairly even
  const lobbyDist = Math.hypot(x, z - 6);
  const lobbyFlat = 1 - THREE.MathUtils.smoothstep(13 - lobbyDist, 0, 10) * 0.78;

  const rawHeight = (ridges + valley1 + hills + crags + 1.4) * lobbyFlat;
  const coastalDrop = Math.max(0, 1 - dist / 286);

  return rawHeight * islandMask * (0.42 + 0.58 * coastalDrop) - (1 - islandMask) * 5.6;
}

export function groundNormalAt(x: number, z: number, out = new THREE.Vector3()): THREE.Vector3 {
  const eps = 0.6;
  const hL = groundHeightAt(x - eps, z);
  const hR = groundHeightAt(x + eps, z);
  const hD = groundHeightAt(x, z - eps);
  const hU = groundHeightAt(x, z + eps);
  return out.set(hL - hR, 2 * eps, hD - hU).normalize();
}

export interface IslandEnvironment {
  group: THREE.Group;
  treeColliders: Array<{ x: number; z: number; radius: number }>;
  rockColliders: Array<{ x: number; z: number; radius: number; topY: number }>;
  waterMesh: THREE.Mesh;
}

export function createIslandEnvironment(
  textures: ProceduralTextureSet,
  isSoftwareGl: boolean
): IslandEnvironment {
  const group = new THREE.Group();
  const segments = isSoftwareGl ? 136 : 210;

  // 1. Procedural Rugged Island Terrain Mesh with Elevation + Slope Vertex Colors
  const geo = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, segments, segments);
  geo.rotateX(-Math.PI / 2);

  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const tmpColor = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const y = groundHeightAt(x, z);
    pos.setY(i, y);

    const hR = groundHeightAt(x + 1.2, z);
    const hL = groundHeightAt(x - 1.2, z);
    const hU = groundHeightAt(x, z + 1.2);
    const hD = groundHeightAt(x, z - 1.2);
    const slope = Math.hypot(hR - hL, hU - hD) / 2.4;

    const dist = Math.sqrt(x * x + z * z);
    // Crossroads dirt trails along X/Z + mountain ring road
    const onRoadX = Math.abs(z) < 5.0 && dist < 224;
    const onRoadZ = Math.abs(x) < 5.0 && dist < 224;
    const onRingRoad = Math.abs(dist - RING_ROAD_RADIUS) < 4.6;

    if (y < 0.95) {
      // Sandy beach & rocky seabed
      tmpColor.setHex(y < -0.4 ? 0x8f7a59 : 0xd6c096);
    } else if (slope > 0.34) {
      // Steep exposed rugged granite / slate cliff rock
      const rockShade = Math.sin(x * 0.14 + z * 0.12) * 0.5 + 0.5;
      tmpColor.setHex(rockShade > 0.5 ? 0x67635c : 0x54514b);
    } else if (onRoadX || onRoadZ || onRingRoad) {
      // Packed tactical dirt road
      tmpColor.setHex(0x8a7558);
    } else if (y > 12.0) {
      // High mountain ridge moss & scree
      tmpColor.setHex(0x5c6947);
    } else if (y > 7.5) {
      // Upland scrub grass
      tmpColor.setHex(0x4f6d3c);
    } else {
      // Lush tropical valley grass with natural patchiness
      const patch = Math.sin(x * 0.065) * Math.cos(z * 0.065) * 0.5 + 0.5;
      tmpColor.setHex(patch > 0.5 ? 0x487136 : 0x3b602d);
    }

    colors[i * 3] = tmpColor.r;
    colors[i * 3 + 1] = tmpColor.g;
    colors[i * 3 + 2] = tmpColor.b;
  }

  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();

  const terrainMat = new THREE.MeshStandardMaterial({
    map: textures.terrainDetailMap,
    bumpMap: textures.terrainBumpMap,
    bumpScale: 0.24,
    vertexColors: true,
    roughness: 0.92,
    metalness: 0.02,
  });

  const terrainMesh = new THREE.Mesh(geo, terrainMat);
  terrainMesh.receiveShadow = true;
  terrainMesh.castShadow = false;
  group.add(terrainMesh);

  // 2. Expansive Ocean Water Plane surrounding the larger island
  const waterGeo = new THREE.PlaneGeometry(1800, 1800, 1, 1);
  waterGeo.rotateX(-Math.PI / 2);
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x0e6b7c,
    roughness: 0.18,
    metalness: 0.35,
    transparent: true,
    opacity: 0.9,
  });
  const waterMesh = new THREE.Mesh(waterGeo, waterMat);
  waterMesh.position.y = -0.35;
  waterMesh.receiveShadow = true;
  group.add(waterMesh);

  // 3. Instanced Trees across valleys & ridges (>160 trees with ±15% scale & tint variation)
  const treeColliders: Array<{ x: number; z: number; radius: number }> = [];
  const treeSpots: Array<{ x: number; z: number; y: number; scale: number; rot: number }> = [];

  let seed = 1337;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (let attempt = 0; attempt < 680 && treeSpots.length < 168; attempt++) {
    const angle = rand() * Math.PI * 2;
    const radius = 22 + rand() * (ISLAND_PLAYABLE_RADIUS - 26);
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const y = groundHeightAt(x, z);

    // Keep off beaches, steep cliffs, roads & lobby area
    if (y < 1.1) continue;
    if (Math.abs(x) < 9 || Math.abs(z) < 9) continue;
    if (Math.abs(radius - RING_ROAD_RADIUS) < 8) continue;

    // Avoid spawning inside steep cliff faces
    const slopeCheck = Math.abs(groundHeightAt(x + 1.5, z) - groundHeightAt(x - 1.5, z)) / 3;
    if (slopeCheck > 0.48) continue;

    let tooClose = false;
    for (const t of treeSpots) {
      if ((t.x - x) ** 2 + (t.z - z) ** 2 < 72) {
        tooClose = true;
        break;
      }
    }
    if (tooClose) continue;

    const scale = 0.85 + rand() * 0.35;
    treeSpots.push({ x, z, y, scale, rot: rand() * Math.PI * 2 });
    treeColliders.push({ x, z, radius: 0.65 * scale });
  }

  const trunkGeo = new THREE.CylinderGeometry(0.24, 0.44, 4.6, 7);
  trunkGeo.translate(0, 2.3, 0);
  const trunkMat = new THREE.MeshStandardMaterial({
    color: 0x6b4c35,
    roughness: 0.9,
    metalness: 0.02,
  });

  const canopyLowerGeo = new THREE.ConeGeometry(2.35, 2.7, 7);
  canopyLowerGeo.translate(0, 4.8, 0);
  const canopyUpperGeo = new THREE.ConeGeometry(1.7, 2.3, 7);
  canopyUpperGeo.translate(0, 6.4, 0);
  const canopyMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.78,
    metalness: 0.04,
  });

  const trunkInst = new THREE.InstancedMesh(trunkGeo, trunkMat, treeSpots.length);
  const canopyLowerInst = new THREE.InstancedMesh(canopyLowerGeo, canopyMat, treeSpots.length);
  const canopyUpperInst = new THREE.InstancedMesh(canopyUpperGeo, canopyMat, treeSpots.length);

  trunkInst.castShadow = true;
  trunkInst.receiveShadow = true;
  canopyLowerInst.castShadow = true;
  canopyLowerInst.receiveShadow = true;
  canopyUpperInst.castShadow = true;

  const dummy = new THREE.Object3D();
  const tint = new THREE.Color();

  treeSpots.forEach((spot, i) => {
    dummy.position.set(spot.x, spot.y - 0.35, spot.z);
    dummy.rotation.set((rand() - 0.5) * 0.06, spot.rot, (rand() - 0.5) * 0.06);
    dummy.scale.setScalar(spot.scale);
    dummy.updateMatrix();

    trunkInst.setMatrixAt(i, dummy.matrix);
    canopyLowerInst.setMatrixAt(i, dummy.matrix);
    canopyUpperInst.setMatrixAt(i, dummy.matrix);

    const gShift = 0.34 + rand() * 0.18;
    tint.setRGB(0.15 + rand() * 0.09, gShift, 0.11 + rand() * 0.06);
    canopyLowerInst.setColorAt(i, tint);
    tint.multiplyScalar(1.12);
    canopyUpperInst.setColorAt(i, tint);
  });

  trunkInst.instanceMatrix.needsUpdate = true;
  canopyLowerInst.instanceMatrix.needsUpdate = true;
  canopyUpperInst.instanceMatrix.needsUpdate = true;
  if (canopyLowerInst.instanceColor) canopyLowerInst.instanceColor.needsUpdate = true;
  if (canopyUpperInst.instanceColor) canopyUpperInst.instanceColor.needsUpdate = true;

  trunkInst.computeBoundingSphere();
  canopyLowerInst.computeBoundingSphere();
  canopyUpperInst.computeBoundingSphere();

  group.add(trunkInst, canopyLowerInst, canopyUpperInst);

  // 4. Instanced Rugged Tactical Boulders & Coastal Rock Outcrops
  const rockColliders: Array<{ x: number; z: number; radius: number; topY: number }> = [];
  const rockSpots: Array<{
    x: number;
    z: number;
    y: number;
    sx: number;
    sy: number;
    sz: number;
    rx: number;
    ry: number;
  }> = [];

  for (let i = 0; i < 105; i++) {
    const angle = rand() * Math.PI * 2;
    const radius = 16 + rand() * (ISLAND_PLAYABLE_RADIUS - 20);
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const y = groundHeightAt(x, z);
    if (y < 0.4) continue;
    if (Math.abs(x) < 8 && Math.abs(z) < 8) continue;

    const s = 0.95 + rand() * 1.25;
    rockSpots.push({
      x,
      z,
      y: y - 0.4,
      sx: s * (0.9 + rand() * 0.4),
      sy: s * (0.7 + rand() * 0.45),
      sz: s * (0.9 + rand() * 0.4),
      rx: (rand() - 0.5) * 0.35,
      ry: rand() * Math.PI * 2,
    });
    rockColliders.push({ x, z, radius: s * 1.15, topY: y + s * 0.85 });
  }

  // Dramatic coastal rock outcrops around shoreline perimeter
  for (let i = 0; i < 68; i++) {
    const angle = (i / 68) * Math.PI * 2 + (rand() - 0.5) * 0.1;
    const radius = ISLAND_PLAYABLE_RADIUS + 8 + rand() * 20;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const y = groundHeightAt(x, z);
    const s = 3.0 + rand() * 2.8;
    rockSpots.push({
      x,
      z,
      y: y - 0.7,
      sx: s * 1.25,
      sy: s * 0.95,
      sz: s * 1.15,
      rx: rand() * 0.28,
      ry: rand() * Math.PI * 2,
    });
  }

  const rockGeo = new THREE.DodecahedronGeometry(1.3, 1);
  const rockMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.9,
    metalness: 0.05,
    flatShading: true,
  });

  const rockInst = new THREE.InstancedMesh(rockGeo, rockMat, rockSpots.length);
  rockInst.castShadow = true;
  rockInst.receiveShadow = true;

  rockSpots.forEach((r, i) => {
    dummy.position.set(r.x, r.y + r.sy * 0.45, r.z);
    dummy.rotation.set(r.rx, r.ry, 0);
    dummy.scale.set(r.sx, r.sy, r.sz);
    dummy.updateMatrix();
    rockInst.setMatrixAt(i, dummy.matrix);

    const tone = 0.32 + rand() * 0.18;
    tint.setRGB(tone, tone * 0.98, tone * 0.93);
    rockInst.setColorAt(i, tint);
  });

  rockInst.instanceMatrix.needsUpdate = true;
  if (rockInst.instanceColor) rockInst.instanceColor.needsUpdate = true;
  rockInst.computeBoundingSphere();
  group.add(rockInst);

  return { group, treeColliders, rockColliders, waterMesh };
}

