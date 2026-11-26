import * as THREE from 'three';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

/**
 * Configuration & tuning constants for the Cyber character (.glb) + Mixamo running animation (.fbx).
 */
export const EXTERNAL_CHARACTER_CONFIG = {
  /** Primary visual character model kept in the scene (meshes & materials preserved) */
  primaryModelFile: 'cyberpunk_character.glb',
  /** Mixamo animation source whose AnimationClip is extracted & retargeted onto the primary model */
  animationSourceFile: 'Running.fbx',
  /** Normalized standing height in meters */
  targetHeight: 1.78,
  /** Extra uniform scale multiplier applied after height normalization */
  scaleMultiplier: 1.0,
  /**
   * Extra horizontal facing offset in radians (added on top of auto-detected model facing).
   * `cyberpunk_character.glb` faces -Z in its raw export and auto-rotates Math.PI to face +Z.
   */
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
  baseFacingRotationY: number;
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

/** Sketchfab / Cyber character bone names -> Mixamo bone names */
const CYBER_TO_MIXAMO_BONES: ReadonlyArray<readonly [string, string]> = [
  ['hips_00', 'mixamorigHips'],
  ['spine1_01', 'mixamorigSpine'],
  ['spine2_02', 'mixamorigSpine1'],
  ['spine3_03', 'mixamorigSpine2'],
  ['neck_04', 'mixamorigNeck'],
  ['head_05', 'mixamorigHead'],
  ['l shoulder_027', 'mixamorigLeftShoulder'],
  ['l arm_028', 'mixamorigLeftArm'],
  ['l forearm_029', 'mixamorigLeftForeArm'],
  ['l hand_030', 'mixamorigLeftHand'],
  ['l thumb1_031', 'mixamorigLeftHandThumb1'],
  ['l thumb2_032', 'mixamorigLeftHandThumb2'],
  ['l thumb3_033', 'mixamorigLeftHandThumb3'],
  ['l index1_043', 'mixamorigLeftHandIndex1'],
  ['l index2_044', 'mixamorigLeftHandIndex2'],
  ['l index3_045', 'mixamorigLeftHandIndex3'],
  ['l middle1_040', 'mixamorigLeftHandMiddle1'],
  ['l middle2_041', 'mixamorigLeftHandMiddle2'],
  ['l middle3_042', 'mixamorigLeftHandMiddle3'],
  ['l ring1_037', 'mixamorigLeftHandRing1'],
  ['l ring2_038', 'mixamorigLeftHandRing2'],
  ['l ring3_039', 'mixamorigLeftHandRing3'],
  ['l pinky1_034', 'mixamorigLeftHandPinky1'],
  ['l pinky2_035', 'mixamorigLeftHandPinky2'],
  ['l pinky3_036', 'mixamorigLeftHandPinky3'],
  ['r shoulder_08', 'mixamorigRightShoulder'],
  ['r arm_09', 'mixamorigRightArm'],
  ['r forearm_010', 'mixamorigRightForeArm'],
  ['r hand_011', 'mixamorigRightHand'],
  ['r thumb1_012', 'mixamorigRightHandThumb1'],
  ['r thumb2_013', 'mixamorigRightHandThumb2'],
  ['r thumb3_014', 'mixamorigRightHandThumb3'],
  ['r index1_015', 'mixamorigRightHandIndex1'],
  ['r index2_016', 'mixamorigRightHandIndex2'],
  ['r index3_017', 'mixamorigRightHandIndex3'],
  ['r middle1_018', 'mixamorigRightHandMiddle1'],
  ['r middle2_019', 'mixamorigRightHandMiddle2'],
  ['r middle3_020', 'mixamorigRightHandMiddle3'],
  ['r ring1_021', 'mixamorigRightHandRing1'],
  ['r ring2_022', 'mixamorigRightHandRing2'],
  ['r ring3_023', 'mixamorigRightHandRing3'],
  ['r pinky1_024', 'mixamorigRightHandPinky1'],
  ['r pinky2_025', 'mixamorigRightHandPinky2'],
  ['r pinky3_026', 'mixamorigRightHandPinky3'],
  ['l leg_047', 'mixamorigLeftUpLeg'],
  ['l knee_048', 'mixamorigLeftLeg'],
  ['l foot_049', 'mixamorigLeftFoot'],
  ['l toes_050', 'mixamorigLeftToeBase'],
  ['r leg_051', 'mixamorigRightUpLeg'],
  ['r knee_052', 'mixamorigRightLeg'],
  ['r foot_053', 'mixamorigRightFoot'],
  ['r toes_054', 'mixamorigRightToeBase'],
];

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

function disposeObjectResources(root: THREE.Object3D): void {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.geometry) {
      mesh.geometry.dispose();
    }
    if (mesh.material) {
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach((m) => m?.dispose());
    }
  });
}

