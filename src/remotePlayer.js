import * as THREE from 'three';
import { getCyberJacketTexture, getCargoPantsTexture, getSneakerTexture } from './firstPersonBody.js';

/**
 * 🎮 Advanced 3D Cyber Techwear Avatar for Teammates in Co-op Multiplayer
 * - True Cyber Techwear Match: Torso hoodie, cyber zipper, deltoid pauldrons, cargo pants and sneakers
 * - Player Armor Color Accents: Reflects each teammate's chosen suit accent color (#00f3ff, #39ff14, etc.)
 * - Natural Forward-Aiming Arm Rig: Flashlight and beam align seamlessly with player's pitch (no inverted motion!)
 * - Dynamic Flashlight Stow: Hides mesh and beam when light is toggled off, smoothly swinging arm with stride
 * - Downed & Revive State: Rotates to floor with pulsing high-intensity beacon and distress status
 */
export class RemotePlayer {
  constructor(scene, playerInfo) {
    this.scene = scene;
    this.id = playerInfo.id;
    this.name = playerInfo.name || 'Самурай';
    this.colorHex = playerInfo.color || '#00f3ff';
    this.color = new THREE.Color(this.colorHex);

    this.isDowned = false;
    this.shieldActive = false;
    this.flashlightOn = true;

    // Target transforms for interpolation
    this.targetPosition = new THREE.Vector3(0, 0, 0);
    this.targetRotationY = 0;
    this.targetPitch = 0;
    this.isMoving = false;
    this.isSprinting = false;

    // Animation timers
    this.animTimer = 0;

    // Root Group
    this.root = new THREE.Group();
    this.root.position.set(0, 0, 0);

    this.initAvatarMesh();
    this.initNameplate();
    this.initShieldAura();
    this.initDownedBeacon();

    this.scene.add(this.root);
  }

  get position() {
    return this.root.position;
  }

