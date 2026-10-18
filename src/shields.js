import * as THREE from 'three';

export const SHIELD_TYPES = {
  FORCEFIELD: {
    id: 'forcefield',
    name: 'RTX 5090 (Силовое Поле)',
    description: 'Отталкивает девушку при попытке подойти на 6 сек!',
    color: 0x00f3ff,
    duration: 6.0
  },
  ENERGY_DRINK: {
    id: 'energy_drink',
    name: 'Энергетик "Flash"',
    description: 'Ультра-скорость и бесконечная выносливость на 5 сек!',
    color: 0x39ff14,
    duration: 5.0
  },
  DAKIMAKURA: {
    id: 'dakimakura',
    name: 'Дакимакура (Приманка)',
    description: 'Девушка отвлекается на аниме-подушку на 5 сек!',
    color: 0xff00cc,
    duration: 5.0
  },
  D20_DICE: {
    id: 'd20_dice',
    name: 'D20 Кость (Второй шанс)',
    description: '+1 Защита девственности (спас-бросок при поимке)!',
    color: 0xffaa00,
    duration: 0
  }
};

export class ShieldManager {
  constructor(scene, map) {
    this.scene = scene;
    this.map = map;
    this.pickups = [];
    this.maxPickups = 4;
    this.spawnTimer = 0;
    this.onPickupCallback = null;

    // Player visual shield aura
    this.initPlayerAura();
  }

  initPlayerAura() {
    const auraGeo = new THREE.SphereGeometry(1.2, 16, 16);
    const auraMat = new THREE.MeshBasicMaterial({
      color: 0x00f3ff,
      wireframe: true,
      transparent: true,
      opacity: 0
    });
    this.playerAura = new THREE.Mesh(auraGeo, auraMat);
    this.scene.add(this.playerAura);
  }

  createPickupMesh(type) {
    const group = new THREE.Group();

    let mesh;
    if (type.id === 'forcefield') {
      // GPU Box with glowing fans
      const geo = new THREE.BoxGeometry(0.8, 0.4, 0.2);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x22252a,
        metalness: 0.9,
        roughness: 0.2,
        emissive: 0x005577,
        emissiveIntensity: 0.5
      });
      mesh = new THREE.Mesh(geo, mat);