function findObjectByName(root: THREE.Object3D, name: string): THREE.Object3D | null {
  return root.getObjectByName(name) ?? null;
}

function alignLimbToWorldDirection(
  bone: THREE.Object3D | null,
  childBone: THREE.Object3D | null,
  desiredWorldDir: THREE.Vector3
): void {
  if (!bone || !childBone || !bone.parent) return;
  bone.updateMatrixWorld(true);
  const p0 = new THREE.Vector3();
  const p1 = new THREE.Vector3();
  bone.getWorldPosition(p0);
  childBone.getWorldPosition(p1);
  const curDir = p1.sub(p0);
  if (curDir.lengthSq() < 1e-8) return;
  curDir.normalize();

  const deltaWorld = new THREE.Quaternion().setFromUnitVectors(
    curDir,
    desiredWorldDir.clone().normalize()
  );
  const parentWorldQ = new THREE.Quaternion();
  const boneWorldQ = new THREE.Quaternion();
  bone.parent.getWorldQuaternion(parentWorldQ);
  bone.getWorldQuaternion(boneWorldQ);

  const newWorldQ = deltaWorld.multiply(boneWorldQ);
  bone.quaternion.copy(parentWorldQ.invert().multiply(newWorldQ)).normalize();
  bone.updateMatrixWorld(true);
}

/**
 * Auto-detect whether a loaded character faces -Z (common in Sketchfab/Blender exports)
 * instead of +Z by checking toe/eye forward offsets relative to ankles/head.
 */
function detectBaseFacingRotationY(modelScene: THREE.Object3D): number {
  modelScene.updateMatrixWorld(true);
  const foot = findObjectByName(modelScene, 'l foot_049') ?? findObjectByName(modelScene, 'r foot_053');
  const toes = findObjectByName(modelScene, 'l toes_050') ?? findObjectByName(modelScene, 'r toes_054');
  if (foot && toes) {
    const fp = new THREE.Vector3();
    const tp = new THREE.Vector3();
    foot.getWorldPosition(fp);
    toes.getWorldPosition(tp);
    if (tp.z - fp.z < -0.02) {
      return Math.PI;
    }
  }
  return 0;
}

/**
 * Retarget a Mixamo FBX AnimationClip onto a GLB character rig (e.g. cyberpunk_character.glb)
 * without keeping any FBX mesh in the scene.
 */
