import * as THREE from 'three';
import { GameMap } from './map.js';
import { CraterMap } from './craterMap.js';
import { Player } from './player.js';
import { NextbotGirl } from './nextbot.js';
import { ShieldManager } from './shields.js';
import { EscapeGoalManager } from './escapeGoal.js';
import { soundEngine } from './audio.js';
import { assetManager } from './customAssets.js';
import { networkManager } from './multiplayer.js';
import { RemotePlayer } from './remotePlayer.js?v=2';
import { CutsceneManager } from './cutscenes.js';

// Game States
const STATE = {
  MENU: 'MENU',
  PLAYING: 'PLAYING',
  PAUSED: 'PAUSED',
  GAMEOVER: 'GAMEOVER',
  VICTORY: 'VICTORY',
  CUTSCENE: 'CUTSCENE'
};

const MAP_END_TEXTS = {
  crater: {
    coop: {
      defeat: {
        title: '🌋 ОТРЯД СГОРЕЛ В МЕСЯЧНЫХ!<br><span style="font-size: 0.65em; color: #ff0055;">КРОВАВЫЙ КРАХ КООПЕРАТИВА</span>',
        subtitle: 'Паучиха-девушка загнала весь сквад в кипящие месячные вулкана. Никто не добрался до вертолета!',
        magmaSubtitle: '«Ой, мальчики, вы все разом упали в мои месячные... Никто не успел спастись!»'
      },
      victory: {
        title: '🌋 БРО ПОКОРИЛИ ВУЛКАН!<br><span class="victory-subtitle-text" style="color: #00ffaa;">КООПЕРАТИВНЫЙ ТРИУМФ НА ВЕРШИНЕ</span>',
        badge: '👑 ЛЕГЕНДАРНЫЙ СКВАД СИГМА-САМУРАЕВ 👑',
        description: 'Ваш отряд преодолел бушующие потоки месячных, перепрыгнул все платформы и достиг Врат Тории! Друг на вертолете забрал всех выживших братьев!'
      }
    },
    solo: {
      defeat: {
        title: '🩸 УТОНУЛ В МЕСЯЧНЫХ!<br><span style="font-size: 0.65em; color: #ff0055;">КРОВАВЫЙ КОНЕЦ</span>',
        subtitle: '«Ой, кажется, ты упал в месячные... А я даже не успела познакомиться!»'
      },
      victory: {
        title: '🌋 ТЫ ВЫБРАЛСЯ ИЗ КРАТЕРА!<br><span class="victory-subtitle-text">СВЯЩЕННЫЕ ВРАТА ТОРИИ</span>',
        badge: '👑 ИСТИННЫЙ СИГМА-САМУРАЙ 👑',
        description: 'Ты поднялся на вершину кратера, спасся от поднимающихся месячных и улетел на вертолете лучшего друга!'
      }
    }
  },
  maze: {
    coop: {
      defeat: {
        title: '💔 ОТРЯД ЗАГНАН В УГОЛ!<br><span style="font-size: 0.65em; color: #ff0055;">ВСЕ БРО ПОТЕРЯЛИ ДЕВСТВЕННОСТЬ</span>',
        subtitle: 'Девушка Nextbot настигла последнего защитника в лабиринте. Братство девственников пало!',
        magmaSubtitle: 'Никому из отряда не удалось выбраться из лабиринта живым...'
      },
      victory: {
        title: '🚪 БРО ВЗЛОМАЛИ ЛАБИРИНТ!<br><span class="victory-subtitle-text" style="color: #00ffaa;">СЧАСТЛИВЫЙ КОНЕЦ (КООПЕРАТИВ)</span>',
        badge: '👑 НЕПОБЕДИМОЕ БРАТСТВО СИГМ 👑',
        description: 'Вы слаженно нашли все ключи, прикрывали друг друга силовыми полями и вместе распахнули железную дверь! Ни одна охотница не смогла сломить ваш бро-союз!'
      }
    },
    solo: {
      defeat: {
        title: 'ТЫ ПОТЕРЯЛ ДЕВСТВЕННОСТЬ<br>ТЫ ПРОИГРАЛ',
        subtitle: 'Твоя девственность была потеряна навсегда...'
      },
      victory: {
        title: 'ТЫ СОХРАНИЛ ДЕВСТВЕННОСТЬ!<br><span class="victory-subtitle-text">СЧАСТЛИВЫЙ КОНЕЦ (ПОБЕДА)</span>',
        badge: '👑 ИСТИННЫЙ СИГМА-САМУРАЙ 👑',
        description: 'Ты собрал все 3 ключа, обхитрил девушку и вырвался на свободу! Твоя свобода и чистая душа в безопасности!'
      }
    }
  }
};

