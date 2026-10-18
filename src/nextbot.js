import * as THREE from 'three';
import { soundEngine } from './audio.js';

export class NextbotGirl {
  constructor(scene, map, textureUrl = './assets/girl.png') {
    this.scene = scene;
    this.map = map;
    this.textureUrl = textureUrl;

    this.position = new THREE.Vector3(0, 0, 0);
    this.velocity = new THREE.Vector3();
    this.radius = 0.55;

    // Speeds
    this.baseSpeed = 7.4;
    this.currentSpeed = this.baseSpeed;
    this.speedMultiplier = 1.0;

    // Animation & Bobbing
    this.bobTimer = 0;
    this.distractedTimer = 0;
    this.stunTimer = 0;

    // Human-scale height (2.1 meters tall, fits comfortably in 4.2m hallways)
    this.targetHeight = 2.1;
    this.baseWidth = 1.6;

    // Spider Mode & Center Leap for Volcano Crater
    this.isLeaping = false;
    this.leapProgress = 0;
    this.leapDuration = 1.35;
    this.leapStart = new THREE.Vector3();
    this.leapTarget = new THREE.Vector3();
    this.leapCooldown = 8.0;

    // Billboard mesh group
    this.meshGroup = new THREE.Group();
    this.initMesh();
    this.initSparkTrail();

    // Red/pink underglow aura light
    this.auraLight = new THREE.PointLight(0xff0066, 1.8, 7, 2);
    this.auraLight.position.set(0, 0.6, 0);
    this.meshGroup.add(this.auraLight);

    this.scene.add(this.meshGroup);
  }

