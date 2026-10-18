import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer, WebSocket } from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 3000;

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.js': 'text/javascript; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2'
};

const server = http.createServer((req, res) => {
  // CORS & caching headers for local dev
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  let reqPath = decodeURI(req.url.split('?')[0]);
  if (reqPath === '/') reqPath = '/index.html';

  const safePath = path.normalize(path.join(__dirname, reqPath));
  if (!safePath.startsWith(__dirname)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }

  fs.stat(safePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=UTF-8' });
      res.end(`404 Not Found: ${reqPath}`);
      return;
    }

    const ext = path.extname(safePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    // Support HTTP Range Requests (essential for video/mp4 streaming)
    const range = req.headers.range;
    if (range && (ext === '.mp4' || ext === '.webm')) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1;
      const chunkSize = (end - start) + 1;

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${stats.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': contentType
      });

      const fileStream = fs.createReadStream(safePath, { start, end });
      fileStream.pipe(res);
      return;
    }

    res.writeHead(200, {
      'Content-Length': stats.size,
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes'
    });
    fs.createReadStream(safePath).pipe(res);
  });
});

// ==========================================
// 🌐 MULTIPLAYER CO-OP WEBSOCKET SERVER
// ==========================================
const wss = new WebSocketServer({ server });

// Rooms Storage: roomId -> RoomState
const rooms = new Map();

function generatePlayerId() {
  return 'p_' + Math.random().toString(36).substring(2, 9);
}

function getOrCreateRoom(roomId) {
  const normId = (roomId || 'public').toUpperCase().trim().replace(/[^A-Z0-9_-]/g, '').substring(0, 16) || 'PUBLIC';
  if (!rooms.has(normId)) {
    rooms.set(normId, {
      id: normId,
      players: new Map(), // playerId -> playerData
      hostId: null,
      gameState: 'LOBBY', // 'LOBBY' | 'PLAYING' | 'GAMEOVER' | 'VICTORY'
      keysCollected: 0,
      totalKeys: 3,
      collectedKeyIndices: [],
      seed: Math.floor(Math.random() * 1000000)
    });
  }
  return rooms.get(normId);
}

function broadcastToRoom(roomId, messageObj, excludeWs = null) {
  const room = rooms.get(roomId);
  if (!room) return;
  const data = JSON.stringify(messageObj);
  for (const player of room.players.values()) {
    if (player.ws !== excludeWs && player.ws.readyState === WebSocket.OPEN) {
      player.ws.send(data);
    }
  }
}

function getRoomPlayerList(room) {
  const list = [];
  for (const p of room.players.values()) {
    list.push({
      id: p.id,
      name: p.name,
      color: p.color,
      isHost: p.id === room.hostId,
      isDowned: p.isDowned || false,
      ready: p.ready || false
    });
  }
  return list;
}

