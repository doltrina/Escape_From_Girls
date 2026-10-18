import * as THREE from 'three';
import { soundEngine } from './audio.js';

// Procedural Canvas Texture Generators for Volcano
function createBasaltTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Dark charcoal volcanic rock
  ctx.fillStyle = '#141215';
  ctx.fillRect(0, 0, 512, 512);

  // Jagged basalt facets
  for (let i = 0; i < 400; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const size = 10 + Math.random() * 40;
    const shade = 18 + Math.floor(Math.random() * 24);
    ctx.fillStyle = `rgb(${shade + 4}, ${shade}, ${shade + 2})`;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }

  // Glowing orange magma fissures in rock
  for (let c = 0; c < 8; c++) {
    ctx.strokeStyle = 'rgba(255, 60, 0, 0.45)';
    ctx.lineWidth = 1 + Math.random() * 2.5;
    ctx.beginPath();
    let cx = Math.random() * 512;
    let cy = Math.random() * 512;
    ctx.moveTo(cx, cy);
    for (let s = 0; s < 6; s++) {
      cx += (Math.random() - 0.5) * 60;
      cy += (Math.random() - 0.5) * 60;
      ctx.lineTo(cx, cy);
    }
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  return texture;
}

function createLavaTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Deep molten red-orange base
  const grad = ctx.createRadialGradient(256, 256, 50, 256, 256, 256);
  grad.addColorStop(0, '#ffbb00');
  grad.addColorStop(0.3, '#ff4400');
  grad.addColorStop(0.7, '#cc1100');
  grad.addColorStop(1, '#550500');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  // Molten crust plates & cracks
  for (let i = 0; i < 30; i++) {
    const px = Math.random() * 512;
    const py = Math.random() * 512;
    const r = 20 + Math.random() * 45;
    ctx.fillStyle = '#220805';
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Golden-yellow bright hot veins
  ctx.strokeStyle = '#fff577';
  ctx.lineWidth = 2;
  for (let v = 0; v < 14; v++) {
    ctx.beginPath();
    let x = Math.random() * 512;
    let y = Math.random() * 512;
    ctx.moveTo(x, y);
    for (let s = 0; s < 4; s++) {
      x += (Math.random() - 0.5) * 80;
      y += (Math.random() - 0.5) * 80;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(6, 6);
  return texture;
}

function createCharredWoodTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#1c1614';
  ctx.fillRect(0, 0, 256, 256);

  ctx.strokeStyle = '#2d2420';
  ctx.lineWidth = 4;
  for (let y = 0; y < 256; y += 32) {
    ctx.strokeRect(0, y, 256, 30);
  }

  // Charred burnt marks
  for (let i = 0; i < 50; i++) {
    ctx.fillStyle = 'rgba(10, 5, 2, 0.7)';
    ctx.fillRect(Math.random() * 256, Math.random() * 256, Math.random() * 30, Math.random() * 10);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

// Global texture cache to prevent re-rendering canvases on every load
let cachedBasaltTexture = null;
let cachedLavaTexture = null;
let cachedCharredWoodTexture = null;

function getBasaltTexture() {
  if (!cachedBasaltTexture) cachedBasaltTexture = createBasaltTexture();
  return cachedBasaltTexture;
}

function getLavaTexture() {
  if (!cachedLavaTexture) cachedLavaTexture = createLavaTexture();
  return cachedLavaTexture;
}

function getCharredWoodTexture() {
  if (!cachedCharredWoodTexture) cachedCharredWoodTexture = createCharredWoodTexture();
  return cachedCharredWoodTexture;
}

export class CraterMap {
  constructor(scene) {
    this.scene = scene;
    this.isCrater = true;

    // Dimensions
    this.calderaRadius = 32; // meters radius of the crater
    this.calderaHeight = 38; // meters tall from floor to summit
    this.offsetX = -this.calderaRadius;
    this.offsetZ = -this.calderaRadius;
    this.width = this.calderaRadius * 2;
    this.depth = this.calderaRadius * 2;
    this.tileSize = 4;

    // Magma (The Floor is Lava) state
    this.magmaLevel = 0.5; // current Y
    this.initialMagmaLevel = 0.5;
    this.maxMagmaLevel = 29.5; // stops just below summit
    this.magmaBaseSpeed = 0.18; // steady rising speed from game start
    this.magmaRapidSpeed = 0.48; // rapid rising speed after Key 1 alarm
    this.magmaRisingSpeed = this.magmaBaseSpeed;
    this.isMagmaRising = true; // ALWAYS actively rising from start!
    this.isRapidRise = false;
    this.magmaTime = 0;

    // Platform lists
    this.platforms = [];
    this.crumblingPlatforms = [];
    this.walls = [];
    this.spawnPoints = [];

    // Geysers
    this.geysers = [];
    this.nextGeyserTime = 3.0;

    // Torii Gate Summit Exit
    this.exitPortal = null;
    this.exitPosition = new THREE.Vector3(0, 32.5, 0);

    // Callbacks
    this.onMagmaRiseStart = null;
    this.onPlayerMagmaDeath = null;

    this.buildVolcanoWorld();
  }

  buildVolcanoWorld() {
    this.root = new THREE.Group();
    this.scene.add(this.root);

    // Materials using cached procedural textures
    this.basaltMat = new THREE.MeshStandardMaterial({
      map: getBasaltTexture(),
      roughness: 0.85,
      metalness: 0.15
    });

    this.charredWoodMat = new THREE.MeshStandardMaterial({
      map: getCharredWoodTexture(),
      roughness: 0.9,
      metalness: 0.1
    });

    this.crumbleMat = new THREE.MeshStandardMaterial({
      color: 0x5a3d31,
      roughness: 0.95,
      metalness: 0.05
    });

    // 1. Crater Caldera Walls (Inverted Cone / Cylinder)
    const wallGeo = new THREE.CylinderGeometry(
      this.calderaRadius * 1.08, // Top radius (summit rim)
      this.calderaRadius * 0.88, // Bottom radius (base)
      this.calderaHeight,
      32,
      1,
      true // open ended
    );
    // Double-sided or inside face
    this.calderaWall = new THREE.Mesh(wallGeo, this.basaltMat);
    this.calderaWall.position.set(0, this.calderaHeight / 2, 0);
    this.calderaWall.material.side = THREE.BackSide;
    this.root.add(this.calderaWall);

    // 2. Rising Magma Pool Surface with 3D Wave Undulation
    const lavaGeo = new THREE.PlaneGeometry(this.calderaRadius * 2.15, this.calderaRadius * 2.15, 28, 28);
    this.lavaMat = new THREE.MeshStandardMaterial({
      map: getLavaTexture(),
      emissive: 0xff3300,
      emissiveIntensity: 0.9,
      roughness: 0.25,
      metalness: 0.75
    });
    this.lavaMesh = new THREE.Mesh(lavaGeo, this.lavaMat);
    this.lavaMesh.rotation.x = -Math.PI / 2;
    this.lavaMesh.position.set(0, this.magmaLevel, 0);
    this.root.add(this.lavaMesh);

    // Dynamic Magma Glow Light
    this.magmaLight = new THREE.PointLight(0xff4400, 3.5, 50, 1.2);
    this.magmaLight.position.set(0, this.magmaLevel + 2.5, 0);
    this.root.add(this.magmaLight);

    // Ambient Volcanic Glow
    this.volcanoHemi = new THREE.HemisphereLight(0x220505, 0xff3300, 0.9);
    this.root.add(this.volcanoHemi);

    // 3. Build 3 Tiers of Platforms & Obstacles
    this.buildTier1();
    this.buildTier2();
    this.buildTier3();
    this.buildSummitToriiGate();

    // 4. Volcanic Ash & Spark Particle System
    this.initAshParticles();

    // 5. Geysers
    this.initGeysers();
  }

  // --- PLATFORM CREATION HELPER ---
  addPlatform(x, y, z, w, h, d, type = 'rock', isCrumbling = false) {
    let mat = this.basaltMat;
    if (type === 'wood') mat = this.charredWoodMat;
    if (isCrumbling) mat = this.crumbleMat;

    const geo = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.root.add(mesh);

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
  // 🧗‍♂️ TIER 1: The Base (Y: 1.5m to 7.0m)
  // -------------------------------------------------------------
  buildTier1() {
    // 1. Starting Altar / Broad Rock Platform (Player Spawns Here!)
    const startP = this.addPlatform(0, 1.8, 16, 12, 1.2, 10, 'rock');
    this.spawnPoints.push(new THREE.Vector3(0, 2.5, 16));

    // Decorative braziers on starting platform
    this.addFireBrazier(-4.5, 2.4, 13);
    this.addFireBrazier(4.5, 2.4, 13);

    // 2. Stepped rock ledges leading westward
    this.addPlatform(-8.5, 2.8, 14, 5, 1.0, 5, 'rock');
    this.addPlatform(-14, 3.8, 11, 6, 1.2, 5, 'rock');

    // 3. FIRST OBSTACLE: Wide Chasm (Разлом) requiring Sprint + Jump
    // Gap is ~6.5 meters over boiling lava!
    this.addPlatform(-19, 4.6, 3, 5, 1.2, 6, 'rock');

    // 4. SECOND OBSTACLE: Crumbling Ledge (Осыпающийся уступ)!
    // Collapses 2 seconds after stepping on it!
    this.addPlatform(-20, 5.5, -4, 4.5, 0.8, 4.5, 'rock', true);

    // 5. Landing ledge leading into Tier 2 ascent
    this.addPlatform(-17, 6.8, -11, 6, 1.2, 6, 'rock');
  }

  // -------------------------------------------------------------
  // 🧗‍♂️ TIER 2: The Ascent & Floating Beams (Y: 8.0m to 19.0m)
  // -------------------------------------------------------------
  buildTier2() {
    // 1. Charred Wooden Beam Bridge clinging to western/northern wall
    this.addPlatform(-12, 8.4, -16, 5, 0.6, 5, 'wood');
    this.addPlatform(-5, 9.8, -19, 7, 0.6, 3.5, 'wood');

    // 2. Hanging Chains & Iron Anchor Platform
    this.addPlatform(4, 11.2, -18, 6, 0.8, 5, 'rock');
    this.addHangingChain(4, 11.2, -18, 18);

    // 3. Mid-air Chasm with suspended Key 2 Altar Platform!
    // Key 2 hangs in the middle of this leap!
    this.addPlatform(13, 12.8, -14, 5, 0.8, 5, 'wood');
    // Mid-air stepping beam under Key 2
    this.addPlatform(8.5, 12.2, -16, 2.5, 0.5, 2.5, 'wood');

    // 4. Crumbling rock shelf on eastern wall
    this.addPlatform(19, 14.2, -6, 4.5, 0.8, 4.5, 'rock', true);

    // 5. High rock shelf with glowing crystals
    this.addPlatform(18, 16.0, 4, 7, 1.2, 6, 'rock');
    this.addFireBrazier(18, 16.7, 5.5);

    // 6. Transition beam into Tier 3
    this.addPlatform(13, 17.8, 12, 5, 0.6, 5, 'wood');
  }

  // -------------------------------------------------------------
  // 🧗‍♂️ TIER 3: The Rim & Precarious Bridges (Y: 20.0m to 33.0m)
  // -------------------------------------------------------------
  buildTier3() {
    // 1. High wooden balcony overlooking entire bubbling crater
    this.addPlatform(5, 19.6, 17, 7, 0.8, 4.5, 'wood');

    // 2. Narrow Suspension Bridge across southern rim (Key 3 is here!)
    // Very narrow (1.8m width) with Nextbot cutting across!
    this.addPlatform(-3, 21.5, 16, 7, 0.5, 2.0, 'wood');
    this.addPlatform(-11, 23.2, 13, 6, 0.6, 2.2, 'wood');

    // 3. Final crumbling stone leap before the summit stairs
    this.addPlatform(-15, 25.0, 6, 4.2, 0.8, 4.2, 'rock', true);

    // 4. Grand Basalt Stairs winding up towards the summit center
    this.addPlatform(-13, 27.0, -2, 5, 1.0, 5, 'rock');
    this.addPlatform(-8, 29.0, -8, 6, 1.0, 5, 'rock');
    this.addPlatform(-2, 31.0, -6, 6, 1.0, 5, 'rock');

    // 5. The Grand Summit Arena (Y = 32.5m)
    // Octagonal / broad stone peak where the Torii Gate stands!
    this.summitPlatform = this.addPlatform(0, 32.0, 0, 14, 1.4, 14, 'rock');
    this.exitPosition.set(0, 32.7, 0);

    // Braziers flanking the Torii Gate
    this.addFireBrazier(-4.5, 32.7, -3);
    this.addFireBrazier(4.5, 32.7, -3);
    this.addFireBrazier(-4.5, 32.7, 3);
    this.addFireBrazier(4.5, 32.7, 3);
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

    // Swirling Energy Vortex / Mystic Barrier in Gate Center
    const vortexGeo = new THREE.PlaneGeometry(4.8, 5.2);
    this.vortexMat = new THREE.MeshBasicMaterial({
      color: 0xff5500,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide
    });
    this.vortexMesh = new THREE.Mesh(vortexGeo, this.vortexMat);
    this.vortexMesh.position.set(0, 2.8, 0);
    this.toriiGroup.add(this.vortexMesh);

    // Torii Point Light
    this.toriiLight = new THREE.PointLight(0xff7700, 3.0, 16, 1.5);
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

    // Fire flame core
    const flameGeo = new THREE.ConeGeometry(0.35, 0.9, 8);
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
    const flame = new THREE.Mesh(flameGeo, flameMat);
    flame.position.y = 0.7;
    brazierGroup.add(flame);

    const light = new THREE.PointLight(0xff6600, 1.8, 10, 2);
    light.position.y = 1.0;
    brazierGroup.add(light);

    this.root.add(brazierGroup);
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
    this.root.add(chain);
  }

  // -------------------------------------------------------------
  // 🌋 VOLCANIC ASH & SPARKS PARTICLES
  // -------------------------------------------------------------
  initAshParticles() {
    const particleCount = 180; // Optimized count for 60fps performance
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      // Spawn inside crater cylinder
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * (this.calderaRadius * 0.9);
      positions[i * 3] = Math.cos(angle) * r;
      positions[i * 3 + 1] = Math.random() * this.calderaHeight;
      positions[i * 3 + 2] = Math.sin(angle) * r;

      // Velocities: 70% falling dark ash, 30% rising bright fiery sparks
      const isSpark = Math.random() < 0.35;
      if (isSpark) {
        velocities[i * 3] = (Math.random() - 0.5) * 1.5;
        velocities[i * 3 + 1] = 1.2 + Math.random() * 2.0; // rising
        velocities[i * 3 + 2] = (Math.random() - 0.5) * 1.5;

        // Orange/yellow spark color
        colors[i * 3] = 1.0;
        colors[i * 3 + 1] = 0.4 + Math.random() * 0.5;
        colors[i * 3 + 2] = 0.0;
      } else {
        velocities[i * 3] = (Math.random() - 0.5) * 0.8;
        velocities[i * 3 + 1] = -(0.8 + Math.random() * 1.6); // falling ash
        velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.8;

        // Dark charcoal ash color
        const shade = 0.05 + Math.random() * 0.12;
        colors[i * 3] = shade;
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
      color: 0xff3300,
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
  // 🔄 UPDATE LOOP & LOGIC
  // -------------------------------------------------------------
  startMagmaRise() {
    this.isRapidRise = true;
    this.magmaRisingSpeed = this.magmaRapidSpeed;
    soundEngine.playSirenAlarm();
    if (this.onMagmaRiseStart) {
      this.onMagmaRiseStart();
    }
  }

  onPlayerStep(x, z, footY) {
    // Check if player stands on a crumbling platform
    for (const p of this.crumblingPlatforms) {
      if (p.isFalling) continue;
      const margin = 0.5;
      const inX = x >= p.x - p.w / 2 - margin && x <= p.x + p.w / 2 + margin;
      const inZ = z >= p.z - p.d / 2 - margin && z <= p.z + p.d / 2 + margin;
      const inY = Math.abs(footY - p.topY) < 0.6;

      if (inX && inZ && inY) {
        if (!p.stepped) {
          p.stepped = true;
          soundEngine.playCrumbleWarning();
        }
      }
    }
  }

  getFloorHeight(x, z, currentY, radius = 0.45) {
    let highestFloor = -999;

    // Test all platforms
    for (const p of this.platforms) {
      // If platform has completely plunged beneath magma, it no longer supports player
      if (p.isFalling && p.topY < this.magmaLevel - 1) continue;

      const minX = p.x - p.w / 2 - radius * 0.7;
      const maxX = p.x + p.w / 2 + radius * 0.7;
      const minZ = p.z - p.d / 2 - radius * 0.7;
      const maxZ = p.z + p.d / 2 + radius * 0.7;

      if (x >= minX && x <= maxX && z >= minZ && z <= maxZ) {
        // Player can land on top of platform if their feet are near or above platform top
        if (currentY >= p.topY - 0.45) {
          if (p.topY > highestFloor) {
            highestFloor = p.topY;
          }
        }
      }
    }

    return highestFloor;
  }

  isMagmaTouch(y) {
    return y <= this.magmaLevel + 0.35;
  }

  resolveCollision(pos, radius = 0.45) {
    // 1. Keep within cylindrical caldera wall boundary
    const distFromCenter = Math.hypot(pos.x, pos.z);
    // Boundary tapers slightly with height
    const currentWallRadius = this.calderaRadius * (0.88 + 0.18 * (pos.y / this.calderaHeight)) - radius;

    if (distFromCenter > currentWallRadius) {
      const angle = Math.atan2(pos.z, pos.x);
      pos.x = Math.cos(angle) * currentWallRadius;
      pos.z = Math.sin(angle) * currentWallRadius;
    }
  }

  hasLineOfSight(pos1, pos2) {
    // In crater, direct LOS exists if neither is blocked by central pillars or caldera lip
    const dy = Math.abs(pos1.y - pos2.y);
    const dxz = Math.hypot(pos1.x - pos2.x, pos1.z - pos2.z);
    return dxz < 32 && dy < 16;
  }

  findNextWaypoint(fromPos, toPos) {
    // Find closest platform waypoint along vertical ascent
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

  getRandomSpawnPoint(nearPos = null, minDist = 0) {
    if (!nearPos) {
      // Starting platform
      return new THREE.Vector3(0, 2.5, 16);
    }

    // Pick a platform at least minDist away
    const valid = this.platforms.filter((p) => {
      const d = Math.hypot(p.x - nearPos.x, p.z - nearPos.z);
      return d >= minDist && p.topY > this.magmaLevel + 2;
    });

    if (valid.length > 0) {
      const choice = valid[Math.floor(Math.random() * valid.length)];
      return new THREE.Vector3(choice.x, choice.topY + 0.5, choice.z);
    }

    return new THREE.Vector3(0, 2.5, 16);
  }

  update(delta) {
    if (delta > 0.1) delta = 0.1;
    this.magmaTime += delta;

    // 1. Rising Magma Logic (always creeping up, accelerated on alarm!)
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
      this.lavaMat.emissiveIntensity = 0.8 + Math.sin(this.magmaTime * 4.0) * 0.3;
    }
    this.magmaLight.intensity = 3.2 + Math.sin(this.magmaTime * 6) * 0.8;

    // 3. Crumbling Platforms Update
    for (const p of this.crumblingPlatforms) {
      if (p.stepped && !p.isFalling) {
        p.stepTimer += delta;
        // Violent shaking / vibration before collapse!
        p.mesh.position.x = p.x + (Math.random() - 0.5) * 0.12;
        p.mesh.position.z = p.z + (Math.random() - 0.5) * 0.12;

        if (p.stepTimer >= 2.0) {
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

        // Once submerged deep in magma, hide mesh
        if (p.mesh.position.y < this.magmaLevel - 6) {
          p.mesh.visible = false;
        }
      }
    }

    // 4. Volcanic Ash & Spark Particles Update
    if (this.ashPoints) {
      const positions = this.ashPoints.geometry.attributes.position.array;
      const count = positions.length / 3;

      for (let i = 0; i < count; i++) {
        positions[i * 3] += this.ashVelocities[i * 3] * delta;
        positions[i * 3 + 1] += this.ashVelocities[i * 3 + 1] * delta;
        positions[i * 3 + 2] += this.ashVelocities[i * 3 + 2] * delta;

        // Reset particles that fell below magma or rose above rim
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
      this.vortexMat.opacity = 0.4 + Math.sin(this.magmaTime * 4) * 0.25;
      this.toriiLight.intensity = 2.5 + Math.sin(this.magmaTime * 5) * 0.8;
    }
  }

  updateGeysers(delta) {
    this.geysers.forEach((g) => {
      g.timer -= delta;
      if (g.timer <= 0) {
        // Erupt!
        g.timer = 5.0 + Math.random() * 6.0;
        g.active = 1.4; // seconds active
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
    this.isMagmaRising = true;
    this.isRapidRise = false;
    this.magmaRisingSpeed = this.magmaBaseSpeed;
    this.magmaTime = 0;
    this.lavaMesh.position.y = this.magmaLevel;
    this.magmaLight.position.y = this.magmaLevel + 2.5;

    // Reset crumbling platforms
    for (const p of this.crumblingPlatforms) {
      p.stepped = false;
      p.stepTimer = 0;
      p.isFalling = false;
      p.fallSpeed = 0;
      p.mesh.position.set(p.x, p.origY, p.z);
      p.mesh.rotation.set(0, 0, 0);
      p.mesh.visible = true;
      p.topY = p.origY + p.h / 2;
    }
  }

  destroy() {
    if (this.root && this.root.parent) {
      this.root.parent.remove(this.root);
    }
  }
}
