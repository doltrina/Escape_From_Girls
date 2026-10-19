import * as THREE from 'three';
import { soundEngine } from './audio.js';

// =========================================================================
// 🎨 PROCEDURAL HIGH-DETAIL CANVAS TEXTURES FOR PLAYER BODY
// =========================================================================
let cachedJacketTexture = null;
let cachedPantsTexture = null;
let cachedSneakerTexture = null;

function getCyberJacketTexture() {
  if (cachedJacketTexture) return cachedJacketTexture;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Dark ballistic techwear fabric base
  ctx.fillStyle = '#141822';
  ctx.fillRect(0, 0, 512, 512);

  // Carbon-fiber / ripstop diamond weave pattern
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.lineWidth = 1;
  for (let i = -512; i < 1024; i += 8) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + 512, 512);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(i + 512, 0);
    ctx.lineTo(i, 512);
    ctx.stroke();
  }

  // Reinforced shoulder & chest ballistic armor panels
  ctx.fillStyle = '#0e121a';
  ctx.fillRect(40, 20, 432, 110);
  ctx.fillRect(60, 240, 392, 140); // Kangaroo chest pouch

  // Neon cyber piping & trim lines
  ctx.strokeStyle = '#00f3ff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(40, 130);
  ctx.lineTo(472, 130);
  ctx.moveTo(60, 240);
  ctx.lineTo(452, 240);
  ctx.stroke();

  // Center zipper track with metallic teeth
  ctx.fillStyle = '#080a0f';
  ctx.fillRect(246, 0, 20, 512);

  // Metallic zipper teeth
  ctx.fillStyle = '#a0b0c0';
  for (let y = 10; y < 500; y += 8) {
    ctx.fillRect(248, y, 6, 3);
    ctx.fillRect(258, y + 4, 6, 3);
  }

  // Cyan glowing zipper pull line
  ctx.strokeStyle = '#00f3ff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(256, 0);
  ctx.lineTo(256, 512);
  ctx.stroke();

  // High-Tech Cyber Stencil Badges & Decals
  ctx.fillStyle = '#00f3ff';
  ctx.font = 'bold 16px monospace';
  ctx.fillText('NEO-RUNNER // MK-IV', 60, 60);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.font = '12px monospace';
  ctx.fillText('TACTICAL BODYSUIT 2077', 60, 80);
  ctx.fillText('SPEC-OPS // ANTI-GIRL SYSTEM', 60, 100);

  // Hazard warning chevrons on right chest
  ctx.fillStyle = '#ffaa00';
  for (let h = 0; h < 3; h++) {
    ctx.beginPath();
    ctx.moveTo(380 + h * 24, 50);
    ctx.lineTo(396 + h * 24, 75);
    ctx.lineTo(380 + h * 24, 100);
    ctx.lineTo(388 + h * 24, 100);
    ctx.lineTo(404 + h * 24, 75);
    ctx.lineTo(388 + h * 24, 50);
    ctx.fill();
  }

  // Subtle ambient occlusion / gradient vignette
  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.4)');
  grad.addColorStop(0.5, 'rgba(0, 0, 0, 0)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0.6)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  cachedJacketTexture = new THREE.CanvasTexture(canvas);
  return cachedJacketTexture;
}

function getCargoPantsTexture() {
  if (cachedPantsTexture) return cachedPantsTexture;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Dark charcoal tactical cargo fabric
  ctx.fillStyle = '#161c28';
  ctx.fillRect(0, 0, 512, 512);

  // Subtle crosshatch twill
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 512; i += 6) {
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(512, i);
    ctx.stroke();
  }

  // Ballistic knee reinforcement panels
  ctx.fillStyle = '#0d1118';
  ctx.fillRect(60, 180, 160, 150);
  ctx.fillRect(292, 180, 160, 150);

  // Hexagonal knee grip texture
  ctx.fillStyle = '#080b10';
  for (let x = 70; x < 210; x += 16) {
    for (let y = 190; y < 320; y += 16) {
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + 232, y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Double stitch seams
  ctx.strokeStyle = '#00f3ff';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(50, 0); ctx.lineTo(50, 512);
  ctx.moveTo(462, 0); ctx.lineTo(462, 512);
  ctx.stroke();
  ctx.setLineDash([]);

  // Tactical webbing straps
  ctx.fillStyle = '#090c12';
  ctx.fillRect(20, 80, 30, 220);
  ctx.fillRect(462, 80, 30, 220);

  // Subtle ambient occlusion
  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.3)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0.5)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  cachedPantsTexture = new THREE.CanvasTexture(canvas);
  return cachedPantsTexture;
}

