import * as THREE from 'three';
import { soundEngine } from './audio.js';
import { FirstPersonBody } from './firstPersonBody.js';

export class Player {
  constructor(camera, domElement, scene = null, map = null) {
    this.camera = camera;
    this.domElement = domElement;
    this.scene = scene;
    this.map = map;

    this.position = new THREE.Vector3(0, 1.7, 0);
    this.velocity = new THREE.Vector3();
    this.moveDir = new THREE.Vector3();

    // Camera Rotation Euler
    this.pitch = 0;
    this.yaw = 0;
    this.mouseSensitivity = 0.0022;

    // Movement Parameters
    this.walkSpeed = 7.0;
    this.sprintSpeed = 12.8;
    this.currentSpeed = this.walkSpeed;
    this.acceleration = 45.0;
    this.friction = 10.0;
    this.radius = 0.45;

    // Jumping & Gravity
    this.gravity = -24.0;
    this.jumpForce = 8.5;
    this.verticalVelocity = 0;
    this.isGrounded = true;
    this.eyeHeight = 1.7;

    // Stamina
    this.stamina = 100;
    this.maxStamina = 100;
    this.staminaDrain = 26; // per second when sprinting
    this.staminaRegen = 18; // per second
    this.isExhausted = false;

    // Key states
    this.keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      sprint: false,
      jump: false
    };

    // Head bobbing & footsteps
    this.bobTimer = 0;
    this.lastStepTime = 0;

    // Flashlight
    this.flashlightOn = true;
    this.initFlashlight();

    // Active powerups / shield state
    this.shieldActive = false;
    this.shieldTimeRemaining = 0;
    this.speedBoostTimeRemaining = 0;
    this.extraLives = 0;
    this.invulnerabilityTimer = 0;

    // Downed / Co-op Rescue State
    this.isDowned = false;
    this.downedTimer = 25.0;
    this.targetEyeHeight = this.eyeHeight;
    this.currentEyeHeight = this.eyeHeight;
    this.revivingTarget = null;
    this.reviveHoldTime = 0;
    this.isHoldingRevive = false;

    // Volcano Parkour & Abilities
    this.canDoubleJump = true;
    this.lastSafePlatformPos = new THREE.Vector3(0, 2.5, 16);
    this.onMagmaDeath = null;
    this.onRocketJump = null;
    this.onDoubleJump = null;
    this.onD20MagmaSave = null;

    // Inventory System
    this.inventory = {
      forcefield: 0,
      energy_drink: 0,
      dakimakura: 0,
      d20_dice: 0
    };
    this.onInventoryChange = null;
    this.onItemUsed = null;
    this.onPassiveItemClicked = null;
    this.onDownedStateChange = null;

    this.isLocked = false;
    this.wasPointerLocked = false;

    // 🎮 True First-Person Body, Animated Hands & Viewmodel
    this.fpBody = (this.scene) ? new FirstPersonBody(this, this.scene) : null;