wss.on('connection', (ws) => {
  let currentRoomId = null;
  let currentPlayerId = null;

  const send = (obj) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(obj));
    }
  };

  ws.on('message', (rawMsg) => {
    try {
      const data = JSON.parse(rawMsg);
      const type = data.type;

      switch (type) {
        // --- 1. Join Room / Lobby ---
        case 'join_room': {
          const roomId = (data.roomId || 'PUBLIC').toUpperCase().trim().replace(/[^A-Z0-9_-]/g, '').substring(0, 16) || 'PUBLIC';
          const playerName = (data.name || 'Самурай').trim().substring(0, 20) || 'Самурай';
          const playerColor = data.color || '#00f3ff';

          currentRoomId = roomId;
          currentPlayerId = generatePlayerId();

          const room = getOrCreateRoom(roomId);

          // Assign host if none
          if (!room.hostId || !room.players.has(room.hostId)) {
            room.hostId = currentPlayerId;
          }

          const isHost = (currentPlayerId === room.hostId);

          const playerData = {
            id: currentPlayerId,
            ws,
            name: playerName,
            color: playerColor,
            isHost,
            isDowned: false,
            ready: isHost // host is always ready
          };

          room.players.set(currentPlayerId, playerData);

          // Send confirmation to joined player
          send({
            type: 'room_joined',
            playerId: currentPlayerId,
            roomId: room.id,
            isHost,
            gameState: room.gameState,
            keysCollected: room.keysCollected,
            collectedKeyIndices: room.collectedKeyIndices,
            players: getRoomPlayerList(room),
            seed: room.seed
          });

          // Broadcast to other players in room
          broadcastToRoom(roomId, {
            type: 'player_joined',
            player: {
              id: currentPlayerId,
              name: playerName,
              color: playerColor,
              isHost,
              isDowned: false,
              ready: playerData.ready
            },
            players: getRoomPlayerList(room)
          }, ws);

          console.log(`[Co-op] Player ${playerName} (${currentPlayerId}) joined room ${roomId}`);
          break;
        }

        // --- 2. Player Ready / Unready in Lobby ---
        case 'set_ready': {
          if (!currentRoomId || !currentPlayerId) return;
          const room = rooms.get(currentRoomId);
          if (!room) return;
          const player = room.players.get(currentPlayerId);
          if (player) {
            player.ready = !!data.ready;
            broadcastToRoom(currentRoomId, {
              type: 'player_ready_changed',
              playerId: currentPlayerId,
              ready: player.ready,
              players: getRoomPlayerList(room)
            });
          }
          break;
        }

        // --- 3. Start Game (Host only) ---
        case 'start_game': {
          if (!currentRoomId || !currentPlayerId) return;
          const room = rooms.get(currentRoomId);
          if (!room || room.hostId !== currentPlayerId) return;

          room.gameState = 'PLAYING';
          room.keysCollected = 0;
          room.collectedKeyIndices = [];
          for (const p of room.players.values()) {
            p.isDowned = false;
          }

          broadcastToRoom(currentRoomId, {
            type: 'game_started',
            seed: room.seed,
            players: getRoomPlayerList(room)
          });
          break;
        }

        // --- 4. Player Position & State Update (High frequency) ---
        case 'player_update': {
          if (!currentRoomId || !currentPlayerId) return;
          // Forward player transform and states directly to teammates
          data.playerId = currentPlayerId;
          broadcastToRoom(currentRoomId, data, ws);
          break;
        }

        // --- 5. Nextbot AI State Update (Simulated by Host, relayed to others) ---
        case 'nextbot_update': {
          if (!currentRoomId || !currentPlayerId) return;
          const room = rooms.get(currentRoomId);
          if (!room || room.hostId !== currentPlayerId) return;
          // Relay nextbot transform and animations to non-host players
          broadcastToRoom(currentRoomId, data, ws);
          break;
        }

        // --- 6. Shared Key Collection ---
        case 'key_collected': {
          if (!currentRoomId || !currentPlayerId) return;
          const room = rooms.get(currentRoomId);
          if (!room) return;

          const keyIndex = data.keyIndex;
          if (!room.collectedKeyIndices.includes(keyIndex)) {
            room.collectedKeyIndices.push(keyIndex);
            room.keysCollected = room.collectedKeyIndices.length;

            broadcastToRoom(currentRoomId, {
              type: 'key_collected',
              keyIndex,
              collectorId: currentPlayerId,
              collectorName: data.collectorName || 'Тиммейт',
              keysCollected: room.keysCollected,
              totalKeys: room.totalKeys
            });
          }
          break;
        }

        // --- 7. Pickups & Decoys ---
        case 'pickup_collected': {
          if (!currentRoomId) return;
          broadcastToRoom(currentRoomId, {
            type: 'pickup_collected',
            pickupId: data.pickupId,
            collectorId: currentPlayerId,
            collectorName: data.collectorName
          }, ws);
          break;
        }

        case 'decoy_dropped': {
          if (!currentRoomId) return;
          broadcastToRoom(currentRoomId, {
            type: 'decoy_dropped',
            position: data.position,
            duration: data.duration || 5.0,
            dropperName: data.dropperName
          });
          break;
        }

        case 'shield_repel_girl': {
          if (!currentRoomId) return;
          broadcastToRoom(currentRoomId, {
            type: 'shield_repel_girl',
            position: data.position,
            force: data.force || 26.0
          });
          break;
        }

        // --- 8. Downed & Revive Mechanic («Спаси девственность бро!») ---
        case 'player_downed': {
          if (!currentRoomId || !currentPlayerId) return;
          const room = rooms.get(currentRoomId);
          if (!room) return;

          const p = room.players.get(currentPlayerId);
          if (p) p.isDowned = true;

          broadcastToRoom(currentRoomId, {
            type: 'player_downed',
            playerId: currentPlayerId,
            playerName: data.playerName || (p ? p.name : 'Бро'),
            position: data.position
          });

          // Check if ALL players are downed!
          let allDowned = true;
          for (const pl of room.players.values()) {
            if (!pl.isDowned) {
              allDowned = false;
              break;
            }
          }

          if (allDowned && room.players.size > 0 && room.gameState === 'PLAYING') {
            room.gameState = 'GAMEOVER';
            broadcastToRoom(currentRoomId, {
              type: 'team_gameover',
              reason: 'ВСЯ КОМАНДА ЛИШИЛАСЬ ДЕВСТВЕННОСТИ!'
            });
          }
          break;
        }

        case 'revive_progress': {
          if (!currentRoomId) return;
          broadcastToRoom(currentRoomId, {
            type: 'revive_progress',
            targetId: data.targetId,
            progress: data.progress,
            reviverId: currentPlayerId
          }, ws);
          break;
        }

        case 'player_revived': {
          if (!currentRoomId) return;
          const room = rooms.get(currentRoomId);
          if (!room) return;

          const targetPlayer = room.players.get(data.targetId);
          if (targetPlayer) targetPlayer.isDowned = false;

          broadcastToRoom(currentRoomId, {
            type: 'player_revived',
            targetId: data.targetId,
            reviverId: currentPlayerId,
            reviverName: data.reviverName || 'Тиммейт'
          });
          break;
        }

        // --- 9. Victory (Escape Door reached with 3 keys) ---
        case 'door_escaped': {
          if (!currentRoomId) return;
          const room = rooms.get(currentRoomId);
          if (!room) return;

          room.gameState = 'VICTORY';
          broadcastToRoom(currentRoomId, {
            type: 'team_victory',
            escaperName: data.escaperName || 'Самурай'
          });
          break;
        }

        // --- 10. Restart Game in Room ---
        case 'restart_game': {
          if (!currentRoomId || !currentPlayerId) return;
          const room = rooms.get(currentRoomId);
          if (!room || room.hostId !== currentPlayerId) return;

          room.gameState = 'PLAYING';
          room.keysCollected = 0;
          room.collectedKeyIndices = [];
          room.seed = Math.floor(Math.random() * 1000000);
          for (const p of room.players.values()) {
            p.isDowned = false;
          }

          broadcastToRoom(currentRoomId, {
            type: 'game_restarted',
            seed: room.seed,
            players: getRoomPlayerList(room)
          });
          break;
        }

        // --- 11. Chat Message ---
        case 'chat_message': {
          if (!currentRoomId || !currentPlayerId) return;
          const text = (data.text || '').trim().substring(0, 120);
          if (!text) return;

          broadcastToRoom(currentRoomId, {
            type: 'chat_message',
            senderId: currentPlayerId,
            senderName: data.senderName || 'Игрок',
            text,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          });
          break;
        }

        // --- 12. Tactical Ping on Map ---
        case 'ping_marker': {
          if (!currentRoomId) return;
          broadcastToRoom(currentRoomId, {
            type: 'ping_marker',
            senderId: currentPlayerId,
            senderName: data.senderName,
            position: data.position,
            pingType: data.pingType || 'warning' // 'warning' | 'key' | 'help'
          });
          break;
        }
      }
    } catch (e) {
      console.error('[Co-op] Error parsing message:', e);
    }
  });

  ws.on('close', () => {
    if (currentRoomId && currentPlayerId) {
      const room = rooms.get(currentRoomId);
      if (room) {
        const leavingPlayer = room.players.get(currentPlayerId);
        room.players.delete(currentPlayerId);

        console.log(`[Co-op] Player ${leavingPlayer ? leavingPlayer.name : currentPlayerId} left room ${currentRoomId}`);

        // If host left, elect new host
        if (room.hostId === currentPlayerId) {
          const remainingIds = Array.from(room.players.keys());
          if (remainingIds.length > 0) {
            room.hostId = remainingIds[0];
            const newHost = room.players.get(room.hostId);
            if (newHost) newHost.isHost = true;

            broadcastToRoom(currentRoomId, {
              type: 'host_migrated',
              newHostId: room.hostId,
              newHostName: newHost ? newHost.name : 'Тиммейт'
            });
          }
        }

        // Notify remaining players
        broadcastToRoom(currentRoomId, {
          type: 'player_left',
          playerId: currentPlayerId,
          playerName: leavingPlayer ? leavingPlayer.name : 'Игрок',
          players: getRoomPlayerList(room)
        });

        // Clean up empty room
        if (room.players.size === 0) {
          rooms.delete(currentRoomId);
          console.log(`[Co-op] Room ${currentRoomId} destroyed (empty)`);
        }
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`🎮 Escape From Girls server running at http://localhost:${PORT}`);
  console.log(`👥 WebSocket Co-op multiplayer active on ws://localhost:${PORT}`);
});

