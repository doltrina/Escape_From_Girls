/**
 * 🎬 СИСТЕМА КАТСЦЕН (CUTSCENE MANAGER) v2.0
 * 
 * Кинематографические катсцены без статичных ИИ-картинок — полностью процедурные 3D-сцены:
 * 
 * - Уровень 1 (Лабиринт): 
 *   Пробуждение на полу от первого лица, покачивание камеры, SMS от друга (Mactraher)
 *   на интерактивный смартфон. ГГ тянется ответить, из тени выходит девушка (текстура, выбранная пользователем!).
 *   Диалоги сменяются по нажатию любой кнопки. Но когда девушка вырывает телефон —
 *   сцена разбития, бегства и подъёма камеры продолжается АВТОМАТИЧЕСКИ.
 * 
 * - Уровень 2 (Вулкан):
 *   Процедурная 3D-улица ночного города: ГГ идёт по тротуару среди неоновых вывесок и фонарей,
 *   встречает ту же девушку (кастомный скин). Девушка использует 3D-артефакт уменьшения:
 *   ГГ уменьшается до размера букашки, глядя снизу вверх на гигантскую девушку.
 *   Затем камера падает в жерло вулкана на дно к ярко-алой густой магме.
 *   Кадр на настоящий 3D-вертолёт в ярко-голубом небе с другом (Mactraher) и мегафоном.
 *   Затем плавная камера спускается на игрока с передачей управления, а вертолёт
 *   продолжает летать по кругу в небе!
 * 
 * Особенности:
 * - Смена реплик по нажатию любой клавиши / клику (с индикатором «Нажмите любую клавишу ▾»)
 * - Автоматический экшен при вырывании телефона
 * - Динамическая текстура девушки от пользователя (Custom Asset / Author Preset)
 * - Hold-to-Skip (удержание кнопки для полного пропуска)
 * - Счётчик ручных пропусков (> 2 раз за сессию предлагает отключить сюжет)
 * - Глобальная настройка в localStorage
 */

import * as THREE from 'three';
import { soundEngine } from './audio.js';

export class CutsceneManager {
  /**
   * @param {Object} game - Главный экземпляр игры
   */
  constructor(game) {
    this.game = game;
    this.isPlaying = false;
    this.currentLevel = null;
    this.onCompleteCallback = null;

    // Глобальная настройка пропуска катсцен
    this.skipCutscenesSetting = (localStorage.getItem('skip_cutscenes') === 'true');

    // Хранилище просмотренных катсцен за текущую сессию
    this.playedCutscenes = new Set();

    // Счётчик ручных пропусков за сессию
    this.manualSkipCount = 0;
    this.skipPromptShown = false;

    // Механика Hold-to-Skip (удержание кнопки для пропуска)
    this.isHoldingSkip = false;
    this.holdProgress = 0;
    this.holdDuration = 1.0;
    this.holdKeyDownTime = 0;

    // Пошаговая очередь диалогов и интерактивных сцен
    this.steps = [];
    this.currentStepIdx = -1;
    this.isWaitingForInput = false;
    this.isAutoAdvancing = false;

    // Таймеры и интервалы
    this.activeTimeouts = [];
    this.activeIntervals = [];

    // Процедурные 3D объекты для улицы и артефакта
    this.streetSceneGroup = null;
    this.cutsceneGirlMesh = null;
    this.artifactMesh = null;
    this.shrinkRayMesh = null;

    // Сохранённые параметры камеры
    this.originalCamPos = new THREE.Vector3();
    this.originalCamRot = new THREE.Euler();

    // Фиксация камеры на лице друга в вертолёте
    this.isLockedOnFriend = false;

    // Инициализация DOM-элементов
    this.initDOM();
    this.setupInputListeners();
  }

  /**
   * Получение активной текстуры девушки (выбранной пользователем)
   * @returns {string}
   */
  getGirlTextureUrl() {
    if (this.game && this.game.assetManager && this.game.assetManager.girlTextureUrl) {
      return this.game.assetManager.girlTextureUrl;
    }
    if (this.game && this.game.girl && this.game.girl.textureUrl) {
      return this.game.girl.textureUrl;
    }
    return './assets/girl.png';
  }

  /**
   * Инициализация элементов DOM
   */
  initDOM() {
    this.overlay = document.getElementById('cutscene-overlay');
    this.stage = document.getElementById('cutscene-stage');
    this.fxLayer = document.getElementById('cutscene-fx-layer');
    this.subtitlesBox = document.getElementById('cutscene-subtitles');
    this.speakerLabel = document.getElementById('subtitle-speaker');
    this.subtitleText = document.getElementById('subtitle-text');
    this.skipContainer = document.getElementById('cutscene-skip-container');
    this.skipRingFill = document.getElementById('skip-ring-fill');

    // Модальное окно при частом пропуске
    this.freqModal = document.getElementById('cutscene-freq-modal');
    this.btnFreqYes = document.getElementById('btn-freq-yes');
    this.btnFreqNo = document.getElementById('btn-freq-no');

    // Настройка чекбокса в главном меню настроек
    this.settingCheckbox = document.getElementById('setting-skip-cutscenes');
    if (this.settingCheckbox) {
      this.settingCheckbox.checked = this.skipCutscenesSetting;
      this.settingCheckbox.addEventListener('change', (e) => {
        this.setSkipCutscenes(e.target.checked);
      });
    }

    // Кнопка сброса истории катсцен
    this.btnResetCutscenes = document.getElementById('btn-reset-cutscenes');
    if (this.btnResetCutscenes) {
      this.btnResetCutscenes.addEventListener('click', () => {
        this.resetHistory();
        if (this.game && typeof this.game.showToast === 'function') {
          this.game.showToast('🎬 История катсцен сброшена! Сюжет будет показан снова.');
        }
      });
    }

    if (this.btnFreqYes) {
      this.btnFreqYes.addEventListener('click', () => {
        this.setSkipCutscenes(true);
        if (this.freqModal) this.freqModal.classList.add('hidden');
        if (this.game && typeof this.game.showToast === 'function') {
          this.game.showToast('🎬 Катсцены отключены в настройках!');
        }
      });
    }

    if (this.btnFreqNo) {
      this.btnFreqNo.addEventListener('click', () => {
        if (this.freqModal) this.freqModal.classList.add('hidden');
      });
    }
  }

