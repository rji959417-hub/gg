import * as THREE from 'three';
import { CharacterSkin, LootType, WeaponId } from './types';
import { ProceduralTextureSet } from './textures';
import { groundHeightAt } from './terrain';

export interface BoxCollider {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

export interface ArticulatedCharacter {
  root: THREE.Group;
  hips: THREE.Group;
  torso: THREE.Group;
  head: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftForearm: THREE.Group;
  rightForearm: THREE.Group;
  weaponMount: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftShin: THREE.Group;
  rightShin: THREE.Group;
  parachute: THREE.Group;
  muzzlePoint: THREE.Object3D;
  muzzleFlash: THREE.Group;
  contactShadow: THREE.Mesh;
  materialsToDispose: THREE.Material[];
}

export function createCharacterModel(
  skin: CharacterSkin,
  textures: ProceduralTextureSet
): ArticulatedCharacter {
  const root = new THREE.Group();
  const isStreetIcon = skin.id === 'dante';

  // Calibrated PBR Materials
  const skinMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.heroFaceMap,
    roughness: 0.56,
    metalness: 0.02,
  });

  const bareSkinMat = new THREE.MeshStandardMaterial({
    color: 0xd9a17e,
    roughness: 0.55,
    metalness: 0.02,
  });

  const torsoMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.heroTorsoMap,
    bumpMap: textures.heroTorsoBumpMap,
    bumpScale: 0.022,
    roughness: 0.52,
    metalness: 0.03,
  });

  const leftArmMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.heroLeftArmMap,
    roughness: 0.54,
    metalness: 0.03,
  });

  const rightArmMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.heroRightArmMap,
    roughness: 0.54,
    metalness: 0.03,
  });

  const jacketMat = new THREE.MeshPhysicalMaterial({
    color: skin.jacketColor,
    map: textures.tacticalFabricMap,
    bumpMap: textures.tacticalFabricBumpMap,
    bumpScale: 0.024,
    roughness: 0.78,
    metalness: 0.05,
    sheen: 0.25,
    sheenRoughness: 0.75,
  });

  const kevlarMat = new THREE.MeshStandardMaterial({
    color: skin.armorColor,
    map: textures.kevlarMap,
    roughnessMap: textures.kevlarRoughnessMap,
    roughness: 0.62,
    metalness: 0.24,
  });

  const tacticalPantsMat = new THREE.MeshStandardMaterial({
    color: skin.pantsColor,
    map: textures.tacticalFabricMap,
    bumpMap: textures.tacticalFabricBumpMap,
    bumpScale: 0.026,
    roughness: 0.84,
    metalness: 0.04,
  });

  const pantsMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.heroPantsMap,
    bumpMap: textures.heroPantsBumpMap,
    bumpScale: 0.026,
    roughness: 0.84,
    metalness: 0.04,
  });

  const hairMat = new THREE.MeshStandardMaterial({
    color: 0xeef2f6,
    map: textures.silverHairMap,
    roughness: 0.62,
    metalness: 0.08,
  });

  const headphoneSilverMat = new THREE.MeshStandardMaterial({
    color: 0xcbd5e1,
    roughness: 0.24,
    metalness: 0.86,
  });

  const headphoneBandMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.45,
    metalness: 0.35,
  });

  const cordMat = new THREE.MeshStandardMaterial({
    color: 0x312e81,
    roughness: 0.5,
    metalness: 0.12,
  });

  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    roughness: 0.22,
    metalness: 0.92,
  });

  const pendantPlateMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.richPendantMap,
    roughness: 0.25,
    metalness: 0.88,
  });

  const leatherMat = new THREE.MeshStandardMaterial({
    color: 0x6e4f3d,
    bumpMap: textures.leatherBumpMap,
    bumpScale: 0.022,
    roughness: 0.68,
    metalness: 0.08,
  });

  const darkGearMat = new THREE.MeshStandardMaterial({
    color: 0x181e26,
    bumpMap: textures.leatherBumpMap,
    bumpScale: 0.024,
    roughness: 0.56,
    metalness: 0.22,
  });

  const bootMat = new THREE.MeshStandardMaterial({
    color: 0x241f1c,
    bumpMap: textures.leatherBumpMap,
    bumpScale: 0.028,
    roughness: 0.64,
    metalness: 0.12,
  });

  const silverBuckleMat = new THREE.MeshStandardMaterial({
    color: 0xdbe2ea,
    roughness: 0.22,
    metalness: 0.9,
  });

  const sneakerWhiteMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    bumpMap: textures.leatherBumpMap,
    bumpScale: 0.012,
    roughness: 0.48,
    metalness: 0.06,
  });

  const sneakerSoleMat = new THREE.MeshStandardMaterial({
    color: 0xcbd5e1,
    roughness: 0.68,
    metalness: 0.05,
  });

  const helmetMat = new THREE.MeshStandardMaterial({
    color: skin.armorColor,
    map: textures.kevlarMap,
    roughnessMap: textures.kevlarRoughnessMap,
    roughness: 0.48,
    metalness: 0.32,
  });

  const visorMat = new THREE.MeshPhysicalMaterial({
    color: skin.visorColor,
    emissive: skin.visorColor,
    emissiveIntensity: 0.22,
    roughness: 0.12,
    metalness: 0.55,
    clearcoat: 1.0,
    clearcoatRoughness: 0.08,
  });

  const accentMat = new THREE.MeshStandardMaterial({
    color: skin.visorColor,
    emissive: skin.visorColor,
    emissiveIntensity: 0.28,
    roughness: 0.35,
    metalness: 0.65,
  });

  // Grounded radial contact shadow
  const shadowGeo = new THREE.PlaneGeometry(1.65, 1.65);
  shadowGeo.rotateX(-Math.PI / 2);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: textures.contactShadowMap,
    transparent: true,
    depthWrite: false,
    opacity: 0.56,
  });
  const contactShadow = new THREE.Mesh(shadowGeo, shadowMat);
  contactShadow.position.y = 0.03;
  root.add(contactShadow);

  const hips = new THREE.Group();
  hips.position.y = 0.94;
  root.add(hips);

  const activePantsMat = isStreetIcon ? pantsMat : tacticalPantsMat;

  // Sculpted Pelvis + Tactical Belt
  const pelvis = new THREE.Mesh(new THREE.CylinderGeometry(0.178, 0.168, 0.19, 16), activePantsMat);
  pelvis.scale.set(1.25, 1, 0.84);
  pelvis.rotation.y = Math.PI;
  pelvis.castShadow = true;
  pelvis.receiveShadow = true;
  hips.add(pelvis);

  const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.188, 0.188, 0.054, 16), darkGearMat);
  belt.scale.set(1.27, 1, 0.86);
  belt.position.y = 0.068;
  belt.castShadow = true;
  hips.add(belt);

  if (isStreetIcon) {
    const ovalBuckle = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.022, 16), silverBuckleMat);
    ovalBuckle.rotation.x = Math.PI / 2;
    ovalBuckle.scale.set(1.22, 1, 0.88);
    ovalBuckle.position.set(0, 0.068, 0.162);
    ovalBuckle.castShadow = true;
    hips.add(ovalBuckle);

    const crossBelt = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.042, 16), darkGearMat);
    crossBelt.scale.set(1.29, 1, 0.87);
    crossBelt.position.set(0, 0.015, 0);
    crossBelt.rotation.z = -0.18;
    crossBelt.castShadow = true;
    hips.add(crossBelt);

    const frontPouch = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.09, 0.048), leatherMat);
    frontPouch.position.set(0.065, 0.0, 0.165);
    frontPouch.rotation.z = -0.14;
    frontPouch.castShadow = true;
    hips.add(frontPouch);

    const frontPouchFlap = new THREE.Mesh(new THREE.BoxGeometry(0.088, 0.036, 0.052), leatherMat);
    frontPouchFlap.position.set(0.065, 0.025, 0.168);
    frontPouchFlap.rotation.z = -0.14;
    hips.add(frontPouchFlap);

    const frontRing = new THREE.Mesh(new THREE.TorusGeometry(0.016, 0.004, 6, 12), silverBuckleMat);
    frontRing.position.set(0.125, -0.012, 0.162);
    hips.add(frontRing);

    const sidePouch = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.135, 0.115), leatherMat);
    sidePouch.position.set(0.245, -0.035, 0.01);
    sidePouch.castShadow = true;
    hips.add(sidePouch);
  } else {
    // Tactical Buckle + Waist Dump Pouches + Drop-leg Holster
    const tacBuckle = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.062, 0.03), silverBuckleMat);
    tacBuckle.position.set(0, 0.068, 0.164);
    hips.add(tacBuckle);

    [-0.22, 0.22].forEach((px) => {
      const hipPouch = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.13, 0.12), kevlarMat);
      hipPouch.position.set(px, 0.02, 0.02);
      hipPouch.castShadow = true;
      hips.add(hipPouch);
    });
  }

  // Articulated Legs (Hip -> Thigh -> Knee -> Shin -> Combat Boots / Sneakers)
  const buildLeg = (xOffset: number, isLeftLeg: boolean) => {
    const legPivot = new THREE.Group();
    legPivot.position.set(xOffset, -0.05, 0);

    const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.106, 0.082, 0.42, 14), activePantsMat);
    thigh.position.y = -0.21;
    thigh.rotation.y = Math.PI + (isLeftLeg ? 0.06 : -0.06);
    thigh.castShadow = true;
    thigh.receiveShadow = true;
    legPivot.add(thigh);

    if (!isStreetIcon) {
      // Tactical Cargo Pocket & Thigh Holster Strap
      const cargoPocket = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.16, 0.125), jacketMat);
      cargoPocket.position.set(isLeftLeg ? 0.088 : -0.088, -0.22, 0.01);
      cargoPocket.castShadow = true;
      legPivot.add(cargoPocket);

      const thighStrap = new THREE.Mesh(new THREE.CylinderGeometry(0.098, 0.094, 0.038, 12), darkGearMat);
      thighStrap.position.set(0, -0.18, 0);
      legPivot.add(thighStrap);

      if (!isLeftLeg) {
        const holster = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.15, 0.095), darkGearMat);
        holster.position.set(-0.095, -0.18, 0.025);
        holster.castShadow = true;
        legPivot.add(holster);
      }
    }

    // Knee joint pivot
    const shinPivot = new THREE.Group();
    shinPivot.position.set(0, -0.41, 0);
    legPivot.add(shinPivot);

    const kneeCap = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), activePantsMat);
    kneeCap.rotation.y = Math.PI;
    kneeCap.scale.set(0.98, 0.95, 1.04);
    shinPivot.add(kneeCap);

    if (!isStreetIcon) {
      // Hard-shell tactical knee guard
      const kneeArmor = new THREE.Mesh(new THREE.BoxGeometry(0.115, 0.11, 0.045), darkGearMat);
      kneeArmor.position.set(0, 0.0, 0.078);
      kneeArmor.castShadow = true;
      shinPivot.add(kneeArmor);
    }

    const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.078, 0.058, 0.36, 14), activePantsMat);
    shin.position.y = -0.18;
    shin.rotation.y = Math.PI;
    shin.castShadow = true;
    shin.receiveShadow = true;
    shinPivot.add(shin);

    if (isStreetIcon) {
      // White Athletic Sneakers
      const shoeCuff = new THREE.Mesh(new THREE.CylinderGeometry(0.064, 0.062, 0.1, 12), sneakerWhiteMat);
      shoeCuff.position.set(0, -0.37, 0);
      shoeCuff.castShadow = true;
      shinPivot.add(shoeCuff);

      const shoeTongue = new THREE.Mesh(new THREE.BoxGeometry(0.072, 0.075, 0.03), sneakerWhiteMat);
      shoeTongue.position.set(0, -0.355, 0.055);
      shoeTongue.rotation.x = -0.22;
      shinPivot.add(shoeTongue);

      const shoeUpper = new THREE.Mesh(new THREE.CapsuleGeometry(0.056, 0.125, 4, 10), sneakerWhiteMat);
      shoeUpper.rotation.x = Math.PI / 2;
      shoeUpper.scale.set(1.06, 1, 0.84);
      shoeUpper.position.set(0, -0.43, 0.068);
      shoeUpper.castShadow = true;
      shinPivot.add(shoeUpper);

      const shoeSole = new THREE.Mesh(new THREE.BoxGeometry(0.122, 0.032, 0.255), sneakerSoleMat);
      shoeSole.position.set(0, -0.465, 0.058);
      shoeSole.castShadow = true;
      shinPivot.add(shoeSole);
    } else {
      // Laced Tactical Combat Boots + Lugged Sole + Ankle Straps
      const bootShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.066, 0.16, 12), bootMat);
      bootShaft.position.set(0, -0.34, 0);
      bootShaft.castShadow = true;
      shinPivot.add(bootShaft);

      const bootStrap = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.028, 12), darkGearMat);
      bootStrap.position.set(0, -0.31, 0);
      shinPivot.add(bootStrap);

      const bootUpper = new THREE.Mesh(new THREE.CapsuleGeometry(0.062, 0.13, 4, 10), bootMat);
      bootUpper.rotation.x = Math.PI / 2;
      bootUpper.scale.set(1.08, 1, 0.88);
      bootUpper.position.set(0, -0.425, 0.068);
      bootUpper.castShadow = true;
      shinPivot.add(bootUpper);

      const lugSole = new THREE.Mesh(new THREE.BoxGeometry(0.132, 0.042, 0.268), darkGearMat);
      lugSole.position.set(0, -0.462, 0.058);
      lugSole.castShadow = true;
      shinPivot.add(lugSole);
    }

    hips.add(legPivot);
    return { legPivot, shinPivot };
  };

  const rightLegParts = buildLeg(-0.122, false);
  const leftLegParts = buildLeg(0.122, true);

  // Torso Group
  const torso = new THREE.Group();
  torso.position.y = 0.08;
  hips.add(torso);

  const head = new THREE.Group();
  head.position.y = 0.57;
  torso.add(head);

  if (isStreetIcon) {
    // Muscular Shirtless Torso + Gold "RICH" Chain
    const chest = new THREE.Mesh(new THREE.CylinderGeometry(0.225, 0.162, 0.54, 18), torsoMat);
    chest.scale.set(1.18, 1, 0.72);
    chest.position.y = 0.27;
    chest.rotation.y = Math.PI;
    chest.castShadow = true;
    chest.receiveShadow = true;
    torso.add(chest);

    [-0.085, 0.085].forEach((px) => {
      const pec = new THREE.Mesh(new THREE.SphereGeometry(0.095, 12, 10), bareSkinMat);
      pec.scale.set(1.05, 0.78, 0.55);
      pec.position.set(px, 0.37, 0.115);
      torso.add(pec);
    });

    const traps = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.21, 0.09, 14), bareSkinMat);
    traps.scale.set(1.22, 1, 0.72);
    traps.position.y = 0.54;
    traps.castShadow = true;
    torso.add(traps);

    const chainCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.085, 0.545, 0.045),
      new THREE.Vector3(-0.075, 0.43, 0.15),
      new THREE.Vector3(0, 0.315, 0.178),
      new THREE.Vector3(0.075, 0.43, 0.15),
      new THREE.Vector3(0.085, 0.545, 0.045),
      new THREE.Vector3(0, 0.555, -0.075),
      new THREE.Vector3(-0.085, 0.545, 0.045),
    ]);
    const goldChain = new THREE.Mesh(new THREE.TubeGeometry(chainCurve, 28, 0.011, 6, false), goldMat);
    goldChain.castShadow = true;
    torso.add(goldChain);

    const pendant = new THREE.Mesh(new THREE.BoxGeometry(0.115, 0.046, 0.016), pendantPlateMat);
    pendant.position.set(0, 0.292, 0.184);
    pendant.castShadow = true;
    torso.add(pendant);

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.076, 0.11, 12), bareSkinMat);
    neck.position.y = 0.05;
    neck.castShadow = true;
    head.add(neck);

    const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.128, 18, 16), skinMat);
    cranium.scale.set(0.9, 1.14, 1.0);
    cranium.rotation.y = -Math.PI / 2;
    cranium.position.y = 0.2;
    cranium.castShadow = true;
    head.add(cranium);

    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.016, 0.042, 6), bareSkinMat);
    nose.rotation.x = Math.PI * 0.42;
    nose.position.set(0, 0.19, 0.125);
    head.add(nose);

    const hairCap = new THREE.Mesh(
      new THREE.SphereGeometry(0.134, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.56),
      hairMat
    );
    hairCap.scale.set(0.96, 1.08, 1.04);
    hairCap.position.set(0, 0.225, -0.01);
    hairCap.castShadow = true;
    head.add(hairCap);

    const hairSpikes: Array<[number, number, number, number, number, number, number]> = [
      [0, 0.345, 0.05, 0.35, 0.05, 0.045, 0.11],
      [-0.045, 0.335, 0.065, 0.45, 0.25, 0.038, 0.1],
      [0.045, 0.335, 0.065, 0.45, -0.25, 0.038, 0.1],
      [-0.075, 0.295, 0.085, 1.05, 0.38, 0.032, 0.105],
      [-0.02, 0.305, 0.105, 1.15, 0.12, 0.032, 0.115],
      [0.032, 0.305, 0.102, 1.15, -0.15, 0.032, 0.11],
      [0.078, 0.295, 0.085, 1.05, -0.35, 0.03, 0.1],
      [-0.095, 0.31, -0.015, -0.1, 0.65, 0.035, 0.095],
      [0.095, 0.31, -0.015, -0.1, -0.65, 0.035, 0.095],
      [0, 0.325, -0.085, -0.65, 0, 0.048, 0.115],
      [-0.055, 0.295, -0.105, -0.85, 0.28, 0.042, 0.105],
      [0.055, 0.295, -0.105, -0.85, -0.28, 0.042, 0.105],
      [0, 0.215, -0.12, -1.25, 0, 0.055, 0.11],
    ];
    hairSpikes.forEach(([sx, sy, sz, rx, rz, rad, h]) => {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(rad, h, 7), hairMat);
      spike.position.set(sx, sy, sz);
      spike.rotation.set(rx, 0, rz);
      spike.castShadow = true;
      head.add(spike);
    });

    const headband = new THREE.Mesh(
      new THREE.TorusGeometry(0.145, 0.014, 8, 22, Math.PI),
      headphoneBandMat
    );
    headband.position.set(0, 0.215, 0.005);
    headband.castShadow = true;
    head.add(headband);

    [-0.136, 0.136].forEach((ex) => {
      const cupOuter = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.042, 0.036, 14), headphoneSilverMat);
      cupOuter.rotation.z = Math.PI / 2;
      cupOuter.position.set(ex, 0.195, 0.002);
      cupOuter.castShadow = true;
      head.add(cupOuter);

      const cushion = new THREE.Mesh(new THREE.TorusGeometry(0.036, 0.012, 8, 16), headphoneBandMat);
      cushion.rotation.y = Math.PI / 2;
      cushion.position.set(ex > 0 ? ex - 0.014 : ex + 0.014, 0.195, 0.002);
      head.add(cushion);

      const sign = ex > 0 ? 1 : -1;
      const cordCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(ex, 0.155, 0.015),
        new THREE.Vector3(sign * 0.125, 0.075, 0.055),
        new THREE.Vector3(sign * 0.075, -0.02, 0.088),
      ]);
      const cord = new THREE.Mesh(new THREE.TubeGeometry(cordCurve, 12, 0.0045, 5, false), cordMat);
      head.add(cord);
    });
  } else {
    // Realistic Tactical Soldier Upper Body: Combat Jacket + Beveled Kevlar Plate Carrier + Radio + Backpack
    const jacketChest = new THREE.Mesh(new THREE.CylinderGeometry(0.228, 0.174, 0.54, 18), jacketMat);
    jacketChest.scale.set(1.2, 1, 0.78);
    jacketChest.position.y = 0.27;
    jacketChest.rotation.y = Math.PI;
    jacketChest.castShadow = true;
    jacketChest.receiveShadow = true;
    torso.add(jacketChest);

    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.145, 0.09, 14), jacketMat);
    collar.position.y = 0.545;
    collar.castShadow = true;
    torso.add(collar);

    // Beveled Kevlar Ballistic Plate Carrier (ExtrudeGeometry)
    const vestShape = new THREE.Shape();
    vestShape.moveTo(-0.18, -0.17);
    vestShape.lineTo(0.18, -0.17);
    vestShape.lineTo(0.2, 0.08);
    vestShape.lineTo(0.13, 0.19);
    vestShape.lineTo(-0.13, 0.19);
    vestShape.lineTo(-0.2, 0.08);
    vestShape.closePath();

    const vestGeo = new THREE.ExtrudeGeometry(vestShape, {
      depth: 0.25,
      bevelEnabled: true,
      bevelThickness: 0.022,
      bevelSize: 0.018,
      bevelSegments: 2,
    });
    vestGeo.center();
    const plateCarrier = new THREE.Mesh(vestGeo, kevlarMat);
    plateCarrier.position.set(0, 0.31, 0.01);
    plateCarrier.castShadow = true;
    plateCarrier.receiveShadow = true;
    torso.add(plateCarrier);

    // Shoulder Carrier Straps
    [-0.125, 0.125].forEach((sx) => {
      const strap = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.04, 0.24), darkGearMat);
      strap.position.set(sx, 0.515, 0.0);
      strap.castShadow = true;
      torso.add(strap);
    });

    // 3 Front Rifle Magazine Pouches + Chest Patch Accent
    [-0.095, 0, 0.095].forEach((mx) => {
      const magPouch = new THREE.Mesh(new THREE.BoxGeometry(0.072, 0.12, 0.055), darkGearMat);
      magPouch.position.set(mx, 0.21, 0.175);
      magPouch.castShadow = true;
      torso.add(magPouch);
    });

    const chestPatch = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.045, 0.018), accentMat);
    chestPatch.position.set(0.08, 0.39, 0.162);
    torso.add(chestPatch);

    // Tactical Shoulder Comms Radio + Antenna (Left Shoulder +X)
    const radio = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.11, 0.045), darkGearMat);
    radio.position.set(0.165, 0.42, 0.13);
    torso.add(radio);
    const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.006, 0.2, 6), darkGearMat);
    antenna.position.set(0.18, 0.56, 0.13);
    torso.add(antenna);

    // Tactical Field Backpack + Rolled Bedroll
    const packMain = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.36, 0.16), jacketMat);
    packMain.position.set(0, 0.31, -0.21);
    packMain.castShadow = true;
    torso.add(packMain);

    const packPocket = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, 0.06), kevlarMat);
    packPocket.position.set(0, 0.23, -0.3);
    packPocket.castShadow = true;
    torso.add(packPocket);

    const bedroll = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.32, 10), darkGearMat);
    bedroll.rotation.z = Math.PI / 2;
    bedroll.position.set(0, 0.51, -0.22);
    bedroll.castShadow = true;
    torso.add(bedroll);

    // Soldier Head: Neck + Face + Tactical Half-Mask + Ballistic Helmet + Tinted Goggles + Comms Headset
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.064, 0.078, 0.11, 12), bareSkinMat);
    neck.position.y = 0.05;
    neck.castShadow = true;
    head.add(neck);

    const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.128, 18, 16), skinMat);
    cranium.scale.set(0.9, 1.12, 1.0);
    cranium.rotation.y = -Math.PI / 2;
    cranium.position.y = 0.195;
    cranium.castShadow = true;
    head.add(cranium);

    const gaiterMask = new THREE.Mesh(new THREE.CylinderGeometry(0.114, 0.105, 0.125, 14), darkGearMat);
    gaiterMask.scale.set(0.95, 1, 1.08);
    gaiterMask.position.set(0, 0.135, 0.015);
    gaiterMask.castShadow = true;
    head.add(gaiterMask);

    // Ballistic MICH/OPS-Core Combat Helmet Shell
    const helmetShell = new THREE.Mesh(
      new THREE.SphereGeometry(0.148, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.58),
      helmetMat
    );
    helmetShell.scale.set(0.98, 1.04, 1.08);
    helmetShell.position.set(0, 0.22, -0.01);
    helmetShell.castShadow = true;
    head.add(helmetShell);

    const helmetRim = new THREE.Mesh(new THREE.TorusGeometry(0.146, 0.014, 8, 22), darkGearMat);
    helmetRim.rotation.x = Math.PI / 2 - 0.12;
    helmetRim.scale.set(0.97, 1.08, 1);
    helmetRim.position.set(0, 0.22, -0.012);
    head.add(helmetRim);

    const nvgMount = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.055, 0.036), darkGearMat);
    nvgMount.position.set(0, 0.285, 0.148);
    head.add(nvgMount);

    // Wrap-around Tactical Ballistic Goggles
    const goggles = new THREE.Mesh(
      new THREE.CylinderGeometry(0.134, 0.134, 0.058, 16, 1, true, -Math.PI * 0.36, Math.PI * 0.72),
      visorMat
    );
    goggles.position.set(0, 0.215, 0.015);
    head.add(goggles);

    const goggleFrame = new THREE.Mesh(
      new THREE.CylinderGeometry(0.138, 0.138, 0.072, 16, 1, true, -Math.PI * 0.38, Math.PI * 0.76),
      darkGearMat
    );
    goggleFrame.position.set(0, 0.215, 0.01);
    head.add(goggleFrame);

    // Comms Earcups + Boom Mic
    [-0.145, 0.145].forEach((ex) => {
      const earCup = new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.04, 0.034, 12), darkGearMat);
      earCup.rotation.z = Math.PI / 2;
      earCup.position.set(ex, 0.19, -0.005);
      head.add(earCup);
    });

    const boomMic = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, 0.14), darkGearMat);
    boomMic.position.set(0.12, 0.135, 0.07);
    boomMic.rotation.y = 0.55;
    head.add(boomMic);
  }

  // Articulated Arms (Right Arm on -X, Left Arm on +X)
  const buildArm = (xOffset: number, isLeftArm: boolean) => {
    const armPivot = new THREE.Group();
    armPivot.position.set(xOffset, 0.49, 0);

    const upperArmMat = isStreetIcon ? (isLeftArm ? leftArmMat : rightArmMat) : jacketMat;
    const lowerArmMat = isStreetIcon ? (isLeftArm ? leftArmMat : bareSkinMat) : jacketMat;
    const handMat = isStreetIcon ? bareSkinMat : darkGearMat;

    const deltoid = new THREE.Mesh(new THREE.SphereGeometry(0.082, 12, 10), upperArmMat);
    deltoid.scale.set(1.04, 1.15, 0.98);
    deltoid.position.set(xOffset > 0 ? -0.01 : 0.01, -0.01, 0);
    deltoid.castShadow = true;
    armPivot.add(deltoid);

    const bicep = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.056, 0.27, 12), upperArmMat);
    bicep.position.y = -0.15;
    bicep.castShadow = true;
    armPivot.add(bicep);

    if (!isStreetIcon) {
      const shoulderPad = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.11, 0.11), kevlarMat);
      shoulderPad.position.set(isLeftArm ? 0.058 : -0.058, -0.05, 0);
      shoulderPad.castShadow = true;
      armPivot.add(shoulderPad);
    }

    const forearmPivot = new THREE.Group();
    forearmPivot.position.set(0, -0.28, 0);
    armPivot.add(forearmPivot);

    const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.054, 8, 8), lowerArmMat);
    forearmPivot.add(elbow);

    if (!isStreetIcon) {
      const elbowPad = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.07, 0.04), darkGearMat);
      elbowPad.position.set(0, 0, -0.05);
      forearmPivot.add(elbowPad);
    }

    const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.044, 0.25, 12), lowerArmMat);
    forearm.position.y = -0.13;
    forearm.castShadow = true;
    forearmPivot.add(forearm);

    if (isStreetIcon && !isLeftArm) {
      const watchBand = new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.044, 0.024, 12), goldMat);
      watchBand.position.set(0, -0.225, 0);
      forearmPivot.add(watchBand);

      const watchFace = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.016, 12), goldMat);
      watchFace.rotation.z = Math.PI / 2;
      watchFace.position.set(-0.042, -0.225, 0.012);
      forearmPivot.add(watchFace);
    }

    // Hands / Tactical Gloves
    const hand = new THREE.Group();
    hand.position.set(0, -0.275, 0);
    const palm = new THREE.Mesh(new THREE.BoxGeometry(0.064, 0.078, 0.046), handMat);
    palm.castShadow = true;
    const knuckles = new THREE.Mesh(new THREE.CapsuleGeometry(0.025, 0.044, 4, 8), handMat);
    knuckles.rotation.z = Math.PI / 2;
    knuckles.position.set(0, -0.022, 0.025);
    const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.014, 0.028, 4, 6), handMat);
    thumb.position.set(isLeftArm ? -0.034 : 0.034, -0.005, 0.025);
    thumb.rotation.x = 0.4;
    hand.add(palm, knuckles, thumb);
    forearmPivot.add(hand);

    torso.add(armPivot);
    return { armPivot, forearmPivot };
  };

  const rightArmParts = buildArm(-0.268, false);
  const leftArmParts = buildArm(0.268, true);

  const weaponMount = new THREE.Group();
  weaponMount.position.set(0, -0.28, 0.045);
  rightArmParts.forearmPivot.add(weaponMount);

  const muzzlePoint = new THREE.Object3D();
  muzzlePoint.position.set(0, 0.04, 0.78);
  weaponMount.add(muzzlePoint);

  // Dynamic 3D Crossed-Plane Muzzle Flash (hidden until shot fired)
  const muzzleFlash = new THREE.Group();
  const flashMat = new THREE.MeshBasicMaterial({
    map: textures.muzzleFlashMap,
    transparent: true,
    opacity: 0.95,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const flashPlane1 = new THREE.Mesh(new THREE.PlaneGeometry(0.48, 0.48), flashMat);
  const flashPlane2 = new THREE.Mesh(new THREE.PlaneGeometry(0.48, 0.48), flashMat);
  flashPlane2.rotation.z = Math.PI / 4;
  const flashPlane3 = new THREE.Mesh(new THREE.PlaneGeometry(0.48, 0.48), flashMat);
  flashPlane3.rotation.y = Math.PI / 2;
  muzzleFlash.add(flashPlane1, flashPlane2, flashPlane3);
  muzzleFlash.visible = false;
  muzzlePoint.add(muzzleFlash);

  // Parachute
  const parachute = new THREE.Group();
  parachute.position.set(0, 1.35, -0.1);
  const canopyMat = new THREE.MeshStandardMaterial({
    color: skin.jacketColor,
    map: textures.tacticalFabricMap,
    roughness: 0.55,
    metalness: 0.1,
    side: THREE.DoubleSide,
  });
  const canopyMain = new THREE.Mesh(
    new THREE.CylinderGeometry(1.7, 2.0, 0.65, 14, 1, true, 0, Math.PI),
    canopyMat
  );
  canopyMain.rotation.z = Math.PI / 2;
  canopyMain.rotation.y = Math.PI / 2;
  canopyMain.position.y = 1.4;
  parachute.add(canopyMain);

  const canopyTop = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.18, 1.45), canopyMat);
  canopyTop.position.y = 2.05;
  parachute.add(canopyTop);

  const cableMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.5 });
  [-1.1, 1.1].forEach((cx) => {
    const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 2.0, 4), cableMat);
    cable.position.set(cx * 0.5, 1.0, 0);
    cable.rotation.z = cx > 0 ? -0.35 : 0.35;
    parachute.add(cable);
  });
  parachute.visible = false;
  torso.add(parachute);

  return {
    root,
    hips,
    torso,
    head,
    leftArm: leftArmParts.armPivot,
    rightArm: rightArmParts.armPivot,
    leftForearm: leftArmParts.forearmPivot,
    rightForearm: rightArmParts.forearmPivot,
    weaponMount,
    leftLeg: leftLegParts.legPivot,
    rightLeg: rightLegParts.legPivot,
    leftShin: leftLegParts.shinPivot,
    rightShin: rightLegParts.shinPivot,
    parachute,
    muzzlePoint,
    muzzleFlash,
    contactShadow,
    materialsToDispose: [
      skinMat,
      bareSkinMat,
      torsoMat,
      leftArmMat,
      rightArmMat,
      jacketMat,
      kevlarMat,
      tacticalPantsMat,
      pantsMat,
      hairMat,
      headphoneSilverMat,
      headphoneBandMat,
      cordMat,
      goldMat,
      pendantPlateMat,
      leatherMat,
      darkGearMat,
      bootMat,
      silverBuckleMat,
      sneakerWhiteMat,
      sneakerSoleMat,
      helmetMat,
      visorMat,
      accentMat,
      shadowMat,
      flashMat,
      canopyMat,
      cableMat,
    ],
  };
}