  initSparkTrail() {
    const count = 30;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = 0;
      pos[i * 3 + 1] = -100;
      pos[i * 3 + 2] = 0;
      colors[i * 3] = 1.0;
      colors[i * 3 + 1] = Math.random() * 0.4;
      colors[i * 3 + 2] = 0.0;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.45,
      vertexColors: true,
      transparent: true,
      opacity: 0.85
    });
    this.sparkTrail = new THREE.Points(geo, mat);
    this.sparkIndex = 0;
    this.scene.add(this.sparkTrail);
  }

  initMesh() {
    // Unit plane geometry (1 x 1)
    const geo = new THREE.PlaneGeometry(1, 1);
    this.material = new THREE.MeshBasicMaterial({
      map: null,
      transparent: true,
      side: THREE.DoubleSide
    });

    this.spriteMesh = new THREE.Mesh(geo, this.material);

    // Initial scale with 3:4 default portrait aspect ratio
    const initialAspect = 0.75;
    this.spriteMesh.scale.set(this.targetHeight * initialAspect, this.targetHeight, 1);
    // Center at targetHeight / 2 so bottom of the image rests on floor (y = 0)
    this.spriteMesh.position.y = this.targetHeight / 2;
    this.meshGroup.add(this.spriteMesh);

    this.loadTexture(this.textureUrl);
  }

  loadTexture(url) {
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(url, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      this.material.map = tex;
      this.material.needsUpdate = true;

      // Adjust aspect ratio properly to match uploaded image
      const img = tex.image;
      if (img && img.width && img.height) {
        const aspect = img.width / img.height;
        // Restrict width to max 2.6m so wide photos fit nicely in hallways
        const width = Math.min(2.6, this.targetHeight * aspect);
        this.baseWidth = width;
        this.spriteMesh.scale.set(width, this.targetHeight, 1);
        this.spriteMesh.position.y = this.targetHeight / 2;
      }
    });
  }

  updateTexture(newUrl) {
    this.textureUrl = newUrl;
    this.loadTexture(newUrl);
  }

  spawn(pos) {
    this.position.copy(pos);
    this.position.y = (pos.y !== undefined) ? pos.y : 0;
    this.meshGroup.position.copy(this.position);
    this.velocity.set(0, 0, 0);
    this.isLeaping = false;
    this.leapCooldown = 8.0;
    this.currentSpeed = this.baseSpeed;
    this.speedMultiplier = 1.0;
    this.distractedTimer = 0;
    this.stunTimer = 0;
  }

  distract(duration = 5.0, decoyPosition = null) {
    this.distractedTimer = duration;
    this.decoyTarget = decoyPosition;
  }

  repelFrom(fromPosition, force = 24.0, immediatePush = 7.0) {
    const dir = new THREE.Vector3().subVectors(this.position, fromPosition);
    dir.y = 0;
    if (dir.lengthSq() < 0.001) {
      dir.set((Math.random() - 0.5) || 1, 0, (Math.random() - 0.5) || 1);
    }
    dir.normalize();

    // 1. Physically push girl backward in sub-steps with collision resolution
    // so she cannot jump over or glitch through outer walls
    const steps = 8;
    const stepDist = immediatePush / steps;
    for (let s = 0; s < steps; s++) {
      this.position.add(dir.clone().multiplyScalar(stepDist));
      this.map.resolveCollision(this.position, this.radius);
    }

    // 2. Impart backward kinetic velocity
    this.velocity.copy(dir.clone().multiplyScalar(force));

    // 3. Stun girl for 1.3 seconds so her chase AI doesn't immediately overwrite the knockback!
    this.stunTimer = 1.3;

    // 4. Play heavy shockwave impact sound
    soundEngine.playShieldBlast();
  }

  knockback(fromPosition, force = 18.0) {
    this.repelFrom(fromPosition, force, 5.5);
  }

  checkMapBounds(player) {
    // Playable area boundary margins (inside perimeter walls)
    const minX = this.map.offsetX + this.map.tileSize * 0.6;
    const maxX = this.map.offsetX + this.map.width - this.map.tileSize * 0.6;
    const minZ = this.map.offsetZ + this.map.tileSize * 0.6;
    const maxZ = this.map.offsetZ + this.map.depth - this.map.tileSize * 0.6;

    const isOutOfBounds = this.position.x < minX || this.position.x > maxX ||
                          this.position.z < minZ || this.position.z > maxZ ||
                          this.position.y < -1.0;

    if (isOutOfBounds) {
      this.outOfBoundsFrames = (this.outOfBoundsFrames || 0) + 1;
      // If outside the maze perimeter, trigger aggressive tactical respawn
      if (this.outOfBoundsFrames >= 2) {
        this.aggressiveRespawn(player);
        this.outOfBoundsFrames = 0;
      }
    } else {
      this.outOfBoundsFrames = 0;
    }
  }

  aggressiveRespawn(player) {
    // Choose a valid corridor position within tactical distance from player
    const spawnPoint = this.map.getRandomSpawnPoint(player.position, 16);
    this.position.copy(spawnPoint);
    this.position.y = 0;
    this.meshGroup.position.copy(this.position);
    this.velocity.set(0, 0, 0);
    this.stunTimer = 0.4; // brief recovery

    // Play ominous jumpscare scream sound
    soundEngine.playNextbotRespawn();
    if (window.gameInstance && window.gameInstance.showToast) {
      window.gameInstance.showToast('😈 ОНА ВЕРНУЛАСЬ! ТЫ НЕ СБЕЖИШЬ!');
    }
  }

  applyNetworkUpdate(data) {
    if (data.x !== undefined && data.z !== undefined) {
      if (!this.targetNetPos) this.targetNetPos = new THREE.Vector3();
      this.targetNetPos.set(data.x, 0, data.z);
    }
    if (data.stunTimer !== undefined) this.stunTimer = data.stunTimer;
    if (data.distractedTimer !== undefined) this.distractedTimer = data.distractedTimer;
  }

  update(delta, player, elapsedTime, remotePlayers = [], isHost = true) {
    if (delta > 0.1) delta = 0.1;

    // Non-host client synchronization: smoothly follow host's authoritative nextbot position
    if (!isHost && this.targetNetPos) {
      this.position.lerp(this.targetNetPos, 16 * delta);
      this.meshGroup.position.set(this.position.x, 0, this.position.z);
      this.meshGroup.lookAt(player.camera.position.x, this.meshGroup.position.y, player.camera.position.z);
      this.bobTimer += delta * 6;
      this.spriteMesh.rotation.z = Math.sin(this.bobTimer * 4) * 0.12;

      const toLocalP = new THREE.Vector3().subVectors(player.position, this.position);
      toLocalP.y = 0;
      const dist = toLocalP.length();
      soundEngine.updateChaseDistance(dist, 38);
      return dist;
    }

    // Difficulty scaling: speed increases slightly over survival time
    this.speedMultiplier = 1.0 + Math.floor(elapsedTime / 20) * 0.05;
    this.currentSpeed = this.baseSpeed * this.speedMultiplier;

    // Pick closest active (non-downed) target among local player and remote players
    let currentTarget = player;
    let minDist = 999999;

    const candidates = [];
    if (!player.isDowned) {
      candidates.push({ pos: player.position, entity: player });
    }
    for (const rp of remotePlayers) {
      if (!rp.isDowned) {
        candidates.push({ pos: rp.root.position, entity: rp });
      }
    }

    // If everyone is downed, still target closest for final catch
    if (candidates.length === 0) {
      candidates.push({ pos: player.position, entity: player });
      for (const rp of remotePlayers) {
        candidates.push({ pos: rp.root.position, entity: rp });
      }
    }

    for (const cand of candidates) {
      const d = Math.hypot(cand.pos.x - this.position.x, cand.pos.z - this.position.z);
      if (d < minDist) {
        minDist = d;
        currentTarget = cand.entity;
      }
    }

    const targetPos = (currentTarget === player) ? player.position : currentTarget.root.position;
    const toTarget = new THREE.Vector3().subVectors(targetPos, this.position);
    toTarget.y = 0;
    const distToTarget = toTarget.length();

    // Distance to local player for local audio spatialization
    const toPlayer = new THREE.Vector3().subVectors(player.position, this.position);
    const distToPlayer = toPlayer.length();

    // Spatial chase music & heartbeat distance update for local player
    soundEngine.updateChaseDistance(distToPlayer, 38);

    // 🌋 VOLCANO CRATER: Spark trail & heat haze shimmer effect
    if (this.map && this.map.isCrater) {
      if (this.sparkTrail) {
        const posArr = this.sparkTrail.geometry.attributes.position.array;
        const idx = (this.sparkIndex % 30) * 3;
        posArr[idx] = this.position.x + (Math.random() - 0.5) * 0.5;
        posArr[idx + 1] = this.position.y + 0.8 + (Math.random() - 0.5) * 0.5;
        posArr[idx + 2] = this.position.z + (Math.random() - 0.5) * 0.5;
        this.sparkIndex++;
        this.sparkTrail.geometry.attributes.position.needsUpdate = true;
      }

      // Heat haze shimmer (дрожание из-за жара)
      const haze = 1.0 + Math.sin(performance.now() * 0.016) * 0.08;
      this.spriteMesh.scale.x = (this.baseWidth || 1.6) * haze;
    }

    // 😱 VOLCANO CRATER: Leap through center across the abyss!
    if (this.isLeaping) {
      this.leapProgress += delta / this.leapDuration;
      const t = Math.min(1.0, this.leapProgress);
      this.position.lerpVectors(this.leapStart, this.leapTarget, t);
      const arc = Math.sin(t * Math.PI) * 11.5;
      this.meshGroup.position.set(this.position.x, this.position.y + arc, this.position.z);
      this.meshGroup.lookAt(player.camera.position.x, this.meshGroup.position.y, player.camera.position.z);

      if (this.leapProgress >= 1.0) {
        this.isLeaping = false;
        this.leapCooldown = 12.0 + Math.random() * 6.0;
        this.velocity.set(0, 0, 0);
      }
      return distToPlayer;
    } else if (this.map && this.map.isCrater && this.stunTimer <= 0) {
      this.leapCooldown -= delta;
      // If player is on higher/mid tiers across the crater, trigger sensational center leap!
      if (this.leapCooldown <= 0 && distToTarget > 11.0 && distToTarget < 30.0) {
        this.isLeaping = true;
        this.leapProgress = 0;
        this.leapDuration = 1.35;
        this.leapStart.copy(this.position);
        this.leapTarget.copy(targetPos);
        soundEngine.playNextbotLeap();
        if (window.gameInstance && window.gameInstance.showToast) {
          window.gameInstance.showToast('😱 ДЕВУШКА ПЕРЕПРЫГИВАЕТ ЧЕРЕЗ ЦЕНТР ВУЛКАНА!');
        }
      }
    }

    // If currently stunned from a shield blast or D20 save
    if (this.stunTimer > 0) {
      this.stunTimer -= delta;
      // Heavy deceleration while sliding backwards
      this.velocity.lerp(new THREE.Vector3(0, 0, 0), 3.5 * delta);
      this.position.x += this.velocity.x * delta;
      this.position.z += this.velocity.z * delta;
      this.map.resolveCollision(this.position, this.radius);

      // Check map bounds during stun knockback
      this.checkMapBounds(player);

      // Stun wobble / disorientation tilt
      this.meshGroup.position.set(this.position.x, this.position.y, this.position.z);
      this.spriteMesh.rotation.z = Math.sin(performance.now() * 0.02) * 0.28;
      this.meshGroup.lookAt(player.camera.position.x, this.meshGroup.position.y, player.camera.position.z);

      return distToPlayer;
    }

    // If distracted by dakimakura decoy
    if (this.distractedTimer > 0) {
      this.distractedTimer -= delta;
      this.bobTimer += delta * 8;
      this.spriteMesh.rotation.z = Math.sin(this.bobTimer * 8) * 0.18;
      // If decoy position provided, look towards it
      if (this.decoyTarget) {
        this.meshGroup.lookAt(this.decoyTarget.x, this.meshGroup.position.y, this.decoyTarget.z);
      }
      return distToPlayer;
    }

    // Nextbot Navigation Logic:
    // In Volcano Crater: SPIDER MODE (3D Wall Climbing)
    if (this.map && this.map.isCrater) {
      // Move horizontally towards target
      const toTargetFlat = new THREE.Vector3(toTarget.x, 0, toTarget.z);
      if (toTargetFlat.lengthSq() > 0.05) {
        toTargetFlat.normalize();
        const targetVel = toTargetFlat.multiplyScalar(this.currentSpeed);
        this.velocity.lerp(targetVel, 8.0 * delta);
      }

      this.position.x += this.velocity.x * delta;
      this.position.z += this.velocity.z * delta;
      this.map.resolveCollision(this.position, this.radius);

      // 🧗 Spider Climb: Scale steep caldera walls and ledges vertically
      const dy = (targetPos.y - 0.4) - this.position.y;
      if (Math.abs(dy) > 0.1) {
        const climbSpeed = 7.0;
        this.position.y += Math.sign(dy) * Math.min(Math.abs(dy), climbSpeed * delta);
      }
    } else {
      // Classic Maze BFS Waypoint Chase
      const hasLOS = this.map.hasLineOfSight(this.position, targetPos);
      let moveDir = new THREE.Vector3();

      if (hasLOS) {
        moveDir.copy(toTarget).normalize();
      } else {
        const waypoint = this.map.findNextWaypoint(this.position, targetPos);
        const toWaypoint = new THREE.Vector3().subVectors(waypoint, this.position);
        toWaypoint.y = 0;

        if (toWaypoint.lengthSq() > 0.09) {
          moveDir.copy(toWaypoint).normalize();
        } else {
          moveDir.copy(toTarget).normalize();
        }
      }

      const targetVel = moveDir.clone().multiplyScalar(this.currentSpeed);
      this.velocity.lerp(targetVel, 10.0 * delta);

      if (this.velocity.length() > this.currentSpeed * 1.5) {
        this.velocity.multiplyScalar(0.92);
      }

      this.position.x += this.velocity.x * delta;
      this.position.z += this.velocity.z * delta;
      this.map.resolveCollision(this.position, this.radius);

      // Stuck Detection
      const actualMoved = Math.hypot(
        this.position.x - (this.lastActualX !== undefined ? this.lastActualX : this.position.x),
        this.position.z - (this.lastActualZ !== undefined ? this.lastActualZ : this.position.z)
      );
      this.lastActualX = this.position.x;
      this.lastActualZ = this.position.z;

      const actualSpeed = delta > 0.0001 ? (actualMoved / delta) : 0;
      if (actualSpeed < 1.0 && this.stunTimer <= 0 && this.distractedTimer <= 0) {
        this.stuckTimer = (this.stuckTimer || 0) + delta;
        if (this.stuckTimer > 0.3) {
          const tangent = new THREE.Vector3(-moveDir.z, 0, moveDir.x);
          const sign = (Math.sin(performance.now() * 0.01) > 0) ? 1 : -1;
          this.position.add(tangent.multiplyScalar(sign * 5.0 * delta));
          this.map.resolveCollision(this.position, this.radius);

          if (this.stuckTimer > 1.2) {
            this.aggressiveRespawn(player);
            this.stuckTimer = 0;
          }
        }
      } else {
        this.stuckTimer = 0;
      }
    }

    // Ensure she stays within map bounds
    this.checkMapBounds(player);

    // Nextbot Bobbing & Wobble Animation
    const speed = this.velocity.length();
    let verticalBob = 0;
    if (speed > 0.5) {
      this.bobTimer += delta * 12;
      verticalBob = Math.abs(Math.sin(this.bobTimer)) * 0.12;
      this.spriteMesh.rotation.z = Math.sin(this.bobTimer * 0.7) * 0.08;
    } else {
      this.spriteMesh.rotation.z = 0;
    }

    this.meshGroup.position.set(this.position.x, this.position.y + verticalBob, this.position.z);

    // Cylindrical billboard effect: Sprite faces player camera on Y axis only
    this.meshGroup.lookAt(player.camera.position.x, this.meshGroup.position.y, player.camera.position.z);

    return distToPlayer;
  }
}
