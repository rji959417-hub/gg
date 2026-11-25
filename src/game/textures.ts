import * as THREE from 'three';

export interface ProceduralTextureSet {
  terrainDetailMap: THREE.CanvasTexture;
  terrainBumpMap: THREE.CanvasTexture;
  concreteMap: THREE.CanvasTexture;
  concreteBumpMap: THREE.CanvasTexture;
  corrugatedMap: THREE.CanvasTexture;
  stuccoWarmMap: THREE.CanvasTexture;
  brickWallMap: THREE.CanvasTexture;
  woodPlankMap: THREE.CanvasTexture;
  roofTileMap: THREE.CanvasTexture;
  crateMap: THREE.CanvasTexture;
  containerRedMap: THREE.CanvasTexture;
  containerTealMap: THREE.CanvasTexture;
  glooHexMap: THREE.CanvasTexture;
  contactShadowMap: THREE.CanvasTexture;
  tacticalFabricMap: THREE.CanvasTexture;
  tacticalFabricBumpMap: THREE.CanvasTexture;
  kevlarMap: THREE.CanvasTexture;
  kevlarRoughnessMap: THREE.CanvasTexture;
  leatherBumpMap: THREE.CanvasTexture;
  muzzleFlashMap: THREE.CanvasTexture;
  heroFaceMap: THREE.CanvasTexture;
  heroTorsoMap: THREE.CanvasTexture;
  heroTorsoBumpMap: THREE.CanvasTexture;
  heroLeftArmMap: THREE.CanvasTexture;
  heroRightArmMap: THREE.CanvasTexture;
  heroPantsMap: THREE.CanvasTexture;
  heroPantsBumpMap: THREE.CanvasTexture;
  silverHairMap: THREE.CanvasTexture;
  richPendantMap: THREE.CanvasTexture;
  skyboxMap: THREE.CanvasTexture;
}

function configureColorTex(
  canvas: HTMLCanvasElement,
  anisotropy: number,
  repeatX = 1,
  repeatY = 1
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = anisotropy;
  tex.needsUpdate = true;
  return tex;
}

function configureDataTex(
  canvas: HTMLCanvasElement,
  anisotropy: number,
  repeatX = 1,
  repeatY = 1
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.NoColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = anisotropy;
  tex.needsUpdate = true;
  return tex;
}

