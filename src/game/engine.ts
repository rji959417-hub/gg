import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import {
  BoxCollider,
  ArticulatedCharacter,
  createAirdropCrateMesh,
  createCharacterModel,
  createGlooWallMesh,
  createLobbyPedestal,
  createLootMesh,
  createMapCompounds,
  createWeaponModel,
} from './models';
import {
  createIslandEnvironment,
  groundHeightAt,
  ISLAND_PLAYABLE_RADIUS,
} from './terrain';
import { createProceduralTextures, ProceduralTextureSet } from './textures';
import {
  CharacterSkin,
  DamageIndicator,
  GamePhase,
  HudSnapshot,
  KillFeedEntry,
  LootType,
  MinimapBlip,
  WeaponId,
  WeaponInstance,
} from './types';
import { BOT_CALLSIGNS, CHARACTER_SKINS, WEAPONS } from './weapons';
import { gameAudio } from './audio';

// Module-scope scratch math helpers (Zero GC in frame loop)
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();
const _v4 = new THREE.Vector3();
const _proj = new THREE.Vector3();

interface GlooWallEntity {
  id: number;
  mesh: THREE.Group;
  position: THREE.Vector3;
  yaw: number;
  hp: number;
  maxHp: number;
  spawnProgress: number;
}

interface LootEntity {
  id: number;
  type: LootType;
  weaponId?: WeaponId;
  amount: number;
  label: string;
  position: THREE.Vector3;
  mesh: THREE.Group;
  collected: boolean;
}

interface BulletTracer {
  mesh: THREE.Mesh;
  start: THREE.Vector3;
  end: THREE.Vector3;
  life: number;
  maxLife: number;
}

interface ImpactSpark {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  life: number;
}

interface BotEntity {
  id: number;
  name: string;
  skin: CharacterSkin;
  model: ArticulatedCharacter;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  yaw: number;
  hp: number;
  maxHp: number;
  armor: number;
  weaponId: WeaponId;
  alive: boolean;
  fireCooldown: number;
  strafeDir: number;
  strafeTimer: number;
  patrolTarget: THREE.Vector3;
  lastFireTimestamp: number;
  animPhase: number;
  hasGloo: boolean;
  hitFlash: number;
}

interface ZonePhaseConfig {
  waitDuration: number;
  shrinkDuration: number;
  targetRadius: number;
  dps: number;
}

const ZONE_PHASES: ZonePhaseConfig[] = [
  { waitDuration: 34, shrinkDuration: 30, targetRadius: 165, dps: 2 },
  { waitDuration: 28, shrinkDuration: 26, targetRadius: 105, dps: 5 },
  { waitDuration: 24, shrinkDuration: 22, targetRadius: 55, dps: 9 },
  { waitDuration: 18, shrinkDuration: 18, targetRadius: 22, dps: 15 },
  { waitDuration: 14, shrinkDuration: 14, targetRadius: 5, dps: 24 },
];

export interface InputState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  sprint: boolean;
  jump: boolean;
  crouch: boolean;
  firing: boolean;
  ads: boolean;
}

export class BattleRoyaleEngine {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private sunLight: THREE.DirectionalLight;
  private rimLight: THREE.DirectionalLight;
  private muzzleLight: THREE.PointLight;
  private muzzleFlashTimer = 0;
  private lobbyPedestal!: THREE.Group;
  private textures: ProceduralTextureSet;
  private isSoftwareGl: boolean;

  private frameId = 0;
  private disposed = false;
  private clock = new THREE.Clock();

  private phase: GamePhase = 'lobby';
  private onHudUpdate: (snapshot: HudSnapshot) => void;
  private hudEmitTimer = 0;

  // World
  private worldGroup = new THREE.Group();
  private dynamicGroup = new THREE.Group();
  private colliders: BoxCollider[] = [];
  private treeColliders: Array<{ x: number; z: number; radius: number }> = [];
  private rockColliders: Array<{ x: number; z: number; radius: number; topY: number }> = [];
  private waterMesh!: THREE.Mesh;

  // Safe Zone mesh
  private zoneMesh!: THREE.Mesh;
  private zoneCenter = new THREE.Vector2(0, 0);
  private zoneRadius = ISLAND_PLAYABLE_RADIUS;
  private startZoneCenter = new THREE.Vector2(0, 0);
  private startZoneRadius = ISLAND_PLAYABLE_RADIUS;
  private nextZoneCenter = new THREE.Vector2(0, 0);
  private nextZoneRadius = ZONE_PHASES[0].targetRadius;
  private zonePhaseIdx = 0;
  private zoneShrinking = false;
  private zoneTimer = ZONE_PHASES[0].waitDuration;
  private zoneDamageTick = 0;

  // Player state
  private selectedSkin: CharacterSkin = CHARACTER_SKINS[0];
  private totalCombatants = 36;
  private playerModel!: ArticulatedCharacter;
  private glbCharacterRoot: THREE.Group | null = null;
  private glbTemplateScene: THREE.Group | null = null;
  private glbAnimationClips: THREE.AnimationClip[] = [];
  private glbMixer: THREE.AnimationMixer | null = null;
  private glbActions: Partial<Record<'idle' | 'walk' | 'run' | 'jump' | 'crouch' | 'shoot', THREE.AnimationAction>> = {};
  private activeGlbActionKey: string | null = null;
  private playerPos = new THREE.Vector3(0, 0, 0);
  private playerVel = new THREE.Vector3(0, 0, 0);
  private playerYaw = 0;
  private cameraPitch = 0.14;
  private currentFov = 68;
  private isGrounded = true;
  private chuteOpen = false;
  private playerHp = 200;
  private maxHp = 200;
  private playerArmor = 50;
  private maxArmor = 150;
  private medkits = 2;
  private glooWallsCount = 3;
  private healingTimer = 0;
  private reloadTimer = 0;
  private fireCooldown = 0;
  private recoilOffset = 0;
  private animPhase = 0;
  private stance: 'stand' | 'crouch' | 'prone' = 'stand';
  private punchTimer = 0;
  private punchSide: 1 | -1 = 1;
  private sprintToggled = false;

  private weapons: [WeaponInstance | null, WeaponInstance | null, WeaponInstance | null] = [
    null,
    null,
    null,
  ];
  private activeSlot: 0 | 1 | 2 | 3 = 0;
  private lastGunSlot: 0 | 1 | 2 = 2;
  private equippedWeaponMesh: THREE.Group | null = null;

  // Stats
  private kills = 0;
  private headshots = 0;
  private damageDealt = 0;
  private shotsFired = 0;
  private shotsHit = 0;
  private survivalTime = 0;
  private placement = 1;
  private isBooyah = false;
  private eliminatedBy = '';

  // Entities
  private bots: BotEntity[] = [];
  private glooWalls: GlooWallEntity[] = [];
  private loots: LootEntity[] = [];
  private tracers: BulletTracer[] = [];
  private sparks: ImpactSpark[] = [];
  private killFeed: KillFeedEntry[] = [];
  private damageNumbers: DamageIndicator[] = [];
  private nextEntityId = 1;
  private airdropSpawned = false;
  private airdropMesh: THREE.Group | null = null;
  private airdropPos = new THREE.Vector3();
  private airdropLanded = false;
  private bannerMessage: string | null = null;
  private bannerTimer = 0;

  // Feedback
  private hitMarkerType: 'none' | 'body' | 'head' = 'none';
  private hitMarkerTime = 0;
  private damageFlash = 0;
  private damageDirectionAngle: number | null = null;
  private aimingAtEnemy = false;
  private nearbyLoot: LootEntity | null = null;

