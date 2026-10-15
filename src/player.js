import * as THREE from 'three';
import { soundEngine } from './audio.js';

export class Player {
  constructor(camera, domElement, map) {
    this.camera = camera;
    this.domElement = domElement;
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

    this.isLocked = false;
    this.setupInputs();
  }

  initFlashlight() {
    this.flashlight = new THREE.SpotLight(0xfff4e0, 2.5, 25, Math.PI / 6, 0.4, 1.2);
    this.flashlight.position.set(0.2, -0.2, -0.1);
    this.camera.add(this.flashlight);

    // Target slightly ahead
    this.flashlightTarget = new THREE.Object3D();
    this.flashlightTarget.position.set(0, 0, -5);
    this.camera.add(this.flashlightTarget);
    this.flashlight.target = this.flashlightTarget;
  }

  toggleFlashlight() {
    this.flashlightOn = !this.flashlightOn;
    this.flashlight.intensity = this.flashlightOn ? 2.5 : 0;
  }

  setupInputs() {
    // Pointer lock request
    this.domElement.addEventListener('click', () => {
      if (!this.isLocked && document.pointerLockElement !== this.domElement) {
        this.domElement.requestPointerLock();
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.isLocked = document.pointerLockElement === this.domElement;
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
          this.keys.sprint = true;
          break;
        case 'Space':
          this.keys.jump = true;
          if (this.isGrounded) {
            this.verticalVelocity = this.jumpForce;
            this.isGrounded = false;
          }
          break;
        case 'KeyF':
          this.toggleFlashlight();
          break;
        case 'Digit1':
        case 'Numpad1':
          this.useItem('forcefield');
          break;
        case 'Digit2':
        case 'Numpad2':
          this.useItem('energy_drink');
          break;
        case 'Digit3':
        case 'Numpad3':
          this.useItem('dakimakura');
          break;
        case 'Digit4':
        case 'Numpad4':
          this.useItem('d20_dice');
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
      }
    });
  }

  spawnAt(pos) {
    this.position.copy(pos);
    this.position.y = this.eyeHeight;
    this.velocity.set(0, 0, 0);
    this.verticalVelocity = 0;
    this.stamina = this.maxStamina;
    this.shieldActive = false;
    this.shieldTimeRemaining = 0;
    this.speedBoostTimeRemaining = 0;
    this.extraLives = 0;
    this.invulnerabilityTimer = 0;
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

    // Update powerup timers
    if (this.shieldTimeRemaining > 0) {
      this.shieldTimeRemaining -= delta;
      this.shieldActive = this.shieldTimeRemaining > 0;
    }

    if (this.invulnerabilityTimer > 0) {
      this.invulnerabilityTimer -= delta;
    }

    const hasSpeedBoost = this.speedBoostTimeRemaining > 0;
    if (hasSpeedBoost) {
      this.speedBoostTimeRemaining -= delta;
    }

    // Determine target speed & stamina
    let isMoving = this.keys.forward || this.keys.backward || this.keys.left || this.keys.right;
    let wantsSprint = this.keys.sprint && isMoving && !this.isExhausted;

    let targetSpeed = this.walkSpeed;
    if (hasSpeedBoost) {
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

    if (this.moveDir.lengthSq() > 0.001) {
      this.moveDir.normalize();
      const targetVel = this.moveDir.clone().multiplyScalar(targetSpeed);
      this.velocity.lerp(targetVel, this.acceleration * delta);
    } else {
      // Friction decelerate
      this.velocity.lerp(new THREE.Vector3(0, 0, 0), this.friction * delta);
    }

    // Apply horizontal movement with sub-stepping to prevent tunneling at high speeds
    const speed = Math.hypot(this.velocity.x, this.velocity.z);
    const totalDist = speed * delta;
    const subSteps = Math.max(1, Math.min(4, Math.ceil(totalDist / (this.radius * 0.5))));
    const stepDelta = delta / subSteps;

    for (let s = 0; s < subSteps; s++) {
      this.position.x += this.velocity.x * stepDelta;
      this.position.z += this.velocity.z * stepDelta;
      this.map.resolveCollision(this.position, this.radius);
    }

    // Gravity & Vertical Movement
    if (!this.isGrounded) {
      this.verticalVelocity += this.gravity * delta;
      this.position.y += this.verticalVelocity * delta;

      if (this.position.y <= this.eyeHeight) {
        this.position.y = this.eyeHeight;
        this.verticalVelocity = 0;
        this.isGrounded = true;
      }
    }

    // Head bobbing effect
    const horizontalSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    let bobOffset = 0;
    if (this.isGrounded && horizontalSpeed > 0.5) {
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

    // Update Camera Position and Rotation
    this.camera.position.set(this.position.x, this.position.y + bobOffset, this.position.z);
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

    if (typeId === 'forcefield') {
      this.activateShield(6.0);
    } else if (typeId === 'energy_drink') {
      this.activateSpeedBoost(5.0);
      soundEngine.playDrinkEnergy();
    } else if (typeId === 'dakimakura') {
      soundEngine.playDropDecoy();
      if (this.onItemUsed) {
        this.onItemUsed('dakimakura', this.position.clone());
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
