import * as THREE from 'three';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

/**
 * Easy tuning constants for external Mixamo (.fbx) or GLTF/GLB (.glb) characters.
 * Adjust these values if your character looks too large, too small, sideways/backwards, or slightly off-ground.
 */
export const EXTERNAL_CHARACTER_CONFIG = {
  /** Files checked inside `public/` in priority order (.fbx and .glb/.gltf supported) */
  modelCandidates: ['Running.fbx', 'cyberpunk_character.glb'] as readonly string[],
  /** Normalized standing height in meters (Mixamo ~175cm FBX auto-scales down to 1.78m) */
  targetHeight: 1.78,
  /** Extra uniform scale multiplier applied after height normalization */
  scaleMultiplier: 1.0,
  /** Horizontal facing offset in radians (set Math.PI if character faces backwards, Math.PI / 2 if sideways) */
  rotationOffsetY: 0,
  /** Vertical ground tweak in meters (+ lifts up, - lowers down) */
  groundOffsetY: 0,
  /** How fast character smoothly rotates toward WASD / Joystick movement direction */
  turnSpeed: 12,
  /** Animation playback speed multipliers */
  walkAnimSpeedScale: 0.85,
  runAnimSpeedScale: 1.35,
} as const;

export type ExternalAnimState = 'idle' | 'walk' | 'run' | 'jump' | 'crouch' | 'shoot';

export interface LoadedExternalCharacterTemplate {
  scene: THREE.Group;
  animations: THREE.AnimationClip[];
  sourceUrl: string;
  format: 'fbx' | 'glb';
}

export interface ExternalCharacterInstance {
  wrapper: THREE.Group;
  mixer: THREE.AnimationMixer | null;
  hasAnimations: boolean;
  singleClipRunOnly: boolean;
  updateAnimation: (
    dt: number,
    state: ExternalAnimState,
    isMoving: boolean,
    isSprinting: boolean
  ) => void;
  dispose: () => void;
}

const _box = new THREE.Box3();
const _size = new THREE.Vector3();
const _center = new THREE.Vector3();

function resolvePublicUrl(fileName: string): string {
  const base = import.meta.env.BASE_URL || '/';
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  const cleanName = fileName.replace(/^\/+/, '');
  return `${normalizedBase}${cleanName}`;
}

function hasRenderableMeshes(object: THREE.Object3D): boolean {
  let found = false;
  object.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      found = true;
    }
  });
  return found;
}

async function fetchBinaryIfAvailable(url: string): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const contentType = (res.headers.get('content-type') || '').toLowerCase();
    // Guard against SPA index.html fallback when file does not exist
    if (contentType.includes('text/html')) return null;
    const buffer = await res.arrayBuffer();
    return buffer.byteLength > 0 ? buffer : null;
  } catch {
    return null;
  }
}

export async function loadExternalCharacterTemplate(): Promise<LoadedExternalCharacterTemplate | null> {
  const base = import.meta.env.BASE_URL || '/';
  const resourceBase = base.endsWith('/') ? base : `${base}/`;

  for (const candidate of EXTERNAL_CHARACTER_CONFIG.modelCandidates) {
    const url = resolvePublicUrl(candidate);
    const buffer = await fetchBinaryIfAvailable(url);
    if (!buffer) continue;

    const lower = candidate.toLowerCase();
    try {
      if (lower.endsWith('.fbx')) {
        const fbxLoader = new FBXLoader();
        const group = fbxLoader.parse(buffer, resourceBase);
        if (!hasRenderableMeshes(group)) {
          // Skip skeleton-only FBX without skin if another skinned model candidate exists
          continue;
        }
        return {
          scene: group,
          animations: group.animations || [],
          sourceUrl: url,
          format: 'fbx',
        };
      }

      if (lower.endsWith('.glb') || lower.endsWith('.gltf')) {
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
        const gltfLoader = new GLTFLoader();
        gltfLoader.setDRACOLoader(dracoLoader);

        try {
          const gltf = await new Promise<{ scene: THREE.Group; animations: THREE.AnimationClip[] }>(
            (resolve, reject) => {
              gltfLoader.parse(buffer, resourceBase, resolve, reject);
            }
          );
          if (!hasRenderableMeshes(gltf.scene)) continue;
          return {
            scene: gltf.scene,
            animations: gltf.animations || [],
            sourceUrl: url,
            format: 'glb',
          };
        } finally {
          dracoLoader.dispose();
        }
      }
    } catch {
      // Try next candidate if parsing failed
    }
  }

  return null;
}

