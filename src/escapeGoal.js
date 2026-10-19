import * as THREE from 'three';
import { soundEngine } from './audio.js';

export class EscapeGoalManager {
  constructor(scene, map) {
    this.scene = scene;
    this._map = null;

    this.totalKeys = 3;
    this.keysCollected = 0;
    this.keys = [];

    // Door state
    this.doorMesh = null;
    this.doorPivot = null;
    this.doorFrame = null;
    this.lockLeds = [];
    this.doorLight = null;
    this.doorPosition = new THREE.Vector3();
    this.isDoorOpened = false;
    this.doorOpenProgress = 0; // 0 (closed) to 1 (fully open)
    this.doorOpening = false;
    this.lastLockedSoundTime = 0;

    // Callbacks
    this.onKeysChange = null;
    this.onEscapeSuccess = null;
    this.onDoorAttemptLocked = null;

    if (map) {
      this.map = map;
    }
  }

  get map() {
    return this._map;
  }

  set map(m) {
    this._map = m;
    this.initDoor();
  }

  // Create Neon Sign canvas texture
  createExitSignTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 160;
    const ctx = canvas.getContext('2d');

    // Dark sleek background with neon cyber border
    ctx.fillStyle = '#0a0d14';
    ctx.fillRect(0, 0, 512, 160);

    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 8;
    ctx.strokeRect(8, 8, 496, 144);

    // Glow effect
    ctx.shadowColor = '#00ff88';
    ctx.shadowBlur = 20;

    // Russian & English text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 38px "Rajdhani", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🚪 ВЫХОД / ESCAPE', 256, 52);

