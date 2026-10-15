import * as THREE from 'three';

// Procedural Canvas Texture Generators
function createFloorTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Base dark tile pattern
  ctx.fillStyle = '#121318';
  ctx.fillRect(0, 0, 512, 512);

  // Large tiles with subtle grunge
  const tileSize = 64;
  for (let x = 0; x < 512; x += tileSize) {
    for (let y = 0; y < 512; y += tileSize) {
      const shade = 18 + Math.floor(Math.random() * 12);
      ctx.fillStyle = `rgb(${shade}, ${shade + 2}, ${shade + 5})`;
      ctx.fillRect(x + 1, y + 1, tileSize - 2, tileSize - 2);

      // Tile bevel
      ctx.strokeStyle = '#08080c';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, tileSize, tileSize);
    }
  }

  // Subtle scuffs
  for (let i = 0; i < 200; i++) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.fillRect(Math.random() * 512, Math.random() * 512, Math.random() * 4, Math.random() * 4);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(12, 12);
  return texture;
}

function createWallTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Industrial wall base
  ctx.fillStyle = '#1e222a';
  ctx.fillRect(0, 0, 512, 512);

  // Concrete speckles
  for (let i = 0; i < 1500; i++) {
    const v = Math.random() > 0.5 ? 255 : 0;
    ctx.fillStyle = `rgba(${v}, ${v}, ${v}, ${Math.random() * 0.04})`;
    ctx.fillRect(Math.random() * 512, Math.random() * 512, 3, 3);
  }

  // Baseboard trim at bottom
  ctx.fillStyle = '#0f1115';
  ctx.fillRect(0, 480, 512, 32);
  ctx.fillStyle = '#00f3ff';
  ctx.fillRect(0, 476, 512, 4); // Neon trim line

  // Top molding
  ctx.fillStyle = '#14171d';
  ctx.fillRect(0, 0, 512, 24);

  // Hazard warning stripe section
  ctx.fillStyle = '#ffaa00';
  ctx.fillRect(0, 440, 512, 12);
  ctx.fillStyle = '#111';
  for (let s = 0; s < 512; s += 24) {
    ctx.beginPath();
    ctx.moveTo(s, 452);
    ctx.lineTo(s + 12, 440);
    ctx.lineTo(s + 24, 440);
    ctx.lineTo(s + 12, 452);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

function createCeilingTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#111317';
  ctx.fillRect(0, 0, 256, 256);

  // Acoustic ceiling grid
  ctx.strokeStyle = '#222730';
  ctx.lineWidth = 3;
  ctx.strokeRect(0, 0, 128, 128);
  ctx.strokeRect(128, 0, 128, 128);
  ctx.strokeRect(0, 128, 128, 128);
  ctx.strokeRect(128, 128, 128, 128);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(12, 12);
  return texture;
}

function createSignTexture(text, bgColor = '#ff0055', textColor = '#ffffff') {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#08080a';
  ctx.fillRect(0, 0, 512, 128);
  ctx.strokeStyle = bgColor;
  ctx.lineWidth = 6;
  ctx.strokeRect(6, 6, 500, 116);

  ctx.fillStyle = bgColor;
  ctx.font = 'bold 34px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = bgColor;
  ctx.shadowBlur = 15;
  ctx.fillText(text, 256, 64);

  return new THREE.CanvasTexture(canvas);
}

export class GameMap {
  constructor(scene) {
    this.scene = scene;
    this.tileSize = 4; // meters per grid tile
    this.wallHeight = 4.2;

    // 0 = Empty, 1 = Wall, 2 = Pillar
    // 22 x 22 Grid Maze Layout
    this.grid = [
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,0,0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1],
      [1,0,1,1,0,0,1,0,1,1,1,0,0,1,0,1,1,1,1,1,0,1],
      [1,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,1,0,1],
      [1,0,1,0,1,1,1,1,0,0,1,1,1,1,1,0,1,1,0,1,0,1],
      [1,0,0,0,1,0,0,1,0,0,0,0,0,0,1,0,0,1,0,0,0,1],
      [1,1,1,0,1,0,0,1,0,1,1,1,0,0,1,1,0,1,0,1,1,1],
      [1,0,0,0,0,0,0,0,0,1,0,1,0,0,0,0,0,0,0,0,0,1],
      [1,0,1,1,1,0,1,1,0,1,0,1,0,1,1,0,1,1,1,1,0,1],
      [1,0,0,0,1,0,1,0,0,0,0,0,0,0,1,0,1,0,0,0,0,1],
      [1,1,1,0,1,0,1,0,1,1,0,0,1,0,1,0,1,0,1,1,1,1],
      [1,0,0,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,0,1],
      [1,0,1,1,1,1,0,0,1,1,1,1,1,0,0,1,1,1,1,1,0,1],
      [1,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1],
      [1,1,1,0,0,1,1,1,0,1,1,1,0,1,1,1,0,0,1,1,1,1],
      [1,0,0,0,0,0,0,1,0,1,0,1,0,1,0,0,0,0,0,0,0,1],
      [1,0,1,1,1,1,0,1,0,1,0,1,0,1,0,1,1,1,1,1,0,1],
      [1,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1],
      [1,1,1,0,0,1,0,1,1,1,1,1,1,1,0,1,0,0,1,1,1,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
    ];

    this.gridRows = this.grid.length;
    this.gridCols = this.grid[0].length;
    this.width = this.gridCols * this.tileSize;
    this.depth = this.gridRows * this.tileSize;
    this.offsetX = -this.width / 2;
    this.offsetZ = -this.depth / 2;

    this.walls = [];
    this.spawnPoints = [];

    this.buildWorld();
  }

