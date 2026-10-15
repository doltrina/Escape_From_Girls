import * as THREE from 'three';
import { GameMap } from './map.js';
import { Player } from './player.js';
import { NextbotGirl } from './nextbot.js';
import { ShieldManager } from './shields.js';
import { soundEngine } from './audio.js';
import { assetManager } from './customAssets.js';

// Game States
const STATE = {
  MENU: 'MENU',
  PLAYING: 'PLAYING',
  PAUSED: 'PAUSED',
  GAMEOVER: 'GAMEOVER'
};

class Game {
  constructor() {
    this.state = STATE.MENU;
    this.elapsedTime = 0;
    this.shieldsCollected = 0;
    this.highScore = parseFloat(localStorage.getItem('virginity_record') || '0');
    this.lastShieldRepelTime = 0;

    this.container = document.getElementById('game-canvas');
    this.initThree();
    this.initUI();
    this.initGameEntities();
    this.initCustomAssets();

    this.clock = new THREE.Clock();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  initThree() {
    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.container.appendChild(this.renderer.domElement);

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x06070a);
    this.scene.fog = new THREE.FogExp2(0x06070a, 0.035);

    // Camera
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);

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
    // Map
    this.map = new GameMap(this.scene);

    // Player
    this.player = new Player(this.camera, this.renderer.domElement, this.map);
    this.scene.add(this.player.camera);

    // Nextbot Girl
    this.girl = new NextbotGirl(this.scene, this.map, assetManager.girlTextureUrl);

    // Shield Manager
    // Shield Manager
    this.shieldManager = new ShieldManager(this.scene, this.map);

    // Player inventory callbacks
    this.player.onInventoryChange = (inv) => {
      this.updateHotbarUI(inv);
    };

    this.player.onItemUsed = (itemType, pos) => {
      if (itemType === 'dakimakura') {
        this.shieldManager.spawnDroppedDecoy(pos, this.girl, 5.0);
        this.showToast('🎎 ТЫ БРОСИЛ ДАКИМАКУРУ! ДЕВУШКА ОТВЛЕКЛАСЬ НА 5 СЕК!');
      }
    };

    this.player.onPassiveItemClicked = (typeId) => {
      if (typeId === 'd20_dice') {
        const count = this.player.inventory.d20_dice;
        this.showToast(`🎲 D20 Кость (${count} шт.): Защищает пассивно при ударе девушки!`);
      }
    };

