// Custom Asset Manager: Handles default assets, custom file uploads, and persistence

export class AssetManager {
  constructor() {
    this.girlTextureUrl = './assets/girl.png';
    this.gameOverVideoUrl = './assets/game_over.mp4';
    this.romanticFallbackUrl = './assets/romantic_scene.jpg';
    this.girlMusicUrl = './assets/girl_music.mp3';
    this.victoryVideoUrl = './assets/victory.mp4';
    this.victoryMusicUrl = './assets/victory_music.mp3';

    this.hasCustomVideo = false;
    this.hasCustomGirl = false;
    this.hasCustomMusic = false;
    this.hasCustomVictoryVideo = false;
    this.hasCustomVictoryMusic = false;

    this.listeners = [];
  }

  onUpdate(fn) {
    this.listeners.push(fn);
  }

  notify() {
    for (const fn of this.listeners) {
      fn({
        girlUrl: this.girlTextureUrl,
        videoUrl: this.gameOverVideoUrl,
        musicUrl: this.girlMusicUrl,
        victoryVideoUrl: this.victoryVideoUrl,
        victoryMusicUrl: this.victoryMusicUrl,
        hasCustomVideo: this.hasCustomVideo,
        hasCustomGirl: this.hasCustomGirl,
        hasCustomMusic: this.hasCustomMusic,
        hasCustomVictoryVideo: this.hasCustomVictoryVideo,
        hasCustomVictoryMusic: this.hasCustomVictoryMusic
      });
    }
  }

  setCustomGirl(file) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    this.girlTextureUrl = url;
    this.hasCustomGirl = true;
    this.notify();
  }

  setCustomVideo(file) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    this.gameOverVideoUrl = url;
    this.hasCustomVideo = true;
    this.notify();
  }

  setCustomVictoryVideo(file) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    this.victoryVideoUrl = url;
    this.hasCustomVictoryVideo = true;
    this.notify();
  }

  setCustomMusic(file) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    this.girlMusicUrl = url;
    this.hasCustomMusic = true;
    this.notify();
  }

  setCustomVictoryMusic(file) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    this.victoryMusicUrl = url;
    this.hasCustomVictoryMusic = true;
    this.notify();
  }

  setAuthorPreset() {
    this.girlTextureUrl = './assets/author/girl.png';
    this.gameOverVideoUrl = './assets/author/game_over.mp4';
    this.girlMusicUrl = './assets/author/girl_music.mp3';
    this.victoryVideoUrl = './assets/author/victory.mp4';
    this.victoryMusicUrl = './assets/author/victory_music.mp3';
    this.hasCustomVideo = true;
    this.hasCustomGirl = true;
    this.hasCustomMusic = true;
    this.hasCustomVictoryVideo = true;
    this.hasCustomVictoryMusic = true;
    this.notify();
  }

  resetDefaults() {
    this.girlTextureUrl = './assets/girl.png';
    this.gameOverVideoUrl = './assets/game_over.mp4';
    this.girlMusicUrl = './assets/girl_music.mp3';
    this.victoryVideoUrl = './assets/victory.mp4';
    this.victoryMusicUrl = './assets/victory_music.mp3';
    this.hasCustomVideo = false;
    this.hasCustomGirl = false;
    this.hasCustomMusic = false;
    this.hasCustomVictoryVideo = false;
    this.hasCustomVictoryMusic = false;
    this.notify();
  }
}

export const assetManager = new AssetManager();
