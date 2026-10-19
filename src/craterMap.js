import * as THREE from 'three';
import { soundEngine } from './audio.js';

// ============================================================================
// 🌋 PROCEDURAL TEXTURE GENERATORS (VOLCANIC BASALT & VIVID BLOOD MAGMA)
// ============================================================================

/**
 * Vivid Blood-Red Magma Texture (Requirement 1: Ярко-красная магма)
 * Deep arterial crimson base, glowing scarlet veins, pulsating bubbling cells and coagulated clots.
 */
function createBloodMagmaTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Arterial blood scarlet radial gradient
  const grad = ctx.createRadialGradient(256, 256, 40, 256, 256, 256);
  grad.addColorStop(0, '#ff1a4a');     // Vivid arterial scarlet center
  grad.addColorStop(0.28, '#ff0038');  // Bright saturated blood red
  grad.addColorStop(0.62, '#b80024');  // Rich crimson
  grad.addColorStop(0.85, '#660012');  // Deep clot ruby
  grad.addColorStop(1, '#240006');     // Dark coagulated edge
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  // Floating dark coagulated blood clots / crust islands
  for (let i = 0; i < 45; i++) {
    const px = Math.random() * 512;
    const py = Math.random() * 512;
    const rx = 16 + Math.random() * 38;
    const ry = 12 + Math.random() * 26;
    const angle = Math.random() * Math.PI;
    ctx.fillStyle = (Math.random() < 0.6) ? '#280007' : '#180004';
    ctx.beginPath();
    ctx.ellipse(px, py, rx, ry, angle, 0, Math.PI * 2);
    ctx.fill();
  }

  // Glowing scarlet / crimson arterial fissure veins
  for (let v = 0; v < 18; v++) {
    ctx.beginPath();
    let x = Math.random() * 512;
    let y = Math.random() * 512;
    ctx.moveTo(x, y);
    for (let s = 0; s < 5; s++) {
      x += (Math.random() - 0.5) * 85;
      y += (Math.random() - 0.5) * 85;
      ctx.lineTo(x, y);
    }
    // High-energy scarlet glow
    ctx.strokeStyle = '#ff3366';
    ctx.lineWidth = 3.0;
    ctx.shadowColor = '#ff0044';
    ctx.shadowBlur = 8;
    ctx.stroke();

    // Hot bright core
    ctx.strokeStyle = '#ff809b';
    ctx.lineWidth = 1.0;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // Bubbling red surface cells / highlights
  for (let b = 0; b < 24; b++) {
    const bx = Math.random() * 512;
    const by = Math.random() * 512;
    const br = 4 + Math.random() * 10;
    ctx.fillStyle = 'rgba(255, 60, 95, 0.75)';
    ctx.beginPath();
    ctx.arc(bx, by, br, 0, Math.PI * 2);
    ctx.fill();

    // Specular bubble highlight
    ctx.fillStyle = 'rgba(255, 200, 220, 0.9)';
    ctx.beginPath();
    ctx.arc(bx - br * 0.3, by - br * 0.3, br * 0.28, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(6, 6);
  return texture;
}

/**
 * Flat Stepping Slab Top Surface (Requirement 5: Ровная плоскость для игрока)
 * Distinct outer border, clean basalt slab pavers with subtle dark grain & faint crimson fissures.
 */
function createVolcanoTopTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Dark charcoal basalt slab base
  ctx.fillStyle = '#18181c';
  ctx.fillRect(0, 0, 512, 512);

  // Outer carved stone border (makes platform edges crisp & clearly visible for parkour)
  ctx.strokeStyle = '#32323a';
  ctx.lineWidth = 14;
  ctx.strokeRect(7, 7, 498, 498);

  ctx.strokeStyle = '#0d0d10';
  ctx.lineWidth = 4;
  ctx.strokeRect(16, 16, 480, 480);

  // Basalt slab grains & mineral flecks
  for (let i = 0; i < 450; i++) {
    const x = 20 + Math.random() * 472;
    const y = 20 + Math.random() * 472;
    const size = 6 + Math.random() * 22;
    const shade = 22 + Math.floor(Math.random() * 20);
    ctx.fillStyle = `rgb(${shade + 4}, ${shade}, ${shade + 2})`;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }

  // Faint glowing red micro-fissures in rock
  for (let c = 0; c < 6; c++) {
    ctx.strokeStyle = 'rgba(255, 25, 45, 0.38)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    let cx = 30 + Math.random() * 452;
    let cy = 30 + Math.random() * 452;
    ctx.moveTo(cx, cy);
    for (let s = 0; s < 5; s++) {
      cx += (Math.random() - 0.5) * 50;
      cy += (Math.random() - 0.5) * 50;
      ctx.lineTo(cx, cy);
    }
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  return texture;
}

/**
 * Stratified Volcanic Rock Cliff Side Texture (Requirement 4 & 5: Настоящий кусок вулкана)
 * Rich vertical cliff striations, horizontal basalt layers, and cooled red magma streaks.
 */
function createVolcanoSideTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Dark jagged rock cliff base
  ctx.fillStyle = '#141316';
  ctx.fillRect(0, 0, 512, 512);

  // Horizontal geological strata bands
  for (let y = 0; y < 512; y += 32) {
    const bandShade = 18 + Math.floor(Math.random() * 18);
    ctx.fillStyle = `rgb(${bandShade + 3}, ${bandShade}, ${bandShade + 2})`;
    ctx.fillRect(0, y, 512, 28 + Math.random() * 6);
  }

  // Vertical cliff crevices & jagged fractures
  for (let c = 0; c < 28; c++) {
    ctx.strokeStyle = '#09080a';
    ctx.lineWidth = 2 + Math.random() * 3.5;
    ctx.beginPath();
    let vx = Math.random() * 512;
    let vy = 0;
    ctx.moveTo(vx, vy);
    while (vy < 512) {
      vx += (Math.random() - 0.5) * 22;
      vy += 20 + Math.random() * 35;
      ctx.lineTo(vx, vy);
    }
    ctx.stroke();
  }

  // Glowing cooled red lava veins
  for (let v = 0; v < 8; v++) {
    ctx.strokeStyle = 'rgba(255, 30, 45, 0.48)';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    let sx = Math.random() * 512;
    let sy = Math.random() * 512;
    ctx.moveTo(sx, sy);
    for (let s = 0; s < 5; s++) {
      sx += (Math.random() - 0.5) * 55;
      sy += (Math.random() - 0.5) * 55;
      ctx.lineTo(sx, sy);
    }
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 1);
  return texture;
}

/**
 * Crumbling Ledge Top Texture (Warning cracks & unstable crust)
 */
function createCrumbleTopTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#2d1b14';
  ctx.fillRect(0, 0, 512, 512);

  // Jagged fracture cracks
  ctx.strokeStyle = '#ff3300';
  ctx.lineWidth = 4;
  for (let i = 0; i < 16; i++) {
    ctx.beginPath();
    let x = Math.random() * 512;
    let y = Math.random() * 512;
    ctx.moveTo(x, y);
    for (let s = 0; s < 6; s++) {
      x += (Math.random() - 0.5) * 90;
      y += (Math.random() - 0.5) * 90;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // Bright yellow-orange unstable glow spots
  for (let i = 0; i < 20; i++) {
    ctx.fillStyle = 'rgba(255, 120, 0, 0.7)';
    ctx.beginPath();
    ctx.arc(Math.random() * 512, Math.random() * 512, 8 + Math.random() * 12, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

/**
 * Crumbling Ledge Side Texture
 */
function createCrumbleSideTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#22140f';
  ctx.fillRect(0, 0, 512, 512);

  // Jagged falling shards & cracks
  ctx.strokeStyle = '#ff2200';
  ctx.lineWidth = 3;
  for (let i = 0; i < 14; i++) {
    ctx.beginPath();
    let x = Math.random() * 512;
    let y = 0;
    ctx.moveTo(x, y);
    while (y < 512) {
      x += (Math.random() - 0.5) * 35;
      y += 30 + Math.random() * 40;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

/**
 * Charred Wooden Planks (Top & Sides)
 */
function createWoodTopTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#201815';
  ctx.fillRect(0, 0, 256, 256);

  ctx.strokeStyle = '#2d221e';
  ctx.lineWidth = 4;
  for (let y = 0; y < 256; y += 32) {
    ctx.strokeRect(0, y, 256, 30);
  }

  // Burnt marks
  for (let i = 0; i < 35; i++) {
    ctx.fillStyle = 'rgba(10, 6, 4, 0.75)';
    ctx.fillRect(Math.random() * 256, Math.random() * 256, Math.random() * 40, Math.random() * 12);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

function createWoodSideTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#150f0c';
  ctx.fillRect(0, 0, 256, 256);

  ctx.strokeStyle = '#281c16';
  ctx.lineWidth = 3;
  for (let x = 0; x < 256; x += 32) {
    ctx.strokeRect(x, 0, 30, 256);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

// Global cached textures
let cachedBloodMagma = null;
let cachedVolcanoTop = null;
let cachedVolcanoSide = null;
let cachedCrumbleTop = null;
let cachedCrumbleSide = null;
let cachedWoodTop = null;
let cachedWoodSide = null;

function getBloodMagmaTexture() {
  if (!cachedBloodMagma) cachedBloodMagma = createBloodMagmaTexture();
  return cachedBloodMagma;
}
function getVolcanoTopTexture() {
  if (!cachedVolcanoTop) cachedVolcanoTop = createVolcanoTopTexture();
  return cachedVolcanoTop;
}
function getVolcanoSideTexture() {
  if (!cachedVolcanoSide) cachedVolcanoSide = createVolcanoSideTexture();
  return cachedVolcanoSide;
}
function getCrumbleTopTexture() {
  if (!cachedCrumbleTop) cachedCrumbleTop = createCrumbleTopTexture();
  return cachedCrumbleTop;
}
function getCrumbleSideTexture() {
  if (!cachedCrumbleSide) cachedCrumbleSide = createCrumbleSideTexture();
  return cachedCrumbleSide;
}
function getWoodTopTexture() {
  if (!cachedWoodTop) cachedWoodTop = createWoodTopTexture();
  return cachedWoodTop;
}
function getWoodSideTexture() {
  if (!cachedWoodSide) cachedWoodSide = createWoodSideTexture();
  return cachedWoodSide;
}

// ============================================================================
// 🌋 CRATER MAP (VOLCANO PARKOUR)
// ============================================================================

export class CraterMap {
  constructor(scene) {
    this.scene = scene;
    this.isCrater = true;

    // Dimensions
    this.calderaRadius = 32;
    this.calderaHeight = 38;
    this.offsetX = -this.calderaRadius;
    this.offsetZ = -this.calderaRadius;
    this.width = this.calderaRadius * 2;
    this.depth = this.calderaRadius * 2;
    this.tileSize = 4;

    // Magma state (dormant at 0.5m until player leaps onto first platform)
    this.magmaLevel = 0.5;
    this.initialMagmaLevel = 0.5;
    this.maxMagmaLevel = 29.5;
    this.magmaBaseSpeed = 0.20;
    this.magmaRapidSpeed = 0.50;
    this.magmaRisingSpeed = this.magmaBaseSpeed;
    this.isMagmaRising = false;
    this.hasPlayerStartedParkour = false;
    this.isRapidRise = false;
    this.magmaTime = 0;

    // Platform lists
    this.platforms = [];
    this.crumblingPlatforms = [];
    this.walls = [];
    this.spawnPoints = [];
    this.keyLocations = [];

    // Geysers
    this.geysers = [];
    this.nextGeyserTime = 3.0;

    // Torii Gate Summit Exit
    this.exitPortal = null;
    this.exitPosition = new THREE.Vector3(0, 32.5, 0);

    // Callbacks
    this.onMagmaRiseStart = null;
    this.onParkourStart = null;
    this.onPlayerMagmaDeath = null;

    this.buildVolcanoWorld();
  }

  buildVolcanoWorld() {
    this.root = new THREE.Group();
    this.scene.add(this.root);

    // Materials setup: ALL platform materials explicitly use DoubleSide so NO side is ever culled or see-through!
    this.rockTopMat = new THREE.MeshStandardMaterial({
      map: getVolcanoTopTexture(),
      roughness: 0.82,
      metalness: 0.18,
      side: THREE.DoubleSide
    });

    this.rockSideMat = new THREE.MeshStandardMaterial({
      map: getVolcanoSideTexture(),
      roughness: 0.90,
      metalness: 0.12,
      side: THREE.DoubleSide
    });

    this.crumbleTopMat = new THREE.MeshStandardMaterial({
      map: getCrumbleTopTexture(),
      roughness: 0.88,
      metalness: 0.10,
      emissive: 0x551100,
      emissiveIntensity: 0.6,
      side: THREE.DoubleSide
    });

    this.crumbleSideMat = new THREE.MeshStandardMaterial({
      map: getCrumbleSideTexture(),
      roughness: 0.92,
      metalness: 0.08,
      emissive: 0x440800,
      emissiveIntensity: 0.5,
      side: THREE.DoubleSide
    });

    this.woodTopMat = new THREE.MeshStandardMaterial({
      map: getWoodTopTexture(),
      roughness: 0.88,
      metalness: 0.12,
      side: THREE.DoubleSide
    });

    this.woodSideMat = new THREE.MeshStandardMaterial({
      map: getWoodSideTexture(),
      roughness: 0.94,
      metalness: 0.06,
      side: THREE.DoubleSide
    });

    // Multi-materials array for BoxGeometry: [+X, -X, +Y (TOP), -Y (BOTTOM), +Z, -Z]
    this.rockMaterials = [
      this.rockSideMat, // 0: +X
      this.rockSideMat, // 1: -X
      this.rockTopMat,  // 2: +Y (TOP: flat volcanic stone slab)
      this.rockSideMat, // 3: -Y (BOTTOM)
      this.rockSideMat, // 4: +Z
      this.rockSideMat  // 5: -Z
    ];

    this.crumbleMaterials = [
      this.crumbleSideMat,
      this.crumbleSideMat,
      this.crumbleTopMat,
      this.crumbleSideMat,
      this.crumbleSideMat,
      this.crumbleSideMat
    ];

    this.woodMaterials = [
      this.woodSideMat,
      this.woodSideMat,
      this.woodTopMat,
      this.woodSideMat,
      this.woodSideMat,
      this.woodSideMat
    ];

    // 1. Crater Caldera Walls (Separate dedicated material with BackSide so rockSideMat is NEVER mutated!)
    const wallGeo = new THREE.CylinderGeometry(
      this.calderaRadius * 1.08,
      this.calderaRadius * 0.88,
      this.calderaHeight,
      32,
      1,
      true
    );
    this.calderaWallMat = new THREE.MeshStandardMaterial({
      map: getVolcanoSideTexture(),
      roughness: 0.90,
      metalness: 0.12,
      side: THREE.BackSide
    });
    this.calderaWall = new THREE.Mesh(wallGeo, this.calderaWallMat);
    this.calderaWall.position.set(0, this.calderaHeight / 2, 0);
    this.root.add(this.calderaWall);

    // 2. Rising Magma Pool Surface with 3D Wave Undulation (Requirement 1: Ярко-красная кровь/магма)
    const lavaGeo = new THREE.PlaneGeometry(this.calderaRadius * 2.15, this.calderaRadius * 2.15, 28, 28);
    this.lavaMat = new THREE.MeshStandardMaterial({
      map: getBloodMagmaTexture(),
      color: 0xff0038,
      emissive: 0xff002b,
      emissiveIntensity: 1.35,
      roughness: 0.20,
      metalness: 0.70
    });
    this.lavaMesh = new THREE.Mesh(lavaGeo, this.lavaMat);
    this.lavaMesh.rotation.x = -Math.PI / 2;
    this.lavaMesh.position.set(0, this.magmaLevel, 0);
    this.root.add(this.lavaMesh);

    // Dynamic Vivid Blood-Red Magma Glow Light
    this.magmaLight = new THREE.PointLight(0xff0038, 4.2, 55, 1.2);
    this.magmaLight.position.set(0, this.magmaLevel + 2.5, 0);
    this.root.add(this.magmaLight);

    // Ambient Volcanic Crimson Glow
    this.volcanoHemi = new THREE.HemisphereLight(0x280206, 0xff0038, 1.0);
    this.root.add(this.volcanoHemi);

    // 3. Dedicated Platform Group for Procedural Regeneration
    this.platformsGroup = new THREE.Group();
    this.root.add(this.platformsGroup);

    // 4. Build Summit Torii Gate (Permanent Landmark)
    this.buildSummitToriiGate();

    // 5. Generate Initial Authentic Parkour
    this.generateRandomParkour();

    // 6. Volcanic Ash & Red Ruby Spark Particle System
    this.initAshParticles();

    // 7. Geysers
    this.initGeysers();
  }

  // --- PLATFORM CREATION HELPER (Multi-material & Crag Underbelly) ---
  addPlatform(x, y, z, w, h, d, type = 'rock', isCrumbling = false, isStartPlatform = false) {
    let materials = this.rockMaterials;
    if (type === 'wood') materials = this.woodMaterials;
    if (isCrumbling) materials = this.crumbleMaterials;

    const geo = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, materials);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    // Natural craggy tapered volcanic rock chunk underbelly below the flat box slab
    if (type === 'rock' || isCrumbling) {
      const cragHeight = h * 1.5 + 0.8;
      const cragGeo = new THREE.CylinderGeometry(
        Math.min(w, d) * 0.44,
        0.30 + Math.random() * 0.25,
        cragHeight,
        7,
        1,
        false
      );
      const posAttr = cragGeo.attributes.position;
      for (let i = 0; i < posAttr.count; i++) {
        if (posAttr.getY(i) < 0) {
          posAttr.setX(i, posAttr.getX(i) + (Math.random() - 0.5) * 0.28);
          posAttr.setZ(i, posAttr.getZ(i) + (Math.random() - 0.5) * 0.28);
        }
      }
      cragGeo.computeVertexNormals();

      const cragMat = isCrumbling ? this.crumbleSideMat : this.rockSideMat;
      const cragMesh = new THREE.Mesh(cragGeo, cragMat);
      cragMesh.position.y = -(h / 2 + cragHeight / 2);
      cragMesh.rotation.y = Math.random() * Math.PI * 2;
      mesh.add(cragMesh);
    }

    this.platformsGroup.add(mesh);

    const platformData = {
      mesh,
      box: new THREE.Box3(
        new THREE.Vector3(x - w / 2, y - h / 2, z - d / 2),
        new THREE.Vector3(x + w / 2, y + h / 2, z + d / 2)
      ),
      x, y, z, w, h, d,
      topY: y + h / 2,
      type,
      isCrumbling,
      isStartPlatform,
      stepped: false,
      stepTimer: 0,
      isFalling: false,
      fallSpeed: 0,
      origY: y
    };

    this.platforms.push(platformData);
    if (isCrumbling) {
      this.crumblingPlatforms.push(platformData);
    }

    return platformData;
  }

  // -------------------------------------------------------------
  // 🧗‍♂️ AUTHENTIC VERTICAL PARKOUR GENERATOR (No More Spiral Staircase!)
  // 3 Distinct Tiers, Sprint Chasms, Balance Beams, Monoliths & Dynamic Jitter!
  // -------------------------------------------------------------
  generateRandomParkour() {
    // 1. Clear existing platforms & decorations
    while (this.platformsGroup.children.length > 0) {
      const child = this.platformsGroup.children[0];
      if (child.geometry) child.geometry.dispose();
      this.platformsGroup.remove(child);
    }
    this.platforms = [];
    this.crumblingPlatforms = [];
    this.spawnPoints = [];
    this.keyLocations = [];

    // 2. Fixed Starting Altar (Player Spawns Here at 0, 2.5, 16)
    const startP = this.addPlatform(0, 1.8, 16, 12, 1.2, 10, 'rock', false, true);
    this.spawnPoints.push(new THREE.Vector3(0, 2.5, 16));

    // Decorative braziers on starting altar
    this.addFireBrazier(-4.5, 2.4, 13.5);
    this.addFireBrazier(4.5, 2.4, 13.5);

    // 3. Fixed Summit Arena (Y = 32.0m, Top = 32.7m, Center = 0, 0)
    this.summitPlatform = this.addPlatform(0, 32.0, 0, 14, 1.4, 14, 'rock', false, false);
    this.exitPosition.set(0, 32.7, 0);

    // Braziers flanking the Torii Gate
    this.addFireBrazier(-4.5, 32.7, -3);
    this.addFireBrazier(4.5, 32.7, -3);
    this.addFireBrazier(-4.5, 32.7, 3);
    this.addFireBrazier(4.5, 32.7, 3);

    // 4. Procedural Direction & Jitter
    // On each launch, 50% chance to mirror the entire parkour course across the caldera!
    const dir = (Math.random() < 0.5) ? 1 : -1;
    // Small random jitter offset per run for replayability
    const jitter = () => (Math.random() - 0.5) * 0.45;

    // Helper to add parkour step with mirroring
    const addStep = (x, y, z, w, h, d, type = 'rock', isCrumble = false) => {
      const rx = (x + jitter()) * dir;
      const rz = z + jitter();
      const ry = y + (Math.random() - 0.5) * 0.12;
      return this.addPlatform(rx, ry, rz, w, h, d, type, isCrumble, false);
    };

    // =========================================================================
    // 🧗‍♂️ TIER 1: The Lower Caldera & Chasms (Platforms 1-8, Y: 2.8m -> 10.0m)
    // =========================================================================
    // P1: Initial broad rock outcrop
    const p1 = addStep(-6.5, 2.8, 15.0, 5.5, 1.0, 5.0, 'rock');
    // P2: Basalt shelf
    const p2 = addStep(-11.5, 3.8, 12.0, 5.0, 1.0, 5.0, 'rock');
    // P3 & P4: THE GREAT CHASM (Разлом) - sprint gap across void at same height!
    const p3 = addStep(-16.0, 4.6, 7.5, 4.5, 1.0, 4.5, 'rock');
    const p4 = addStep(-19.5, 4.9, 1.5, 5.0, 1.0, 5.0, 'rock');
    // P5: Crumbling Ledge (Осыпающийся уступ)
    const p5 = addStep(-19.0, 6.0, -4.5, 4.0, 0.8, 4.0, 'rock', true);
    // P6: KEY 1 ALTAR PLATFORM (Golden Key 1 Altar!)
    const p6 = addStep(-16.5, 7.0, -10.0, 5.5, 1.2, 5.5, 'rock');
    // P7: High Stepping Pillar
    const p7 = addStep(-12.5, 8.2, -14.5, 3.6, 1.0, 3.6, 'rock');
    // P8: Transition Shelf into Tier 2
    const p8 = addStep(-7.5, 9.4, -17.5, 5.0, 1.0, 4.5, 'rock');
    this.addFireBrazier(-7.5 * dir, 9.4 + 1.1, -17.5);

    // =========================================================================
    // 🧗‍♂️ TIER 2: The Floating Beams & Abyss Leap (Platforms 9-17, Y: 11.0m -> 20.0m)
    // =========================================================================
    // P9 & P10: Narrow Charred Wood Bridge (Узкие деревянные мостки)
    const p9 = addStep(-2.0, 10.7, -18.5, 5.5, 0.6, 2.0, 'wood');
    const p10 = addStep(4.0, 11.9, -18.0, 5.5, 0.6, 2.0, 'wood');
    this.addHangingChain(4.0 * dir, 11.9, -18.0, 16);
    // P11: Chain Anchor Rock
    const p11 = addStep(9.5, 13.1, -15.5, 4.5, 1.0, 4.5, 'rock');
    // P12: Chasm Springboard Rock
    const p12 = addStep(14.5, 14.2, -11.5, 4.5, 0.8, 4.5, 'rock');
    // P13: Floating Beam over the Abyss (Sprint leap!)
    const p13 = addStep(18.0, 15.3, -6.0, 4.0, 0.6, 2.5, 'wood');
    // P14: KEY 2 ALTAR PLATFORM (Golden Key 2 Altar!)
    const p14 = addStep(19.5, 16.2, 0.0, 5.5, 1.2, 5.0, 'rock');
    this.addHangingChain(19.5 * dir, 16.2, 0.0, 16);
    // P15: Crumbling Ledge 2
    const p15 = addStep(18.0, 17.4, 5.5, 4.0, 0.8, 4.0, 'rock', true);
    // P16: Step-Down Rock (Hop down)
    const p16 = addStep(15.0, 18.2, 10.5, 4.5, 1.0, 4.5, 'rock');
    // P17: Steep Upward Outcrop (+1.1m)
    const p17 = addStep(10.5, 19.3, 14.5, 4.5, 1.0, 4.5, 'rock');

    // =========================================================================
    // 🧗‍♂️ TIER 3: The Rim, Suspension Planks & Summit Monoliths (Platforms 18-26)
    // =========================================================================
    // P18: High Rim Balcony
    const p18 = addStep(5.0, 20.5, 17.0, 5.5, 1.0, 4.5, 'rock');
    this.addFireBrazier(5.0 * dir, 20.5 + 1.1, 17.0);
    // P19 & P20: Narrow Suspension Planks across Rim
    const p19 = addStep(-1.0, 21.7, 16.5, 5.0, 0.6, 1.8, 'wood');
    const p20 = addStep(-6.5, 23.0, 14.5, 5.0, 0.6, 1.8, 'wood');
    // P21: Crumbling Ledge 3 (Pre-Key challenge!)
    const p21 = addStep(-11.5, 24.2, 11.0, 4.0, 0.8, 4.0, 'rock', true);
    // P22: KEY 3 ALTAR PLATFORM (Golden Key 3 Altar!)
    const p22 = addStep(-14.0, 25.4, 6.0, 5.5, 1.2, 5.0, 'rock');
    // P23 & P24: Giant Basalt Monoliths zig-zagging inward to center
    const p23 = addStep(-13.0, 26.8, 0.5, 4.5, 1.2, 4.5, 'rock');
    const p24 = addStep(-10.5, 28.2, -4.5, 4.5, 1.2, 4.5, 'rock');
    // P25: High Stepping Stone
    const p25 = addStep(-6.5, 29.5, -7.5, 4.0, 1.2, 4.0, 'rock');
    // P26: The Leap of Faith Pillar (Directly lands onto Summit Arena!)
    const p26 = addStep(-1.5, 30.8, -7.5, 4.5, 1.2, 4.5, 'rock');

    // 5. Store Dynamically Synchronized Key Locations
    this.keyLocations = [
      { pos: new THREE.Vector3(p6.x, p6.topY + 0.85, p6.z), name: 'Ключ Нижнего Яруса (Внимание: Лава!)' },
      { pos: new THREE.Vector3(p14.x, p14.topY + 0.85, p14.z), name: 'Ключ Среднего Яруса (Прыжок над бездной)' },
      { pos: new THREE.Vector3(p22.x, p22.topY + 0.85, p22.z), name: 'Ключ Верхнего Яруса (Узкий мостик)' }
    ];
  }

  getKeyLocations() {
    return this.keyLocations;
  }

  // -------------------------------------------------------------
  // ⛩️ SUMMIT EXIT: Glowing Torii Gate (Врата Тории)
  // -------------------------------------------------------------
  buildSummitToriiGate() {
    this.toriiGroup = new THREE.Group();
    this.toriiGroup.position.set(0, 32.7, 0);

    const vermilionMat = new THREE.MeshStandardMaterial({
      color: 0xdd2200,
      roughness: 0.4,
      metalness: 0.2
    });

    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xffcc00,
      roughness: 0.2,
      metalness: 0.9,
      emissive: 0xff8800,
      emissiveIntensity: 0.4
    });

    const blackStoneMat = new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.8
    });

    // Torii Pillars (left & right)
    const pillarGeo = new THREE.CylinderGeometry(0.35, 0.45, 6.5, 16);
    const leftPillar = new THREE.Mesh(pillarGeo, vermilionMat);
    leftPillar.position.set(-2.8, 3.25, 0);
    this.toriiGroup.add(leftPillar);

    const rightPillar = leftPillar.clone();
    rightPillar.position.x = 2.8;
    this.toriiGroup.add(rightPillar);

    // Pillar stone bases
    const baseGeo = new THREE.CylinderGeometry(0.55, 0.65, 0.8, 16);
    const baseL = new THREE.Mesh(baseGeo, blackStoneMat);
    baseL.position.set(-2.8, 0.4, 0);
    this.toriiGroup.add(baseL);
    const baseR = baseL.clone();
    baseR.position.x = 2.8;
    this.toriiGroup.add(baseR);

    // Kasagi (Top curved horizontal lintel)
    const lintelGeo = new THREE.BoxGeometry(8.2, 0.6, 0.8);
    const lintel = new THREE.Mesh(lintelGeo, vermilionMat);
    lintel.position.set(0, 6.3, 0);
    this.toriiGroup.add(lintel);

    // Kasagi Gold Caps
    const capGeo = new THREE.BoxGeometry(0.7, 0.7, 0.9);
    const capL = new THREE.Mesh(capGeo, goldMat);
    capL.position.set(-4.1, 6.3, 0);
    this.toriiGroup.add(capL);
    const capR = capL.clone();
    capR.position.x = 4.1;
    this.toriiGroup.add(capR);

    // Nuki (Lower secondary horizontal beam)
    const nukiGeo = new THREE.BoxGeometry(6.6, 0.4, 0.5);
    const nuki = new THREE.Mesh(nukiGeo, vermilionMat);
    nuki.position.set(0, 5.0, 0);
    this.toriiGroup.add(nuki);

    // Central Torii Plaque
    const plaqueGeo = new THREE.BoxGeometry(1.2, 1.4, 0.2);
    const plaqueMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, metalness: 0.5 });
    const plaque = new THREE.Mesh(plaqueGeo, plaqueMat);
    plaque.position.set(0, 5.65, 0.1);
    this.toriiGroup.add(plaque);

    // Swirling Energy Vortex in Gate Center
    const vortexGeo = new THREE.PlaneGeometry(4.8, 5.2);
    this.vortexMat = new THREE.MeshBasicMaterial({
      color: 0xff0044,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide
    });
    this.vortexMesh = new THREE.Mesh(vortexGeo, this.vortexMat);
    this.vortexMesh.position.set(0, 2.8, 0);
    this.toriiGroup.add(this.vortexMesh);

    // Torii Point Light
    this.toriiLight = new THREE.PointLight(0xff0044, 3.2, 16, 1.5);
    this.toriiLight.position.set(0, 3.2, 0);
    this.toriiGroup.add(this.toriiLight);

    this.root.add(this.toriiGroup);
  }

  addFireBrazier(x, y, z) {
    const brazierGroup = new THREE.Group();
    brazierGroup.position.set(x, y, z);

    // Stone bowl
    const bowlGeo = new THREE.CylinderGeometry(0.7, 0.4, 0.8, 12);
    const bowlMat = new THREE.MeshStandardMaterial({ color: 0x222225, roughness: 0.8 });
    const bowl = new THREE.Mesh(bowlGeo, bowlMat);
    brazierGroup.add(bowl);

    // Fire flame core (Blood-red volcanic fire)
    const flameGeo = new THREE.ConeGeometry(0.35, 0.9, 8);
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xff1a40 });
    const flame = new THREE.Mesh(flameGeo, flameMat);
    flame.position.y = 0.7;
    brazierGroup.add(flame);

    const light = new THREE.PointLight(0xff0038, 2.0, 10, 2);
    light.position.y = 1.0;
    brazierGroup.add(light);

    this.platformsGroup.add(brazierGroup);
  }

  addHangingChain(x, startY, z, length) {
    const chainMat = new THREE.MeshStandardMaterial({
      color: 0x3a3028,
      metalness: 0.85,
      roughness: 0.3
    });
    const chainGeo = new THREE.CylinderGeometry(0.06, 0.06, length, 8);
    const chain = new THREE.Mesh(chainGeo, chainMat);
    chain.position.set(x, startY + length / 2, z);
    this.platformsGroup.add(chain);
  }

  // -------------------------------------------------------------
  // 🌋 VOLCANIC ASH & BLOOD-RED RUBY SPARKS (Requirement 1)
  // -------------------------------------------------------------
  initAshParticles() {
    const particleCount = 180;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * (this.calderaRadius * 0.9);
      positions[i * 3] = Math.cos(angle) * r;
      positions[i * 3 + 1] = Math.random() * this.calderaHeight;
      positions[i * 3 + 2] = Math.sin(angle) * r;

      const isSpark = Math.random() < 0.40;
      if (isSpark) {
        velocities[i * 3] = (Math.random() - 0.5) * 1.5;
        velocities[i * 3 + 1] = 1.2 + Math.random() * 2.2;
        velocities[i * 3 + 2] = (Math.random() - 0.5) * 1.5;

        // Vivid ruby scarlet spark color
        colors[i * 3] = 1.0;
        colors[i * 3 + 1] = 0.05 + Math.random() * 0.15;
        colors[i * 3 + 2] = 0.15;
      } else {
        velocities[i * 3] = (Math.random() - 0.5) * 0.8;
        velocities[i * 3 + 1] = -(0.8 + Math.random() * 1.6);
        velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.8;

        const shade = 0.05 + Math.random() * 0.12;
        colors[i * 3] = shade + 0.04;
        colors[i * 3 + 1] = shade;
        colors[i * 3 + 2] = shade;
      }
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.38,
      vertexColors: true,
      transparent: true,
      opacity: 0.85
    });

    this.ashPoints = new THREE.Points(geometry, material);
    this.ashVelocities = velocities;
    this.root.add(this.ashPoints);
  }

  initGeysers() {
    this.geysers = [
      { x: -10, z: 0, timer: 2.0, active: 0, mesh: null },
      { x: 8, z: 8, timer: 4.5, active: 0, mesh: null },
      { x: 0, z: -10, timer: 6.0, active: 0, mesh: null }
    ];

    const geyserGeo = new THREE.CylinderGeometry(0.6, 1.4, 14, 16);
    const geyserMat = new THREE.MeshBasicMaterial({
      color: 0xff0038,
      transparent: true,
      opacity: 0.0
    });

    this.geysers.forEach((g) => {
      g.mesh = new THREE.Mesh(geyserGeo, geyserMat.clone());
      g.mesh.position.set(g.x, this.magmaLevel + 7, g.z);
      this.root.add(g.mesh);
    });
  }

  // -------------------------------------------------------------
  // 🔄 PARKOUR & MAGMA ACTIVATION TRIGGER
  // -------------------------------------------------------------
  triggerParkourStart() {
    if (this.hasPlayerStartedParkour) return;
    this.hasPlayerStartedParkour = true;
    this.isMagmaRising = true;
    this.magmaRisingSpeed = this.magmaBaseSpeed;

    if (this.onParkourStart) {
      this.onParkourStart();
    }
  }

  startMagmaRise() {
    // Accelerated rise after Key 1 alarm
    this.isRapidRise = true;
    this.magmaRisingSpeed = this.magmaRapidSpeed;
    this.isMagmaRising = true;
    soundEngine.playSirenAlarm();
    if (this.onMagmaRiseStart) {
      this.onMagmaRiseStart();
    }
  }

  onPlayerStep(x, z, footY) {
    // Check if player stands on any platform
    for (const p of this.platforms) {
      if (p.isFalling) continue;
      const margin = 0.5;
      const inX = x >= p.x - p.w / 2 - margin && x <= p.x + p.w / 2 + margin;
      const inZ = z >= p.z - p.d / 2 - margin && z <= p.z + p.d / 2 + margin;
      const inY = Math.abs(footY - p.topY) < 0.6;

      if (inX && inZ && inY) {
        // Stepping onto any non-start platform wakes magma & girl!
        if (!p.isStartPlatform && !this.hasPlayerStartedParkour) {
          this.triggerParkourStart();
        }

        if (p.isCrumbling && !p.stepped) {
          p.stepped = true;
          soundEngine.playCrumbleWarning();
        }
      }
    }
  }

  getFloorHeight(x, z, currentY, radius = 0.45) {
    let highestFloor = -999;

    for (const p of this.platforms) {
      if (p.isFalling && p.topY < this.magmaLevel - 1) continue;

      const minX = p.x - p.w / 2 - radius * 0.7;
      const maxX = p.x + p.w / 2 + radius * 0.7;
      const minZ = p.z - p.d / 2 - radius * 0.7;
      const maxZ = p.z + p.d / 2 + radius * 0.7;

      if (x >= minX && x <= maxX && z >= minZ && z <= maxZ) {
        if (currentY >= p.topY - 0.45) {
          if (p.topY > highestFloor) {
            highestFloor = p.topY;
            // Landing on a non-start platform wakes magma & girl!
            if (!p.isStartPlatform && !this.hasPlayerStartedParkour) {
              this.triggerParkourStart();
            }
          }
        }
      }
    }

    return highestFloor;
  }

  isMagmaTouch(y) {
    return y <= this.magmaLevel + 0.35;
  }

  // -------------------------------------------------------------
  // 🛡️ SOLID 3D AABB HORIZONTAL SIDE COLLISIONS (Fixed: No random teleports!)
  // Prevents phasing through platform sides while cleanly allowing jumps and landings
  // -------------------------------------------------------------
  resolveCollision(pos, radius = 0.45) {
    if (isNaN(pos.x) || isNaN(pos.y) || isNaN(pos.z)) return;

    // 1. Keep within cylindrical caldera wall boundary
    const distFromCenter = Math.hypot(pos.x, pos.z);
    const safeHeight = Math.max(0, Math.min(this.calderaHeight, pos.y));
    const currentWallRadius = this.calderaRadius * (0.88 + 0.18 * (safeHeight / this.calderaHeight)) - radius;

    if (distFromCenter > currentWallRadius && distFromCenter > 0.001) {
      const angle = Math.atan2(pos.z, pos.x);
      pos.x = Math.cos(angle) * currentWallRadius;
      pos.z = Math.sin(angle) * currentWallRadius;
    }

    // 2. Solid horizontal side collision for platforms
    // Feet position relative to platform tops
    const feetY = pos.y - 1.7;

    for (const p of this.platforms) {
      // Falling platforms should never exert side collision
      if (p.isFalling) continue;

      const platformTop = p.topY;
      const platformBottom = p.y - p.h / 2 - 1.5;

      // If feet are within landing/step-up range of platform top, do NOT block horizontally!
      // Vertical collision (getFloorHeight) will catch and support the player cleanly.
      if (feetY >= platformTop - 0.45) continue;

      // If player is entirely below the platform, skip
      if (pos.y <= platformBottom) continue;

      const minX = p.x - p.w / 2;
      const maxX = p.x + p.w / 2;
      const minZ = p.z - p.d / 2;
      const maxZ = p.z + p.d / 2;

      const closestX = Math.max(minX, Math.min(pos.x, maxX));
      const closestZ = Math.max(minZ, Math.min(pos.z, maxZ));

      const dx = pos.x - closestX;
      const dz = pos.z - closestZ;
      const distSq = dx * dx + dz * dz;

      // Approaching from OUTSIDE the platform bounding box:
      if (distSq > 0.0001 && distSq < radius * radius) {
        const dist = Math.sqrt(distSq);
        const overlap = radius - dist;
        pos.x += (dx / dist) * overlap;
        pos.z += (dz / dist) * overlap;
      } else if (distSq <= 0.0001) {
        // Player center is horizontally inside the platform footprint.
        // If feet are near top surface (within 0.65m), allow floor collision to resolve vertically.
        if (feetY >= platformTop - 0.65) {
          continue;
        }

        // Only if deep inside from a high-speed penetration, nudge gently to nearest edge
        // Clamped to at most 0.15m per step to NEVER fling/teleport the player across the map!
        const dLeft = pos.x - minX;
        const dRight = maxX - pos.x;
        const dBottom = pos.z - minZ;
        const dTop = maxZ - pos.z;
        const minDist = Math.min(dLeft, dRight, dBottom, dTop);

        const nudge = Math.min(0.15, minDist + radius);
        if (minDist === dLeft) pos.x -= nudge;
        else if (minDist === dRight) pos.x += nudge;
        else if (minDist === dBottom) pos.z -= nudge;
        else pos.z += nudge;
      }
    }
  }

  hasLineOfSight(pos1, pos2) {
    const dy = Math.abs(pos1.y - pos2.y);
    const dxz = Math.hypot(pos1.x - pos2.x, pos1.z - pos2.z);
    return dxz < 32 && dy < 16;
  }

  findNextWaypoint(fromPos, toPos) {
    let best = toPos.clone();
    let minDist = 99999;
    for (const p of this.platforms) {
      const d = Math.hypot(p.x - fromPos.x, p.z - fromPos.z);
      if (d < minDist) {
        minDist = d;
        best.set(p.x, p.topY, p.z);
      }
    }
    return best;
  }

  // -------------------------------------------------------------
  // 👧 SAFE NEXTBOT SPAWN CALCULATOR (Point 3)
  // NEVER spawns directly in front of the player on their next jump!
  // -------------------------------------------------------------
  getNextbotSpawnPoint(nearPos = null) {
    // If no player pos or near the start, awaken her at the Starting Altar (0, 2.5, 16)
    // This is 100% BEHIND the player, chasing from the start!
    if (!nearPos) {
      return new THREE.Vector3(0, 2.5, 16);
    }

    // Find the platform closest to the player
    let playerPlatIdx = 0;
    let minPlayerDist = 9999;
    for (let i = 0; i < this.platforms.length; i++) {
      const p = this.platforms[i];
      const d = Math.hypot(p.x - nearPos.x, p.z - nearPos.z);
      if (d < minPlayerDist) {
        minPlayerDist = d;
        playerPlatIdx = i;
      }
    }

    // If player is on lower platforms (idx <= 3), spawn her at Starting Altar (behind player!)
    if (playerPlatIdx <= 3) {
      return new THREE.Vector3(0, 2.5, 16);
    }

    // For mid-game respawns: pick a platform BEHIND the player that is above lava!
    const behindPlatforms = this.platforms.filter((p, idx) => {
      return idx < playerPlatIdx - 2 && p.topY > this.magmaLevel + 1.8 && !p.isFalling;
    });

    if (behindPlatforms.length > 0) {
      // Pick a platform behind the player to pursue from below!
      const choice = behindPlatforms[behindPlatforms.length - 1];
      return new THREE.Vector3(choice.x, choice.topY + 0.5, choice.z);
    }

    // Otherwise, pick a platform far across the crater (> 18m away) but NEVER in the next 6 platforms ahead!
    const acrossPlatforms = this.platforms.filter((p, idx) => {
      const isAhead = (idx >= playerPlatIdx && idx <= playerPlatIdx + 6);
      const d = Math.hypot(p.x - nearPos.x, p.z - nearPos.z);
      return !isAhead && d >= 16 && p.topY > this.magmaLevel + 2 && !p.isFalling;
    });

    if (acrossPlatforms.length > 0) {
      const choice = acrossPlatforms[Math.floor(Math.random() * acrossPlatforms.length)];
      return new THREE.Vector3(choice.x, choice.topY + 0.5, choice.z);
    }

    return new THREE.Vector3(0, 2.5, 16);
  }

  getRandomSpawnPoint(nearPos = null, minDist = 0) {
    return this.getNextbotSpawnPoint(nearPos);
  }

  update(delta) {
    if (delta > 0.1) delta = 0.1;
    this.magmaTime += delta;

    // 1. Rising Magma Logic (ONLY rises after parkour has started!)
    if (this.isMagmaRising && this.magmaLevel < this.maxMagmaLevel) {
      this.magmaLevel += this.magmaRisingSpeed * delta;
      this.lavaMesh.position.y = this.magmaLevel;
      this.magmaLight.position.y = this.magmaLevel + 2.5;
    }

    // 2. Magma surface 3D bubbling undulation waves
    if (this.lavaMesh && this.lavaMesh.geometry) {
      const posAttr = this.lavaMesh.geometry.attributes.position;
      const count = posAttr.count;
      const t = this.magmaTime;
      for (let i = 0; i < count; i++) {
        const vx = posAttr.getX(i);
        const vy = posAttr.getY(i);
        const wave = Math.sin(t * 3.4 + vx * 0.32) * 0.28 +
                     Math.cos(t * 2.7 + vy * 0.32) * 0.22;
        posAttr.setZ(i, wave);
      }
      posAttr.needsUpdate = true;
    }

    if (this.lavaMat && this.lavaMat.map) {
      this.lavaMat.map.offset.x = (this.magmaTime * 0.06) % 1;
      this.lavaMat.map.offset.y = (this.magmaTime * 0.04) % 1;
      this.lavaMat.emissiveIntensity = 1.1 + Math.sin(this.magmaTime * 4.0) * 0.35;
    }
    this.magmaLight.intensity = 3.8 + Math.sin(this.magmaTime * 6) * 0.9;

    // 3. Crumbling Platforms Update
    for (const p of this.crumblingPlatforms) {
      if (p.stepped && !p.isFalling) {
        p.stepTimer += delta;
        p.mesh.position.x = p.x + (Math.random() - 0.5) * 0.12;
        p.mesh.position.z = p.z + (Math.random() - 0.5) * 0.12;

        if (p.stepTimer >= 2.2) {
          p.isFalling = true;
          soundEngine.playRockCollapse();
        }
      }

      if (p.isFalling) {
        p.fallSpeed += 22.0 * delta;
        p.mesh.position.y -= p.fallSpeed * delta;
        p.topY = p.mesh.position.y + p.h / 2;
        p.mesh.rotation.x += delta * 1.5;
        p.mesh.rotation.z += delta * 1.2;

        if (p.mesh.position.y < this.magmaLevel - 6) {
          p.mesh.visible = false;
        }
      }
    }

    // 4. Volcanic Ash & Ruby Spark Particles Update
    if (this.ashPoints) {
      const positions = this.ashPoints.geometry.attributes.position.array;
      const count = positions.length / 3;

      for (let i = 0; i < count; i++) {
        positions[i * 3] += this.ashVelocities[i * 3] * delta;
        positions[i * 3 + 1] += this.ashVelocities[i * 3 + 1] * delta;
        positions[i * 3 + 2] += this.ashVelocities[i * 3 + 2] * delta;

        if (positions[i * 3 + 1] < this.magmaLevel) {
          positions[i * 3 + 1] = this.calderaHeight - 1;
        } else if (positions[i * 3 + 1] > this.calderaHeight) {
          positions[i * 3 + 1] = this.magmaLevel + 0.5;
        }
      }
      this.ashPoints.geometry.attributes.position.needsUpdate = true;
    }

    // 5. Geysers Eruption Loop
    this.updateGeysers(delta);

    // 6. Torii Gate Energy Pulse
    if (this.vortexMesh && this.vortexMat) {
      this.vortexMat.opacity = 0.45 + Math.sin(this.magmaTime * 4) * 0.25;
      this.toriiLight.intensity = 2.8 + Math.sin(this.magmaTime * 5) * 0.8;
    }
  }

  updateGeysers(delta) {
    this.geysers.forEach((g) => {
      g.timer -= delta;
      if (g.timer <= 0) {
        g.timer = 5.0 + Math.random() * 6.0;
        g.active = 1.4;
        soundEngine.playGeyserErupt();
      }

      if (g.active > 0) {
        g.active -= delta;
        g.mesh.position.y = this.magmaLevel + 7;
        g.mesh.material.opacity = Math.min(0.9, g.active * 1.5);
        g.mesh.scale.set(1 + Math.sin(performance.now() * 0.05) * 0.3, 1, 1 + Math.sin(performance.now() * 0.05) * 0.3);
      } else {
        g.mesh.material.opacity = 0;
      }
    });
  }

  reset() {
    this.magmaLevel = this.initialMagmaLevel;
    this.isMagmaRising = false;
    this.hasPlayerStartedParkour = false;
    this.isRapidRise = false;
    this.magmaRisingSpeed = this.magmaBaseSpeed;
    this.magmaTime = 0;
    this.lavaMesh.position.y = this.magmaLevel;
    this.magmaLight.position.y = this.magmaLevel + 2.5;

    // Regenerate fresh complete randomized parkour course!
    this.generateRandomParkour();
  }

  destroy() {
    if (this.root && this.root.parent) {
      this.root.parent.remove(this.root);
    }
  }
}