    // Spawn initial positions
    this.resetPositions();
  }

  resetPositions() {
    const playerSpawn = this.map.getRandomSpawnPoint();
    this.player.spawnAt(playerSpawn);

    const girlSpawn = this.map.getRandomSpawnPoint(playerSpawn, 18);
    this.girl.spawn(girlSpawn);

    this.shieldManager.reset(playerSpawn);
    if (this.player.inventory) {
      this.updateHotbarUI(this.player.inventory);
    }
  }

  initUI() {
    this.dom = {
      hud: document.getElementById('hud'),
      hudTimer: document.getElementById('hud-timer'),
      hudRecord: document.getElementById('hud-record'),
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
      musicInput: document.getElementById('file-music-input'),
      musicTrackName: document.getElementById('music-track-name'),

      menuOverlay: document.getElementById('menu-overlay'),
      btnStart: document.getElementById('btn-start-game'),
      btnOpenSettings: document.getElementById('btn-open-settings'),

      settingsModal: document.getElementById('settings-modal'),
      btnCloseSettings: document.getElementById('btn-close-settings'),
      btnSaveSettings: document.getElementById('btn-save-settings'),
      btnResetAssets: document.getElementById('btn-reset-assets'),
      girlInput: document.getElementById('file-girl-input'),
      videoInput: document.getElementById('file-video-input'),
      girlPreview: document.getElementById('girl-preview-img'),
      videoPreview: document.getElementById('video-preview-player'),
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
      btnGoSettings: document.getElementById('btn-go-settings')
    };

    this.hasValidVideo = false;
    this.updateRecordDisplay();

    // Start Button
    this.dom.btnStart.addEventListener('click', () => {
      soundEngine.init();
      soundEngine.resume();
      this.startGame();
    });

    // Restart Button
    this.dom.btnRestart.addEventListener('click', () => {
      this.dom.gameOverModal.classList.add('hidden');
      this.dom.gameOverVideo.pause();
      this.startGame();
    });

    // Settings Buttons
    this.dom.btnOpenSettings.addEventListener('click', () => {
      this.dom.settingsModal.classList.remove('hidden');
    });

    this.dom.btnGoSettings.addEventListener('click', () => {
      this.dom.settingsModal.classList.remove('hidden');
    });

    this.dom.btnCloseSettings.addEventListener('click', () => {
      this.dom.settingsModal.classList.add('hidden');
    });

    this.dom.btnSaveSettings.addEventListener('click', () => {
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
    });

    // Hotbar Slot Click Handlers
    this.dom.slotForcefield.addEventListener('click', () => {
      if (this.player && this.player.useItem('forcefield')) {
        this.showToast('🛡️ СИЛОВОЕ ПОЛЕ АКТИВИРОВАНО!');
      }
    });
    this.dom.slotEnergyDrink.addEventListener('click', () => {
      if (this.player && this.player.useItem('energy_drink')) {
        this.showToast('⚡ МОНСТР ЭНЕРДЖИ: ТУРБО-БЕГ АКТИВЕН!');
      }
    });
    this.dom.slotDakimakura.addEventListener('click', () => {
      if (this.player) this.player.useItem('dakimakura');
    });
    this.dom.slotD20Dice.addEventListener('click', () => {
      if (this.player) this.player.useItem('d20_dice');
    });

    // Pointer Lock change listener to handle Escape / Unlocking
    document.addEventListener('pointerlockchange', () => {
      if (document.pointerLockElement !== this.renderer.domElement) {
        if (this.state === STATE.PLAYING) {
          this.pauseGame();
        }
      }
    });

    // Keyboard Hotkeys
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyR' && this.state === STATE.GAMEOVER) {
        this.dom.btnRestart.click();
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

    const d20Total = (inv.d20_dice || 0) + (this.player ? this.player.extraLives : 0);
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
      this.dom.nextbotAudio.src = '';
      soundEngine.setHasCustomMusic(false);
      if (this.dom.musicTrackName) {
        this.dom.musicTrackName.innerHTML = 'Загрузи свой MP3/WAV трек или положи в <code>assets/girl_music.mp3</code>';
      }
      if (this.dom.btnToggleSound) this.dom.btnToggleSound.style.display = 'none';
      this.showToast('Сброшено на стандартные ассеты');
    });

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

  startGame() {
    this.state = STATE.PLAYING;
    this.elapsedTime = 0;
    this.shieldsCollected = 0;
    this.resetPositions();

    this.dom.menuOverlay.classList.add('hidden');
    this.dom.gameOverModal.classList.add('hidden');
    this.dom.hud.classList.remove('hidden');

    if (soundEngine.hasCustomMusic && this.dom.nextbotAudio.src) {
      this.dom.nextbotAudio.play().catch(() => {});
    }

    this.renderer.domElement.requestPointerLock();
    this.showToast('🏃 БЕГИ! ОНА ИДЕТ ЗА ТОБОЙ!');
  }

  pauseGame() {
    this.state = STATE.PAUSED;
    this.dom.menuOverlay.classList.remove('hidden');
    if (this.dom.nextbotAudio) {
      this.dom.nextbotAudio.pause();
    }
    soundEngine.stopProceduralChaseLoop();
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

  triggerGameOver() {
    this.state = STATE.GAMEOVER;
    soundEngine.playGameOver();

    if (document.exitPointerLock) {
      document.exitPointerLock();
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

    // Show Game Over Modal
    this.dom.hud.classList.add('hidden');
    this.dom.gameOverModal.classList.remove('hidden');

    // Play video or fallback
    this.playGameOverMedia();
  }

  animate() {
    requestAnimationFrame(this.animate);

    const delta = this.clock.getDelta();

    if (this.state === STATE.PLAYING) {
      this.elapsedTime += delta;
      this.dom.hudTimer.textContent = this.formatTime(this.elapsedTime);

      // Update Player
      this.player.update(delta);

      // Update Girl Nextbot AI
      const distToGirl = this.girl.update(delta, this.player, this.elapsedTime);

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
      });

      // Girl Catch & Defense Check
      if (distToGirl < 1.7) {
        const now = performance.now();

        // 1. Invulnerability frames active (e.g., player was just saved by D20)
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
          }
        }
        // 3. D20 Extra Life Passive Save
        else if (this.player.inventory.d20_dice > 0 || this.player.extraLives > 0) {
          const saved = this.player.consumeD20Life();
          if (saved) {
            this.girl.repelFrom(this.player.position, 22.0, 6.5);
            this.showToast(`🎲 D20 СПАСЕНИЕ! Осталось костей: ${this.player.inventory.d20_dice}. БЕГИ!`);
          } else {
            this.triggerGameOver();
            return;
          }
        }
        // 4. No protection left -> Caught -> Game Over!
        else {
          this.triggerGameOver();
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
}

// Start game when page loads
function initGame() {
  try {
    window.gameInstance = new Game();
  } catch (err) {
    console.error('Failed to initialize game:', err);
  }
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', initGame);
} else {
  initGame();
}
