import * as THREE from 'three';

/**
 * 3D Avatar for Teammates in Co-op Multiplayer
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
    this.initFlashlight();
    this.initShieldAura();
    this.initDownedBeacon();

    this.scene.add(this.root);
  }

  get position() {
    return this.root.position;
  }

  initAvatarMesh() {
    this.bodyGroup = new THREE.Group();

    // 1. Torso (Hoodie / Gamer Jacket)
    const torsoGeo = new THREE.BoxGeometry(0.6, 0.75, 0.35);
    const torsoMat = new THREE.MeshStandardMaterial({
      color: this.color,
      roughness: 0.6,
      metalness: 0.2
    });
    this.torsoMesh = new THREE.Mesh(torsoGeo, torsoMat);
    this.torsoMesh.position.y = 0.95;
    this.bodyGroup.add(this.torsoMesh);

    // 2. Head
    const headGeo = new THREE.BoxGeometry(0.38, 0.42, 0.38);
    const headMat = new THREE.MeshStandardMaterial({
      color: 0xffd1b3,
      roughness: 0.8
    });
    this.headMesh = new THREE.Mesh(headGeo, headMat);
    this.headMesh.position.y = 1.55;
    this.bodyGroup.add(this.headMesh);

    // 3. Gamer Headset / Cap
    const headsetBandGeo = new THREE.TorusGeometry(0.24, 0.04, 8, 16, Math.PI);
    const headsetMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.8 });
    const headsetBand = new THREE.Mesh(headsetBandGeo, headsetMat);
    headsetBand.rotation.x = -Math.PI / 2;
    headsetBand.rotation.z = Math.PI / 2;
    headsetBand.position.y = 1.76;
    this.bodyGroup.add(headsetBand);

    const earPadGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.06, 12);
    const earPad1 = new THREE.Mesh(earPadGeo, headsetMat);
    earPad1.rotation.z = Math.PI / 2;
    earPad1.position.set(-0.21, 1.56, 0);
    this.bodyGroup.add(earPad1);
    const earPad2 = earPad1.clone();
    earPad2.position.x = 0.21;
    this.bodyGroup.add(earPad2);

    // 4. Arms
    const armGeo = new THREE.BoxGeometry(0.16, 0.65, 0.16);
    const armMat = new THREE.MeshStandardMaterial({ color: this.color, roughness: 0.6 });

    this.leftArm = new THREE.Mesh(armGeo, armMat);
    this.leftArm.position.set(-0.42, 0.9, 0);
    this.bodyGroup.add(this.leftArm);

    this.rightArm = new THREE.Mesh(armGeo, armMat);
    this.rightArm.position.set(0.42, 0.9, 0);
    this.bodyGroup.add(this.rightArm);

    // 5. Legs
    const legGeo = new THREE.BoxGeometry(0.2, 0.7, 0.2);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x1a202c, roughness: 0.8 });

    this.leftLeg = new THREE.Mesh(legGeo, legMat);
    this.leftLeg.position.set(-0.18, 0.35, 0);
    this.bodyGroup.add(this.leftLeg);

    this.rightLeg = new THREE.Mesh(legGeo, legMat);
    this.rightLeg.position.set(0.18, 0.35, 0);
    this.bodyGroup.add(this.rightLeg);

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

  initFlashlight() {
    // 3D Torch in right hand
    const torchGeo = new THREE.CylinderGeometry(0.04, 0.05, 0.28, 8);
    const torchMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.9 });
    this.torchMesh = new THREE.Mesh(torchGeo, torchMat);
    this.torchMesh.rotation.x = Math.PI / 2;
    this.torchMesh.position.set(0, -0.3, 0.15);
    this.rightArm.add(this.torchMesh);

    // Spotlight beam cast by remote player
    this.spotLight = new THREE.SpotLight(0xfffae0, 2.5, 22, Math.PI / 5, 0.4, 1.8);
    this.spotLight.position.set(0, 0, 0);

    this.spotLightTarget = new THREE.Object3D();
    this.spotLightTarget.position.set(0, 0, -10);
    this.root.add(this.spotLightTarget);

    this.spotLight.target = this.spotLightTarget;
    this.rightArm.add(this.spotLight);
  }

  initShieldAura() {
    const auraGeo = new THREE.SphereGeometry(1.2, 16, 16);
    const auraMat = new THREE.MeshBasicMaterial({
      color: 0x00f3ff,
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
      // Therefore, floor level for the avatar root is Math.max(0, data.y - 1.7).
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
      this.spotLight.visible = this.flashlightOn;
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
    // Smooth interpolation to target position
    this.root.position.lerp(this.targetPosition, 16 * delta);

    // Smooth rotation
    this.root.rotation.y = THREE.MathUtils.lerp(this.root.rotation.y, this.targetRotationY, 16 * delta);

    // Head / Torch Pitch
    if (this.headMesh && !this.isDowned) {
      this.headMesh.rotation.x = this.targetPitch;
      this.rightArm.rotation.x = this.targetPitch;
    }

    // Nameplate always faces local player's camera
    if (localCamera) {
      this.nameplateSprite.lookAt(localCamera.position);
    }

    // Shield Aura animation
    if (this.shieldActive) {
      this.shieldMesh.material.opacity = 0.5 + Math.sin(performance.now() * 0.01) * 0.2;
      this.shieldMesh.rotation.y += delta * 3;
    } else {
      this.shieldMesh.material.opacity = 0;
    }

    // Downed Beacon animation
    if (this.isDowned) {
      const pulse = 0.35 + Math.sin(performance.now() * 0.008) * 0.25;
      this.downedBeacon.material.opacity = pulse;
      this.downedBeacon.rotation.y += delta * 1.5;
    }

    // Walking / Running leg and arm swing animation
    if (this.isMoving && !this.isDowned) {
      const animSpeed = this.isSprinting ? 14 : 9;
      this.animTimer += delta * animSpeed;
      const legSwing = Math.sin(this.animTimer) * 0.6;
      this.leftLeg.rotation.x = legSwing;
      this.rightLeg.rotation.x = -legSwing;
      this.leftArm.rotation.x = -legSwing * 0.8;
    } else if (!this.isDowned) {
      this.leftLeg.rotation.x = THREE.MathUtils.lerp(this.leftLeg.rotation.x, 0, 10 * delta);
      this.rightLeg.rotation.x = THREE.MathUtils.lerp(this.rightLeg.rotation.x, 0, 10 * delta);
      this.leftArm.rotation.x = THREE.MathUtils.lerp(this.leftArm.rotation.x, 0, 10 * delta);
    }
  }

  destroy() {
    this.scene.remove(this.root);
  }
}