    this.setupInputs();
  }

  setScene(scene) {
    if (this.scene === scene) return;
    this.scene = scene;
    if (this.fpBody) {
      this.fpBody.destroy();
    }
    this.fpBody = (this.scene) ? new FirstPersonBody(this, this.scene) : null;
  }

  setDowned(downed) {
    this.isDowned = downed;
    if (this.isDowned) {
      this.downedTimer = 25.0;
      this.targetEyeHeight = 0.45;
      this.shieldActive = false;
      this.shieldTimeRemaining = 0;
      this.speedBoostTimeRemaining = 0;
    } else {
      this.targetEyeHeight = this.eyeHeight;
      this.invulnerabilityTimer = 3.5; // Brief grace period after revive
      this.stamina = 100;
    }
    if (this.onDownedStateChange) {
      this.onDownedStateChange(this.isDowned);
    }
  }

  initFlashlight() {
    this.flashlight = new THREE.SpotLight(0xfff4e0, 2.8, 32, Math.PI / 6.5, 0.35, 1.2);
    // Origin at the front glass bezel of the 3D tactical flashlight (in front of hand and arm!)
    this.flashlight.position.set(0.26, -0.22, -0.62);
    this.camera.add(this.flashlight);

    // Target straight ahead in the distance
    this.flashlightTarget = new THREE.Object3D();
    this.flashlightTarget.position.set(0.26, -0.22, -10.62);
    this.camera.add(this.flashlightTarget);
    this.flashlight.target = this.flashlightTarget;
  }

  toggleFlashlight() {
    this.flashlightOn = !this.flashlightOn;
    this.flashlight.intensity = this.flashlightOn ? 2.5 : 0;
    if (this.fpBody) {
      this.fpBody.triggerFlashlightToggle(this.flashlightOn);
    } else {
      soundEngine.playFlashlightClick(this.flashlightOn);
    }
  }

  setupInputs() {
    // Pointer lock request
    this.domElement.addEventListener('click', () => {
      if (!this.isLocked && document.pointerLockElement !== this.domElement) {
        this.domElement.requestPointerLock();
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.isLocked = (document.pointerLockElement === this.domElement);
      if (this.isLocked) {
        this.wasPointerLocked = true;
      }
    });

    // Mouse movement
    window.addEventListener('mousemove', (e) => {
      if (!this.isLocked) return;

      this.yaw -= e.movementX * this.mouseSensitivity;
      this.pitch -= e.movementY * this.mouseSensitivity;

      // Clamp pitch to avoid neck snap (approx -85 to +85 degrees)
      const maxPitch = Math.PI / 2 - 0.05;
      this.pitch = Math.max(-maxPitch, Math.min(maxPitch, this.pitch));
    });

    // Keyboard inputs
    window.addEventListener('keydown', (e) => {
      // Ignore if typing in text inputs or chat
      if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) {
        return;
      }

      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }

      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          this.keys.forward = true;
          break;
        case 'KeyS':
        case 'ArrowDown':
          this.keys.backward = true;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          this.keys.left = true;
          break;
        case 'KeyD':
        case 'ArrowRight':
          this.keys.right = true;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          if (!this.isDowned) this.keys.sprint = true;
          break;
        case 'Space':
          this.keys.jump = true;
          if (this.isGrounded && !this.isDowned) {
            this.verticalVelocity = this.jumpForce;
            this.isGrounded = false;
            this.canDoubleJump = true;
          } else if (!this.isGrounded && !this.isDowned && this.canDoubleJump) {
            // Monster Energy allows double jump in mid-air
            if (this.speedBoostTimeRemaining > 0) {
              this.verticalVelocity = this.jumpForce * 1.15;
              this.canDoubleJump = false;
              soundEngine.playDoubleJump();
              if (this.onDoubleJump) this.onDoubleJump();
            }
          }
          break;
        case 'KeyE':
          this.isHoldingRevive = true;
          break;
        case 'KeyF':
          this.toggleFlashlight();
          break;
        case 'Digit1':
        case 'Numpad1':
          if (!this.isDowned) this.useItem('forcefield');
          break;
        case 'Digit2':
        case 'Numpad2':
          if (!this.isDowned) this.useItem('energy_drink');
          break;
        case 'Digit3':
        case 'Numpad3':
          if (!this.isDowned) this.useItem('dakimakura');
          break;
        case 'Digit4':
        case 'Numpad4':
          if (!this.isDowned) this.useItem('d20_dice');
          break;
      }
    });

    window.addEventListener('keyup', (e) => {
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          this.keys.forward = false;
          break;
        case 'KeyS':
        case 'ArrowDown':
          this.keys.backward = false;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          this.keys.left = false;
          break;
        case 'KeyD':
        case 'ArrowRight':
          this.keys.right = false;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          this.keys.sprint = false;
          break;
        case 'Space':
          this.keys.jump = false;
          break;
        case 'KeyE':
          this.isHoldingRevive = false;
          break;
      }
    });
  }

  spawnAt(pos) {
    this.position.copy(pos);
    const spawnFloorY = (pos.y !== undefined) ? pos.y : 0;
    this.position.y = spawnFloorY + this.eyeHeight;
    this.lastSafePlatformPos.copy(this.position);
    this.velocity.set(0, 0, 0);
    this.verticalVelocity = 0;
    this.isGrounded = true;
    this.canDoubleJump = true;
    this.stamina = this.maxStamina;
    this.shieldActive = false;
    this.shieldTimeRemaining = 0;
    this.speedBoostTimeRemaining = 0;
    this.extraLives = 0;
    this.invulnerabilityTimer = 0;
    this.setDowned(false);
    this.currentEyeHeight = this.eyeHeight;
    if (this.fpBody) {
      this.fpBody.landDip = 0;
      this.fpBody.landDipVelocity = 0;
    }
    this.inventory = {
      forcefield: 0,
      energy_drink: 0,
      dakimakura: 0,
      d20_dice: 0
    };
    if (this.onInventoryChange) {
      this.onInventoryChange(this.inventory);
    }
  }

  update(delta) {
    if (delta > 0.1) delta = 0.1; // Clamp delta spikes

    // Safeguard against NaN position / velocity spikes
    if (isNaN(this.position.x) || isNaN(this.position.y) || isNaN(this.position.z)) {
      this.position.copy(this.lastSafePlatformPos);
      this.velocity.set(0, 0, 0);
      this.verticalVelocity = 0;
    }

    // Update powerup timers
    if (this.shieldTimeRemaining > 0) {
      this.shieldTimeRemaining -= delta;
      this.shieldActive = this.shieldTimeRemaining > 0;
    }

    if (this.invulnerabilityTimer > 0) {
      this.invulnerabilityTimer -= delta;
    }

    // Downed timer handling
    if (this.isDowned) {
      this.downedTimer = Math.max(0, this.downedTimer - delta);
    }

    // Smooth camera eye height
    this.currentEyeHeight = THREE.MathUtils.lerp(this.currentEyeHeight, this.targetEyeHeight, 8 * delta);

    const hasSpeedBoost = this.speedBoostTimeRemaining > 0;
    if (hasSpeedBoost) {
      this.speedBoostTimeRemaining -= delta;
    }

    // Determine target speed & stamina
    let isMoving = this.keys.forward || this.keys.backward || this.keys.left || this.keys.right;
    let wantsSprint = this.keys.sprint && isMoving && !this.isExhausted && !this.isDowned;

    let targetSpeed = this.walkSpeed;
    if (this.isDowned) {
      // Crawling when downed
      targetSpeed = 1.5;
      wantsSprint = false;
      this.stamina = 0;
    } else if (hasSpeedBoost) {
      targetSpeed = this.sprintSpeed * 1.35;
      wantsSprint = true;
    } else if (wantsSprint && this.stamina > 0) {
      targetSpeed = this.sprintSpeed;
      this.stamina = Math.max(0, this.stamina - this.staminaDrain * delta);
      if (this.stamina <= 0) {
        this.isExhausted = true;
      }
    } else {
      // Regenerate stamina
      this.stamina = Math.min(this.maxStamina, this.stamina + this.staminaRegen * delta);
      if (this.stamina > 25) {
        this.isExhausted = false;
      }
    }

    // Compute Movement vector relative to camera yaw
    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));

    this.moveDir.set(0, 0, 0);
    if (this.keys.forward) this.moveDir.add(forward);
    if (this.keys.backward) this.moveDir.sub(forward);
    if (this.keys.right) this.moveDir.add(right);
    if (this.keys.left) this.moveDir.sub(right);

    if (this.isGrounded) {
      // 1. Grounded Movement: Full responsive ground acceleration and friction
      if (this.moveDir.lengthSq() > 0.001) {
        this.moveDir.normalize();
        const targetVel = this.moveDir.clone().multiplyScalar(targetSpeed);
        this.velocity.lerp(targetVel, this.acceleration * delta);
      } else {
        // Ground friction decelerate
        this.velocity.lerp(new THREE.Vector3(0, 0, 0), this.friction * delta);
      }
    } else {
      // 2. Airborne Physics: Ballistic momentum is preserved!
      // In mid-air, player CANNOT artificially accelerate or boost speed!
      const currentHorizontalSpeed = Math.hypot(this.velocity.x, this.velocity.z);

      if (this.moveDir.lengthSq() > 0.001) {
        this.moveDir.normalize();
        // Air steering: very gentle guidance (4.0 vs 45.0) without adding artificial propulsion
        const airControl = 4.0;
        const maxAirSpeed = Math.max(this.walkSpeed * 0.6, currentHorizontalSpeed);
        const airTargetVel = this.moveDir.clone().multiplyScalar(maxAirSpeed);
        this.velocity.lerp(airTargetVel, airControl * delta);

        // Strict clamp: mid-air steering cannot increase velocity magnitude
        const newSpeed = Math.hypot(this.velocity.x, this.velocity.z);
        if (newSpeed > maxAirSpeed && newSpeed > 0.001) {
          const factor = maxAirSpeed / newSpeed;
          this.velocity.x *= factor;
          this.velocity.z *= factor;
        }
      } else {
        // Minimal air drag (preserves natural parabolic jump momentum across chasms)
        const airDrag = 0.4;
        this.velocity.lerp(new THREE.Vector3(0, 0, 0), airDrag * delta);
      }
    }

    // Apply horizontal movement with sub-stepping to prevent tunneling at high speeds
    const speed = Math.hypot(this.velocity.x, this.velocity.z);
    const totalDist = speed * delta;
    const subSteps = Math.max(1, Math.min(4, Math.ceil(totalDist / (this.radius * 0.5))));
    const stepDelta = delta / subSteps;

    for (let s = 0; s < subSteps; s++) {
      // Step X and resolve collision (slide against X walls)
      this.position.x += this.velocity.x * stepDelta;
      this.map.resolveCollision(this.position, this.radius);

      // Step Z and resolve collision (slide against Z walls)
      this.position.z += this.velocity.z * stepDelta;
      this.map.resolveCollision(this.position, this.radius);
    }

    // 3D Floor & Platform Collision Query
    const floorY = (this.map && typeof this.map.getFloorHeight === 'function')
      ? this.map.getFloorHeight(this.position.x, this.position.z, this.position.y - this.eyeHeight + 0.4, this.radius)
      : 0;

    const groundY = floorY + this.eyeHeight;

    // Track safe landing position for D20 miracle rescue (only on stable, non-crumbling platforms)
    if (this.isGrounded) {
      if (this.map && this.map.isCrater) {
        if (floorY > this.map.magmaLevel + 1.8) {
          this.lastSafePlatformPos.copy(this.position);
        }
        if (typeof this.map.onPlayerStep === 'function') {
          this.map.onPlayerStep(this.position.x, this.position.z, floorY);
        }
      } else {
        this.lastSafePlatformPos.copy(this.position);
      }
    }

    // Gravity & Vertical Movement
    if (!this.isGrounded || this.position.y > groundY + 0.05) {
      this.isGrounded = false;
      this.verticalVelocity += this.gravity * delta;
      this.position.y += this.verticalVelocity * delta;

      if (this.position.y <= groundY) {
        this.position.y = groundY;
        this.verticalVelocity = 0;
        this.isGrounded = true;
        this.canDoubleJump = true;
      }
    }

    // Safety net: in case player ever falls below floor on standard maze map
    if (this.map && !this.map.isCrater && this.position.y < -2.0) {
      this.position.copy(this.lastSafePlatformPos);
      this.position.y = this.eyeHeight;
      this.velocity.set(0, 0, 0);
      this.verticalVelocity = 0;
      this.isGrounded = true;
    }

    // Magma Contact Detection (The Floor is Lava!)
    if (this.map && typeof this.map.isMagmaTouch === 'function' && this.map.isMagmaTouch(this.position.y - this.eyeHeight)) {
      if (this.inventory.d20_dice > 0 || this.extraLives > 0) {
        // D20 Miracle Rescue!
        this.consumeD20Life();
        soundEngine.playD20Save();
        this.position.copy(this.lastSafePlatformPos);
        this.velocity.set(0, 0, 0);
        this.verticalVelocity = 4.0;
        this.isGrounded = true;
        if (this.onD20MagmaSave) this.onD20MagmaSave();
      } else {
        // Instant Magma Death
        if (this.onMagmaDeath) {
          this.onMagmaDeath();
        }
      }
    }

    // Head bobbing effect
    const horizontalSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    let bobOffset = 0;
    if (this.isGrounded && horizontalSpeed > 0.5 && !this.isDowned) {
      const bobFreq = wantsSprint ? 14 : 9;
      this.bobTimer += delta * bobFreq;
      bobOffset = Math.sin(this.bobTimer) * (wantsSprint ? 0.08 : 0.04);

      // Footstep sound trigger on step peak
      if (Math.sin(this.bobTimer) < -0.9 && performance.now() - this.lastStepTime > 260) {
        this.lastStepTime = performance.now();
        soundEngine.playFootstep(wantsSprint);
      }
    } else {
      this.bobTimer = 0;
    }

    // Update First-Person Body, Animated Viewmodel & Camera Physics
    if (this.fpBody) {
      this.fpBody.update(delta);
    }

    // Update Camera Position and Rotation
    const landDip = (this.fpBody) ? this.fpBody.landDip : 0;
    const camY = (this.position.y - this.eyeHeight) + this.currentEyeHeight + bobOffset - landDip;
    this.camera.position.set(this.position.x, camY, this.position.z);
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
  }

  addToInventory(typeId) {
    if (this.inventory[typeId] !== undefined) {
      this.inventory[typeId]++;
    } else {
      this.inventory[typeId] = 1;
    }

    if (typeId === 'd20_dice') {
      this.extraLives = this.inventory.d20_dice;
    }

    soundEngine.playPickup();

    if (this.onInventoryChange) {
      this.onInventoryChange(this.inventory);
    }
    return this.inventory[typeId];
  }

  useItem(typeId) {
    // D20 dice is a passive protection item! Do NOT consume on keypress or give speed boost!
    if (typeId === 'd20_dice') {
      if (this.onPassiveItemClicked) {
        this.onPassiveItemClicked('d20_dice');
      }
      return false;
    }

    if (!this.inventory[typeId] || this.inventory[typeId] <= 0) {
      return false;
    }

    this.inventory[typeId]--;
    if (this.onInventoryChange) {
      this.onInventoryChange(this.inventory);
    }

    // Trigger visible first-person hand animation
    if (this.fpBody) {
      this.fpBody.triggerItemAnimation(typeId);
    }

    if (typeId === 'forcefield') {
      this.activateShield(6.0);
      // Volcano Map Rocket Jump: blast launches player upward!
      if (this.map && this.map.isCrater) {
        this.verticalVelocity = 17.5;
        this.isGrounded = false;
        soundEngine.playRocketJump();
        if (this.onRocketJump) this.onRocketJump();
      }
    } else if (typeId === 'energy_drink') {
      this.activateSpeedBoost(5.0);
      this.canDoubleJump = true;
      soundEngine.playDrinkEnergy();
    } else if (typeId === 'dakimakura') {
      soundEngine.playDropDecoy();
      if (this.onItemUsed) {
        // Throw decoy forward slightly ahead of player
        const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
        const dropPos = this.position.clone().add(forward.multiplyScalar(3.5));
        dropPos.y = Math.max(0, this.position.y - this.eyeHeight);
        this.onItemUsed('dakimakura', dropPos);
      }
    }

    return true;
  }

  // Deducts 1 D20 dice on hit, grants 2.5s invulnerability + emergency sprint
  consumeD20Life() {
    if (this.inventory.d20_dice > 0) {
      this.inventory.d20_dice--;
      this.extraLives = this.inventory.d20_dice;
      this.invulnerabilityTimer = 2.5; // 2.5 seconds of safety!
      this.activateSpeedBoost(2.2); // Adrenaline burst to flee!
      if (this.fpBody) {
        this.fpBody.triggerItemAnimation('d20_dice');
      }
      if (this.onInventoryChange) {
        this.onInventoryChange(this.inventory);
      }
      return true;
    }
    return false;
  }

  activateShield(duration = 6.0) {
    this.shieldActive = true;
    this.shieldTimeRemaining = duration;
  }

  activateSpeedBoost(duration = 5.0) {
    this.speedBoostTimeRemaining = duration;
  }

  addExtraLife() {
    this.extraLives = this.inventory.d20_dice;
  }
}