  /**
   * Настройка интерактивного перехода по нажатию любой кнопки
   * и зажатия для пропуска (Hold-to-Skip)
   */
  setupInputListeners() {
    // Нажатие клавиши: быстрое нажатие перелистывает реплику, удержание пропускает катсцену
    window.addEventListener('keydown', (e) => {
      if (!this.isPlaying) return;

      // Если зажат пробел, Esc или Enter — начинаем отсчёт удержания для пропуска
      if (e.code === 'Space' || e.code === 'Escape' || e.code === 'Enter') {
        if (!this.isHoldingSkip) {
          this.isHoldingSkip = true;
          this.holdKeyDownTime = performance.now();
        }
      }

      // Переход к следующей реплике по нажатию любой кнопки (если не заблокировано авто-экшеном)
      if (this.isWaitingForInput && !this.isAutoAdvancing) {
        this.advanceStep();
      }
    });

    window.addEventListener('keyup', (e) => {
      if (!this.isPlaying) return;
      if (e.code === 'Space' || e.code === 'Escape' || e.code === 'Enter') {
        this.isHoldingSkip = false;
      }
    });

    // Клик мышью / тачскрин
    if (this.overlay) {
      this.overlay.addEventListener('pointerdown', (e) => {
        if (!this.isPlaying) return;
        this.isHoldingSkip = true;
        this.holdKeyDownTime = performance.now();

        // Клик также перелистывает реплику
        if (this.isWaitingForInput && !this.isAutoAdvancing) {
          this.advanceStep();
        }
      });

      window.addEventListener('pointerup', () => {
        if (this.isPlaying) {
          this.isHoldingSkip = false;
        }
      });
    }
  }

  /**
   * Проверка необходимости показа катсцены
   */
  shouldPlayCutscene(levelId, isRestart = false) {
    if (this.skipCutscenesSetting) return false;
    if (this.game && this.game.isMultiplayer) return false;
    // При быстром перезапуске уровня катсцена не повторяется
    if (isRestart) return false;
    // При старте игры из главного меню катсцена запускается всегда
    return true;
  }

  setSkipCutscenes(value) {
    this.skipCutscenesSetting = !!value;
    localStorage.setItem('skip_cutscenes', this.skipCutscenesSetting ? 'true' : 'false');
    if (this.settingCheckbox) {
      this.settingCheckbox.checked = this.skipCutscenesSetting;
    }
  }

  resetHistory() {
    this.playedCutscenes.clear();
  }

  /**
   * Главный запуск катсцены
   */
  play(levelId, onComplete) {
    this.stopCurrent();

    this.isPlaying = true;
    this.currentLevel = levelId;
    this.onCompleteCallback = onComplete;
    this.isHoldingSkip = false;
    this.holdProgress = 0;
    this.isWaitingForInput = false;
    this.isAutoAdvancing = false;
    this.isLockedOnFriend = false;
    this.steps = [];
    this.currentStepIdx = -1;
    this.updateSkipProgressUI();

    this.playedCutscenes.add(levelId);

    // Скрываем модель первого лица игрока, чтобы камера со стороны не видела обезглавленное тело
    if (this.game && this.game.player && this.game.player.fpBody && this.game.player.fpBody.lowerBodyGroup) {
      this.game.player.fpBody.lowerBodyGroup.visible = false;
    }
    if (this.game && this.game.girl && this.game.girl.meshGroup) {
      this.game.girl.meshGroup.visible = false;
    }
    if (this.game && this.game.shieldManager && this.game.shieldManager.playerAura) {
      this.game.shieldManager.playerAura.visible = false;
    }

    if (this.overlay) this.overlay.classList.remove('hidden');
    if (this.skipContainer) this.skipContainer.classList.remove('hidden');
    if (this.stage) this.stage.innerHTML = '';
    if (this.fxLayer) this.fxLayer.className = 'cutscene-fx-layer';

    this.originalCamPos.copy(this.game.camera.position);
    this.originalCamRot.copy(this.game.camera.rotation);

    if (levelId === 'maze') {
      this.buildMazeCutsceneSteps();
    } else {
      this.buildVolcanoCutsceneSteps();
    }

    // Запуск первого шага
    this.advanceStep();
  }