  buildWorld() {
    // Floor
    const floorGeo = new THREE.PlaneGeometry(this.width, this.depth);
    const floorMat = new THREE.MeshStandardMaterial({
      map: createFloorTexture(),
      roughness: 0.7,
      metalness: 0.2
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, 0);
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Ceiling
    const ceilingGeo = new THREE.PlaneGeometry(this.width, this.depth);
    const ceilingMat = new THREE.MeshStandardMaterial({
      map: createCeilingTexture(),
      roughness: 0.9,
      metalness: 0.1
    });
    const ceiling = new THREE.Mesh(ceilingGeo, ceilingMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(0, this.wallHeight, 0);
    this.scene.add(ceiling);

    // Walls
    const wallGeo = new THREE.BoxGeometry(this.tileSize, this.wallHeight, this.tileSize);
    const wallMat = new THREE.MeshStandardMaterial({
      map: createWallTexture(),
      roughness: 0.6,
      metalness: 0.3
    });

    for (let r = 0; r < this.gridRows; r++) {
      for (let c = 0; c < this.gridCols; c++) {
        const x = this.offsetX + c * this.tileSize + this.tileSize / 2;
        const z = this.offsetZ + r * this.tileSize + this.tileSize / 2;

        if (this.grid[r][c] === 1) {
          const wall = new THREE.Mesh(wallGeo, wallMat);
          wall.position.set(x, this.wallHeight / 2, z);
          wall.castShadow = true;
          wall.receiveShadow = true;
          this.scene.add(wall);

          this.walls.push({
            minX: x - this.tileSize / 2,
            maxX: x + this.tileSize / 2,
            minZ: z - this.tileSize / 2,
            maxZ: z + this.tileSize / 2
          });
        } else {
          this.spawnPoints.push(new THREE.Vector3(x, 1, z));
        }
      }
    }

    // Add glowing neon ceiling lamps
    this.addCeilingLights();

    // Add atmospheric warning signs on walls
    this.addNeonSigns();
  }

  addCeilingLights() {
    // Distribute lights across open corridors
    const lightPositions = [
      [3, 3, 0x00f3ff],
      [7, 3, 0xff0077],
      [15, 3, 0x00f3ff],
      [19, 3, 0xffaa00],
      [3, 11, 0xff0055],
      [11, 11, 0x00f3ff],
      [19, 11, 0x9900ff],
      [3, 18, 0x00f3ff],
      [11, 18, 0xffaa00],
      [18, 18, 0xff0055]
    ];

    lightPositions.forEach(([c, r, color]) => {
      const x = this.offsetX + c * this.tileSize + this.tileSize / 2;
      const z = this.offsetZ + r * this.tileSize + this.tileSize / 2;

      // Glowing tube fixture mesh
      const fixtureGeo = new THREE.BoxGeometry(2, 0.1, 0.4);
      const fixtureMat = new THREE.MeshBasicMaterial({ color: color });
      const fixture = new THREE.Mesh(fixtureGeo, fixtureMat);
      fixture.position.set(x, this.wallHeight - 0.05, z);
      this.scene.add(fixture);

      // PointLight
      const light = new THREE.PointLight(color, 2.5, 14, 1.8);
      light.position.set(x, this.wallHeight - 0.5, z);
      this.scene.add(light);
    });
  }

  addNeonSigns() {
    const signDefs = [
      { text: '⚠️ ОСТОРОЖНО: ДЕВУШКИ ⚠️', color: '#ff0055' },
      { text: '🛡️ СОХРАНЯЙ ДЕВСТВЕННОСТЬ 🛡️', color: '#00f3ff' },
      { text: '🏃 БЕГИ БЕЗ ОГЛЯДКИ! 🏃', color: '#ffaa00' },
      { text: '💔 ТЫ НЕ ГОТОВ К ОТНОШЕНИЯМ', color: '#ff00aa' },
      { text: '⚡ ИСПОЛЬЗУЙ АРТЕФАКТЫ [1, 2, 3]', color: '#39ff14' },
      { text: '🚫 ОПАСНАЯ ЗОНА: ФЛИРТ', color: '#ff2244' }
    ];

    // Find actual wall tiles bordering open corridor cells
    const validPlacements = [];
    for (let r = 1; r < this.gridRows - 1; r++) {
      for (let c = 1; c < this.gridCols - 1; c++) {
        if (this.grid[r][c] === 1) { // Wall
          // Check 4 neighbors
          if (this.grid[r + 1][c] === 0) validPlacements.push({ r, c, face: '+Z' });
          if (this.grid[r - 1][c] === 0) validPlacements.push({ r, c, face: '-Z' });
          if (this.grid[r][c + 1] === 0) validPlacements.push({ r, c, face: '+X' });
          if (this.grid[r][c - 1] === 0) validPlacements.push({ r, c, face: '-X' });
        }
      }
    }

    // Pick 6 well-spaced spots
    const step = Math.max(1, Math.floor(validPlacements.length / signDefs.length));
    const signGeo = new THREE.PlaneGeometry(3.0, 0.75);

    for (let i = 0; i < signDefs.length; i++) {
      const idx = (i * step + 2) % validPlacements.length;
      const spot = validPlacements[idx];
      const def = signDefs[i];

      const wx = this.offsetX + spot.c * this.tileSize + this.tileSize / 2;
      const wz = this.offsetZ + spot.r * this.tileSize + this.tileSize / 2;
      const halfWall = this.tileSize / 2 + 0.04; // flush slightly outside wall face

      let posX = wx, posZ = wz, rotY = 0;
      if (spot.face === '+Z') {
        posZ = wz + halfWall;
        rotY = 0;
      } else if (spot.face === '-Z') {
        posZ = wz - halfWall;
        rotY = Math.PI;
      } else if (spot.face === '+X') {
        posX = wx + halfWall;
        rotY = Math.PI / 2;
      } else if (spot.face === '-X') {
        posX = wx - halfWall;
        rotY = -Math.PI / 2;
      }

      const mat = new THREE.MeshBasicMaterial({
        map: createSignTexture(def.text, def.color),
        transparent: true,
        side: THREE.FrontSide
      });
      const mesh = new THREE.Mesh(signGeo, mat);
      mesh.position.set(posX, 2.0, posZ);
      mesh.rotation.y = rotY;
      this.scene.add(mesh);
    }
  }

  // Robust Circle-to-AABB collision check with multi-pass relaxation & closest-face ejection
  resolveCollision(pos, radius = 0.5) {
    let anyResolved = false;

    // Up to 3 relaxation passes to resolve corners and multiple adjacent walls cleanly
    for (let iter = 0; iter < 3; iter++) {
      let iterResolved = false;

      // Only check walls in the vicinity of pos (broadphase)
      const queryRadius = radius + 0.8;
      for (let i = 0; i < this.walls.length; i++) {
        const w = this.walls[i];
        if (
          pos.x < w.minX - queryRadius ||
          pos.x > w.maxX + queryRadius ||
          pos.z < w.minZ - queryRadius ||
          pos.z > w.maxZ + queryRadius
        ) {
          continue;
        }

        // If center has penetrated inside the wall box, eject along the shallowest face
        if (pos.x >= w.minX && pos.x <= w.maxX && pos.z >= w.minZ && pos.z <= w.maxZ) {
          iterResolved = true;
          anyResolved = true;
          const dLeft = pos.x - w.minX;
          const dRight = w.maxX - pos.x;
          const dBottom = pos.z - w.minZ;
          const dTop = w.maxZ - pos.z;
          const minDist = Math.min(dLeft, dRight, dBottom, dTop);

          if (minDist === dLeft) {
            pos.x = w.minX - radius;
          } else if (minDist === dRight) {
            pos.x = w.maxX + radius;
          } else if (minDist === dBottom) {
            pos.z = w.minZ - radius;
          } else {
            pos.z = w.maxZ + radius;
          }
          continue;
        }

        // Find closest point on AABB to circle center
        const closestX = Math.max(w.minX, Math.min(pos.x, w.maxX));
        const closestZ = Math.max(w.minZ, Math.min(pos.z, w.maxZ));

        const dx = pos.x - closestX;
        const dz = pos.z - closestZ;
        const distSq = dx * dx + dz * dz;

        if (distSq < radius * radius && distSq > 0.000001) {
          iterResolved = true;
          anyResolved = true;
          const dist = Math.sqrt(distSq);
          const overlap = radius - dist;
          pos.x += (dx / dist) * overlap;
          pos.z += (dz / dist) * overlap;
        }
      }

      if (!iterResolved) break;
    }

    return anyResolved;
  }

  // Raycast/Line of sight check between two points in 2D
  hasLineOfSight(p1, p2) {
    const x1 = p1.x, z1 = p1.z;
    const x2 = p2.x, z2 = p2.z;
    const steps = Math.ceil(Math.hypot(x2 - x1, z2 - z1) * 2);

    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const curX = x1 + (x2 - x1) * t;
      const curZ = z1 + (z2 - z1) * t;

      // Check if inside any wall
      for (let j = 0; j < this.walls.length; j++) {
        const w = this.walls[j];
        if (curX >= w.minX && curX <= w.maxX && curZ >= w.minZ && curZ <= w.maxZ) {
          return false;
        }
      }
    }
    return true;
  }

  getRandomSpawnPoint(minDistanceFrom = null, minDist = 10) {
    const valid = this.spawnPoints.filter(p => {
      if (!minDistanceFrom) return true;
      return p.distanceTo(minDistanceFrom) >= minDist;
    });
    if (valid.length === 0) return this.spawnPoints[0];
    return valid[Math.floor(Math.random() * valid.length)].clone();
  }
}