export function createProceduralTextures(maxAnisotropy: number): ProceduralTextureSet {
  const aniso = Math.max(1, Math.min(8, maxAnisotropy));

  // 1. Terrain micro-detail + bump map (512x512 crisp soil, grass blades, pebbles)
  const terrainCanvas = document.createElement('canvas');
  terrainCanvas.width = 512;
  terrainCanvas.height = 512;
  const tCtx = terrainCanvas.getContext('2d')!;
  tCtx.fillStyle = '#e2e6df';
  tCtx.fillRect(0, 0, 512, 512);

  const terrainBumpCanvas = document.createElement('canvas');
  terrainBumpCanvas.width = 512;
  terrainBumpCanvas.height = 512;
  const tbCtx = terrainBumpCanvas.getContext('2d')!;
  tbCtx.fillStyle = '#808080';
  tbCtx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 12000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const isBlade = i % 3 === 0;
    const w = isBlade ? 1.4 : 2 + Math.random() * 3.5;
    const h = isBlade ? 5 + Math.random() * 6 : 2 + Math.random() * 3.5;
    const shade = 185 + Math.floor(Math.random() * 65);
    tCtx.fillStyle = isBlade
      ? `rgb(${shade - 18},${shade},${shade - 24})`
      : `rgb(${shade},${shade - 4},${shade - 12})`;
    tCtx.fillRect(x, y, w, h);

    const bVal = 90 + Math.floor(Math.random() * 85);
    tbCtx.fillStyle = `rgb(${bVal},${bVal},${bVal})`;
    tbCtx.fillRect(x, y, w, h);
  }
  const terrainDetailMap = configureColorTex(terrainCanvas, aniso, 84, 84);
  const terrainBumpMap = configureDataTex(terrainBumpCanvas, aniso, 84, 84);

  // 2. Concrete / Stucco building wall + weathered bump map
  const concCanvas = document.createElement('canvas');
  concCanvas.width = 512;
  concCanvas.height = 512;
  const cCtx = concCanvas.getContext('2d')!;
  cCtx.fillStyle = '#cbd5e1';
  cCtx.fillRect(0, 0, 512, 512);

  const concBumpCanvas = document.createElement('canvas');
  concBumpCanvas.width = 512;
  concBumpCanvas.height = 512;
  const cbCtx = concBumpCanvas.getContext('2d')!;
  cbCtx.fillStyle = '#888888';
  cbCtx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 6500; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const v = 165 + Math.floor(Math.random() * 55);
    cCtx.fillStyle = `rgba(${v},${v},${v},0.38)`;
    cCtx.fillRect(x, y, 4, 4);

    const bv = 100 + Math.floor(Math.random() * 65);
    cbCtx.fillStyle = `rgb(${bv},${bv},${bv})`;
    cbCtx.fillRect(x, y, 4, 4);
  }
  cCtx.strokeStyle = 'rgba(51,65,85,0.28)';
  cCtx.lineWidth = 3;
  cbCtx.strokeStyle = '#383838';
  cbCtx.lineWidth = 4;
  for (let y = 0; y < 512; y += 128) {
    cCtx.beginPath();
    cCtx.moveTo(0, y);
    cCtx.lineTo(512, y);
    cCtx.stroke();

    cbCtx.beginPath();
    cbCtx.moveTo(0, y);
    cbCtx.lineTo(512, y);
    cbCtx.stroke();
  }
  const concreteMap = configureColorTex(concCanvas, aniso, 2, 2);
  const concreteBumpMap = configureDataTex(concBumpCanvas, aniso, 2, 2);

  // 3. Corrugated Roof Metal
  const corrCanvas = document.createElement('canvas');
  corrCanvas.width = 256;
  corrCanvas.height = 256;
  const rCtx = corrCanvas.getContext('2d')!;
  for (let x = 0; x < 256; x += 16) {
    const grad = rCtx.createLinearGradient(x, 0, x + 16, 0);
    grad.addColorStop(0, '#475569');
    grad.addColorStop(0.5, '#94a3b8');
    grad.addColorStop(1, '#334155');
    rCtx.fillStyle = grad;
    rCtx.fillRect(x, 0, 16, 256);
  }
  const corrugatedMap = configureColorTex(corrCanvas, aniso, 3, 2);

  // 3b. Warm Sandstone Stucco (for Villas & Village Cottages)
  const stuccoCanvas = document.createElement('canvas');
  stuccoCanvas.width = 256;
  stuccoCanvas.height = 256;
  const stCtx = stuccoCanvas.getContext('2d')!;
  stCtx.fillStyle = '#e7dcc8';
  stCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 3500; i++) {
    const v = 200 + Math.floor(Math.random() * 44);
    stCtx.fillStyle = `rgba(${v},${v - 10},${v - 26},0.35)`;
    stCtx.fillRect(Math.random() * 256, Math.random() * 256, 3, 3);
  }
  stCtx.fillStyle = 'rgba(120, 102, 82, 0.25)';
  stCtx.fillRect(0, 212, 256, 44); // subtle base weathering
  const stuccoWarmMap = configureColorTex(stuccoCanvas, aniso, 2, 1);

  // 3c. Burnt Brick Wall (for Brick Townhouses)
  const brickCanvas = document.createElement('canvas');
  brickCanvas.width = 256;
  brickCanvas.height = 256;
  const brCtx = brickCanvas.getContext('2d')!;
  brCtx.fillStyle = '#b4aba0'; // mortar
  brCtx.fillRect(0, 0, 256, 256);
  const bh = 16;
  const bw = 32;
  for (let row = 0; row < 16; row++) {
    const offset = row % 2 === 0 ? 0 : bw / 2;
    for (let col = -1; col < 9; col++) {
      const shade = Math.floor(Math.random() * 34);
      brCtx.fillStyle = `rgb(${148 + shade},${70 + Math.floor(shade * 0.55)},${52 + Math.floor(shade * 0.4)})`;
      brCtx.fillRect(col * bw + offset + 2, row * bh + 2, bw - 3, bh - 3);
    }
  }
  const brickWallMap = configureColorTex(brickCanvas, aniso, 3, 2);

  // 3d. Weathered Timber Planks (for Mountain Cabins)
  const woodCanvas = document.createElement('canvas');
  woodCanvas.width = 256;
  woodCanvas.height = 256;
  const wdCtx = woodCanvas.getContext('2d')!;
  wdCtx.fillStyle = '#6f4e37';
  wdCtx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 24) {
    const shade = 82 + Math.floor(Math.random() * 32);
    wdCtx.fillStyle = `rgb(${shade + 24},${shade},${Math.max(30, shade - 22)})`;
    wdCtx.fillRect(0, y + 1, 256, 22);
    wdCtx.fillStyle = 'rgba(30,18,10,0.55)';
    wdCtx.fillRect(0, y, 256, 2);
    for (let g = 0; g < 18; g++) {
      wdCtx.fillStyle = 'rgba(42,24,12,0.18)';
      wdCtx.fillRect(Math.random() * 256, y + 4 + Math.random() * 16, 22 + Math.random() * 42, 1.5);
    }
  }
  const woodPlankMap = configureColorTex(woodCanvas, aniso, 2, 2);

  // 3e. Terracotta Clay Roof Tiles
  const tileCanvas = document.createElement('canvas');
  tileCanvas.width = 256;
  tileCanvas.height = 256;
  const tlCtx = tileCanvas.getContext('2d')!;
  tlCtx.fillStyle = '#8b3a28';
  tlCtx.fillRect(0, 0, 256, 256);
  for (let row = 0; row < 12; row++) {
    const ry = row * 22;
    for (let col = 0; col < 16; col++) {
      const cx = col * 16;
      const g = tlCtx.createLinearGradient(cx, ry, cx + 16, ry);
      g.addColorStop(0, '#6e2a1b');
      g.addColorStop(0.5, '#b85038');
      g.addColorStop(1, '#5e2216');
      tlCtx.fillStyle = g;
      tlCtx.fillRect(cx, ry, 16, 20);
    }
    tlCtx.fillStyle = 'rgba(35,12,8,0.45)';
    tlCtx.fillRect(0, ry + 19, 256, 3);
  }
  const roofTileMap = configureColorTex(tileCanvas, aniso, 3, 3);

  // 4. Wooden Supply Crate
  const crateCanvas = document.createElement('canvas');
  crateCanvas.width = 256;
  crateCanvas.height = 256;
  const wCtx = crateCanvas.getContext('2d')!;
  wCtx.fillStyle = '#926239';
  wCtx.fillRect(0, 0, 256, 256);
  wCtx.fillStyle = '#784e2b';
  for (let y = 0; y < 256; y += 32) {
    wCtx.fillRect(0, y, 256, 3);
  }
  wCtx.strokeStyle = '#5c3a1e';
  wCtx.lineWidth = 18;
  wCtx.strokeRect(9, 9, 238, 238);
  wCtx.beginPath();
  wCtx.moveTo(14, 14);
  wCtx.lineTo(242, 242);
  wCtx.stroke();
  const crateMap = configureColorTex(crateCanvas, aniso, 1, 1);

  // 5. Shipping Containers
  const makeContainerTex = (baseHex: string, darkHex: string, lightHex: string) => {
    const cv = document.createElement('canvas');
    cv.width = 256;
    cv.height = 256;
    const ctx = cv.getContext('2d')!;
    ctx.fillStyle = baseHex;
    ctx.fillRect(0, 0, 256, 256);
    for (let x = 0; x < 256; x += 16) {
      ctx.fillStyle = darkHex;
      ctx.fillRect(x, 12, 6, 232);
      ctx.fillStyle = lightHex;
      ctx.fillRect(x + 6, 12, 4, 232);
    }
    ctx.strokeStyle = darkHex;
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, 246, 246);
    return configureColorTex(cv, aniso, 2, 1);
  };
  const containerRedMap = makeContainerTex('#991b1b', '#7f1d1d', '#b91c1c');
  const containerTealMap = makeContainerTex('#0f766e', '#115e59', '#14b8a6');

  // 6. Gloo Wall Hexagonal Energy Armor Texture
  const glooCanvas = document.createElement('canvas');
  glooCanvas.width = 256;
  glooCanvas.height = 256;
  const gCtx = glooCanvas.getContext('2d')!;
  gCtx.fillStyle = '#083344';
  gCtx.fillRect(0, 0, 256, 256);
  gCtx.strokeStyle = '#22d3ee';
  gCtx.lineWidth = 3;
  const r = 24;
  const dx = r * 1.5;
  const dy = r * Math.sqrt(3);
  for (let row = -1; row < 10; row++) {
    for (let col = -1; col < 10; col++) {
      const cx = col * dx;
      const cy = row * dy + (col % 2 === 0 ? 0 : dy / 2);
      gCtx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i;
        const px = cx + (r - 2) * Math.cos(a);
        const py = cy + (r - 2) * Math.sin(a);
        if (i === 0) gCtx.moveTo(px, py);
        else gCtx.lineTo(px, py);
      }
      gCtx.closePath();
      gCtx.fillStyle = (row + col) % 3 === 0 ? 'rgba(34,211,238,0.22)' : 'rgba(6,182,212,0.1)';
      gCtx.fill();
      gCtx.stroke();
    }
  }
  const glooHexMap = configureColorTex(glooCanvas, aniso, 2, 1);

  // 7. Soft Radial Contact Shadow
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 128;
  shadowCanvas.height = 128;
  const sCtx = shadowCanvas.getContext('2d')!;
  const grad = sCtx.createRadialGradient(64, 64, 6, 64, 64, 60);
  grad.addColorStop(0, 'rgba(0,0,0,0.72)');
  grad.addColorStop(0.55, 'rgba(0,0,0,0.32)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  sCtx.fillStyle = grad;
  sCtx.fillRect(0, 0, 128, 128);
  const contactShadowMap = new THREE.CanvasTexture(shadowCanvas);
  contactShadowMap.needsUpdate = true;

  // 8. Tactical Ripstop Nylon & Camo Fabric (Albedo + Bump for character uniforms)
  const fabricCanvas = document.createElement('canvas');
  fabricCanvas.width = 256;
  fabricCanvas.height = 256;
  const fCtx = fabricCanvas.getContext('2d')!;
  fCtx.fillStyle = '#dcdcdc';
  fCtx.fillRect(0, 0, 256, 256);

  const fabricBumpCanvas = document.createElement('canvas');
  fabricBumpCanvas.width = 256;
  fabricBumpCanvas.height = 256;
  const fbCtx = fabricBumpCanvas.getContext('2d')!;
  fbCtx.fillStyle = '#808080';
  fbCtx.fillRect(0, 0, 256, 256);

  // Subtle tactical camo blotches (multiplied by skin color)
  for (let i = 0; i < 42; i++) {
    const shade = 195 + Math.floor(Math.random() * 50);
    fCtx.fillStyle = `rgba(${shade},${shade},${shade},0.45)`;
    fCtx.beginPath();
    fCtx.ellipse(
      Math.random() * 256,
      Math.random() * 256,
      14 + Math.random() * 22,
      8 + Math.random() * 14,
      Math.random() * Math.PI,
      0,
      Math.PI * 2
    );
    fCtx.fill();
  }

  // Ripstop grid weave
  fCtx.strokeStyle = 'rgba(0,0,0,0.09)';
  fCtx.lineWidth = 1;
  fbCtx.strokeStyle = '#a8a8a8';
  fbCtx.lineWidth = 1;
  for (let i = 0; i < 256; i += 8) {
    fCtx.beginPath();
    fCtx.moveTo(i, 0);
    fCtx.lineTo(i, 256);
    fCtx.moveTo(0, i);
    fCtx.lineTo(256, i);
    fCtx.stroke();

    fbCtx.beginPath();
    fbCtx.moveTo(i, 0);
    fbCtx.lineTo(i, 256);
    fbCtx.moveTo(0, i);
    fbCtx.lineTo(256, i);
    fbCtx.stroke();
  }
  // Tactical stitch seam lines
  fCtx.strokeStyle = 'rgba(20,20,20,0.22)';
  fCtx.setLineDash([4, 3]);
  fCtx.strokeRect(12, 12, 232, 232);
  const tacticalFabricMap = configureColorTex(fabricCanvas, aniso, 2, 2);
  const tacticalFabricBumpMap = configureDataTex(fabricBumpCanvas, aniso, 2, 2);

  // 9. Woven Carbon Kevlar Armor (Albedo + Roughness Map)
  const kevCanvas = document.createElement('canvas');
  kevCanvas.width = 256;
  kevCanvas.height = 256;
  const kCtx = kevCanvas.getContext('2d')!;
  kCtx.fillStyle = '#cfcfcf';
  kCtx.fillRect(0, 0, 256, 256);

  const kevRoughCanvas = document.createElement('canvas');
  kevRoughCanvas.width = 256;
  kevRoughCanvas.height = 256;
  const krCtx = kevRoughCanvas.getContext('2d')!;
  krCtx.fillStyle = '#909090';
  krCtx.fillRect(0, 0, 256, 256);

  for (let y = 0; y < 256; y += 8) {
    for (let x = 0; x < 256; x += 8) {
      const alt = ((x + y) / 8) % 2 === 0;
      kCtx.fillStyle = alt ? '#e4e4e4' : '#a8a8a8';
      kCtx.fillRect(x, y, 7, 7);
      krCtx.fillStyle = alt ? '#666666' : '#b2b2b2';
      krCtx.fillRect(x, y, 7, 7);
    }
  }
  // Panel bevel seams
  kCtx.strokeStyle = 'rgba(0,0,0,0.35)';
  kCtx.lineWidth = 4;
  kCtx.strokeRect(6, 6, 244, 244);
  const kevlarMap = configureColorTex(kevCanvas, aniso, 3, 3);
  const kevlarRoughnessMap = configureDataTex(kevRoughCanvas, aniso, 3, 3);

  // 10. Pebbled Tactical Leather Bump Map (for boots, gloves, holsters)
  const leatherCanvas = document.createElement('canvas');
  leatherCanvas.width = 128;
  leatherCanvas.height = 128;
  const lCtx = leatherCanvas.getContext('2d')!;
  lCtx.fillStyle = '#7c7c7c';
  lCtx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 900; i++) {
    const v = 90 + Math.floor(Math.random() * 80);
    lCtx.fillStyle = `rgb(${v},${v},${v})`;
    lCtx.beginPath();
    lCtx.arc(Math.random() * 128, Math.random() * 128, 1.4, 0, Math.PI * 2);
    lCtx.fill();
  }
  const leatherBumpMap = configureDataTex(leatherCanvas, aniso, 2, 2);

  // 11. Dynamic Muzzle Flash Starburst Texture
  const flashCanvas = document.createElement('canvas');
  flashCanvas.width = 128;
  flashCanvas.height = 128;
  const flCtx = flashCanvas.getContext('2d')!;
  const fGrad = flCtx.createRadialGradient(64, 64, 4, 64, 64, 60);
  fGrad.addColorStop(0, 'rgba(255,255,230,1)');
  fGrad.addColorStop(0.28, 'rgba(255,196,64,0.92)');
  fGrad.addColorStop(0.65, 'rgba(249,115,22,0.45)');
  fGrad.addColorStop(1, 'rgba(249,115,22,0)');
  flCtx.fillStyle = fGrad;
  flCtx.fillRect(0, 0, 128, 128);
  const muzzleFlashMap = new THREE.CanvasTexture(flashCanvas);
  muzzleFlashMap.colorSpace = THREE.SRGBColorSpace;
  muzzleFlashMap.needsUpdate = true;

  // 12. Realistic Hero Face Texture (centered at u=0.5 / x=128)
  const faceCanvas = document.createElement('canvas');
  faceCanvas.width = 256;
  faceCanvas.height = 256;
  const fc = faceCanvas.getContext('2d')!;
  const skinGrad = fc.createLinearGradient(0, 0, 0, 256);
  skinGrad.addColorStop(0, '#dba887');
  skinGrad.addColorStop(0.55, '#d69c79');
  skinGrad.addColorStop(1, '#c38462');
  fc.fillStyle = skinGrad;
  fc.fillRect(0, 0, 256, 256);

  // Subtle sideburns & jawline beard shadow
  fc.fillStyle = 'rgba(28, 22, 18, 0.85)';
  fc.beginPath();
  fc.moveTo(86, 118);
  fc.quadraticCurveTo(92, 198, 128, 208);
  fc.quadraticCurveTo(164, 198, 170, 118);
  fc.lineTo(162, 118);
  fc.quadraticCurveTo(156, 178, 128, 184);
  fc.quadraticCurveTo(100, 178, 94, 118);
  fc.closePath();
  fc.fill();

  // Mustache & chin goatee
  fc.fillStyle = 'rgba(22, 17, 14, 0.92)';
  fc.beginPath();
  fc.ellipse(128, 152, 18, 4.5, 0, 0, Math.PI * 2);
  fc.fill();
  fc.beginPath();
  fc.ellipse(128, 178, 13, 10, 0, 0, Math.PI * 2);
  fc.fill();

  // Eyebrows
  fc.strokeStyle = '#1f1916';
  fc.lineWidth = 4.2;
  fc.lineCap = 'round';
  fc.beginPath();
  fc.moveTo(101, 102);
  fc.quadraticCurveTo(111, 97, 120, 103);
  fc.moveTo(136, 103);
  fc.quadraticCurveTo(145, 97, 155, 102);
  fc.stroke();

  // Eyes (sclera + dark iris + pupil)
  [111, 145].forEach((ex) => {
    fc.fillStyle = '#f8fafc';
    fc.beginPath();
    fc.ellipse(ex, 113, 7.5, 4.2, 0, 0, Math.PI * 2);
    fc.fill();
    fc.fillStyle = '#2b1b12';
    fc.beginPath();
    fc.arc(ex, 113, 3.6, 0, Math.PI * 2);
    fc.fill();
    fc.fillStyle = '#ffffff';
    fc.beginPath();
    fc.arc(ex + 1.2, 111.8, 1.1, 0, Math.PI * 2);
    fc.fill();
  });

  // Nose bridge shading + nostrils
  fc.fillStyle = 'rgba(155, 95, 65, 0.42)';
  fc.fillRect(125, 112, 6, 24);
  fc.fillStyle = 'rgba(90, 48, 32, 0.65)';
  fc.beginPath();
  fc.ellipse(124, 138, 2.5, 1.8, 0, 0, Math.PI * 2);
  fc.ellipse(132, 138, 2.5, 1.8, 0, 0, Math.PI * 2);
  fc.fill();

  // Natural Lips
  fc.fillStyle = '#a86254';
  fc.beginPath();
  fc.ellipse(128, 160, 9.5, 3.2, 0, 0, Math.PI * 2);
  fc.fill();
  fc.strokeStyle = 'rgba(70, 32, 24, 0.7)';
  fc.lineWidth = 1.4;
  fc.beginPath();
  fc.moveTo(118, 160);
  fc.lineTo(138, 160);
  fc.stroke();

  const heroFaceMap = configureColorTex(faceCanvas, aniso, 1, 1);

  // 13. Muscular Bare Torso + Chest Tattoo + Bump Map (front centered at u=0.5 / x=128)
  const torsoCanvas = document.createElement('canvas');
  torsoCanvas.width = 256;
  torsoCanvas.height = 256;
  const tc = torsoCanvas.getContext('2d')!;
  tc.fillStyle = '#d69c79';
  tc.fillRect(0, 0, 256, 256);

  const torsoBumpCanvas = document.createElement('canvas');
  torsoBumpCanvas.width = 256;
  torsoBumpCanvas.height = 256;
  const tbc = torsoBumpCanvas.getContext('2d')!;
  tbc.fillStyle = '#808080';
  tbc.fillRect(0, 0, 256, 256);

  // Pectoral highlights & under-pec shadow
  [105, 151].forEach((px) => {
    const pGrad = tc.createRadialGradient(px, 84, 4, px, 88, 26);
    pGrad.addColorStop(0, 'rgba(235, 190, 160, 0.55)');
    pGrad.addColorStop(0.75, 'rgba(180, 118, 86, 0.2)');
    pGrad.addColorStop(1, 'rgba(120, 68, 46, 0.55)');
    tc.fillStyle = pGrad;
    tc.beginPath();
    tc.ellipse(px, 88, 22, 18, 0, 0, Math.PI * 2);
    tc.fill();

    const pbGrad = tbc.createRadialGradient(px, 84, 2, px, 88, 24);
    pbGrad.addColorStop(0, '#c8c8c8');
    pbGrad.addColorStop(1, '#686868');
    tbc.fillStyle = pbGrad;
    tbc.beginPath();
    tbc.ellipse(px, 88, 22, 18, 0, 0, Math.PI * 2);
    tbc.fill();

    // Subtle chest detail
    tc.fillStyle = 'rgba(145, 86, 68, 0.65)';
    tc.beginPath();
    tc.arc(px + (px < 128 ? -6 : 6), 96, 2.2, 0, Math.PI * 2);
    tc.fill();
  });

  // 6-pack abs & linea alba
  tc.strokeStyle = 'rgba(130, 74, 48, 0.45)';
  tc.lineWidth = 3;
  tc.beginPath();
  tc.moveTo(128, 72);
  tc.lineTo(128, 212);
  tc.stroke();

  for (let row = 0; row < 3; row++) {
    const ay = 132 + row * 24;
    [115, 141].forEach((ax) => {
      const aGrad = tc.createRadialGradient(ax, ay, 2, ax, ay, 14);
      aGrad.addColorStop(0, 'rgba(235, 188, 158, 0.45)');
      aGrad.addColorStop(1, 'rgba(135, 78, 52, 0.45)');
      tc.fillStyle = aGrad;
      tc.beginPath();
      tc.ellipse(ax, ay, 11, 9, 0, 0, Math.PI * 2);
      tc.fill();

      tbc.fillStyle = '#b4b4b4';
      tbc.beginPath();
      tbc.ellipse(ax, ay, 10, 8, 0, 0, Math.PI * 2);
      tbc.fill();
    });
  }

  // Upper Chest Tattoo (Swallows + Script Calligraphy like reference)
  tc.strokeStyle = 'rgba(28, 42, 54, 0.78)';
  tc.fillStyle = 'rgba(28, 42, 54, 0.72)';
  tc.lineWidth = 2.2;
  // Left & Right collarbone wing/bird silhouettes
  [90, 166].forEach((bx, idx) => {
    const dir = idx === 0 ? 1 : -1;
    tc.beginPath();
    tc.moveTo(bx, 48);
    tc.quadraticCurveTo(bx - 12 * dir, 36, bx - 22 * dir, 44);
    tc.quadraticCurveTo(bx - 8 * dir, 50, bx, 54);
    tc.quadraticCurveTo(bx + 10 * dir, 40, bx + 18 * dir, 48);
    tc.closePath();
    tc.fill();
  });
  // Script chest flourish
  tc.beginPath();
  tc.moveTo(102, 62);
  tc.bezierCurveTo(112, 50, 120, 70, 128, 58);
  tc.bezierCurveTo(136, 48, 146, 68, 155, 58);
  tc.stroke();

  const heroTorsoMap = configureColorTex(torsoCanvas, aniso, 1, 1);
  const heroTorsoBumpMap = configureDataTex(torsoBumpCanvas, aniso, 1, 1);

  // 14. Arm Sleeve Tattoo Textures (Left full sleeve, Right upper/mid sleeve)
  const makeArmTex = (fullSleeve: boolean) => {
    const ac = document.createElement('canvas');
    ac.width = 256;
    ac.height = 256;
    const ctx = ac.getContext('2d')!;
    ctx.fillStyle = '#d69c79';
    ctx.fillRect(0, 0, 256, 256);

    const endY = fullSleeve ? 242 : 175;
    const colors = ['rgba(24,36,48,0.72)', 'rgba(15,82,92,0.58)', 'rgba(153,36,36,0.52)'];
    for (let i = 0; i < (fullSleeve ? 44 : 26); i++) {
      ctx.fillStyle = colors[i % colors.length];
      ctx.strokeStyle = 'rgba(18,24,32,0.78)';
      ctx.lineWidth = 2;
      const x = Math.random() * 256;
      const y = 14 + Math.random() * (endY - 20);
      ctx.beginPath();
      if (i % 3 === 0) {
        ctx.arc(x, y, 8 + Math.random() * 14, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.ellipse(x, y, 10 + Math.random() * 14, 5 + Math.random() * 8, Math.random() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    return configureColorTex(ac, aniso, 1, 1);
  };
  const heroLeftArmMap = makeArmTex(true);
  const heroRightArmMap = makeArmTex(false);

  // 15. Brown-Tan & Denim-Blue Patched Trousers Texture + Bump Map
  const pantsCanvas = document.createElement('canvas');
  pantsCanvas.width = 256;
  pantsCanvas.height = 256;
  const pc = pantsCanvas.getContext('2d')!;
  const pGrad = pc.createLinearGradient(0, 0, 256, 0);
  pGrad.addColorStop(0, '#3a6289'); // inner/back denim blue
  pGrad.addColorStop(0.22, '#6f4c38');
  pGrad.addColorStop(0.5, '#8c6148'); // brown front panel
  pGrad.addColorStop(0.78, '#6f4c38');
  pGrad.addColorStop(1, '#3a6289');
  pc.fillStyle = pGrad;
  pc.fillRect(0, 0, 256, 256);

  // Denim waistband & upper pocket trim
  pc.fillStyle = '#3b648c';
  pc.fillRect(0, 0, 256, 44);
  pc.strokeStyle = '#c89b6e';
  pc.lineWidth = 2;
  pc.setLineDash([4, 3]);
  pc.beginPath();
  pc.moveTo(0, 44);
  pc.lineTo(256, 44);
  pc.stroke();
  pc.setLineDash([]);

  // Rectangular distressed denim knee/shin patch (front centered at x=128)
  pc.fillStyle = '#5c7c99';
  pc.fillRect(102, 132, 52, 58);
  pc.strokeStyle = '#d6c2a8';
  pc.lineWidth = 2.2;
  pc.strokeRect(104, 134, 48, 54);

  // Vertical crease wear shading
  const pantsBumpCanvas = document.createElement('canvas');
  pantsBumpCanvas.width = 256;
  pantsBumpCanvas.height = 256;
  const pbc = pantsBumpCanvas.getContext('2d')!;
  pbc.fillStyle = '#808080';
  pbc.fillRect(0, 0, 256, 256);
  for (let y = 30; y < 245; y += 16) {
    pc.strokeStyle = 'rgba(42, 26, 18, 0.28)';
    pc.lineWidth = 2;
    pc.beginPath();
    pc.moveTo(84, y);
    pc.quadraticCurveTo(128, y + (Math.random() - 0.5) * 8, 172, y);
    pc.stroke();

    pbc.strokeStyle = '#585858';
    pbc.lineWidth = 3;
    pbc.beginPath();
    pbc.moveTo(84, y);
    pbc.lineTo(172, y);
    pbc.stroke();
  }
  const heroPantsMap = configureColorTex(pantsCanvas, aniso, 1, 1);
  const heroPantsBumpMap = configureDataTex(pantsBumpCanvas, aniso, 1, 1);

  // 16. Silver-White Layered Hair Strand Texture
  const hairCanvas = document.createElement('canvas');
  hairCanvas.width = 256;
  hairCanvas.height = 256;
  const hc = hairCanvas.getContext('2d')!;
  hc.fillStyle = '#cfd6de';
  hc.fillRect(0, 0, 256, 256);
  for (let x = 0; x < 256; x += 3) {
    const v = 175 + Math.floor(Math.random() * 75);
    hc.strokeStyle = `rgb(${v},${v + 3},${v + 6})`;
    hc.lineWidth = 1.6;
    hc.beginPath();
    hc.moveTo(x, 0);
    hc.lineTo(x + (Math.random() - 0.5) * 8, 256);
    hc.stroke();
  }
  const silverHairMap = configureColorTex(hairCanvas, aniso, 2, 1);

  // 17. Gold "RICH" Pendant Plate Texture
  const richCanvas = document.createElement('canvas');
  richCanvas.width = 256;
  richCanvas.height = 96;
  const rc = richCanvas.getContext('2d')!;
  const goldGrad = rc.createLinearGradient(0, 0, 256, 96);
  goldGrad.addColorStop(0, '#fde68a');
  goldGrad.addColorStop(0.35, '#f59e0b');
  goldGrad.addColorStop(0.7, '#fbbf24');
  goldGrad.addColorStop(1, '#b45309');
  rc.fillStyle = goldGrad;
  rc.fillRect(0, 0, 256, 96);
  rc.strokeStyle = '#78350f';
  rc.lineWidth = 8;
  rc.strokeRect(4, 4, 248, 88);
  rc.fillStyle = '#451a03';
  rc.font = 'bold 58px sans-serif';
  rc.textAlign = 'center';
  rc.textBaseline = 'middle';
  rc.fillText('RICH', 128, 52);
  rc.strokeStyle = '#fef08a';
  rc.lineWidth = 2;
  rc.strokeText('RICH', 128, 52);
  const richPendantMap = configureColorTex(richCanvas, aniso, 1, 1);

  // 18. Realistic Equirectangular Skybox Texture (Daylight Horizon + Sun Halo + Cumulus Clouds)
  const skyCanvas = document.createElement('canvas');
  skyCanvas.width = 1024;
  skyCanvas.height = 512;
  const sk = skyCanvas.getContext('2d')!;
  const skyGrad = sk.createLinearGradient(0, 0, 0, 512);
  skyGrad.addColorStop(0.0, '#1d4f8a'); // Zenith deep blue
  skyGrad.addColorStop(0.28, '#4a8cc7'); // Upper sky
  skyGrad.addColorStop(0.47, '#9ec9e6'); // Lower atmosphere
  skyGrad.addColorStop(0.51, '#dbe8ef'); // Horizon mist (matches fog)
  skyGrad.addColorStop(0.55, '#6a8291'); // Distant sea reflection
  skyGrad.addColorStop(1.0, '#1e3a4c');
  sk.fillStyle = skyGrad;
  sk.fillRect(0, 0, 1024, 512);

  // Warm sun disc & atmospheric glow
  const sunX = 280;
  const sunY = 165;
  const sunGlow = sk.createRadialGradient(sunX, sunY, 6, sunX, sunY, 170);
  sunGlow.addColorStop(0, 'rgba(255, 252, 232, 1)');
  sunGlow.addColorStop(0.12, 'rgba(255, 236, 179, 0.85)');
  sunGlow.addColorStop(0.45, 'rgba(253, 210, 145, 0.25)');
  sunGlow.addColorStop(1, 'rgba(253, 210, 145, 0)');
  sk.fillStyle = sunGlow;
  sk.fillRect(0, 0, 1024, 340);

  // Soft cumulus cloud banks along mid-horizon
  for (let c = 0; c < 46; c++) {
    const cx = Math.random() * 1024;
    const cy = 155 + Math.random() * 88;
    const rx = 28 + Math.random() * 68;
    const ry = 9 + Math.random() * 18;
    const cGrad = sk.createRadialGradient(cx, cy - ry * 0.2, 2, cx, cy, rx);
    cGrad.addColorStop(0, 'rgba(255, 255, 255, 0.72)');
    cGrad.addColorStop(0.55, 'rgba(235, 242, 250, 0.38)');
    cGrad.addColorStop(1, 'rgba(215, 228, 240, 0)');
    sk.fillStyle = cGrad;
    sk.beginPath();
    sk.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    sk.fill();
  }
  const skyboxMap = new THREE.CanvasTexture(skyCanvas);
  skyboxMap.colorSpace = THREE.SRGBColorSpace;
  skyboxMap.mapping = THREE.EquirectangularReflectionMapping;
  skyboxMap.needsUpdate = true;

  return {
    terrainDetailMap,
    terrainBumpMap,
    concreteMap,
    concreteBumpMap,
    corrugatedMap,
    stuccoWarmMap,
    brickWallMap,
    woodPlankMap,
    roofTileMap,
    crateMap,
    containerRedMap,
    containerTealMap,
    glooHexMap,
    contactShadowMap,
    tacticalFabricMap,
    tacticalFabricBumpMap,
    kevlarMap,
    kevlarRoughnessMap,
    leatherBumpMap,
    muzzleFlashMap,
    heroFaceMap,
    heroTorsoMap,
    heroTorsoBumpMap,
    heroLeftArmMap,
    heroRightArmMap,
    heroPantsMap,
    heroPantsBumpMap,
    silverHairMap,
    richPendantMap,
    skyboxMap,
  };
}
