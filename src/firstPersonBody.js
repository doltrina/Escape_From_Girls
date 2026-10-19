import * as THREE from 'three';
import { soundEngine } from './audio.js';

// Procedural High-Detail Texture Caches by Accent Color
const jacketTextureCache = new Map();
const pantsTextureCache = new Map();
const sneakerTextureCache = new Map();

export function getCyberJacketTexture(accentColorHex = '#00f3ff') {
  const key = String(accentColorHex).toLowerCase();
  if (jacketTextureCache.has(key)) return jacketTextureCache.get(key);

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Deep matte obsidian cyber techwear base
  ctx.fillStyle = '#10141d';
  ctx.fillRect(0, 0, 512, 512);

  // Micro ripstop technical weave pattern
  ctx.fillStyle = 'rgba(255, 255, 255, 0.035)';
  for (let x = 0; x < 512; x += 8) {
    ctx.fillRect(x, 0, 1, 512);
  }
  for (let y = 0; y < 512; y += 8) {
    ctx.fillRect(0, y, 512, 1);
  }

  // Tactical shoulder & chest ballistic reinforcement panels
  ctx.fillStyle = '#171d2b';
  ctx.fillRect(0, 0, 160, 220);
  ctx.fillRect(352, 0, 160, 220);

  // High-contrast Cyber Accent Piping & Seams
  ctx.strokeStyle = accentColorHex;
  ctx.lineWidth = 2.5;
  ctx.shadowColor = accentColorHex;
  ctx.shadowBlur = 6;
  ctx.beginPath();
  ctx.moveTo(160, 0); ctx.lineTo(160, 220); ctx.lineTo(256, 260);
  ctx.moveTo(352, 0); ctx.lineTo(352, 220); ctx.lineTo(256, 260);
  ctx.stroke();

  // Central heavy-duty metallic waterproof zipper track
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#06080c';
  ctx.fillRect(246, 0, 20, 512);

  // Interlocking metallic zipper teeth
  ctx.fillStyle = '#8f9ba8';
  for (let y = 4; y < 512; y += 8) {
    ctx.fillRect(247, y, 7, 3);
    ctx.fillRect(258, y + 4, 7, 3);
  }

  // Cyber Accent pull tab runner
  ctx.fillStyle = accentColorHex;
  ctx.fillRect(249, 140, 14, 28);

  // Futuristic Military Techwear Stencils & Typography
  ctx.font = 'bold 18px monospace';
  ctx.fillStyle = accentColorHex;
  ctx.fillText('// UNIT-01 //', 24, 70);
  ctx.fillText('EVASION PROTOCOL', 24, 95);

  ctx.font = 'bold 22px monospace';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('RUN', 380, 75);

  // Hazard warning diagonal chevrons on sleeve edge
  ctx.fillStyle = '#ffaa00';
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(380 + i * 26, 120);
    ctx.lineTo(396 + i * 26, 120);
    ctx.lineTo(384 + i * 26, 145);
    ctx.lineTo(368 + i * 26, 145);
    ctx.fill();
  }

  // Tactical kangaroo pocket seams
  ctx.strokeStyle = accentColorHex;
  ctx.lineWidth = 2.0;
  ctx.strokeRect(170, 310, 172, 140);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  jacketTextureCache.set(key, texture);
  return texture;
}