class Game {
  constructor() {
    window.gameInstance = this;
    this.state = STATE.MENU;
    this.elapsedTime = 0;
    this.shieldsCollected = 0;
    this.highScore = parseFloat(localStorage.getItem('virginity_record') || '0');
    this.lastShieldRepelTime = 0;
    this.currentMapType = localStorage.getItem('selected_map') || 'crater';

    // Multiplayer State
    this.isMultiplayer = false;
    this.remotePlayers = new Map(); // id -> RemotePlayer
    this.selectedColor = localStorage.getItem('coop_player_color') || '#00f3ff';
    this.reviveProgress = 0;
    this.reviveTarget = null;
    this.chatOpen = false;

    // Co-op Ready & Spectator Mode State
    this.isCoopReady = false;
    this.isSpectating = false;
    this.spectatorTargetId = null;
    this.spectatorIndex = 0;
    this.publicKickInterval = null;
    this.publicKickTimeLeft = 10;

    // Cutscene System
    this.cutsceneManager = new CutsceneManager(this);

    this.container = document.getElementById('game-canvas');
    this.initThree();
    this.initUI();
    this.initGameEntities();
    this.initCustomAssets();
    this.initCoopNetworking();

    this.clock = new THREE.Clock();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  initThree() {
    // Renderer (optimized 1.0 pixel ratio for rock-solid 60fps)
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.0));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.container.appendChild(this.renderer.domElement);

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x06070a);
    this.scene.fog = new THREE.FogExp2(0x06070a, 0.035);

    // Camera (near plane 0.03m prevents near-clipping into first-person body)
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.03, 100);

    // Ambient Lighting
    const hemiLight = new THREE.HemisphereLight(0x445577, 0x111122, 0.6);
    this.scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0x88bbff, 0.4);
    dirLight.position.set(10, 20, 10);
    this.scene.add(dirLight);

    // Resize handler
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  initGameEntities() {
    // Player
    this.player = new Player(this.camera, this.renderer.domElement, this.scene, null);
    this.scene.add(this.player.camera);
    this.isResuming = false;

    // Nextbot Girl
    this.girl = new NextbotGirl(this.scene, null, assetManager.girlTextureUrl);

    // Shield Manager
    this.shieldManager = new ShieldManager(this.scene, null);

    // Escape Goal Manager (3 Keys + Exit Door / Torii Gate)
    this.escapeGoal = new EscapeGoalManager(this.scene, null);

    // Load active map ('crater' or 'maze')
    this.loadMap(this.currentMapType);

    this.escapeGoal.onKeysChange = (collected, total) => {
      if (this.dom && this.dom.hudKeysCount) {
        this.dom.hudKeysCount.textContent = collected;
        this.dom.hudKeysBadge.classList.toggle('ready', collected >= total);
      }
      if (collected >= total) {
        this.showToast('🔓 ВСЕ 3 КЛЮЧА СОБРАНЫ! БЕГИ К ВЫХОДУ НА ВЕРШИНЕ!');
      } else if (collected > 0) {
        this.showToast(`🗝️ ЗОЛОТОЙ КЛЮЧ НАЙДЕН! (${collected}/${total})`);
      }
    };

    this.escapeGoal.onLocalKeyCollected = (keyIndex) => {
      if (this.isMultiplayer) {
        networkManager.sendKeyCollected(keyIndex, networkManager.playerName);
      }
    };

    this.escapeGoal.onLocalDoorReached = () => {
      if (this.isMultiplayer) {
        networkManager.sendDoorEscaped(networkManager.playerName);
      }
    };

    this.escapeGoal.onDoorAttemptLocked = (collected, total) => {
      this.showToast(`🔒 ВЫХОД ЗАПЕРТ: Нужно собрать все 3 ключа! (${collected}/${total})`);
    };

    this.escapeGoal.onToriiCountdown = (sec) => {
      if (this.dom && this.dom.hudToriiCountdown && this.dom.toriiSeconds) {
        this.dom.hudToriiCountdown.classList.remove('hidden');
        this.dom.toriiSeconds.textContent = Math.ceil(sec);
      }
    };

    this.escapeGoal.onEscapeSuccess = () => {
      if (this.dom && this.dom.hudToriiCountdown) {
        this.dom.hudToriiCountdown.classList.add('hidden');
      }
      this.triggerVictory();
    };

    // Player inventory callbacks
    this.player.onInventoryChange = (inv) => {
      this.updateHotbarUI(inv);
    };

    this.player.onItemUsed = (itemType, pos) => {
      if (itemType === 'dakimakura') {
        this.shieldManager.spawnDroppedDecoy(pos, this.girl, 5.0);
        this.showToast('🎎 ТЫ БРОСИЛ ДАКИМАКУРУ! ДЕВУШКА ОТВЛЕКЛАСЬ НА 5 СЕК!');
        if (this.isMultiplayer) {
          networkManager.sendDecoyDropped(pos, 5.0, networkManager.playerName);
        }
      }
    };

    this.player.onPassiveItemClicked = (typeId) => {
      if (typeId === 'd20_dice') {
        const count = this.player.inventory.d20_dice;
        this.showToast(`🎲 D20 Кость (${count} шт.): Спасает от падения в месячные и от удара девушки!`);
      }
    };

    // Volcano Crater Callbacks
    this.player.onMagmaDeath = () => {
      if (this.isMultiplayer) {
        this.player.isDead = true;
        this.player.setDowned(true);
        soundEngine.playMagmaDeath();
        networkManager.sendPlayerEliminated('magma');
        const alive = this.getAliveTeammates();
        if (alive.length > 0) {
          this.startSpectating('magma');
        } else {
          this.triggerGameOver('magma');
        }
      } else {
        this.triggerGameOver('magma');
      }
    };

    this.player.onRocketJump = () => {
      this.showToast('🚀 RTX 5090: РОКЕТ-ДЖАМП!');
    };

    this.player.onDoubleJump = () => {
      this.showToast('⚡ MONSTER ENERGY: ДВОЙНОЙ ПРЫЖОК!');
    };

    this.player.onD20MagmaSave = () => {
      this.showToast('🎲 D20 КОСТЬ: ЧУДО-СПАСЕНИЕ ИЗ МЕСЯЧНЫХ!');
    };

    // Spawn initial positions
    this.resetPositions();

    this.updateMenuTagline(this.currentMapType);
    this.updateArtifactLegends(this.currentMapType);
  }

  loadMap(mapType) {
    if (this.map) {
      if (typeof this.map.destroy === 'function') {
        this.map.destroy();
      } else if (this.map.walls) {
        for (let i = this.scene.children.length - 1; i >= 0; i--) {
          const child = this.scene.children[i];
          const isPlayerMesh = (this.player && this.player.fpBody && this.player.fpBody.lowerBodyGroup === child);
          if (child.isMesh && child !== this.player.camera && child !== this.girl.meshGroup && child !== this.shieldManager.playerAura && !isPlayerMesh) {
            this.scene.remove(child);
          }
        }
      }
    }

    if (mapType === 'crater') {
      this.currentMapType = 'crater';
      this.scene.background = new THREE.Color(0xd00028); // Ярко-красное небо вулкана
      this.scene.fog = new THREE.FogExp2(0x750014, 0.0078); // Плотная алая вулканическая дымка
      this.map = new CraterMap(this.scene);
      this.map.onMagmaRiseStart = () => {
        // Quiet rising without intrusive screen banners
      };
      this.map.onParkourStart = (fromNetwork = false) => {
        if (this.girl) {
          const spawnPos = this.map.getRandomSpawnPoint(this.player.position, 14);
          this.girl.awaken(spawnPos);
        }
        if (!fromNetwork && this.isMultiplayer) {
          networkManager.sendParkourStart();
        }
      };
      soundEngine.setMapMode('crater');
      if (this.dom && this.dom.hudAltitudeBadge) {
        this.dom.hudAltitudeBadge.style.display = 'flex';
      }
    } else {
      this.currentMapType = 'maze';
      this.scene.background = new THREE.Color(0x06070a);
      this.scene.fog = new THREE.FogExp2(0x06070a, 0.035);
      this.map = new GameMap(this.scene);
      soundEngine.setMapMode('maze');
      if (this.dom && this.dom.hudAltitudeBadge) {
        this.dom.hudAltitudeBadge.style.display = 'none';
      }
    }

    if (this.player) {
      this.player.map = this.map;
      if (typeof this.player.setScene === 'function') {
        this.player.setScene(this.scene);
      }
      // Фонарик на карте с вулканом по умолчанию выключен, в лабиринте - включен
      const shouldFlashlightOn = (this.currentMapType !== 'crater');
      this.player.setFlashlightState(shouldFlashlightOn, true);
      if (this.dom && this.dom.flashlightStatus) {
        this.dom.flashlightStatus.textContent = this.player.flashlightOn ? 'ВКЛ' : 'ВЫКЛ';
        this.dom.flashlightStatus.style.color = this.player.flashlightOn ? 'var(--cyan)' : 'var(--text-secondary)';
      }
    }
    if (this.girl) this.girl.map = this.map;
    if (this.shieldManager) this.shieldManager.map = this.map;
    if (this.escapeGoal) this.escapeGoal.map = this.map;
  }

  selectMap(mapType) {
    if (this.currentMapType === mapType) return;
    this.loadMap(mapType);
    localStorage.setItem('selected_map', mapType);

    if (this.dom.tabMapCrater && this.dom.tabMapMaze) {
      this.dom.tabMapCrater.classList.toggle('active', mapType === 'crater');
      this.dom.tabMapMaze.classList.toggle('active', mapType === 'maze');
    }

    this.updateMenuTagline(mapType);
    this.updateArtifactLegends(mapType);

    if (this.isMultiplayer && networkManager.isHost) {
      networkManager.sendMapType(mapType);
    }

    this.resetPositions();
    const mapName = (mapType === 'crater') ? '🌋 Месячный вулкан' : '🏛️ Классический Лабиринт';
    this.showToast(`🗺️ Выбрана карта: ${mapName}`);
  }

  updateMenuTagline(mapType = this.currentMapType) {
    if (!this.dom.menuTagline) return;
    if (this.state === STATE.PAUSED) {
      if (mapType === 'crater') {
        this.dom.menuTagline.innerHTML = '🔥 <strong>Месячные поднимаются</strong> со дна кратера!<br>Прыгай по скалам 3 ярусов, собери <strong>3 ключа</strong> и успей спастись через <strong>Врата Тории</strong> на вершине!';
      } else {
        this.dom.menuTagline.innerHTML = 'Она рыщет по темным коридорам лабиринта...<br>Собери <strong>3 священных ключа</strong> и открой путь на свободу!';
      }
    } else {
      if (mapType === 'crater') {
        this.dom.menuTagline.innerHTML = '🔥 <strong>Месячные поднимаются</strong> со дна кратера!<br>Прыгай по скалам 3 ярусов, собери <strong>3 священных ключа</strong> и спасись через <strong>Врата Тории</strong>!';
      } else {
        this.dom.menuTagline.innerHTML = 'Она рыщет по коридорам... Если догонит — прощай, девственность!<br>Собери <strong>3 священных ключа</strong> и открой путь на свободу!';
      }
    }
  }

  updateArtifactLegends(mapType = this.currentMapType) {
    const isCrater = (mapType === 'crater');
    if (this.dom.legendDescForcefield) {
      this.dom.legendDescForcefield.textContent = isCrater
        ? 'Отбрасывает девушку мощной ударной волной — спасает от сброса в раскаленные месячные!'
        : 'Отталкивает девушку взрывной волной при приближении';
    }
    if (this.dom.legendDescEnergy) {
      this.dom.legendDescEnergy.textContent = isCrater
        ? 'Взрывной спринт и двойной супер-прыжок — позволяет перелетать гигантские разломы между скалами!'
        : 'Ультра-буст скорости и бесконечная выносливость на 5с';
    }
    if (this.dom.legendDescDaki) {
      this.dom.legendDescDaki.textContent = isCrater
        ? 'Задерживает девушку на платформе на 5 сек — даёт время обогнать поднимающиеся месячные!'
        : 'Девушка залипает на аниме-подушку на 5 секунд';
    }
    if (this.dom.legendDescD20) {
      this.dom.legendDescD20.textContent = isCrater
        ? '+1 Жизнь: воскрешает на ближайшей скале при падении в месячные или поимке!'
        : 'Дополнительная жизнь (+1 спасение от девственности)';
    }
  }

  resetPositions(seed = null) {
    if (this.map && typeof this.map.reset === 'function') {
      this.map.reset(seed);
    }

    const playerSpawn = this.map.getRandomSpawnPoint();
    this.player.spawnAt(playerSpawn);

    const girlSpawn = this.map.getRandomSpawnPoint(playerSpawn, 18);
    this.girl.spawn(girlSpawn);
    if (this.currentMapType === 'crater') {
      this.girl.setDormant(true);
      if (this.player) {
        this.player.setFlashlightState(false, true);
      }
    } else {
      this.girl.setDormant(false);
      if (this.player) {
        this.player.setFlashlightState(true, true);
      }
    }
    if (this.dom && this.dom.flashlightStatus) {
      this.dom.flashlightStatus.textContent = this.player.flashlightOn ? 'ВКЛ' : 'ВЫКЛ';
      this.dom.flashlightStatus.style.color = this.player.flashlightOn ? 'var(--cyan)' : 'var(--text-secondary)';
    }

    this.shieldManager.reset(playerSpawn);
    this.escapeGoal.reset();

    if (this.dom && this.dom.hudKeysCount) {
      this.dom.hudKeysCount.textContent = '0';
      this.dom.hudKeysBadge.classList.remove('ready');
    }

    if (this.dom && this.dom.hudMagmaWarning) {
      this.dom.hudMagmaWarning.classList.add('hidden');
    }

    if (this.dom && this.dom.hudToriiCountdown) {
      this.dom.hudToriiCountdown.classList.add('hidden');
    }

    if (this.player.inventory) {
      this.updateHotbarUI(this.player.inventory);
    }
  }

  initUI() {
    const blurActive = () => {
      if (document.activeElement && typeof document.activeElement.blur === 'function') {
        document.activeElement.blur();
      }
    };

    this.dom = {
      hud: document.getElementById('hud'),
      hudTimer: document.getElementById('hud-timer'),
      hudRecord: document.getElementById('hud-record'),
      hudKeysBadge: document.getElementById('hud-keys-badge'),
      hudKeysCount: document.getElementById('hud-keys-count'),
      hudShields: document.getElementById('hud-shields-count'),
      hudLives: document.getElementById('hud-lives-count'),
      staminaFill: document.getElementById('stamina-fill'),
      staminaPercent: document.getElementById('stamina-percent'),
      flashlightStatus: document.getElementById('flashlight-status'),
      activeBuffCard: document.getElementById('active-buff-card'),
      dangerVignette: document.getElementById('danger-vignette'),
      heartIcon: document.getElementById('heart-icon'),
      bpmValue: document.getElementById('bpm-value'),
      bpmStatus: document.getElementById('bpm-status'),
      toastContainer: document.getElementById('toast-container'),

      // Hotbar Inventory Slots
      slotForcefield: document.getElementById('slot-forcefield'),
      slotEnergyDrink: document.getElementById('slot-energy_drink'),
      slotDakimakura: document.getElementById('slot-dakimakura'),
      slotD20Dice: document.getElementById('slot-d20_dice'),
      countForcefield: document.getElementById('count-forcefield'),
      countEnergyDrink: document.getElementById('count-energy_drink'),
      countDakimakura: document.getElementById('count-dakimakura'),
      countD20Dice: document.getElementById('count-d20_dice'),

      // Music Audio
      nextbotAudio: document.getElementById('nextbot-audio'),
      victoryAudio: document.getElementById('victory-audio'),
      musicInput: document.getElementById('file-music-input'),
      musicTrackName: document.getElementById('music-track-name'),

      menuOverlay: document.getElementById('menu-overlay'),
      menuTitle: document.getElementById('menu-title'),
      menuSubtitle: document.getElementById('menu-subtitle'),
      menuTagline: document.getElementById('menu-tagline'),
      legendNameForcefield: document.getElementById('legend-name-forcefield'),
      legendDescForcefield: document.getElementById('legend-desc-forcefield'),
      legendNameEnergy: document.getElementById('legend-name-energy_drink'),
      legendDescEnergy: document.getElementById('legend-desc-energy_drink'),
      legendNameDaki: document.getElementById('legend-name-dakimakura'),
      legendDescDaki: document.getElementById('legend-desc-dakimakura'),
      legendNameD20: document.getElementById('legend-name-d20_dice'),
      legendDescD20: document.getElementById('legend-desc-d20_dice'),
      btnStart: document.getElementById('btn-start-game'),
      btnResume: document.getElementById('btn-resume-game'),
      pauseSecondaryGrid: document.getElementById('pause-secondary-grid'),
      btnRestartPause: document.getElementById('btn-restart-from-pause'),
      btnLeaveRoom: document.getElementById('btn-leave-coop-room'),
      btnOpenSettings: document.getElementById('btn-open-settings'),

      settingsModal: document.getElementById('settings-modal'),
      btnCloseSettings: document.getElementById('btn-close-settings'),
      btnSaveSettings: document.getElementById('btn-save-settings'),
      btnAuthorPreset: document.getElementById('btn-author-preset'),
      btnResetAssets: document.getElementById('btn-reset-assets'),
      girlInput: document.getElementById('file-girl-input'),
      videoInput: document.getElementById('file-video-input'),
      fileVictoryVideoInput: document.getElementById('file-victory-video-input'),
      fileVictoryMusicInput: document.getElementById('file-victory-music-input'),
      girlPreview: document.getElementById('girl-preview-img'),
      videoPreview: document.getElementById('video-preview-player'),
      victoryVideoPreview: document.getElementById('victory-video-preview'),
      victoryMusicName: document.getElementById('victory-music-name'),
      sensSlider: document.getElementById('mouse-sens-slider'),
      sensDisplay: document.getElementById('sens-val-display'),
      volSlider: document.getElementById('volume-slider'),
      volDisplay: document.getElementById('vol-val-display'),

      gameOverModal: document.getElementById('game-over-modal'),
      gameOverVideo: document.getElementById('game-over-video'),
      gameOverFallback: document.getElementById('game-over-fallback'),
      btnToggleSound: document.getElementById('btn-toggle-video-sound'),
      goTime: document.getElementById('go-time'),
      goShields: document.getElementById('go-shields'),
      goRecord: document.getElementById('go-record'),
      btnRestart: document.getElementById('btn-restart-game'),
      btnGoMenu: document.getElementById('btn-go-to-menu'),
      btnGoSettings: document.getElementById('btn-go-settings'),

      // Victory Modal
      victoryModal: document.getElementById('victory-modal'),
      victoryVideo: document.getElementById('victory-video'),
      victoryFallback: document.getElementById('victory-fallback'),
      btnToggleVictorySound: document.getElementById('btn-toggle-victory-sound'),
      btnVictoryRestart: document.getElementById('btn-victory-restart'),
      btnVictoryMenu: document.getElementById('btn-victory-to-menu'),
      btnVictorySettings: document.getElementById('btn-victory-settings'),
      vicTime: document.getElementById('vic-time'),
      vicKeys: document.getElementById('vic-keys'),
      vicShields: document.getElementById('vic-shields'),

      // Co-op Multiplayer UI
      btnOpenCoop: document.getElementById('btn-open-coop'),
      coopModal: document.getElementById('coop-modal'),
      btnCloseCoop: document.getElementById('btn-close-coop'),
      coopNameInput: document.getElementById('coop-name-input'),
      colorPickerRow: document.getElementById('color-picker-row'),
      coopConnectView: document.getElementById('coop-connect-view'),
      coopRoomView: document.getElementById('coop-room-view'),
      btnCoopQuick: document.getElementById('btn-coop-quick'),
      btnCoopCreate: document.getElementById('btn-coop-create'),
      coopRoomCodeInput: document.getElementById('coop-room-code-input'),
      btnCoopJoin: document.getElementById('btn-coop-join'),
      coopDisplayRoom: document.getElementById('coop-display-room'),
      btnCopyRoomCode: document.getElementById('btn-copy-room-code'),
      coopPlayersCount: document.getElementById('coop-players-count'),
      coopPlayerList: document.getElementById('coop-player-list'),
      btnCoopLeave: document.getElementById('btn-coop-leave'),
      btnCoopStartGame: document.getElementById('btn-coop-start-game'),
      btnCoopReady: document.getElementById('btn-coop-ready'),
      coopWaitingHostNotice: document.getElementById('coop-waiting-host-notice'),
      coopPublicTimerBanner: document.getElementById('coop-public-timer-banner'),
      coopKickSeconds: document.getElementById('coop-kick-seconds'),
      goCoopRestartNotice: document.getElementById('go-coop-restart-notice'),
      vicCoopRestartNotice: document.getElementById('vic-coop-restart-notice'),
      vicTitle: document.getElementById('vic-title'),
      vicBadge: document.getElementById('vic-badge'),
      vicDesc: document.getElementById('vic-desc'),

      // Spectator Mode HUD
      spectatorHud: document.getElementById('spectator-hud'),
      spectatorTargetName: document.getElementById('spectator-target-name'),
      btnSpectatorPrev: document.getElementById('btn-spectator-prev'),
      btnSpectatorNext: document.getElementById('btn-spectator-next'),

      // In-game Co-op HUD
      hudCoopSquad: document.getElementById('hud-coop-squad'),
      squadList: document.getElementById('squad-list'),
      hudRevivePrompt: document.getElementById('hud-revive-prompt'),
      reviveRingFill: document.getElementById('revive-ring-fill'),
      reviveTargetName: document.getElementById('revive-target-name'),
      hudDownedBanner: document.getElementById('hud-downed-banner'),
      downedTimerNum: document.getElementById('downed-timer-num'),
      hudChatBox: document.getElementById('hud-chat-box'),
      chatLogs: document.getElementById('chat-logs'),
      chatForm: document.getElementById('chat-form'),
      chatInput: document.getElementById('chat-input'),

      // Map Selection & Volcano HUD
      tabMapCrater: document.getElementById('tab-map-crater'),
      tabMapMaze: document.getElementById('tab-map-maze'),
      mapSelectionSection: document.getElementById('map-selection-section'),
      hudToriiCountdown: document.getElementById('hud-torii-countdown'),
      toriiSeconds: document.getElementById('torii-seconds'),
      hudMagmaWarning: document.getElementById('hud-magma-warning'),
      hudAltitudeBadge: document.getElementById('hud-altitude-badge'),
      hudAltitudeValue: document.getElementById('hud-altitude-value'),
      goTitle: document.getElementById('go-title') || document.querySelector('#game-over-modal .game-over-title'),
      goSubtitle: document.getElementById('go-subtitle')
    };

    this.hasValidVideo = false;
    this.hasValidVictoryVideo = false;
    this.updateRecordDisplay();

    // Sync initial map tab UI state
    if (this.dom.tabMapCrater && this.dom.tabMapMaze) {
      this.dom.tabMapCrater.classList.toggle('active', this.currentMapType === 'crater');
      this.dom.tabMapMaze.classList.toggle('active', this.currentMapType === 'maze');
    }

    // Map Selection Tab Handlers
    if (this.dom.tabMapCrater) {
      this.dom.tabMapCrater.addEventListener('click', () => {
        blurActive();
        this.selectMap('crater');
      });
    }
    if (this.dom.tabMapMaze) {
      this.dom.tabMapMaze.addEventListener('click', () => {
        blurActive();
        this.selectMap('maze');
      });
    }

    // Start Button (First launch)
    this.dom.btnStart.addEventListener('click', () => {
      blurActive();
      soundEngine.init();
      soundEngine.resume();
      this.startGame(false);
    });

    // Resume Button (from Pause)
    if (this.dom.btnResume) {
      const handleResume = (e) => {
        if (e) {
          e.preventDefault();
          e.stopPropagation();
        }
        blurActive();
        this.resumeGame();
      };
      this.dom.btnResume.addEventListener('click', handleResume);
      this.dom.btnResume.addEventListener('pointerdown', handleResume);
    }

    // Restart Button from Pause menu
    if (this.dom.btnRestartPause) {
      this.dom.btnRestartPause.addEventListener('click', () => {
        blurActive();
        soundEngine.init();
        soundEngine.resume();
        this.startGame(true);
      });
    }

    // Leave Room Button from Pause menu in Multiplayer
    if (this.dom.btnLeaveRoom) {
      this.dom.btnLeaveRoom.addEventListener('click', () => {
        blurActive();
        this.returnToMainMenu();
      });
    }

    // Restart Button on Game Over
    this.dom.btnRestart.addEventListener('click', () => {
      blurActive();
      soundEngine.init();
      soundEngine.resume();
      this.dom.gameOverModal.classList.add('hidden');
      this.dom.gameOverVideo.pause();
      if (this.isMultiplayer) {
        networkManager.sendRestartGame();
      } else {
        this.startGame(true);
      }
    });

    // Exit to Main Menu from Game Over
    if (this.dom.btnGoMenu) {
      this.dom.btnGoMenu.addEventListener('click', () => {
        blurActive();
        this.returnToMainMenu();
      });
    }

    // Restart Button on Victory
    if (this.dom.btnVictoryRestart) {
      this.dom.btnVictoryRestart.addEventListener('click', () => {
        blurActive();
        soundEngine.init();
        soundEngine.resume();
        this.dom.victoryModal.classList.add('hidden');
        this.dom.victoryVideo.pause();
        if (this.dom.victoryAudio) this.dom.victoryAudio.pause();
        if (this.isMultiplayer) {
          networkManager.sendRestartGame();
        } else {
          this.startGame(true);
        }
      });
    }

    // Exit to Main Menu from Victory
    if (this.dom.btnVictoryMenu) {
      this.dom.btnVictoryMenu.addEventListener('click', () => {
        blurActive();
        this.returnToMainMenu();
      });
    }

    if (this.dom.btnVictorySettings) {
      this.dom.btnVictorySettings.addEventListener('click', () => {
        blurActive();
        this.dom.settingsModal.classList.remove('hidden');
      });
    }

    // Settings Buttons
    this.dom.btnOpenSettings.addEventListener('click', () => {
      blurActive();
      this.dom.settingsModal.classList.remove('hidden');
    });

    this.dom.btnGoSettings.addEventListener('click', () => {
      blurActive();
      this.dom.settingsModal.classList.remove('hidden');
    });

    this.dom.btnCloseSettings.addEventListener('click', () => {
      blurActive();
      this.dom.settingsModal.classList.add('hidden');
    });

    this.dom.btnSaveSettings.addEventListener('click', () => {
      blurActive();
      this.dom.settingsModal.classList.add('hidden');
    });

    // Sensitivity Slider
    this.dom.sensSlider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      this.dom.sensDisplay.textContent = `${val.toFixed(1)}x`;
      if (this.player) {
        this.player.mouseSensitivity = 0.0022 * val;
      }
    });

    // Volume Slider
    this.dom.volSlider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      this.dom.volDisplay.textContent = `${Math.round(val * 100)}%`;
      soundEngine.setVolume(val);
      this.dom.gameOverVideo.volume = val;
      if (this.dom.victoryVideo) this.dom.victoryVideo.volume = val;
      if (this.dom.victoryAudio) this.dom.victoryAudio.volume = val;
    });

    // Hotbar Slot Click Handlers
    this.dom.slotForcefield.addEventListener('click', () => {
      blurActive();
      if (this.player && this.player.useItem('forcefield')) {
        this.showToast('🛡️ СИЛОВОЕ ПОЛЕ АКТИВИРОВАНО!');
      }
    });
    this.dom.slotEnergyDrink.addEventListener('click', () => {
      blurActive();
      if (this.player && this.player.useItem('energy_drink')) {
        this.showToast('⚡ МОНСТР ЭНЕРДЖИ: ТУРБО-БЕГ АКТИВЕН!');
      }
    });
    this.dom.slotDakimakura.addEventListener('click', () => {
      blurActive();
      if (this.player) this.player.useItem('dakimakura');
    });
    this.dom.slotD20Dice.addEventListener('click', () => {
      blurActive();
      if (this.player) this.player.useItem('d20_dice');
    });

    // Pointer Lock change listener to handle Escape / Unlocking
    document.addEventListener('pointerlockchange', () => {
      const isLocked = (document.pointerLockElement === this.renderer.domElement);
      if (!isLocked) {
        if (this.isResuming) return; // Prevent immediate re-pausing when resuming!
        if (this.chatOpen) return;
        if (this.dom.settingsModal && !this.dom.settingsModal.classList.contains('hidden')) return;
        if (this.dom.coopModal && !this.dom.coopModal.classList.contains('hidden')) return;
        // Only trigger pause if player was previously locked and actively playing
        if (this.state === STATE.PLAYING && this.player && this.player.wasPointerLocked) {
          this.pauseGame();
        }
      }
    });

    // Keyboard Hotkeys
    window.addEventListener('keydown', (e) => {
      if (this.isSpectating) {
        if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
          this.cycleSpectatorTarget(-1);
          return;
        } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
          this.cycleSpectatorTarget(1);
          return;
        }
      }

      if (e.code === 'Escape') {
        if (this.chatOpen) {
          this.closeChat();
          return;
        }
        if (this.dom.settingsModal && !this.dom.settingsModal.classList.contains('hidden')) {
          this.dom.settingsModal.classList.add('hidden');
          return;
        }
        if (this.dom.coopModal && !this.dom.coopModal.classList.contains('hidden')) {
          this.dom.coopModal.classList.add('hidden');
          return;
        }
        if (this.state === STATE.PAUSED) {
          this.resumeGame();
        } else if (this.state === STATE.PLAYING) {
          this.pauseGame();
        }
      }
      if (e.code === 'KeyR') {
        // Non-hosts in private co-op cannot restart
        if (this.isMultiplayer && !networkManager.isHost && !networkManager.isPublic && networkManager.roomId !== 'PUBLIC') {
          return;
        }
        if (this.state === STATE.GAMEOVER) {
          this.dom.btnRestart.click();
        } else if (this.state === STATE.VICTORY && this.dom.btnVictoryRestart) {
          this.dom.btnVictoryRestart.click();
        }
      }
    });

    // Spectator Switch Buttons
    if (this.dom.btnSpectatorPrev) {
      this.dom.btnSpectatorPrev.addEventListener('click', (e) => {
        blurActive();
        e.stopPropagation();
        this.cycleSpectatorTarget(-1);
      });
    }
    if (this.dom.btnSpectatorNext) {
      this.dom.btnSpectatorNext.addEventListener('click', (e) => {
        blurActive();
        e.stopPropagation();
        this.cycleSpectatorTarget(1);
      });
    }

    // Spectator Mouse Click Cycling (LMB = next, RMB = prev)
    window.addEventListener('mousedown', (e) => {
      if (this.isSpectating) {
        if (e.button === 0) {
          this.cycleSpectatorTarget(1);
        } else if (e.button === 2) {
          this.cycleSpectatorTarget(-1);
        }
      }
    });

    window.addEventListener('contextmenu', (e) => {
      if (this.isSpectating) {
        e.preventDefault();
      }
    });
  }

  updateHotbarUI(inv) {
    if (!this.dom || !this.dom.countForcefield || !inv) return;

    this.dom.countForcefield.textContent = inv.forcefield || 0;
    this.dom.slotForcefield.classList.toggle('has-items', (inv.forcefield || 0) > 0);

    this.dom.countEnergyDrink.textContent = inv.energy_drink || 0;
    this.dom.slotEnergyDrink.classList.toggle('has-items', (inv.energy_drink || 0) > 0);

    this.dom.countDakimakura.textContent = inv.dakimakura || 0;
    this.dom.slotDakimakura.classList.toggle('has-items', (inv.dakimakura || 0) > 0);

    // FIXED: Only display actual inv.d20_dice count without duplicating extraLives
    const d20Total = inv.d20_dice || 0;
    this.dom.countD20Dice.textContent = d20Total;
    this.dom.slotD20Dice.classList.toggle('has-items', d20Total > 0);
  }

  initCustomAssets() {
    // Check if default assets/game_over.mp4 exists on server
    fetch('./assets/game_over.mp4', { method: 'HEAD' })
      .then((res) => {
        if (res.ok) {
          this.hasValidVideo = true;
          this.dom.gameOverVideo.src = './assets/game_over.mp4';
          this.dom.gameOverVideo.load();
        } else {
          this.hasValidVideo = false;
        }
      })
      .catch(() => {
        this.hasValidVideo = false;
      });

    // Configure Nextbot audio element in sound engine
    soundEngine.setCustomAudioElement(this.dom.nextbotAudio);

    // Check if default assets/girl_music.mp3 exists on server
    fetch('./assets/girl_music.mp3', { method: 'HEAD' })
      .then((res) => {
        if (res.ok) {
          this.dom.nextbotAudio.src = './assets/girl_music.mp3';
          soundEngine.setHasCustomMusic(true);
          if (this.dom.musicTrackName) {
            this.dom.musicTrackName.textContent = '🎵 Трек: assets/girl_music.mp3';
          }
        } else {
          soundEngine.setHasCustomMusic(false);
        }
      })
      .catch(() => {
        soundEngine.setHasCustomMusic(false);
      });

    // Girl Image Customizer
    this.dom.girlInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        assetManager.setCustomGirl(file);
        this.dom.girlPreview.src = assetManager.girlTextureUrl;
        this.girl.updateTexture(assetManager.girlTextureUrl);
        this.showToast('✅ Фото девушки успешно обновлено!');
      }
    });

    // Video Customizer
    this.dom.videoInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        assetManager.setCustomVideo(file);
        this.hasValidVideo = true;

        // Preview in settings modal
        this.dom.videoPreview.src = assetManager.gameOverVideoUrl;
        this.dom.videoPreview.load();
        this.dom.videoPreview.play().catch(() => {});

        // Prepare the actual game-over video element
        this.dom.gameOverVideo.src = assetManager.gameOverVideoUrl;
        this.dom.gameOverVideo.load();
        this.dom.gameOverVideo.style.display = 'block';
        this.dom.gameOverFallback.style.display = 'none';

        this.showToast('✅ MP4 видео проигрыша успешно обновлено!');
      }
    });

    // Custom Chase Music Input
    if (this.dom.musicInput) {
      this.dom.musicInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          assetManager.setCustomMusic(file);
          this.dom.nextbotAudio.src = assetManager.girlMusicUrl;
          this.dom.nextbotAudio.load();
          soundEngine.setHasCustomMusic(true);
          if (this.dom.musicTrackName) {
            this.dom.musicTrackName.textContent = `🎵 Выбран трек: ${file.name}`;
          }
          this.showToast(`🎵 Музыка девушки установлена: ${file.name}`);
        }
      });
    }

    // Victory Video Customizer
    if (this.dom.fileVictoryVideoInput) {
      this.dom.fileVictoryVideoInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          assetManager.setCustomVictoryVideo(file);
          this.hasValidVictoryVideo = true;

          // Preview in settings modal
          if (this.dom.victoryVideoPreview) {
            this.dom.victoryVideoPreview.src = assetManager.victoryVideoUrl;
            this.dom.victoryVideoPreview.load();
            this.dom.victoryVideoPreview.play().catch(() => {});
          }

          // Prepare the victory video element
          this.dom.victoryVideo.src = assetManager.victoryVideoUrl;
          this.dom.victoryVideo.load();
          this.dom.victoryVideo.style.display = 'block';
          this.dom.victoryFallback.style.display = 'none';

          this.showToast('✅ MP4 видео победы успешно обновлено!');
        }
      });
    }

    // Victory Music Customizer
    if (this.dom.fileVictoryMusicInput) {
      this.dom.fileVictoryMusicInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          assetManager.setCustomVictoryMusic(file);
          if (this.dom.victoryAudio) {
            this.dom.victoryAudio.src = assetManager.victoryMusicUrl;
            this.dom.victoryAudio.load();
          }
          if (this.dom.victoryMusicName) {
            this.dom.victoryMusicName.textContent = `🎺 Выбран трек: ${file.name}`;
          }
          this.showToast(`🎺 Музыка победы установлена: ${file.name}`);
        }
      });
    }

    // Sound toggle button on Game Over screen
    if (this.dom.btnToggleSound) {
      this.dom.btnToggleSound.addEventListener('click', () => {
        if (this.dom.gameOverVideo.muted) {
          this.dom.gameOverVideo.muted = false;
          this.dom.gameOverVideo.volume = soundEngine.volume;
          this.dom.btnToggleSound.textContent = '🔊 Звук: ВКЛ';
        } else {
          this.dom.gameOverVideo.muted = true;
          this.dom.btnToggleSound.textContent = '🔇 Звук: ВЫКЛ';
        }
      });
    }

    // Sound toggle button on Victory screen
    if (this.dom.btnToggleVictorySound) {
      this.dom.btnToggleVictorySound.addEventListener('click', () => {
        if (this.dom.victoryVideo.muted) {
          this.dom.victoryVideo.muted = false;
          this.dom.victoryVideo.volume = soundEngine.volume;
          this.dom.btnToggleVictorySound.textContent = '🔊 Звук: ВКЛ';
        } else {
          this.dom.victoryVideo.muted = true;
          this.dom.btnToggleVictorySound.textContent = '🔇 Звук: ВЫКЛ';
        }
      });
    }

    // Apply Author Preset from assets/author/ folder
    if (this.dom.btnAuthorPreset) {
      this.dom.btnAuthorPreset.addEventListener('click', () => {
        assetManager.setAuthorPreset();

        // 1. Girl Texture
        this.dom.girlPreview.src = assetManager.girlTextureUrl;
        this.girl.updateTexture(assetManager.girlTextureUrl);

        // 2. Game Over Video
        this.hasValidVideo = true;
        this.dom.videoPreview.src = assetManager.gameOverVideoUrl;
        this.dom.videoPreview.load();
        this.dom.gameOverVideo.src = assetManager.gameOverVideoUrl;
        this.dom.gameOverVideo.load();
        this.dom.gameOverVideo.style.display = 'block';
        this.dom.gameOverFallback.style.display = 'none';

        // 3. Victory Video
        this.hasValidVictoryVideo = true;
        if (this.dom.victoryVideoPreview) {
          this.dom.victoryVideoPreview.src = assetManager.victoryVideoUrl;
          this.dom.victoryVideoPreview.load();
        }
        if (this.dom.victoryVideo) {
          this.dom.victoryVideo.src = assetManager.victoryVideoUrl;
          this.dom.victoryVideo.load();
          this.dom.victoryVideo.style.display = 'block';
        }
        if (this.dom.victoryFallback) {
          this.dom.victoryFallback.style.display = 'none';
        }

        // 4. Chase Music
        this.dom.nextbotAudio.src = assetManager.girlMusicUrl;
        this.dom.nextbotAudio.load();
        soundEngine.setHasCustomMusic(true);
        if (this.dom.musicTrackName) {
          this.dom.musicTrackName.textContent = '🎵 Авторский трек: assets/author/girl_music.mp3';
        }

        this.showToast('⭐ Авторские настройки применены (папка assets/author/)!');
      });
    }

    // Reset Defaults
    this.dom.btnResetAssets.addEventListener('click', () => {
      assetManager.resetDefaults();
      this.dom.girlPreview.src = assetManager.girlTextureUrl;
      this.girl.updateTexture(assetManager.girlTextureUrl);
      this.dom.videoPreview.src = '';
      this.hasValidVideo = false;
      this.dom.gameOverVideo.src = '';
      this.dom.gameOverVideo.style.display = 'none';
      this.dom.gameOverFallback.style.display = 'block';

      this.hasValidVictoryVideo = false;
      if (this.dom.victoryVideo) {
        this.dom.victoryVideo.src = '';
        this.dom.victoryVideo.style.display = 'none';
      }
      if (this.dom.victoryFallback) {
        this.dom.victoryFallback.style.display = 'flex';
      }
      if (this.dom.victoryVideoPreview) {
        this.dom.victoryVideoPreview.src = '';
      }
      if (this.dom.victoryAudio) {
        this.dom.victoryAudio.src = '';
      }

      this.dom.nextbotAudio.src = '';
      soundEngine.setHasCustomMusic(false);
      if (this.dom.musicTrackName) {
        this.dom.musicTrackName.innerHTML = 'Загрузи свой MP3/WAV трек или положи в <code>assets/girl_music.mp3</code>';
      }
      if (this.dom.btnToggleSound) this.dom.btnToggleSound.style.display = 'none';
      if (this.dom.btnToggleVictorySound) this.dom.btnToggleVictorySound.style.display = 'none';
      this.showToast('Сброшено на стандартные ассеты');
    });

    // Check if default assets/victory.mp4 exists on server
    fetch('./assets/victory.mp4', { method: 'HEAD' })
      .then((res) => {
        if (res.ok) {
          this.hasValidVictoryVideo = true;
          this.dom.victoryVideo.src = './assets/victory.mp4';
          this.dom.victoryVideo.load();
        } else {
          this.hasValidVictoryVideo = false;
        }
      })
      .catch(() => {
        this.hasValidVictoryVideo = false;
      });

    // Check if default assets/victory_music.mp3 exists on server
    fetch('./assets/victory_music.mp3', { method: 'HEAD' })
      .then((res) => {
        if (res.ok && this.dom.victoryAudio) {
          this.dom.victoryAudio.src = './assets/victory_music.mp3';
          if (this.dom.victoryMusicName) {
            this.dom.victoryMusicName.textContent = '🎺 Трек: assets/victory_music.mp3';
          }
        }
      })
      .catch(() => {});

    // Listen to video loading errors/readiness
    this.dom.gameOverVideo.addEventListener('loadeddata', () => {
      this.hasValidVideo = true;
    });

    this.dom.gameOverVideo.addEventListener('error', () => {
      if (!assetManager.hasCustomVideo) {
        this.hasValidVideo = false;
        this.dom.gameOverVideo.style.display = 'none';
        this.dom.gameOverFallback.style.display = 'block';
      }
    });

    if (this.dom.victoryVideo) {
      this.dom.victoryVideo.addEventListener('loadeddata', () => {
        this.hasValidVictoryVideo = true;
      });

      this.dom.victoryVideo.addEventListener('error', () => {
        if (!assetManager.hasCustomVictoryVideo) {
          this.hasValidVictoryVideo = false;
          this.dom.victoryVideo.style.display = 'none';
          this.dom.victoryFallback.style.display = 'flex';
        }
      });
    }
  }

  showToast(message) {
    if (!this.dom || !this.dom.toastContainer) return;

    // Deduplicate: Don't show again if identical message is already the latest toast
    const lastToast = this.dom.toastContainer.lastElementChild;
    if (lastToast && lastToast.textContent === message) {
      return;
    }

    // Limit to max 2 toasts so the screen never gets blocked by popups!
    while (this.dom.toastContainer.children.length >= 2) {
      this.dom.toastContainer.firstElementChild.remove();
    }

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    this.dom.toastContainer.appendChild(toast);

    setTimeout(() => {
      if (toast.parentNode) {
        toast.remove();
      }
    }, 2400);
  }

  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(2, '0')}`;
  }

  updateRecordDisplay() {
    this.dom.hudRecord.textContent = `🏆 РЕКОРД: ${this.formatTime(this.highScore)}`;
  }

  startGame(isRestart = false) {
    this.isMultiplayer = false;
    if (networkManager.isConnected) {
      networkManager.disconnect();
    }
    for (const rp of this.remotePlayers.values()) {
      rp.destroy();
    }
    this.remotePlayers.clear();
    if (this.dom.hudCoopSquad) {
      this.dom.hudCoopSquad.classList.add('hidden');
    }
    if (this.dom.hudDownedBanner) {
      this.dom.hudDownedBanner.classList.add('hidden');
    }
    if (this.dom.hudRevivePrompt) {
      this.dom.hudRevivePrompt.classList.add('hidden');
    }

    this.elapsedTime = 0;
    this.resetPositions();

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('pitch')) {
      const p = parseFloat(urlParams.get('pitch'));
      if (!isNaN(p)) this.player.pitch = p;
    }

    this.dom.menuOverlay.classList.add('hidden');
    this.dom.gameOverModal.classList.add('hidden');
    if (this.dom.victoryModal) this.dom.victoryModal.classList.add('hidden');

    if (this.dom.mapSelectionSection) this.dom.mapSelectionSection.style.display = 'none';
    if (this.dom.hudToriiCountdown) this.dom.hudToriiCountdown.classList.add('hidden');
    if (this.dom.hudMagmaWarning) this.dom.hudMagmaWarning.classList.add('hidden');

    if (this.dom.btnResume) this.dom.btnResume.style.display = 'none';
    if (this.dom.pauseSecondaryGrid) this.dom.pauseSecondaryGrid.style.display = 'none';
    if (this.dom.btnRestartPause) this.dom.btnRestartPause.style.display = 'none';
    if (this.dom.btnLeaveRoom) this.dom.btnLeaveRoom.style.display = 'none';
    const modeSelect = document.getElementById('main-mode-select');
    if (modeSelect) modeSelect.style.display = 'grid';

    this.dom.gameOverVideo.pause();
    if (this.dom.victoryVideo) this.dom.victoryVideo.pause();
    if (this.dom.victoryAudio) this.dom.victoryAudio.pause();

    soundEngine.init();
    soundEngine.resume();
    soundEngine.stopHeartbeat();
    soundEngine.resetChaseMusic();

    // 🎬 Проверка необходимости запуска сюжетной катсцены
    if (this.cutsceneManager && this.cutsceneManager.shouldPlayCutscene(this.currentMapType, isRestart)) {
      this.state = STATE.CUTSCENE;
      this.dom.hud.classList.add('hidden');
      const crosshair = document.getElementById('crosshair');
      if (crosshair) crosshair.classList.add('hidden');

      this.cutsceneManager.play(this.currentMapType, () => {
        this.startActualGameplay();
      });
    } else {
      this.startActualGameplay();
    }
  }

  // Запуск непосредственного геймплея после катсцены или пропуска
  startActualGameplay() {
    this.state = STATE.PLAYING;
    this.dom.hud.classList.remove('hidden');
    const crosshair = document.getElementById('crosshair');
    if (crosshair) crosshair.classList.remove('hidden');

    if (soundEngine.hasCustomMusic && this.dom.nextbotAudio.src) {
      this.dom.nextbotAudio.currentTime = 0;
      this.dom.nextbotAudio.play().catch(() => {});
    }

    this.renderer.domElement.requestPointerLock();
    const startMsg = (this.currentMapType === 'crater')
      ? '🌋 МЕСЯЧНЫЙ ВУЛКАН! СОБЕРИ 3 КЛЮЧА И ДОБЕРИСЬ ДО ВРАТ ТОРИИ!'
      : '🏃 БЕГИ! СОБЕРИ 3 КЛЮЧА И НАЙДИ ВЫХОД!';
    this.showToast(startMsg);
  }

  pauseGame() {
    this.state = STATE.PAUSED;
    if (this.dom.menuTitle) this.dom.menuTitle.textContent = 'ПАУЗА';

    if (this.currentMapType === 'crater') {
      if (this.dom.menuSubtitle) {
        this.dom.menuSubtitle.textContent = this.isMultiplayer
          ? '🌋 МЕСЯЧНЫЙ ВУЛКАН • МЕНЮ КООПЕРАТИВА'
          : '🌋 МЕСЯЧНЫЙ ВУЛКАН • ИГРА ПРИОСТАНОВЛЕНА';
      }
    } else {
      if (this.dom.menuSubtitle) {
        this.dom.menuSubtitle.textContent = this.isMultiplayer
          ? '🏛️ ЛАБИРИНТ • МЕНЮ КООПЕРАТИВА'
          : '🏛️ ЛАБИРИНТ • ИГРА ПРИОСТАНОВЛЕНА';
      }
    }
    this.updateMenuTagline(this.currentMapType);
    this.updateArtifactLegends(this.currentMapType);

    if (this.dom.btnResume) this.dom.btnResume.style.display = 'block';
    if (this.dom.pauseSecondaryGrid) this.dom.pauseSecondaryGrid.style.display = 'grid';

    const modeSelect = document.getElementById('main-mode-select');
    if (modeSelect) modeSelect.style.display = 'none';
    if (this.dom.mapSelectionSection) this.dom.mapSelectionSection.style.display = 'none';

    if (this.dom.btnRestartPause) {
      this.dom.btnRestartPause.style.display = this.isMultiplayer ? 'none' : 'block';
    }
    if (this.dom.btnLeaveRoom) {
      this.dom.btnLeaveRoom.style.display = 'block';
      this.dom.btnLeaveRoom.textContent = this.isMultiplayer ? '🚪 ВЫЙТИ ИЗ КОМНАТЫ' : '🏠 В ГЛАВНОЕ МЕНЮ';
    }

    this.dom.menuOverlay.classList.remove('hidden');

    if (!this.isMultiplayer) {
      if (this.dom.nextbotAudio) {
        this.dom.nextbotAudio.pause();
      }
      soundEngine.stopHeartbeat();
      soundEngine.stopProceduralChaseLoop();
    }
  }

  resumeGame() {
    this.state = STATE.PLAYING;
    this.isResuming = true;
    setTimeout(() => {
      this.isResuming = false;
    }, 700);

    this.dom.menuOverlay.classList.add('hidden');
    if (this.dom.btnResume) this.dom.btnResume.style.display = 'none';
    if (this.dom.pauseSecondaryGrid) this.dom.pauseSecondaryGrid.style.display = 'none';
    if (this.dom.btnRestartPause) this.dom.btnRestartPause.style.display = 'none';
    if (this.dom.btnLeaveRoom) this.dom.btnLeaveRoom.style.display = 'none';

    if (soundEngine.hasCustomMusic && this.dom.nextbotAudio.src) {
      this.dom.nextbotAudio.play().catch(() => {});
    }

    try {
      const lockPromise = this.renderer.domElement.requestPointerLock();
      if (lockPromise && typeof lockPromise.catch === 'function') {
        lockPromise.catch(() => {});
      }
    } catch (e) {}
  }

  returnToMainMenu() {
    this.stopSpectating();
    this.clearPublicKickTimer();
    this.isCoopReady = false;
    this.updateReadyButtonUI();

    if (this.cutsceneManager) {
      this.cutsceneManager.stopCurrent();
    }
    this.isMultiplayer = false;
    if (networkManager.isConnected) {
      networkManager.disconnect();
    }
    for (const rp of this.remotePlayers.values()) {
      rp.destroy();
    }
    this.remotePlayers.clear();

    this.state = STATE.MENU;
    if (this.dom.menuTitle) this.dom.menuTitle.textContent = 'ESCAPE FROM GIRLS';
    if (this.dom.menuSubtitle) this.dom.menuSubtitle.textContent = 'СОХРАНИ СВОЮ ДЕВСТВЕННОСТЬ';
    this.updateMenuTagline(this.currentMapType);
    this.updateArtifactLegends(this.currentMapType);
    if (this.dom.btnResume) this.dom.btnResume.style.display = 'none';
    if (this.dom.pauseSecondaryGrid) this.dom.pauseSecondaryGrid.style.display = 'none';
    if (this.dom.btnRestartPause) this.dom.btnRestartPause.style.display = 'none';
    if (this.dom.btnLeaveRoom) this.dom.btnLeaveRoom.style.display = 'none';

    const modeSelect = document.getElementById('main-mode-select');
    if (modeSelect) modeSelect.style.display = 'grid';
    if (this.dom.mapSelectionSection) this.dom.mapSelectionSection.style.display = 'flex';

    this.dom.menuOverlay.classList.remove('hidden');
    this.dom.hud.classList.add('hidden');
    if (this.dom.gameOverModal) this.dom.gameOverModal.classList.add('hidden');
    if (this.dom.victoryModal) this.dom.victoryModal.classList.add('hidden');
    if (this.dom.gameOverVideo) this.dom.gameOverVideo.pause();
    if (this.dom.victoryVideo) this.dom.victoryVideo.pause();
    if (this.dom.victoryAudio) this.dom.victoryAudio.pause();
    if (this.dom.hudCoopSquad) this.dom.hudCoopSquad.classList.add('hidden');
    if (this.dom.hudDownedBanner) this.dom.hudDownedBanner.classList.add('hidden');
    if (this.dom.hudRevivePrompt) this.dom.hudRevivePrompt.classList.add('hidden');
    if (this.dom.hudToriiCountdown) this.dom.hudToriiCountdown.classList.add('hidden');
    if (this.dom.hudMagmaWarning) this.dom.hudMagmaWarning.classList.add('hidden');
    if (this.dom.hudChatBox) this.dom.hudChatBox.classList.add('hidden');
    if (this.dom.hudChatBox) this.dom.hudChatBox.classList.add('hidden');

    soundEngine.stopHeartbeat();
    soundEngine.resetChaseMusic();
    soundEngine.stopProceduralChaseLoop();
    if (this.dom.nextbotAudio) this.dom.nextbotAudio.pause();
    if (document.exitPointerLock) document.exitPointerLock();
  }

  playGameOverMedia() {
    const video = this.dom.gameOverVideo;
    const fallback = this.dom.gameOverFallback;
    const soundBtn = this.dom.btnToggleSound;

    const hasVideoSource = this.hasValidVideo || assetManager.hasCustomVideo;

    if (!hasVideoSource) {
      // No video provided yet, show romantic fallback scene
      video.style.display = 'none';
      fallback.style.display = 'block';
      if (soundBtn) soundBtn.style.display = 'none';
      return;
    }

    // Video is available!
    if (video.src !== assetManager.gameOverVideoUrl) {
      video.src = assetManager.gameOverVideoUrl;
    }

    video.currentTime = 0;
    video.volume = soundEngine.volume;
    video.muted = false; // try playing unmuted with audio first!

    // Ensure video is visible and on top
    video.style.display = 'block';
    fallback.style.display = 'none';

    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.then(() => {
        video.style.display = 'block';
        fallback.style.display = 'none';
        if (soundBtn) {
          soundBtn.style.display = 'inline-block';
          soundBtn.textContent = '🔊 Звук: ВКЛ';
        }
      }).catch((err) => {
        console.warn('Direct unmuted play blocked by browser, trying muted:', err);
        video.muted = true;
        video.play().then(() => {
          video.style.display = 'block';
          fallback.style.display = 'none';
          if (soundBtn) {
            soundBtn.style.display = 'inline-block';
            soundBtn.textContent = '🔇 Звук: ВЫКЛ (Кликни)';
          }
        }).catch((err2) => {
          console.warn('Video failed to play completely, showing fallback image:', err2);
          video.style.display = 'none';
          fallback.style.display = 'block';
          if (soundBtn) soundBtn.style.display = 'none';
        });
      });
    }
  }

  triggerGameOver(reason = 'girl_caught') {
    this.stopSpectating();
    this.state = STATE.GAMEOVER;
    if (reason === 'magma') {
      soundEngine.playMagmaDeath();
    } else {
      soundEngine.playGameOver();
    }

    if (document.exitPointerLock) {
      document.exitPointerLock();
    }

    soundEngine.stopHeartbeat();
    soundEngine.stopProceduralChaseLoop();
    if (this.dom.nextbotAudio) {
      this.dom.nextbotAudio.pause();
    }

    if (this.dom.hudToriiCountdown) this.dom.hudToriiCountdown.classList.add('hidden');
    if (this.dom.hudMagmaWarning) this.dom.hudMagmaWarning.classList.add('hidden');

    const mapKey = this.currentMapType || 'crater';
    const textConfig = (this.isMultiplayer && MAP_END_TEXTS[mapKey])
      ? MAP_END_TEXTS[mapKey].coop.defeat
      : (MAP_END_TEXTS[mapKey] ? MAP_END_TEXTS[mapKey].solo.defeat : null);

    if (textConfig && this.dom.goTitle) {
      this.dom.goTitle.innerHTML = textConfig.title;
    }
    if (textConfig && this.dom.goSubtitle) {
      if (reason === 'magma' && textConfig.magmaSubtitle) {
        this.dom.goSubtitle.textContent = textConfig.magmaSubtitle;
        this.dom.goSubtitle.style.color = '#ff4466';
      } else {
        this.dom.goSubtitle.textContent = textConfig.subtitle;
        this.dom.goSubtitle.style.color = '#ff88a3';
      }
    }

    if (reason === 'magma') {
      if (this.dom.gameOverFallback) {
        this.dom.gameOverFallback.style.background = 'radial-gradient(circle at 50% 100%, #ff2200 0%, #660000 60%, #1a0000 100%)';
        this.dom.gameOverFallback.innerHTML = `
          <div class="magma-death-scene" style="position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; pointer-events:none;">
            <div style="font-size: 80px; filter: drop-shadow(0 0 20px #ff3300); animation: pulse 1s infinite alternate;">🌋</div>
            <img src="${assetManager.girlTextureUrl}" style="width: 140px; height: 140px; border-radius: 50%; border: 3px solid #ff3300; box-shadow: 0 0 30px #ff0000; margin-top: 10px; object-fit: cover;" alt="Girl">
            <div style="color: #fff; font-weight: 700; margin-top: 12px; font-size: 18px; text-shadow: 0 0 10px #000;">«Ой, кажется, я испачкалась...»</div>
          </div>
        `;
      }
    } else {
      if (this.dom.gameOverFallback) {
        this.dom.gameOverFallback.innerHTML = '';
        this.dom.gameOverFallback.style.background = '';
        this.dom.gameOverFallback.style.backgroundImage = "url('./assets/romantic_scene.jpg')";
      }
    }

    // High score check
    let isNewRecord = false;
    if (this.elapsedTime > this.highScore) {
      this.highScore = this.elapsedTime;
      localStorage.setItem('virginity_record', this.highScore.toString());
      this.updateRecordDisplay();
      isNewRecord = true;
    }

    // Populate Game Over stats
    this.dom.goTime.textContent = this.formatTime(this.elapsedTime);
    this.dom.goShields.textContent = this.shieldsCollected.toString();
    this.dom.goRecord.textContent = this.formatTime(this.highScore) + (isNewRecord ? ' (НОВЫЙ!)' : '');

    // Host-Only vs Non-Host Restart Controls
    if (this.isMultiplayer) {
      if (networkManager.isHost) {
        this.dom.btnRestart.style.display = 'inline-block';
        this.dom.btnRestart.textContent = '🔄 ПЕРЕЗАПУСТИТЬ ДЛЯ ВСЕХ';
        if (this.dom.goCoopRestartNotice) this.dom.goCoopRestartNotice.classList.add('hidden');
      } else if (networkManager.isPublic || networkManager.roomId === 'PUBLIC') {
        this.dom.btnRestart.style.display = 'inline-block';
        this.dom.btnRestart.textContent = '🔄 В ЛОББИ (НОВЫЙ РАУНД)';
        if (this.dom.goCoopRestartNotice) this.dom.goCoopRestartNotice.classList.add('hidden');
      } else {
        this.dom.btnRestart.style.display = 'none';
        if (this.dom.goCoopRestartNotice) {
          this.dom.goCoopRestartNotice.classList.remove('hidden');
          this.dom.goCoopRestartNotice.textContent = '⏳ Только хост может перезапустить игру. Ожидание хоста...';
        }
      }
    } else {
      this.dom.btnRestart.style.display = 'inline-block';
      this.dom.btnRestart.textContent = '🔄 ПОПРОБОВАТЬ СПАСТИСЬ СНОВА';
      if (this.dom.goCoopRestartNotice) this.dom.goCoopRestartNotice.classList.add('hidden');
    }

    // Show Game Over Modal
    this.dom.hud.classList.add('hidden');
    this.dom.gameOverModal.classList.remove('hidden');

    // Play video or fallback
    this.playGameOverMedia();
  }

  playVictoryMedia() {
    const video = this.dom.victoryVideo;
    const fallback = this.dom.victoryFallback;
    const soundBtn = this.dom.btnToggleVictorySound;

    const hasVideoSource = this.hasValidVictoryVideo || assetManager.hasCustomVictoryVideo;

    if (this.dom.victoryAudio) {
      this.dom.victoryAudio.pause();
      this.dom.victoryAudio.currentTime = 0;
    }

    if (!hasVideoSource) {
      if (video) video.style.display = 'none';
      if (fallback) fallback.style.display = 'flex';
      if (soundBtn) soundBtn.style.display = 'none';
      return;
    }

    if (video.src !== assetManager.victoryVideoUrl) {
      video.src = assetManager.victoryVideoUrl;
    }

    video.currentTime = 0;
    video.volume = soundEngine.volume;
    video.muted = false;

    video.style.display = 'block';
    if (fallback) fallback.style.display = 'none';

    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.then(() => {
        video.style.display = 'block';
        if (fallback) fallback.style.display = 'none';
        if (soundBtn) {
          soundBtn.style.display = 'inline-block';
          soundBtn.textContent = '🔊 Звук: ВКЛ';
        }
      }).catch(() => {
        video.muted = true;
        video.play().then(() => {
          video.style.display = 'block';
          if (fallback) fallback.style.display = 'none';
          if (soundBtn) {
            soundBtn.style.display = 'inline-block';
            soundBtn.textContent = '🔇 Звук: ВЫКЛ (Кликни)';
          }
        }).catch(() => {
          video.style.display = 'none';
          if (fallback) fallback.style.display = 'flex';
          if (soundBtn) soundBtn.style.display = 'none';
        });
      });
    }
  }

  triggerVictory() {
    this.stopSpectating();
    this.state = STATE.VICTORY;
    soundEngine.playVictory();

    if (document.exitPointerLock) {
      document.exitPointerLock();
    }

    soundEngine.stopHeartbeat();
    soundEngine.stopProceduralChaseLoop();
    if (this.dom.nextbotAudio) {
      this.dom.nextbotAudio.pause();
    }

    const mapKey = this.currentMapType || 'crater';
    const textConfig = (this.isMultiplayer && MAP_END_TEXTS[mapKey])
      ? MAP_END_TEXTS[mapKey].coop.victory
      : (MAP_END_TEXTS[mapKey] ? MAP_END_TEXTS[mapKey].solo.victory : null);

    if (textConfig) {
      if (this.dom.vicTitle) this.dom.vicTitle.innerHTML = textConfig.title;
      if (this.dom.vicBadge) this.dom.vicBadge.textContent = textConfig.badge;
      if (this.dom.vicDesc) this.dom.vicDesc.textContent = textConfig.description;
    }

    // Populate Victory stats
    if (this.dom.vicTime) this.dom.vicTime.textContent = this.formatTime(this.elapsedTime);
    if (this.dom.vicKeys) this.dom.vicKeys.textContent = `${this.escapeGoal.keysCollected} / ${this.escapeGoal.totalKeys}`;
    if (this.dom.vicShields) this.dom.vicShields.textContent = this.shieldsCollected.toString();

    // Host-Only vs Non-Host Restart Controls
    if (this.isMultiplayer) {
      if (networkManager.isHost) {
        if (this.dom.btnVictoryRestart) {
          this.dom.btnVictoryRestart.style.display = 'inline-block';
          this.dom.btnVictoryRestart.textContent = '🔄 ПЕРЕЗАПУСТИТЬ ДЛЯ ВСЕХ';
        }
        if (this.dom.vicCoopRestartNotice) this.dom.vicCoopRestartNotice.classList.add('hidden');
      } else if (networkManager.isPublic || networkManager.roomId === 'PUBLIC') {
        if (this.dom.btnVictoryRestart) {
          this.dom.btnVictoryRestart.style.display = 'inline-block';
          this.dom.btnVictoryRestart.textContent = '🔄 В ЛОББИ (НОВЫЙ РАУНД)';
        }
        if (this.dom.vicCoopRestartNotice) this.dom.vicCoopRestartNotice.classList.add('hidden');
      } else {
        if (this.dom.btnVictoryRestart) {
          this.dom.btnVictoryRestart.style.display = 'none';
        }
        if (this.dom.vicCoopRestartNotice) {
          this.dom.vicCoopRestartNotice.classList.remove('hidden');
          this.dom.vicCoopRestartNotice.textContent = '⏳ Только хост может перезапустить игру. Ожидание хоста...';
        }
      }
    } else {
      if (this.dom.btnVictoryRestart) {
        this.dom.btnVictoryRestart.style.display = 'inline-block';
        this.dom.btnVictoryRestart.textContent = '👑 СЫГРАТЬ ЕЩЕ РАЗ';
      }
      if (this.dom.vicCoopRestartNotice) this.dom.vicCoopRestartNotice.classList.add('hidden');
    }

    // Show Victory Modal
    this.dom.hud.classList.add('hidden');
    if (this.dom.victoryModal) {
      this.dom.victoryModal.classList.remove('hidden');
    }

    this.playVictoryMedia();
  }

  animate() {
    requestAnimationFrame(this.animate);

    const delta = this.clock.getDelta();

    // 🎬 Обновление активной катсцены и рендер 3D сцены
    if (this.state === STATE.CUTSCENE) {
      if (this.map && typeof this.map.update === 'function') {
        this.map.update(delta);
      }
      if (this.cutsceneManager && this.cutsceneManager.isPlaying) {
        this.cutsceneManager.update(delta);
      }
      this.renderer.render(this.scene, this.camera);
      return;
    }

    if (this.state === STATE.PLAYING || (this.isMultiplayer && this.state === STATE.PAUSED)) {
      if (this.state === STATE.PLAYING) {
        this.elapsedTime += delta;
        this.dom.hudTimer.textContent = this.formatTime(this.elapsedTime);

        // Update active map (rising magma, crumbling platforms, ash embers, geysers, helicopter light)
        if (this.map && typeof this.map.update === 'function') {
          const pPos = (this.player && this.player.position) ? this.player.position : null;
          this.map.update(delta, pPos);
        }

        // Update Player (with co-op teammate collision resolution) or Spectator Camera
        const remoteList = this.isMultiplayer ? Array.from(this.remotePlayers.values()) : [];
        if (!this.isSpectating) {
          this.player.update(delta, remoteList);
        } else {
          this.updateSpectatorCamera(delta);
        }

        // Update altitude and rising magma display in crater
        if (this.currentMapType === 'crater' && this.dom.hudAltitudeValue) {
          const altMeters = Math.max(0, this.player.position.y).toFixed(0);
          const magmaMeters = this.map && this.map.magmaLevel !== undefined ? this.map.magmaLevel.toFixed(1) : '0';
          this.dom.hudAltitudeValue.textContent = `${altMeters}m (Месячные: ${magmaMeters}m)`;
        }
      }

      // In Multiplayer: update remote avatars and send transform
      if (this.isMultiplayer) {
        for (const rp of this.remotePlayers.values()) {
          rp.update(delta, this.camera);
        }

        const isMoving = !this.isSpectating && (this.state === STATE.PLAYING) && (this.player.keys.forward || this.player.keys.backward || this.player.keys.left || this.player.keys.right);
        const wantsSprint = !this.isSpectating && (this.state === STATE.PLAYING) && this.player.keys.sprint && isMoving && !this.player.isExhausted && !this.player.isDowned;
        networkManager.sendPlayerUpdate(
          this.player.position,
          this.player.yaw,
          this.player.pitch,
          isMoving,
          wantsSprint,
          this.player.flashlightOn,
          this.player.shieldActive,
          this.player.isDowned || this.isSpectating
        );

        if (networkManager.isHost) {
          const magmaLvl = (this.map && this.map.magmaLevel !== undefined) ? this.map.magmaLevel : undefined;
          networkManager.sendNextbotUpdate(
            this.girl.position,
            this.girl.meshGroup.rotation.y,
            'target',
            this.girl.stunTimer,
            this.girl.distractedTimer,
            this.girl.currentSpeed,
            magmaLvl
          );
        }

        this.updateSquadHUD();
        this.updateReviveMechanic(delta);
      }

      // Update Girl Nextbot AI
      const remoteList = Array.from(this.remotePlayers.values());
      const distToGirl = this.girl.update(delta, this.player, this.elapsedTime, remoteList, !this.isMultiplayer || networkManager.isHost);

      // Check Keys and Exit Door
      this.escapeGoal.update(delta, this.player.position);

      // Check Shields Pickups
      this.shieldManager.update(delta, this.player, this.girl, (type) => {
        this.shieldsCollected++;
        this.dom.hudShields.textContent = this.shieldsCollected;
        let hint = '';
        if (type.id === 'forcefield') hint = 'Нажми [1] для щита!';
        else if (type.id === 'energy_drink') hint = 'Нажми [2] для супер-бега!';
        else if (type.id === 'dakimakura') hint = 'Нажми [3] бросить приманку!';
        else if (type.id === 'd20_dice') hint = 'Спас-бросок жизни активен!';
        this.showToast(`🎒 В инвентарь: ${type.name}! ${hint}`);
      }, remoteList);

      // Girl Catch & Defense Check
      if (distToGirl < 1.7) {
        const now = performance.now();

        // 1. Invulnerability frames active (e.g., player was just saved by D20 or revived)
        if (this.player.invulnerabilityTimer > 0) {
          // Softly push girl away so she doesn't stick inside player
          this.girl.repelFrom(this.player.position, 16.0, 4.0);
        }
        // 2. Active Forcefield (RTX 5090)
        else if (this.player.shieldActive) {
          // Rate-limit repulsion to avoid 60fps blast spam & screen flooding
          if (now - this.lastShieldRepelTime > 1100) {
            this.lastShieldRepelTime = now;
            this.girl.repelFrom(this.player.position, 26.0, 7.5);
            this.showToast('💥 СИЛОВОЕ ПОЛЕ ОТБРОСИЛО ДЕВУШКУ!');
            if (this.isMultiplayer) {
              networkManager.sendShieldRepelGirl(this.player.position, 26.0);
            }
          }
        }
        // 3. D20 Extra Life Passive Save
        else if (this.player.inventory.d20_dice > 0 || this.player.extraLives > 0) {
          const saved = this.player.consumeD20Life();
          if (saved) {
            this.girl.repelFrom(this.player.position, 22.0, 6.5);
            this.showToast(`🎲 D20 СПАСЕНИЕ! Осталось костей: ${this.player.inventory.d20_dice}. БЕГИ!`);
            if (this.isMultiplayer) {
              networkManager.sendShieldRepelGirl(this.player.position, 22.0);
            }
          } else {
            this.handlePlayerCaught();
            return;
          }
        }
        // 4. No protection left -> Caught!
        else {
          this.handlePlayerCaught();
          return;
        }
      }

      // Proximity Danger Vignette & Heart Rate
      this.updateProximityEffects(distToGirl);

      // Update HUD elements
      this.updateHUD();
    }

    this.renderer.render(this.scene, this.camera);
  }

  updateProximityEffects(dist) {
    // Proximity 0 to 1
    const dangerRange = 22;
    const factor = Math.max(0, Math.min(1, 1 - (dist / dangerRange)));

    // Vignette opacity
    this.dom.dangerVignette.style.opacity = Math.pow(factor, 1.4) * 0.9;

    // Heart BPM (70 to 180)
    const bpm = Math.round(70 + factor * 115);
    this.dom.bpmValue.textContent = `${bpm} BPM`;

    if (bpm > 140) {
      this.dom.bpmStatus.textContent = 'ПАНИКА! ОНА РЯДОМ!';
      this.dom.bpmStatus.style.color = '#ff0055';
      this.dom.heartIcon.classList.add('beating');
    } else if (bpm > 100) {
      this.dom.bpmStatus.textContent = 'ТРЕВОГА... ПРИБЛИЖАЕТСЯ';
      this.dom.bpmStatus.style.color = '#ffaa00';
      this.dom.heartIcon.classList.add('beating');
    } else {
      this.dom.bpmStatus.textContent = 'СПОКОЙСТВИЕ';
      this.dom.bpmStatus.style.color = 'var(--text-secondary)';
      this.dom.heartIcon.classList.remove('beating');
    }
  }

  updateHUD() {
    // Stamina
    const stamPercent = Math.round((this.player.stamina / this.player.maxStamina) * 100);
    this.dom.staminaFill.style.width = `${stamPercent}%`;
    this.dom.staminaPercent.textContent = `${stamPercent}%`;
    if (this.player.isExhausted) {
      this.dom.staminaFill.classList.add('exhausted');
    } else {
      this.dom.staminaFill.classList.remove('exhausted');
    }

    // Flashlight status
    this.dom.flashlightStatus.textContent = this.player.flashlightOn ? 'ВКЛ' : 'ВЫКЛ';
    this.dom.flashlightStatus.style.color = this.player.flashlightOn ? 'var(--cyan)' : 'var(--text-secondary)';

    // Lives
    this.dom.hudLives.textContent = (this.player.extraLives + 1).toString();

    // Active Buffs Badge
    if (this.player.invulnerabilityTimer > 0) {
      this.dom.activeBuffCard.style.display = 'block';
      this.dom.activeBuffCard.textContent = `🎲 НЕУЯЗВИМОСТЬ (${this.player.invulnerabilityTimer.toFixed(1)}s)`;
      this.dom.activeBuffCard.style.borderColor = 'var(--amber)';
    } else if (this.player.shieldTimeRemaining > 0) {
      this.dom.activeBuffCard.style.display = 'block';
      this.dom.activeBuffCard.textContent = `🛡️ СИЛОВОЕ ПОЛЕ АКТИВНО (${this.player.shieldTimeRemaining.toFixed(1)}s)`;
      this.dom.activeBuffCard.style.borderColor = 'var(--cyan)';
    } else if (this.player.speedBoostTimeRemaining > 0) {
      this.dom.activeBuffCard.style.display = 'block';
      this.dom.activeBuffCard.textContent = `⚡ ТУРБО-СКОРОСТЬ (${this.player.speedBoostTimeRemaining.toFixed(1)}s)`;
      this.dom.activeBuffCard.style.borderColor = 'var(--green)';
    } else {
      this.dom.activeBuffCard.style.display = 'none';
    }
  }

  handlePlayerCaught() {
    if (!this.isMultiplayer) {
      this.triggerGameOver();
      return;
    }

    // In Co-op Multiplayer: Downed state with rescue chance!
    if (!this.player.isDowned) {
      this.player.setDowned(true);
      this.girl.repelFrom(this.player.position, 14.0, 4.0);
      networkManager.sendPlayerDowned(this.player.position, networkManager.playerName);
      this.showToast('🆘 ТЕБЯ ЗАГНАЛИ В УГОЛ! ЗОВИ НАПАРНИКА НА ПОМОЩЬ [E]!');
      soundEngine.playNextbotRespawn();
    }
  }

  initCoopNetworking() {
    // 1. Player setup & Color picker
    // Unique default player nickname for Co-op
    const COOL_NAMES = [
      'Самурай', 'Гигачад', 'Стечкин', 'Крепыш', 'Шериф',
      'Ниндзя', 'Базука', 'Берсерк', 'Фантом', 'Сталкер',
      'Кибер-Бро', 'Катана', 'Викинг', 'Титаниум', 'Феникс',
      'Корсар', 'Дракон', 'Хантер', 'Снайпер', 'Ворон'
    ];
    let initialName = localStorage.getItem('coop_player_name');
    if (!initialName) {
      const base = COOL_NAMES[Math.floor(Math.random() * COOL_NAMES.length)];
      const num = Math.floor(10 + Math.random() * 90);
      initialName = `${base}#${num}`;
      localStorage.setItem('coop_player_name', initialName);
    }
    if (this.dom.coopNameInput) {
      this.dom.coopNameInput.value = initialName;
      this.dom.coopNameInput.addEventListener('input', () => {
        const val = this.dom.coopNameInput.value.trim();
        if (val) {
          localStorage.setItem('coop_player_name', val);
        }
      });
    }

    if (this.dom.colorPickerRow) {
      const dots = this.dom.colorPickerRow.querySelectorAll('.color-dot');
      dots.forEach((dot) => {
        if (dot.dataset.color === this.selectedColor) {
          dots.forEach(d => d.classList.remove('active'));
          dot.classList.add('active');
        }
        dot.addEventListener('click', () => {
          dots.forEach(d => d.classList.remove('active'));
          dot.classList.add('active');
          this.selectedColor = dot.dataset.color;
          localStorage.setItem('coop_player_color', this.selectedColor);
          if (this.player && typeof this.player.setArmorColor === 'function') {
            this.player.setArmorColor(this.selectedColor);
          }
        });
      });
    }

    // 2. Open / Close Co-op Modal
    if (this.dom.btnOpenCoop) {
      this.dom.btnOpenCoop.addEventListener('click', () => {
        if (this.dom.coopModal) this.dom.coopModal.classList.remove('hidden');
      });
    }

    if (this.dom.btnCloseCoop) {
      this.dom.btnCloseCoop.addEventListener('click', () => {
        if (this.dom.coopModal) this.dom.coopModal.classList.add('hidden');
      });
    }

    let isConnectingToRoom = false;
    const connectToRoom = (roomId) => {
      if (isConnectingToRoom) return;
      isConnectingToRoom = true;

      const setButtonsDisabled = (disabled) => {
        if (this.dom.btnCoopQuick) this.dom.btnCoopQuick.disabled = disabled;
        if (this.dom.btnCoopCreate) this.dom.btnCoopCreate.disabled = disabled;
        if (this.dom.btnCoopJoin) this.dom.btnCoopJoin.disabled = disabled;
      };
      setButtonsDisabled(true);

      const inputVal = (this.dom.coopNameInput ? this.dom.coopNameInput.value : '').trim();
      const name = inputVal || localStorage.getItem('coop_player_name') || ('Самурай#' + Math.floor(10 + Math.random() * 90));
      if (this.dom.coopNameInput) {
        this.dom.coopNameInput.value = name;
      }
      this.showToast(`Подключение к комнате ${roomId}...`);
      networkManager.connect(roomId, name, this.selectedColor, this.currentMapType)
        .then(() => {
          this.dom.coopConnectView.classList.add('hidden');
          this.dom.coopRoomView.classList.remove('hidden');
        })
        .catch((err) => {
          console.error(err);
          this.showToast('❌ ' + (err.message || 'Ошибка подключения к серверу коопа'));
        })
        .finally(() => {
          isConnectingToRoom = false;
          setButtonsDisabled(false);
        });
    };

    if (this.dom.btnCoopQuick) {
      this.dom.btnCoopQuick.addEventListener('click', () => {
        connectToRoom('PUBLIC');
      });
    }

    if (this.dom.btnCoopCreate) {
      this.dom.btnCoopCreate.addEventListener('click', () => {
        const randomCode = 'BRO' + Math.floor(100 + Math.random() * 900);
        connectToRoom(randomCode);
      });
    }

    if (this.dom.btnCoopJoin) {
      this.dom.btnCoopJoin.addEventListener('click', () => {
        const code = (this.dom.coopRoomCodeInput.value || '').trim();
        if (code) {
          connectToRoom(code);
        } else {
          this.showToast('Введи код комнаты!');
        }
      });
    }

    if (this.dom.btnCopyRoomCode) {
      this.dom.btnCopyRoomCode.addEventListener('click', () => {
        if (networkManager.roomId) {
          navigator.clipboard.writeText(networkManager.roomId).then(() => {
            this.showToast('📋 Код комнаты скопирован!');
          });
        }
      });
    }

    if (this.dom.btnCoopLeave) {
      this.dom.btnCoopLeave.addEventListener('click', () => {
        this.clearPublicKickTimer();
        this.isCoopReady = false;
        this.updateReadyButtonUI();
        networkManager.disconnect();
        this.dom.coopRoomView.classList.add('hidden');
        this.dom.coopConnectView.classList.remove('hidden');
        this.showToast('Вы вышли из комнаты');
      });
    }

    if (this.dom.btnCoopStartGame) {
      this.dom.btnCoopStartGame.addEventListener('click', () => {
        networkManager.sendStartGame(this.currentMapType);
      });
    }

    if (this.dom.btnCoopReady) {
      this.dom.btnCoopReady.addEventListener('click', () => {
        this.isCoopReady = !this.isCoopReady;
        console.log('[Game] Clicked Ready button! New isCoopReady =', this.isCoopReady);
        this.updateReadyButtonUI();
        networkManager.sendReady(this.isCoopReady);
        if (networkManager.isPublic || networkManager.roomId === 'PUBLIC') {
          if (this.isCoopReady) {
            this.clearPublicKickTimer();
            if (this.dom.coopPublicTimerBanner) {
              this.dom.coopPublicTimerBanner.classList.remove('hidden');
              this.dom.coopPublicTimerBanner.innerHTML = '✅ <span style="color:#00ffaa;">ВЫ ГОТОВЫ! Ожидание остальных игроков...</span>';
            }
          } else {
            this.startPublicKickTimer();
          }
        }
      });
    }

    // 3. In-Game Chat Handling
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyT' && this.state === STATE.PLAYING && !this.chatOpen) {
        e.preventDefault();
        this.openChat();
      } else if (e.code === 'Escape' && this.chatOpen) {
        this.closeChat();
      }
    });

    if (this.dom.chatForm) {
      this.dom.chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = (this.dom.chatInput.value || '').trim();
        if (text) {
          networkManager.sendChatMessage(text);
          this.addChatMessage(networkManager.playerName, text, true);
          this.dom.chatInput.value = '';
        }
        this.closeChat();
      });
    }

    networkManager.onRoomJoined = (msg) => {
      this.dom.coopDisplayRoom.textContent = msg.roomId;
      this.isCoopReady = false;
      this.updateReadyButtonUI();
      // Sync local player nickname if server assigned unique adjusted name
      if (networkManager.playerName && this.dom.coopNameInput) {
        this.dom.coopNameInput.value = networkManager.playerName;
        localStorage.setItem('coop_player_name', networkManager.playerName);
      }
      this.renderLobbyPlayers(msg.players);
      if (msg.isPublic || msg.roomId === 'PUBLIC' || networkManager.isPublic) {
        this.startPublicKickTimer();
      } else {
        this.clearPublicKickTimer();
      }
      if (msg.mapType && msg.mapType !== this.currentMapType) {
        this.loadMap(msg.mapType);
        if (this.dom.tabMapCrater && this.dom.tabMapMaze) {
          this.dom.tabMapCrater.classList.toggle('active', msg.mapType === 'crater');
          this.dom.tabMapMaze.classList.toggle('active', msg.mapType === 'maze');
        }
        this.updateMenuTagline(msg.mapType);
        this.updateArtifactLegends(msg.mapType);
      }
    };

    networkManager.onPlayerJoined = (player, players) => {
      this.renderLobbyPlayers(players);
      this.showToast(`👥 ${player.name} присоединился к побегу!`);
    };

    networkManager.onPlayerLeft = (id, name, players) => {
      this.renderLobbyPlayers(players);
      const rp = this.remotePlayers.get(id);
      if (rp) {
        rp.destroy();
        this.remotePlayers.delete(id);
      }
      this.showToast(`🚪 ${name} покинул игру`);
    };

    networkManager.onGameStarted = (msg) => {
      this.startMultiplayerGame(msg);
    };

    networkManager.onPlayerUpdate = (data) => {
      if (data.playerId === networkManager.playerId) return;
      let rp = this.remotePlayers.get(data.playerId);
      if (!rp) {
        // Find player info
        const info = networkManager.players.find(p => p.id === data.playerId) || { id: data.playerId, name: 'Бро' };
        rp = new RemotePlayer(this.scene, info);
        if (data.x !== undefined && data.z !== undefined) {
          const gy = Math.max(0, (data.y !== undefined ? data.y : 1.7) - 1.7);
          rp.root.position.set(data.x, gy, data.z);
          rp.targetPosition.set(data.x, gy, data.z);
        }
        this.remotePlayers.set(data.playerId, rp);
      }
      rp.applyUpdate(data);
    };

    networkManager.onNextbotUpdate = (data) => {
      if (!networkManager.isHost) {
        this.girl.applyNetworkUpdate(data);
        if (data.magmaLevel !== undefined && this.map && typeof this.map.setNetworkMagmaLevel === 'function') {
          this.map.setNetworkMagmaLevel(data.magmaLevel);
        }
      }
    };

    networkManager.onParkourStart = () => {
      if (this.map && typeof this.map.triggerParkourStart === 'function') {
        this.map.triggerParkourStart(true);
      }
      if (this.girl && typeof this.girl.setDormant === 'function') {
        this.girl.setDormant(false);
      }
    };

    networkManager.onMapTypeChanged = (mapType) => {
      if (mapType && mapType !== this.currentMapType) {
        this.loadMap(mapType);
        if (this.dom.tabMapCrater && this.dom.tabMapMaze) {
          this.dom.tabMapCrater.classList.toggle('active', mapType === 'crater');
          this.dom.tabMapMaze.classList.toggle('active', mapType === 'maze');
        }
        this.updateMenuTagline(mapType);
        this.updateArtifactLegends(mapType);
        const mapName = (mapType === 'crater') ? '🌋 Месячный вулкан' : '🏛️ Классический Лабиринт';
        this.showToast(`🗺️ Хост выбрал карту: ${mapName}`);
      }
    };

    networkManager.onKeyCollected = (data) => {
      this.escapeGoal.collectKeyByIndex(data.keyIndex);
      this.showToast(`🗝️ ${data.collectorName} НАШЕЛ КЛЮЧ! (${data.keysCollected}/${data.totalKeys})`);
    };

    networkManager.onDecoyDropped = (data) => {
      this.shieldManager.spawnDroppedDecoy(data.position, this.girl, data.duration);
      this.showToast(`🎎 ${data.dropperName} БРОСИЛ ПРИМАНКУ!`);
    };

    networkManager.onShieldRepel = (data) => {
      this.girl.repelFrom(data.position, data.force);
    };

    networkManager.onPlayerDowned = (data) => {
      if (data.playerId === networkManager.playerId) {
        this.player.setDowned(true);
      } else {
        const rp = this.remotePlayers.get(data.playerId);
        if (rp) rp.setDowned(true);
      }
      this.showToast(`🆘 ${data.playerName} ЗАГНАН В УГОЛ! СПАСИ БРО! [E]`);
    };

    networkManager.onPlayerEliminated = (data) => {
      const rp = this.remotePlayers.get(data.playerId);
      if (rp) {
        rp.setEliminated(true);
      }
      this.showToast(`💀 ${data.playerName} ВЫБЫЛ ИЗ ИГРЫ!`);
      if (this.isSpectating && this.spectatorTargetId === data.playerId) {
        this.cycleSpectatorTarget(1);
      }
    };

    networkManager.onPlayerRevived = (data) => {
      if (data.targetId === networkManager.playerId) {
        this.player.setDowned(false);
        this.player.isDead = false;
        this.stopSpectating();
        this.renderer.domElement.requestPointerLock();
        this.showToast(`❤️ ${data.reviverName} СПАС ТВОЮ ДЕВСТВЕННОСТЬ! БЕГИ!`);
      } else {
        const rp = this.remotePlayers.get(data.targetId);
        if (rp) {
          rp.setDowned(false);
          rp.isDead = false;
        }
        this.showToast(`❤️ ${data.reviverName} СПАС БРО!`);
      }
    };

    networkManager.onPlayerReadyChanged = (msg) => {
      this.renderLobbyPlayers(msg.players || networkManager.players);
    };

    networkManager.onRoomResetLobby = (msg) => {
      this.stopSpectating();
      if (this.dom.gameOverModal) this.dom.gameOverModal.classList.add('hidden');
      if (this.dom.victoryModal) this.dom.victoryModal.classList.add('hidden');
      if (this.dom.hud) this.dom.hud.classList.add('hidden');
      if (this.dom.coopModal) this.dom.coopModal.classList.remove('hidden');
      if (this.dom.coopRoomView) this.dom.coopRoomView.classList.remove('hidden');
      if (this.dom.coopConnectView) this.dom.coopConnectView.classList.add('hidden');

      this.isCoopReady = false;
      this.updateReadyButtonUI();
      this.renderLobbyPlayers(msg.players || networkManager.players);
      this.startPublicKickTimer();
      this.showToast('🔄 Раунд завершен. Вернулись в лобби! Нажмите «Готов»');
    };

    networkManager.onKicked = (msg) => {
      this.clearPublicKickTimer();
      this.isCoopReady = false;
      this.updateReadyButtonUI();
      if (this.dom.coopRoomView) this.dom.coopRoomView.classList.add('hidden');
      if (this.dom.coopConnectView) this.dom.coopConnectView.classList.remove('hidden');
      this.showToast('⚠️ ' + (msg.reason || 'Вы были исключены за неактивность'));
    };

    networkManager.onTeamGameOver = (data) => {
      this.stopSpectating();
      this.showToast('💔 ВСЯ КОМАНДА ПОТЕРЯЛА ДЕВСТВЕННОСТЬ!');
      this.triggerGameOver(data && data.reason === 'magma' ? 'magma' : 'girl_caught');
    };

    networkManager.onTeamVictory = (data) => {
      this.stopSpectating();
      this.showToast(`👑 ${data.escaperName} ОТКРЫЛ ВЫХОД! КОМАНДНАЯ ПОБЕДА!`);
      this.triggerVictory();
    };

    networkManager.onGameRestarted = (msg) => {
      this.startMultiplayerGame(msg);
    };

    networkManager.onChatMessage = (data) => {
      if (data.senderId !== networkManager.playerId) {
        this.addChatMessage(data.senderName, data.text, false);
      }
    };

    networkManager.onHostMigrated = (data) => {
      this.showToast(`👑 ${data.newHostName} стал хостом лобби!`);
      this.renderLobbyPlayers(networkManager.players);
    };
  }

  renderLobbyPlayers(players) {
    if (!this.dom.coopPlayerList) return;
    this.dom.coopPlayerList.innerHTML = '';
    this.dom.coopPlayersCount.textContent = `${players.length}/4 Игроков`;

    const isPublic = networkManager.isPublic || networkManager.roomId === 'PUBLIC';
    const isHost = networkManager.isHost && !isPublic;

    // In public room: NO host button!
    if (this.dom.btnCoopStartGame) {
      this.dom.btnCoopStartGame.style.display = isHost ? 'block' : 'none';
    }

    if (this.dom.coopWaitingHostNotice) {
      if (isPublic) {
        this.dom.coopWaitingHostNotice.style.display = 'block';
        this.dom.coopWaitingHostNotice.innerHTML = '⚡ <b>ОБЩАЯ КОМНАТА</b>: Игра начнется АВТОМАТИЧЕСКИ, когда все игроки нажмут «ГОТОВ»!';
        this.dom.coopWaitingHostNotice.style.color = '#00f3ff';
      } else if (isHost) {
        this.dom.coopWaitingHostNotice.style.display = 'block';
        this.dom.coopWaitingHostNotice.innerHTML = '⚡ Игра начнется сразу, когда <b>все игроки нажмут «ГОТОВ»</b> (или нажмите кнопку запуска выше)';
        this.dom.coopWaitingHostNotice.style.color = '#39ff14';
      } else {
        this.dom.coopWaitingHostNotice.style.display = 'block';
        this.dom.coopWaitingHostNotice.innerHTML = '⏳ Ожидание готовности игроков (нажмите «ГОТОВ»)...';
        this.dom.coopWaitingHostNotice.style.color = '#ffaa00';
      }
    }

    players.forEach((p) => {
      const item = document.createElement('div');
      item.className = 'coop-player-item';

      const isMe = p.id === networkManager.playerId;
      const meTag = isMe ? ' (Вы)' : '';

      const readyBadge = p.ready
        ? '<span class="player-item-badge badge-ready">🟢 ГОТОВ</span>'
        : '<span class="player-item-badge badge-not-ready">🟡 НЕ ГОТОВ</span>';

      const hostBadge = (!isPublic && p.isHost) ? '<span class="player-item-badge host">👑 ХОСТ</span>' : '';

      item.innerHTML = `
        <div class="player-item-info">
          <div class="player-avatar-badge" style="background: ${p.color}; color: ${p.color};"></div>
          <span class="player-item-name">${p.name}${meTag}</span>
        </div>
        <div style="display: flex; gap: 8px; align-items: center;">
          ${hostBadge}
          ${readyBadge}
        </div>
      `;
      this.dom.coopPlayerList.appendChild(item);
    });
  }

  updateReadyButtonUI() {
    if (!this.dom.btnCoopReady) return;
    if (this.isCoopReady) {
      this.dom.btnCoopReady.textContent = '✅ ВЫ ГОТОВЫ (ОТМЕНА)';
      this.dom.btnCoopReady.classList.add('ready-active');
    } else {
      this.dom.btnCoopReady.textContent = '🟢 ГОТОВ';
      this.dom.btnCoopReady.classList.remove('ready-active');
    }
  }

  startPublicKickTimer() {
    this.clearPublicKickTimer();
    if (!networkManager.isPublic && networkManager.roomId !== 'PUBLIC') return;
    if (this.isCoopReady) {
      if (this.dom.coopPublicTimerBanner) {
        this.dom.coopPublicTimerBanner.classList.remove('hidden');
        this.dom.coopPublicTimerBanner.innerHTML = '✅ <span style="color:#00ffaa;">ВЫ ГОТОВЫ! Ожидание остальных игроков...</span>';
      }
      return;
    }

    this.publicKickTimeLeft = 10;
    if (this.dom.coopPublicTimerBanner) {
      this.dom.coopPublicTimerBanner.classList.remove('hidden');
      this.dom.coopPublicTimerBanner.innerHTML = '⏱️ НАЖМИТЕ ГОТОВ: <span id="coop-kick-seconds" class="timer-countdown">10</span> сек (иначе кик)';
      this.dom.coopKickSeconds = document.getElementById('coop-kick-seconds');
    }

    this.publicKickInterval = setInterval(() => {
      this.publicKickTimeLeft--;
      if (this.dom.coopKickSeconds) {
        this.dom.coopKickSeconds.textContent = Math.max(0, this.publicKickTimeLeft);
      }
      if (this.publicKickTimeLeft <= 0) {
        this.clearPublicKickTimer();
      }
    }, 1000);
  }

  clearPublicKickTimer() {
    if (this.publicKickInterval) {
      clearInterval(this.publicKickInterval);
      this.publicKickInterval = null;
    }
    if (this.dom.coopPublicTimerBanner) {
      this.dom.coopPublicTimerBanner.classList.add('hidden');
    }
  }

  getAliveTeammates() {
    const list = [];
    for (const rp of this.remotePlayers.values()) {
      if (!rp.isDead && !rp.isDowned) {
        list.push(rp);
      }
    }
    if (list.length === 0) {
      for (const rp of this.remotePlayers.values()) {
        if (!rp.isDead) {
          list.push(rp);
        }
      }
    }
    return list;
  }

  startSpectating(reason = 'eliminated') {
    this.isSpectating = true;
    if (this.player && this.player.firstPersonBody) {
      this.player.firstPersonBody.setVisible(false);
    }
    if (document.exitPointerLock) {
      document.exitPointerLock();
    }
    if (this.dom.spectatorHud) {
      this.dom.spectatorHud.classList.remove('hidden');
    }
    if (this.dom.hudDownedBanner) {
      this.dom.hudDownedBanner.classList.add('hidden');
    }
    if (this.dom.hudRevivePrompt) {
      this.dom.hudRevivePrompt.classList.add('hidden');
    }

    const alive = this.getAliveTeammates();
    if (alive.length > 0) {
      this.spectatorIndex = 0;
      this.spectatorTargetId = alive[0].id;
      this.updateSpectatorUI(alive[0]);
    }
    this.showToast('👁️ РЕЖИМ НАБЛЮДАТЕЛЯ: Следи за напарниками! [◀] [▶] или ЛКМ / ПКМ');
  }

  stopSpectating() {
    this.isSpectating = false;
    this.spectatorTargetId = null;
    if (this.dom.spectatorHud) {
      this.dom.spectatorHud.classList.add('hidden');
    }
    if (this.player && this.player.firstPersonBody) {
      this.player.firstPersonBody.setVisible(true);
    }
  }

  cycleSpectatorTarget(dir = 1) {
    if (!this.isSpectating) return;
    const alive = this.getAliveTeammates();
    if (alive.length === 0) return;

    let curIdx = alive.findIndex(p => p.id === this.spectatorTargetId);
    if (curIdx === -1) curIdx = 0;
    this.spectatorIndex = (curIdx + dir + alive.length) % alive.length;
    const target = alive[this.spectatorIndex];
    if (target) {
      this.spectatorTargetId = target.id;
      this.updateSpectatorUI(target);
    }
  }

  updateSpectatorUI(target) {
    if (!this.dom.spectatorTargetName || !target) return;
    const status = target.isDowned ? ' (🆘 Загнан)' : ' (🟢 Жив)';
    this.dom.spectatorTargetName.textContent = `Наблюдение: ${target.name}${status}`;
  }

  updateSpectatorCamera(delta) {
    if (!this.isSpectating) return;
    let target = this.remotePlayers.get(this.spectatorTargetId);
    if (!target || target.isDead) {
      const alive = this.getAliveTeammates();
      if (alive.length > 0) {
        target = alive[0];
        this.spectatorTargetId = target.id;
        this.updateSpectatorUI(target);
      } else {
        return;
      }
    }

    const pos = target.root.position;
    const rotY = target.root.rotation.y || target.targetRotationY || 0;
    const dist = 3.6;
    const height = 1.7;
    const camX = pos.x - Math.sin(rotY) * dist;
    const camZ = pos.z - Math.cos(rotY) * dist;
    const camY = pos.y + height;

    this.camera.position.lerp(new THREE.Vector3(camX, camY, camZ), 10 * delta);
    this.camera.lookAt(pos.x, pos.y + 1.25, pos.z);
  }

  startMultiplayerGame(msg) {
    console.log('[Game] startMultiplayerGame executing with msg:', msg);
    this.stopSpectating();
    this.clearPublicKickTimer();
    this.player.isDead = false;
    this.player.setDowned(false);
    this.isCoopReady = false;
    this.updateReadyButtonUI();

    if (this.cutsceneManager) {
      this.cutsceneManager.stopCurrent();
    }

    this.isMultiplayer = true;
    this.state = STATE.PLAYING;
    this.elapsedTime = 0;
    this.shieldsCollected = 0;

    const seed = (msg && msg.seed !== undefined) ? msg.seed : (networkManager.roomSeed || 123456);
    const mapType = (msg && msg.mapType) ? msg.mapType : (networkManager.mapType || this.currentMapType);

    if (mapType && mapType !== this.currentMapType) {
      this.loadMap(mapType);
      if (this.dom.tabMapCrater && this.dom.tabMapMaze) {
        this.dom.tabMapCrater.classList.toggle('active', mapType === 'crater');
        this.dom.tabMapMaze.classList.toggle('active', mapType === 'maze');
      }
    }

    // Reset local entities with synchronized seed across all room players!
    this.resetPositions(seed);

    // Create 3D avatars for teammates
    for (const rp of this.remotePlayers.values()) {
      rp.destroy();
    }
    this.remotePlayers.clear();

    const players = msg.players || networkManager.players;
    players.forEach((p, idx) => {
      if (p.id !== networkManager.playerId) {
        const rp = new RemotePlayer(this.scene, p);
        let spawnP;
        if (this.map && this.map.isCrater) {
          spawnP = new THREE.Vector3((idx % 2 === 0 ? 1 : -1) * 2.2, 2.5, 16.0);
        } else {
          spawnP = this.map.getRandomSpawnPoint(this.player.position, 6);
          spawnP.y = 0;
        }
        rp.targetPosition.copy(spawnP);
        rp.root.position.copy(spawnP);
        this.remotePlayers.set(p.id, rp);
      }
    });

    // Sound engine initialization & music
    soundEngine.init();
    soundEngine.resume();
    soundEngine.stopHeartbeat();
    soundEngine.resetChaseMusic();

    if (this.dom.gameOverVideo) this.dom.gameOverVideo.pause();
    if (this.dom.victoryVideo) this.dom.victoryVideo.pause();
    if (this.dom.victoryAudio) this.dom.victoryAudio.pause();

    // UI Updates
    if (this.dom.coopModal) this.dom.coopModal.classList.add('hidden');
    this.dom.menuOverlay.classList.add('hidden');
    this.dom.gameOverModal.classList.add('hidden');
    if (this.dom.victoryModal) this.dom.victoryModal.classList.add('hidden');
    this.dom.hud.classList.remove('hidden');
    if (this.dom.hudCoopSquad) this.dom.hudCoopSquad.classList.remove('hidden');
    const crosshair = document.getElementById('crosshair');
    if (crosshair) crosshair.classList.remove('hidden');

    this.updateSquadHUD();

    try {
      this.renderer.domElement.requestPointerLock();
    } catch (e) {}

    this.showToast('🏃 КООПЕРАТИВНЫЙ ПОБЕГ НАЧАЛСЯ! СПАСАЙТЕ ДРУГ ДРУГА!');
  }

  updateSquadHUD() {
    if (!this.dom.squadList) return;
    this.dom.squadList.innerHTML = '';

    const pPos = this.player.position;

    // Local player status item
    const meItem = document.createElement('div');
    meItem.className = 'squad-member';
    let meStatus = '<span class="squad-status-text">🟢 ЖИВ</span>';
    if (this.isSpectating) {
      meStatus = '<span class="squad-status-text" style="color: #00f3ff;">👁️ НАБЛЮДАТЕЛЬ</span>';
    } else if (this.player.isDowned) {
      meStatus = '<span class="squad-status-text downed">🆘 ЗАГНАН!</span>';
    }
    meItem.innerHTML = `
      <div class="squad-dot" style="background: ${this.selectedColor}; color: ${this.selectedColor};"></div>
      <span>${networkManager.playerName} (Вы)</span>
      ${meStatus}
    `;
    this.dom.squadList.appendChild(meItem);

    // Teammates status items
    for (const [id, rp] of this.remotePlayers) {
      const rx = (rp.root && rp.root.position) ? rp.root.position.x : (rp.position ? rp.position.x : 0);
      const rz = (rp.root && rp.root.position) ? rp.root.position.z : (rp.position ? rp.position.z : 0);
      const px = pPos ? pPos.x : 0;
      const pz = pPos ? pPos.z : 0;
      const dist = Math.hypot(rx - px, rz - pz);
      const item = document.createElement('div');
      item.className = 'squad-member';
      let statusText = `<span class="squad-status-text">🟢 [${dist.toFixed(0)}m]</span>`;
      if (rp.isDead) {
        statusText = `<span class="squad-status-text" style="color:#888;">💀 ПОТЕРЯН</span>`;
      } else if (rp.isDowned) {
        statusText = `<span class="squad-status-text downed">🆘 [${dist.toFixed(0)}m]</span>`;
      }

      item.innerHTML = `
        <div class="squad-dot" style="background: ${rp.colorHex}; color: ${rp.colorHex};"></div>
        <span>${rp.name}</span>
        ${statusText}
      `;
      this.dom.squadList.appendChild(item);
    }
  }

  updateReviveMechanic(delta) {
    // 1. If local player is downed: show downed banner and handle timer
    if (this.player.isDowned) {
      if (this.dom.hudDownedBanner) {
        this.dom.hudDownedBanner.classList.remove('hidden');
        if (this.dom.downedTimerNum) {
          this.dom.downedTimerNum.textContent = Math.ceil(this.player.downedTimer);
        }
      }
      if (this.player.downedTimer <= 0) {
        // Player failed to be revived -> eliminate and enter spectator if teammates alive
        this.player.isDead = true;
        networkManager.sendPlayerEliminated('bleedout');
        const alive = this.getAliveTeammates();
        if (alive.length > 0) {
          this.startSpectating('bleedout');
        } else {
          this.triggerGameOver('girl_caught');
        }
        return;
      }
    } else if (this.dom.hudDownedBanner) {
      this.dom.hudDownedBanner.classList.add('hidden');
    }

    // 2. If local player is alive: check proximity to downed teammates for revive
    if (!this.player.isDowned) {
      const pPos = this.player.position;
      let closestDownedTeammate = null;
      let closestDist = 2.6; // Within 2.6 meters

      for (const [id, rp] of this.remotePlayers) {
        if (rp.isDowned) {
          const d = Math.hypot(rp.root.position.x - pPos.x, rp.root.position.z - pPos.z);
          if (d < closestDist) {
            closestDist = d;
            closestDownedTeammate = rp;
          }
        }
      }

      if (closestDownedTeammate) {
        if (this.dom.hudRevivePrompt) {
          this.dom.hudRevivePrompt.classList.remove('hidden');
          if (this.dom.reviveTargetName) {
            this.dom.reviveTargetName.textContent = `СПАСТИ ${closestDownedTeammate.name}`;
          }
        }

        if (this.player.isHoldingRevive) {
          this.reviveProgress = Math.min(1.0, this.reviveProgress + delta / 2.0);
          if (this.dom.reviveRingFill) {
            this.dom.reviveRingFill.style.strokeDashoffset = (113 - 113 * this.reviveProgress).toString();
          }

          if (this.reviveProgress >= 1.0) {
            // Revive successful!
            this.reviveProgress = 0;
            closestDownedTeammate.setDowned(false);
            networkManager.sendPlayerRevived(closestDownedTeammate.id, networkManager.playerName);
            this.showToast(`❤️ ТЫ СПАС ДЕВСТВЕННОСТЬ ${closestDownedTeammate.name}!`);
            soundEngine.playPickup();
          }
        } else {
          this.reviveProgress = Math.max(0, this.reviveProgress - delta * 2.5);
          if (this.dom.reviveRingFill) {
            this.dom.reviveRingFill.style.strokeDashoffset = (113 - 113 * this.reviveProgress).toString();
          }
        }
      } else {
        if (this.dom.hudRevivePrompt) {
          this.dom.hudRevivePrompt.classList.add('hidden');
        }
        this.reviveProgress = 0;
      }
    }
  }

  openChat() {
    this.chatOpen = true;
    if (this.dom.hudChatBox) {
      this.dom.hudChatBox.classList.remove('hidden');
      if (this.dom.chatInput) {
        this.dom.chatInput.focus();
      }
    }
    if (document.exitPointerLock) {
      document.exitPointerLock();
    }
  }

  closeChat() {
    this.chatOpen = false;
    if (this.dom.hudChatBox) {
      this.dom.hudChatBox.classList.add('hidden');
    }
    if (this.state === STATE.PLAYING && this.renderer) {
      this.renderer.domElement.requestPointerLock();
    }
  }

  addChatMessage(sender, text, isMe = false) {
    if (!this.dom.chatLogs) return;
    const msgEl = document.createElement('div');
    msgEl.className = 'chat-msg';
    const color = isMe ? 'var(--cyan)' : 'var(--amber)';
    msgEl.innerHTML = `<span class="chat-sender" style="color: ${color}">${sender}:</span> <span class="chat-content">${text}</span>`;
    this.dom.chatLogs.appendChild(msgEl);
    this.dom.chatLogs.scrollTop = this.dom.chatLogs.scrollHeight;

    // Show chat box briefly even if not typing so player sees new messages
    if (!this.chatOpen && this.dom.hudChatBox) {
      this.dom.hudChatBox.classList.remove('hidden');
      clearTimeout(this.chatHideTimer);
      this.chatHideTimer = setTimeout(() => {
        if (!this.chatOpen && this.dom.hudChatBox) {
          this.dom.hudChatBox.classList.add('hidden');
        }
      }, 5000);
    }
  }
}

// Start game when page loads
function initGame() {
  try {
    window.gameInstance = new Game();
    if (new URLSearchParams(window.location.search).get('test_run') === '1') {
      setTimeout(() => {
        if (window.gameInstance && typeof window.gameInstance.startGame === 'function') {
          window.gameInstance.startGame();
        }
      }, 150);
    }
  } catch (err) {
    console.error('Failed to initialize game:', err);
  }
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', initGame);
} else {
  initGame();
}