function retargetMixamoClipToTarget(
  targetScene: THREE.Group,
  baseFacingRotationY: number,
  fbxGroup: THREE.Group,
  sourceClip: THREE.AnimationClip,
  outputClipName: string
): THREE.AnimationClip | null {
  // Find skinned skeleton on FBX
  let fbxSkinned: THREE.SkinnedMesh | null = null;
  fbxGroup.traverse((obj) => {
    if (!fbxSkinned && (obj as THREE.SkinnedMesh).isSkinnedMesh) {
      fbxSkinned = obj as THREE.SkinnedMesh;
    }
  });

  // Clone target momentarily into a +Z-oriented probe wrapper so original template stays untouched
  const probeScene = SkeletonUtils.clone(targetScene) as THREE.Group;
  const probeRoot = new THREE.Group();
  probeScene.rotation.y = baseFacingRotationY + EXTERNAL_CHARACTER_CONFIG.rotationOffsetY;
  probeRoot.add(probeScene);
  probeRoot.updateMatrixWorld(true);

  if (fbxSkinned) {
    (fbxSkinned as THREE.SkinnedMesh).skeleton.pose();
  }
  fbxGroup.updateMatrixWorld(true);

  // Build valid bone pairs (supports both Sketchfab/Cyber naming and identical Mixamo naming)
  const pairs: Array<{ targetBone: THREE.Object3D; sourceBone: THREE.Object3D }> = [];
  for (const [targetName, mixamoName] of CYBER_TO_MIXAMO_BONES) {
    const tBone = findObjectByName(probeScene, targetName);
    const sBone =
      findObjectByName(fbxGroup, mixamoName) ??
      findObjectByName(fbxGroup, mixamoName.replace('mixamorig', 'mixamorig:'));
    if (tBone && sBone && tBone.parent) {
      pairs.push({ targetBone: tBone, sourceBone: sBone });
    }
  }

  // Fallback for rigs that already use Mixamo bone names directly
  if (pairs.length === 0) {
    probeScene.traverse((obj) => {
      if ((obj as THREE.Bone).isBone && obj.parent) {
        const sBone = findObjectByName(fbxGroup, obj.name);
        if (sBone) {
          pairs.push({ targetBone: obj, sourceBone: sBone });
        }
      }
    });
  }

  if (pairs.length < 6) {
    return null;
  }

  // Align Cyber character's A-pose arms into Mixamo T-pose (+X left, -X right) for rest-pose matching
  alignLimbToWorldDirection(
    findObjectByName(probeScene, 'l arm_028'),
    findObjectByName(probeScene, 'l forearm_029'),
    new THREE.Vector3(1, 0, 0)
  );
  alignLimbToWorldDirection(
    findObjectByName(probeScene, 'l forearm_029'),
    findObjectByName(probeScene, 'l hand_030'),
    new THREE.Vector3(1, 0, 0)
  );
  alignLimbToWorldDirection(
    findObjectByName(probeScene, 'r arm_09'),
    findObjectByName(probeScene, 'r forearm_010'),
    new THREE.Vector3(-1, 0, 0)
  );
  alignLimbToWorldDirection(
    findObjectByName(probeScene, 'r forearm_010'),
    findObjectByName(probeScene, 'r hand_011'),
    new THREE.Vector3(-1, 0, 0)
  );
  probeRoot.updateMatrixWorld(true);

  const sourceRestInv = new Map<THREE.Object3D, THREE.Quaternion>();
  const targetRestWorld = new Map<THREE.Object3D, THREE.Quaternion>();

  for (const { targetBone, sourceBone } of pairs) {
    const sq = new THREE.Quaternion();
    const tq = new THREE.Quaternion();
    sourceBone.getWorldQuaternion(sq);
    targetBone.getWorldQuaternion(tq);
    sourceRestInv.set(sourceBone, sq.invert());
    targetRestWorld.set(targetBone, tq);
  }

  const targetHips = pairs[0].targetBone;
  const sourceHips = pairs[0].sourceBone;
  const targetHipsRestLocalPos = targetHips.position.clone();

  const sourceHipsRestWorld = new THREE.Vector3();
  const targetHipsRestWorld = new THREE.Vector3();
  sourceHips.getWorldPosition(sourceHipsRestWorld);
  targetHips.getWorldPosition(targetHipsRestWorld);
  const heightRatio = targetHipsRestWorld.y / Math.max(0.001, sourceHipsRestWorld.y);

  // Measure resting ankle/toe floor clearance so running strides stay grounded
  const lFoot = findObjectByName(probeScene, 'l foot_049');
  const rFoot = findObjectByName(probeScene, 'r foot_053');
  const restFootY = (() => {
    const p = new THREE.Vector3();
    let minY = Infinity;
    if (lFoot) {
      lFoot.getWorldPosition(p);
      minY = Math.min(minY, p.y);
    }
    if (rFoot) {
      rFoot.getWorldPosition(p);
      minY = Math.min(minY, p.y);
    }
    return Number.isFinite(minY) ? minY : 0;
  })();

  const duration = Math.max(0.1, sourceClip.duration);
  const fps = 30;
  const numFrames = Math.max(4, Math.round(duration * fps) + 1);
  const times = new Float32Array(numFrames);
  const quatBuffers = new Map<THREE.Object3D, Float32Array>();
  for (const { targetBone } of pairs) {
    quatBuffers.set(targetBone, new Float32Array(numFrames * 4));
  }
  const hipsPosValues = new Float32Array(numFrames * 3);
  const frameWorldDeltasY: number[] = new Array(numFrames).fill(0);

  const fbxMixer = new THREE.AnimationMixer(fbxGroup);
  const fbxAction = fbxMixer.clipAction(sourceClip);
  fbxAction.play();

  const sQuat = new THREE.Quaternion();
  const worldDelta = new THREE.Quaternion();
  const desiredWorld = new THREE.Quaternion();
  const parentWorldQ = new THREE.Quaternion();
  const localQuat = new THREE.Quaternion();
  const sHipsPos = new THREE.Vector3();
  const footProbePos = new THREE.Vector3();
  const hipsParentInvQ = new THREE.Quaternion();
  targetHips.parent?.getWorldQuaternion(hipsParentInvQ);
  hipsParentInvQ.invert();

  let minRunFootY = Infinity;

  for (let f = 0; f < numFrames; f++) {
    const sampleTime = Math.min(duration - 1e-5, (f / (numFrames - 1)) * duration);
    times[f] = (f / (numFrames - 1)) * duration;
    fbxMixer.setTime(sampleTime);
    fbxGroup.updateMatrixWorld(true);

    sourceHips.getWorldPosition(sHipsPos);
    const deltaY = (sHipsPos.y - sourceHipsRestWorld.y) * heightRatio;
    frameWorldDeltasY[f] = deltaY;

    const localOffset = new THREE.Vector3(0, deltaY, 0).applyQuaternion(hipsParentInvQ);
    targetHips.position.copy(targetHipsRestLocalPos).add(localOffset);
    targetHips.updateMatrixWorld(true);

    for (const { targetBone, sourceBone } of pairs) {
      sourceBone.getWorldQuaternion(sQuat);
      worldDelta.copy(sQuat).multiply(sourceRestInv.get(sourceBone)!);
      desiredWorld.copy(worldDelta).multiply(targetRestWorld.get(targetBone)!);
      targetBone.parent!.getWorldQuaternion(parentWorldQ);
      localQuat.copy(parentWorldQ).invert().multiply(desiredWorld).normalize();
      targetBone.quaternion.copy(localQuat);
      targetBone.updateMatrixWorld(true);
      localQuat.toArray(quatBuffers.get(targetBone)!, f * 4);
    }

    if (lFoot) {
      lFoot.getWorldPosition(footProbePos);
      minRunFootY = Math.min(minRunFootY, footProbePos.y);
    }
    if (rFoot) {
      rFoot.getWorldPosition(footProbePos);
      minRunFootY = Math.min(minRunFootY, footProbePos.y);
    }
  }

  // Ground-correct hip bounce so planted feet stay flush on the terrain rather than hovering
  const footElevationOffset =
    Number.isFinite(minRunFootY) && restFootY > 0 ? Math.max(0, minRunFootY - restFootY) : 0;

  for (let f = 0; f < numFrames; f++) {
    const correctedDeltaY = frameWorldDeltasY[f] - footElevationOffset;
    const localOffset = new THREE.Vector3(0, correctedDeltaY, 0).applyQuaternion(hipsParentInvQ);
    const finalPos = targetHipsRestLocalPos.clone().add(localOffset);
    finalPos.toArray(hipsPosValues, f * 3);
  }

  fbxMixer.stopAllAction();
  fbxMixer.uncacheRoot(fbxGroup);

  const tracks: THREE.KeyframeTrack[] = [
    new THREE.VectorKeyframeTrack(`${targetHips.name}.position`, times, hipsPosValues),
    ...pairs.map(
      ({ targetBone }) =>
        new THREE.QuaternionKeyframeTrack(`${targetBone.name}.quaternion`, times, quatBuffers.get(targetBone)!)
    ),
  ];

  const retargeted = new THREE.AnimationClip(outputClipName, duration, tracks);
  retargeted.optimize();
  return retargeted;
}