  initAvatarMesh() {
    this.bodyGroup = new THREE.Group();

    // -----------------------------------------------------------------------
    // Shared Custom Materials with Player Chosen Armor Accent
    // -----------------------------------------------------------------------
    this.cyberAccentMat = new THREE.MeshBasicMaterial({
      color: this.color,
      side: THREE.DoubleSide
    });

    this.torsoMat = new THREE.MeshStandardMaterial({
      map: getCyberJacketTexture(this.colorHex),
      roughness: 0.65,
      metalness: 0.25,
      side: THREE.DoubleSide
    });

    this.sleeveMat = new THREE.MeshStandardMaterial({
      color: 0x111622,
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
      map: getCargoPantsTexture(this.colorHex),
      roughness: 0.8,
      metalness: 0.1,
      side: THREE.DoubleSide
    });

    this.skinMat = new THREE.MeshStandardMaterial({
      color: 0xffd1b3,
      roughness: 0.75,
      metalness: 0.1,
      side: THREE.DoubleSide
    });

    this.metalMat = new THREE.MeshStandardMaterial({
      color: 0x22262d,
      roughness: 0.35,
      metalness: 0.85
    });

    const soleMat = new THREE.MeshStandardMaterial({
      color: 0xf2f2f2,
      roughness: 0.5,
      side: THREE.DoubleSide
    });

    const sneakerTex = getSneakerTexture(this.colorHex);
    const sneakerUpperMat = new THREE.MeshStandardMaterial({
      color: 0x0c0f14,
      map: sneakerTex,
      roughness: 0.55,
      side: THREE.DoubleSide
    });

    // -----------------------------------------------------------------------
    // 1. TORSO & HOODIE JACKET (Centered at Y = 1.25)
    // -----------------------------------------------------------------------
    this.torsoGroup = new THREE.Group();
    this.torsoGroup.position.set(0, 1.25, 0.01);

    const torsoGeo = new THREE.BoxGeometry(0.44, 0.52, 0.24);
    this.torsoMesh = new THREE.Mesh(torsoGeo, this.torsoMat);
    this.torsoGroup.add(this.torsoMesh);

    // Front Central Cyber Zipper (facing front -Z)
    const zipGeo = new THREE.PlaneGeometry(0.028, 0.48);
    const zipper = new THREE.Mesh(zipGeo, this.cyberAccentMat);
    zipper.position.set(0, 0.01, -0.122);
    this.torsoGroup.add(zipper);

    // Kangaroo Pouch Pocket on front
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

    // Pauldron glowing neon trims
    const pauldronRingGeo = new THREE.TorusGeometry(0.06, 0.008, 6, 16);
    const leftRing = new THREE.Mesh(pauldronRingGeo, this.cyberAccentMat);
    leftRing.rotation.y = Math.PI / 2;
    leftRing.position.set(-0.28, 0.21, 0.01);
    this.torsoGroup.add(leftRing);

    const rightRing = new THREE.Mesh(pauldronRingGeo, this.cyberAccentMat);
    rightRing.rotation.y = Math.PI / 2;
    rightRing.position.set(0.28, 0.21, 0.01);
    this.torsoGroup.add(rightRing);

    this.bodyGroup.add(this.torsoGroup);

    // -----------------------------------------------------------------------
    // 2. HEAD & CYBER VISOR (Pivots with Pitch at Y = 1.62)
    // -----------------------------------------------------------------------
    this.headPivot = new THREE.Group();
    this.headPivot.position.set(0, 1.62, 0.01);

    const headGeo = new THREE.BoxGeometry(0.24, 0.26, 0.24);
    this.headMesh = new THREE.Mesh(headGeo, this.skinMat);
    this.headMesh.position.set(0, 0.04, 0);
    this.headPivot.add(this.headMesh);

    // Front Cyber Visor / Tactical Goggles
    const visorGeo = new THREE.BoxGeometry(0.21, 0.07, 0.04);
    const visorMesh = new THREE.Mesh(visorGeo, this.cyberAccentMat);
    visorMesh.position.set(0, 0.06, -0.125);
    this.headPivot.add(visorMesh);

    // Gamer Headset
    const headsetBandGeo = new THREE.TorusGeometry(0.14, 0.02, 8, 16, Math.PI);
    const headsetMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.8 });
    const headsetBand = new THREE.Mesh(headsetBandGeo, headsetMat);
    headsetBand.rotation.x = -Math.PI / 2;
    headsetBand.rotation.z = Math.PI / 2;
    headsetBand.position.set(0, 0.14, 0);
    this.headPivot.add(headsetBand);

    const earPadGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.04, 12);
    const earPad1 = new THREE.Mesh(earPadGeo, headsetMat);
    earPad1.rotation.z = Math.PI / 2;
    earPad1.position.set(-0.13, 0.04, 0);
    this.headPivot.add(earPad1);

    const earRing1 = new THREE.Mesh(new THREE.TorusGeometry(0.048, 0.007, 6, 14), this.cyberAccentMat);
    earRing1.rotation.y = Math.PI / 2;
    earRing1.position.set(-0.152, 0.04, 0);
    this.headPivot.add(earRing1);

    const earPad2 = earPad1.clone();
    earPad2.position.x = 0.13;
    this.headPivot.add(earPad2);

    const earRing2 = earRing1.clone();
    earRing2.position.x = 0.152;
    this.headPivot.add(earRing2);

    // Cap / Beanie crown
    const capGeo = new THREE.BoxGeometry(0.25, 0.06, 0.25);
    const cap = new THREE.Mesh(capGeo, this.collarMat);
    cap.position.set(0, 0.16, -0.01);
    this.headPivot.add(cap);

    this.bodyGroup.add(this.headPivot);

    // -----------------------------------------------------------------------
    // 3. PELVIS & TACTICAL BELT
    // -----------------------------------------------------------------------
    const pelvisGeo = new THREE.BoxGeometry(0.38, 0.15, 0.22);
    const pelvis = new THREE.Mesh(pelvisGeo, this.pantsMat);
    pelvis.position.set(0, 0.95, 0.0);
    this.bodyGroup.add(pelvis);

    const buckleGeo = new THREE.BoxGeometry(0.065, 0.045, 0.02);
    const buckle = new THREE.Mesh(buckleGeo, this.cyberAccentMat);
    buckle.position.set(0, 0.95, -0.112);
    this.bodyGroup.add(buckle);

    // -----------------------------------------------------------------------
    // 4. LEGS & SNEAKERS (Hip Pivots at Y = 0.88)
    // -----------------------------------------------------------------------
    const legThighGeo = new THREE.BoxGeometry(0.15, 0.40, 0.16);
    const legShinGeo = new THREE.BoxGeometry(0.14, 0.38, 0.15);
    const cargoPocketGeo = new THREE.BoxGeometry(0.045, 0.12, 0.12);

    const buildSneaker = () => {
      const g = new THREE.Group();
      const sole = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.05, 0.28), soleMat);
      sole.position.set(0, 0.025, -0.03);
      g.add(sole);

      const upper = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.07, 0.22), sneakerUpperMat);
      upper.position.set(0, 0.07, -0.02);
      g.add(upper);

      const toe = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.05, 0.08), sneakerUpperMat);
      toe.position.set(0, 0.06, -0.13);
      g.add(toe);

      const laces = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.08), this.cyberAccentMat);
      laces.rotation.x = -Math.PI / 2.8;
      laces.position.set(0, 0.11, -0.04);
      g.add(laces);

      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.134, 0.025, 0.015), this.cyberAccentMat);
      stripe.position.set(0, 0.06, +0.092);
      g.add(stripe);

      return g;
    };

    // Left Leg Pivot
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

    const leftShoe = buildSneaker();
    leftShoe.position.set(0, -0.83, -0.05);
    this.leftLegPivot.add(leftShoe);

    this.bodyGroup.add(this.leftLegPivot);

    // Right Leg Pivot
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

    const rightShoe = buildSneaker();
    rightShoe.position.set(0, -0.83, -0.05);
    this.rightLegPivot.add(rightShoe);

    this.bodyGroup.add(this.rightLegPivot);

    // -----------------------------------------------------------------------
    // 5. LEFT ARM (Swings Naturally with Strides)
    // -----------------------------------------------------------------------
    this.leftArmPivot = new THREE.Group();
    this.leftArmPivot.position.set(-0.24, 1.46, 0.02);

    const armUpperGeo = new THREE.CylinderGeometry(0.046, 0.056, 0.26, 12);
    armUpperGeo.translate(0, -0.13, 0);
    const leftUpperArm = new THREE.Mesh(armUpperGeo, this.sleeveMat);
    this.leftArmPivot.add(leftUpperArm);

    const elbowGeo = new THREE.SphereGeometry(0.048, 10, 8);
    const leftElbow = new THREE.Mesh(elbowGeo, this.collarMat);
    leftElbow.position.set(0, -0.26, 0);
    this.leftArmPivot.add(leftElbow);

    const armForeGeo = new THREE.CylinderGeometry(0.038, 0.046, 0.24, 12);
    armForeGeo.translate(0, -0.12, 0);
    const leftForearm = new THREE.Mesh(armForeGeo, this.sleeveMat);
    leftForearm.position.set(0, -0.26, 0);
    this.leftArmPivot.add(leftForearm);

    const wristRingGeo = new THREE.TorusGeometry(0.044, 0.006, 8, 16);
    const leftWrist = new THREE.Mesh(wristRingGeo, this.cyberAccentMat);
    leftWrist.rotation.x = Math.PI / 2;
    leftWrist.position.set(0, -0.48, 0);
    this.leftArmPivot.add(leftWrist);

    const handGeo = new THREE.BoxGeometry(0.065, 0.06, 0.08);
    const leftHand = new THREE.Mesh(handGeo, this.skinMat);
    leftHand.position.set(0, -0.52, 0);
    this.leftArmPivot.add(leftHand);

    this.bodyGroup.add(this.leftArmPivot);

    // -----------------------------------------------------------------------
    // 6. RIGHT ARM & TACTICAL FLASHLIGHT (Aims Forward along -Z, Pivots with Pitch!)
    // -----------------------------------------------------------------------
    this.rightArmPivot = new THREE.Group();
    this.rightArmPivot.position.set(0.24, 1.46, 0.02);

    // Natural tactical holding posture: upper arm slightly angled forward, forearm reaching forward
    const rightUpperArmMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.054, 0.22, 12), this.sleeveMat);
    rightUpperArmMesh.rotation.x = -Math.PI / 4.5;
    rightUpperArmMesh.position.set(0.01, -0.09, -0.07);
    this.rightArmPivot.add(rightUpperArmMesh);

    const rightElbow = new THREE.Mesh(elbowGeo, this.collarMat);
    rightElbow.position.set(0.01, -0.17, -0.14);
    this.rightArmPivot.add(rightElbow);

    const rightForearmMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.046, 0.22, 12), this.sleeveMat);
    rightForearmMesh.rotation.x = -Math.PI / 2.2;
    rightForearmMesh.position.set(0.0, -0.14, -0.24);
    this.rightArmPivot.add(rightForearmMesh);

    const rightWrist = new THREE.Mesh(wristRingGeo, this.cyberAccentMat);
    rightWrist.rotation.x = Math.PI / 2;
    rightWrist.position.set(0.0, -0.12, -0.34);
    this.rightArmPivot.add(rightWrist);

    const rightHand = new THREE.Mesh(handGeo, this.skinMat);
    rightHand.position.set(0.0, -0.11, -0.38);
    this.rightArmPivot.add(rightHand);

    // 🔦 Flashlight Mesh & Beam (Pointing directly along -Z, perfectly follows pitch!)
    this.flashlightGroup = new THREE.Group();
    this.flashlightGroup.position.set(0.0, -0.10, -0.42);

    const tubeGeo = new THREE.CylinderGeometry(0.020, 0.020, 0.18, 16);
    const tube = new THREE.Mesh(tubeGeo, this.metalMat);
    tube.rotation.x = -Math.PI / 2; // Aligns along -Z
    this.flashlightGroup.add(tube);

    const gripGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.08, 16);
    const gripMat = new THREE.MeshStandardMaterial({ color: 0x15181e, roughness: 0.85, metalness: 0.6 });
    const grip = new THREE.Mesh(gripGeo, gripMat);
    grip.rotation.x = -Math.PI / 2;
    grip.position.set(0, 0, +0.02);
    this.flashlightGroup.add(grip);

    const torchHeadGeo = new THREE.CylinderGeometry(0.032, 0.022, 0.06, 16);
    const head = new THREE.Mesh(torchHeadGeo, this.metalMat);
    head.rotation.x = -Math.PI / 2;
    head.position.set(0, 0, -0.09);
    this.flashlightGroup.add(head);

    const lensGeo = new THREE.CircleGeometry(0.028, 16);
    this.lensMat = new THREE.MeshBasicMaterial({ color: 0xfff0c8 });
    this.flashlightLens = new THREE.Mesh(lensGeo, this.lensMat);
    this.flashlightLens.rotation.y = Math.PI; // Face forward -Z
    this.flashlightLens.position.set(0, 0, -0.121);
    this.flashlightGroup.add(this.flashlightLens);

    this.rightArmPivot.add(this.flashlightGroup);

    // Spotlight beam cast by remote player (Both light & target live inside rightArmPivot!)
    this.spotLight = new THREE.SpotLight(0xfffae0, 2.5, 24, Math.PI / 5, 0.35, 1.8);
    this.spotLight.position.set(0.0, -0.10, -0.52);

    this.spotLightTarget = new THREE.Object3D();
    this.spotLightTarget.position.set(0.0, -0.10, -15.0);
    this.rightArmPivot.add(this.spotLightTarget);

    this.spotLight.target = this.spotLightTarget;
    this.rightArmPivot.add(this.spotLight);

    this.bodyGroup.add(this.rightArmPivot);

    this.root.add(this.bodyGroup);
  }

  initNameplate() {
    this.nameCanvas = document.createElement('canvas');
    this.nameCanvas.width = 512;
    this.nameCanvas.height = 128;
    this.nameContext = this.nameCanvas.getContext('2d');

    this.nameTexture = new THREE.CanvasTexture(this.nameCanvas);
    this.nameTexture.colorSpace = THREE.SRGBColorSpace;

    const nameplateMat = new THREE.SpriteMaterial({
      map: this.nameTexture,
      transparent: true,
      depthTest: false
    });

    this.nameplateSprite = new THREE.Sprite(nameplateMat);
    this.nameplateSprite.scale.set(2.2, 0.55, 1);
    this.nameplateSprite.position.y = 2.25;
    this.root.add(this.nameplateSprite);

    this.updateNameplateText();
  }

  updateNameplateText() {
    const ctx = this.nameContext;
    ctx.clearRect(0, 0, 512, 128);

    // Pill background
    ctx.fillStyle = 'rgba(10, 15, 25, 0.85)';
    ctx.roundRect(16, 16, 480, 96, 48);
    ctx.fill();

    // Border in player color
    ctx.lineWidth = 6;
    ctx.strokeStyle = this.isDowned ? '#ff0044' : this.colorHex;
    ctx.stroke();

    // Name text
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px sans-serif';

    const displayName = this.isDowned ? `🆘 ${this.name} [НУЖНА ПОМОЩЬ!]` : `🛡️ ${this.name}`;
    ctx.fillText(displayName, 256, 64);

    this.nameTexture.needsUpdate = true;
  }

  initShieldAura() {
    const auraGeo = new THREE.SphereGeometry(1.2, 16, 16);
    const auraMat = new THREE.MeshBasicMaterial({
      color: this.color,
      wireframe: true,
      transparent: true,
      opacity: 0
    });
    this.shieldMesh = new THREE.Mesh(auraGeo, auraMat);
    this.shieldMesh.position.y = 1.0;
    this.root.add(this.shieldMesh);
  }

  initDownedBeacon() {
    // Pulsing glowing cylinder beacon when downed
    const beaconGeo = new THREE.CylinderGeometry(0.6, 0.6, 6.0, 16, 1, true);
    const beaconMat = new THREE.MeshBasicMaterial({
      color: 0xff0044,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide
    });
    this.downedBeacon = new THREE.Mesh(beaconGeo, beaconMat);
    this.downedBeacon.position.y = 3.0;
    this.root.add(this.downedBeacon);
  }

  applyUpdate(data) {
    if (data.x !== undefined && data.y !== undefined && data.z !== undefined) {
      // Local player camera eye height is 1.7m above floor (y = 0).
      // Remote player 3D avatar has feet touching floor at y = 0.
      const groundY = Math.max(0, data.y - 1.7);
      this.targetPosition.set(data.x, groundY, data.z);
    }
    if (data.rotY !== undefined) {
      this.targetRotationY = data.rotY;
    }
    if (data.pitch !== undefined) {
      this.targetPitch = data.pitch;
    }
    if (data.isMoving !== undefined) {
      this.isMoving = data.isMoving;
    }
    if (data.isSprinting !== undefined) {
      this.isSprinting = data.isSprinting;
    }
    if (data.flashlight !== undefined) {
      this.flashlightOn = data.flashlight;
      if (this.spotLight) this.spotLight.visible = this.flashlightOn;
      if (this.flashlightGroup) this.flashlightGroup.visible = this.flashlightOn;
    }
    if (data.shieldActive !== undefined) {
      this.shieldActive = data.shieldActive;
    }
    if (data.isDowned !== undefined && this.isDowned !== data.isDowned) {
      this.setDowned(data.isDowned);
    }
  }

  setDowned(downed) {
    this.isDowned = downed;
    this.updateNameplateText();

    if (this.isDowned) {
      // Rotate body group to lie on floor
      this.bodyGroup.rotation.z = Math.PI / 2;
      this.bodyGroup.position.y = 0.2;
      this.nameplateSprite.position.y = 1.2;
    } else {
      this.bodyGroup.rotation.z = 0;
      this.bodyGroup.position.y = 0;
      this.nameplateSprite.position.y = 2.25;
      this.downedBeacon.material.opacity = 0;
    }
  }

  update(delta, localCamera) {
    // 1. Smooth interpolation to target position and yaw
    this.root.position.lerp(this.targetPosition, 16 * delta);
    this.root.rotation.y = THREE.MathUtils.lerp(this.root.rotation.y, this.targetRotationY, 16 * delta);

    // 2. Head Pitch (Tilts up when looking up, down when looking down)
    if (this.headPivot && !this.isDowned) {
      this.headPivot.rotation.x = this.targetPitch;
    }

    // 3. Right Arm Aiming & Flashlight Orientation
    if (this.rightArmPivot && !this.isDowned) {
      if (this.flashlightOn) {
        // Arm points forward and tilts directly with player pitch!
        this.rightArmPivot.rotation.x = this.targetPitch;
        this.flashlightGroup.visible = true;
        this.spotLight.visible = true;
      } else {
        // Flashlight stowed: hide light and let arm swing with walking
        this.flashlightGroup.visible = false;
        this.spotLight.visible = false;
        const swingSpeed = this.isSprinting ? 14 : 9;
        const armSwing = this.isMoving ? Math.sin(this.animTimer) * 0.6 : 0;
        this.rightArmPivot.rotation.x = THREE.MathUtils.lerp(this.rightArmPivot.rotation.x, armSwing, 12 * delta);
      }
    }

    // 4. Nameplate always faces local player's camera
    if (localCamera) {
      this.nameplateSprite.lookAt(localCamera.position);
    }

    // 5. Shield Aura animation
    if (this.shieldActive) {
      this.shieldMesh.material.opacity = 0.5 + Math.sin(performance.now() * 0.01) * 0.2;
      this.shieldMesh.rotation.y += delta * 3;
    } else {
      this.shieldMesh.material.opacity = 0;
    }

    // 6. Downed Beacon animation
    if (this.isDowned) {
      const pulse = 0.35 + Math.sin(performance.now() * 0.008) * 0.25;
      this.downedBeacon.material.opacity = pulse;
      this.downedBeacon.rotation.y += delta * 1.5;
    }

    // 7. Walking / Running leg and left arm swing animation
    if (this.isMoving && !this.isDowned) {
      const animSpeed = this.isSprinting ? 14 : 9;
      this.animTimer += delta * animSpeed;
      const legSwing = Math.sin(this.animTimer) * 0.6;
      this.leftLegPivot.rotation.x = legSwing;
      this.rightLegPivot.rotation.x = -legSwing;
      this.leftArmPivot.rotation.x = -legSwing * 0.7;
    } else if (!this.isDowned) {
      this.leftLegPivot.rotation.x = THREE.MathUtils.lerp(this.leftLegPivot.rotation.x, 0, 10 * delta);
      this.rightLegPivot.rotation.x = THREE.MathUtils.lerp(this.rightLegPivot.rotation.x, 0, 10 * delta);
      this.leftArmPivot.rotation.x = THREE.MathUtils.lerp(this.leftArmPivot.rotation.x, 0, 10 * delta);
    }
  }

  destroy() {
    this.scene.remove(this.root);
  }
}