export function createWeaponModel(weaponId: WeaponId): THREE.Group {
  const gun = new THREE.Group();
  const metalDark = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.28, metalness: 0.85 });
  const metalBarrel = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.2, metalness: 0.92 });
  const polymer = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.75, metalness: 0.1 });

  let accentHex = 0xd97706;
  if (weaponId === 'mp40') accentHex = 0x06b6d4;
  if (weaponId === 'm1887') accentHex = 0xef4444;
  if (weaponId === 'awm') accentHex = 0x65a30d;
  if (weaponId === 'm500') accentHex = 0x94a3b8;

  const accent = new THREE.MeshStandardMaterial({ color: accentHex, roughness: 0.42, metalness: 0.45 });

  if (weaponId === 'm500') {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.09, 0.28), metalDark);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.24, 8), metalBarrel);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.02, 0.16);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.14, 0.08), polymer);
    grip.position.set(0, -0.09, -0.06);
    grip.rotation.x = 0.22;
    gun.add(frame, barrel, grip);
  } else if (weaponId === 'awm') {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.56), accent);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.026, 0.65, 8), metalBarrel);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.02, 0.52);
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.13, 0.28), polymer);
    stock.position.set(0, -0.02, -0.35);
    const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.3, 10), metalDark);
    scope.rotation.x = Math.PI / 2;
    scope.position.set(0, 0.1, 0.05);
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, 0.1), metalDark);
    mag.position.set(0, -0.1, 0.08);
    gun.add(body, barrel, stock, scope, mag);
  } else if (weaponId === 'm1887') {
    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.32), accent);
    const barrelTop = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.55, 8), metalBarrel);
    barrelTop.rotation.x = Math.PI / 2;
    barrelTop.position.set(0, 0.03, 0.38);
    const barrelBot = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.52, 8), metalBarrel);
    barrelBot.rotation.x = Math.PI / 2;
    barrelBot.position.set(0, -0.01, 0.36);
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.11, 0.26), polymer);
    stock.position.set(0, -0.03, -0.24);
    stock.rotation.x = 0.15;
    gun.add(receiver, barrelTop, barrelBot, stock);
  } else if (weaponId === 'scar') {
    // 9-Part Detailed Tactical Assault Rifle (SCAR-L)
    const upperReceiver = new THREE.Mesh(new THREE.BoxGeometry(0.072, 0.078, 0.48), accent);
    upperReceiver.position.set(0, 0.028, 0.05);

    const lowerReceiver = new THREE.Mesh(new THREE.BoxGeometry(0.066, 0.055, 0.32), metalDark);
    lowerReceiver.position.set(0, -0.025, 0.0);

    const topRail = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.018, 0.44), metalDark);
    topRail.position.set(0, 0.072, 0.06);

    const holoHousing = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.056, 0.095), polymer);
    holoHousing.position.set(0, 0.102, 0.01);

    const holoLens = new THREE.Mesh(
      new THREE.PlaneGeometry(0.036, 0.036),
      new THREE.MeshStandardMaterial({
        color: 0xfef08a,
        emissive: 0xef4444,
        emissiveIntensity: 0.9,
        transparent: true,
        opacity: 0.65,
        side: THREE.DoubleSide,
      })
    );
    holoLens.position.set(0, 0.106, -0.025);

    const handguard = new THREE.Mesh(new THREE.BoxGeometry(0.064, 0.068, 0.22), accent);
    handguard.position.set(0, 0.018, 0.36);

    const foregrip = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.095, 0.045), polymer);
    foregrip.position.set(0, -0.06, 0.34);
    foregrip.rotation.x = -0.15;

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.018, 0.32, 10), metalBarrel);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.025, 0.56);

    const muzzleBrake = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.022, 0.075, 8), metalDark);
    muzzleBrake.rotation.x = Math.PI / 2;
    muzzleBrake.position.set(0, 0.025, 0.72);

    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.22, 0.078), metalDark);
    mag.position.set(0, -0.145, 0.12);
    mag.rotation.x = -0.18;

    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.13, 0.068), polymer);
    grip.position.set(0, -0.1, -0.09);
    grip.rotation.x = 0.24;

    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.11, 0.25), accent);
    stock.position.set(0, 0.005, -0.28);

    const buttPad = new THREE.Mesh(new THREE.BoxGeometry(0.064, 0.125, 0.035), polymer);
    buttPad.position.set(0, -0.005, -0.4);

    gun.add(
      upperReceiver,
      lowerReceiver,
      topRail,
      holoHousing,
      holoLens,
      handguard,
      foregrip,
      barrel,
      muzzleBrake,
      mag,
      grip,
      stock,
      buttPad
    );
  } else {
    // MP40 composite SMG
    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.11, 0.36), accent);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.25, 8), metalBarrel);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.02, 0.28);
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.2, 0.075), metalDark);
    mag.position.set(0, -0.14, 0.1);
    mag.rotation.x = -0.15;
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.13, 0.07), polymer);
    grip.position.set(0, -0.1, -0.08);
    grip.rotation.x = 0.2;
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.1, 0.24), polymer);
    stock.position.set(0, -0.01, -0.28);
    const sight = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.055, 0.12), metalDark);
    sight.position.set(0, 0.085, 0.02);
    gun.add(receiver, barrel, mag, grip, stock, sight);
  }

  return gun;
}

