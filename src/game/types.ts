export type GamePhase = 'lobby' | 'parachute' | 'playing' | 'ended';

export type WeaponId = 'm500' | 'scar' | 'mp40' | 'm1887' | 'awm';

export interface WeaponSpec {
  id: WeaponId;
  name: string;
  category: 'Pistol' | 'AR' | 'SMG' | 'Shotgun' | 'Sniper';
  damage: number;
  headshotMult: number;
  fireRate: number; // shots per second
  magSize: number;
  reloadTime: number; // seconds
  range: number;
  pellets: number;
  spreadHip: number; // radians
  spreadAds: number; // radians
  recoilPitch: number;
  adsFov: number;
  auto: boolean;
  accentHex: string;
  muzzleSpeed: number;
}

export interface WeaponInstance {
  spec: WeaponSpec;
  ammoInMag: number;
  reserveAmmo: number;
}

export interface CharacterSkin {
  id: string;
  name: string;
  title: string;
  jacketColor: number;
  armorColor: number;
  pantsColor: number;
  visorColor: number;
  accentHex: string;
}

export type LootType = 'weapon' | 'medkit' | 'gloowall' | 'armor' | 'ammo';

export interface KillFeedEntry {
  id: number;
  killer: string;
  victim: string;
  weapon: string;
  headshot: boolean;
  isPlayerInvolved: boolean;
  timestamp: number;
}

export interface DamageIndicator {
  id: number;
  screenX: number;
  screenY: number;
  amount: number;
  headshot: boolean;
  createdAt: number;
}

export interface MinimapBlip {
  x: number;
  z: number;
  type: 'bot_firing' | 'airdrop' | 'loot_rare';
}

export interface HudSnapshot {
  phase: GamePhase;
  pointerLocked: boolean;
  hp: number;
  maxHp: number;
  armor: number;
  maxArmor: number;
  medkits: number;
  glooWalls: number;
  healingProgress: number; // 0..1 when healing, 0 otherwise
  reloadingProgress: number; // 0..1 when reloading, 0 otherwise
  aliveCount: number;
  totalCombatants: number;
  kills: number;
  headshots: number;
  damageDealt: number;
  shotsFired: number;
  shotsHit: number;
  survivalTime: number;
  placement: number;
  isBooyah: boolean;
  eliminatedBy: string;

  // Active inventory
  weapons: [WeaponInstance | null, WeaponInstance | null, WeaponInstance | null];
  activeSlot: 0 | 1 | 2 | 3; // 3 = Bare Hands / Fists
  combatMode: 'gun' | 'fists';
  stance: 'stand' | 'crouch' | 'prone';
  isAds: boolean;
  isCrouching: boolean;
  isProne: boolean;
  isSprinting: boolean;
  crosshairSpread: number; // px
  aimingAtEnemy: boolean;
  hitMarkerType: 'none' | 'body' | 'head';
  hitMarkerTime: number;

  // Parachute
  altitude: number;
  chuteOpen: boolean;

  // Nearby prompt
  nearbyLootLabel: string | null;

  // Zone
  zonePhase: number;
  zoneShrinking: boolean;
  zoneTimeRemaining: number;
  outsideZone: boolean;
  zoneRadius: number;
  zoneCenterX: number;
  zoneCenterZ: number;
  nextZoneRadius: number;
  nextZoneCenterX: number;
  nextZoneCenterZ: number;

  // Player transform for minimap
  playerX: number;
  playerZ: number;
  playerYaw: number;
  damageFlash: number; // 0..1
  damageDirectionAngle: number | null;

  killFeed: KillFeedEntry[];
  damageNumbers: DamageIndicator[];
  minimapBlips: MinimapBlip[];
  bannerMessage: string | null;
}