    ctx.fillStyle = '#00ff88';
    ctx.font = 'bold 24px monospace';
    ctx.fillText('ТРЕБУЕТСЯ 3 КЛЮЧА', 256, 108);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  createKeyMesh() {
    const group = new THREE.Group();

    // Golden metallic material with bloom/emissive punch
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      metalness: 0.85,
      roughness: 0.15,
      emissive: 0xff9900,
      emissiveIntensity: 0.55
    });

    // Key Bow (top ring)
    const ringGeo = new THREE.TorusGeometry(0.18, 0.04, 16, 24);
    const ring = new THREE.Mesh(ringGeo, goldMat);
    ring.position.y = 0.28;
    ring.rotation.x = Math.PI / 2;
    group.add(ring);

    // Key Stem
    const stemGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.55, 16);
    const stem = new THREE.Mesh(stemGeo, goldMat);
    stem.position.y = -0.05;
    group.add(stem);

    // Key Bits (teeth)
    const bit1Geo = new THREE.BoxGeometry(0.06, 0.12, 0.12);
    const bit1 = new THREE.Mesh(bit1Geo, goldMat);
    bit1.position.set(0, -0.22, 0.08);
    group.add(bit1);

    const bit2Geo = new THREE.BoxGeometry(0.06, 0.08, 0.09);
    const bit2 = new THREE.Mesh(bit2Geo, goldMat);
    bit2.position.set(0, -0.12, 0.07);
    group.add(bit2);

    // Ground glowing ring indicator
    const groundRingGeo = new THREE.RingGeometry(0.35, 0.6, 24);
    const groundRingMat = new THREE.MeshBasicMaterial({
      color: 0xffcc00,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.65
    });
    const groundRing = new THREE.Mesh(groundRingGeo, groundRingMat);
    groundRing.rotation.x = -Math.PI / 2;
    groundRing.position.y = -0.6;
    group.add(groundRing);

    // Glowing holographic aura halo (zero dynamic lights = zero shader recompile hitches!)
    const auraGeo = new THREE.SphereGeometry(0.35, 12, 8);
    const auraMat = new THREE.MeshBasicMaterial({
      color: 0xffcc00,
      transparent: true,
      opacity: 0.28,
      wireframe: true
    });
    const aura = new THREE.Mesh(auraGeo, auraMat);
    group.add(aura);

    return { group, innerMesh: ring, groundRing, aura };
  }

  initDoor() {
    if (this.doorGroup) {
      this.scene.remove(this.doorGroup);
      this.doorGroup = null;
    }

    if (!this.map) return;

    if (this.map.isCrater) {
      this.doorPosition.set(0, 32.7, 0);
      return;
    }

    if (this.map.offsetX === undefined || !this.map.tileSize) {
      return;
    }

    // Locate Door at North outer wall facing south (row 0, col 10)
    // The player walks up through row 1, col 10
    const c = 10;
    const r = 0;
    const x = this.map.offsetX + c * this.map.tileSize + this.map.tileSize / 2;
    const z = this.map.offsetZ + r * this.map.tileSize + this.map.tileSize / 2;
    // Align flush on south face of wall
    const wallHalf = this.map.tileSize / 2;
    const doorZ = z + wallHalf + 0.02;

    this.doorPosition.set(x, 0, doorZ);

    const doorGroup = new THREE.Group();
    doorGroup.position.set(x, 0, doorZ);
    this.doorGroup = doorGroup;

    // 1. Heavy Metal Frame
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x16181e,
      roughness: 0.5,
      metalness: 0.8
    });

    const frameW = 3.2;
    const frameH = 4.0;
    const frameD = 0.4;
    const frameThick = 0.35;

    // Top beam
    const topBeamGeo = new THREE.BoxGeometry(frameW, frameThick, frameD);
    const topBeam = new THREE.Mesh(topBeamGeo, frameMat);
    topBeam.position.set(0, frameH - frameThick / 2, 0);
    doorGroup.add(topBeam);

    // Left post
    const postGeo = new THREE.BoxGeometry(frameThick, frameH, frameD);
    const leftPost = new THREE.Mesh(postGeo, frameMat);
    leftPost.position.set(-frameW / 2 + frameThick / 2, frameH / 2, 0);
    doorGroup.add(leftPost);

    // Right post
    const rightPost = new THREE.Mesh(postGeo, frameMat);
    rightPost.position.set(frameW / 2 - frameThick / 2, frameH / 2, 0);
    doorGroup.add(rightPost);

    // 2. Door Leaf (inside Pivot for smooth rotation swing)
    this.doorPivot = new THREE.Group();
    // Pivot located at left inner edge
    const innerLeftX = -frameW / 2 + frameThick;
    this.doorPivot.position.set(innerLeftX, 0, 0);
    doorGroup.add(this.doorPivot);

    const leafW = frameW - frameThick * 2;
    const leafH = frameH - frameThick;
    const leafD = 0.2;

    const doorMat = new THREE.MeshStandardMaterial({
      color: 0x242a35,
      roughness: 0.4,
      metalness: 0.7,
      emissive: 0x05101a,
      emissiveIntensity: 0.4
    });

    const leafGeo = new THREE.BoxGeometry(leafW, leafH, leafD);
    this.doorMesh = new THREE.Mesh(leafGeo, doorMat);
    // Center mesh relative to pivot
    this.doorMesh.position.set(leafW / 2, leafH / 2, 0);
    this.doorPivot.add(this.doorMesh);

    // Hazard Stripes plate on door
    const stripeGeo = new THREE.PlaneGeometry(leafW * 0.9, 0.45);
    const stripeMat = new THREE.MeshBasicMaterial({
      color: 0xffaa00,
      side: THREE.DoubleSide
    });
    const stripe = new THREE.Mesh(stripeGeo, stripeMat);
    stripe.position.set(leafW / 2, 0.8, leafD / 2 + 0.01);
    this.doorPivot.add(stripe);

    // 3. Neon EXIT Sign above the door
    const signGeo = new THREE.PlaneGeometry(2.6, 0.8);
    const signMat = new THREE.MeshBasicMaterial({
      map: this.createExitSignTexture(),
      side: THREE.DoubleSide
    });
    const signMesh = new THREE.Mesh(signGeo, signMat);
    signMesh.position.set(0, frameH + 0.5, 0.05);
    doorGroup.add(signMesh);

    // 4. Three Electronic Lock Indicator LEDs
    this.lockLeds = [];
    const ledSpacing = 0.45;
    for (let i = 0; i < 3; i++) {
      const ledGeo = new THREE.SphereGeometry(0.1, 16, 16);
      const ledMat = new THREE.MeshStandardMaterial({
        color: 0xff1133,
        emissive: 0xff0033,
        emissiveIntensity: 1.0,
        roughness: 0.2
      });
      const ledMesh = new THREE.Mesh(ledGeo, ledMat);
      ledMesh.position.set((i - 1) * ledSpacing, frameH - 0.2, 0.22);
      doorGroup.add(ledMesh);
      this.lockLeds.push(ledMesh);
    }

    // 5. Overhead Exit Light (illuminates the escape portal)
    this.doorLight = new THREE.PointLight(0xff0044, 2.5, 12, 1.8);
    this.doorLight.position.set(0, frameH, 0.8);
    doorGroup.add(this.doorLight);

    // 6. Ground Evacuation Zone Decal
    const evacGeo = new THREE.PlaneGeometry(3.0, 3.0);
    const evacMat = new THREE.MeshBasicMaterial({
      color: 0xff0044,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide
    });
    this.evacZone = new THREE.Mesh(evacGeo, evacMat);
    this.evacZone.rotation.x = -Math.PI / 2;
    this.evacZone.position.set(0, 0.02, 1.5);
    doorGroup.add(this.evacZone);

    this.scene.add(doorGroup);
    this.doorGroup = doorGroup;
  }

  updateLockLeds() {
    // 0 to 3 keys collected: illuminate corresponding LEDs green
    for (let i = 0; i < this.lockLeds.length; i++) {
      const led = this.lockLeds[i];
      if (!led) continue;
      if (i < this.keysCollected) {
        // Unlocked LED: Glowing Green
        led.material.color.setHex(0x00ff66);
        led.material.emissive.setHex(0x00ff66);
        led.material.emissiveIntensity = 1.6;
      } else {
        // Locked LED: Warning Red
        led.material.color.setHex(0xff1133);
        led.material.emissive.setHex(0xff0033);
        led.material.emissiveIntensity = 0.8;
      }
    }

    if (this.doorLight && this.evacZone) {
      if (this.keysCollected >= 3) {
        // Ready to escape! Turn door ambience to bright green/cyan
        this.doorLight.color.setHex(0x00ff88);
        this.doorLight.intensity = 3.5;
        this.evacZone.material.color.setHex(0x00ff88);
        this.evacZone.material.opacity = 0.45;
      } else {
        this.doorLight.color.setHex(0xff0044);
        this.doorLight.intensity = 2.2;
        this.evacZone.material.color.setHex(0xff0044);
        this.evacZone.material.opacity = 0.25;
      }
    }
  }

  spawnKeys() {
    // Clear old keys
    for (const k of this.keys) {
      this.scene.remove(k.group);
    }
    this.keys = [];
    this.keysCollected = 0;
    this.isToriiCountingDown = false;
    this.toriiCountdown = 10.0;
    this.lastBeepSec = 10;

    if (!this.map) return;

    let keyLocations = [];

    if (this.map && this.map.isCrater) {
      // Hide warehouse door in volcano map (Torii Gate at summit is the exit!)
      if (this.doorGroup) {
        this.doorGroup.visible = false;
      }
      this.doorPosition.set(0, 32.7, 0);

      // 🌋 3-TIER VOLCANO KEYS (Dynamically placed on the procedural randomized platforms!)
      if (typeof this.map.getKeyLocations === 'function') {
        keyLocations = this.map.getKeyLocations();
      } else {
        keyLocations = [
          { pos: new THREE.Vector3(0, 2.7, 14.5), name: 'Ключ Нижнего Яруса (Внимание: Лава!)' },
          { pos: new THREE.Vector3(8.5, 13.0, -15.5), name: 'Ключ Среднего Яруса (Прыжок над бездной)' },
          { pos: new THREE.Vector3(-7.0, 22.2, 15.0), name: 'Ключ Верхнего Яруса (Узкий мостик)' }
        ];
      }
    } else {
      // Classic Maze coordinates
      if (this.doorGroup) {
        this.doorGroup.visible = true;
      }
      keyLocations = [
        { pos: new THREE.Vector3(this.map.offsetX + 1 * this.map.tileSize + this.map.tileSize / 2, 1.1, this.map.offsetZ + 20 * this.map.tileSize + this.map.tileSize / 2), name: 'Ключ в тупике' },
        { pos: new THREE.Vector3(this.map.offsetX + 16 * this.map.tileSize + this.map.tileSize / 2, 1.1, this.map.offsetZ + 7 * this.map.tileSize + this.map.tileSize / 2), name: 'Ключ восточного крыла' },
        { pos: new THREE.Vector3(this.map.offsetX + 4 * this.map.tileSize + this.map.tileSize / 2, 1.1, this.map.offsetZ + 13 * this.map.tileSize + this.map.tileSize / 2), name: 'Ключ западного крыла' }
      ];
    }

    keyLocations.forEach((loc, idx) => {
      const pos = loc.pos;
      const { group, innerMesh, groundRing, aura } = this.createKeyMesh();
      group.position.copy(pos);
      this.scene.add(group);

      this.keys.push({
        id: idx + 1,
        index: idx,
        name: loc.name,
        position: pos,
        group,
        innerMesh,
        groundRing,
        aura,
        hoverOffset: Math.random() * Math.PI * 2,
        collected: false
      });
    });

    this.updateLockLeds();
    if (this.onKeysChange) {
      this.onKeysChange(this.keysCollected, this.totalKeys);
    }
  }

  collectKeyByIndex(index, isLocal = false) {
    const k = this.keys.find(item => item.index === index);
    if (k && !k.collected) {
      k.collected = true;
      this.keysCollected++;
      this.scene.remove(k.group);
      this.updateLockLeds();
      soundEngine.playKeyPickup();

      // In Volcano Crater: Collecting Key 1 starts the rapid magma rise & alarm siren!
      if (this.map && this.map.isCrater && index === 0) {
        this.map.startMagmaRise();
        if (window.gameInstance && window.gameInstance.showToast) {
          window.gameInstance.showToast('🚨 ВНИМАНИЕ! КЛЮЧ АКТИВИРОВАЛ МАГМУ! ОНА ПОДНИМАЕТСЯ! БЕГИ ВВЕРХ!');
        }
      }

      if (this.onKeysChange) {
        this.onKeysChange(this.keysCollected, this.totalKeys);
      }
      return true;
    }
    return false;
  }

  triggerDoorOpenSequence() {
    if (!this.doorOpening && !this.isDoorOpened) {
      this.doorOpening = true;
      soundEngine.playDoorOpen();
    }
  }

  reset() {
    // Reset door opening progress
    this.isDoorOpened = false;
    this.doorOpening = false;
    this.doorOpenProgress = 0;
    this.isToriiCountingDown = false;
    this.toriiCountdown = 10.0;
    this.lastBeepSec = 10;
    if (this.doorPivot) {
      this.doorPivot.rotation.y = 0;
    }

    this.spawnKeys();
  }

  update(delta, playerPos) {
    // 1. Animate Keys and check pickups
    for (let i = 0; i < this.keys.length; i++) {
      const k = this.keys[i];
      if (k.collected) continue;

      k.hoverOffset += delta * 2.8;
      k.group.rotation.y += delta * 1.8;
      k.group.position.y = k.position.y + Math.sin(k.hoverOffset) * 0.12;

      // Pulse ground ring
      k.groundRing.material.opacity = 0.4 + Math.sin(k.hoverOffset * 2) * 0.25;

      // 3D Distance check (handles vertical parkour)
      const dist = k.position.distanceTo(playerPos);
      if (dist < 1.8) {
        // Collected by local player!
        const collected = this.collectKeyByIndex(k.index, true);
        if (collected && this.onLocalKeyCollected) {
          this.onLocalKeyCollected(k.index);
        }
      }
    }

    // 2. ⛩️ VOLCANO CRATER: Torii Gate 10-Second Defense Countdown
    if (this.map && this.map.isCrater) {
      const distToTorii = Math.hypot(this.doorPosition.x - playerPos.x, this.doorPosition.z - playerPos.z);
      const dyTorii = Math.abs(playerPos.y - this.doorPosition.y);

      if (distToTorii < 4.2 && dyTorii < 3.2) {
        if (this.keysCollected >= this.totalKeys) {
          if (!this.isToriiCountingDown && !this.isDoorOpened) {
            this.isToriiCountingDown = true;
            this.toriiCountdown = 10.0;
            this.lastBeepSec = 10;
            soundEngine.playToriiBeep();
            if (window.gameInstance && window.gameInstance.showToast) {
              window.gameInstance.showToast('⛩️ АКТИВАЦИЯ ВРАТ ТОРИИ! ПРОДЕРЖИСЬ 10 СЕКУНД!');
            }
          }
        } else {
          const now = performance.now();
          if (now - this.lastLockedSoundTime > 2500) {
            this.lastLockedSoundTime = now;
            soundEngine.playDoorLocked();
            if (this.onDoorAttemptLocked) {
              this.onDoorAttemptLocked(this.keysCollected, this.totalKeys);
            }
          }
        }
      }

      // Progress Torii countdown
      if (this.isToriiCountingDown && !this.isDoorOpened) {
        this.toriiCountdown -= delta;
        const currentSec = Math.ceil(this.toriiCountdown);
        if (currentSec !== this.lastBeepSec && currentSec > 0) {
          this.lastBeepSec = currentSec;
          soundEngine.playToriiBeep();
          if (this.onToriiCountdown) {
            this.onToriiCountdown(this.toriiCountdown);
          }
        }

        if (this.toriiCountdown <= 0) {
          this.isDoorOpened = true;
          this.isToriiCountingDown = false;
          soundEngine.playToriiActivate();
          if (this.onLocalDoorReached) {
            this.onLocalDoorReached();
          }
          if (this.onEscapeSuccess) {
            this.onEscapeSuccess();
          }
        }
      }
      return;
    }

    // 3. Classic Maze Door Proximity & Opening Animation
    if (this.doorOpening) {
      this.doorOpenProgress = Math.min(1.0, this.doorOpenProgress + delta * 1.2);
      this.doorPivot.rotation.y = - (Math.PI / 2) * this.doorOpenProgress;

      if (this.doorOpenProgress >= 1.0 && !this.isDoorOpened) {
        this.isDoorOpened = true;
        this.doorOpening = false;
        if (this.onEscapeSuccess) {
          this.onEscapeSuccess();
        }
      }
      return;
    }

    // Check player proximity to door
    const distToDoor = Math.hypot(this.doorPosition.x - playerPos.x, this.doorPosition.z - playerPos.z);
    if (distToDoor < 2.4) {
      if (this.keysCollected >= this.totalKeys) {
        this.triggerDoorOpenSequence();
        if (this.onLocalDoorReached) {
          this.onLocalDoorReached();
        }
      } else {
        const now = performance.now();
        if (now - this.lastLockedSoundTime > 2500) {
          this.lastLockedSoundTime = now;
          soundEngine.playDoorLocked();
          if (this.onDoorAttemptLocked) {
            this.onDoorAttemptLocked(this.keysCollected, this.totalKeys);
          }
        }
      }
    }
  }
}