export function createGlooWallMesh(glooHexMap: THREE.Texture): THREE.Group {
  const group = new THREE.Group();

  // Curved tactical energy shield (3-part composite: curved hex shield, reinforced base, glowing top trim)
  const shieldGeo = new THREE.CylinderGeometry(2.6, 2.6, 2.35, 16, 1, true, -Math.PI * 0.28, Math.PI * 0.56);
  const shieldMat = new THREE.MeshPhysicalMaterial({
    map: glooHexMap,
    color: 0x22d3ee,
    emissive: 0x0891b2,
    emissiveIntensity: 0.45,
    roughness: 0.22,
    metalness: 0.35,
    transparent: true,
    opacity: 0.88,
    side: THREE.DoubleSide,
  });
  const shield = new THREE.Mesh(shieldGeo, shieldMat);
  shield.position.set(0, 1.18, -2.0);
  shield.castShadow = true;
  shield.receiveShadow = true;
  group.add(shield);

  const trimGeo = new THREE.CylinderGeometry(2.63, 2.63, 0.14, 16, 1, true, -Math.PI * 0.28, Math.PI * 0.56);
  const trimMat = new THREE.MeshStandardMaterial({
    color: 0x67e8f9,
    emissive: 0x22d3ee,
    emissiveIntensity: 0.85,
    roughness: 0.2,
    metalness: 0.8,
    side: THREE.DoubleSide,
  });
  const topTrim = new THREE.Mesh(trimGeo, trimMat);
  topTrim.position.set(0, 2.36, -2.0);
  group.add(topTrim);

  const baseAnchor = new THREE.Mesh(
    new THREE.BoxGeometry(2.8, 0.18, 0.35),
    new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.45, metalness: 0.7 })
  );
  baseAnchor.position.set(0, 0.09, 0.45);
  baseAnchor.castShadow = true;
  group.add(baseAnchor);

  return group;
}

