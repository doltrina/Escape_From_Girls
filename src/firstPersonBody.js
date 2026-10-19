import * as THREE from 'three';
import { soundEngine } from './audio.js';

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

    // Materials
    this.skinMat = new THREE.MeshStandardMaterial({
      color: 0xffd1b3,
      roughness: 0.75,
      metalness: 0.1
    });

    this.sleeveMat = new THREE.MeshStandardMaterial({
      color: 0x111622,
      roughness: 0.65,
      metalness: 0.25
    });

    this.cyberAccentMat = new THREE.MeshStandardMaterial({
      color: 0x00f3ff,
      emissive: 0x00c8e6,
      emissiveIntensity: 0.8,
      roughness: 0.3
    });

    // 1. RIGHT ARM & TACTICAL FLASHLIGHT
    this.rightArmGroup = new THREE.Group();
    this.rightArmGroup.position.set(0.26, -0.24, -0.38);

    // Right Forearm & Sleeve
    const sleeveGeo = new THREE.CylinderGeometry(0.045, 0.055, 0.35, 12);
    const sleeveMesh = new THREE.Mesh(sleeveGeo, this.sleeveMat);
    sleeveMesh.rotation.x = Math.PI / 2.6;
    sleeveMesh.position.set(0, -0.06, 0.12);
    this.rightArmGroup.add(sleeveMesh);

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

    const leftSleeveMesh = sleeveMesh.clone();
    leftSleeveMesh.rotation.x = Math.PI / 2.5;
    leftSleeveMesh.rotation.y = 0.1;
    leftSleeveMesh.position.set(0, -0.06, 0.12);
    this.leftArmGroup.add(leftSleeveMesh);

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

    // 1. Torso / Cyber Hoodie (slanted slightly back so player looking down sees chest & zipper)
    const torsoGeo = new THREE.BoxGeometry(0.48, 0.55, 0.30);
    const torsoMat = new THREE.MeshStandardMaterial({
      color: 0x141822,
      roughness: 0.7,
      metalness: 0.2
    });
    this.torsoMesh = new THREE.Mesh(torsoGeo, torsoMat);
    this.torsoMesh.position.set(0, 0.96, -0.04);
    this.lowerBodyGroup.add(this.torsoMesh);

    // Cyber Zipper / Chest Light
    const zipGeo = new THREE.PlaneGeometry(0.035, 0.48);
    const zipMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff });
    const zipper = new THREE.Mesh(zipGeo, zipMat);
    zipper.position.set(0, 0.96, 0.115);
    this.lowerBodyGroup.add(zipper);

    // 2. Cargo Pants Legs
    const legGeo = new THREE.BoxGeometry(0.17, 0.65, 0.18);
    const pantsMat = new THREE.MeshStandardMaterial({
      color: 0x1a2130,
      roughness: 0.85
    });

    // Left Leg Pivot
    this.leftLegPivot = new THREE.Group();
    this.leftLegPivot.position.set(-0.16, 0.68, 0);
    const leftLeg = new THREE.Mesh(legGeo, pantsMat);
    leftLeg.position.y = -0.32;
    this.leftLegPivot.add(leftLeg);

    // Left Sneaker
    this.leftShoe = this.createSneakerMesh();
    this.leftShoe.position.set(0, -0.66, 0.04);
    this.leftLegPivot.add(this.leftShoe);
    this.lowerBodyGroup.add(this.leftLegPivot);

    // Right Leg Pivot
    this.rightLegPivot = new THREE.Group();
    this.rightLegPivot.position.set(0.16, 0.68, 0);
    const rightLeg = new THREE.Mesh(legGeo, pantsMat);
    rightLeg.position.y = -0.32;
    this.rightLegPivot.add(rightLeg);

    // Right Sneaker
    this.rightShoe = this.createSneakerMesh();
    this.rightShoe.position.set(0, -0.66, 0.04);
    this.rightLegPivot.add(this.rightShoe);
    this.lowerBodyGroup.add(this.rightLegPivot);

    if (this.scene) {
      this.scene.add(this.lowerBodyGroup);
    }
  }

  createSneakerMesh() {
    const group = new THREE.Group();

    // Sole (white rubber)
    const soleGeo = new THREE.BoxGeometry(0.16, 0.05, 0.28);
    const soleMat = new THREE.MeshStandardMaterial({ color: 0xf0f0f0, roughness: 0.6 });
    const sole = new THREE.Mesh(soleGeo, soleMat);
    group.add(sole);

    // Shoe Upper (Black cyber sneaker)
    const upperGeo = new THREE.BoxGeometry(0.15, 0.08, 0.24);
    const upperMat = new THREE.MeshStandardMaterial({ color: 0x0a0c10, roughness: 0.5 });
    const upper = new THREE.Mesh(upperGeo, upperMat);
    upper.position.set(0, 0.06, -0.01);
    group.add(upper);

    // Neon Accent Stripe on heel
    const heelStripeGeo = new THREE.BoxGeometry(0.152, 0.03, 0.02);
    const heelStripeMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff });
    const stripe = new THREE.Mesh(heelStripeGeo, heelStripeMat);
    stripe.position.set(0, 0.05, -0.125);
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

    // 6. Update Right Arm & Flashlight Position
    let flashOffsetZ = 0;
    let flashOffsetY = 0;
    if (this.flashlightClickAnim && this.flashlightClickAnim > 0) {
      this.flashlightClickAnim -= delta;
      flashOffsetZ = Math.sin((0.18 - this.flashlightClickAnim) / 0.18 * Math.PI) * 0.03;
      flashOffsetY = Math.sin((0.18 - this.flashlightClickAnim) / 0.18 * Math.PI) * 0.015;
    }

    this.rightArmGroup.position.set(
      0.26 + this.swayX + walkBobX,
      -0.24 + this.swayY + walkBobY - this.landDip * 0.6 + flashOffsetY,
      -0.38 + flashOffsetZ
    );
    this.rightArmGroup.rotation.set(
      this.swayY * 1.8,
      -this.swayX * 1.8,
      this.roll * 0.5
    );

    // 7. Update Left Arm & Artifact Animations
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
        // Raise RTX 5090 in front of camera, spin fans, expand shockwave
        const raisePhase = Math.sin(progress * Math.PI);
        leftArmTargetX = -0.06;
        leftArmTargetY = -0.12 + raisePhase * 0.08;
        leftArmTargetZ = -0.30;
        leftArmRotX = -0.4;
        leftArmRotY = -0.3;

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
        leftArmTargetX = -0.08;
        leftArmTargetY = -0.14 + raise * 0.12;
        leftArmTargetZ = -0.26;
        leftArmRotX = -0.7 * raise;
        leftArmRotZ = 0.3 * raise;
      } else if (this.activeItemAnim === 'dakimakura') {
        // Thrust forward in throw
        const throwP = Math.sin(progress * Math.PI);
        leftArmTargetX = -0.10;
        leftArmTargetY = -0.16;
        leftArmTargetZ = -0.38 - throwP * 0.22;
        leftArmRotX = throwP * 0.5;
      } else if (this.activeItemAnim === 'd20_dice') {
        // Roll glowing D20 in palm
        const rollPhase = Math.sin(progress * Math.PI);
        leftArmTargetX = -0.12;
        leftArmTargetY = -0.16 + rollPhase * 0.06;
        leftArmTargetZ = -0.28;
        this.d20Mesh.rotation.x += 8 * delta;
        this.d20Mesh.rotation.y += 12 * delta;
      }

      if (progress >= 1.0) {
        this.activeItemAnim = null;
        this.rtxMesh.visible = false;
        this.canMesh.visible = false;
        this.pillowMesh.visible = false;
        this.d20Mesh.visible = false;
        this.waveMat.opacity = 0;
      }
    }

    this.leftArmGroup.position.set(
      leftArmTargetX + this.swayX - walkBobX,
      leftArmTargetY + this.swayY - walkBobY - this.landDip * 0.6,
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
      groundPos.y = (p.position.y - p.eyeHeight) - this.landDip;
      this.lowerBodyGroup.position.copy(groundPos);
      this.lowerBodyGroup.rotation.y = p.yaw;

      // Animate walking leg strides
      if (p.isGrounded && horizontalSpeed > 0.5 && !p.isDowned) {
        const strideAngle = Math.sin(this.strideTimer) * (isSprinting ? 0.65 : 0.42);
        this.leftLegPivot.rotation.x = strideAngle;
        this.rightLegPivot.rotation.x = -strideAngle;
      } else if (!p.isGrounded) {
        // Airborne pose: tuck knees slightly
        this.leftLegPivot.rotation.x = THREE.MathUtils.lerp(this.leftLegPivot.rotation.x, 0.35, 8 * delta);
        this.rightLegPivot.rotation.x = THREE.MathUtils.lerp(this.rightLegPivot.rotation.x, -0.2, 8 * delta);
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