  // Shared VFX geometries/materials
  private tracerGeo = new THREE.CylinderGeometry(0.025, 0.025, 1, 5);
  private tracerMatPlayer = new THREE.MeshBasicMaterial({ color: 0xfde047 });
  private tracerMatBot = new THREE.MeshBasicMaterial({ color: 0xf87171 });
  private sparkGeo = new THREE.BoxGeometry(0.09, 0.09, 0.09);
  private sparkMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
  private bloodMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });

  // Input
  public input: InputState = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    sprint: false,
    jump: false,
    crouch: false,
    firing: false,
    ads: false,
  };
  private pointerLocked = false;
  private isDraggingLook = false;
  private lastPointerX = 0;
  private lastPointerY = 0;
  private activeLookTouchId: number | null = null;
  private lastTouchX = 0;
  private lastTouchY = 0;
  private joystickVec = new THREE.Vector2(0, 0);
  private lobbyOrbitAngle = 0.45;
  private cameraTargetPos = new THREE.Vector3();
  private cameraLookPos = new THREE.Vector3();

  constructor(container: HTMLElement, onHudUpdate: (snapshot: HudSnapshot) => void) {
    this.container = container;
    this.onHudUpdate = onHudUpdate;

    // Software WebGL probe
    this.isSoftwareGl = (() => {
      const probe = document.createElement('canvas');
      const gl = probe.getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.tabIndex = 0;
    this.renderer.domElement.style.outline = 'none';
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0xdbe8ef, 0.0024);

    // Studio RoomEnvironment IBL
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    this.camera = new THREE.PerspectiveCamera(
      68,
      (container.clientWidth || window.innerWidth) / (container.clientHeight || window.innerHeight),
      0.15,
      950
    );

    // Warm Key Sun + Cool Hemisphere Fill + Cool Rim Backlight + Dynamic Muzzle Flash Light
    const hemi = new THREE.HemisphereLight(0x8ecae6, 0x36442d, 0.78);
    this.scene.add(hemi);

    this.sunLight = new THREE.DirectionalLight(0xffe9c8, 2.35);
    this.sunLight.position.set(45, 72, 35);
    this.sunLight.castShadow = !this.isSoftwareGl;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    const d = 28;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.camera.near = 4;
    this.sunLight.shadow.camera.far = 160;
    this.sunLight.shadow.bias = -0.0004;
    this.sunLight.shadow.normalBias = 0.018;
    this.sunLight.shadow.radius = 2.5;
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    this.rimLight = new THREE.DirectionalLight(0xbae6fd, 0.9);
    this.rimLight.position.set(-38, 28, -42);
    this.scene.add(this.rimLight);

    this.muzzleLight = new THREE.PointLight(0xff9f43, 0, 14, 2);
    this.scene.add(this.muzzleLight);

    // Build Procedural Textures, Skybox & World
    this.textures = createProceduralTextures(this.renderer.capabilities.getMaxAnisotropy());
    this.scene.background = this.textures.skyboxMap;
    this.lobbyPedestal = createLobbyPedestal(this.textures);
    this.scene.add(this.lobbyPedestal);
    const island = createIslandEnvironment(this.textures, this.isSoftwareGl);
    this.treeColliders = island.treeColliders;
    this.rockColliders = island.rockColliders;
    this.waterMesh = island.waterMesh;
    this.worldGroup.add(island.group);

    const compounds = createMapCompounds(this.textures);
    this.colliders = compounds.colliders;
    this.worldGroup.add(compounds.group);

    // Safe Zone Cylinder Wall
    const zoneGeo = new THREE.CylinderGeometry(1, 1, 90, 64, 1, true);
    const zoneMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.zoneMesh = new THREE.Mesh(zoneGeo, zoneMat);
    this.zoneMesh.position.y = 35;
    this.worldGroup.add(this.zoneMesh);

    this.scene.add(this.worldGroup);
    this.scene.add(this.dynamicGroup);

    // Orient tracer along Z
    this.tracerGeo.rotateX(Math.PI / 2);

    // Setup initial lobby player character & load Cyberpunk GLB character if present in /public
    this.rebuildPlayerModel(this.selectedSkin);
    this.loadCyberpunkCharacterGlb();
    this.setupLobbyPose();

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.bindEvents();
    this.emitHud();
    this.startLoop();
  }

  private loadCyberpunkCharacterGlb(): void {
    const baseUrl = import.meta.env.BASE_URL || '/';
    const glbUrl = `${baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`}cyberpunk_character.glb`;

    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');

    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);

    loader.load(
      glbUrl,
      (gltf) => {
        dracoLoader.dispose();
        if (this.disposed) return;

        this.glbTemplateScene = gltf.scene;
        this.glbAnimationClips = gltf.animations || [];
        this.attachCyberpunkGlbToPlayer();
      },
      undefined,
      () => {
        dracoLoader.dispose();
        // Graceful fallback: built-in tactical character stays active when GLB is unavailable
      }
    );
  }

  private attachCyberpunkGlbToPlayer(): void {
    if (!this.playerModel || !this.glbTemplateScene) return;

    if (this.glbMixer) {
      this.glbMixer.stopAllAction();
      this.glbMixer = null;
    }
    this.glbActions = {};
    this.activeGlbActionKey = null;

    if (this.glbCharacterRoot && this.glbCharacterRoot.parent) {
      this.glbCharacterRoot.parent.remove(this.glbCharacterRoot);
    }

    const cloned = SkeletonUtils.clone(this.glbTemplateScene) as THREE.Group;
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
    cloned.updateMatrixWorld(true);

    // Normalize scale to realistic 1.78m soldier height and align feet flush to ground (y = 0)
    const rawBox = new THREE.Box3().setFromObject(cloned);
    const rawSize = _v1;
    rawBox.getSize(rawSize);
    if (rawSize.y > 0.001) {
      const targetHeight = 1.78;
      cloned.scale.multiplyScalar(targetHeight / rawSize.y);
      cloned.updateMatrixWorld(true);
    }

    const scaledBox = new THREE.Box3().setFromObject(cloned);
    const center = _v2;
    scaledBox.getCenter(center);
    cloned.position.x -= center.x;
    cloned.position.z -= center.z;
    cloned.position.y -= scaledBox.min.y;

    // Hide procedural body meshes while keeping parachute, shadow, weapon mount & muzzle active
    this.playerModel.hips.visible = false;
    this.playerModel.parachute.position.set(0, 2.25, -0.1);
    this.playerModel.root.add(this.playerModel.parachute);
    this.playerModel.weaponMount.position.set(-0.22, 1.24, 0.28);
    this.playerModel.weaponMount.rotation.set(0, 0, 0);
    this.playerModel.root.add(this.playerModel.weaponMount);

    this.glbCharacterRoot = wrapper;
    this.playerModel.root.add(wrapper);

    if (this.glbAnimationClips.length > 0) {
      const mixer = new THREE.AnimationMixer(cloned);
      const findClip = (pattern: RegExp) =>
        this.glbAnimationClips.find((c) => pattern.test(c.name));

      const idleClip = findClip(/idle|stand|breath/i) ?? this.glbAnimationClips[0];
      const walkClip = findClip(/walk/i);
      const runClip = findClip(/run|sprint/i) ?? walkClip;
      const jumpClip = findClip(/jump|fall|air|glide/i);
      const crouchClip = findClip(/crouch|sneak|duck/i);
      const shootClip = findClip(/shoot|fire|attack|aim/i);

      if (idleClip) this.glbActions.idle = mixer.clipAction(idleClip);
      if (walkClip) this.glbActions.walk = mixer.clipAction(walkClip);
      if (runClip) this.glbActions.run = mixer.clipAction(runClip);
      if (jumpClip) this.glbActions.jump = mixer.clipAction(jumpClip);
      if (crouchClip) this.glbActions.crouch = mixer.clipAction(crouchClip);
      if (shootClip) this.glbActions.shoot = mixer.clipAction(shootClip);

      this.glbMixer = mixer;
      this.playGlbAnimation('idle');
    }
  }

  private playGlbAnimation(key: 'idle' | 'walk' | 'run' | 'jump' | 'crouch' | 'shoot'): void {
    if (!this.glbMixer) return;
    const nextAction = this.glbActions[key] ?? this.glbActions.idle;
    if (!nextAction) return;

    const resolvedKey = this.glbActions[key] ? key : 'idle';
    if (this.activeGlbActionKey === resolvedKey) return;

    const prevAction = this.activeGlbActionKey
      ? this.glbActions[this.activeGlbActionKey as keyof typeof this.glbActions]
      : undefined;

    nextAction.reset();
    nextAction.enabled = true;
    nextAction.setEffectiveTimeScale(1);
    nextAction.setEffectiveWeight(1);
    nextAction.play();

    if (prevAction && prevAction !== nextAction) {
      prevAction.crossFadeTo(nextAction, 0.18, true);
    }
    this.activeGlbActionKey = resolvedKey;
  }

  private rebuildPlayerModel(skin: CharacterSkin): void {
    if (this.playerModel) {
      this.scene.remove(this.playerModel.root);
      this.playerModel.materialsToDispose.forEach((m) => m.dispose());
    }
    this.glbCharacterRoot = null;
    this.playerModel = createCharacterModel(skin, this.textures);
    this.scene.add(this.playerModel.root);
    if (this.glbTemplateScene) {
      this.attachCyberpunkGlbToPlayer();
    }
    this.attachEquippedWeaponMesh();
  }

  private attachEquippedWeaponMesh(): void {
    if (!this.playerModel) return;
    if (this.equippedWeaponMesh) {
      this.playerModel.weaponMount.remove(this.equippedWeaponMesh);
      this.equippedWeaponMesh = null;
    }
    if (this.activeSlot === 3) {
      this.playerModel.weaponMount.visible = false;
      return;
    }
    this.playerModel.weaponMount.visible = true;
    const current = this.weapons[this.activeSlot];
    const id: WeaponId = current ? current.spec.id : 'scar';
    this.equippedWeaponMesh = createWeaponModel(id);
    this.playerModel.weaponMount.add(this.equippedWeaponMesh);
  }

  private setupLobbyPose(): void {
    this.phase = 'lobby';
    this.stance = 'stand';
    this.input.crouch = false;
    const baseGround = groundHeightAt(0, 6);
    this.lobbyPedestal.position.set(0, baseGround, 6);
    this.lobbyPedestal.visible = true;
    this.playerPos.set(0, baseGround + 0.31, 6);
    this.playerModel.root.position.copy(this.playerPos);
    this.playerModel.root.rotation.set(0, 0.15, 0);
    this.playerModel.hips.position.y = 0.94;
    this.playerModel.hips.rotation.set(0, 0, 0);
    this.playerModel.torso.rotation.set(0, 0, 0);
    this.playerModel.leftShin.rotation.set(0, 0, 0);
    this.playerModel.rightShin.rotation.set(0, 0, 0);
    this.playerModel.leftForearm.rotation.set(-0.55, 0, 0);
    this.playerModel.rightForearm.rotation.set(-0.62, 0, 0);
    this.playerModel.parachute.visible = false;
    this.playerModel.muzzleFlash.visible = false;
    this.weapons = [
      { spec: WEAPONS.scar, ammoInMag: 30, reserveAmmo: 90 },
      { spec: WEAPONS.m1887, ammoInMag: 2, reserveAmmo: 16 },
      { spec: WEAPONS.m500, ammoInMag: 12, reserveAmmo: 36 },
    ];
    this.activeSlot = 0;
    this.lastGunSlot = 0;
    this.attachEquippedWeaponMesh();

    // Update zone visual for lobby backdrop
    this.zoneMesh.visible = false;
  }

  public setSkin(skin: CharacterSkin): void {
    this.selectedSkin = skin;
    this.rebuildPlayerModel(skin);
    if (this.phase === 'lobby') {
      this.playerModel.root.position.copy(this.playerPos);
    }
  }

  public setTotalCombatants(count: number): void {
    this.totalCombatants = count;
    this.emitHud();
  }

  public startMatch(): void {
    gameAudio.unlock();
    this.lobbyPedestal.visible = false;
    this.clearDynamicEntities();

    // Reset player stats & starting gear (SCAR-L Assault Rifle + M500 sidearm + 2 Gloo Walls + 1 Medkit)
    this.playerHp = 200;
    this.maxHp = 200;
    this.playerArmor = 50;
    this.medkits = 1;
    this.glooWallsCount = 2;
    this.healingTimer = 0;
    this.reloadTimer = 0;
    this.fireCooldown = 0;
    this.punchTimer = 0;
    this.recoilOffset = 0;
    this.stance = 'stand';
    this.input.crouch = false;
    this.sprintToggled = false;
    this.joystickVec.set(0, 0);
    this.kills = 0;
    this.headshots = 0;
    this.damageDealt = 0;
    this.shotsFired = 0;
    this.shotsHit = 0;
    this.survivalTime = 0;
    this.placement = this.totalCombatants;
    this.isBooyah = false;
    this.eliminatedBy = '';
    this.damageFlash = 0;
    this.killFeed = [];
    this.damageNumbers = [];
    this.airdropSpawned = false;
    this.airdropLanded = false;

    this.weapons = [
      { spec: WEAPONS.scar, ammoInMag: WEAPONS.scar.magSize, reserveAmmo: 120 },
      null,
      { spec: WEAPONS.m500, ammoInMag: WEAPONS.m500.magSize, reserveAmmo: 36 },
    ];
    this.activeSlot = 0;
    this.lastGunSlot = 0;
    this.attachEquippedWeaponMesh();

    // Randomize safe zone center slightly across the expanded island
    this.zoneCenter.set((Math.random() - 0.5) * 44, (Math.random() - 0.5) * 44);
    this.zoneRadius = ISLAND_PLAYABLE_RADIUS;
    this.startZoneCenter.copy(this.zoneCenter);
    this.startZoneRadius = this.zoneRadius;
    this.zonePhaseIdx = 0;
    this.zoneShrinking = false;
    this.zoneTimer = ZONE_PHASES[0].waitDuration;
    this.nextZoneCenter.set(
      this.zoneCenter.x + (Math.random() - 0.5) * 42,
      this.zoneCenter.y + (Math.random() - 0.5) * 42
    );
    this.nextZoneRadius = ZONE_PHASES[0].targetRadius;
    this.zoneMesh.visible = true;

    // Smooth Tactical Parachute Drop over the large rugged island
    const dropAngle = Math.random() * Math.PI * 2;
    const dropDist = 24 + Math.random() * 110;
    const startX = Math.cos(dropAngle) * dropDist;
    const startZ = Math.sin(dropAngle) * dropDist;
    const groundY = groundHeightAt(startX, startZ);
    this.playerPos.set(startX, groundY + 40, startZ);
    this.playerVel.set(0, -4.0, 0);
    this.playerYaw = Math.atan2(-startX, -startZ);
    this.cameraPitch = 0.24;
    this.chuteOpen = true;
    this.isGrounded = false;
    this.phase = 'parachute';
    this.playerModel.parachute.visible = true;

    this.showBanner('PARACHUTE GLIDE — WASD / JOYSTICK STEER · [SPACE] FAST DIVE', 3.0);

    // Spawn island ground loot
    this.spawnInitialLoot();

    // Spawn AI Bots
    this.spawnBots(this.totalCombatants - 1);

    this.renderer.domElement.focus();
    this.emitHud();
  }

  public returnToLobby(): void {
    this.exitPointerLock();
    this.clearDynamicEntities();
    this.setupLobbyPose();
    this.emitHud();
  }

  public cutParachute(): void {
    if (this.phase === 'parachute' && this.chuteOpen) {
      this.chuteOpen = false;
      this.playerModel.parachute.visible = false;
      this.playerVel.y = -14;
      this.showBanner('FAST DIVE ENGAGED', 1.6);
    }
  }

  public requestPointerLock(): void {
    if (this.phase === 'lobby' || this.phase === 'ended') return;
    try {
      const p = this.renderer.domElement.requestPointerLock?.() as unknown as Promise<void> | undefined;
      if (p && typeof p.catch === 'function') {
        p.catch(() => {});
      }
    } catch {
      // Fallback drag aim still works
    }
  }

  private exitPointerLock(): void {
    if (document.pointerLockElement === this.renderer.domElement) {
      document.exitPointerLock?.();
    }
  }

  private clearDynamicEntities(): void {
    this.bots.forEach((b) => {
      this.dynamicGroup.remove(b.model.root);
      b.model.materialsToDispose.forEach((m) => m.dispose());
    });
    this.bots = [];

    this.glooWalls.forEach((g) => this.dynamicGroup.remove(g.mesh));
    this.glooWalls = [];

    this.loots.forEach((l) => this.dynamicGroup.remove(l.mesh));
    this.loots = [];

    this.tracers.forEach((t) => this.dynamicGroup.remove(t.mesh));
    this.tracers = [];

    this.sparks.forEach((s) => this.dynamicGroup.remove(s.mesh));
    this.sparks = [];

    if (this.airdropMesh) {
      this.dynamicGroup.remove(this.airdropMesh);
      this.airdropMesh = null;
    }
  }

  private spawnInitialLoot(): void {
    const weaponPool: WeaponId[] = ['scar', 'scar', 'mp40', 'mp40', 'm1887', 'm1887', 'awm'];
    const compoundSpots: Array<[number, number]> = [
      // Central Peak
      [0, -24],
      [24, 16],
      [-22, -10],
      [-18, 22],
      // North Factory
      [-32, -124],
      [-10, -138],
      [-50, -112],
      // Northeast Highland Village
      [124, -120],
      [148, -110],
      [136, -134],
      [116, -102],
      // East Shipyard
      [172, 18],
      [154, -18],
      [178, -8],
      // Southeast Town
      [130, 124],
      [148, 140],
      [114, 140],
      // South Pochinok
      [-22, 148],
      [28, 144],
      [4, 164],
      [-8, 134],
      // Southwest Mountain Pass
      [-136, 120],
      [-118, 138],
      [-146, 140],
      // West Bimasakti
      [-172, 10],
      [-154, -16],
      [-176, -30],
      // Northwest Pine Outpost
      [-134, -134],
      [-114, -118],
      [-148, -116],
      // Mid-map checkpoints
      [68, 64],
      [-68, -64],
    ];

    // Spawn guaranteed weapons & gear in all compounds and villages
    compoundSpots.forEach(([lx, lz], idx) => {
      const wId = weaponPool[idx % weaponPool.length];
      this.spawnLootItem(lx + (Math.random() - 0.5) * 4, lz + (Math.random() - 0.5) * 4, 'weapon', wId);
      if (idx % 2 === 0) {
        this.spawnLootItem(lx + 2.4, lz - 1.8, idx % 4 === 0 ? 'armor' : 'medkit');
      } else {
        this.spawnLootItem(lx - 2.2, lz + 2.0, 'gloowall');
      }
    });

    // Scatter additional field loot across the expanded rugged island
    for (let i = 0; i < 85; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 16 + Math.random() * (ISLAND_PLAYABLE_RADIUS - 24);
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      if (groundHeightAt(x, z) < 0.6) continue;

      const roll = Math.random();
      if (roll < 0.35) {
        const wId = weaponPool[Math.floor(Math.random() * weaponPool.length)];
        this.spawnLootItem(x, z, 'weapon', wId);
      } else if (roll < 0.58) {
        this.spawnLootItem(x, z, 'medkit');
      } else if (roll < 0.78) {
        this.spawnLootItem(x, z, 'gloowall');
      } else if (roll < 0.9) {
        this.spawnLootItem(x, z, 'ammo');
      } else {
        this.spawnLootItem(x, z, 'armor');
      }
    }
  }

  private spawnLootItem(x: number, z: number, type: LootType, weaponId?: WeaponId): void {
    const y = groundHeightAt(x, z);
    const mesh = createLootMesh(type, weaponId);
    mesh.position.set(x, y, z);
    this.dynamicGroup.add(mesh);

    let label = 'Ammo Crate';
    let amount = 30;
    if (type === 'weapon' && weaponId) {
      label = WEAPONS[weaponId].name;
      amount = WEAPONS[weaponId].magSize * 2;
    } else if (type === 'medkit') {
      label = 'Medkit (+75 HP)';
      amount = 1;
    } else if (type === 'gloowall') {
      label = 'Gloo Wall (+2)';
      amount = 2;
    } else if (type === 'armor') {
      label = 'Tactical Vest (+75 Armor)';
      amount = 75;
    }

    this.loots.push({
      id: this.nextEntityId++,
      type,
      weaponId,
      amount,
      label,
      position: new THREE.Vector3(x, y, z),
      mesh,
      collected: false,
    });
  }

  private spawnBots(count: number): void {
    const botWeapons: WeaponId[] = ['scar', 'mp40', 'm1887', 'm500', 'awm'];
    const shuffledNames = [...BOT_CALLSIGNS].sort(() => Math.random() - 0.5);

    for (let i = 0; i < count; i++) {
      let bx = 0;
      let bz = 0;
      let by = 0;
      for (let tries = 0; tries < 10; tries++) {
        const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.45;
        const dist = 42 + Math.random() * (ISLAND_PLAYABLE_RADIUS - 58);
        bx = Math.cos(angle) * dist;
        bz = Math.sin(angle) * dist;
        by = groundHeightAt(bx, bz);
        if (by >= 0.7) break;
      }

      const skin = CHARACTER_SKINS[(i + 1) % CHARACTER_SKINS.length];
      const model = createCharacterModel(skin, this.textures);
      const weaponId = botWeapons[i % botWeapons.length];
      const gunMesh = createWeaponModel(weaponId);
      model.weaponMount.add(gunMesh);

      model.root.position.set(bx, by, bz);
      this.dynamicGroup.add(model.root);

      this.bots.push({
        id: this.nextEntityId++,
        name: shuffledNames[i % shuffledNames.length],
        skin,
        model,
        position: new THREE.Vector3(bx, by, bz),
        velocity: new THREE.Vector3(),
        yaw: Math.random() * Math.PI * 2,
        hp: 165,
        maxHp: 165,
        armor: Math.random() > 0.45 ? 45 : 0,
        weaponId,
        alive: true,
        fireCooldown: 0.8 + Math.random() * 1.4,
        strafeDir: Math.random() > 0.5 ? 1 : -1,
        strafeTimer: 1.2 + Math.random() * 2.2,
        patrolTarget: new THREE.Vector3((Math.random() - 0.5) * 320, 0, (Math.random() - 0.5) * 320),
        lastFireTimestamp: -10,
        animPhase: Math.random() * Math.PI * 2,
        hasGloo: Math.random() > 0.45,
        hitFlash: 0,
      });
    }
  }

  public selectWeaponSlot(slot: 0 | 1 | 2 | 3): void {
    if (this.phase !== 'playing') return;
    if (slot !== 3 && !this.weapons[slot]) return;
    if (this.activeSlot === slot) return;
    this.activeSlot = slot;
    if (slot !== 3) this.lastGunSlot = slot;
    this.reloadTimer = 0;
    this.input.ads = false;
    this.attachEquippedWeaponMesh();
    gameAudio.playPickup();
    if (slot === 3) {
      this.showBanner('BARE HANDS / FISTS MODE', 1.2);
    }
    this.emitHud();
  }

  public toggleFistsMode(): void {
    if (this.phase !== 'playing') return;
    if (this.activeSlot === 3) {
      const target = this.weapons[this.lastGunSlot]
        ? this.lastGunSlot
        : this.weapons[0]
        ? 0
        : this.weapons[1]
        ? 1
        : 2;
      this.selectWeaponSlot(target);
    } else {
      this.selectWeaponSlot(3);
    }
  }

  public setStance(target: 'stand' | 'crouch' | 'prone'): void {
    if (this.phase !== 'playing') return;
    if (target === 'crouch') {
      this.stance = this.stance === 'crouch' ? 'stand' : 'crouch';
    } else if (target === 'prone') {
      this.stance = this.stance === 'prone' ? 'stand' : 'prone';
    } else {
      this.stance = 'stand';
    }
    this.input.crouch = this.stance === 'crouch';
    if (this.stance !== 'stand') {
      this.sprintToggled = false;
    }
    this.emitHud();
  }

  public toggleSprint(): void {
    if (this.phase !== 'playing') return;
    this.sprintToggled = !this.sprintToggled;
    if (this.sprintToggled && this.stance !== 'stand') {
      this.stance = 'stand';
      this.input.crouch = false;
    }
    this.emitHud();
  }

  public setMoveFlag(dir: 'forward' | 'backward' | 'left' | 'right', active: boolean): void {
    this.input[dir] = active;
  }

  public setJoystickMove(x: number, y: number): void {
    this.joystickVec.set(
      THREE.MathUtils.clamp(x, -1, 1),
      THREE.MathUtils.clamp(y, -1, 1)
    );
  }

  public startFiring(): void {
    gameAudio.unlock();
    this.input.firing = true;
    if (this.phase === 'playing' && this.fireCooldown <= 0) {
      this.firePlayerWeapon();
    }
  }

  public stopFiring(): void {
    this.input.firing = false;
  }

  public triggerJump(): void {
    if (this.phase === 'parachute') {
      this.cutParachute();
      return;
    }
    if (this.phase !== 'playing') return;
    if (this.stance !== 'stand') {
      this.stance = 'stand';
      this.input.crouch = false;
    }
    if (this.isGrounded) {
      this.playerVel.y = 7.6;
      this.isGrounded = false;
      this.emitHud();
    }
  }

  public triggerReload(): void {
    if (this.phase !== 'playing' || this.activeSlot === 3) return;
    const w = this.weapons[this.activeSlot];
    if (!w || this.reloadTimer > 0) return;
    if (w.ammoInMag >= w.spec.magSize || w.reserveAmmo <= 0) return;
    this.reloadTimer = w.spec.reloadTime;
    this.healingTimer = 0;
    this.input.ads = false;
    gameAudio.playReload();
  }

  public useMedkit(): void {
    if (this.phase !== 'playing') return;
    if (this.medkits <= 0 || this.playerHp >= this.maxHp || this.healingTimer > 0) return;
    this.healingTimer = 2.2;
    this.reloadTimer = 0;
    this.input.ads = false;
    this.showBanner('APPLYING MEDKIT...', 2.2);
  }

  public deployGlooWall(): void {
    if (this.phase !== 'playing') return;
    if (this.glooWallsCount <= 0) {
      this.showBanner('NO GLOO WALLS LEFT', 1.2);
      return;
    }
    this.glooWallsCount--;
    const forwardX = Math.sin(this.playerYaw);
    const forwardZ = Math.cos(this.playerYaw);
    const gx = this.playerPos.x + forwardX * 3.1;
    const gz = this.playerPos.z + forwardZ * 3.1;
    const gy = groundHeightAt(gx, gz);

    const mesh = createGlooWallMesh(this.textures.glooHexMap);
    mesh.position.set(gx, gy, gz);
    mesh.rotation.y = this.playerYaw;
    mesh.scale.set(1, 0.05, 1);
    this.dynamicGroup.add(mesh);

    this.glooWalls.push({
      id: this.nextEntityId++,
      mesh,
      position: new THREE.Vector3(gx, gy, gz),
      yaw: this.playerYaw,
      hp: 360,
      maxHp: 360,
      spawnProgress: 0,
    });

    gameAudio.playGlooDeploy();
    this.emitHud();
  }

  public interactNearbyLoot(): void {
    if (this.phase !== 'playing' || !this.nearbyLoot) return;
    this.collectLoot(this.nearbyLoot, true);
  }

  private collectLoot(loot: LootEntity, manualSwap: boolean): void {
    if (loot.collected) return;

    if (loot.type === 'weapon' && loot.weaponId) {
      const spec = WEAPONS[loot.weaponId];
      // Check if we already carry this weapon -> add reserve ammo
      for (let i = 0; i < 3; i++) {
        const slotW = this.weapons[i];
        if (slotW && slotW.spec.id === loot.weaponId) {
          slotW.reserveAmmo += spec.magSize * 2;
          loot.collected = true;
          this.dynamicGroup.remove(loot.mesh);
          gameAudio.playPickup();
          return;
        }
      }

      // Fill empty primary slot 0 or 1
      let targetSlot: 0 | 1 | null = null;
      if (!this.weapons[0]) targetSlot = 0;
      else if (!this.weapons[1]) targetSlot = 1;
      else if (manualSwap) {
        targetSlot = this.activeSlot === 1 ? 1 : 0;
      }

      if (targetSlot === null) return;

      // Drop old weapon if replacing manually
      if (this.weapons[targetSlot]) {
        const old = this.weapons[targetSlot]!;
        this.spawnLootItem(
          this.playerPos.x + (Math.random() - 0.5) * 1.4,
          this.playerPos.z + (Math.random() - 0.5) * 1.4,
          'weapon',
          old.spec.id
        );
      }

      this.weapons[targetSlot] = {
        spec,
        ammoInMag: spec.magSize,
        reserveAmmo: spec.magSize * 2,
      };
      this.activeSlot = targetSlot;
      this.attachEquippedWeaponMesh();
      loot.collected = true;
      this.dynamicGroup.remove(loot.mesh);
      gameAudio.playPickup();
      this.showBanner(`EQUIPPED ${spec.name.toUpperCase()}`, 1.4);
    } else if (loot.type === 'medkit') {
      if (this.medkits >= 5) return;
      this.medkits++;
      loot.collected = true;
      this.dynamicGroup.remove(loot.mesh);
      gameAudio.playPickup();
    } else if (loot.type === 'gloowall') {
      if (this.glooWallsCount >= 6) return;
      this.glooWallsCount = Math.min(6, this.glooWallsCount + loot.amount);
      loot.collected = true;
      this.dynamicGroup.remove(loot.mesh);
      gameAudio.playPickup();
    } else if (loot.type === 'armor') {
      if (this.playerArmor >= this.maxArmor) return;
      this.playerArmor = Math.min(this.maxArmor, this.playerArmor + loot.amount);
      loot.collected = true;
      this.dynamicGroup.remove(loot.mesh);
      gameAudio.playPickup();
    } else if (loot.type === 'ammo') {
      const active =
        (this.activeSlot !== 3 ? this.weapons[this.activeSlot] : null) ||
        this.weapons[0] ||
        this.weapons[1] ||
        this.weapons[2];
      if (active) {
        active.reserveAmmo += active.spec.magSize * 2;
      }
      loot.collected = true;
      this.dynamicGroup.remove(loot.mesh);
      gameAudio.playPickup();
    }
  }

  private showBanner(msg: string, duration = 2.0): void {
    this.bannerMessage = msg;
    this.bannerTimer = duration;
  }

  private addKillFeed(killer: string, victim: string, weapon: string, headshot: boolean, isPlayerInvolved: boolean): void {
    this.killFeed.unshift({
      id: this.nextEntityId++,
      killer,
      victim,
      weapon,
      headshot,
      isPlayerInvolved,
      timestamp: this.survivalTime,
    });
    if (this.killFeed.length > 5) this.killFeed.pop();
  }

  private addDamageNumber(worldPos: THREE.Vector3, amount: number, headshot: boolean): void {
    _proj.copy(worldPos).project(this.camera);
    if (_proj.z > 1) return;
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    const screenX = ((_proj.x + 1) / 2) * w + (Math.random() - 0.5) * 18;
    const screenY = ((-_proj.y + 1) / 2) * h - 12;

    this.damageNumbers.push({
      id: this.nextEntityId++,
      screenX,
      screenY,
      amount: Math.round(amount),
      headshot,
      createdAt: performance.now(),
    });
    if (this.damageNumbers.length > 10) this.damageNumbers.shift();
  }

  private spawnTracer(start: THREE.Vector3, end: THREE.Vector3, isPlayer: boolean): void {
    const dist = start.distanceTo(end);
    if (dist < 0.5) return;
    const mesh = new THREE.Mesh(this.tracerGeo, isPlayer ? this.tracerMatPlayer : this.tracerMatBot);
    const mid = _v4.addVectors(start, end).multiplyScalar(0.5);
    mesh.position.copy(mid);
    mesh.scale.set(1, 1, Math.min(dist, 9));
    mesh.lookAt(end);
    this.dynamicGroup.add(mesh);
    this.tracers.push({
      mesh,
      start: start.clone(),
      end: end.clone(),
      life: 0.08,
      maxLife: 0.08,
    });
  }

  private spawnSparks(pos: THREE.Vector3, isBlood: boolean, count = 4): void {
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(this.sparkGeo, isBlood ? this.bloodMat : this.sparkMat);
      mesh.position.copy(pos);
      this.dynamicGroup.add(mesh);
      this.sparks.push({
        mesh,
        vel: new THREE.Vector3(
          (Math.random() - 0.5) * 6,
          1.5 + Math.random() * 4,
          (Math.random() - 0.5) * 6
        ),
        life: 0.24 + Math.random() * 0.14,
      });
    }
  }

  private raycastSegmentObstacles(
    origin: THREE.Vector3,
    dir: THREE.Vector3,
    maxDist: number
  ): { hitDist: number; hitGloo: GlooWallEntity | null } {
    let bestDist = maxDist;
    let hitGloo: GlooWallEntity | null = null;

    // 1. Check Building BoxColliders (Slab intersection)
    for (let i = 0; i < this.colliders.length; i++) {
      const b = this.colliders[i];
      const invX = dir.x !== 0 ? 1 / dir.x : 1e9;
      const invY = dir.y !== 0 ? 1 / dir.y : 1e9;
      const invZ = dir.z !== 0 ? 1 / dir.z : 1e9;

      const t1 = (b.minX - origin.x) * invX;
      const t2 = (b.maxX - origin.x) * invX;
      const t3 = (b.minY - origin.y) * invY;
      const t4 = (b.maxY - origin.y) * invY;
      const t5 = (b.minZ - origin.z) * invZ;
      const t6 = (b.maxZ - origin.z) * invZ;

      const tmin = Math.max(Math.min(t1, t2), Math.min(t3, t4), Math.min(t5, t6));
      const tmax = Math.min(Math.max(t1, t2), Math.max(t3, t4), Math.max(t5, t6));

      if (tmax >= 0 && tmin <= tmax && tmin > 0 && tmin < bestDist) {
        bestDist = tmin;
        hitGloo = null;
      }
    }

    // 2. Check Gloo Walls
    for (let i = 0; i < this.glooWalls.length; i++) {
      const g = this.glooWalls[i];
      if (g.hp <= 0) continue;
      // Approximate curved shield as an oriented slab centered at g.position
      const dx = g.position.x - origin.x;
      const dz = g.position.z - origin.z;
      const projAlong = dx * dir.x + dz * dir.z;
      if (projAlong <= 0 || projAlong >= bestDist) continue;

      const hx = origin.x + dir.x * projAlong;
      const hy = origin.y + dir.y * projAlong;
      const hz = origin.z + dir.z * projAlong;

      if (hy >= g.position.y && hy <= g.position.y + 2.45) {
        const distToWallCenterSq = (hx - g.position.x) ** 2 + (hz - g.position.z) ** 2;
        if (distToWallCenterSq < 2.25) {
          bestDist = projAlong;
          hitGloo = g;
        }
      }
    }

    // 3. Check Terrain intersection (step march)
    const steps = Math.min(28, Math.ceil(bestDist / 4));
    const stepLen = bestDist / Math.max(1, steps);
    for (let s = 1; s <= steps; s++) {
      const t = s * stepLen;
      const px = origin.x + dir.x * t;
      const py = origin.y + dir.y * t;
      const pz = origin.z + dir.z * t;
      if (py <= groundHeightAt(px, pz)) {
        if (t < bestDist) {
          bestDist = t;
          hitGloo = null;
        }
        break;
      }
    }

    return { hitDist: bestDist, hitGloo };
  }

  private raySphereIntersect(
    origin: THREE.Vector3,
    dir: THREE.Vector3,
    center: THREE.Vector3,
    radius: number
  ): number | null {
    const ocX = origin.x - center.x;
    const ocY = origin.y - center.y;
    const ocZ = origin.z - center.z;
    const b = ocX * dir.x + ocY * dir.y + ocZ * dir.z;
    const c = ocX * ocX + ocY * ocY + ocZ * ocZ - radius * radius;
    const disc = b * b - c;
    if (disc < 0) return null;
    const t = -b - Math.sqrt(disc);
    return t > 0 ? t : null;
  }

  private firePlayerPunch(): void {
    if (this.healingTimer > 0) return;
    this.fireCooldown = 0.34;
    this.punchTimer = 0.28;
    this.punchSide = this.punchSide === 1 ? -1 : 1;
    gameAudio.playPunchSwing();

    const forward = _v1.set(Math.sin(this.playerYaw), 0, Math.cos(this.playerYaw)).normalize();
    const reach = 2.75;
    let bestBot: BotEntity | null = null;
    let bestDist = reach;

    for (let i = 0; i < this.bots.length; i++) {
      const bot = this.bots[i];
      if (!bot.alive) continue;
      const dx = bot.position.x - this.playerPos.x;
      const dy = bot.position.y - this.playerPos.y;
      const dz = bot.position.z - this.playerPos.z;
      const dist = Math.hypot(dx, dz);
      if (dist > reach || Math.abs(dy) > 2.2) continue;
      const dot = dist > 0.01 ? (dx * forward.x + dz * forward.z) / dist : 1;
      if ((dot > 0.25 || dist < 1.35) && dist < bestDist) {
        bestDist = dist;
        bestBot = bot;
      }
    }

    if (bestBot) {
      const isHead = this.cameraPitch < -0.05 || (this.stance === 'stand' && Math.random() < 0.35);
      const dmg = isHead ? 115 : 54;
      const hitPos = bestBot.position.clone().add(new THREE.Vector3(0, isHead ? 1.6 : 1.15, 0));
      this.applyDamageToBot(bestBot, dmg, isHead, 'You', 'Fists', hitPos);
      this.hitMarkerType = isHead ? 'head' : 'body';
      this.hitMarkerTime = 0.22;
      gameAudio.playPunchHit(isHead);
      return;
    }

    // Check Gloo Walls in melee range
    for (let i = 0; i < this.glooWalls.length; i++) {
      const g = this.glooWalls[i];
      if (g.hp <= 0) continue;
      const dist = Math.hypot(g.position.x - this.playerPos.x, g.position.z - this.playerPos.z);
      if (dist < 2.8) {
        g.hp -= 95;
        this.spawnSparks(g.position.clone().add(new THREE.Vector3(0, 1.1, 0)), false, 5);
        gameAudio.playPunchHit(false);
        if (g.hp <= 0) {
          this.dynamicGroup.remove(g.mesh);
        }
        break;
      }
    }
  }

  private firePlayerWeapon(): void {
    if (this.activeSlot === 3) {
      this.firePlayerPunch();
      return;
    }
    const w = this.weapons[this.activeSlot];
    if (!w || this.reloadTimer > 0 || this.healingTimer > 0) return;

    if (w.ammoInMag <= 0) {
      this.triggerReload();
      return;
    }

    w.ammoInMag--;
    this.fireCooldown = 1 / w.spec.fireRate;
    this.shotsFired++;
    this.recoilOffset = Math.min(0.14, this.recoilOffset + w.spec.recoilPitch);
    this.cameraPitch = Math.max(-0.95, this.cameraPitch - w.spec.recoilPitch * 0.45);

    gameAudio.playGunshot(w.spec.id, 1.0);

    // Muzzle world position + Dynamic Muzzle Flash Lighting
    const muzzleWorld = _v1;
    this.playerModel.muzzlePoint.getWorldPosition(muzzleWorld);
    this.playerModel.muzzleFlash.visible = true;
    this.playerModel.muzzleFlash.rotation.z = Math.random() * Math.PI * 2;
    this.muzzleLight.position.copy(muzzleWorld);
    this.muzzleLight.intensity = 6.5;
    this.muzzleFlashTimer = 0.065;

    // Aim target point straight from camera center
    const camDir = _v2;
    this.camera.getWorldDirection(camDir);
    const camAimPoint = _v3.copy(this.camera.position).addScaledVector(camDir, w.spec.range);

    // Check obstacle along camera ray to get true crosshair target point
    const camEnv = this.raycastSegmentObstacles(this.camera.position, camDir, w.spec.range);
    let camHitDist = camEnv.hitDist;
    for (let i = 0; i < this.bots.length; i++) {
      const bot = this.bots[i];
      if (!bot.alive) continue;
      const bodyCenter = _v4.set(bot.position.x, bot.position.y + 1.05, bot.position.z);
      const tBody = this.raySphereIntersect(this.camera.position, camDir, bodyCenter, 0.72);
      if (tBody !== null && tBody < camHitDist) camHitDist = tBody;
    }
    camAimPoint.copy(this.camera.position).addScaledVector(camDir, camHitDist);

    const baseSpread = this.input.ads ? w.spec.spreadAds : w.spec.spreadHip;
    const isMovingNow =
      this.input.forward ||
      this.input.backward ||
      this.input.left ||
      this.input.right ||
      this.joystickVec.lengthSq() > 0.04;
    const moveFactor = isMovingNow ? 1.35 : 1.0;
    const totalSpread = baseSpread * moveFactor;

    let anyHit = false;
    let anyHeadshot = false;

    for (let p = 0; p < w.spec.pellets; p++) {
      const shotDir = new THREE.Vector3().subVectors(camAimPoint, muzzleWorld).normalize();
      shotDir.x += (Math.random() - 0.5) * totalSpread * 2;
      shotDir.y += (Math.random() - 0.5) * totalSpread * 2;
      shotDir.z += (Math.random() - 0.5) * totalSpread * 2;
      shotDir.normalize();

      const envHit = this.raycastSegmentObstacles(muzzleWorld, shotDir, w.spec.range);
      let bestDist = envHit.hitDist;
      let hitBot: BotEntity | null = null;
      let isHeadshot = false;

      for (let i = 0; i < this.bots.length; i++) {
        const bot = this.bots[i];
        if (!bot.alive) continue;

        // Head hitbox
        const headCenter = _v4.set(bot.position.x, bot.position.y + 1.62, bot.position.z);
        const tHead = this.raySphereIntersect(muzzleWorld, shotDir, headCenter, 0.28);
        if (tHead !== null && tHead < bestDist) {
          bestDist = tHead;
          hitBot = bot;
          isHeadshot = true;
        }

        // Torso/Leg hitbox
        const chestCenter = _v4.set(bot.position.x, bot.position.y + 0.95, bot.position.z);
        const tBody = this.raySphereIntersect(muzzleWorld, shotDir, chestCenter, 0.54);
        if (tBody !== null && tBody < bestDist) {
          bestDist = tBody;
          hitBot = bot;
          isHeadshot = false;
        }
      }

      const endPoint = muzzleWorld.clone().addScaledVector(shotDir, bestDist);
      this.spawnTracer(muzzleWorld, endPoint, true);

      if (hitBot) {
        anyHit = true;
        if (isHeadshot) anyHeadshot = true;

        // Distance falloff for shotguns
        let dmg = w.spec.damage * (isHeadshot ? w.spec.headshotMult : 1);
        if (w.spec.id === 'm1887' && bestDist > 16) {
          dmg *= Math.max(0.35, 1 - (bestDist - 16) / 22);
        }

        this.applyDamageToBot(hitBot, dmg, isHeadshot, 'You', w.spec.name, endPoint);
      } else {
        if (envHit.hitGloo) {
          envHit.hitGloo.hp -= w.spec.damage;
          if (envHit.hitGloo.hp <= 0) {
            this.dynamicGroup.remove(envHit.hitGloo.mesh);
          }
        }
        if (bestDist < w.spec.range - 0.5) {
          this.spawnSparks(endPoint, false, 3);
        }
      }
    }

    if (anyHit) {
      this.shotsHit++;
      this.hitMarkerType = anyHeadshot ? 'head' : 'body';
      this.hitMarkerTime = 0.22;
      gameAudio.playHitmarker(anyHeadshot);
    }

    if (w.ammoInMag === 0 && w.reserveAmmo > 0) {
      this.triggerReload();
    }
    if (!w.spec.auto) {
      this.input.firing = false;
    }
  }

  private applyDamageToBot(
    bot: BotEntity,
    rawDmg: number,
    headshot: boolean,
    killerName: string,
    weaponName: string,
    hitPos: THREE.Vector3
  ): void {
    if (!bot.alive) return;

    let dmg = rawDmg;
    if (!headshot && bot.armor > 0) {
      const absorbed = Math.min(bot.armor, dmg * 0.35);
      bot.armor -= absorbed;
      dmg -= absorbed;
    }

    bot.hp -= dmg;
    bot.hitFlash = 0.14;
    this.spawnSparks(hitPos, true, headshot ? 6 : 3);

    if (killerName === 'You') {
      this.damageDealt += Math.round(dmg);
      this.addDamageNumber(hitPos, dmg, headshot);
    }

    // Bot panic gloo wall if damaged and carrying one
    if (bot.alive && bot.hp < 75 && bot.hasGloo) {
      bot.hasGloo = false;
      const gx = bot.position.x + Math.sin(bot.yaw) * 2.5;
      const gz = bot.position.z + Math.cos(bot.yaw) * 2.5;
      const gy = groundHeightAt(gx, gz);
      const mesh = createGlooWallMesh(this.textures.glooHexMap);
      mesh.position.set(gx, gy, gz);
      mesh.rotation.y = bot.yaw;
      this.dynamicGroup.add(mesh);
      this.glooWalls.push({
        id: this.nextEntityId++,
        mesh,
        position: new THREE.Vector3(gx, gy, gz),
        yaw: bot.yaw,
        hp: 300,
        maxHp: 300,
        spawnProgress: 0,
      });
    }

    if (bot.hp <= 0) {
      bot.alive = false;
      bot.hp = 0;
      this.dynamicGroup.remove(bot.model.root);
      bot.model.materialsToDispose.forEach((m) => m.dispose());

      // Drop loot crate!
      this.spawnLootItem(bot.position.x, bot.position.z, 'weapon', bot.weaponId);
      this.spawnLootItem(bot.position.x + 1.1, bot.position.z + 0.6, 'medkit');
      if (Math.random() > 0.4) {
        this.spawnLootItem(bot.position.x - 1.0, bot.position.z - 0.5, 'gloowall');
      }

      if (killerName === 'You') {
        this.kills++;
        if (headshot) this.headshots++;
        gameAudio.playKillConfirm();
        this.showBanner(
          headshot ? `HEADSHOT ELIMINATION · ${bot.name}` : `ELIMINATED ${bot.name}`,
          2.2
        );
      }

      this.addKillFeed(
        killerName,
        bot.name,
        weaponName,
        headshot,
        killerName === 'You'
      );

      this.checkVictoryCondition();
    }
  }

  private damagePlayer(rawDmg: number, attackerName: string, weaponName: string, attackerPos?: THREE.Vector3): void {
    if (this.phase !== 'playing') return;

    let dmg = rawDmg;
    if (this.playerArmor > 0) {
      const absorbed = Math.min(this.playerArmor, dmg * 0.4);
      this.playerArmor -= absorbed;
      dmg -= absorbed;
    }

    this.playerHp = Math.max(0, this.playerHp - dmg);
    this.damageFlash = 1.0;
    if (attackerPos) {
      const dx = attackerPos.x - this.playerPos.x;
      const dz = attackerPos.z - this.playerPos.z;
      this.damageDirectionAngle = Math.atan2(dx, dz) - this.playerYaw;
    } else {
      this.damageDirectionAngle = null;
    }
    gameAudio.playDamageTaken();

    if (this.playerHp <= 0) {
      const aliveBots = this.bots.filter((b) => b.alive).length;
      this.placement = aliveBots + 1;
      this.isBooyah = false;
      this.eliminatedBy = attackerName;
      this.phase = 'ended';
      this.addKillFeed(attackerName, 'You', weaponName, false, true);
      this.exitPointerLock();
      this.emitHud();
    }
  }

  private checkVictoryCondition(): void {
    if (this.phase !== 'playing') return;
    const aliveBots = this.bots.filter((b) => b.alive).length;
    if (aliveBots === 0) {
      this.placement = 1;
      this.isBooyah = true;
      this.phase = 'ended';
      gameAudio.playBooyah();
      this.exitPointerLock();
      this.emitHud();
    }
  }

  private resolveHorizontalCollisions(pos: THREE.Vector3, radius: number): void {
    // Clamp inside island boundary
    const distSq = pos.x * pos.x + pos.z * pos.z;
    const maxR = ISLAND_PLAYABLE_RADIUS - 2;
    if (distSq > maxR * maxR) {
      const dist = Math.sqrt(distSq);
      pos.x = (pos.x / dist) * maxR;
      pos.z = (pos.z / dist) * maxR;
    }

    // Trees
    for (let i = 0; i < this.treeColliders.length; i++) {
      const t = this.treeColliders[i];
      const dx = pos.x - t.x;
      const dz = pos.z - t.z;
      const minD = radius + t.radius;
      const dSq = dx * dx + dz * dz;
      if (dSq < minD * minD && dSq > 0.0001) {
        const d = Math.sqrt(dSq);
        pos.x = t.x + (dx / d) * minD;
        pos.z = t.z + (dz / d) * minD;
      }
    }

    // Rocks
    for (let i = 0; i < this.rockColliders.length; i++) {
      const r = this.rockColliders[i];
      const dx = pos.x - r.x;
      const dz = pos.z - r.z;
      const minD = radius + r.radius;
      const dSq = dx * dx + dz * dz;
      if (dSq < minD * minD && dSq > 0.0001) {
        const d = Math.sqrt(dSq);
        pos.x = r.x + (dx / d) * minD;
        pos.z = r.z + (dz / d) * minD;
      }
    }

    // Compound Boxes
    for (let i = 0; i < this.colliders.length; i++) {
      const b = this.colliders[i];
      if (pos.y > b.maxY - 0.2 || pos.y + 1.7 < b.minY) continue;
      const cx = THREE.MathUtils.clamp(pos.x, b.minX, b.maxX);
      const cz = THREE.MathUtils.clamp(pos.z, b.minZ, b.maxZ);
      const dx = pos.x - cx;
      const dz = pos.z - cz;
      const dSq = dx * dx + dz * dz;
      if (dSq < radius * radius) {
        if (dSq > 0.00001) {
          const d = Math.sqrt(dSq);
          pos.x = cx + (dx / d) * radius;
          pos.z = cz + (dz / d) * radius;
        } else {
          // Push out shortest axis
          const dl = Math.abs(pos.x - b.minX);
          const dr = Math.abs(b.maxX - pos.x);
          const dt = Math.abs(pos.z - b.minZ);
          const db = Math.abs(b.maxZ - pos.z);
          const m = Math.min(dl, dr, dt, db);
          if (m === dl) pos.x = b.minX - radius;
          else if (m === dr) pos.x = b.maxX + radius;
          else if (m === dt) pos.z = b.minZ - radius;
          else pos.z = b.maxZ + radius;
        }
      }
    }

    // Gloo Walls pushout
    for (let i = 0; i < this.glooWalls.length; i++) {
      const g = this.glooWalls[i];
      if (g.hp <= 0) continue;
      const dx = pos.x - g.position.x;
      const dz = pos.z - g.position.z;
      const dSq = dx * dx + dz * dz;
      if (dSq < 1.35 * 1.35 && dSq > 0.0001) {
        const d = Math.sqrt(dSq);
        pos.x = g.position.x + (dx / d) * 1.35;
        pos.z = g.position.z + (dz / d) * 1.35;
      }
    }
  }

  private updatePlayer(dt: number): void {
    if (this.phase === 'parachute') {
      const steerSpeed = this.chuteOpen ? 8.5 : 6.5;
      const sinY = Math.sin(this.playerYaw);
      const cosY = Math.cos(this.playerYaw);
      let mx = 0;
      let mz = 0;
      if (this.input.forward) {
        mx += sinY;
        mz += cosY;
      }
      if (this.input.backward) {
        mx -= sinY;
        mz -= cosY;
      }
      if (this.input.left) {
        mx += cosY;
        mz -= sinY;
      }
      if (this.input.right) {
        mx -= cosY;
        mz += sinY;
      }
      if (this.joystickVec.lengthSq() > 0.01) {
        mx += sinY * this.joystickVec.y - cosY * this.joystickVec.x;
        mz += cosY * this.joystickVec.y + sinY * this.joystickVec.x;
      }
      const len = Math.hypot(mx, mz);
      if (len > 1) {
        mx /= len;
        mz /= len;
      }
      this.playerPos.x += mx * steerSpeed * dt;
      this.playerPos.z += mz * steerSpeed * dt;

      const targetSink = this.chuteOpen ? -3.8 : -15.5;
      this.playerVel.y = THREE.MathUtils.damp(this.playerVel.y, targetSink, 4.2, dt);
      this.playerPos.y += this.playerVel.y * dt;

      const groundY = groundHeightAt(this.playerPos.x, this.playerPos.z);
      if (this.playerPos.y <= groundY + 0.05) {
        this.playerPos.y = groundY;
        this.playerVel.y = 0;
        this.isGrounded = true;
        this.chuteOpen = false;
        this.playerModel.parachute.visible = false;
        this.phase = 'playing';
        this.showBanner('LANDED — MOVE [WASD / JOYSTICK] · CROUCH [C] · SHOOT [LMB]', 3.0);
        gameAudio.playPickup();
      }

      this.playerModel.root.position.copy(this.playerPos);
      this.playerModel.root.rotation.y = this.playerYaw;
      this.playerModel.contactShadow.visible = false;
      this.playerModel.leftLeg.rotation.x = 0.25;
      this.playerModel.rightLeg.rotation.x = -0.2;
      this.playerModel.leftShin.rotation.x = 0.35;
      this.playerModel.rightShin.rotation.x = 0.35;
      if (this.glbCharacterRoot) {
        this.glbCharacterRoot.scale.set(1, 1, 1);
        this.glbCharacterRoot.position.y = 0;
        this.glbCharacterRoot.rotation.set(0.12, 0, 0);
        if (this.glbMixer) {
          this.playGlbAnimation('jump');
          this.glbMixer.update(dt);
        }
      }
      return;
    }

    if (this.phase !== 'playing') return;

    this.survivalTime += dt;
    this.fireCooldown = Math.max(0, this.fireCooldown - dt);
    this.punchTimer = Math.max(0, this.punchTimer - dt);
    this.recoilOffset = THREE.MathUtils.damp(this.recoilOffset, 0, 14, dt);
    this.hitMarkerTime = Math.max(0, this.hitMarkerTime - dt);
    this.damageFlash = Math.max(0, this.damageFlash - dt * 2.4);

    if (this.bannerTimer > 0) {
      this.bannerTimer -= dt;
      if (this.bannerTimer <= 0) this.bannerMessage = null;
    }

    // Reload progress
    if (this.reloadTimer > 0) {
      this.reloadTimer -= dt;
      if (this.reloadTimer <= 0) {
        this.reloadTimer = 0;
        const w = this.activeSlot !== 3 ? this.weapons[this.activeSlot] : null;
        if (w) {
          const needed = w.spec.magSize - w.ammoInMag;
          const transfer = Math.min(needed, w.reserveAmmo);
          w.ammoInMag += transfer;
          w.reserveAmmo -= transfer;
        }
      }
    }

    // Healing progress
    if (this.healingTimer > 0) {
      this.healingTimer -= dt;
      if (this.healingTimer <= 0) {
        this.healingTimer = 0;
        if (this.medkits > 0) {
          this.medkits--;
          this.playerHp = Math.min(this.maxHp, this.playerHp + 75);
          gameAudio.playPickup();
          this.showBanner('+75 HP RESTORED', 1.4);
        }
      }
    }

    // Horizontal Movement (WASD + Analog Virtual Joystick + Auto-Run Lock)
    const sinY = Math.sin(this.playerYaw);
    const cosY = Math.cos(this.playerYaw);
    let moveX = 0;
    let moveZ = 0;
    if (this.input.forward) {
      moveX += sinY;
      moveZ += cosY;
    }
    if (this.input.backward) {
      moveX -= sinY;
      moveZ -= cosY;
      if (this.sprintToggled) this.sprintToggled = false;
    }
    if (this.input.left) {
      moveX += cosY;
      moveZ -= sinY;
    }
    if (this.input.right) {
      moveX -= cosY;
      moveZ += sinY;
    }
    const joyMag = this.joystickVec.length();
    if (joyMag > 0.08) {
      moveX += sinY * this.joystickVec.y - cosY * this.joystickVec.x;
      moveZ += cosY * this.joystickVec.y + sinY * this.joystickVec.x;
    } else if (this.sprintToggled && !this.input.forward && !this.input.backward && !this.input.ads && this.stance === 'stand') {
      // Free Fire Auto-Run Lock: Run button propels character forward automatically
      moveX += sinY;
      moveZ += cosY;
    }
    const moveLen = Math.hypot(moveX, moveZ);
    if (moveLen > 1) {
      moveX /= moveLen;
      moveZ /= moveLen;
    }

    const sprintingNow =
      (this.input.sprint || this.sprintToggled || joyMag > 0.82) &&
      moveLen > 0.1 &&
      !this.input.ads &&
      this.stance === 'stand';

    let speed = 4.6;
    if (this.stance === 'prone') {
      speed = 1.6;
    } else if (this.stance === 'crouch') {
      speed = 2.8;
    } else if (sprintingNow) {
      speed = 6.8;
    } else if (this.input.ads) {
      speed = 2.7;
    }
    if (this.healingTimer > 0) speed *= 0.55;

    this.playerPos.x += moveX * speed * dt;
    this.playerPos.z += moveZ * speed * dt;

    this.resolveHorizontalCollisions(this.playerPos, 0.48);

    // Jump & Gravity
    if (this.input.jump && this.isGrounded) {
      if (this.stance !== 'stand') {
        this.stance = 'stand';
        this.input.crouch = false;
      }
      this.playerVel.y = 7.6;
      this.isGrounded = false;
      this.input.jump = false;
    }
    this.playerVel.y -= 16.5 * dt;
    this.playerPos.y += this.playerVel.y * dt;

    const floorY = groundHeightAt(this.playerPos.x, this.playerPos.z);
    if (this.playerPos.y <= floorY) {
      this.playerPos.y = floorY;
      this.playerVel.y = 0;
      this.isGrounded = true;
    }

    // Animate Player Character Rig (Idle Breathing / Run / Sprint / Jump / Crouch / Prone / Gun Recoil vs Fists)
    this.playerModel.root.position.copy(this.playerPos);
    this.playerModel.root.rotation.y = this.playerYaw;
    this.playerModel.contactShadow.visible = true;
    this.playerModel.contactShadow.position.y = Math.max(0.03, floorY - this.playerPos.y + 0.03);

    const isMoving = moveLen > 0.1;
    if (isMoving && this.isGrounded) {
      const rate = this.stance === 'prone' ? 5.2 : sprintingNow ? 9.2 : this.stance === 'crouch' ? 5.0 : 6.4;
      this.animPhase += dt * rate;
    }
    const swing = isMoving && this.isGrounded ? Math.sin(this.animPhase) : 0;
    const stepBounce = isMoving && this.isGrounded && this.stance === 'stand' ? Math.abs(Math.cos(this.animPhase)) * 0.035 : 0;
    const idleBreath = Math.sin(this.survivalTime * 2.4) * 0.012;

    let targetHipY = 0.94 + stepBounce;
    let targetHipRx = 0;
    let targetTorsoRx = sprintingNow ? 0.18 : 0;
    let targetTorsoRy = 0;
    let targetHeadRx = -this.cameraPitch * 0.4;

    if (!this.isGrounded) {
      // Airborne Jump Knee-Tuck Pose
      targetHipY = 0.96;
      targetTorsoRx = 0.1;
      this.playerModel.leftLeg.rotation.x = THREE.MathUtils.damp(this.playerModel.leftLeg.rotation.x, -0.58, 16, dt);
      this.playerModel.rightLeg.rotation.x = THREE.MathUtils.damp(this.playerModel.rightLeg.rotation.x, 0.28, 16, dt);
      this.playerModel.leftShin.rotation.x = THREE.MathUtils.damp(this.playerModel.leftShin.rotation.x, 1.05, 16, dt);
      this.playerModel.rightShin.rotation.x = THREE.MathUtils.damp(this.playerModel.rightShin.rotation.x, 0.55, 16, dt);
    } else if (this.stance === 'prone') {
      targetHipY = 0.22;
      targetHipRx = Math.PI * 0.45;
      targetTorsoRx = -0.18;
      targetHeadRx = -0.82 - this.cameraPitch * 0.28;
      this.playerModel.leftLeg.rotation.x = THREE.MathUtils.damp(this.playerModel.leftLeg.rotation.x, 0.06 + swing * 0.18, 12, dt);
      this.playerModel.rightLeg.rotation.x = THREE.MathUtils.damp(this.playerModel.rightLeg.rotation.x, 0.06 - swing * 0.18, 12, dt);
      this.playerModel.leftShin.rotation.x = THREE.MathUtils.damp(this.playerModel.leftShin.rotation.x, 0.16, 12, dt);
      this.playerModel.rightShin.rotation.x = THREE.MathUtils.damp(this.playerModel.rightShin.rotation.x, 0.16, 12, dt);
    } else if (this.stance === 'crouch') {
      targetHipY = 0.56 + (isMoving ? Math.abs(Math.cos(this.animPhase)) * 0.02 : 0);
      targetHipRx = 0.08;
      targetTorsoRx = 0.16;
      this.playerModel.leftLeg.rotation.x = THREE.MathUtils.damp(this.playerModel.leftLeg.rotation.x, -0.92 + swing * 0.42, 14, dt);
      this.playerModel.rightLeg.rotation.x = THREE.MathUtils.damp(this.playerModel.rightLeg.rotation.x, -0.92 - swing * 0.42, 14, dt);
      this.playerModel.leftShin.rotation.x = THREE.MathUtils.damp(this.playerModel.leftShin.rotation.x, 1.54 - swing * 0.22, 14, dt);
      this.playerModel.rightShin.rotation.x = THREE.MathUtils.damp(this.playerModel.rightShin.rotation.x, 1.54 + swing * 0.22, 14, dt);
    } else {
      const stride = sprintingNow ? 0.84 : 0.62;
      this.playerModel.leftLeg.rotation.x = THREE.MathUtils.damp(this.playerModel.leftLeg.rotation.x, swing * stride, 14, dt);
      this.playerModel.rightLeg.rotation.x = THREE.MathUtils.damp(this.playerModel.rightLeg.rotation.x, -swing * stride, 14, dt);
      this.playerModel.leftShin.rotation.x = THREE.MathUtils.damp(
        this.playerModel.leftShin.rotation.x,
        isMoving ? Math.max(0.08, -swing * 0.78) : 0.04,
        14,
        dt
      );
      this.playerModel.rightShin.rotation.x = THREE.MathUtils.damp(
        this.playerModel.rightShin.rotation.x,
        isMoving ? Math.max(0.08, swing * 0.78) : 0.04,
        14,
        dt
      );
    }

    this.playerModel.hips.position.y = THREE.MathUtils.damp(this.playerModel.hips.position.y, targetHipY, 14, dt);
    this.playerModel.hips.rotation.x = THREE.MathUtils.damp(this.playerModel.hips.rotation.x, targetHipRx, 14, dt);
    this.playerModel.torso.position.y = 0.08 + idleBreath;
    this.playerModel.head.rotation.x = THREE.MathUtils.damp(this.playerModel.head.rotation.x, targetHeadRx, 14, dt);

    // Arms & Combat Pose (Gun Aim + Recoil Kick vs Bare-Hand Punching Guard)
    if (this.activeSlot === 3) {
      let rArmX = -1.05 + swing * (sprintingNow ? 0.42 : 0.14);
      let rArmZ = 0.14;
      let rForeX = -1.35;
      let lArmX = -0.95 - swing * (sprintingNow ? 0.42 : 0.14);
      let lArmZ = -0.14;
      let lForeX = -1.35;

      if (this.stance === 'prone') {
        rArmX = -1.25;
        lArmX = -1.25;
        rForeX = -0.75;
        lForeX = -0.75;
      }

      if (this.punchTimer > 0) {
        const p = 1 - this.punchTimer / 0.28;
        const thrust = Math.sin(p * Math.PI);
        targetTorsoRy = this.punchSide * thrust * 0.48;
        targetTorsoRx += thrust * 0.16;
        if (this.punchSide > 0) {
          rArmX = THREE.MathUtils.lerp(rArmX, -1.62 - this.cameraPitch * 0.4, thrust);
          rForeX = THREE.MathUtils.lerp(rForeX, -0.08, thrust);
          rArmZ = THREE.MathUtils.lerp(rArmZ, 0.22, thrust);
        } else {
          lArmX = THREE.MathUtils.lerp(lArmX, -1.62 - this.cameraPitch * 0.4, thrust);
          lForeX = THREE.MathUtils.lerp(lForeX, -0.08, thrust);
          lArmZ = THREE.MathUtils.lerp(lArmZ, -0.22, thrust);
        }
      }

      this.playerModel.rightArm.rotation.x = THREE.MathUtils.damp(this.playerModel.rightArm.rotation.x, rArmX, 20, dt);
      this.playerModel.rightArm.rotation.z = THREE.MathUtils.damp(this.playerModel.rightArm.rotation.z, rArmZ, 18, dt);
      this.playerModel.rightForearm.rotation.x = THREE.MathUtils.damp(this.playerModel.rightForearm.rotation.x, rForeX, 20, dt);
      this.playerModel.leftArm.rotation.x = THREE.MathUtils.damp(this.playerModel.leftArm.rotation.x, lArmX, 20, dt);
      this.playerModel.leftArm.rotation.z = THREE.MathUtils.damp(this.playerModel.leftArm.rotation.z, lArmZ, 18, dt);
      this.playerModel.leftForearm.rotation.x = THREE.MathUtils.damp(this.playerModel.leftForearm.rotation.x, lForeX, 20, dt);
    } else if (this.stance === 'prone') {
      const recoilPitch = this.recoilOffset * 1.4;
      this.playerModel.rightArm.rotation.x = THREE.MathUtils.damp(this.playerModel.rightArm.rotation.x, -1.35 - this.cameraPitch * 0.3 - recoilPitch, 16, dt);
      this.playerModel.rightArm.rotation.z = 0.08;
      this.playerModel.rightForearm.rotation.x = THREE.MathUtils.damp(this.playerModel.rightForearm.rotation.x, -0.82, 14, dt);
      this.playerModel.leftArm.rotation.x = THREE.MathUtils.damp(this.playerModel.leftArm.rotation.x, -1.3 - this.cameraPitch * 0.3 - recoilPitch * 0.7, 16, dt);
      this.playerModel.leftArm.rotation.z = -0.35;
      this.playerModel.leftForearm.rotation.x = THREE.MathUtils.damp(this.playerModel.leftForearm.rotation.x, -0.82, 14, dt);
    } else {
      const recoilKick = this.recoilOffset * 1.75;
      const runSway = isMoving && sprintingNow && !this.input.ads ? Math.sin(this.animPhase) * 0.08 : 0;
      const adsOffset = this.input.ads ? -0.06 : 0;
      this.playerModel.rightArm.rotation.x = THREE.MathUtils.damp(
        this.playerModel.rightArm.rotation.x,
        -Math.PI * 0.34 - this.cameraPitch * 0.45 - recoilKick + runSway + adsOffset,
        22,
        dt
      );
      this.playerModel.rightArm.rotation.z = 0.06;
      this.playerModel.rightForearm.rotation.x = -0.58 + recoilKick * 0.4;
      this.playerModel.leftArm.rotation.x = THREE.MathUtils.damp(
        this.playerModel.leftArm.rotation.x,
        -Math.PI * 0.32 - this.cameraPitch * 0.4 - recoilKick * 0.7 - runSway + adsOffset,
        22,
        dt
      );
      this.playerModel.leftArm.rotation.z = -0.34;
      this.playerModel.leftForearm.rotation.x = -0.55;
    }

    if (this.equippedWeaponMesh) {
      this.equippedWeaponMesh.position.z = -this.recoilOffset * 0.42;
      this.equippedWeaponMesh.rotation.x = -this.recoilOffset * 1.15;
    }

    this.playerModel.torso.rotation.x = THREE.MathUtils.damp(this.playerModel.torso.rotation.x, targetTorsoRx, 14, dt);
    this.playerModel.torso.rotation.y = THREE.MathUtils.damp(this.playerModel.torso.rotation.y, targetTorsoRy, 18, dt);

    if (this.glbCharacterRoot) {
      const glbTargetScaleY =
        this.stance === 'prone' ? 0.54 : this.stance === 'crouch' ? 0.74 : 1.0;
      const glbTargetRx =
        this.stance === 'prone'
          ? 0.45
          : this.stance === 'crouch'
          ? 0.14
          : sprintingNow
          ? 0.09
          : 0;
      const glbTargetY =
        !this.glbMixer && isMoving && this.isGrounded
          ? Math.abs(Math.sin(this.animPhase)) * (sprintingNow ? 0.05 : 0.03)
          : 0;

      this.glbCharacterRoot.scale.y = THREE.MathUtils.damp(this.glbCharacterRoot.scale.y, glbTargetScaleY, 14, dt);
      this.glbCharacterRoot.rotation.x = THREE.MathUtils.damp(this.glbCharacterRoot.rotation.x, glbTargetRx, 14, dt);
      this.glbCharacterRoot.position.y = THREE.MathUtils.damp(this.glbCharacterRoot.position.y, glbTargetY, 16, dt);

      if (this.glbMixer) {
        const animKey = !this.isGrounded
          ? 'jump'
          : this.stance === 'crouch' || this.stance === 'prone'
          ? 'crouch'
          : !isMoving
          ? 'idle'
          : sprintingNow
          ? 'run'
          : 'walk';
        this.playGlbAnimation(animKey);
        this.glbMixer.update(dt);
      }

      const mountY = this.stance === 'prone' ? 0.42 : this.stance === 'crouch' ? 0.85 : 1.24;
      this.playerModel.weaponMount.position.y = THREE.MathUtils.damp(this.playerModel.weaponMount.position.y, mountY, 14, dt);
      this.playerModel.weaponMount.rotation.x = THREE.MathUtils.damp(
        this.playerModel.weaponMount.rotation.x,
        -this.cameraPitch * 0.55 - this.recoilOffset * 1.1,
        20,
        dt
      );
    }

    // Firing / Punching check
    if (this.input.firing && this.fireCooldown <= 0) {
      this.firePlayerWeapon();
    }

    // Nearby loot & auto-pickup for essentials
    this.nearbyLoot = null;
    let bestLootDist = 2.6;
    for (let i = 0; i < this.loots.length; i++) {
      const l = this.loots[i];
      if (l.collected) continue;
      const d = l.position.distanceTo(this.playerPos);
      if (d < 1.85) {
        if (
          l.type === 'medkit' ||
          l.type === 'gloowall' ||
          l.type === 'armor' ||
          l.type === 'ammo' ||
          (l.type === 'weapon' && (!this.weapons[0] || !this.weapons[1]))
        ) {
          this.collectLoot(l, false);
          continue;
        }
      }
      if (d < bestLootDist) {
        bestLootDist = d;
        this.nearbyLoot = l;
      }
    }

    // Check if reticle currently hovers over an enemy for red crosshair feedback
    const camDir = _v2;
    this.camera.getWorldDirection(camDir);
    this.aimingAtEnemy = false;
    for (let i = 0; i < this.bots.length; i++) {
      const bot = this.bots[i];
      if (!bot.alive) continue;
      const c = _v4.set(bot.position.x, bot.position.y + 1.1, bot.position.z);
      if (this.raySphereIntersect(this.camera.position, camDir, c, 0.72) !== null) {
        this.aimingAtEnemy = true;
        break;
      }
    }
  }

  private updateBots(dt: number): void {
    if (this.phase !== 'playing' && this.phase !== 'parachute') return;

    for (let i = 0; i < this.bots.length; i++) {
      const bot = this.bots[i];
      if (!bot.alive) continue;

      if (bot.hitFlash > 0) {
        bot.hitFlash -= dt;
      }

      bot.fireCooldown -= dt;
      bot.strafeTimer -= dt;
      if (bot.strafeTimer <= 0) {
        bot.strafeDir = -bot.strafeDir;
        bot.strafeTimer = 1.1 + Math.random() * 1.6;
      }

      // Safe zone damage for bots too!
      const distFromZone = Math.hypot(
        bot.position.x - this.zoneCenter.x,
        bot.position.z - this.zoneCenter.y
      );
      const outside = distFromZone > this.zoneRadius;
      if (outside) {
        const cfg = ZONE_PHASES[Math.min(this.zonePhaseIdx, ZONE_PHASES.length - 1)];
        bot.hp -= cfg.dps * 0.7 * dt;
        if (bot.hp <= 0) {
          bot.alive = false;
          this.dynamicGroup.remove(bot.model.root);
          bot.model.materialsToDispose.forEach((m) => m.dispose());
          this.addKillFeed('Safe Zone', bot.name, 'Storm', false, false);
          this.checkVictoryCondition();
          continue;
        }
      }

      // Find nearest target (player or another bot) within 68m
      let targetPos: THREE.Vector3 | null = null;
      let targetBot: BotEntity | null = null;
      let targetIsPlayer = false;
      let bestDist = 68;

      if (this.phase === 'playing') {
        const dp = bot.position.distanceTo(this.playerPos);
        if (dp < bestDist) {
          bestDist = dp;
          targetPos = this.playerPos;
          targetIsPlayer = true;
        }
      }

      for (let j = 0; j < this.bots.length; j++) {
        if (i === j) continue;
        const other = this.bots[j];
        if (!other.alive) continue;
        const d = bot.position.distanceTo(other.position);
        if (d < bestDist) {
          bestDist = d;
          targetPos = other.position;
          targetBot = other;
          targetIsPlayer = false;
        }
      }

      let moveX = 0;
      let moveZ = 0;
      let moveSpeed = 3.4;

      if (outside) {
        // Priority: run toward safe zone center
        const zx = this.zoneCenter.x - bot.position.x;
        const zz = this.zoneCenter.y - bot.position.z;
        const zl = Math.hypot(zx, zz) || 1;
        moveX = zx / zl;
        moveZ = zz / zl;
        moveSpeed = 4.6;
        bot.yaw = Math.atan2(moveX, moveZ);
      } else if (targetPos) {
        const dx = targetPos.x - bot.position.x;
        const dz = targetPos.z - bot.position.z;
        const dist = Math.hypot(dx, dz) || 1;
        const desiredYaw = Math.atan2(dx, dz);
        bot.yaw = desiredYaw;

        if (dist > 26) {
          moveX = dx / dist;
          moveZ = dz / dist;
        } else {
          // Tactical strafing
          moveX = (dz / dist) * bot.strafeDir;
          moveZ = (-dx / dist) * bot.strafeDir;
          moveSpeed = 2.5;
        }

        // Fire if line of sight is unobstructed and cooldown ready
        if (bot.fireCooldown <= 0 && dist < 54) {
          const origin = _v1.set(bot.position.x, bot.position.y + 1.38, bot.position.z);
          const targetHeight = targetIsPlayer
            ? this.stance === 'prone'
              ? 0.35
              : this.stance === 'crouch'
              ? 0.72
              : 1.15
            : 1.15;
          const aimTarget = _v2.set(targetPos.x, targetPos.y + targetHeight, targetPos.z);
          const dir = _v3.subVectors(aimTarget, origin).normalize();

          const envHit = this.raycastSegmentObstacles(origin, dir, dist);
          if (envHit.hitDist >= dist - 0.8) {
            const spec = WEAPONS[bot.weaponId];
            bot.fireCooldown = Math.max(0.4, 1 / spec.fireRate) + Math.random() * 0.45;
            bot.lastFireTimestamp = this.survivalTime;

            // Bot accuracy spread (challenging but fair)
            const inaccuracy = targetIsPlayer ? 0.085 : 0.06;
            dir.x += (Math.random() - 0.5) * inaccuracy;
            dir.y += (Math.random() - 0.5) * inaccuracy * 0.6;
            dir.z += (Math.random() - 0.5) * inaccuracy;
            dir.normalize();

            const tracerEnd = origin.clone().addScaledVector(dir, Math.min(dist, envHit.hitDist));
            this.spawnTracer(origin, tracerEnd, false);

            if (dist < 42) {
              gameAudio.playGunshot(bot.weaponId, Math.max(0.12, 1 - dist / 45));
            }

            // Hit probability roll based on distance & lowered stance hitbox
            const hitCheck = _v4.set(targetPos.x, targetPos.y + targetHeight, targetPos.z);
            const hitRadius = targetIsPlayer && this.stance !== 'stand' ? 0.42 : 0.55;
            const hitT = this.raySphereIntersect(origin, dir, hitCheck, hitRadius);
            if (hitT !== null && hitT <= envHit.hitDist) {
              if (targetIsPlayer) {
                const scaledDmg = spec.damage * 0.4;
                this.damagePlayer(scaledDmg, bot.name, spec.name, bot.position);
              } else if (targetBot) {
                this.applyDamageToBot(targetBot, spec.damage * 0.46, false, bot.name, spec.name, tracerEnd);
              }
            } else if (envHit.hitGloo) {
              envHit.hitGloo.hp -= spec.damage * 0.8;
              if (envHit.hitGloo.hp <= 0) {
                this.dynamicGroup.remove(envHit.hitGloo.mesh);
              }
            }
          }
        }
      } else {
        // Patrol toward patrolTarget
        const dx = bot.patrolTarget.x - bot.position.x;
        const dz = bot.patrolTarget.z - bot.position.z;
        const d = Math.hypot(dx, dz);
        if (d < 4) {
          bot.patrolTarget.set(
            this.zoneCenter.x + (Math.random() - 0.5) * this.zoneRadius * 1.1,
            0,
            this.zoneCenter.y + (Math.random() - 0.5) * this.zoneRadius * 1.1
          );
        } else {
          moveX = dx / d;
          moveZ = dz / d;
          bot.yaw = Math.atan2(moveX, moveZ);
        }
      }

      bot.position.x += moveX * moveSpeed * dt;
      bot.position.z += moveZ * moveSpeed * dt;
      this.resolveHorizontalCollisions(bot.position, 0.45);
      bot.position.y = groundHeightAt(bot.position.x, bot.position.z);

      bot.model.root.position.copy(bot.position);
      bot.model.root.rotation.y = bot.yaw;

      // Animate bot legs, knees, forearms, two-handed aim, & muzzle flash
      bot.animPhase += dt * moveSpeed * 1.35;
      const swing = Math.sin(bot.animPhase) * 0.55;
      bot.model.leftLeg.rotation.x = swing;
      bot.model.rightLeg.rotation.x = -swing;
      bot.model.leftShin.rotation.x = Math.max(0.05, -swing * 0.72);
      bot.model.rightShin.rotation.x = Math.max(0.05, swing * 0.72);
      bot.model.rightArm.rotation.x = targetPos ? -Math.PI * 0.34 : -0.25;
      bot.model.rightArm.rotation.z = 0.06;
      bot.model.rightForearm.rotation.x = targetPos ? -0.58 : -0.38;
      bot.model.leftArm.rotation.x = targetPos ? -Math.PI * 0.3 : -0.2;
      bot.model.leftArm.rotation.z = targetPos ? -0.34 : -0.12;
      bot.model.leftForearm.rotation.x = targetPos ? -0.55 : -0.32;
      bot.model.muzzleFlash.visible = this.survivalTime - bot.lastFireTimestamp < 0.06;
    }
  }

  private updateZoneAndAirdrop(dt: number): void {
    if (this.phase !== 'playing' && this.phase !== 'parachute') return;

    // Airdrop trigger at 48s
    if (!this.airdropSpawned && this.survivalTime > 48) {
      this.airdropSpawned = true;
      const ax = this.nextZoneCenter.x + (Math.random() - 0.5) * 28;
      const az = this.nextZoneCenter.y + (Math.random() - 0.5) * 28;
      this.airdropPos.set(ax, groundHeightAt(ax, az) + 52, az);
      this.airdropMesh = createAirdropCrateMesh(this.textures.crateMap);
      this.airdropMesh.position.copy(this.airdropPos);
      this.dynamicGroup.add(this.airdropMesh);
      this.showBanner('AIRDROP INCOMING — CHECK RADAR!', 3.2);
    }

    if (this.airdropMesh && !this.airdropLanded) {
      const groundY = groundHeightAt(this.airdropPos.x, this.airdropPos.z);
      this.airdropPos.y -= 5.5 * dt;
      if (this.airdropPos.y <= groundY) {
        this.airdropPos.y = groundY;
        this.airdropLanded = true;
        // Spawn high-tier loot around crate
        this.spawnLootItem(this.airdropPos.x + 1.6, this.airdropPos.z, 'weapon', 'awm');
        this.spawnLootItem(this.airdropPos.x - 1.6, this.airdropPos.z, 'armor');
        this.spawnLootItem(this.airdropPos.x, this.airdropPos.z + 1.6, 'gloowall');
      }
      this.airdropMesh.position.copy(this.airdropPos);
    }

    // Safe Zone progression
    const cfg = ZONE_PHASES[Math.min(this.zonePhaseIdx, ZONE_PHASES.length - 1)];
    this.zoneTimer -= dt;

    if (!this.zoneShrinking) {
      if (this.zoneTimer <= 0) {
        this.zoneShrinking = true;
        this.zoneTimer = cfg.shrinkDuration;
        this.startZoneCenter.copy(this.zoneCenter);
        this.startZoneRadius = this.zoneRadius;
        this.showBanner('SAFE ZONE IS SHRINKING!', 2.5);
      }
    } else {
      const progress = THREE.MathUtils.clamp(1 - this.zoneTimer / cfg.shrinkDuration, 0, 1);
      this.zoneRadius = THREE.MathUtils.lerp(this.startZoneRadius, this.nextZoneRadius, progress);
      this.zoneCenter.lerpVectors(this.startZoneCenter, this.nextZoneCenter, progress);

      if (this.zoneTimer <= 0) {
        this.zoneShrinking = false;
        if (this.zonePhaseIdx < ZONE_PHASES.length - 1) {
          this.zonePhaseIdx++;
          const nextCfg = ZONE_PHASES[this.zonePhaseIdx];
          this.zoneTimer = nextCfg.waitDuration;
          this.nextZoneRadius = nextCfg.targetRadius;
          this.nextZoneCenter.set(
            this.zoneCenter.x + (Math.random() - 0.5) * 14,
            this.zoneCenter.y + (Math.random() - 0.5) * 14
          );
        } else {
          this.zoneTimer = 99;
        }
      }
    }

    this.zoneMesh.position.set(this.zoneCenter.x, 35, this.zoneCenter.y);
    this.zoneMesh.scale.set(this.zoneRadius, 1, this.zoneRadius);

    // Player outside-zone damage tick
    if (this.phase === 'playing') {
      const dist = Math.hypot(
        this.playerPos.x - this.zoneCenter.x,
        this.playerPos.z - this.zoneCenter.y
      );
      if (dist > this.zoneRadius) {
        this.zoneDamageTick += dt;
        if (this.zoneDamageTick >= 1.0) {
          this.zoneDamageTick -= 1.0;
          this.damagePlayer(cfg.dps, 'Safe Zone', 'Storm');
        }
      } else {
        this.zoneDamageTick = 0;
      }
    }
  }

  private updateEffects(dt: number, elapsed: number): void {
    // Gloo Wall rise animation
    for (let i = this.glooWalls.length - 1; i >= 0; i--) {
      const g = this.glooWalls[i];
      if (g.hp <= 0) {
        this.glooWalls.splice(i, 1);
        continue;
      }
      if (g.spawnProgress < 1) {
        g.spawnProgress = Math.min(1, g.spawnProgress + dt * 5.5);
        g.mesh.scale.y = THREE.MathUtils.smoothstep(g.spawnProgress, 0, 1);
      }
    }

    // Loot rotation bob
    for (let i = 0; i < this.loots.length; i++) {
      const l = this.loots[i];
      if (l.collected) continue;
      const spinner = l.mesh.getObjectByName('spin');
      if (spinner) {
        spinner.rotation.y += dt * 1.9;
        spinner.position.y = 0.55 + Math.sin(elapsed * 3.2 + l.id) * 0.1;
      }
    }

    // Bullet Tracers
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const t = this.tracers[i];
      t.life -= dt;
      if (t.life <= 0) {
        this.dynamicGroup.remove(t.mesh);
        this.tracers.splice(i, 1);
      }
    }

    // Sparks
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      s.life -= dt;
      s.vel.y -= 15 * dt;
      s.mesh.position.addScaledVector(s.vel, dt);
      s.mesh.scale.setScalar(Math.max(0.01, s.life * 3.2));
      if (s.life <= 0) {
        this.dynamicGroup.remove(s.mesh);
        this.sparks.splice(i, 1);
      }
    }

    // Dynamic Muzzle Flash Light decay
    if (this.muzzleFlashTimer > 0) {
      this.muzzleFlashTimer -= dt;
      this.muzzleLight.intensity = Math.max(0, (this.muzzleFlashTimer / 0.065) * 6.5);
      if (this.muzzleFlashTimer <= 0) {
        this.muzzleLight.intensity = 0;
        this.playerModel.muzzleFlash.visible = false;
      }
    }

    // Gentle ocean wave shimmer
    this.waterMesh.position.y = -0.35 + Math.sin(elapsed * 1.1) * 0.08;
  }

  private updateCamera(dt: number, elapsed: number): void {
    if (this.phase === 'lobby') {
      this.lobbyOrbitAngle += dt * 0.2;
      const dist = 3.55;
      const cx = this.playerPos.x + Math.sin(this.lobbyOrbitAngle) * dist;
      const cz = this.playerPos.z + Math.cos(this.lobbyOrbitAngle) * dist;
      const cy = this.playerPos.y + 1.48;
      this.camera.position.set(cx, cy, cz);
      this.camera.lookAt(this.playerPos.x - 0.35, this.playerPos.y + 1.15, this.playerPos.z);

      // Keep crisp studio shadow rig focused on lobby character
      this.sunLight.position.set(this.playerPos.x + 8, this.playerPos.y + 14, this.playerPos.z + 9);
      this.sunLight.target.position.copy(this.playerPos);

      // Hero tactical idle pose
      this.playerModel.torso.position.y = 0.08 + Math.sin(elapsed * 2.2) * 0.012;
      this.playerModel.rightArm.rotation.x = -0.52;
      this.playerModel.rightArm.rotation.z = 0.08;
      this.playerModel.rightForearm.rotation.x = -0.55;
      this.playerModel.leftArm.rotation.x = -0.35;
      this.playerModel.leftArm.rotation.z = -0.32;
      this.playerModel.leftForearm.rotation.x = -0.52;
      this.playerModel.leftLeg.rotation.x = -0.05;
      this.playerModel.rightLeg.rotation.x = 0.06;
      if (this.glbCharacterRoot) {
        this.glbCharacterRoot.scale.set(1, 1, 1);
        this.glbCharacterRoot.rotation.set(0, 0, 0);
        this.glbCharacterRoot.position.y = this.glbMixer ? 0 : Math.sin(elapsed * 2.2) * 0.01;
        this.playerModel.weaponMount.position.set(-0.22, 1.22, 0.28);
        this.playerModel.weaponMount.rotation.set(0.15, 0, 0);
        if (this.glbMixer) {
          this.playGlbAnimation('idle');
          this.glbMixer.update(dt);
        }
      }
      return;
    }

    // Keep Sun shadow frustum locked near player for sharp shadows
    this.sunLight.position.set(this.playerPos.x + 32, this.playerPos.y + 56, this.playerPos.z + 24);
    this.sunLight.target.position.copy(this.playerPos);

    const activeWeapon = this.activeSlot !== 3 ? this.weapons[this.activeSlot] : null;
    const targetFov =
      this.phase === 'parachute'
        ? 76
        : this.input.ads && activeWeapon
        ? activeWeapon.spec.adsFov
        : this.input.sprint || this.sprintToggled
        ? 72
        : 66;
    this.currentFov = THREE.MathUtils.damp(this.currentFov, targetFov, 12, dt);
    if (Math.abs(this.camera.fov - this.currentFov) > 0.05) {
      this.camera.fov = this.currentFov;
      this.camera.updateProjectionMatrix();
    }

    const sinY = Math.sin(this.playerYaw);
    const cosY = Math.cos(this.playerYaw);
    const rightX = -cosY;
    const rightZ = sinY;

    const shoulderOffset = this.phase === 'parachute' ? 0 : this.input.ads ? 0.58 : 0.72;
    const camDist =
      this.phase === 'parachute'
        ? 8.2
        : this.input.ads
        ? 2.15
        : this.stance === 'prone'
        ? 3.35
        : 4.15;
    const camHeight =
      this.phase === 'parachute'
        ? 2.4
        : this.stance === 'prone'
        ? 0.68
        : this.stance === 'crouch'
        ? 1.18
        : 1.62;

    const desiredX =
      this.playerPos.x - sinY * Math.cos(this.cameraPitch) * camDist + rightX * shoulderOffset;
    const desiredY =
      this.playerPos.y + camHeight + Math.sin(this.cameraPitch) * camDist;
    const desiredZ =
      this.playerPos.z - cosY * Math.cos(this.cameraPitch) * camDist + rightZ * shoulderOffset;

    // Prevent camera from dipping below terrain
    const groundAtCam = groundHeightAt(desiredX, desiredZ) + 0.45;
    const clampedY = Math.max(groundAtCam, desiredY);

    const k = 1 - Math.exp(-18 * dt);
    if (this.cameraTargetPos.lengthSq() === 0) {
      this.cameraTargetPos.set(desiredX, clampedY, desiredZ);
    } else {
      this.cameraTargetPos.lerp(_v1.set(desiredX, clampedY, desiredZ), k);
    }
    this.camera.position.copy(this.cameraTargetPos);

    const lookDist = 18;
    const lx =
      this.playerPos.x + sinY * Math.cos(this.cameraPitch) * lookDist + rightX * shoulderOffset * 0.45;
    const ly =
      this.playerPos.y + camHeight - Math.sin(this.cameraPitch) * lookDist;
    const lz =
      this.playerPos.z + cosY * Math.cos(this.cameraPitch) * lookDist + rightZ * shoulderOffset * 0.45;

    this.cameraLookPos.set(lx, ly, lz);
    this.camera.lookAt(this.cameraLookPos);
  }

  private emitHud(): void {
    const aliveBots = this.bots.filter((b) => b.alive).length;
    const activeW = this.activeSlot !== 3 ? this.weapons[this.activeSlot] : null;
    const distToZone = Math.hypot(
      this.playerPos.x - this.zoneCenter.x,
      this.playerPos.z - this.zoneCenter.y
    );

    const moveActive =
      this.input.forward ||
      this.input.backward ||
      this.input.left ||
      this.input.right ||
      this.sprintToggled ||
      this.joystickVec.lengthSq() > 0.04;
    const spreadBase = activeW ? (this.input.ads ? activeW.spec.spreadAds : activeW.spec.spreadHip) : 0.025;
    const crosshairPx = Math.round(
      (spreadBase * (moveActive ? 1.4 : 1.0) + this.recoilOffset * 0.5) * 480
    );

    const blips: MinimapBlip[] = [];
    for (let i = 0; i < this.bots.length; i++) {
      const b = this.bots[i];
      if (!b.alive) continue;
      if (this.survivalTime - b.lastFireTimestamp < 2.2) {
        blips.push({ x: b.position.x, z: b.position.z, type: 'bot_firing' });
      }
    }
    if (this.airdropSpawned) {
      blips.push({ x: this.airdropPos.x, z: this.airdropPos.z, type: 'airdrop' });
    }

    // Prune old floating damage numbers (>750ms)
    const now = performance.now();
    this.damageNumbers = this.damageNumbers.filter((d) => now - d.createdAt < 750);

    const reloadSpec = activeW ? activeW.spec.reloadTime : 1.5;

    this.onHudUpdate({
      phase: this.phase,
      pointerLocked: this.pointerLocked,
      hp: Math.ceil(this.playerHp),
      maxHp: this.maxHp,
      armor: Math.ceil(this.playerArmor),
      maxArmor: this.maxArmor,
      medkits: this.medkits,
      glooWalls: this.glooWallsCount,
      healingProgress: this.healingTimer > 0 ? 1 - this.healingTimer / 2.2 : 0,
      reloadingProgress: this.reloadTimer > 0 ? 1 - this.reloadTimer / reloadSpec : 0,
      aliveCount: this.phase === 'ended' && !this.isBooyah ? aliveBots : aliveBots + 1,
      totalCombatants: this.totalCombatants,
      kills: this.kills,
      headshots: this.headshots,
      damageDealt: this.damageDealt,
      shotsFired: this.shotsFired,
      shotsHit: this.shotsHit,
      survivalTime: this.survivalTime,
      placement: this.placement,
      isBooyah: this.isBooyah,
      eliminatedBy: this.eliminatedBy,
      weapons: [this.weapons[0], this.weapons[1], this.weapons[2]],
      activeSlot: this.activeSlot,
      combatMode: this.activeSlot === 3 ? 'fists' : 'gun',
      stance: this.stance,
      isAds: this.input.ads,
      isCrouching: this.stance === 'crouch',
      isProne: this.stance === 'prone',
      isSprinting:
        (this.input.sprint || this.sprintToggled || this.joystickVec.length() > 0.82) &&
        moveActive &&
        this.stance === 'stand',
      crosshairSpread: Math.max(6, Math.min(48, crosshairPx)),
      aimingAtEnemy: this.aimingAtEnemy,
      hitMarkerType: this.hitMarkerTime > 0 ? this.hitMarkerType : 'none',
      hitMarkerTime: this.hitMarkerTime,
      altitude: Math.max(0, Math.round(this.playerPos.y - groundHeightAt(this.playerPos.x, this.playerPos.z))),
      chuteOpen: this.chuteOpen,
      nearbyLootLabel: this.nearbyLoot ? this.nearbyLoot.label : null,
      zonePhase: this.zonePhaseIdx + 1,
      zoneShrinking: this.zoneShrinking,
      zoneTimeRemaining: Math.max(0, Math.ceil(this.zoneTimer)),
      outsideZone: this.phase === 'playing' && distToZone > this.zoneRadius,
      zoneRadius: this.zoneRadius,
      zoneCenterX: this.zoneCenter.x,
      zoneCenterZ: this.zoneCenter.y,
      nextZoneRadius: this.nextZoneRadius,
      nextZoneCenterX: this.nextZoneCenter.x,
      nextZoneCenterZ: this.nextZoneCenter.y,
      playerX: this.playerPos.x,
      playerZ: this.playerPos.z,
      playerYaw: this.playerYaw,
      damageFlash: this.damageFlash,
      damageDirectionAngle: this.damageDirectionAngle,
      killFeed: [...this.killFeed],
      damageNumbers: [...this.damageNumbers],
      minimapBlips: blips,
      bannerMessage: this.bannerMessage,
    });
  }

  public addLookDelta(dx: number, dy: number): void {
    const sens = this.input.ads ? 0.001 : 0.0016;
    this.playerYaw -= dx * sens;
    this.cameraPitch = THREE.MathUtils.clamp(this.cameraPitch + dy * sens, -0.58, 0.72);
  }

  private bindEvents(): void {
    const canvas = this.renderer.domElement;

    const onResize = () => {
      if (this.disposed) return;
      const w = this.container.clientWidth || window.innerWidth;
      const h = this.container.clientHeight || window.innerHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    };

    const onPointerLockChange = () => {
      this.pointerLocked = document.pointerLockElement === canvas;
      this.emitHud();
    };

    const onMouseMove = (e: MouseEvent) => {
      if (this.phase !== 'playing' && this.phase !== 'parachute') return;
      if (this.pointerLocked) {
        this.addLookDelta(e.movementX, e.movementY);
      } else if (this.isDraggingLook) {
        const dx = e.clientX - this.lastPointerX;
        const dy = e.clientY - this.lastPointerY;
        this.lastPointerX = e.clientX;
        this.lastPointerY = e.clientY;
        this.addLookDelta(dx * 1.15, dy * 1.15);
      }
    };

    const onMouseDown = (e: MouseEvent) => {
      if (e.target !== canvas) return;
      if (this.phase !== 'playing' && this.phase !== 'parachute') return;
      canvas.focus();
      gameAudio.unlock();

      if (!this.pointerLocked) {
        this.isDraggingLook = true;
        this.lastPointerX = e.clientX;
        this.lastPointerY = e.clientY;
      }

      if (this.phase === 'playing') {
        if (e.button === 0) {
          this.input.firing = true;
          if (this.fireCooldown <= 0) {
            this.firePlayerWeapon();
          }
        } else if (e.button === 2) {
          if (this.activeSlot !== 3) {
            this.input.ads = !this.input.ads;
          }
        }
      }
    };

    const onMouseUp = (e: MouseEvent) => {
      this.isDraggingLook = false;
      if (e.button === 0) this.input.firing = false;
    };

    const onContextMenu = (e: MouseEvent) => {
      if (e.target === canvas) e.preventDefault();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (this.phase !== 'playing' && this.phase !== 'parachute') return;
      const code = e.code;
      const key = e.key.toLowerCase();

      if (code === 'KeyW' || code === 'ArrowUp' || key === 'w') {
        if (code === 'ArrowUp') e.preventDefault();
        this.input.forward = true;
      } else if (code === 'KeyS' || code === 'ArrowDown' || key === 's') {
        if (code === 'ArrowDown') e.preventDefault();
        this.input.backward = true;
        this.sprintToggled = false;
      } else if (code === 'KeyA' || code === 'ArrowLeft' || key === 'a') {
        if (code === 'ArrowLeft') e.preventDefault();
        this.input.left = true;
      } else if (code === 'KeyD' || code === 'ArrowRight' || key === 'd') {
        if (code === 'ArrowRight') e.preventDefault();
        this.input.right = true;
      } else if (code === 'ShiftLeft' || code === 'ShiftRight' || e.shiftKey) {
        this.input.sprint = true;
        if (this.stance !== 'stand') this.setStance('stand');
      }

      if (e.repeat) return;

      if (code === 'Space' || key === ' ') {
        e.preventDefault();
        this.triggerJump();
      } else if (code === 'KeyC' || key === 'c') {
        this.setStance('crouch');
      } else if (code === 'KeyZ' || code === 'KeyX' || key === 'z' || key === 'x') {
        this.setStance('prone');
      } else if (code === 'KeyV' || key === 'v') {
        if (this.activeSlot !== 3) {
          this.selectWeaponSlot(3);
        } else if (this.fireCooldown <= 0) {
          this.firePlayerPunch();
        }
      } else if (code === 'KeyR' || key === 'r') {
        this.triggerReload();
      } else if (code === 'KeyG' || code === 'KeyQ' || key === 'g' || key === 'q') {
        this.deployGlooWall();
      } else if (code === 'KeyF' || code === 'KeyE' || key === 'f' || key === 'e') {
        if (this.phase === 'parachute') this.cutParachute();
        else this.interactNearbyLoot();
      } else if (code === 'Digit1' || key === '1') {
        this.selectWeaponSlot(0);
      } else if (code === 'Digit2' || key === '2') {
        this.selectWeaponSlot(1);
      } else if (code === 'Digit3' || key === '3') {
        this.selectWeaponSlot(2);
      } else if (code === 'Digit4' || key === '4') {
        this.selectWeaponSlot(3);
      } else if (code === 'Digit5' || code === 'KeyH' || key === '5' || key === 'h') {
        this.useMedkit();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const code = e.code;
      const key = e.key.toLowerCase();

      if (code === 'KeyW' || code === 'ArrowUp' || key === 'w') {
        this.input.forward = false;
      } else if (code === 'KeyS' || code === 'ArrowDown' || key === 's') {
        this.input.backward = false;
      } else if (code === 'KeyA' || code === 'ArrowLeft' || key === 'a') {
        this.input.left = false;
      } else if (code === 'KeyD' || code === 'ArrowRight' || key === 'd') {
        this.input.right = false;
      } else if (code === 'ShiftLeft' || code === 'ShiftRight' || key === 'shift') {
        this.input.sprint = false;
      } else if (code === 'Space' || key === ' ') {
        this.input.jump = false;
      }
    };

    const onWindowBlur = () => {
      this.input.forward = false;
      this.input.backward = false;
      this.input.left = false;
      this.input.right = false;
      this.input.sprint = false;
      this.input.jump = false;
      this.input.firing = false;
      this.isDraggingLook = false;
      this.joystickVec.set(0, 0);
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.target !== canvas) return;
      if (this.phase !== 'playing' && this.phase !== 'parachute') return;
      gameAudio.unlock();
      if (this.activeLookTouchId === null && e.changedTouches.length > 0) {
        const t = e.changedTouches[0];
        this.activeLookTouchId = t.identifier;
        this.lastTouchX = t.clientX;
        this.lastTouchY = t.clientY;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (this.activeLookTouchId === null) return;
      if (this.phase !== 'playing' && this.phase !== 'parachute') return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (t.identifier === this.activeLookTouchId) {
          const dx = t.clientX - this.lastTouchX;
          const dy = t.clientY - this.lastTouchY;
          this.lastTouchX = t.clientX;
          this.lastTouchY = t.clientY;
          this.addLookDelta(dx * 1.25, dy * 1.25);
          break;
        }
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (this.activeLookTouchId === null) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === this.activeLookTouchId) {
          this.activeLookTouchId = null;
          break;
        }
      }
    };

    const onContextLost = (e: Event) => {
      e.preventDefault();
      cancelAnimationFrame(this.frameId);
      clearTimeout(this.frameId);
    };

    const onContextRestored = () => {
      this.startLoop();
    };

    window.addEventListener('resize', onResize);
    document.addEventListener('pointerlockchange', onPointerLockChange);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('contextmenu', onContextMenu);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onWindowBlur);
    canvas.addEventListener('touchstart', onTouchStart, { passive: true });
    canvas.addEventListener('touchmove', onTouchMove, { passive: true });
    canvas.addEventListener('touchend', onTouchEnd);
    canvas.addEventListener('touchcancel', onTouchEnd);
    canvas.addEventListener('webglcontextlost', onContextLost);
    canvas.addEventListener('webglcontextrestored', onContextRestored);

    this.cleanupListeners = () => {
      window.removeEventListener('resize', onResize);
      document.removeEventListener('pointerlockchange', onPointerLockChange);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('contextmenu', onContextMenu);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onWindowBlur);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
      canvas.removeEventListener('touchcancel', onTouchEnd);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      canvas.removeEventListener('webglcontextrestored', onContextRestored);
    };
  }

  private cleanupListeners: () => void = () => {};

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync?.(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    if (!sync) {
      this.frameId = window.setTimeout(cb, 80);
      return;
    }
    const poll = () => {
      if (this.disposed) {
        gl.deleteSync(sync);
        return;
      }
      const state = gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private startLoop(): void {
    const tick = () => {
      if (this.disposed) return;
      const dt = Math.min(0.05, this.clock.getDelta());
      const elapsed = this.clock.elapsedTime;

      this.updatePlayer(dt);
      this.updateBots(dt);
      this.updateZoneAndAirdrop(dt);
      this.updateEffects(dt, elapsed);
      this.updateCamera(dt, elapsed);

      this.renderer.render(this.scene, this.camera);

      this.hudEmitTimer += dt;
      if (this.hudEmitTimer >= 0.05) {
        this.hudEmitTimer = 0;
        this.emitHud();
      }

      if (this.isSoftwareGl) {
        this.afterDraw(tick);
      } else {
        this.frameId = requestAnimationFrame(tick);
      }
    };

    if (this.isSoftwareGl) {
      this.frameId = window.setTimeout(tick, 16);
    } else {
      this.frameId = requestAnimationFrame(tick);
    }
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    this.cleanupListeners();
    this.clearDynamicEntities();
    if (this.glbMixer) {
      this.glbMixer.stopAllAction();
      this.glbMixer = null;
    }
    if (this.playerModel) {
      this.playerModel.materialsToDispose.forEach((m) => m.dispose());
    }
    this.tracerGeo.dispose();
    this.tracerMatPlayer.dispose();
    this.tracerMatBot.dispose();
    this.sparkGeo.dispose();
    this.sparkMat.dispose();
    this.bloodMat.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