function getSneakerTexture() {
  if (cachedSneakerTexture) return cachedSneakerTexture;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Dark matte cyber leather
  ctx.fillStyle = '#0c0f16';
  ctx.fillRect(0, 0, 512, 512);

  // Perforated toe box micro-dots
  ctx.fillStyle = '#06080c';
  for (let x = 60; x < 450; x += 14) {
    for (let y = 300; y < 480; y += 14) {
      ctx.beginPath();
      ctx.arc(x, y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Cyan energy bar on heel
  ctx.fillStyle = '#00f3ff';
  ctx.fillRect(80, 40, 352, 28);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 14px monospace';
  ctx.fillText('// CYBER TREAD 2077 //', 140, 60);

  // White geometric sole trim
  ctx.fillStyle = '#f0f3f6';
  ctx.fillRect(0, 480, 512, 32);

  cachedSneakerTexture = new THREE.CanvasTexture(canvas);
  return cachedSneakerTexture;
}

/**
 * 🎮 First-Person Body, Viewmodel & Advanced Player Physics Manager
 * - True First-Person Lower Body (Torso, Cargo Pants, Sneakers visible when looking down)
 * - Animated First-Person Viewmodel (Hands holding 3D Tactical Flashlight & Artifacts)
 * - Artifact Activation Animations (RTX 5090 shockwave, Energy Drink chug, Dakimakura toss, D20 roll)
 * - Tactical Flashlight Switch with physical 3D model, lens glow & click
 * - Camera Strafe Banking (Roll Tilt), Landing Compression Dip, Dynamic FOV Kick
 */
export class FirstPersonBody {
  constructor(player, scene) {
    this.player = player;
    this.camera = player.camera;
    this.scene = scene;

    // Movement & Animation Timers
    this.animTimer = 0;
    this.strideTimer = 0;
    this.swayX = 0;
    this.swayY = 0;
    this.lastYaw = player.yaw;
    this.lastPitch = player.pitch;

    // Camera Physics (Roll Banking, Landing Dip, FOV)
    this.roll = 0;
    this.targetRoll = 0;
    this.landDip = 0;
    this.landDipVelocity = 0;
    this.wasGroundedLastFrame = true;
    this.targetFov = 75;
    this.baseFov = 75;

    // Active Item Animation State
    this.activeItemAnim = null; // 'forcefield' | 'energy_drink' | 'dakimakura' | 'd20_dice' | 'flashlight_click'
    this.itemAnimTime = 0;
    this.itemAnimDuration = 1.0;

    // Build 3D Components
    this.initViewmodel();
    this.initLowerBody();
  }

  // -------------------------------------------------------------------------
  // 🖐️ FIRST-PERSON VIEWMODEL (Hands, Tactical Flashlight, Artifacts)
  // -------------------------------------------------------------------------
  initViewmodel() {
    this.viewmodelRoot = new THREE.Group();
    // Keep viewmodel rendering close to camera without clipping
    this.viewmodelRoot.position.set(0, 0, 0);
    this.camera.add(this.viewmodelRoot);

    // Materials with DoubleSide to ensure no polygons are ever culled
    this.skinMat = new THREE.MeshStandardMaterial({
      color: 0xffd1b3,
      roughness: 0.75,
      metalness: 0.1,
      side: THREE.DoubleSide
    });

    this.sleeveMat = new THREE.MeshStandardMaterial({
      color: 0x111622,
      roughness: 0.65,
      metalness: 0.25,
      side: THREE.DoubleSide
    });

    this.cyberAccentMat = new THREE.MeshStandardMaterial({
      color: 0x00f3ff,
      emissive: 0x00c8e6,
      emissiveIntensity: 0.8,
      roughness: 0.3,
      side: THREE.DoubleSide
    });

    // 1. RIGHT ARM & TACTICAL FLASHLIGHT
    this.rightArmGroup = new THREE.Group();
    this.rightArmGroup.position.set(0.26, -0.24, -0.38);

    // Right Forearm Sleeve
    const sleeveGeo = new THREE.CylinderGeometry(0.045, 0.055, 0.35, 12);
    const sleeveMesh = new THREE.Mesh(sleeveGeo, this.sleeveMat);
    sleeveMesh.rotation.x = Math.PI / 2.6;
    sleeveMesh.position.set(0, -0.06, 0.12);
    this.rightArmGroup.add(sleeveMesh);

    // Right Upper Arm Sleeve (Anchored behind the camera so arm is never detached!)
    const upperArmGeo = new THREE.CylinderGeometry(0.052, 0.064, 0.52, 12);
    const rightUpperArm = new THREE.Mesh(upperArmGeo, this.sleeveMat);
    rightUpperArm.rotation.x = Math.PI / 2.3;
    rightUpperArm.rotation.y = 0.12;
    rightUpperArm.position.set(0.03, -0.16, 0.40);
    this.rightArmGroup.add(rightUpperArm);

    // Right Shoulder Cap
    const capGeo = new THREE.CircleGeometry(0.064, 12);
    const rightShoulderCap = new THREE.Mesh(capGeo, this.sleeveMat);
    rightShoulderCap.rotation.x = Math.PI / 2.3;
    rightShoulderCap.position.set(0.03, -0.28, 0.65);
    this.rightArmGroup.add(rightShoulderCap);

    // Cyber trim ring on wrist
    const trimGeo = new THREE.TorusGeometry(0.047, 0.006, 8, 16);
    const trimMesh = new THREE.Mesh(trimGeo, this.cyberAccentMat);
    trimMesh.rotation.x = Math.PI / 2.6;
    trimMesh.position.set(0, -0.02, 0.03);
    this.rightArmGroup.add(trimMesh);

    // Right Hand
    const handGeo = new THREE.BoxGeometry(0.065, 0.06, 0.09);
    const handMesh = new THREE.Mesh(handGeo, this.skinMat);
    handMesh.position.set(0, 0, -0.03);
    this.rightArmGroup.add(handMesh);

    // 🔦 High-Detail 3D Tactical Flashlight
    this.flashlightGroup = new THREE.Group();
    this.flashlightGroup.position.set(0, 0.02, -0.08);
    // Hide flashlight model when switched off so empty hand remains
    this.flashlightGroup.visible = (this.player.flashlightOn !== false);

    const metalMat = new THREE.MeshStandardMaterial({
      color: 0x22262d,
      roughness: 0.35,
      metalness: 0.85
    });

    // Body tube
    const torchTubeGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.20, 16);
    const torchTube = new THREE.Mesh(torchTubeGeo, metalMat);
    torchTube.rotation.x = Math.PI / 2;
    this.flashlightGroup.add(torchTube);

    // Knurled grip ring
    const gripGeo = new THREE.CylinderGeometry(0.024, 0.024, 0.09, 16);
    const gripMat = new THREE.MeshStandardMaterial({ color: 0x15181e, roughness: 0.8, metalness: 0.6 });
    const grip = new THREE.Mesh(gripGeo, gripMat);
    grip.rotation.x = Math.PI / 2;
    this.flashlightGroup.add(grip);

    // Torch Head Bezel
    const headGeo = new THREE.CylinderGeometry(0.036, 0.024, 0.06, 16);
    const torchHead = new THREE.Mesh(headGeo, metalMat);
    torchHead.rotation.x = -Math.PI / 2;
    torchHead.position.z = -0.11;
    this.flashlightGroup.add(torchHead);

    // Torch Glass Lens (Emissive Glow)
    const lensGeo = new THREE.CircleGeometry(0.032, 16);
    this.lensMat = new THREE.MeshBasicMaterial({
      color: 0xfff0c8
    });
    this.lensMesh = new THREE.Mesh(lensGeo, this.lensMat);
    this.lensMesh.position.z = -0.141;
    this.flashlightGroup.add(this.lensMesh);

    // Tactical Push Button on side
    const btnGeo = new THREE.CylinderGeometry(0.007, 0.007, 0.012, 8);
    const btnMat = new THREE.MeshBasicMaterial({ color: 0xff2244 });
    this.torchSwitchMesh = new THREE.Mesh(btnGeo, btnMat);
    this.torchSwitchMesh.position.set(0, 0.023, 0.02);
    this.flashlightGroup.add(this.torchSwitchMesh);

    this.rightArmGroup.add(this.flashlightGroup);
    this.viewmodelRoot.add(this.rightArmGroup);

    // 2. LEFT ARM (Free / Artifact Hand)
    this.leftArmGroup = new THREE.Group();
    this.leftArmGroup.position.set(-0.26, -0.27, -0.36);

    // Left Forearm Sleeve
    const leftSleeveMesh = sleeveMesh.clone();
    leftSleeveMesh.rotation.x = Math.PI / 2.5;
    leftSleeveMesh.rotation.y = 0.1;
    leftSleeveMesh.position.set(0, -0.06, 0.12);
    this.leftArmGroup.add(leftSleeveMesh);

    // Left Upper Arm Sleeve (Anchored behind the camera so arm is never detached!)
    const leftUpperArm = new THREE.Mesh(upperArmGeo, this.sleeveMat);
    leftUpperArm.rotation.x = Math.PI / 2.3;
    leftUpperArm.rotation.y = -0.12;
    leftUpperArm.position.set(-0.03, -0.16, 0.40);
    this.leftArmGroup.add(leftUpperArm);

    // Left Shoulder Cap
    const leftShoulderCap = new THREE.Mesh(capGeo, this.sleeveMat);
    leftShoulderCap.rotation.x = Math.PI / 2.3;
    leftShoulderCap.position.set(-0.03, -0.28, 0.65);
    this.leftArmGroup.add(leftShoulderCap);

    const leftTrimMesh = trimMesh.clone();
    leftTrimMesh.rotation.x = Math.PI / 2.5;
    leftTrimMesh.position.set(0, -0.02, 0.03);
    this.leftArmGroup.add(leftTrimMesh);

    this.leftHandMesh = new THREE.Mesh(handGeo, this.skinMat);
    this.leftHandMesh.position.set(0, 0, -0.03);
    this.leftArmGroup.add(this.leftHandMesh);

    // Artifact Slot Anchor on Left Hand
    this.artifactAnchor = new THREE.Group();
    this.artifactAnchor.position.set(0, 0.05, -0.06);
    this.leftArmGroup.add(this.artifactAnchor);

    // Init 3D Artifact Meshes for Animations
    this.initArtifactMeshes();

    this.viewmodelRoot.add(this.leftArmGroup);
  }

  // -------------------------------------------------------------------------
  // 📦 ARTIFACT 3D VIEWMODEL MESHES
  // -------------------------------------------------------------------------
  initArtifactMeshes() {
    // 1. RTX 5090 Graphics Card (Forcefield)
    this.rtxMesh = new THREE.Group();
    const gpuGeo = new THREE.BoxGeometry(0.18, 0.09, 0.038);
    const gpuMat = new THREE.MeshStandardMaterial({
      color: 0x181a20,
      metalness: 0.9,
      roughness: 0.25,
      emissive: 0x004466,
      emissiveIntensity: 0.4
    });
    const gpuBody = new THREE.Mesh(gpuGeo, gpuMat);
    this.rtxMesh.add(gpuBody);

    // Dual Illuminated Fans
    const fanGeo = new THREE.CylinderGeometry(0.032, 0.032, 0.008, 12);
    const fanMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff, wireframe: true });
    this.rtxFan1 = new THREE.Mesh(fanGeo, fanMat);
    this.rtxFan1.position.set(-0.045, 0, 0.021);
    this.rtxFan1.rotation.x = Math.PI / 2;
    this.rtxMesh.add(this.rtxFan1);

    this.rtxFan2 = this.rtxFan1.clone();
    this.rtxFan2.position.x = 0.045;
    this.rtxMesh.add(this.rtxFan2);

    // Neon Edge Strip
    const stripGeo = new THREE.PlaneGeometry(0.16, 0.008);
    const stripMat = new THREE.MeshBasicMaterial({ color: 0xff0077 });
    const strip = new THREE.Mesh(stripGeo, stripMat);
    strip.position.set(0, 0.038, 0.02);
    this.rtxMesh.add(strip);

    // Expanding Shockwave Torus Ring for activation
    const waveGeo = new THREE.TorusGeometry(0.12, 0.015, 8, 24);
    this.waveMat = new THREE.MeshBasicMaterial({
      color: 0x00f3ff,
      transparent: true,
      opacity: 0
    });
    this.shockwaveMesh = new THREE.Mesh(waveGeo, this.waveMat);
    this.shockwaveMesh.position.set(0, 0, -0.1);
    this.viewmodelRoot.add(this.shockwaveMesh);

    this.rtxMesh.visible = false;
    this.artifactAnchor.add(this.rtxMesh);

    // 2. Monster / Flash Energy Drink Can
    this.canMesh = new THREE.Group();
    const canGeo = new THREE.CylinderGeometry(0.038, 0.038, 0.14, 16);
    const canMat = new THREE.MeshStandardMaterial({
      color: 0x0c0f12,
      metalness: 0.85,
      roughness: 0.3,
      emissive: 0x228800,
      emissiveIntensity: 0.5
    });
    const canBody = new THREE.Mesh(canGeo, canMat);
    this.canMesh.add(canBody);

    // Metallic Rim & Lid
    const lidGeo = new THREE.CylinderGeometry(0.036, 0.038, 0.012, 16);
    const lidMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.95, roughness: 0.2 });
    const lid = new THREE.Mesh(lidGeo, lidMat);
    lid.position.y = 0.072;
    this.canMesh.add(lid);

    // Neon Green Claw Mark
    const clawGeo = new THREE.PlaneGeometry(0.04, 0.07);
    const clawMat = new THREE.MeshBasicMaterial({ color: 0x39ff14, side: THREE.DoubleSide });
    const claw = new THREE.Mesh(clawGeo, clawMat);
    claw.position.set(0, 0, 0.039);
    this.canMesh.add(claw);

    this.canMesh.visible = false;
    this.artifactAnchor.add(this.canMesh);

    // 3. Dakimakura Anime Pillow
    this.pillowMesh = new THREE.Group();
    const pillowGeo = new THREE.BoxGeometry(0.12, 0.28, 0.06);
    const pillowMat = new THREE.MeshStandardMaterial({
      color: 0xff66cc,
      roughness: 0.9,
      emissive: 0xff0066,
      emissiveIntensity: 0.35
    });
    const pillowBody = new THREE.Mesh(pillowGeo, pillowMat);
    this.pillowMesh.add(pillowBody);

    // Cute Anime Heart Decal
    const heartGeo = new THREE.PlaneGeometry(0.06, 0.06);
    const heartMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const heart = new THREE.Mesh(heartGeo, heartMat);
    heart.position.set(0, 0.03, 0.032);
    this.pillowMesh.add(heart);

    this.pillowMesh.visible = false;
    this.artifactAnchor.add(this.pillowMesh);

    // 4. D20 Miracle Dice
    this.d20Mesh = new THREE.Group();
    const d20Geo = new THREE.IcosahedronGeometry(0.045, 0);
    const d20Mat = new THREE.MeshStandardMaterial({
      color: 0xffaa00,
      emissive: 0xff8800,
      emissiveIntensity: 0.8,
      metalness: 0.4,
      roughness: 0.3
    });
    const d20Solid = new THREE.Mesh(d20Geo, d20Mat);
    this.d20Mesh.add(d20Solid);

    const d20Wire = new THREE.Mesh(d20Geo, new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true }));
    d20Wire.scale.setScalar(1.05);
    this.d20Mesh.add(d20Wire);

    this.d20Mesh.visible = false;
    this.artifactAnchor.add(this.d20Mesh);
  }

  // -------------------------------------------------------------------------
  // 👖 TRUE FIRST-PERSON LOWER BODY (Chest, Cargo Pants & Sneakers)
  // -------------------------------------------------------------------------
  initLowerBody() {
    this.lowerBodyGroup = new THREE.Group();

    // Create high-detail canvas textures
    const jacketTex = getCyberJacketTexture();
    const pantsTex = getCargoPantsTexture();
    const sneakerTex = getSneakerTexture();

    // Materials with DoubleSide to ensure no faces are ever culled or see-through!
    const torsoMat = new THREE.MeshStandardMaterial({
      map: jacketTex,
      roughness: 0.65,
      metalness: 0.25,
      side: THREE.DoubleSide
    });

    const collarMat = new THREE.MeshStandardMaterial({
      color: 0x0c0f16,
      roughness: 0.85,
      side: THREE.DoubleSide
    });

    const pantsMat = new THREE.MeshStandardMaterial({
      map: pantsTex,
      roughness: 0.8,
      metalness: 0.1,
      side: THREE.DoubleSide
    });

    const neonAccentMat = new THREE.MeshBasicMaterial({
      color: 0x00f3ff,
      side: THREE.DoubleSide
    });

    // Torso Group (Tilted and placed forward so camera looking down looks AT the chest, not inside the neck!)
    this.torsoGroup = new THREE.Group();
    this.torsoGroup.position.set(0, 0.94, -0.16);
    this.torsoGroup.rotation.x = -0.18;

    // 1. Torso / Cyber Hoodie Body (Upper chest broader, tapering slightly to waist)
    const torsoGeo = new THREE.BoxGeometry(0.44, 0.48, 0.24);
    this.torsoMesh = new THREE.Mesh(torsoGeo, torsoMat);
    this.torsoMesh.position.set(0, 0, 0);
    this.torsoGroup.add(this.torsoMesh);

    // 2. Collar & Neck (Low profile, sloping backwards)
    const collarGeo = new THREE.TorusGeometry(0.12, 0.025, 8, 20);
    const collarMesh = new THREE.Mesh(collarGeo, collarMat);
    collarMesh.rotation.x = Math.PI / 2;
    collarMesh.position.set(0, 0.24, 0.02);
    this.torsoGroup.add(collarMesh);

    // 3. Cyber Zipper on FRONT chest (facing -Z, the player's viewing direction!)
    const zipGeo = new THREE.PlaneGeometry(0.028, 0.44);
    const zipper = new THREE.Mesh(zipGeo, neonAccentMat);
    zipper.position.set(0, 0, -0.122);
    this.torsoGroup.add(zipper);

    // 4. Tactical Kangaroo Pocket / Pouch on front of hoodie
    const pocketGeo = new THREE.BoxGeometry(0.28, 0.14, 0.04);
    const pocket = new THREE.Mesh(pocketGeo, torsoMat);
    pocket.position.set(0, -0.12, -0.125);
    this.torsoGroup.add(pocket);

    this.lowerBodyGroup.add(this.torsoGroup);

    // 5. Pelvis / Tactical Belt
    const pelvisGeo = new THREE.BoxGeometry(0.38, 0.14, 0.22);
    const pelvis = new THREE.Mesh(pelvisGeo, pantsMat);
    pelvis.position.set(0, 0.68, -0.12);
    this.lowerBodyGroup.add(pelvis);

    const buckleGeo = new THREE.BoxGeometry(0.06, 0.04, 0.02);
    const buckle = new THREE.Mesh(buckleGeo, neonAccentMat);
    buckle.position.set(0, 0.68, -0.232);
    this.lowerBodyGroup.add(buckle);

    // 6. Cargo Pants Legs & Pivots (Positioned forward so thighs & knees are in view)
    const legThighGeo = new THREE.BoxGeometry(0.16, 0.34, 0.18);
    const legShinGeo = new THREE.BoxGeometry(0.15, 0.36, 0.17);
    const cargoPocketGeo = new THREE.BoxGeometry(0.045, 0.12, 0.12);

    // Left Leg Pivot
    this.leftLegPivot = new THREE.Group();
    this.leftLegPivot.position.set(-0.14, 0.64, -0.10);

    const leftThigh = new THREE.Mesh(legThighGeo, pantsMat);
    leftThigh.position.set(0, -0.16, -0.02);
    this.leftLegPivot.add(leftThigh);

    const leftShin = new THREE.Mesh(legShinGeo, pantsMat);
    leftShin.position.set(0, -0.46, -0.05);
    this.leftLegPivot.add(leftShin);

    const leftPocket = new THREE.Mesh(cargoPocketGeo, pantsMat);
    leftPocket.position.set(-0.085, -0.22, -0.02);
    this.leftLegPivot.add(leftPocket);

    this.leftShoe = this.createSneakerMesh(sneakerTex);
    this.leftShoe.position.set(0, -0.64, -0.06);
    this.leftLegPivot.add(this.leftShoe);
    this.lowerBodyGroup.add(this.leftLegPivot);

    // Right Leg Pivot
    this.rightLegPivot = new THREE.Group();
    this.rightLegPivot.position.set(0.14, 0.64, -0.10);

    const rightThigh = new THREE.Mesh(legThighGeo, pantsMat);
    rightThigh.position.set(0, -0.16, -0.02);
    this.rightLegPivot.add(rightThigh);

    const rightShin = new THREE.Mesh(legShinGeo, pantsMat);
    rightShin.position.set(0, -0.46, -0.05);
    this.rightLegPivot.add(rightShin);

    const rightPocket = new THREE.Mesh(cargoPocketGeo, pantsMat);
    rightPocket.position.set(0.085, -0.22, -0.02);
    this.rightLegPivot.add(rightPocket);

    this.rightShoe = this.createSneakerMesh(sneakerTex);
    this.rightShoe.position.set(0, -0.64, -0.06);
    this.rightLegPivot.add(this.rightShoe);
    this.lowerBodyGroup.add(this.rightLegPivot);

    if (this.scene) {
      this.scene.add(this.lowerBodyGroup);
    }
  }

  createSneakerMesh(sneakerTex = null) {
    const group = new THREE.Group();

    const soleMat = new THREE.MeshStandardMaterial({
      color: 0xf2f2f2,
      roughness: 0.5,
      side: THREE.DoubleSide
    });
    const upperMat = new THREE.MeshStandardMaterial({
      color: 0x0c0f14,
      map: sneakerTex || getSneakerTexture(),
      roughness: 0.55,
      side: THREE.DoubleSide
    });
    const neonMat = new THREE.MeshBasicMaterial({
      color: 0x00f3ff,
      side: THREE.DoubleSide
    });

    // Sole (white rubber) - centered, facing -Z forward
    const soleGeo = new THREE.BoxGeometry(0.14, 0.05, 0.28);
    const sole = new THREE.Mesh(soleGeo, soleMat);
    sole.position.set(0, 0.025, -0.03);
    group.add(sole);

    // Shoe Upper (Black cyber sneaker)
    const upperGeo = new THREE.BoxGeometry(0.13, 0.07, 0.22);
    const upper = new THREE.Mesh(upperGeo, upperMat);
    upper.position.set(0, 0.07, -0.02);
    group.add(upper);

    // Toe Cap (Front facing -Z!)
    const toeGeo = new THREE.BoxGeometry(0.12, 0.05, 0.08);
    const toe = new THREE.Mesh(toeGeo, upperMat);
    toe.position.set(0, 0.06, -0.13);
    group.add(toe);

    // Cyan Neon Laces / Accent on top of tongue
    const lacesGeo = new THREE.PlaneGeometry(0.05, 0.08);
    const laces = new THREE.Mesh(lacesGeo, neonMat);
    laces.rotation.x = -Math.PI / 2.8;
    laces.position.set(0, 0.11, -0.04);
    group.add(laces);

    // Heel Counter & Neon Accent (Back facing +Z!)
    const heelGeo = new THREE.BoxGeometry(0.132, 0.07, 0.04);
    const heel = new THREE.Mesh(heelGeo, upperMat);
    heel.position.set(0, 0.07, +0.07);
    group.add(heel);

    const heelStripeGeo = new THREE.BoxGeometry(0.134, 0.025, 0.015);
    const stripe = new THREE.Mesh(heelStripeGeo, neonMat);
    stripe.position.set(0, 0.06, +0.092);
    group.add(stripe);

    return group;
  }

  // -------------------------------------------------------------------------
  // 🎬 TRIGGER ARTIFACT & FLASHLIGHT ANIMATIONS
  // -------------------------------------------------------------------------
  triggerItemAnimation(typeId) {
    this.activeItemAnim = typeId;
    this.itemAnimTime = 0;

    // Reset visibility
    this.rtxMesh.visible = (typeId === 'forcefield');
    this.canMesh.visible = (typeId === 'energy_drink');
    this.pillowMesh.visible = (typeId === 'dakimakura');
    this.d20Mesh.visible = (typeId === 'd20_dice');

    if (typeId === 'forcefield') {
      this.itemAnimDuration = 1.3;
      this.waveMat.opacity = 0.9;
      this.shockwaveMesh.scale.set(0.1, 0.1, 0.1);
    } else if (typeId === 'energy_drink') {
      this.itemAnimDuration = 1.2;
      soundEngine.playCanOpen();
    } else if (typeId === 'dakimakura') {
      this.itemAnimDuration = 0.85;
    } else if (typeId === 'd20_dice') {
      this.itemAnimDuration = 1.0;
    }
  }

  triggerFlashlightToggle(isOn) {
    this.flashlightGroup.visible = isOn;
    this.lensMat.color.setHex(isOn ? 0xfff0c8 : 0x222222);
    soundEngine.playFlashlightClick(isOn);

    // Thumb button press animation
    this.flashlightClickAnim = 0.18;
  }

  // -------------------------------------------------------------------------
  // 🔄 MAIN PER-FRAME UPDATE LOOP
  // -------------------------------------------------------------------------
  update(delta) {
    if (delta > 0.1) delta = 0.1;
    this.animTimer += delta;

    const p = this.player;
    const isMoving = p.keys.forward || p.keys.backward || p.keys.left || p.keys.right;
    const horizontalSpeed = Math.hypot(p.velocity.x, p.velocity.z);
    const isSprinting = p.keys.sprint && isMoving && !p.isExhausted && !p.isDowned;
    const hasSpeedBoost = p.speedBoostTimeRemaining > 0;

    // 1. Advanced Camera Strafe Banking Physics (Roll Tilt on A/D)
    let strafeDir = 0;
    if (p.keys.left) strafeDir += 1;
    if (p.keys.right) strafeDir -= 1;
    this.targetRoll = strafeDir * (isSprinting ? 0.042 : 0.026); // ~2.4 degrees bank
    this.roll = THREE.MathUtils.lerp(this.roll, this.targetRoll, 10 * delta);
    this.camera.rotation.z = this.roll;

    // 2. Dynamic Landing Impact Dip Physics
    if (!this.wasGroundedLastFrame && p.isGrounded) {
      // Impact proportional to fall velocity
      const fallSpeed = Math.abs(p.verticalVelocity);
      const impactMagnitude = Math.min(0.20, Math.max(0.06, fallSpeed * 0.015));
      this.landDip = impactMagnitude;
      this.landDipVelocity = -12.0;
    }
    this.wasGroundedLastFrame = p.isGrounded;

    // Spring damping for landing dip recovery
    if (Math.abs(this.landDip) > 0.001 || Math.abs(this.landDipVelocity) > 0.01) {
      const springK = 140.0;
      const damping = 12.0;
      const springForce = -springK * this.landDip - damping * this.landDipVelocity;
      this.landDipVelocity += springForce * delta;
      this.landDip += this.landDipVelocity * delta;
    } else {
      this.landDip = 0;
      this.landDipVelocity = 0;
    }

    // 3. Dynamic FOV Kick on Sprint & Energy Boost
    let desiredFov = this.baseFov;
    if (hasSpeedBoost) {
      desiredFov = 88;
    } else if (isSprinting) {
      desiredFov = 83;
    }
    if (Math.abs(this.camera.fov - desiredFov) > 0.1) {
      this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, desiredFov, 8 * delta);
      this.camera.updateProjectionMatrix();
    }

    // 4. Mouse Look Inertial Sway (Hands lag slightly behind camera turn)
    const deltaYaw = p.yaw - this.lastYaw;
    const deltaPitch = p.pitch - this.lastPitch;
    this.lastYaw = p.yaw;
    this.lastPitch = p.pitch;

    const targetSwayX = -deltaYaw * 0.05;
    const targetSwayY = deltaPitch * 0.04;
    this.swayX = THREE.MathUtils.lerp(this.swayX, targetSwayX, 12 * delta);
    this.swayY = THREE.MathUtils.lerp(this.swayY, targetSwayY, 12 * delta);

    // 5. Walking / Sprinting Bobbing
    let walkBobX = 0;
    let walkBobY = 0;
    if (p.isGrounded && horizontalSpeed > 0.5 && !p.isDowned) {
      const freq = isSprinting ? 14 : 9;
      this.strideTimer += delta * freq;
      walkBobX = Math.cos(this.strideTimer * 0.5) * (isSprinting ? 0.018 : 0.009);
      walkBobY = Math.sin(this.strideTimer) * (isSprinting ? 0.024 : 0.012);
    } else {
      // Gentle idle breathing
      walkBobX = Math.cos(this.animTimer * 1.5) * 0.002;
      walkBobY = Math.sin(this.animTimer * 2.5) * 0.003;
    }

    // Keep arms static and stable during jumps & falls (Requirement 2)
    const isAirborne = !p.isGrounded;
    if (isAirborne) {
      this.swayX = THREE.MathUtils.lerp(this.swayX, 0, 15 * delta);
      this.swayY = THREE.MathUtils.lerp(this.swayY, 0, 15 * delta);
      walkBobX = 0;
      walkBobY = 0;
      this.roll = THREE.MathUtils.lerp(this.roll, 0, 12 * delta);
    }

    // 6. Update Right Arm & Flashlight Position (Removed landing dip jerk from arms)
    let flashOffsetZ = 0;
    let flashOffsetY = 0;
    if (this.flashlightClickAnim && this.flashlightClickAnim > 0) {
      this.flashlightClickAnim -= delta;
      flashOffsetZ = Math.sin((0.18 - this.flashlightClickAnim) / 0.18 * Math.PI) * 0.03;
      flashOffsetY = Math.sin((0.18 - this.flashlightClickAnim) / 0.18 * Math.PI) * 0.015;
    }

    this.rightArmGroup.position.set(
      0.26 + this.swayX + walkBobX,
      -0.24 + this.swayY + walkBobY + flashOffsetY,
      -0.38 + flashOffsetZ
    );
    this.rightArmGroup.rotation.set(
      this.swayY * 1.8,
      -this.swayX * 1.8,
      this.roll * 0.5
    );

    // 7. Update Left Arm & Artifact Animations (Arm stays firmly anchored to shoulder!)
    let leftArmTargetX = -0.26;
    let leftArmTargetY = -0.27;
    let leftArmTargetZ = -0.36;
    let leftArmRotX = 0;
    let leftArmRotY = 0;
    let leftArmRotZ = 0;

    if (this.activeItemAnim) {
      this.itemAnimTime += delta;
      const progress = Math.min(1.0, this.itemAnimTime / this.itemAnimDuration);

      if (this.activeItemAnim === 'forcefield') {
        // Raise RTX 5090 in front of chest/camera, spin fans, expand shockwave
        // Arm pivots from shoulder and stays firmly attached
        const raise = Math.sin(progress * Math.PI);
        leftArmTargetX = -0.26 + raise * 0.10; // raises inward towards -0.16
        leftArmTargetY = -0.27 + raise * 0.13; // raises to -0.14
        leftArmTargetZ = -0.36 + raise * 0.03; // stays close to chest at -0.33!
        leftArmRotX = -0.40 * raise;
        leftArmRotY = -0.25 * raise;
        leftArmRotZ = 0.18 * raise;

        // Spin fans rapidly
        this.rtxFan1.rotation.z += 45 * delta;
        this.rtxFan2.rotation.z += 45 * delta;

        // Expand holographic shockwave
        const waveScale = 0.1 + progress * 2.8;
        this.shockwaveMesh.scale.set(waveScale, waveScale, waveScale);
        this.waveMat.opacity = Math.max(0, (1 - progress) * 0.9);
      } else if (this.activeItemAnim === 'energy_drink') {
        // Bring can to mouth / camera, tilt back to chug
        const raise = Math.sin(progress * Math.PI);
        leftArmTargetX = -0.26 + raise * 0.12; // brings can inward to -0.14
        leftArmTargetY = -0.27 + raise * 0.15; // raises up to mouth level -0.12
        leftArmTargetZ = -0.36 + raise * 0.06; // brings can to -0.30
        leftArmRotX = -0.65 * raise;
        leftArmRotZ = 0.28 * raise;
      } else if (this.activeItemAnim === 'dakimakura') {
        // Toss pillow: hand raises, winds up and tosses forward while arm remains attached!
        const throwP = Math.sin(progress * Math.PI);
        leftArmTargetX = -0.26 + throwP * 0.08;
        leftArmTargetY = -0.27 + throwP * 0.10;
        leftArmTargetZ = -0.36 - throwP * 0.03; // at most -0.39, firmly connected to shoulder!
        leftArmRotX = 0.35 * throwP;
        leftArmRotZ = -0.15 * throwP;

        // Toss pillow forward out of hand
        this.pillowMesh.position.z = -throwP * 0.35;
        this.pillowMesh.position.y = throwP * 0.05;
        this.pillowMesh.scale.setScalar(Math.max(0.01, 1 - throwP * 0.7));
        this.pillowMesh.rotation.x = throwP * 2.5;
      } else if (this.activeItemAnim === 'd20_dice') {
        // Roll glowing D20 in palm
        const rollPhase = Math.sin(progress * Math.PI);
        leftArmTargetX = -0.26 + rollPhase * 0.08;
        leftArmTargetY = -0.27 + rollPhase * 0.10;
        leftArmTargetZ = -0.36 + rollPhase * 0.02;
        leftArmRotX = -0.25 * rollPhase;
        leftArmRotZ = 0.22 * rollPhase;
        this.d20Mesh.rotation.x += 8 * delta;
        this.d20Mesh.rotation.y += 12 * delta;
      }

      if (progress >= 1.0) {
        this.activeItemAnim = null;
        this.rtxMesh.visible = false;
        this.canMesh.visible = false;
        this.pillowMesh.visible = false;
        this.pillowMesh.position.set(0, 0, 0);
        this.pillowMesh.scale.set(1, 1, 1);
        this.pillowMesh.rotation.set(0, 0, 0);
        this.d20Mesh.visible = false;
        this.waveMat.opacity = 0;
      }
    }

    this.leftArmGroup.position.set(
      leftArmTargetX + this.swayX - walkBobX,
      leftArmTargetY + this.swayY - walkBobY,
      leftArmTargetZ
    );
    this.leftArmGroup.rotation.set(
      leftArmRotX + this.swayY * 1.5,
      leftArmRotY - this.swayX * 1.5,
      leftArmRotZ - this.roll * 0.5
    );

    // 8. Update Lower Body (Torso, Cargo Pants, Sneakers)
    if (this.lowerBodyGroup) {
      // Position lower body at ground level under player camera
      const groundPos = p.position.clone();
      groundPos.y = (p.position.y - p.eyeHeight);
      this.lowerBodyGroup.position.copy(groundPos);
      this.lowerBodyGroup.rotation.y = p.yaw;

      // Dynamic look-down framing: when player looks down, tilt torso naturally into view!
      if (this.torsoGroup) {
        const lookDown = Math.max(0, Math.min(1.0, -p.pitch / 1.35));
        this.torsoGroup.rotation.x = -0.18 - lookDown * 0.16;
        this.torsoGroup.position.z = -0.16 - lookDown * 0.08;
      }

      // Animate walking leg strides
      if (p.isGrounded && horizontalSpeed > 0.5 && !p.isDowned) {
        const strideAngle = Math.sin(this.strideTimer) * (isSprinting ? 0.65 : 0.42);
        this.leftLegPivot.rotation.x = strideAngle;
        this.rightLegPivot.rotation.x = -strideAngle;
      } else if (!p.isGrounded) {
        // Airborne pose: steady legs
        this.leftLegPivot.rotation.x = THREE.MathUtils.lerp(this.leftLegPivot.rotation.x, 0.25, 8 * delta);
        this.rightLegPivot.rotation.x = THREE.MathUtils.lerp(this.rightLegPivot.rotation.x, -0.15, 8 * delta);
      } else {
        // Idle stance
        this.leftLegPivot.rotation.x = THREE.MathUtils.lerp(this.leftLegPivot.rotation.x, 0, 10 * delta);
        this.rightLegPivot.rotation.x = THREE.MathUtils.lerp(this.rightLegPivot.rotation.x, 0, 10 * delta);
      }
    }
  }

  destroy() {
    if (this.viewmodelRoot && this.camera) {
      this.camera.remove(this.viewmodelRoot);
    }
    if (this.lowerBodyGroup && this.scene) {
      this.scene.remove(this.lowerBodyGroup);
    }
  }
}
