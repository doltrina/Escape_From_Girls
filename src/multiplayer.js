/**
 * Network Manager for Escape From Girls Co-op Multiplayer
 */
export class NetworkManager {
  constructor() {
    this.ws = null;
    this.isConnected = false;
    this.roomId = null;
    this.playerId = null;
    this.playerName = 'Самурай';
    this.playerColor = '#00f3ff';
    this.isHost = false;
    this.players = [];

    // Send throttling (~30 fps)
    this.lastSendTime = 0;
    this.sendInterval = 1000 / 30;

    // Callbacks
    this.onRoomJoined = null;
    this.onPlayerJoined = null;
    this.onPlayerLeft = null;
    this.onPlayerReadyChanged = null;
    this.onGameStarted = null;
    this.onPlayerUpdate = null;
    this.onNextbotUpdate = null;
    this.onKeyCollected = null;
    this.onDecoyDropped = null;
    this.onShieldRepel = null;
    this.onPlayerDowned = null;
    this.onReviveProgress = null;
    this.onPlayerRevived = null;
    this.onTeamVictory = null;
    this.onTeamGameOver = null;
    this.onGameRestarted = null;
    this.onChatMessage = null;
    this.onHostMigrated = null;
    this.onError = null;
    this.isConnecting = false;
  }