export interface CompoundBuildResult {
  group: THREE.Group;
  colliders: BoxCollider[];
}

export const MAP_SETTLEMENT_CENTERS: Array<{ x: number; z: number }> = [
  { x: 0, z: -28 },
  { x: -24, z: -124 },
  { x: 138, z: -118 },
  { x: 176, z: 10 },
  { x: 132, z: 132 },
  { x: 4, z: 156 },
  { x: -132, z: 128 },
  { x: -168, z: -4 },
  { x: -134, z: -132 },
];

export function createMapCompounds(textures: ProceduralTextureSet): CompoundBuildResult {
  const group = new THREE.Group();
  const colliders: BoxCollider[] = [];

  const concreteMat = new THREE.MeshStandardMaterial({
    map: textures.concreteMap,
    bumpMap: textures.concreteBumpMap,
    bumpScale: 0.06,
    roughness: 0.85,
    metalness: 0.05,
  });
  const roofMat = new THREE.MeshStandardMaterial({
    map: textures.corrugatedMap,
    roughness: 0.45,
    metalness: 0.65,
  });
  const pillarMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.5,
    metalness: 0.6,
  });
  const stonePlinthMat = new THREE.MeshStandardMaterial({
    color: 0x57534e,
    bumpMap: textures.concreteBumpMap,
    bumpScale: 0.09,
    roughness: 0.92,
    metalness: 0.04,
  });
  const stuccoMat = new THREE.MeshStandardMaterial({
    map: textures.stuccoWarmMap,
    bumpMap: textures.concreteBumpMap,
    bumpScale: 0.04,
    roughness: 0.84,
    metalness: 0.03,
  });
  const brickMat = new THREE.MeshStandardMaterial({
    map: textures.brickWallMap,
    bumpMap: textures.concreteBumpMap,
    bumpScale: 0.07,
    roughness: 0.86,
    metalness: 0.04,
  });
  const woodMat = new THREE.MeshStandardMaterial({
    map: textures.woodPlankMap,
    roughness: 0.86,
    metalness: 0.04,
  });
  const darkTimberMat = new THREE.MeshStandardMaterial({
    color: 0x3e2723,
    roughness: 0.82,
    metalness: 0.06,
  });
  const tileRoofMat = new THREE.MeshStandardMaterial({
    map: textures.roofTileMap,
    roughness: 0.72,
    metalness: 0.08,
  });
  const slateRoofMat = new THREE.MeshStandardMaterial({
    color: 0x2c353d,
    roughness: 0.68,
    metalness: 0.18,
  });
  const windowGlassMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.15,
    metalness: 0.75,
  });
  const crateMat = new THREE.MeshStandardMaterial({
    map: textures.crateMap,
    roughness: 0.82,
    metalness: 0.05,
  });
  const containerRedMat = new THREE.MeshStandardMaterial({
    map: textures.containerRedMap,
    roughness: 0.48,
    metalness: 0.55,
  });
  const containerTealMat = new THREE.MeshStandardMaterial({
    map: textures.containerTealMap,
    roughness: 0.48,
    metalness: 0.55,
  });

  const addBoxCollider = (cx: number, cy: number, cz: number, sx: number, sy: number, sz: number) => {
    colliders.push({
      minX: cx - sx / 2,
      maxX: cx + sx / 2,
      minY: cy - sy / 2,
      maxY: cy + sy / 2,
      minZ: cz - sz / 2,
      maxZ: cz + sz / 2,
    });
  };

  // Transforms local offset (lx, ly, lz) rotated by rotY around Y axis into world AABB collider
  const addLocalCollider = (
    cx: number,
    baseY: number,
    cz: number,
    rotY: number,
    lx: number,
    ly: number,
    lz: number,
    sx: number,
    sy: number,
    sz: number
  ) => {
    const c = Math.cos(rotY);
    const s = Math.sin(rotY);
    const wx = cx + lx * c + lz * s;
    const wz = cz - lx * s + lz * c;
    const absC = Math.abs(c);
    const absS = Math.abs(s);
    const wsx = sx * absC + sz * absS;
    const wsz = sx * absS + sz * absC;
    addBoxCollider(wx, baseY + ly, wz, wsx, sy, wsz);
  };

  // Sample footprint ground heights so buildings sit firmly embedded into rugged slopes without floating
  const sampleFootprintY = (cx: number, cz: number, hw: number, hd: number) => {
    const hC = groundHeightAt(cx, cz);
    const h1 = groundHeightAt(cx - hw, cz - hd);
    const h2 = groundHeightAt(cx + hw, cz - hd);
    const h3 = groundHeightAt(cx - hw, cz + hd);
    const h4 = groundHeightAt(cx + hw, cz + hd);
    return Math.max(hC, (h1 + h2 + h3 + h4) * 0.25 + 0.15);
  };

  // 1. Industrial Bunker / Warehouse with deep stone plinth & doorways
  const buildWarehouse = (cx: number, cz: number, rotY = 0) => {
    const baseY = sampleFootprintY(cx, cz, 5.2, 6.5);
    const w = 11;
    const d = 14;
    const h = 4.4;
    const bGroup = new THREE.Group();
    bGroup.position.set(cx, baseY, cz);
    bGroup.rotation.y = rotY;

    const plinth = new THREE.Mesh(new THREE.BoxGeometry(w + 0.9, 3.8, d + 0.9), stonePlinthMat);
    plinth.position.y = -1.7;
    plinth.receiveShadow = true;
    plinth.castShadow = true;
    bGroup.add(plinth);

    const floor = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, 0.35, d + 0.6), pillarMat);
    floor.position.y = 0.2;
    floor.receiveShadow = true;
    bGroup.add(floor);

    const wallLeft = new THREE.Mesh(new THREE.BoxGeometry(0.45, h, d), concreteMat);
    wallLeft.position.set(-w / 2, h / 2 + 0.2, 0);
    wallLeft.castShadow = true;
    wallLeft.receiveShadow = true;
    bGroup.add(wallLeft);
    addLocalCollider(cx, baseY, cz, rotY, -w / 2, h / 2 + 0.2, 0, 0.55, h + 1, d);

    const wallRight = new THREE.Mesh(new THREE.BoxGeometry(0.45, h, d), concreteMat);
    wallRight.position.set(w / 2, h / 2 + 0.2, 0);
    wallRight.castShadow = true;
    wallRight.receiveShadow = true;
    bGroup.add(wallRight);
    addLocalCollider(cx, baseY, cz, rotY, w / 2, h / 2 + 0.2, 0, 0.55, h + 1, d);

    const wingW = (w - 3.6) / 2;
    [-1, 1].forEach((zSign) => {
      [-1, 1].forEach((xSign) => {
        const wing = new THREE.Mesh(new THREE.BoxGeometry(wingW, h, 0.45), concreteMat);
        wing.position.set(xSign * (1.8 + wingW / 2), h / 2 + 0.2, zSign * (d / 2));
        wing.castShadow = true;
        wing.receiveShadow = true;
        bGroup.add(wing);
        addLocalCollider(cx, baseY, cz, rotY, xSign * (1.8 + wingW / 2), h / 2 + 0.2, zSign * (d / 2), wingW, h + 1, 0.55);
      });
      const lintel = new THREE.Mesh(new THREE.BoxGeometry(3.8, 1.1, 0.5), pillarMat);
      lintel.position.set(0, h - 0.35, zSign * (d / 2));
      bGroup.add(lintel);
    });

    const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 1.4, 0.35, d + 1.4), roofMat);
    roof.position.y = h + 0.35;
    roof.castShadow = true;
    roof.receiveShadow = true;
    bGroup.add(roof);

    const innerCrate = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.4, 1.6), crateMat);
    innerCrate.position.set(2.2, 1.0, -1.5);
    innerCrate.castShadow = true;
    innerCrate.receiveShadow = true;
    bGroup.add(innerCrate);
    addLocalCollider(cx, baseY, cz, rotY, 2.2, 1.0, -1.5, 1.65, 1.5, 1.65);

    group.add(bGroup);
  };

  // 2. Two-Story Island Villa (Stucco Walls, Front Balcony, Tiled Hip Roof, Chimney, Steps)
  const buildTwoStoryVilla = (cx: number, cz: number, rotY = 0) => {
    const baseY = sampleFootprintY(cx, cz, 4.6, 4.6);
    const w = 9.4;
    const d = 9.2;
    const h1 = 3.2;
    const h2 = 3.0;
    const vGroup = new THREE.Group();
    vGroup.position.set(cx, baseY, cz);
    vGroup.rotation.y = rotY;

    // Deep stone plinth foundation
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(w + 0.8, 4.0, d + 0.8), stonePlinthMat);
    plinth.position.y = -1.85;
    plinth.castShadow = true;
    plinth.receiveShadow = true;
    vGroup.add(plinth);

    // Entry concrete steps on front & back
    [-1, 1].forEach((zSign) => {
      const step = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.55, 1.4), stonePlinthMat);
      step.position.set(0, -0.05, zSign * (d / 2 + 0.55));
      step.receiveShadow = true;
      vGroup.add(step);
    });

    // Ground floor side walls with framed windows
    [-1, 1].forEach((xSign) => {
      const sideWall = new THREE.Mesh(new THREE.BoxGeometry(0.42, h1, d), stuccoMat);
      sideWall.position.set(xSign * (w / 2), h1 / 2 + 0.15, 0);
      sideWall.castShadow = true;
      sideWall.receiveShadow = true;
      vGroup.add(sideWall);
      addLocalCollider(cx, baseY, cz, rotY, xSign * (w / 2), h1 / 2 + 0.15, 0, 0.5, h1 + 0.6, d);

      // Decorative window panes
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.48, 1.1, 2.2), windowGlassMat);
      win.position.set(xSign * (w / 2), 1.85, 0);
      vGroup.add(win);
    });

    // Ground floor front & rear walls with open 3.2m doorways
    const wingW = (w - 3.2) / 2;
    [-1, 1].forEach((zSign) => {
      [-1, 1].forEach((xSign) => {
        const wing = new THREE.Mesh(new THREE.BoxGeometry(wingW, h1, 0.42), stuccoMat);
        wing.position.set(xSign * (1.6 + wingW / 2), h1 / 2 + 0.15, zSign * (d / 2));
        wing.castShadow = true;
        wing.receiveShadow = true;
        vGroup.add(wing);
        addLocalCollider(cx, baseY, cz, rotY, xSign * (1.6 + wingW / 2), h1 / 2 + 0.15, zSign * (d / 2), wingW, h1 + 0.6, 0.5);
      });
      const lintel = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.85, 0.46), darkTimberMat);
      lintel.position.set(0, h1 - 0.25, zSign * (d / 2));
      vGroup.add(lintel);
    });

    // Second-story floor slab + front cantilevered balcony deck
    const upperSlab = new THREE.Mesh(new THREE.BoxGeometry(w + 0.7, 0.34, d + 2.1), concreteMat);
    upperSlab.position.set(0, h1 + 0.3, 0.55);
    upperSlab.castShadow = true;
    upperSlab.receiveShadow = true;
    vGroup.add(upperSlab);

    // Balcony front & side railings
    const balcFront = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, 0.95, 0.18), darkTimberMat);
    balcFront.position.set(0, h1 + 0.92, d / 2 + 1.5);
    balcFront.castShadow = true;
    vGroup.add(balcFront);

    // Second story enclosed room
    const upperRoom = new THREE.Mesh(new THREE.BoxGeometry(w - 0.6, h2, d - 0.8), stuccoMat);
    upperRoom.position.set(0, h1 + 0.45 + h2 / 2, -0.2);
    upperRoom.castShadow = true;
    upperRoom.receiveShadow = true;
    vGroup.add(upperRoom);

    // Upper floor windows
    const upperWin = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.35, d - 0.68), windowGlassMat);
    upperWin.position.set(0, h1 + 1.9, -0.2);
    vGroup.add(upperWin);

    // Terracotta Pitched Hip Roof + Eaves + Chimney
    const roofPeak = new THREE.Mesh(new THREE.ConeGeometry(7.2, 2.35, 4), tileRoofMat);
    roofPeak.rotation.y = Math.PI / 4;
    roofPeak.scale.set(1.06, 1, 1.02);
    roofPeak.position.set(0, h1 + h2 + 1.55, -0.2);
    roofPeak.castShadow = true;
    roofPeak.receiveShadow = true;
    vGroup.add(roofPeak);

    const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.95, 2.4, 0.95), brickMat);
    chimney.position.set(w * 0.28, h1 + h2 + 1.65, -d * 0.22);
    chimney.castShadow = true;
    vGroup.add(chimney);

    // Interior crate cover
    const crate = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.15, 1.3), crateMat);
    crate.position.set(-2.1, 0.72, 1.1);
    crate.castShadow = true;
    vGroup.add(crate);
    addLocalCollider(cx, baseY, cz, rotY, -2.1, 0.72, 1.1, 1.35, 1.2, 1.35);

    group.add(vGroup);
  };

  // 3. Mountain Timber Cabin / Lodge (Wood Plank Walls, Veranda Porch Posts, Gabled Roof, Stone Chimney)
  const buildTimberCabin = (cx: number, cz: number, rotY = 0) => {
    const baseY = sampleFootprintY(cx, cz, 4.0, 4.4);
    const w = 7.8;
    const d = 8.4;
    const h = 3.1;
    const cGroup = new THREE.Group();
    cGroup.position.set(cx, baseY, cz);
    cGroup.rotation.y = rotY;

    const plinth = new THREE.Mesh(new THREE.BoxGeometry(w + 0.7, 3.8, d + 2.4), stonePlinthMat);
    plinth.position.set(0, -1.75, 0.65);
    plinth.receiveShadow = true;
    plinth.castShadow = true;
    cGroup.add(plinth);

    // Wooden porch deck
    const deck = new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, 0.28, d + 2.1), darkTimberMat);
    deck.position.set(0, 0.18, 0.65);
    deck.receiveShadow = true;
    cGroup.add(deck);

    // Left & right timber walls
    [-1, 1].forEach((xSign) => {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(0.38, h, d), woodMat);
      wall.position.set(xSign * (w / 2), h / 2 + 0.28, -0.35);
      wall.castShadow = true;
      wall.receiveShadow = true;
      cGroup.add(wall);
      addLocalCollider(cx, baseY, cz, rotY, xSign * (w / 2), h / 2 + 0.28, -0.35, 0.46, h + 0.6, d);
    });

    // Back wall solid with window + Front wall with open 2.8m doorway
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.38), woodMat);
    backWall.position.set(0, h / 2 + 0.28, -d / 2 - 0.35);
    backWall.castShadow = true;
    cGroup.add(backWall);
    addLocalCollider(cx, baseY, cz, rotY, 0, h / 2 + 0.28, -d / 2 - 0.35, w, h + 0.6, 0.46);

    const wingW = (w - 2.8) / 2;
    [-1, 1].forEach((xSign) => {
      const frontWing = new THREE.Mesh(new THREE.BoxGeometry(wingW, h, 0.38), woodMat);
      frontWing.position.set(xSign * (1.4 + wingW / 2), h / 2 + 0.28, d / 2 - 0.35);
      frontWing.castShadow = true;
      cGroup.add(frontWing);
      addLocalCollider(cx, baseY, cz, rotY, xSign * (1.4 + wingW / 2), h / 2 + 0.28, d / 2 - 0.35, wingW, h + 0.6, 0.46);
    });

    // Porch timber posts
    [-w * 0.42, 0, w * 0.42].forEach((px) => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, h + 0.1, 6), darkTimberMat);
      post.position.set(px, h / 2 + 0.3, d / 2 + 1.45);
      post.castShadow = true;
      cGroup.add(post);
    });

    // Steep gabled two-slope roof extending over porch
    [-1, 1].forEach((side) => {
      const slope = new THREE.Mesh(new THREE.BoxGeometry(w * 0.66, 0.24, d + 2.7), slateRoofMat);
      slope.position.set(side * (w * 0.26), h + 1.12, 0.55);
      slope.rotation.z = -side * 0.46;
      slope.castShadow = true;
      slope.receiveShadow = true;
      cGroup.add(slope);
    });
    const ridgeBeam = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, d + 2.8), darkTimberMat);
    ridgeBeam.position.set(0, h + 2.02, 0.55);
    cGroup.add(ridgeBeam);

    // Stone chimney on left flank
    const chimney = new THREE.Mesh(new THREE.BoxGeometry(1.1, 5.2, 1.25), stonePlinthMat);
    chimney.position.set(-w / 2 - 0.35, 2.7, -1.2);
    chimney.castShadow = true;
    cGroup.add(chimney);

    group.add(cGroup);
  };

  // 4. Urban Brick Townhouse (Red Brick Facade, Concrete Pilasters, Flat Parapet Roof, Rooftop Water Tank)
  const buildBrickTownhouse = (cx: number, cz: number, rotY = 0) => {
    const baseY = sampleFootprintY(cx, cz, 4.8, 3.8);
    const w = 10.2;
    const d = 7.8;
    const h = 4.2;
    const bGroup = new THREE.Group();
    bGroup.position.set(cx, baseY, cz);
    bGroup.rotation.y = rotY;

    const plinth = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, 3.8, d + 0.6), stonePlinthMat);
    plinth.position.y = -1.75;
    plinth.receiveShadow = true;
    bGroup.add(plinth);

    const floor = new THREE.Mesh(new THREE.BoxGeometry(w + 0.3, 0.3, d + 0.3), concreteMat);
    floor.position.y = 0.16;
    floor.receiveShadow = true;
    bGroup.add(floor);

    [-1, 1].forEach((xSign) => {
      const side = new THREE.Mesh(new THREE.BoxGeometry(0.44, h, d), brickMat);
      side.position.set(xSign * (w / 2), h / 2 + 0.16, 0);
      side.castShadow = true;
      side.receiveShadow = true;
      bGroup.add(side);
      addLocalCollider(cx, baseY, cz, rotY, xSign * (w / 2), h / 2 + 0.16, 0, 0.52, h + 0.6, d);
    });

    const wingW = (w - 3.4) / 2;
    [-1, 1].forEach((zSign) => {
      [-1, 1].forEach((xSign) => {
        const wing = new THREE.Mesh(new THREE.BoxGeometry(wingW, h, 0.44), brickMat);
        wing.position.set(xSign * (1.7 + wingW / 2), h / 2 + 0.16, zSign * (d / 2));
        wing.castShadow = true;
        wing.receiveShadow = true;
        bGroup.add(wing);
        addLocalCollider(cx, baseY, cz, rotY, xSign * (1.7 + wingW / 2), h / 2 + 0.16, zSign * (d / 2), wingW, h + 0.6, 0.52);
      });
      const lintel = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.95, 0.48), concreteMat);
      lintel.position.set(0, h - 0.3, zSign * (d / 2));
      bGroup.add(lintel);
    });

    // Concrete corner pilasters
    [-1, 1].forEach((xS) => {
      [-1, 1].forEach((zS) => {
        const pilaster = new THREE.Mesh(new THREE.BoxGeometry(0.6, h + 0.3, 0.6), concreteMat);
        pilaster.position.set(xS * (w / 2), h / 2 + 0.25, zS * (d / 2));
        pilaster.castShadow = true;
        bGroup.add(pilaster);
      });
    });

    // Flat Roof + Parapet Rim + Rooftop Water Tank
    const roofDeck = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, 0.32, d + 0.6), concreteMat);
    roofDeck.position.y = h + 0.25;
    roofDeck.castShadow = true;
    roofDeck.receiveShadow = true;
    bGroup.add(roofDeck);

    [-1, 1].forEach((zS) => {
      const parapet = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, 0.72, 0.26), brickMat);
      parapet.position.set(0, h + 0.72, zS * (d / 2 + 0.16));
      bGroup.add(parapet);
    });

    const waterTank = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 1.5, 10), pillarMat);
    waterTank.position.set(2.4, h + 1.15, -1.2);
    waterTank.castShadow = true;
    bGroup.add(waterTank);

    group.add(bGroup);
  };

  // 5. Village Cottage (Painted Plaster, Corrugated Porch Awning, Pitched Roof)
  const buildVillageCottage = (cx: number, cz: number, rotY = 0, tintHex = 0xd9a05b) => {
    const baseY = sampleFootprintY(cx, cz, 3.2, 3.2);
    const w = 6.2;
    const d = 6.2;
    const h = 2.95;
    const gGroup = new THREE.Group();
    gGroup.position.set(cx, baseY, cz);
    gGroup.rotation.y = rotY;

    const wallPaintMat = new THREE.MeshStandardMaterial({
      map: textures.stuccoWarmMap,
      color: tintHex,
      roughness: 0.84,
      metalness: 0.03,
    });

    const plinth = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, 3.6, d + 0.6), stonePlinthMat);
    plinth.position.y = -1.65;
    plinth.receiveShadow = true;
    gGroup.add(plinth);

    const floor = new THREE.Mesh(new THREE.BoxGeometry(w + 0.3, 0.26, d + 0.3), concreteMat);
    floor.position.y = 0.14;
    floor.receiveShadow = true;
    gGroup.add(floor);

    [-1, 1].forEach((xSign) => {
      const side = new THREE.Mesh(new THREE.BoxGeometry(0.36, h, d), wallPaintMat);
      side.position.set(xSign * (w / 2), h / 2 + 0.14, 0);
      side.castShadow = true;
      gGroup.add(side);
      addLocalCollider(cx, baseY, cz, rotY, xSign * (w / 2), h / 2 + 0.14, 0, 0.44, h + 0.5, d);
    });

    const back = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.36), wallPaintMat);
    back.position.set(0, h / 2 + 0.14, -d / 2);
    back.castShadow = true;
    gGroup.add(back);
    addLocalCollider(cx, baseY, cz, rotY, 0, h / 2 + 0.14, -d / 2, w, h + 0.5, 0.44);

    const wingW = (w - 2.6) / 2;
    [-1, 1].forEach((xSign) => {
      const frontWing = new THREE.Mesh(new THREE.BoxGeometry(wingW, h, 0.36), wallPaintMat);
      frontWing.position.set(xSign * (1.3 + wingW / 2), h / 2 + 0.14, d / 2);
      frontWing.castShadow = true;
      gGroup.add(frontWing);
      addLocalCollider(cx, baseY, cz, rotY, xSign * (1.3 + wingW / 2), h / 2 + 0.14, d / 2, wingW, h + 0.5, 0.44);
    });

    // Porch awning
    const awning = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.14, 1.5), roofMat);
    awning.position.set(0, h - 0.15, d / 2 + 0.72);
    awning.rotation.x = 0.25;
    awning.castShadow = true;
    gGroup.add(awning);

    // Pitched cottage roof
    const roof = new THREE.Mesh(new THREE.ConeGeometry(5.1, 1.75, 4), tileRoofMat);
    roof.rotation.y = Math.PI / 4;
    roof.position.set(0, h + 0.95, 0);
    roof.castShadow = true;
    roof.receiveShadow = true;
    gGroup.add(roof);

    group.add(gGroup);
  };

  // Helper: Concrete Tactical Cover Wall (Jersey Barrier + Footing + Steel Cap)
  const buildConcreteCoverWall = (cx: number, cz: number, rotY = 0) => {
    const baseY = groundHeightAt(cx, cz) - 0.14;
    const wGroup = new THREE.Group();
    wGroup.position.set(cx, baseY, cz);
    wGroup.rotation.y = rotY;

    const wallLen = 4.2;
    const wallH = 1.48;

    const footing = new THREE.Mesh(new THREE.BoxGeometry(wallLen + 0.25, 0.65, 0.85), concreteMat);
    footing.position.y = 0.0;
    footing.castShadow = true;
    footing.receiveShadow = true;
    wGroup.add(footing);

    const wallBody = new THREE.Mesh(new THREE.BoxGeometry(wallLen, wallH - 0.24, 0.48), concreteMat);
    wallBody.position.y = 0.28 + (wallH - 0.24) / 2;
    wallBody.castShadow = true;
    wallBody.receiveShadow = true;
    wGroup.add(wallBody);

    const topCap = new THREE.Mesh(new THREE.BoxGeometry(wallLen + 0.1, 0.12, 0.54), pillarMat);
    topCap.position.y = wallH + 0.04;
    topCap.castShadow = true;
    wGroup.add(topCap);

    [-1.4, 1.4].forEach((bx) => {
      const buttress = new THREE.Mesh(new THREE.BoxGeometry(0.28, 1.05, 0.82), pillarMat);
      buttress.position.set(bx, 0.52, 0);
      buttress.castShadow = true;
      wGroup.add(buttress);
    });

    group.add(wGroup);

    const absCos = Math.abs(Math.cos(rotY));
    const absSin = Math.abs(Math.sin(rotY));
    const sx = wallLen * absCos + 0.82 * absSin;
    const sz = wallLen * absSin + 0.82 * absCos;
    addBoxCollider(cx, baseY + wallH / 2, cz, sx, wallH + 0.25, sz);
  };

  // Helper: 7-part Watchtower
  const buildWatchtower = (cx: number, cz: number) => {
    const baseY = sampleFootprintY(cx, cz, 1.8, 1.8);
    const tGroup = new THREE.Group();
    tGroup.position.set(cx, baseY, cz);

    const plinth = new THREE.Mesh(new THREE.BoxGeometry(4.6, 2.4, 4.6), stonePlinthMat);
    plinth.position.y = -1.1;
    plinth.receiveShadow = true;
    tGroup.add(plinth);

    const legOffsets = [
      [-1.8, -1.8],
      [1.8, -1.8],
      [-1.8, 1.8],
      [1.8, 1.8],
    ];
    legOffsets.forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.34, 6.2, 0.34), pillarMat);
      leg.position.set(lx, 3.1, lz);
      leg.castShadow = true;
      tGroup.add(leg);
      addBoxCollider(cx + lx, baseY + 3.1, cz + lz, 0.45, 6.2, 0.45);
    });

    const deck = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.35, 4.4), concreteMat);
    deck.position.y = 3.6;
    deck.castShadow = true;
    deck.receiveShadow = true;
    tGroup.add(deck);

    const rail = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.85, 0.2), concreteMat);
    rail.position.set(0, 4.2, 2.1);
    const railBack = rail.clone();
    railBack.position.z = -2.1;
    tGroup.add(rail, railBack);

    const roof = new THREE.Mesh(new THREE.ConeGeometry(3.4, 1.5, 4), roofMat);
    roof.rotation.y = Math.PI / 4;
    roof.position.y = 6.9;
    roof.castShadow = true;
    tGroup.add(roof);

    group.add(tGroup);
  };

  // Helper: Shipping Container
  const buildContainer = (cx: number, cz: number, teal: boolean, rotY = 0) => {
    const baseY = sampleFootprintY(cx, cz, 1.4, 3.2);
    const cGroup = new THREE.Group();
    cGroup.position.set(cx, baseY, cz);
    cGroup.rotation.y = rotY;

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(2.8, 2.7, 6.6),
      teal ? containerTealMat : containerRedMat
    );
    body.position.y = 1.35;
    body.castShadow = true;
    body.receiveShadow = true;
    cGroup.add(body);

    const plinth = new THREE.Mesh(new THREE.BoxGeometry(2.9, 1.8, 6.7), stonePlinthMat);
    plinth.position.y = -0.85;
    cGroup.add(plinth);

    const frame = new THREE.Mesh(new THREE.BoxGeometry(2.92, 0.18, 6.72), pillarMat);
    frame.position.y = 2.68;
    cGroup.add(frame);

    group.add(cGroup);
    addLocalCollider(cx, baseY, cz, rotY, 0, 1.35, 0, 2.8, 2.8, 6.6);
  };

  const buildCrateCluster = (cx: number, cz: number) => {
    const baseY = groundHeightAt(cx, cz) - 0.12;
    const cluster = new THREE.Group();
    cluster.position.set(cx, baseY, cz);

    const c1 = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.4, 1.5), crateMat);
    c1.position.set(0, 0.7, 0);
    c1.castShadow = true;
    c1.receiveShadow = true;

    const c2 = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.1, 1.2), crateMat);
    c2.position.set(1.4, 0.55, 0.4);
    c2.rotation.y = 0.35;
    c2.castShadow = true;
    c2.receiveShadow = true;

    const c3 = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.95, 1.0), crateMat);
    c3.position.set(0.15, 1.88, 0.05);
    c3.rotation.y = -0.25;
    c3.castShadow = true;

    cluster.add(c1, c2, c3);
    group.add(cluster);

    addBoxCollider(cx, baseY + 1.1, cz, 1.6, 2.3, 1.6);
    addBoxCollider(cx + 1.4, baseY + 0.55, cz + 0.4, 1.3, 1.2, 1.3);
  };

  // === 1. Central Peak Compound (around 0,0, keeping lobby pad 0,6 clear) ===
  buildTwoStoryVilla(0, -26, 0);
  buildBrickTownhouse(24, 18, Math.PI / 2);
  buildVillageCottage(-22, -12, Math.PI / 2, 0xe2c799);
  buildWatchtower(-18, 22);
  buildCrateCluster(12, -8);
  buildConcreteCoverWall(-8, -8, 0.25);
  buildConcreteCoverWall(12, -14, -0.35);
  buildConcreteCoverWall(12, 26, 0.15);

  // === 2. North Factory & Ridge Complex ===
  buildWarehouse(-32, -128, 0);
  buildWarehouse(-10, -142, Math.PI / 2);
  buildContainer(-18, -116, true, Math.PI / 2);
  buildContainer(-18, -108, false, Math.PI / 2);
  buildWatchtower(-50, -112);
  buildCrateCluster(-26, -98);
  buildConcreteCoverWall(-34, -94, 0.15);
  buildConcreteCoverWall(-14, -126, Math.PI / 2);

  // === 3. Northeast Highland Village (Rim Nam) ===
  buildTimberCabin(124, -124, 0);
  buildTimberCabin(148, -114, -Math.PI / 2);
  buildTwoStoryVilla(136, -138, Math.PI);
  buildVillageCottage(116, -104, 0, 0x9ec1a3);
  buildVillageCottage(152, -134, Math.PI / 2, 0xd99b66);
  buildCrateCluster(132, -116);
  buildConcreteCoverWall(118, -114, 0.35);

  // === 4. East Shipyard & Docks ===
  buildWarehouse(172, 22, 0);
  buildContainer(178, -12, true, 0);
  buildContainer(186, -18, false, 0);
  buildContainer(174, 6, false, Math.PI / 2);
  buildContainer(190, 8, true, Math.PI / 2);
  buildBrickTownhouse(154, -22, Math.PI / 2);
  buildCrateCluster(164, -2);
  buildConcreteCoverWall(152, 12, 0.4);
  buildConcreteCoverWall(164, -16, -0.2);

  // === 5. Southeast Coastal Town ===
  buildTwoStoryVilla(130, 128, Math.PI);
  buildBrickTownhouse(148, 144, -Math.PI / 2);
  buildVillageCottage(114, 142, 0, 0xd88c75);
  buildVillageCottage(144, 114, Math.PI / 2, 0xcbd5c0);
  buildWatchtower(118, 114);
  buildConcreteCoverWall(124, 146, 0.15);

  // === 6. South Pochinok Settlement ===
  buildTwoStoryVilla(-22, 152, Math.PI / 2);
  buildBrickTownhouse(28, 148, 0);
  buildVillageCottage(4, 168, Math.PI, 0xe5c185);
  buildVillageCottage(-8, 136, 0, 0x8fb8ca);
  buildWatchtower(14, 174);
  buildCrateCluster(2, 148);
  buildConcreteCoverWall(12, 136, 0.1);
  buildConcreteCoverWall(-14, 164, -0.4);

  // === 7. Southwest Mountain Pass ===
  buildTimberCabin(-136, 122, Math.PI / 2);
  buildTimberCabin(-118, 142, 0);
  buildVillageCottage(-146, 142, 0, 0xd6b588);
  buildWatchtower(-112, 112);
  buildCrateCluster(-128, 128);
  buildConcreteCoverWall(-122, 122, -0.3);

  // === 8. West Bimasakti Strip ===
  buildWarehouse(-172, 12, 0);
  buildBrickTownhouse(-154, -18, Math.PI / 2);
  buildTwoStoryVilla(-176, -34, 0);
  buildContainer(-158, 28, true, 0);
  buildContainer(-172, 34, false, Math.PI / 2);
  buildWatchtower(-146, 36);
  buildCrateCluster(-152, 4);
  buildConcreteCoverWall(-144, 14, Math.PI / 2);
  buildConcreteCoverWall(-162, -4, 0.25);

  // === 9. Northwest Pine Lodge Outpost ===
  buildTimberCabin(-134, -138, 0);
  buildTimberCabin(-114, -120, Math.PI / 2);
  buildVillageCottage(-148, -118, -Math.PI / 2, 0xb8c99a);
  buildWatchtower(-124, -152);
  buildCrateCluster(-126, -128);
  buildConcreteCoverWall(-116, -138, 0.3);

  // === Mid-Island Crossroads & Ring-Road Tactical Checkpoints ===
  buildConcreteCoverWall(0, 62, 0);
  buildConcreteCoverWall(0, -64, 0);
  buildConcreteCoverWall(64, 0, Math.PI / 2);
  buildConcreteCoverWall(-64, 0, Math.PI / 2);
  buildCrateCluster(62, -62);
  buildCrateCluster(-62, 62);
  buildVillageCottage(68, 66, Math.PI / 2, 0xd9a05b);
  buildTimberCabin(-68, -68, 0);
  buildConcreteCoverWall(78, 72, -0.4);
  buildConcreteCoverWall(-78, -74, 0.35);

  return { group, colliders };
}

