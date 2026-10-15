// Custom Asset Manager: Handles default assets, custom file uploads, and persistence

export class AssetManager {
  constructor() {
    this.girlTextureUrl = './assets/girl.png';
    this.gameOverVideoUrl = './assets/game_over.mp4';
    this.romanticFallbackUrl = './assets/romantic_scene.jpg';
    this.girlMusicUrl = './assets/girl_music.mp3';

    this.hasCustomVideo = false;
    this.hasCustomGirl = false;
    this.hasCustomMusic = false;

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
        hasCustomVideo: this.hasCustomVideo,
        hasCustomGirl: this.hasCustomGirl,
        hasCustomMusic: this.hasCustomMusic
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

  setCustomMusic(file) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    this.girlMusicUrl = url;
    this.hasCustomMusic = true;
    this.notify();
  }

  resetDefaults() {
    this.girlTextureUrl = './assets/girl.png';
    this.gameOverVideoUrl = './assets/game_over.mp4';
    this.girlMusicUrl = './assets/girl_music.mp3';
    this.hasCustomVideo = false;
    this.hasCustomGirl = false;
    this.hasCustomMusic = false;
    this.notify();
  }
}

export const assetManager = new AssetManager();
