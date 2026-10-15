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

    // Billboard mesh group
    this.meshGroup = new THREE.Group();
    this.initMesh();

    // Red/pink underglow aura light
    this.auraLight = new THREE.PointLight(0xff0066, 1.8, 7, 2);
    this.auraLight.position.set(0, 0.6, 0);
    this.meshGroup.add(this.auraLight);

    this.scene.add(this.meshGroup);
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
    this.position.y = 0;
    this.meshGroup.position.copy(this.position);
    this.velocity.set(0, 0, 0);
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

    // 1. Immediately separate girl physically outside the collision radius
    this.position.add(dir.clone().multiplyScalar(immediatePush));
    this.map.resolveCollision(this.position, this.radius);

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

  update(delta, player, elapsedTime) {
    if (delta > 0.1) delta = 0.1;

    // Difficulty scaling: speed increases slightly over survival time
    this.speedMultiplier = 1.0 + Math.floor(elapsedTime / 20) * 0.05;
    this.currentSpeed = this.baseSpeed * this.speedMultiplier;

    const toPlayer = new THREE.Vector3().subVectors(player.position, this.position);
    toPlayer.y = 0;
    const distToPlayer = toPlayer.length();

    // Spatial chase music & heartbeat distance update
    soundEngine.updateChaseDistance(distToPlayer, 38);

    // If currently stunned from a shield blast or D20 save
    if (this.stunTimer > 0) {
      this.stunTimer -= delta;
      // Heavy deceleration while sliding backwards
      this.velocity.lerp(new THREE.Vector3(0, 0, 0), 3.5 * delta);
      this.position.x += this.velocity.x * delta;
      this.position.z += this.velocity.z * delta;
      this.map.resolveCollision(this.position, this.radius);

      // Stun wobble / disorientation tilt
      this.meshGroup.position.set(this.position.x, 0, this.position.z);
      this.spriteMesh.rotation.z = Math.sin(performance.now() * 0.02) * 0.28;
      this.meshGroup.lookAt(player.camera.position.x, this.meshGroup.position.y, player.camera.position.z);

      const toP = new THREE.Vector3().subVectors(player.position, this.position);
      toP.y = 0;
      return toP.length();
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

    // Nextbot Navigation Logic
    const hasLOS = this.map.hasLineOfSight(this.position, player.position);

    let moveDir = new THREE.Vector3();

    if (hasLOS) {
      // Direct chase
      moveDir.copy(toPlayer).normalize();
    } else {
      // Obstacle avoidance navigation: probe forward and angled rays
      const idealDir = toPlayer.clone().normalize();
      moveDir.copy(idealDir);

      const angles = [0, 0.45, -0.45, 0.9, -0.9, 1.4, -1.4];
      let bestDir = null;

      for (const angle of angles) {
        const testDir = idealDir.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
        const probePoint = this.position.clone().add(testDir.clone().multiplyScalar(2.0));
        
        let blocked = false;
        for (const wall of this.map.walls) {
          if (probePoint.x >= wall.minX && probePoint.x <= wall.maxX &&
              probePoint.z >= wall.minZ && probePoint.z <= wall.maxZ) {
            blocked = true;
            break;
          }
        }
        if (!blocked) {
          bestDir = testDir;
          break;
        }
      }

      if (bestDir) {
        moveDir.copy(bestDir);
      }
    }

    // Apply movement acceleration
    const targetVel = moveDir.multiplyScalar(this.currentSpeed);
    this.velocity.lerp(targetVel, 8.0 * delta);

    // Knockback friction decay if moving too fast
    if (this.velocity.length() > this.currentSpeed * 1.5) {
      this.velocity.multiplyScalar(0.92);
    }

    // Update position
    this.position.x += this.velocity.x * delta;
    this.position.z += this.velocity.z * delta;

    // Resolve wall collisions
    this.map.resolveCollision(this.position, this.radius);

    // Nextbot Bobbing & Wobble Animation
    const speed = this.velocity.length();
    if (speed > 0.5) {
      this.bobTimer += delta * 12;
      const verticalBob = Math.abs(Math.sin(this.bobTimer)) * 0.12;
      const wobble = Math.sin(this.bobTimer * 0.7) * 0.08;

      this.meshGroup.position.set(this.position.x, verticalBob, this.position.z);
      this.spriteMesh.rotation.z = wobble;
    } else {
      this.meshGroup.position.set(this.position.x, 0, this.position.z);
      this.spriteMesh.rotation.z = 0;
    }

    // Cylindrical billboard effect: Sprite faces player camera on Y axis only
    // Keeps the sprite standing upright on the floor without pitching into the ground
    this.meshGroup.lookAt(player.camera.position.x, this.meshGroup.position.y, player.camera.position.z);

    return distToPlayer;
  }
}