  /**
   * Переход к следующему шагу катсцены
   */
  advanceStep() {
    if (!this.isPlaying) return;

    this.currentStepIdx++;
    if (this.currentStepIdx >= this.steps.length) {
      this.complete();
      return;
    }

    const step = this.steps[this.currentStepIdx];
    this.isWaitingForInput = !step.autoAdvance;
    this.isAutoAdvancing = !!step.autoAdvance;

    // Выполнение действия шага
    if (typeof step.action === 'function') {
      step.action();
    }

    // Показ реплики (если задана)
    if (step.text) {
      this.showSubtitle(step.speaker || '', step.text, !step.autoAdvance);
    } else {
      this.hideSubtitles();
    }
  }

  // =========================================================================
  // 🎬 УРОВЕНЬ 1: ЛАБИРИНТ (MAZE)
  // =========================================================================

  buildMazeCutsceneSteps() {
    const pSpawn = this.game.player.position;
    const floorY = pSpawn.y - this.game.player.eyeHeight;

    this.steps = [
      // 1. Пробуждение на полу (головокружение)
      {
        autoAdvance: false,
        speaker: 'ГГ (вид от первого лица)',
        text: 'Ох-х... Голова трещит... Где я вообще нахожусь?..',
        action: () => {
          this.game.camera.position.set(pSpawn.x, floorY + 0.45, pSpawn.z);
          this.game.camera.rotation.set(-0.12, this.game.player.yaw, 0, 'YXZ');
          soundEngine.playWakingBreath();
          this.setFX('fx-waking-eyes');
        }
      },

      // 2. Смартфон достаётся из кармана и всплывает SMS от Бро
      {
        autoAdvance: false,
        speaker: 'Входящее SMS от Бро (Mactraher)',
        text: '«Йоу, чувак! Как прошла свиданка с той девчулей? Ты просто не отвечаешь. Я переживаю, бро».',
        action: () => {
          this.renderSmartphoneView();
          soundEngine.playPhoneVibrate();
          soundEngine.playSmsNotification();
        }
      },

      // 3. Попытка напечатать ответ
      {
        autoAdvance: false,
        speaker: 'ГГ',
        text: 'Надо срочно ответить... «Бро, кажется, меня похит...»',
        action: () => {
          this.startTypingReply();
        }
      },

      // 4. Появление девушки из тени (ДИНАМИЧЕСКИЙ СКИН ПОЛЬЗОВАТЕЛЯ!)
      {
        autoAdvance: false,
        speaker: 'Девушка',
        text: 'Хи-хи-хи... С кем это ты там переписываешься?!',
        action: () => {
          this.triggerGirlAmbush(this.getGirlTextureUrl());
        }
      },

      // 5. ДРАМАТИЧЕСКИЙ ЭКШЕН: ВЫРЫВАНИЕ И РАЗБИВАНИЕ ТЕЛЕФОНА (АВТОМАТИЧЕСКИЙ!)
      // "Но когда девушка вырывает телефон продолжение должно быть автоматическим."
      {
        autoAdvance: true,
        speaker: 'ГГ',
        text: 'Чёрт! Мой телефон! Она здесь... Надо уносить ноги!',
        action: () => {
          this.hidePromptIndicator();
          // Автоматическая непрерывная цепочка паники:
          soundEngine.playPhoneSnatch();
          this.smashSmartphone();
          soundEngine.playGlassShatter();

          // Через 1.4 секунды камера плавно встаёт во весь рост
          this.addTimeout(() => {
            this.standUpPlayerSmoothly(floorY + 0.45, floorY + this.game.player.eyeHeight, 1.3);
          }, 1400);

          // Через 2.8 секунды — полный старт игры
          this.addTimeout(() => {
            this.complete();
          }, 2800);
        }
      }
    ];
  }

  /**
   * Отрисовка смартфона
   */
  renderSmartphoneView() {
    if (!this.stage) return;
    this.stage.innerHTML = `
      <div class="cs-phone-wrapper" id="cs-phone-body">
        <div class="cs-phone-notch"></div>
        <div class="cs-phone-screen">
          <div class="cs-phone-statusbar">
            <span>02:43</span>
            <span>📶 4G 🔋 87%</span>
          </div>
          <div class="cs-sms-card pop-in">
            <img class="cs-sms-avatar" src="./assets/mactraher.jpg" alt="Бро">
            <div class="cs-sms-content">
              <div class="cs-sms-sender">💬 Бро (Mactraher)</div>
              <div class="cs-sms-bubble">Йоу, чувак! Как прошла свиданка с той девчулей? Ты просто не отвечаешь. Я переживаю, бро.</div>
            </div>
          </div>
          <div class="cs-phone-input-bar">
            <span class="cs-typed-text" id="cs-typed-reply"></span>
            <span class="cs-cursor">|</span>
          </div>
        </div>
      </div>
    `;
  }

  startTypingReply() {
    const textTarget = 'Бро, кажется, меня похит...';
    const replyElem = document.getElementById('cs-typed-reply');
    if (!replyElem) return;

    let charIdx = 0;
    const typeInterval = setInterval(() => {
      if (!this.isPlaying || charIdx >= textTarget.length) {
        clearInterval(typeInterval);
        return;
      }
      replyElem.textContent += textTarget[charIdx];
      soundEngine.playKeyboardTap();
      charIdx++;
    }, 75);
    this.activeIntervals.push(typeInterval);
  }

  /**
   * Появление девушки с пользовательской текстурой и анимацией
   */
  triggerGirlAmbush(textureUrl) {
    const ambushCard = document.createElement('div');
    ambushCard.className = 'cs-girl-shadow-ambush dynamic-girl-enter';
    ambushCard.innerHTML = `
      <img src="${textureUrl}" class="cs-girl-sprite-dynamic" alt="Девушка Nextbot">
      <div class="cs-girl-red-glare"></div>
    `;
    if (this.stage) this.stage.appendChild(ambushCard);

    this.shakeCamera(0.08, 450);
  }