  connect(roomId = 'PUBLIC', name = 'Самурай', color = '#00f3ff') {
    if (this.isConnecting) {
      return Promise.reject(new Error('Уже идет подключение к комнате...'));
    }

    // Clean up existing socket connection before reconnecting
    if (this.ws) {
      try {
        this.ws.onopen = null;
        this.ws.onmessage = null;
        this.ws.onerror = null;
        this.ws.onclose = null;
        this.ws.close();
      } catch (e) {}
      this.ws = null;
    }

    this.isConnected = false;
    this.isConnecting = true;

    return new Promise((resolve, reject) => {
      let settled = false;
      this.roomId = (roomId || 'PUBLIC').toUpperCase().trim().replace(/[^A-Z0-9_-]/g, '').substring(0, 16) || 'PUBLIC';
      this.playerName = name.trim().substring(0, 20) || 'Самурай';
      this.playerColor = color;

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}`;

      try {
        this.ws = new WebSocket(wsUrl);
      } catch (err) {
        this.isConnecting = false;
        if (this.onError) this.onError(err);
        return reject(err);
      }

      this.ws.onopen = () => {
        this.isConnected = true;
        // Join room request
        this.send({
          type: 'join_room',
          roomId: this.roomId,
          name: this.playerName,
          color: this.playerColor
        });
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          this.handleMessage(msg);
          if (msg.type === 'room_joined') {
            this.isConnecting = false;
            settled = true;
            resolve(msg);
          } else if (msg.type === 'error') {
            this.isConnecting = false;
            if (!settled) {
              settled = true;
              reject(new Error(msg.message || 'Ошибка подключения к комнате'));
            }
          }
        } catch (e) {
          console.error('[Network] Error handling message:', e);
        }
      };

      this.ws.onerror = (err) => {
        this.isConnecting = false;
        console.error('[Network] WebSocket error:', err);
        if (this.onError) this.onError(err);
        if (!settled) {
          settled = true;
          reject(err);
        }
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.isConnecting = false;
        if (this.onDisconnect) this.onDisconnect();
      };
    });
  }

  disconnect() {
    this.isConnecting = false;
    if (this.ws) {
      try {
        this.ws.onopen = null;
        this.ws.onmessage = null;
        this.ws.onerror = null;
        this.ws.onclose = null;
        this.ws.close();
      } catch (e) {}
      this.ws = null;
    }
    this.isConnected = false;
    this.playerId = null;
    this.isHost = false;
    this.players = [];
  }

  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  handleMessage(msg) {
    switch (msg.type) {
      case 'room_joined':
        this.playerId = msg.playerId;
        this.roomId = msg.roomId;
        this.isHost = msg.isHost;
        this.players = msg.players || [];
        if (this.onRoomJoined) this.onRoomJoined(msg);
        break;

      case 'player_joined':
        this.players = msg.players || [];
        if (this.onPlayerJoined) this.onPlayerJoined(msg.player, this.players);
        break;

      case 'player_left':
        this.players = msg.players || [];
        if (this.onPlayerLeft) this.onPlayerLeft(msg.playerId, msg.playerName, this.players);
        break;

      case 'player_ready_changed':
        this.players = msg.players || [];
        if (this.onPlayerReadyChanged) this.onPlayerReadyChanged(msg.playerId, msg.ready, this.players);
        break;

      case 'game_started':
        this.players = msg.players || [];
        if (this.onGameStarted) this.onGameStarted(msg);
        break;

      case 'player_update':
        if (this.onPlayerUpdate) this.onPlayerUpdate(msg);
        break;

      case 'nextbot_update':
        if (this.onNextbotUpdate) this.onNextbotUpdate(msg);
        break;

      case 'key_collected':
        if (this.onKeyCollected) this.onKeyCollected(msg);
        break;

      case 'decoy_dropped':
        if (this.onDecoyDropped) this.onDecoyDropped(msg);
        break;

      case 'shield_repel_girl':
        if (this.onShieldRepel) this.onShieldRepel(msg);
        break;

      case 'player_downed':
        if (this.onPlayerDowned) this.onPlayerDowned(msg);
        break;

      case 'revive_progress':
        if (this.onReviveProgress) this.onReviveProgress(msg);
        break;

      case 'player_revived':
        if (this.onPlayerRevived) this.onPlayerRevived(msg);
        break;

      case 'team_victory':
        if (this.onTeamVictory) this.onTeamVictory(msg);
        break;

      case 'team_gameover':
        if (this.onTeamGameOver) this.onTeamGameOver(msg);
        break;

      case 'game_restarted':
        this.players = msg.players || [];
        if (this.onGameRestarted) this.onGameRestarted(msg);
        break;

      case 'chat_message':
        if (this.onChatMessage) this.onChatMessage(msg);
        break;

      case 'host_migrated':
        if (msg.newHostId === this.playerId) {
          this.isHost = true;
        }
        if (this.onHostMigrated) this.onHostMigrated(msg);
        break;
    }
  }

  // Throttled player update
  sendPlayerUpdate(pos, rotY, pitch, isMoving, isSprinting, flashlight, shieldActive, isDowned) {
    if (!this.isConnected) return;
    const now = performance.now();
    if (now - this.lastSendTime < this.sendInterval) return;
    this.lastSendTime = now;

    this.send({
      type: 'player_update',
      x: Number(pos.x.toFixed(3)),
      y: Number(pos.y.toFixed(3)),
      z: Number(pos.z.toFixed(3)),
      rotY: Number(rotY.toFixed(3)),
      pitch: Number(pitch.toFixed(3)),
      isMoving,
      isSprinting,
      flashlight,
      shieldActive,
      isDowned
    });
  }

  sendNextbotUpdate(pos, rotY, targetId, stunTimer, distractedTimer, speed) {
    if (!this.isConnected || !this.isHost) return;
    this.send({
      type: 'nextbot_update',
      x: Number(pos.x.toFixed(3)),
      y: Number(pos.y.toFixed(3)),
      z: Number(pos.z.toFixed(3)),
      rotY: Number(rotY.toFixed(3)),
      targetId,
      stunTimer: Number(stunTimer.toFixed(2)),
      distractedTimer: Number(distractedTimer.toFixed(2)),
      speed: Number(speed.toFixed(2))
    });
  }

  sendKeyCollected(keyIndex, collectorName) {
    this.send({
      type: 'key_collected',
      keyIndex,
      collectorName
    });
  }

  sendDecoyDropped(pos, duration, dropperName) {
    this.send({
      type: 'decoy_dropped',
      position: { x: pos.x, y: pos.y, z: pos.z },
      duration,
      dropperName
    });
  }

  sendShieldRepelGirl(pos, force = 26.0) {
    this.send({
      type: 'shield_repel_girl',
      position: { x: pos.x, y: pos.y, z: pos.z },
      force
    });
  }

  sendPlayerDowned(pos, playerName) {
    this.send({
      type: 'player_downed',
      position: { x: pos.x, y: pos.y, z: pos.z },
      playerName
    });
  }

  sendReviveProgress(targetId, progress) {
    this.send({
      type: 'revive_progress',
      targetId,
      progress
    });
  }

  sendPlayerRevived(targetId, reviverName) {
    this.send({
      type: 'player_revived',
      targetId,
      reviverName
    });
  }

  sendDoorEscaped(escaperName) {
    this.send({
      type: 'door_escaped',
      escaperName
    });
  }

  sendStartGame() {
    this.send({
      type: 'start_game'
    });
  }

  sendRestartGame() {
    this.send({
      type: 'restart_game'
    });
  }

  sendReady(ready) {
    this.send({
      type: 'set_ready',
      ready
    });
  }

  sendChatMessage(text) {
    this.send({
      type: 'chat_message',
      text,
      senderName: this.playerName
    });
  }
}

export const networkManager = new NetworkManager();