export function createLootMesh(type: LootType, weaponId?: WeaponId): THREE.Group {
  const group = new THREE.Group();

  // Glowing tactical loot beacon ring
  let beamColor = 0xf59e0b;
  if (type === 'medkit') beamColor = 0x22c55e;
  if (type === 'gloowall') beamColor = 0x06b6d4;
  if (type === 'armor') beamColor = 0x3b82f6;
  if (type === 'ammo') beamColor = 0xeab308;
  if (type === 'weapon' && weaponId === 'awm') beamColor = 0xef4444;

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.32, 0.45, 20),
    new THREE.MeshBasicMaterial({
      color: beamColor,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.75,
    })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.05;
  group.add(ring);

  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.22, 1.6, 12, 1, true),
    new THREE.MeshBasicMaterial({
      color: beamColor,
      transparent: true,
      opacity: 0.24,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  beam.position.y = 0.85;
  group.add(beam);

  const itemHolder = new THREE.Group();
  itemHolder.position.y = 0.55;
  itemHolder.name = 'spin';

  if (type === 'weapon' && weaponId) {
    const gun = createWeaponModel(weaponId);
    gun.scale.setScalar(1.35);
    gun.rotation.z = 0.25;
    itemHolder.add(gun);
  } else if (type === 'medkit') {
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(0.46, 0.22, 0.34),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4, metalness: 0.1 })
    );
    const cross1 = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.24, 0.07),
      new THREE.MeshStandardMaterial({ color: 0x16a34a, emissive: 0x16a34a, emissiveIntensity: 0.3 })
    );
    const cross2 = new THREE.Mesh(
      new THREE.BoxGeometry(0.07, 0.24, 0.22),
      new THREE.MeshStandardMaterial({ color: 0x16a34a, emissive: 0x16a34a, emissiveIntensity: 0.3 })
    );
    itemHolder.add(box, cross1, cross2);
  } else if (type === 'gloowall') {
    const core = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.24, 0),
      new THREE.MeshStandardMaterial({
        color: 0x06b6d4,
        emissive: 0x0891b2,
        emissiveIntensity: 0.45,
        roughness: 0.2,
        metalness: 0.7,
      })
    );
    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.16, 0.1, 8),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.3 })
    );
    cap.position.y = 0.24;
    itemHolder.add(core, cap);
  } else if (type === 'armor') {
    const vest = new THREE.Mesh(
      new THREE.BoxGeometry(0.44, 0.48, 0.24),
      new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.38, metalness: 0.55 })
    );
    const plate = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.3, 0.27),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3, metalness: 0.8 })
    );
    itemHolder.add(vest, plate);
  } else {
    const ammoBox = new THREE.Mesh(
      new THREE.BoxGeometry(0.38, 0.26, 0.26),
      new THREE.MeshStandardMaterial({ color: 0x3f6212, roughness: 0.65, metalness: 0.25 })
    );
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.07, 0.28),
      new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.35, metalness: 0.6 })
    );
    itemHolder.add(ammoBox, stripe);
  }

  group.add(itemHolder);
  return group;
}