  smashSmartphone() {
    const phone = document.getElementById('cs-phone-body');
    if (phone) {
      phone.classList.add('snatched-and-smashed');
    }

    const shatterOverlay = document.createElement('div');
    shatterOverlay.className = 'cs-shatter-cracks-overlay';
    if (this.stage) this.stage.appendChild(shatterOverlay);

    this.shakeCamera(0.22, 700);
  }

  standUpPlayerSmoothly(startHeight, endHeight, durationSec) {
    const startTime = performance.now();
    const startPitch = this.game.camera.rotation.x;
    const targetPitch = 0;

    const liftInterval = setInterval(() => {
      if (!this.isPlaying) {
        clearInterval(liftInterval);
        return;
      }
      const elapsed = (performance.now() - startTime) / (durationSec * 1000);
      const t = Math.min(1, Math.max(0, elapsed));
      const smooth = t * t * (3 - 2 * t);

      this.game.camera.position.y = startHeight + (endHeight - startHeight) * smooth;
      this.game.camera.rotation.x = startPitch + (targetPitch - startPitch) * smooth;

      if (t >= 1) {
        clearInterval(liftInterval);
      }
    }, 16);
    this.activeIntervals.push(liftInterval);
  }

  // =========================================================================
  // 🎬 УРОВЕНЬ 2: ВУЛКАН (VOLCANO) — ПРОЦЕДУРНЫЕ 3D-СЦЕНЫ БЕЗ ИИ
  // =========================================================================

  buildVolcanoCutsceneSteps() {
    const pSpawn = this.game.player.position;

    this.steps = [
      // 1. Процедурная 3D-улица: ГГ идёт и видит девушку
      {
        autoAdvance: false,
        speaker: 'ГГ (на улице)',
        text: 'Кажется, вон та девушка на улице... Надо подойти познакомиться.',
        action: () => {
          this.buildProcedural3DStreet();
          this.animateGGWalkingTowardsGirl();
        }
      },

      // 2. ГГ заговаривает с ней
      {
        autoAdvance: false,
        speaker: 'ГГ',
        text: 'Привет, красотка! Слушай, нам надо поговорить...',
        action: () => {
          // Камера стоит перед девушкой, девушка покачивается
          this.pulseGirlAura();
        }
      },

      // 3. Девушка достаёт артефакт уменьшения
      {
        autoAdvance: false,
        speaker: 'Девушка',
        text: 'Познакомиться? Хи-хи... Посмотрим, как ты заговоришь вот так!',
        action: () => {
          this.showArtifactShrinkRay();
          soundEngine.playMagicShrink();
        }
      },

      // 4. Эффект уменьшения ГГ: перспектива сжимается, девушка вырастает до небес
      {
        autoAdvance: false,
        speaker: 'ГГ',
        text: 'А-А-А! ЧТО ЭТО ЗА АРТЕФАКТ?! Я... Я УМЕНЬШАЮСЬ?!',
        action: () => {
          this.shrinkGGDownToGround();
        }
      },

      // 5. Падение в жерло вулкана на дно кратера к ярко-красной магме
      {
        autoAdvance: false,
        speaker: 'Дно Месячного Вулкана',
        text: 'Я на дне кратера вулкана... А вокруг бурлит ярко-алая густая магма...',
        action: () => {
          this.removeProcedural3DStreet();
          this.setFX('fx-flash-white');
          this.plungeCameraIntoCrater();
        }
      },

      // 6. КАДР НА ВЕРТОЛЁТ В КРАСНОМ НЕБЕ С ДРУГОМ (КАМЕРА ЗАФИКСИРОВАНА НА ЛИЦЕ ДРУГА)
      {
        autoAdvance: false,
        speaker: 'Друг (в мегафон с вертолёта)',
        text: '«Бро! Я физически не могу залететь внутрь этого пекла! Выбирайся оттуда, и я тебя подберу!»',
        action: () => {
          soundEngine.startHelicopterSound();
          this.frameHelicopterShotInRedSky();
          soundEngine.playMegaphoneChime();
          soundEngine.speakMegaphone('Бро! Я физически не могу залететь внутрь этого пекла! Выбирайся оттуда, и я тебя подберу!');
        }
      },

      // 7. Плавный спуск камеры на игрока и передача управления (вертолёт кружит в небе)
      {
        autoAdvance: true,
        speaker: 'Цель',
        text: 'Выбирайся на вершину к Вратам Тории! Друг прикроет с вертолёта!',
        action: () => {
          this.isLockedOnFriend = false;
          this.hidePromptIndicator();
          this.glideCameraFromSkyToPlayer(pSpawn, 1.8, () => {
            this.complete();
          });
        }
      }
    ];
  }

  // =========================================================================
  // 🏙️ ПРОЦЕДУРНАЯ 3D-УЛИЦА И АРТЕФАКТ УМЕНЬШЕНИЯ (БЕЗ ИИ-КАРТИНОК)
  // =========================================================================