export function getCargoPantsTexture(accentColorHex = '#00f3ff') {
  const key = String(accentColorHex).toLowerCase();
  if (pantsTextureCache.has(key)) return pantsTextureCache.get(key);

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Dark slate tactical canvas
  ctx.fillStyle = '#0d1117';
  ctx.fillRect(0, 0, 512, 512);

  // Crosshatch fabric weave
  ctx.fillStyle = 'rgba(255, 255, 255, 0.025)';
  for (let x = 0; x < 512; x += 6) {
    ctx.fillRect(x, 0, 1, 512);
    ctx.fillRect(0, x, 512, 1);
  }

  // Reinforced knee pad panels
  ctx.fillStyle = '#141a24';
  ctx.fillRect(40, 200, 180, 180);
  ctx.fillRect(292, 200, 180, 180);

  // Hexagonal grip dots on knees
  ctx.fillStyle = accentColorHex;
  for (let x = 60; x <= 200; x += 22) {
    for (let y = 220; y <= 360; y += 22) {
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.arc(x + 252, y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Double stitch seams
  ctx.strokeStyle = accentColorHex;
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

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  pantsTextureCache.set(key, texture);
  return texture;
}

export function getSneakerTexture(accentColorHex = '#00f3ff') {
  const key = String(accentColorHex).toLowerCase();
  if (sneakerTextureCache.has(key)) return sneakerTextureCache.get(key);

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

  // Cyber energy bar on heel
  ctx.fillStyle = accentColorHex;
  ctx.fillRect(80, 40, 352, 28);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 14px monospace';
  ctx.fillText('// CYBER TREAD 2077 //', 140, 60);

  // White geometric sole trim
  ctx.fillStyle = '#f0f3f6';
  ctx.fillRect(0, 480, 512, 32);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  sneakerTextureCache.set(key, texture);
  return texture;
}

/**
 * 🎮 Advanced True First-Person Body & Kinematic Arm System
 * - Seamless Anatomical Full Body: Torso, shoulders, belt, cargo pants and sneakers
 * - Natural Arm Attachment: Arms physically originate from torso shoulder sockets
 * - Full 2-Bone Analytical IK: Upper arm and forearm connect shoulder to hand without gap
 * - Gaze-Aligned Perspective: Head/neck pivots naturally without look-in or disconnected arms
 * - Stowable Tactical Flashlight: Lights originate strictly forward from the lens; hides on turn-off
 * - Static Arms During Jump: Eliminates awkward jerks upon jumping and landing
 */
export class FirstPersonBody {
  constructor(player, scene) {
    this.player = player;
    this.camera = player.camera;
    this.scene = scene;
    this.armorColorHex = (player && (player.armorColor || player.colorHex)) ? (player.armorColor || player.colorHex) : '#00f3ff';

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
    this.activeItemAnim = null;
    this.itemAnimTime = 0;
    this.itemAnimDuration = 1.0;
    this.flashlightClickAnim = 0;

    // Materials
    this.initMaterials();

    // Build Seamless Anatomical Full Body & Arms
    this.initBody();
  }

  initMaterials() {
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

    this.cyberAccentMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(this.armorColorHex),
      side: THREE.DoubleSide
    });

    this.torsoMat = new THREE.MeshStandardMaterial({
      map: getCyberJacketTexture(this.armorColorHex),
      roughness: 0.65,
      metalness: 0.25,
      side: THREE.DoubleSide
    });

    this.collarMat = new THREE.MeshStandardMaterial({
      color: 0x0c0f16,
      roughness: 0.85,
      side: THREE.DoubleSide
    });

    this.pantsMat = new THREE.MeshStandardMaterial({
      map: getCargoPantsTexture(this.armorColorHex),
      roughness: 0.8,
      metalness: 0.1,
      side: THREE.DoubleSide
    });

    this.metalMat = new THREE.MeshStandardMaterial({
      color: 0x22262d,
      roughness: 0.35,
      metalness: 0.85
    });
  }

  setArmorColor(colorHex) {
    if (!colorHex || colorHex === this.armorColorHex) return;
    this.armorColorHex = colorHex;
    if (this.cyberAccentMat) {
      this.cyberAccentMat.color.set(colorHex);
    }
    if (this.torsoMat) {
      this.torsoMat.map = getCyberJacketTexture(colorHex);
      this.torsoMat.needsUpdate = true;
    }
    if (this.pantsMat) {
      this.pantsMat.map = getCargoPantsTexture(colorHex);
      this.pantsMat.needsUpdate = true;
    }
  }

  initBody() {
    // Root group placed at player feet level in world space
    this.lowerBodyGroup = new THREE.Group();

    // -----------------------------------------------------------------------
    // 1. TORSO & SHOULDERS (Centered around spine at Z = 0.01)
    // -----------------------------------------------------------------------
    this.torsoGroup = new THREE.Group();
    this.torsoGroup.position.set(0, 1.25, 0.01);

    // Torso / Cyber Hoodie Body (Height 0.52m from pelvis to neck)
    const torsoGeo = new THREE.BoxGeometry(0.44, 0.52, 0.24);
    this.torsoMesh = new THREE.Mesh(torsoGeo, this.torsoMat);
    this.torsoGroup.add(this.torsoMesh);

    // Front Central Cyber Zipper (facing front -Z)
    const zipGeo = new THREE.PlaneGeometry(0.028, 0.48);
    const zipper = new THREE.Mesh(zipGeo, this.cyberAccentMat);
    zipper.position.set(0, 0.01, -0.122);
    this.torsoGroup.add(zipper);

    // Tactical Kangaroo Pouch Pocket on front
    const pocketGeo = new THREE.BoxGeometry(0.28, 0.15, 0.04);
    const pocket = new THREE.Mesh(pocketGeo, this.torsoMat);
    pocket.position.set(0, -0.12, -0.125);
    this.torsoGroup.add(pocket);

    // High Tactical Collar & Neck
    const collarGeo = new THREE.TorusGeometry(0.11, 0.028, 8, 20);
    const collarMesh = new THREE.Mesh(collarGeo, this.collarMat);
    collarMesh.rotation.x = Math.PI / 2;
    collarMesh.position.set(0, 0.26, 0.01);
    this.torsoGroup.add(collarMesh);

    const neckGeo = new THREE.CylinderGeometry(0.065, 0.072, 0.10, 14);
    const neckMesh = new THREE.Mesh(neckGeo, this.skinMat);
    neckMesh.position.set(0, 0.30, 0.01);
    this.torsoGroup.add(neckMesh);

    // Folded Hoodie Hood resting behind neck
    const hoodGeo = new THREE.BoxGeometry(0.26, 0.16, 0.12);
    const hoodMesh = new THREE.Mesh(hoodGeo, this.collarMat);
    hoodMesh.position.set(0, 0.22, 0.11);
    this.torsoGroup.add(hoodMesh);

    // Deltoid Shoulder Pauldrons (Left & Right)
    const shoulderGeo = new THREE.SphereGeometry(0.072, 12, 10);
    shoulderGeo.scale(1.0, 0.8, 1.0);

    const leftPauldron = new THREE.Mesh(shoulderGeo, this.sleeveMat);
    leftPauldron.position.set(-0.24, 0.21, 0.01);
    this.torsoGroup.add(leftPauldron);

    const rightPauldron = new THREE.Mesh(shoulderGeo, this.sleeveMat);
    rightPauldron.position.set(0.24, 0.21, 0.01);
    this.torsoGroup.add(rightPauldron);

    this.lowerBodyGroup.add(this.torsoGroup);

    // -----------------------------------------------------------------------
    // 2. PELVIS & TACTICAL BELT
    // -----------------------------------------------------------------------
    const pelvisGeo = new THREE.BoxGeometry(0.38, 0.15, 0.22);
    const pelvis = new THREE.Mesh(pelvisGeo, this.pantsMat);
    pelvis.position.set(0, 0.95, 0.0);
    this.lowerBodyGroup.add(pelvis);

    const buckleGeo = new THREE.BoxGeometry(0.065, 0.045, 0.02);
    const buckle = new THREE.Mesh(buckleGeo, this.cyberAccentMat);
    buckle.position.set(0, 0.95, -0.112);
    this.lowerBodyGroup.add(buckle);

    // -----------------------------------------------------------------------
    // 3. LEGS & SNEAKERS
    // -----------------------------------------------------------------------
    const legThighGeo = new THREE.BoxGeometry(0.15, 0.40, 0.16);
    const legShinGeo = new THREE.BoxGeometry(0.14, 0.38, 0.15);
    const cargoPocketGeo = new THREE.BoxGeometry(0.045, 0.12, 0.12);
    const sneakerTex = getSneakerTexture(this.armorColorHex);

    // Left Leg Pivot (Hip at Y = 0.88)
    this.leftLegPivot = new THREE.Group();
    this.leftLegPivot.position.set(-0.14, 0.88, 0.0);

    const leftThigh = new THREE.Mesh(legThighGeo, this.pantsMat);
    leftThigh.position.set(0, -0.20, 0.0);
    this.leftLegPivot.add(leftThigh);

    const leftShin = new THREE.Mesh(legShinGeo, this.pantsMat);
    leftShin.position.set(0, -0.56, -0.02);
    this.leftLegPivot.add(leftShin);

    const leftPocket = new THREE.Mesh(cargoPocketGeo, this.pantsMat);
    leftPocket.position.set(-0.08, -0.18, 0.0);
    this.leftLegPivot.add(leftPocket);

    this.leftShoe = this.createSneakerMesh(sneakerTex);
    this.leftShoe.position.set(0, -0.83, -0.05);
    this.leftLegPivot.add(this.leftShoe);
    this.lowerBodyGroup.add(this.leftLegPivot);

    // Right Leg Pivot (Hip at Y = 0.88)
    this.rightLegPivot = new THREE.Group();
    this.rightLegPivot.position.set(0.14, 0.88, 0.0);

    const rightThigh = new THREE.Mesh(legThighGeo, this.pantsMat);
    rightThigh.position.set(0, -0.20, 0.0);
    this.rightLegPivot.add(rightThigh);

    const rightShin = new THREE.Mesh(legShinGeo, this.pantsMat);
    rightShin.position.set(0, -0.56, -0.02);
    this.rightLegPivot.add(rightShin);

    const rightPocket = new THREE.Mesh(cargoPocketGeo, this.pantsMat);
    rightPocket.position.set(0.08, -0.18, 0.0);
    this.rightLegPivot.add(rightPocket);

    this.rightShoe = this.createSneakerMesh(sneakerTex);
    this.rightShoe.position.set(0, -0.83, -0.05);
    this.rightLegPivot.add(this.rightShoe);
    this.lowerBodyGroup.add(this.rightLegPivot);

    // -----------------------------------------------------------------------
    // 4. KINEMATIC ARMS (Anchored Directly to Torso Shoulders!)
    // -----------------------------------------------------------------------
    this.shoulderPosRight = new THREE.Vector3(0.24, 1.46, 0.02);
    this.shoulderPosLeft = new THREE.Vector3(-0.24, 1.46, 0.02);

    // Upper arm geometry: cylinder of length 0.26m extending along +Y from base (0,0,0)
    const upperArmGeo = new THREE.CylinderGeometry(0.046, 0.056, 0.26, 12);
    upperArmGeo.translate(0, 0.13, 0);

    // Forearm geometry: cylinder of length 0.24m extending along +Y from base (0,0,0)
    const forearmGeo = new THREE.CylinderGeometry(0.038, 0.046, 0.24, 12);
    forearmGeo.translate(0, 0.12, 0);

    // Elbow pad geometry
    const elbowPadGeo = new THREE.SphereGeometry(0.048, 10, 8);

    // --- RIGHT ARM & TACTICAL FLASHLIGHT ---
    this.rightUpperArmMesh = new THREE.Mesh(upperArmGeo, this.sleeveMat);
    this.rightUpperArmMesh.position.copy(this.shoulderPosRight);
    this.lowerBodyGroup.add(this.rightUpperArmMesh);

    this.rightForearmGroup = new THREE.Group();
    const rightForearmMesh = new THREE.Mesh(forearmGeo, this.sleeveMat);
    this.rightForearmGroup.add(rightForearmMesh);

    const rightElbowPad = new THREE.Mesh(elbowPadGeo, this.collarMat);
    this.rightForearmGroup.add(rightElbowPad);

    // Wrist trim ring
    const wristTrimGeo = new THREE.TorusGeometry(0.044, 0.006, 8, 16);
    const wristTrim = new THREE.Mesh(wristTrimGeo, this.cyberAccentMat);
    wristTrim.rotation.x = Math.PI / 2;
    wristTrim.position.set(0, 0.23, 0);
    this.rightForearmGroup.add(wristTrim);

    // Right Hand (at wrist Y = 0.24)
    this.rightHandGroup = new THREE.Group();
    this.rightHandGroup.position.set(0, 0.24, 0);

    const handGeo = new THREE.BoxGeometry(0.065, 0.06, 0.08);
    const rightHandMesh = new THREE.Mesh(handGeo, this.skinMat);
    rightHandMesh.position.set(0, 0.02, 0);
    this.rightHandGroup.add(rightHandMesh);

    // 🔦 Tactical Flashlight Model (Stowable!)
    this.initFlashlightModel();
    this.rightHandGroup.add(this.flashlightGroup);

    this.rightForearmGroup.add(this.rightHandGroup);
    this.lowerBodyGroup.add(this.rightForearmGroup);

    // --- LEFT ARM & ARTIFACTS ---
    this.leftUpperArmMesh = new THREE.Mesh(upperArmGeo, this.sleeveMat);
    this.leftUpperArmMesh.position.copy(this.shoulderPosLeft);
    this.lowerBodyGroup.add(this.leftUpperArmMesh);

    this.leftForearmGroup = new THREE.Group();
    const leftForearmMesh = new THREE.Mesh(forearmGeo, this.sleeveMat);
    this.leftForearmGroup.add(leftForearmMesh);

    const leftElbowPad = new THREE.Mesh(elbowPadGeo, this.collarMat);
    this.leftForearmGroup.add(leftElbowPad);

    const leftWristTrim = wristTrim.clone();
    this.leftForearmGroup.add(leftWristTrim);

    this.leftHandGroup = new THREE.Group();
    this.leftHandGroup.position.set(0, 0.24, 0);

    const leftHandMesh = new THREE.Mesh(handGeo, this.skinMat);
    leftHandMesh.position.set(0, 0.02, 0);
    this.leftHandGroup.add(leftHandMesh);

    // Artifact slot anchor on left hand
    this.artifactAnchor = new THREE.Group();
    this.artifactAnchor.position.set(0, 0.05, -0.04);
    this.leftHandGroup.add(this.artifactAnchor);

    this.initArtifactMeshes();

    this.leftForearmGroup.add(this.leftHandGroup);
    this.lowerBodyGroup.add(this.leftForearmGroup);

    if (this.scene) {
      this.scene.add(this.lowerBodyGroup);
    }
  }

  initFlashlightModel() {
    this.flashlightGroup = new THREE.Group();
    this.flashlightGroup.position.set(0, 0.03, -0.04);
    this.flashlightGroup.rotation.x = -Math.PI / 2; // Point forward

    // Hide model if flashlight is currently turned off
    this.flashlightGroup.visible = (this.player.flashlightOn !== false);

    // Body tube
    const tubeGeo = new THREE.CylinderGeometry(0.020, 0.020, 0.18, 16);
    const tube = new THREE.Mesh(tubeGeo, this.metalMat);
    tube.position.y = 0.04;
    this.flashlightGroup.add(tube);

    // Knurled grip ring
    const gripGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.08, 16);
    const gripMat = new THREE.MeshStandardMaterial({ color: 0x15181e, roughness: 0.85, metalness: 0.6 });
    const grip = new THREE.Mesh(gripGeo, gripMat);
    grip.position.y = 0.02;
    this.flashlightGroup.add(grip);

    // Head bezel
    const headGeo = new THREE.CylinderGeometry(0.032, 0.022, 0.06, 16);
    const head = new THREE.Mesh(headGeo, this.metalMat);
    head.position.y = 0.15;
    this.flashlightGroup.add(head);

    // Glowing front glass lens
    const lensGeo = new THREE.CircleGeometry(0.028, 16);
    this.lensMat = new THREE.MeshBasicMaterial({
      color: (this.player.flashlightOn !== false) ? 0xfff0c8 : 0x222222
    });
    this.flashlightLens = new THREE.Mesh(lensGeo, this.lensMat);
    this.flashlightLens.rotation.x = -Math.PI / 2;
    this.flashlightLens.position.y = 0.181;
    this.flashlightGroup.add(this.flashlightLens);

    // Red push button
    const btnGeo = new THREE.CylinderGeometry(0.006, 0.006, 0.010, 8);
    const btnMat = new THREE.MeshBasicMaterial({ color: 0xff2244 });
    const btn = new THREE.Mesh(btnGeo, btnMat);
    btn.position.set(0.022, 0.08, 0);
    btn.rotation.z = Math.PI / 2;
    this.flashlightGroup.add(btn);
  }

  initArtifactMeshes() {
    // 1. RTX 5090
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

    const fanGeo = new THREE.CylinderGeometry(0.032, 0.032, 0.008, 12);
    const fanMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff, wireframe: true });
    this.rtxFan1 = new THREE.Mesh(fanGeo, fanMat);
    this.rtxFan1.position.set(-0.045, 0, 0.021);
    this.rtxFan1.rotation.x = Math.PI / 2;
    this.rtxMesh.add(this.rtxFan1);

    this.rtxFan2 = this.rtxFan1.clone();
    this.rtxFan2.position.x = 0.045;
    this.rtxMesh.add(this.rtxFan2);

    this.rtxMesh.visible = false;
    this.artifactAnchor.add(this.rtxMesh);

    // Shockwave ring for Forcefield
    const waveGeo = new THREE.TorusGeometry(0.14, 0.015, 8, 24);
    this.waveMat = new THREE.MeshBasicMaterial({
      color: 0x00f3ff,
      transparent: true,
      opacity: 0
    });
    this.shockwaveMesh = new THREE.Mesh(waveGeo, this.waveMat);
    this.shockwaveMesh.position.set(0, 0.05, -0.1);
    this.artifactAnchor.add(this.shockwaveMesh);

    // 2. Monster Energy Drink Can
    this.canMesh = new THREE.Group();
    const canGeo = new THREE.CylinderGeometry(0.036, 0.036, 0.14, 16);
    const canMat = new THREE.MeshStandardMaterial({
      color: 0x0c0f12,
      metalness: 0.85,
      roughness: 0.3,
      emissive: 0x228800,
      emissiveIntensity: 0.5
    });
    const canBody = new THREE.Mesh(canGeo, canMat);
    this.canMesh.add(canBody);

    const lidGeo = new THREE.CylinderGeometry(0.034, 0.036, 0.012, 16);
    const lidMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.95, roughness: 0.2 });
    const lid = new THREE.Mesh(lidGeo, lidMat);
    lid.position.y = 0.072;
    this.canMesh.add(lid);

    this.canMesh.visible = false;
    this.artifactAnchor.add(this.canMesh);

    // 3. Dakimakura Anime Pillow
    this.pillowMesh = new THREE.Group();
    const pillowGeo = new THREE.BoxGeometry(0.12, 0.26, 0.06);
    const pillowMat = new THREE.MeshStandardMaterial({
      color: 0xff66cc,
      roughness: 0.9,
      emissive: 0xff0066,
      emissiveIntensity: 0.35
    });
    const pillowBody = new THREE.Mesh(pillowGeo, pillowMat);
    this.pillowMesh.add(pillowBody);

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

  createSneakerMesh(sneakerTex = null) {
    const group = new THREE.Group();

    const soleMat = new THREE.MeshStandardMaterial({
      color: 0xf2f2f2,
      roughness: 0.5,
      side: THREE.DoubleSide
    });
    const upperMat = new THREE.MeshStandardMaterial({
      color: 0x0c0f14,
      map: sneakerTex || getSneakerTexture(this.armorColorHex),
      roughness: 0.55,
      side: THREE.DoubleSide
    });
    const neonMat = this.cyberAccentMat || new THREE.MeshBasicMaterial({
      color: new THREE.Color(this.armorColorHex),
      side: THREE.DoubleSide
    });

    // Sole (white rubber)
    const soleGeo = new THREE.BoxGeometry(0.14, 0.05, 0.28);
    const sole = new THREE.Mesh(soleGeo, soleMat);
    sole.position.set(0, 0.025, -0.03);
    group.add(sole);

    // Shoe Upper (Black cyber sneaker)
    const upperGeo = new THREE.BoxGeometry(0.13, 0.07, 0.22);
    const upper = new THREE.Mesh(upperGeo, upperMat);
    upper.position.set(0, 0.07, -0.02);
    group.add(upper);

    // Toe Cap
    const toeGeo = new THREE.BoxGeometry(0.12, 0.05, 0.08);
    const toe = new THREE.Mesh(toeGeo, upperMat);
    toe.position.set(0, 0.06, -0.13);
    group.add(toe);

    // Cyan Neon Laces
    const lacesGeo = new THREE.PlaneGeometry(0.05, 0.08);
    const laces = new THREE.Mesh(lacesGeo, neonMat);
    laces.rotation.x = -Math.PI / 2.8;
    laces.position.set(0, 0.11, -0.04);
    group.add(laces);

    // Heel Counter & Neon Accent
    const heelGeo = new THREE.BoxGeometry(0.132, 0.07, 0.04);
    const heel = new THREE.Mesh(heelGeo, upperMat);
    heel.position.set(0, 0.07, +0.07);
    group.add(heel);

    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.134, 0.025, 0.015), neonMat);
    stripe.position.set(0, 0.06, +0.092);
    group.add(stripe);

    return group;
  }

  // -------------------------------------------------------------------------
  // 📐 2-BONE ANALYTICAL INVERSE KINEMATICS FOR ARMS
  // -------------------------------------------------------------------------
  solveArmIK(shoulderPos, targetPos, upperArmMesh, forearmGroup, isLeft = false) {
    const L1 = 0.26; // Upper arm length
    const L2 = 0.24; // Forearm length

    const toTarget = new THREE.Vector3().subVectors(targetPos, shoulderPos);
    let dist = toTarget.length();

    // Clamp distance within reachable arm span
    dist = Math.max(0.08, Math.min(dist, L1 + L2 - 0.005));
    toTarget.normalize();

    // Law of cosines for shoulder angle and elbow angle
    const cosAlpha = (L1 * L1 + dist * dist - L2 * L2) / (2 * L1 * dist);
    const alpha = Math.acos(Math.max(-1, Math.min(1, cosAlpha)));

    // Elbow bend direction: natural outward (+X for right, -X for left) and downward
    const bendNormal = new THREE.Vector3(isLeft ? -0.85 : 0.85, -0.35, 0.35).normalize();

    // Perpendicular elbow axis
    const sideAxis = new THREE.Vector3().crossVectors(toTarget, bendNormal).normalize();
    const elbowDir = new THREE.Vector3().crossVectors(sideAxis, toTarget).normalize();

    // Exact 3D Elbow Position
    const elbowPos = new THREE.Vector3()
      .copy(shoulderPos)
      .addScaledVector(toTarget, L1 * Math.cos(alpha))
      .addScaledVector(elbowDir, L1 * Math.sin(alpha));

    // Align Upper Arm (starts at shoulderPos, points along upperDir)
    const upperDir = new THREE.Vector3().subVectors(elbowPos, shoulderPos).normalize();
    upperArmMesh.position.copy(shoulderPos);
    upperArmMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), upperDir);

    // Align Forearm (starts at elbowPos, points along foreDir to targetPos)
    const foreDir = new THREE.Vector3().subVectors(targetPos, elbowPos).normalize();
    forearmGroup.position.copy(elbowPos);
    forearmGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), foreDir);
  }

  // -------------------------------------------------------------------------
  // 🎬 ANIMATION TRIGGERS
  // -------------------------------------------------------------------------
  triggerItemAnimation(typeId) {
    this.activeItemAnim = typeId;
    this.itemAnimTime = 0;

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
    // Hide or show the physical 3D flashlight mesh in hand
    this.flashlightGroup.visible = isOn;
    this.lensMat.color.setHex(isOn ? 0xfff0c8 : 0x222222);
    soundEngine.playFlashlightClick(isOn);
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
    const isAirborne = !p.isGrounded;

    // 1. Camera Strafe Banking (Roll Tilt)
    let strafeDir = 0;
    if (p.keys.left) strafeDir += 1;
    if (p.keys.right) strafeDir -= 1;
    this.targetRoll = strafeDir * (isSprinting ? 0.040 : 0.024);
    this.roll = THREE.MathUtils.lerp(this.roll, this.targetRoll, 10 * delta);

    // 2. Landing Compression Dip Physics
    if (!this.wasGroundedLastFrame && p.isGrounded) {
      const fallSpeed = Math.abs(p.verticalVelocity);
      const impactMagnitude = Math.min(0.18, Math.max(0.05, fallSpeed * 0.012));
      this.landDip = impactMagnitude;
      this.landDipVelocity = -10.0;
    }
    this.wasGroundedLastFrame = p.isGrounded;

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

    // 3. FOV Kick on Sprint
    let desiredFov = this.baseFov;
    if (hasSpeedBoost) desiredFov = 88;
    else if (isSprinting) desiredFov = 83;
    if (Math.abs(this.camera.fov - desiredFov) > 0.1) {
      this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, desiredFov, 8 * delta);
      this.camera.updateProjectionMatrix();
    }

    // 4. Mouse Look Inertial Sway
    const deltaYaw = p.yaw - this.lastYaw;
    const deltaPitch = p.pitch - this.lastPitch;
    this.lastYaw = p.yaw;
    this.lastPitch = p.pitch;

    const targetSwayX = -deltaYaw * 0.04;
    const targetSwayY = deltaPitch * 0.035;
    this.swayX = THREE.MathUtils.lerp(this.swayX, targetSwayX, 12 * delta);
    this.swayY = THREE.MathUtils.lerp(this.swayY, targetSwayY, 12 * delta);

    // 5. Walking / Sprinting Bobbing
    let walkBobX = 0;
    let walkBobY = 0;
    if (p.isGrounded && horizontalSpeed > 0.5 && !p.isDowned) {
      const freq = isSprinting ? 14 : 9;
      this.strideTimer += delta * freq;
      walkBobX = Math.cos(this.strideTimer * 0.5) * (isSprinting ? 0.015 : 0.008);
      walkBobY = Math.sin(this.strideTimer) * (isSprinting ? 0.020 : 0.010);
    } else {
      walkBobX = Math.cos(this.animTimer * 1.5) * 0.002;
      walkBobY = Math.sin(this.animTimer * 2.5) * 0.003;
    }

    // Static arms during jump / flight (no bobbing, dampened sway)
    if (isAirborne) {
      this.swayX = THREE.MathUtils.lerp(this.swayX, 0, 15 * delta);
      this.swayY = THREE.MathUtils.lerp(this.swayY, 0, 15 * delta);
      walkBobX = 0;
      walkBobY = 0;
      this.roll = THREE.MathUtils.lerp(this.roll, 0, 12 * delta);
    }

    // 6. Flashlight click recoil
    let flashOffsetZ = 0;
    let flashOffsetY = 0;
    if (this.flashlightClickAnim && this.flashlightClickAnim > 0) {
      this.flashlightClickAnim -= delta;
      flashOffsetZ = Math.sin((0.18 - this.flashlightClickAnim) / 0.18 * Math.PI) * 0.025;
      flashOffsetY = Math.sin((0.18 - this.flashlightClickAnim) / 0.18 * Math.PI) * 0.012;
    }

    // 7. Artifact Animation Offsets
    let itemAnimOffsetX = 0;
    let itemAnimOffsetY = 0;
    let itemAnimOffsetZ = 0;

    if (this.activeItemAnim) {
      this.itemAnimTime += delta;
      const progress = Math.min(1.0, this.itemAnimTime / this.itemAnimDuration);

      if (this.activeItemAnim === 'forcefield') {
        itemAnimOffsetX = 0.14 * Math.sin(progress * Math.PI);
        itemAnimOffsetY = 0.18 * Math.sin(progress * Math.PI);
        itemAnimOffsetZ = -0.08 * Math.sin(progress * Math.PI);
        this.rtxFan1.rotation.y += delta * 25;
        this.rtxFan2.rotation.y += delta * 25;
        const waveScale = 0.2 + progress * 2.5;
        this.shockwaveMesh.scale.set(waveScale, waveScale, waveScale);
        this.waveMat.opacity = Math.max(0, 0.9 * (1.0 - progress));
      } else if (this.activeItemAnim === 'energy_drink') {
        itemAnimOffsetX = 0.12 * Math.sin(progress * Math.PI);
        itemAnimOffsetY = 0.22 * Math.sin(progress * Math.PI);
        itemAnimOffsetZ = 0.06 * Math.sin(progress * Math.PI);
        this.canMesh.rotation.z = Math.sin(progress * Math.PI) * 0.65;
      } else if (this.activeItemAnim === 'dakimakura') {
        itemAnimOffsetX = 0.10 * Math.sin(progress * Math.PI);
        itemAnimOffsetY = 0.15 * Math.sin(progress * Math.PI);
        itemAnimOffsetZ = -0.15 * Math.sin(progress * Math.PI);
      } else if (this.activeItemAnim === 'd20_dice') {
        itemAnimOffsetX = 0.12 * Math.sin(progress * Math.PI);
        itemAnimOffsetY = 0.20 * Math.sin(progress * Math.PI);
        this.d20Mesh.rotation.x += delta * 8;
        this.d20Mesh.rotation.y += delta * 12;
      }

      if (progress >= 1.0) {
        this.activeItemAnim = null;
        this.rtxMesh.visible = false;
        this.canMesh.visible = false;
        this.pillowMesh.visible = false;
        this.d20Mesh.visible = false;
      }
    }

    // 8. Update Lower Body Position & Orientation
    if (this.lowerBodyGroup) {
      const groundPos = p.position.clone();
      groundPos.y = (p.position.y - p.eyeHeight);
      this.lowerBodyGroup.position.copy(groundPos);
      this.lowerBodyGroup.rotation.y = p.yaw;

      // Leg stride animation
      if (p.isGrounded && horizontalSpeed > 0.5 && !p.isDowned) {
        const strideAngle = Math.sin(this.strideTimer) * (isSprinting ? 0.65 : 0.42);
        this.leftLegPivot.rotation.x = strideAngle;
        this.rightLegPivot.rotation.x = -strideAngle;
      } else if (isAirborne) {
        this.leftLegPivot.rotation.x = THREE.MathUtils.lerp(this.leftLegPivot.rotation.x, 0.22, 8 * delta);
        this.rightLegPivot.rotation.x = THREE.MathUtils.lerp(this.rightLegPivot.rotation.x, -0.14, 8 * delta);
      } else {
        this.leftLegPivot.rotation.x = THREE.MathUtils.lerp(this.leftLegPivot.rotation.x, 0, 10 * delta);
        this.rightLegPivot.rotation.x = THREE.MathUtils.lerp(this.rightLegPivot.rotation.x, 0, 10 * delta);
      }

      // 9. Solve Kinematic Arm IK (Seamless connection from Torso Shoulders to Hands!)
      const pitchSin = Math.sin(p.pitch);
      const pitchCos = Math.cos(p.pitch);

      // Target Hand Positions in local body coordinate space
      const rightHandTarget = new THREE.Vector3(
        0.22 + this.swayX + walkBobX,
        1.32 + pitchSin * 0.28 + this.swayY + walkBobY + flashOffsetY,
        -0.42 * pitchCos - 0.04 + flashOffsetZ
      );

      const leftHandTarget = new THREE.Vector3(
        -0.22 + this.swayX - walkBobX + itemAnimOffsetX,
        1.28 + pitchSin * 0.26 + this.swayY - walkBobY + itemAnimOffsetY,
        -0.40 * pitchCos - 0.04 + itemAnimOffsetZ
      );

      // Solve IK from Torso Shoulders
      this.solveArmIK(this.shoulderPosRight, rightHandTarget, this.rightUpperArmMesh, this.rightForearmGroup, false);
      this.solveArmIK(this.shoulderPosLeft, leftHandTarget, this.leftUpperArmMesh, this.leftForearmGroup, true);
    }
  }

  destroy() {
    if (this.lowerBodyGroup && this.scene) {
      this.scene.remove(this.lowerBodyGroup);
    }
  }
}