export function createAirdropCrateMesh(crateMap: THREE.Texture): THREE.Group {
  const group = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(1.7, 1.5, 1.7),
    new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.42,
      metalness: 0.65,
    })
  );
  body.position.y = 0.75;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  const lid = new THREE.Mesh(
    new THREE.BoxGeometry(1.82, 0.28, 1.82),
    new THREE.MeshStandardMaterial({
      color: 0xdc2626,
      map: crateMap,
      roughness: 0.5,
      metalness: 0.2,
    })
  );
  lid.position.y = 1.55;
  lid.castShadow = true;
  group.add(lid);

  const beacon = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.48, 28, 12, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0xef4444,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  beacon.position.y = 15;
  group.add(beacon);

  return group;
}

export function createLobbyPedestal(textures: ProceduralTextureSet): THREE.Group {
  const group = new THREE.Group();

  const steelMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    map: textures.kevlarMap,
    roughnessMap: textures.kevlarRoughnessMap,
    roughness: 0.42,
    metalness: 0.72,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xd97706,
    emissiveIntensity: 0.45,
    roughness: 0.3,
    metalness: 0.8,
  });
  const deckMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    bumpMap: textures.kevlarRoughnessMap,
    bumpScale: 0.02,
    roughness: 0.55,
    metalness: 0.45,
  });

  const basePlinth = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.75, 0.24, 8), steelMat);
  basePlinth.position.y = 0.12;
  basePlinth.receiveShadow = true;
  basePlinth.castShadow = true;
  group.add(basePlinth);

  const deck = new THREE.Mesh(new THREE.CylinderGeometry(1.38, 1.42, 0.08, 16), deckMat);
  deck.position.y = 0.27;
  deck.receiveShadow = true;
  group.add(deck);

  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.42, 0.028, 8, 32), trimMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.28;
  group.add(ring);

  return group;
}