export function instantiateExternalCharacter(
  template: LoadedExternalCharacterTemplate
): ExternalCharacterInstance {
  const cloned = SkeletonUtils.clone(template.scene) as THREE.Group;

  cloned.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      if ((child as THREE.SkinnedMesh).isSkinnedMesh) {
        mesh.frustumCulled = false;
      }
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach((mat) => {
        if (mat && 'envMapIntensity' in mat) {
          (mat as THREE.MeshStandardMaterial).envMapIntensity = 1.0;
        }
      });
    }
  });

  const wrapper = new THREE.Group();
  wrapper.add(cloned);

  // Apply optional rotation offset first so bounding box & grounding align cleanly
  cloned.rotation.y = EXTERNAL_CHARACTER_CONFIG.rotationOffsetY;
  cloned.updateMatrixWorld(true);

  _box.setFromObject(cloned);
  _box.getSize(_size);
  if (_size.y > 0.001) {
    const normalizedScale =
      (EXTERNAL_CHARACTER_CONFIG.targetHeight / _size.y) * EXTERNAL_CHARACTER_CONFIG.scaleMultiplier;
    cloned.scale.multiplyScalar(normalizedScale);
    cloned.updateMatrixWorld(true);
  }

  _box.setFromObject(cloned);
  _box.getCenter(_center);
  cloned.position.x -= _center.x;
  cloned.position.z -= _center.z;
  cloned.position.y -= _box.min.y - EXTERNAL_CHARACTER_CONFIG.groundOffsetY;

  const clips = template.animations || [];
  let mixer: THREE.AnimationMixer | null = null;
  let singleClipRunOnly = false;
  const actions: Partial<Record<ExternalAnimState, THREE.AnimationAction>> = {};
  let activeKey: ExternalAnimState | null = null;

  if (clips.length > 0) {
    mixer = new THREE.AnimationMixer(cloned);
    const findClip = (pattern: RegExp) => clips.find((c) => pattern.test(c.name));

    const explicitIdle = findClip(/idle|stand|breath/i);
    const walkClip = findClip(/walk/i);
    const runClip = findClip(/run|sprint|jog/i);
    const jumpClip = findClip(/jump|fall|air|glide/i);
    const crouchClip = findClip(/crouch|sneak|duck/i);
    const shootClip = findClip(/shoot|fire|attack|aim/i);

    // If Mixamo Running.fbx contains only one clip (often named "mixamo.com" or "Take 001"),
    // treat it as movement-driven run clip that pauses when standing still.
    if (clips.length === 1 && !explicitIdle) {
      singleClipRunOnly = true;
      const soleClip = clips[0];
      const soleAction = mixer.clipAction(soleClip);
      soleAction.loop = THREE.LoopRepeat;
      soleAction.play();
      soleAction.paused = true;
      soleAction.time = 0;
      actions.run = soleAction;
      actions.walk = soleAction;
      actions.idle = soleAction;
      activeKey = 'run';
    } else {
      const idleClip = explicitIdle ?? clips[0];
      if (idleClip) actions.idle = mixer.clipAction(idleClip);
      if (walkClip) actions.walk = mixer.clipAction(walkClip);
      if (runClip ?? walkClip) actions.run = mixer.clipAction((runClip ?? walkClip)!);
      if (jumpClip) actions.jump = mixer.clipAction(jumpClip);
      if (crouchClip) actions.crouch = mixer.clipAction(crouchClip);
      if (shootClip) actions.shoot = mixer.clipAction(shootClip);

      if (actions.idle) {
        actions.idle.play();
        activeKey = 'idle';
      }
    }
  }

  const playState = (target: ExternalAnimState, speedScale: number) => {
    if (!mixer) return;
    const resolvedKey: ExternalAnimState = actions[target] ? target : 'idle';
    const nextAction = actions[resolvedKey];
    if (!nextAction) return;

    nextAction.setEffectiveTimeScale(speedScale);
    if (activeKey === resolvedKey) return;

    const prevAction = activeKey ? actions[activeKey] : undefined;
    nextAction.reset();
    nextAction.enabled = true;
    nextAction.setEffectiveWeight(1);
    nextAction.play();

    if (prevAction && prevAction !== nextAction) {
      prevAction.crossFadeTo(nextAction, 0.18, true);
    }
    activeKey = resolvedKey;
  };

  return {
    wrapper,
    mixer,
    hasAnimations: clips.length > 0,
    singleClipRunOnly,
    updateAnimation(dt, state, isMoving, isSprinting) {
      if (!mixer) return;

      if (singleClipRunOnly && actions.run) {
        if (isMoving) {
          actions.run.paused = false;
          actions.run.setEffectiveTimeScale(
            isSprinting
              ? EXTERNAL_CHARACTER_CONFIG.runAnimSpeedScale
              : EXTERNAL_CHARACTER_CONFIG.walkAnimSpeedScale
          );
          mixer.update(dt);
        } else {
          // Pause on clean standing-stride frame when player stops
          actions.run.paused = true;
          mixer.update(0);
        }
        return;
      }

      const speedScale =
        state === 'run'
          ? EXTERNAL_CHARACTER_CONFIG.runAnimSpeedScale
          : state === 'walk'
          ? EXTERNAL_CHARACTER_CONFIG.walkAnimSpeedScale
          : 1.0;
      playState(state, speedScale);
      mixer.update(dt);
    },
    dispose() {
      if (mixer) {
        mixer.stopAllAction();
        mixer.uncacheRoot(cloned);
      }
    },
  };
}

/** Smoothly damp an angle (in radians) taking the shortest circular path */
export function dampAngle(current: number, target: number, lambda: number, dt: number): number {
  let diff = ((target - current + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return current + diff * (1 - Math.exp(-lambda * dt));
}