async function loadGltfFromPublic(
  fileName: string,
  resourceBase: string
): Promise<{ scene: THREE.Group; animations: THREE.AnimationClip[]; url: string } | null> {
  const url = resolvePublicUrl(fileName);
  const buffer = await fetchBinaryIfAvailable(url);
  if (!buffer) return null;

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
    if (!hasRenderableMeshes(gltf.scene)) return null;
    return { scene: gltf.scene, animations: gltf.animations || [], url };
  } catch {
    return null;
  } finally {
    dracoLoader.dispose();
  }
}

async function loadFbxFromPublic(
  fileName: string,
  resourceBase: string
): Promise<{ group: THREE.Group; animations: THREE.AnimationClip[]; url: string } | null> {
  const url = resolvePublicUrl(fileName);
  const buffer = await fetchBinaryIfAvailable(url);
  if (!buffer) return null;

  try {
    const fbxLoader = new FBXLoader();
    const group = fbxLoader.parse(buffer, resourceBase);
    return { group, animations: group.animations || [], url };
  } catch {
    return null;
  }
}

export async function loadExternalCharacterTemplate(): Promise<LoadedExternalCharacterTemplate | null> {
  const base = import.meta.env.BASE_URL || '/';
  const resourceBase = base.endsWith('/') ? base : `${base}/`;

  // 1. Load primary Cyber character GLB (keeps all Cyber meshes & textures intact in scene)
  const primaryGlb = await loadGltfFromPublic(EXTERNAL_CHARACTER_CONFIG.primaryModelFile, resourceBase);
  const animFbx = await loadFbxFromPublic(EXTERNAL_CHARACTER_CONFIG.animationSourceFile, resourceBase);

  if (primaryGlb) {
    const baseFacingRotationY = detectBaseFacingRotationY(primaryGlb.scene);
    const animations = [...primaryGlb.animations];

    // 2. Extract AnimationClip from Running.fbx & retarget onto cyberpunk_character.glb skeleton
    if (animFbx && animFbx.animations.length > 0) {
      const sourceRunClip =
        animFbx.animations.find((c) => /run|sprint|mixamo/i.test(c.name)) ?? animFbx.animations[0];
      const retargetedRun = retargetMixamoClipToTarget(
        primaryGlb.scene,
        baseFacingRotationY,
        animFbx.group,
        sourceRunClip,
        'MixamoRun'
      );
      if (retargetedRun) {
        animations.push(retargetedRun);
      }
      // Dispose FBX mesh/material resources immediately—only its retargeted AnimationClip is kept
      disposeObjectResources(animFbx.group);
    }

    return {
      scene: primaryGlb.scene,
      animations,
      sourceUrl: primaryGlb.url,
      format: 'glb',
      baseFacingRotationY,
    };
  }

  // Fallback: if primary GLB is absent, load skinned FBX directly if it has meshes
  if (animFbx && hasRenderableMeshes(animFbx.group)) {
    return {
      scene: animFbx.group,
      animations: animFbx.animations,
      sourceUrl: animFbx.url,
      format: 'fbx',
      baseFacingRotationY: 0,
    };
  }

  if (animFbx) {
    disposeObjectResources(animFbx.group);
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

  // Orient character forward (+Z) and normalize height + ground alignment
  cloned.rotation.y = template.baseFacingRotationY + EXTERNAL_CHARACTER_CONFIG.rotationOffsetY;
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

    const explicitIdle = findClip(/idle|stand|breath|a-?pose/i);
    const runClip = findClip(/mixamorun|run|sprint|jog/i);
    const walkClip = findClip(/walk/i) ?? runClip;
    const jumpClip = findClip(/jump|fall|air|glide/i);
    const crouchClip = findClip(/crouch|sneak|duck/i);
    const shootClip = findClip(/shoot|fire|attack|aim/i);

    if (clips.length === 1 && !explicitIdle) {
      singleClipRunOnly = true;
      const soleAction = mixer.clipAction(clips[0]);
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
      if (runClip) actions.run = mixer.clipAction(runClip);
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
      prevAction.crossFadeTo(nextAction, 0.16, true);
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
          actions.run.paused = true;
          mixer.update(0);
        }
        return;
      }

      // If crouch/jump state doesn't have its own clip, use Mixamo run when moving or A-pose idle when still
      const resolvedState: ExternalAnimState =
        state === 'jump' && !actions.jump && isMoving
          ? 'run'
          : state === 'crouch' && !actions.crouch && isMoving
          ? 'walk'
          : state;

      const speedScale =
        resolvedState === 'run'
          ? EXTERNAL_CHARACTER_CONFIG.runAnimSpeedScale
          : resolvedState === 'walk'
          ? EXTERNAL_CHARACTER_CONFIG.walkAnimSpeedScale
          : 1.0;

      playState(resolvedState, speedScale);
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