  buildProcedural3DStreet() {
    this.removeProcedural3DStreet();

    this.streetSceneGroup = new THREE.Group();
    this.streetSceneGroup.position.set(0, 100, 0); // Высоко над картой во временном пространстве

    // 1. Асфальтовая дорога с разметкой
    const roadGeo = new THREE.PlaneGeometry(14, 50);
    const roadMat = new THREE.MeshStandardMaterial({
      color: 0x141820,
      roughness: 0.85,
      metalness: 0.1
    });
    const roadMesh = new THREE.Mesh(roadGeo, roadMat);
    roadMesh.rotation.x = -Math.PI / 2;
    this.streetSceneGroup.add(roadMesh);

    // Белые и жёлтые полосы разметки
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xffcc00 });
    for (let l = -20; l <= 20; l += 5) {
      const lineMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 2.5), lineMat);
      lineMesh.rotation.x = -Math.PI / 2;
      lineMesh.position.set(0, 0.02, l);
      this.streetSceneGroup.add(lineMesh);
    }

    // 2. Тротуары с бордюрами
    const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0x252e3d, roughness: 0.7 });
    [-5.5, 5.5].forEach((sx) => {
      const sw = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.35, 50), sidewalkMat);
      sw.position.set(sx, 0.18, 0);
      this.streetSceneGroup.add(sw);
    });

    // 3. Здания с неоновыми вывесками
    const buildMat = new THREE.MeshStandardMaterial({ color: 0x090c12, roughness: 0.9 });
    [-11, 11].forEach((bx) => {
      for (let bz = -20; bz <= 20; bz += 10) {
        const h = 18 + Math.random() * 12;
        const b = new THREE.Mesh(new THREE.BoxGeometry(7, h, 8), buildMat);
        b.position.set(bx, h / 2, bz);
        this.streetSceneGroup.add(b);

        // Неоновая вывеска на фасаде
        const neonColor = (Math.random() < 0.5) ? 0x00f3ff : 0xff0077;
        const signMat = new THREE.MeshBasicMaterial({ color: neonColor });
        const sign = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.2, 3.5), signMat);
        sign.position.set(bx + (bx > 0 ? -3.6 : 3.6), 5 + Math.random() * 4, bz);
        this.streetSceneGroup.add(sign);
      }
    });

    // 4. Фонарный столб со световым конусом (смещён к бордюру тротуара, чтобы не перегораживать девушку)
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x3a4454, metalness: 0.8 });
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 6, 8), poleMat);
    pole.position.set(7.2, 3, -0.6);
    this.streetSceneGroup.add(pole);

    // Изогнутая стрела фонаря, нависающая над тротуаром сбоку
    const armGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.4, 8);
    const arm = new THREE.Mesh(armGeo, poleMat);
    arm.position.set(6.1, 5.7, -0.25);
    arm.rotation.z = Math.PI / 3;
    this.streetSceneGroup.add(arm);

    const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffea88 }));
    lantern.position.set(5.2, 5.8, 0);
    this.streetSceneGroup.add(lantern);

    const streetSpot = new THREE.SpotLight(0xffea88, 4.5, 18, Math.PI / 4, 0.4);
    streetSpot.position.set(5.2, 5.7, 0);
    const spotTarget = new THREE.Object3D();
    spotTarget.position.set(4.2, 0, 0);
    this.streetSceneGroup.add(spotTarget);
    streetSpot.target = spotTarget;
    this.streetSceneGroup.add(streetSpot);

    // 5. ДЕВУШКА С ПОЛЬЗОВАТЕЛЬСКИМ СКИНАМИ СТОИТ ПОД ФОНАРЕМ
    const girlTexUrl = this.getGirlTextureUrl();
    const texLoader = new THREE.TextureLoader();
    const girlTex = texLoader.load(girlTexUrl);
    const girlMat = new THREE.SpriteMaterial({ map: girlTex });
    this.cutsceneGirlMesh = new THREE.Sprite(girlMat);
    this.cutsceneGirlMesh.scale.set(2.4, 2.4, 1);
    this.cutsceneGirlMesh.position.set(4.2, 1.25, 0);
    this.streetSceneGroup.add(this.cutsceneGirlMesh);

    // Розовая подсветка снизу
    this.girlUnderLight = new THREE.PointLight(0xff0077, 3.0, 6);
    this.girlUnderLight.position.set(4.2, 0.5, 0);
    this.streetSceneGroup.add(this.girlUnderLight);

    this.game.scene.add(this.streetSceneGroup);
  }

  animateGGWalkingTowardsGirl() {
    const startPos = new THREE.Vector3(4.2, 101.7, 14);
    const targetPos = new THREE.Vector3(4.2, 101.7, 3.2);

    this.game.camera.position.copy(startPos);
    this.game.camera.rotation.set(0, 0, 0, 'YXZ');

    const startTime = performance.now();
    const duration = 2400;

    const walkInterval = setInterval(() => {
      if (!this.isPlaying || !this.streetSceneGroup) {
        clearInterval(walkInterval);
        return;
      }
      const elapsed = performance.now() - startTime;
      const t = Math.min(1, elapsed / duration);
      const smooth = t * t * (3 - 2 * t);

      // Движение вперед с покачиванием головы при ходьбе
      this.game.camera.position.z = startPos.z + (targetPos.z - startPos.z) * smooth;
      this.game.camera.position.y = 101.7 + Math.sin(t * Math.PI * 8) * 0.08;

      if (t >= 1) {
        clearInterval(walkInterval);
        this.game.camera.position.set(4.2, 101.7, 3.2);
      }
    }, 16);
    this.activeIntervals.push(walkInterval);
  }

  pulseGirlAura() {
    if (this.girlUnderLight) {
      this.girlUnderLight.intensity = 5.5;
    }
  }

  /**
   * Появление светящегося 3D-артефакта в руках девушки и энергетический луч
   */
  showArtifactShrinkRay() {
    if (!this.streetSceneGroup || !this.cutsceneGirlMesh) return;

    // 3D-Артефакт: сияющий многогранник с вращающимся неоновым кольцом
    const artGroup = new THREE.Group();
    artGroup.position.set(4.2, 101.4, 0.6);

    const coreGeo = new THREE.OctahedronGeometry(0.35, 1);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff });
    const core = new THREE.Mesh(coreGeo, coreMat);
    artGroup.add(core);

    const ringGeo = new THREE.TorusGeometry(0.5, 0.04, 8, 24);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xff0077 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    artGroup.add(ring);

    this.streetSceneGroup.add(artGroup);
    this.artifactMesh = artGroup;

    // Энергетический конус луча, бьющий в сторону игрока
    const rayGeo = new THREE.ConeGeometry(1.6, 4.0, 16, 1, true);
    const rayMat = new THREE.MeshBasicMaterial({
      color: 0xff00aa,
      transparent: true,
      opacity: 0.65,
      side: THREE.DoubleSide
    });
    this.shrinkRayMesh = new THREE.Mesh(rayGeo, rayMat);
    this.shrinkRayMesh.rotation.x = -Math.PI / 2;
    this.shrinkRayMesh.position.set(4.2, 101.5, 2.0);
    this.streetSceneGroup.add(this.shrinkRayMesh);

    this.setFX('fx-warp-shrink');
  }

  /**
   * Эффект уменьшения ГГ: камера падает к тротуару, девушка гигантски вырастает
   */
  shrinkGGDownToGround() {
    const startTime = performance.now();
    const duration = 1800;

    const shrinkInterval = setInterval(() => {
      if (!this.isPlaying || !this.cutsceneGirlMesh) {
        clearInterval(shrinkInterval);
        return;
      }
      const elapsed = performance.now() - startTime;
      const t = Math.min(1, elapsed / duration);
      const smooth = t * t * (3 - 2 * t);

      // Камера ГГ падает на асфальт (высота букашки: 0.1м)
      this.game.camera.position.y = 101.7 - 1.6 * smooth;
      // Взгляд запрокидывается вверх на гигантскую девушку
      this.game.camera.rotation.x = 0.85 * smooth;

      // Девушка вырастает с точки зрения маленького ГГ
      const currentScale = 2.4 + 14.0 * smooth;
      this.cutsceneGirlMesh.scale.set(currentScale, currentScale, 1);
      this.cutsceneGirlMesh.position.y = 1.25 + 6.0 * smooth;

      if (t >= 1) {
        clearInterval(shrinkInterval);
      }
    }, 16);
    this.activeIntervals.push(shrinkInterval);
  }

  removeProcedural3DStreet() {
    if (this.streetSceneGroup && this.game && this.game.scene) {
      this.streetSceneGroup.traverse((child) => {
        if (child.isMesh) {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
            else child.material.dispose();
          }
        }
      });
      this.game.scene.remove(this.streetSceneGroup);
      this.streetSceneGroup = null;
    }
  }

  /**
   * Падение в жерло вулкана
   */
  plungeCameraIntoCrater() {
    // Звук свиста раскалённого ветра при свободном падении
    soundEngine.playVolcanoWindDescent();

    // Гарантированно скрываем обезглавленную модель первого лица игрока и девушку
    if (this.game && this.game.player && this.game.player.fpBody && this.game.player.fpBody.lowerBodyGroup) {
      this.game.player.fpBody.lowerBodyGroup.visible = false;
    }
    if (this.game && this.game.girl && this.game.girl.meshGroup) {
      this.game.girl.meshGroup.visible = false;
    }
    if (this.game && this.game.shieldManager && this.game.shieldManager.playerAura) {
      this.game.shieldManager.playerAura.visible = false;
    }

    const pSpawn = this.game.player.position;
    const floorY = pSpawn.y;
    const startFallY = floorY + 45;

    this.game.camera.position.set(pSpawn.x, startFallY, pSpawn.z);
    this.game.camera.rotation.set(-0.7, 0, 0, 'YXZ');

    const startTime = performance.now();
    const durationMs = 1900;

    const fallInterval = setInterval(() => {
      if (!this.isPlaying) {
        clearInterval(fallInterval);
        return;
      }
      const elapsed = performance.now() - startTime;
      const t = Math.min(1, elapsed / durationMs);
      const fallCurve = t * t * t;

      this.game.camera.position.y = startFallY - (startFallY - floorY) * fallCurve;
      this.game.camera.rotation.x = -0.7 * (1 - t);

      // Динамический эффект искажения FOV (падение на высокой скорости)
      if (this.game && this.game.camera && this.game.camera.fov !== undefined) {
        this.game.camera.fov = 75 + Math.sin(t * Math.PI) * 15;
        this.game.camera.updateProjectionMatrix();
      }

      if (t >= 1) {
        clearInterval(fallInterval);
        if (this.game && this.game.camera && this.game.camera.fov !== undefined) {
          this.game.camera.fov = 75;
          this.game.camera.updateProjectionMatrix();
        }
        this.shakeCamera(0.2, 500);
      }
    }, 16);
    this.activeIntervals.push(fallInterval);
  }

  /**
   * КАДР НА 3D ВЕРТОЛЁТ В КРАСНОМ НЕБЕ С ДРУГОМ (ТРЕБОВАНИЕ 3)
   * Камера привязывается к вертолёту и зафиксирована на лице друга
   */
  frameHelicopterShotInRedSky() {
    this.isLockedOnFriend = true;

    // Получаем вертолёт и спрайт друга из карты вулкана
    const heliGroup = (this.game.map && this.game.map.helicopterGroup) ? this.game.map.helicopterGroup : null;
    const friendSprite = (this.game.map && this.game.map.friendSprite) ? this.game.map.friendSprite : null;

    if (heliGroup && friendSprite) {
      const friendFaceWorld = friendSprite.getWorldPosition(new THREE.Vector3());
      friendFaceWorld.y += 0.15;

      // Отдалённая локальная точка камеры: широкий кинематографический ракурс на вертолёт и друга
      const camLocal = new THREE.Vector3(3.60, 0.35, 0.60);
      const camWorld = camLocal.clone();
      heliGroup.localToWorld(camWorld);

      this.game.camera.position.copy(camWorld);
      this.game.camera.lookAt(friendFaceWorld);
    } else if (heliGroup) {
      const hPos = heliGroup.position;
      this.game.camera.position.set(hPos.x + 5.5, hPos.y + 0.5, hPos.z + 5.5);
      this.game.camera.lookAt(hPos.x, hPos.y, hPos.z);
    } else {
      // Запасной ракурс в небо
      this.game.camera.rotation.set(0.7, 0, 0, 'YXZ');
    }
  }

  /**
   * Плавный спуск камеры из неба на игрока с передачей управления
   */
  glideCameraFromSkyToPlayer(targetPos, durationSec, onDone) {
    const startPos = this.game.camera.position.clone();
    const startRot = this.game.camera.rotation.clone();
    const targetY = targetPos.y;
    const targetPitch = 0;
    const targetYaw = this.game.player.yaw;

    const startTime = performance.now();

    const glideInterval = setInterval(() => {
      if (!this.isPlaying) {
        clearInterval(glideInterval);
        return;
      }
      const elapsed = (performance.now() - startTime) / (durationSec * 1000);
      const t = Math.min(1, Math.max(0, elapsed));
      const smooth = t * t * (3 - 2 * t);

      // Плавная интерполяция позиции камеры
      this.game.camera.position.x = startPos.x + (targetPos.x - startPos.x) * smooth;
      this.game.camera.position.y = startPos.y + (targetY - startPos.y) * smooth;
      this.game.camera.position.z = startPos.z + (targetPos.z - startPos.z) * smooth;

      // Выравнивание угла взгляда в горизонталь
      this.game.camera.rotation.x = startRot.x + (targetPitch - startRot.x) * smooth;
      this.game.camera.rotation.y = startRot.y + (targetYaw - startRot.y) * smooth;
      this.game.camera.rotation.z = startRot.z * (1 - smooth);

      if (t >= 1) {
        clearInterval(glideInterval);
        if (typeof onDone === 'function') onDone();
      }
    }, 16);
    this.activeIntervals.push(glideInterval);
  }

  // =========================================================================
  // 💬 СУБТИТРЫ, ИНДИКАТОРЫ И ТРЯСКА КАМЕРЫ
  // =========================================================================

  showSubtitle(speaker, text, showPrompt = true) {
    if (!this.subtitlesBox || !this.speakerLabel || !this.subtitleText) return;
    this.subtitlesBox.classList.remove('hidden');
    this.speakerLabel.textContent = speaker;

    if (showPrompt) {
      this.subtitleText.innerHTML = `${text}<span class="cs-prompt-next">Нажмите любую клавишу ▾</span>`;
    } else {
      this.subtitleText.textContent = text;
    }
  }

  hidePromptIndicator() {
    const promptElem = document.querySelector('.cs-prompt-next');
    if (promptElem) promptElem.remove();
  }

  hideSubtitles() {
    if (this.subtitlesBox) {
      this.subtitlesBox.classList.add('hidden');
    }
  }

  setFX(className) {
    if (!this.fxLayer) return;
    this.fxLayer.className = `cutscene-fx-layer ${className}`;
  }

  shakeCamera(intensity, durationMs) {
    const startTime = performance.now();
    const origY = this.game.camera.position.y;
    const shakeInterval = setInterval(() => {
      if (!this.isPlaying) {
        clearInterval(shakeInterval);
        return;
      }
      const elapsed = performance.now() - startTime;
      const progress = 1 - (elapsed / durationMs);
      if (progress <= 0) {
        clearInterval(shakeInterval);
        this.game.camera.position.y = origY;
        return;
      }
      const offset = (Math.random() - 0.5) * intensity * progress;
      this.game.camera.position.y = origY + offset;
    }, 16);
    this.activeIntervals.push(shakeInterval);
  }

  /**
   * Обновление таймера удержания кнопки пропуска (Hold-to-Skip) в игровом цикле
   */
  update(delta) {
    if (!this.isPlaying) return;

    // Вращение артефакта на улице, если активен
    if (this.artifactMesh) {
      this.artifactMesh.rotation.y += delta * 4;
      this.artifactMesh.rotation.x += delta * 2;
    }

    // Гарантируем, что модель первого лица скрыта во время любых катсцен
    if (this.game && this.game.player && this.game.player.fpBody && this.game.player.fpBody.lowerBodyGroup) {
      this.game.player.fpBody.lowerBodyGroup.visible = false;
    }

    // Фиксация камеры на лице друга в вертолёте (Требование 3: друг летит по кругу, камера зафиксирована на его лице)
    if (this.isLockedOnFriend && this.game.map && this.game.map.helicopterGroup && this.game.map.friendSprite) {
      const heli = this.game.map.helicopterGroup;
      const friendFaceWorld = this.game.map.friendSprite.getWorldPosition(new THREE.Vector3());
      friendFaceWorld.y += 0.15;

      // Отдалённая локальная точка камеры: широкий кинематографический ракурс на вертолёт и друга
      const camLocal = new THREE.Vector3(3.60, 0.35, 0.60);
      const camWorld = camLocal.clone();
      heli.localToWorld(camWorld);

      this.game.camera.position.copy(camWorld);
      this.game.camera.lookAt(friendFaceWorld);
    }

    // Если игрок удерживает кнопку пропуска больше 250мс — начинаем заполнять круговой индикатор
    if (this.isHoldingSkip && (performance.now() - this.holdKeyDownTime > 220)) {
      this.holdProgress = Math.min(1.0, this.holdProgress + (delta / this.holdDuration));
      if (this.holdProgress >= 1.0) {
        this.skip(true);
        return;
      }
    } else if (!this.isHoldingSkip) {
      this.holdProgress = Math.max(0.0, this.holdProgress - delta * 3.5);
    }

    this.updateSkipProgressUI();

    // Легкое покачивание камеры в лабиринте при головокружении
    if (this.currentLevel === 'maze' && this.currentStepIdx < 4) {
      const swayRoll = Math.sin(performance.now() * 0.0025) * 0.035;
      this.game.camera.rotation.z = swayRoll;
    }
  }

  updateSkipProgressUI() {
    if (!this.skipRingFill) return;
    const circumference = 113.1;
    const offset = circumference * (1 - this.holdProgress);
    this.skipRingFill.style.strokeDashoffset = offset.toFixed(1);

    if (this.skipContainer) {
      this.skipContainer.classList.toggle('active-hold', this.holdProgress > 0.05);
    }
  }

  skip(isManual = false) {
    if (!this.isPlaying) return;

    if (isManual) {
      this.manualSkipCount++;
      if (this.manualSkipCount > 2 && !this.skipPromptShown) {
        this.skipPromptShown = true;
        this.showFrequencyModal();
      }
    }

    this.complete();
  }

  showFrequencyModal() {
    if (this.freqModal) {
      this.freqModal.classList.remove('hidden');
    }
  }

  complete() {
    if (!this.isPlaying) return;

    this.isLockedOnFriend = false;
    soundEngine.stopHelicopterSound();

    this.stopCurrent();

    const pSpawn = this.game.player.position;
    this.game.camera.position.set(pSpawn.x, pSpawn.y, pSpawn.z);
    this.game.camera.rotation.set(0, this.game.player.yaw, 0, 'YXZ');

    // Восстанавливаем видимость модели первого лица игрока
    if (this.game && this.game.player && this.game.player.fpBody && this.game.player.fpBody.lowerBodyGroup) {
      this.game.player.fpBody.lowerBodyGroup.visible = true;
    }
    if (this.game && this.game.girl && this.game.girl.meshGroup && !this.game.girl.isDormant) {
      this.game.girl.meshGroup.visible = true;
    }
    if (this.game && this.game.shieldManager && this.game.shieldManager.playerAura) {
      this.game.shieldManager.playerAura.visible = true;
    }

    if (this.onCompleteCallback) {
      const cb = this.onCompleteCallback;
      this.onCompleteCallback = null;
      cb();
    }
  }

  stopCurrent() {
    this.isPlaying = false;
    this.isHoldingSkip = false;
    this.holdProgress = 0;
    this.isWaitingForInput = false;
    this.isAutoAdvancing = false;
    this.isLockedOnFriend = false;

    soundEngine.stopHelicopterSound();

    for (const t of this.activeTimeouts) clearTimeout(t);
    this.activeTimeouts = [];

    for (const i of this.activeIntervals) clearInterval(i);
    this.activeIntervals = [];

    this.removeProcedural3DStreet();

    // Сброс FOV камеры на штатный угол обзора
    if (this.game && this.game.camera && this.game.camera.fov !== undefined && this.game.camera.fov !== 75) {
      this.game.camera.fov = 75;
      this.game.camera.updateProjectionMatrix();
    }

    // Восстанавливаем видимость модели первого лица игрока
    if (this.game && this.game.player && this.game.player.fpBody && this.game.player.fpBody.lowerBodyGroup) {
      this.game.player.fpBody.lowerBodyGroup.visible = true;
    }
    if (this.game && this.game.girl && this.game.girl.meshGroup && !this.game.girl.isDormant) {
      this.game.girl.meshGroup.visible = true;
    }
    if (this.game && this.game.shieldManager && this.game.shieldManager.playerAura) {
      this.game.shieldManager.playerAura.visible = true;
    }

    if ('speechSynthesis' in window) {
      try { window.speechSynthesis.cancel(); } catch (e) {}
    }

    if (this.overlay) this.overlay.classList.add('hidden');
    if (this.stage) this.stage.innerHTML = '';
    if (this.fxLayer) this.fxLayer.className = 'cutscene-fx-layer';
    this.hideSubtitles();
  }

  addTimeout(fn, ms) {
    const id = setTimeout(fn, ms);
    this.activeTimeouts.push(id);
    return id;
  }
}