      // Fans
      const fanGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.05, 12);
      const fanMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff });
      const fan1 = new THREE.Mesh(fanGeo, fanMat);
      fan1.position.set(-0.2, 0, 0.11);
      fan1.rotation.x = Math.PI / 2;
      mesh.add(fan1);
      const fan2 = fan1.clone();
      fan2.position.x = 0.2;
      mesh.add(fan2);

    } else if (type.id === 'energy_drink') {
      // Can
      const geo = new THREE.CylinderGeometry(0.16, 0.16, 0.55, 16);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x111111,
        emissive: 0x22aa00,
        emissiveIntensity: 0.6,
        roughness: 0.3,
        metalness: 0.8
      });
      mesh = new THREE.Mesh(geo, mat);

    } else if (type.id === 'dakimakura') {
      // Pillowed cushion
      const geo = new THREE.BoxGeometry(0.35, 0.9, 0.15);
      const mat = new THREE.MeshStandardMaterial({
        color: 0xff66cc,
        roughness: 0.8,
        emissive: 0xff0066,
        emissiveIntensity: 0.4
      });
      mesh = new THREE.Mesh(geo, mat);

    } else {
      // D20 Icosahedron
      const geo = new THREE.IcosahedronGeometry(0.28, 0);
      const mat = new THREE.MeshStandardMaterial({
        color: 0xffaa00,
        wireframe: true,
        roughness: 0.2,
        emissive: 0xff8800,
        emissiveIntensity: 0.8
      });
      mesh = new THREE.Mesh(geo, mat);
    }

    group.add(mesh);

    // Glowing ground ring
    const ringGeo = new THREE.RingGeometry(0.3, 0.5, 24);
    const ringMat = new THREE.MeshBasicMaterial({
      color: type.color,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.6
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -0.5;
    group.add(ring);

    // Light source
    const light = new THREE.PointLight(type.color, 1.8, 4.5, 2);
    light.position.set(0, 0, 0);
    group.add(light);

    return { group, innerMesh: mesh, ring };
  }

  spawnRandomPickup(nearPlayerPos = null) {
    const keys = Object.keys(SHIELD_TYPES);
    const randomKey = keys[Math.floor(Math.random() * keys.length)];
    const type = SHIELD_TYPES[randomKey];

    const pos = this.map.getRandomSpawnPoint(nearPlayerPos, 12);
    if (!this.map.isCrater) {
      pos.y = 1.0;
    }

    const { group, innerMesh, ring } = this.createPickupMesh(type);
    group.position.copy(pos);
    this.scene.add(group);

    this.pickups.push({
      type,
      position: pos,
      group,
      innerMesh,
      ring,
      hoverOffset: Math.random() * Math.PI * 2
    });
  }

  reset(playerPos) {
    // Remove all existing pickups
    for (const p of this.pickups) {
      this.scene.remove(p.group);
    }
    this.pickups = [];

    // Spawn initial set
    for (let i = 0; i < this.maxPickups; i++) {
      this.spawnRandomPickup(playerPos);
    }
  }

  update(delta, player, girl, onNotify) {
    // Update player shield aura visual
    if (player.shieldActive) {
      this.playerAura.position.copy(player.position);
      this.playerAura.material.opacity = 0.4 + Math.sin(performance.now() * 0.01) * 0.2;
      this.playerAura.rotation.y += delta * 2;
      this.playerAura.rotation.x += delta;
    } else {
      this.playerAura.material.opacity = 0;
    }

    // Periodically spawn new pickup if below max
    this.spawnTimer += delta;
    if (this.pickups.length < this.maxPickups && this.spawnTimer > 10.0) {
      this.spawnTimer = 0;
      this.spawnRandomPickup(player.position);
    }

    // Hover, spin, and check collision
    const pPos = player.position;

    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i];
      p.hoverOffset += delta * 3;
      p.innerMesh.rotation.y += delta * 2.2;
      p.innerMesh.rotation.x = Math.sin(p.hoverOffset * 0.5) * 0.2;
      p.group.position.y = p.position.y + Math.sin(p.hoverOffset) * 0.15;

      // 3D Distance to player
      const distFlat = Math.hypot(p.position.x - pPos.x, p.position.z - pPos.z);
      const distY = Math.abs(p.position.y - pPos.y);
      if (distFlat < 1.6 && distY < 2.2) {
        // Collect into player inventory!
        player.addToInventory(p.type.id);
        if (p.type.id === 'd20_dice') {
          player.addExtraLife();
        }

        if (onNotify) {
          onNotify(p.type);
        }

        this.scene.remove(p.group);
        this.pickups.splice(i, 1);
      }
    }
  }

  spawnDroppedDecoy(position, girl, duration = 5.0) {
    // Spawn 3D Dakimakura on the ground
    const geo = new THREE.BoxGeometry(0.5, 0.2, 1.0);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xff66cc,
      emissive: 0xff0077,
      emissiveIntensity: 0.5,
      roughness: 0.8
    });
    const decoyMesh = new THREE.Mesh(geo, mat);
    decoyMesh.position.set(position.x, 0.15, position.z);
    decoyMesh.rotation.y = Math.random() * Math.PI;
    this.scene.add(decoyMesh);

    // Pink particle/glow ring on the floor
    const ringGeo = new THREE.RingGeometry(0.4, 0.7, 16);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xff00cc, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(position.x, 0.05, position.z);
    this.scene.add(ring);

    // Distract the girl towards this location
    girl.distract(duration, position);

    // Remove decoy after duration
    setTimeout(() => {
      this.scene.remove(decoyMesh);
      this.scene.remove(ring);
    }, duration * 1000);
  }
}
