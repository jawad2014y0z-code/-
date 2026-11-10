import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { WebSocketServer, WebSocket } from 'ws';

dotenv.config();
process.env.DISABLE_HMR = 'true';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==========================================
// Multi-User Room & Game State Types
// ==========================================

export interface RoomPlayer {
  id: string;
  name: string;
  color: string;
  avatar: string;
  slot: number;
  ready: boolean;
  isHost: boolean;
  isOnline: boolean;
  joinedAt: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  avatar?: string;
  text: string;
  type: 'chat' | 'system' | 'reaction';
  time: string;
}

export interface LudoPiece {
  id: number;
  playerIdx: number;
  step: number; // -1: base, 0..50: track, 51..55: home corridor, 56: finished home
}

export interface LudoState {
  pieces: LudoPiece[];
  currentPlayer: number;
  diceValue: number | null;
  isRolling: boolean;
  hasRolled: boolean;
  consecutiveSixes: number;
  statusMessage: string;
  winner: number | null;
  podium: number[];
  lastActionAt: number;
}

export interface Room {
  code: string;
  gameId: string;
  isPublic: boolean;
  maxPlayers: number;
  hostId: string;
  status: 'waiting' | 'playing' | 'ended';
  createdAt: number;
  players: RoomPlayer[];
  gameState: any;
  messages: ChatMessage[];
}

const PLAYER_COLORS = ['#ef4444', '#10b981', '#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6'];
const CODE_CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

function generateRoomCode(): string {
  let result = '';
  for (let i = 0; i < 4; i++) {
    result += CODE_CHARS.charAt(Math.floor(Math.random() * CODE_CHARS.length));
  }
  return result;
}

function initLudoState(numPlayers = 4): LudoState {
  const pieces: LudoPiece[] = [];
  for (let p = 0; p < numPlayers; p++) {
    for (let i = 0; i < 4; i++) {
      pieces.push({ id: p * 4 + i, playerIdx: p, step: -1 });
    }
  }
  return {
    pieces,
    currentPlayer: 0,
    diceValue: null,
    isRolling: false,
    hasRolled: false,
    consecutiveSixes: 0,
    statusMessage: 'ابدأ اللعبة برمي النرد!',
    winner: null,
    podium: [],
    lastActionAt: Date.now(),
  };
}

// In-Memory Room Store
const rooms = new Map<string, Room>();
const clientRooms = new Map<WebSocket, { roomCode: string; playerId: string }>();
const activeVisitors = new Map<string, { lastSeen: number; name?: string }>();

// Auth Users Store (Simple Name + Password Login System)
export interface AuthUser {
  id: string;
  name: string;
  password: string;
  avatar: string;
  createdAt: number;
}
const usersMap = new Map<string, AuthUser>([
  [
    'محمد',
    { id: 'u_1', name: 'محمد', password: '123', avatar: '😎', createdAt: Date.now() - 86400000 },
  ],
  [
    'خالد',
    { id: 'u_2', name: 'خالد', password: '123', avatar: '🦁', createdAt: Date.now() - 86400000 },
  ],
  [
    'فيصل',
    { id: 'u_3', name: 'فيصل', password: '123', avatar: '⚡', createdAt: Date.now() - 86400000 },
  ],
  [
    'سارة',
    { id: 'u_4', name: 'سارة', password: '123', avatar: '👑', createdAt: Date.now() - 86400000 },
  ],
]);

// Global Chat Messages Store
const globalMessages: ChatMessage[] = [
  {
    id: 'msg-welcome',
    senderId: 'system',
    senderName: 'النظام',
    avatar: '🤖',
    text: 'مرحباً بكم في شات جمعة العام! طقطقوا وسولفوا مع المتواجدين في الموقع 💬🔥',
    type: 'system',
    time: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
  },
];

// Periodic cleanup for stale visitors (after 45s without heartbeat)
setInterval(() => {
  const cutoff = Date.now() - 45000;
  for (const [id, data] of activeVisitors.entries()) {
    if (data.lastSeen < cutoff) {
      activeVisitors.delete(id);
    }
  }
}, 15000);

let wssGlobal: WebSocketServer | null = null;

function broadcastGlobal(payload: any) {
  if (!wssGlobal) return;
  const data = JSON.stringify(payload);
  for (const client of wssGlobal.clients) {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(data);
      } catch (err) {
        console.error('WS global broadcast error:', err);
      }
    }
  }
}

function broadcastToRoom(roomCode: string, payload: any, excludeWs?: WebSocket) {
  const room = rooms.get(roomCode);
  if (!room) return;

  const data = JSON.stringify(payload);
  for (const [ws, info] of clientRooms.entries()) {
    if (info.roomCode === roomCode && ws !== excludeWs && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(data);
      } catch (err) {
        console.error('WS broadcast error:', err);
      }
    }
  }
}

async function startServer() {
  const app = express();
  const server = http.createServer(app);

  app.use(express.json());

  // Safe WebSocketServer initialization with noServer mode so it does not intercept Vite HMR
  const wss = new WebSocketServer({ noServer: true });
  wssGlobal = wss;

  server.on('upgrade', (request, socket, head) => {
    try {
      const host = request.headers.host || 'localhost';
      const url = new URL(request.url || '', `http://${host}`);
      if (url.pathname === '/api/game-ws') {
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit('connection', ws, request);
        });
      }
      // Non-game upgrades (such as Vite HMR) fall through naturally
    } catch (err) {
      console.error('Upgrade handler error:', err);
    }
  });

  // REST: Simple Name + Password Login / Registration
  app.post('/api/auth/login', (req, res) => {
    const { name, password, avatar } = req.body || {};
    const cleanName = (name || '').trim();
    const cleanPass = (password || '').trim();

    if (!cleanName) {
      return res.status(400).json({ error: 'يرجى إدخال اسمك' });
    }
    if (!cleanPass) {
      return res.status(400).json({ error: 'يرجى إدخال كلمة السر' });
    }

    const existingUser = usersMap.get(cleanName);
    if (existingUser) {
      if (existingUser.password !== cleanPass) {
        return res.status(401).json({ error: 'كلمة السر غير صحيحة لهذا الاسم' });
      }
      if (avatar) {
        existingUser.avatar = avatar;
      }
      return res.json({
        success: true,
        user: {
          id: existingUser.id,
          name: existingUser.name,
          avatar: existingUser.avatar,
          createdAt: existingUser.createdAt,
        },
        isNew: false,
      });
    }

    // Auto-create user with this name & password!
    const newUser: AuthUser = {
      id: 'u_' + Date.now().toString(36),
      name: cleanName,
      password: cleanPass,
      avatar: avatar || '😎',
      createdAt: Date.now(),
    };
    usersMap.set(cleanName, newUser);

    return res.json({
      success: true,
      user: {
        id: newUser.id,
        name: newUser.name,
        avatar: newUser.avatar,
        createdAt: newUser.createdAt,
      },
      isNew: true,
    });
  });

  // REST: Get Global Chat Messages
  app.get('/api/chat', (_req, res) => {
    res.json({ messages: globalMessages });
  });

  // REST: Post Global Chat Message
  app.post('/api/chat', (req, res) => {
    const { senderId, senderName, avatar, text, type = 'chat' } = req.body || {};
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'نص الرسالة فارغ' });
    }

    const newMsg: ChatMessage = {
      id: `gmsg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      senderId: senderId || 'anon',
      senderName: senderName || 'لاعب',
      avatar: avatar || '😎',
      text: text.trim(),
      type: type || 'chat',
      time: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
    };

    globalMessages.push(newMsg);
    if (globalMessages.length > 80) {
      globalMessages.shift();
    }

    broadcastGlobal({
      type: 'GLOBAL_CHAT_MESSAGE',
      message: newMsg,
    });

    res.json({ success: true, message: newMsg });
  });

  // REST: Heartbeat Presence for active site visitors
  app.post('/api/presence', (req, res) => {
    const { visitorId, name } = req.body || {};
    const id = visitorId || 'v_' + Math.random().toString(36).substring(2, 9);
    activeVisitors.set(id, { lastSeen: Date.now(), name });
    res.json({
      success: true,
      onlinePlayers: Math.max(activeVisitors.size, 1),
    });
  });

  // REST: Health Check
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      activeRooms: rooms.size,
      time: new Date().toISOString(),
    });
  });

  // REST: Online Stats Check (Active players on website & rooms)
  app.get('/api/stats', (_req, res) => {
    let totalRoomPlayers = 0;
    for (const r of rooms.values()) {
      totalRoomPlayers += r.players.filter((p) => p.isOnline).length;
    }
    const wsCount = wss.clients.size;
    const httpCount = activeVisitors.size;
    const onlineCount = Math.max(httpCount, wsCount, totalRoomPlayers, 1);
    res.json({
      status: 'ok',
      activeRooms: rooms.size,
      onlinePlayers: onlineCount,
      playersInRooms: totalRoomPlayers,
      time: new Date().toISOString(),
    });
  });

  // REST: List Open Public Rooms
  app.get('/api/rooms/public', (req, res) => {
    const gameId = req.query.gameId as string | undefined;
    const publicRooms = Array.from(rooms.values())
      .filter((r) => r.isPublic && r.status === 'waiting' && r.players.length < r.maxPlayers)
      .filter((r) => (!gameId || r.gameId === gameId))
      .map((r) => ({
        code: r.code,
        gameId: r.gameId,
        playersCount: r.players.length,
        maxPlayers: r.maxPlayers,
        hostName: r.players.find((p) => p.isHost)?.name || 'مضيف',
        createdAt: r.createdAt,
      }));

    res.json({ rooms: publicRooms });
  });

  // REST: Auto-Match / Quick Match
  app.post('/api/rooms/auto-match', (req, res) => {
    const { gameId = 'ludo', player } = req.body;
    if (!player || !player.id || !player.name) {
      return res.status(400).json({ error: 'بيانات اللاعب غير صحيحة' });
    }

    // Find first public waiting room for this game with free space
    let targetRoom: Room | undefined;
    for (const room of rooms.values()) {
      if (
        room.isPublic &&
        room.status === 'waiting' &&
        room.gameId === gameId &&
        room.players.length < room.maxPlayers
      ) {
        targetRoom = room;
        break;
      }
    }

    if (targetRoom) {
      // Join existing public room
      let existing = targetRoom.players.find((p) => p.id === player.id);
      if (!existing) {
        const slot = targetRoom.players.length;
        const newPlayer: RoomPlayer = {
          id: player.id,
          name: player.name,
          avatar: player.avatar || '😎',
          color: PLAYER_COLORS[slot % PLAYER_COLORS.length],
          slot,
          ready: true,
          isHost: false,
          isOnline: true,
          joinedAt: Date.now(),
        };
        targetRoom.players.push(newPlayer);
      } else {
        existing.isOnline = true;
      }

      broadcastToRoom(targetRoom.code, {
        type: 'ROOM_UPDATED',
        room: targetRoom,
      });

      return res.json({ room: targetRoom, isNew: false });
    }

    // No open public room found -> create new public room
    let code = generateRoomCode();
    while (rooms.has(code)) {
      code = generateRoomCode();
    }

    const hostPlayer: RoomPlayer = {
      id: player.id,
      name: player.name,
      avatar: player.avatar || '😎',
      color: PLAYER_COLORS[0],
      slot: 0,
      ready: true,
      isHost: true,
      isOnline: true,
      joinedAt: Date.now(),
    };

    const newRoom: Room = {
      code,
      gameId,
      isPublic: true,
      maxPlayers: 4,
      hostId: player.id,
      status: 'waiting',
      createdAt: Date.now(),
      players: [hostPlayer],
      gameState: gameId === 'ludo' ? initLudoState(4) : null,
      messages: [
        {
          id: `msg-${Date.now()}`,
          senderId: 'system',
          senderName: 'النظام',
          text: `تم فتح طاولة عامة برمز ${code}! في انتظار انضمام لاعبين آخرين...`,
          type: 'system',
          time: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
        },
      ],
    };

    rooms.set(code, newRoom);
    return res.json({ room: newRoom, isNew: true });
  });

  // REST: Create Room (Public or Private)
  app.post('/api/rooms', (req, res) => {
    const { gameId = 'ludo', isPublic = false, maxPlayers = 4, player } = req.body;
    if (!player || !player.id || !player.name) {
      return res.status(400).json({ error: 'بيانات اللاعب غير صحيحة' });
    }

    let code = generateRoomCode();
    while (rooms.has(code)) {
      code = generateRoomCode();
    }

    const hostPlayer: RoomPlayer = {
      id: player.id,
      name: player.name,
      avatar: player.avatar || '😎',
      color: PLAYER_COLORS[0],
      slot: 0,
      ready: true,
      isHost: true,
      isOnline: true,
      joinedAt: Date.now(),
    };

    const newRoom: Room = {
      code,
      gameId,
      isPublic: Boolean(isPublic),
      maxPlayers: Math.min(Math.max(Number(maxPlayers) || 4, 2), 8),
      hostId: player.id,
      status: 'waiting',
      createdAt: Date.now(),
      players: [hostPlayer],
      gameState: gameId === 'ludo' ? initLudoState(Number(maxPlayers) || 4) : null,
      messages: [
        {
          id: `msg-${Date.now()}`,
          senderId: 'system',
          senderName: 'النظام',
          text: isPublic
            ? `تم إنشاء غرفة عامة برمز ${code}!`
            : `تم إنشاء غرفة خاصة برمز ${code}! شارك الرمز أو الرابط مع أصدقائك للانضمام.`,
          type: 'system',
          time: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
        },
      ],
    };

    rooms.set(code, newRoom);
    res.json({ room: newRoom });
  });

  // REST: Get Room Info
  app.get('/api/rooms/:code', (req, res) => {
    const code = req.params.code.toUpperCase();
    const room = rooms.get(code);
    if (!room) {
      return res.status(404).json({ error: 'الغرفة غير موجودة أو انتهت' });
    }
    res.json({ room });
  });

  // REST: Join Room
  app.post('/api/rooms/:code/join', (req, res) => {
    const code = req.params.code.toUpperCase();
    const { player } = req.body;
    if (!player || !player.id || !player.name) {
      return res.status(400).json({ error: 'بيانات اللاعب غير صحيحة' });
    }

    const room = rooms.get(code);
    if (!room) {
      return res.status(404).json({ error: 'رمز الغرفة غير صحيح أو أن الغرفة أغلقت' });
    }

    let existing = room.players.find((p) => p.id === player.id);
    if (!existing) {
      if (room.players.length >= room.maxPlayers) {
        return res.status(400).json({ error: 'الغرفة ممتلئة بالكامل' });
      }
      const slot = room.players.length;
      const newPlayer: RoomPlayer = {
        id: player.id,
        name: player.name,
        avatar: player.avatar || '🦁',
        color: PLAYER_COLORS[slot % PLAYER_COLORS.length],
        slot,
        ready: true,
        isHost: false,
        isOnline: true,
        joinedAt: Date.now(),
      };
      room.players.push(newPlayer);
      room.messages.push({
        id: `msg-${Date.now()}`,
        senderId: 'system',
        senderName: 'النظام',
        text: `انضم ${newPlayer.name} إلى الغرفة 👋`,
        type: 'system',
        time: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
      });
    } else {
      existing.isOnline = true;
    }

    broadcastToRoom(room.code, {
      type: 'ROOM_UPDATED',
      room,
    });

    res.json({ room });
  });

  // REST: Start Game (Host only or fallback)
  app.post('/api/rooms/:code/start', (req, res) => {
    const code = req.params.code.toUpperCase();
    const { playerId } = req.body;
    const room = rooms.get(code);

    if (!room) {
      return res.status(404).json({ error: 'الغرفة غير موجودة أو انتهت' });
    }

    // Mark room as playing
    room.status = 'playing';
    if (room.gameId === 'ludo') {
      room.gameState = initLudoState(room.players.length);
    }

    room.messages.push({
      id: `msg-${Date.now()}`,
      senderId: 'system',
      senderName: 'النظام',
      text: 'بدأت اللعبة! بالتوفيق للجميع 🎲🔥',
      type: 'system',
      time: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
    });

    // Broadcast GAME_STARTED and ROOM_UPDATED to all connected devices in the room
    broadcastToRoom(code, {
      type: 'GAME_STARTED',
      room,
    });
    broadcastToRoom(code, {
      type: 'ROOM_UPDATED',
      room,
    });

    res.json({ success: true, room });
  });

  // ==========================================
  // Real-Time WebSocket Logic
  // ==========================================

  wss.on('connection', (ws) => {
    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        const { type, roomCode, player, action, payload } = msg;
        const normalizedCode = (roomCode || '').toUpperCase();

        switch (type) {
          case 'JOIN_ROOM': {
            const room = rooms.get(normalizedCode);
            if (!room) {
              ws.send(JSON.stringify({ type: 'ERROR', message: 'الغرفة غير موجودة' }));
              return;
            }

            clientRooms.set(ws, { roomCode: normalizedCode, playerId: player.id });

            let existing = room.players.find((p) => p.id === player.id);
            if (!existing) {
              if (room.players.length < room.maxPlayers) {
                const slot = room.players.length;
                existing = {
                  id: player.id,
                  name: player.name,
                  avatar: player.avatar || '🦁',
                  color: PLAYER_COLORS[slot % PLAYER_COLORS.length],
                  slot,
                  ready: true,
                  isHost: room.players.length === 0,
                  isOnline: true,
                  joinedAt: Date.now(),
                };
                room.players.push(existing);
                room.messages.push({
                  id: `msg-${Date.now()}`,
                  senderId: 'system',
                  senderName: 'النظام',
                  text: `انضم ${existing.name} إلى الغرفة 👋`,
                  type: 'system',
                  time: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
                });
              }
            } else {
              existing.isOnline = true;
              existing.name = player.name || existing.name;
            }

            // Acknowledge connection to client
            ws.send(
              JSON.stringify({
                type: 'ROOM_SYNC',
                room,
                assignedSlot: existing ? existing.slot : 0,
              })
            );

            // Broadcast to other players in room
            broadcastToRoom(normalizedCode, {
              type: 'ROOM_UPDATED',
              room,
            }, ws);
            break;
          }

          case 'PLAYER_READY': {
            const room = rooms.get(normalizedCode);
            if (!room) return;
            const p = room.players.find((pl) => pl.id === player?.id);
            if (p) {
              p.ready = payload?.ready !== undefined ? payload.ready : !p.ready;
              broadcastToRoom(normalizedCode, {
                type: 'ROOM_UPDATED',
                room,
              });
            }
            break;
          }

          case 'START_GAME': {
            const room = rooms.get(normalizedCode);
            if (!room) return;
            room.status = 'playing';
            if (room.gameId === 'ludo') {
              room.gameState = initLudoState(room.players.length);
            }
            room.messages.push({
              id: `msg-${Date.now()}`,
              senderId: 'system',
              senderName: 'النظام',
              text: 'بدأت اللعبة! بالتوفيق للجميع 🎲🔥',
              type: 'system',
              time: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
            });

            broadcastToRoom(normalizedCode, {
              type: 'GAME_STARTED',
              room,
            });
            broadcastToRoom(normalizedCode, {
              type: 'ROOM_UPDATED',
              room,
            });
            break;
          }

          // Real-time synchronization for Ludo & general games
          case 'GAME_ACTION': {
            const room = rooms.get(normalizedCode);
            if (!room) return;

            // Handle Ludo specific synchronized dice roll & piece move
            if (action === 'LUDO_ROLL_DICE') {
              const diceValue = payload.diceValue || Math.floor(Math.random() * 6) + 1;
              if (room.gameState) {
                room.gameState.diceValue = diceValue;
                room.gameState.hasRolled = true;
                room.gameState.isRolling = false;
                room.gameState.lastActionAt = Date.now();
                if (payload.consecutiveSixes !== undefined) {
                  room.gameState.consecutiveSixes = payload.consecutiveSixes;
                }
                if (payload.statusMessage) {
                  room.gameState.statusMessage = payload.statusMessage;
                }
              }

              broadcastToRoom(normalizedCode, {
                type: 'GAME_ACTION_BROADCAST',
                action: 'LUDO_ROLL_DICE',
                diceValue,
                rollerSlot: payload.rollerSlot,
                gameState: room.gameState,
              });
            } else if (action === 'LUDO_MOVE_PIECE') {
              if (room.gameState && payload.newPieces) {
                room.gameState.pieces = payload.newPieces;
                room.gameState.currentPlayer = payload.nextPlayer;
                room.gameState.diceValue = null;
                room.gameState.hasRolled = false;
                room.gameState.statusMessage = payload.statusMessage;
                room.gameState.lastActionAt = Date.now();
                if (payload.winner !== undefined) {
                  room.gameState.winner = payload.winner;
                }
                if (payload.podium) {
                  room.gameState.podium = payload.podium;
                }
              }

              broadcastToRoom(normalizedCode, {
                type: 'GAME_ACTION_BROADCAST',
                action: 'LUDO_MOVE_PIECE',
                payload,
                gameState: room.gameState,
              });
            } else if (action === 'LUDO_ADVANCE_TURN') {
              if (room.gameState) {
                room.gameState.currentPlayer = payload.nextPlayer;
                room.gameState.diceValue = null;
                room.gameState.hasRolled = false;
                room.gameState.statusMessage = payload.statusMessage;
                room.gameState.lastActionAt = Date.now();
              }

              broadcastToRoom(normalizedCode, {
                type: 'GAME_ACTION_BROADCAST',
                action: 'LUDO_ADVANCE_TURN',
                payload,
                gameState: room.gameState,
              });
            } else if (action === 'LUDO_RESTART') {
              room.gameState = initLudoState(room.players.length);
              broadcastToRoom(normalizedCode, {
                type: 'GAME_ACTION_BROADCAST',
                action: 'LUDO_RESTART',
                gameState: room.gameState,
              });
            } else {
              // Generic synchronized game state for other games
              if (payload?.gameState) {
                room.gameState = payload.gameState;
              }
              broadcastToRoom(normalizedCode, {
                type: 'GAME_ACTION_BROADCAST',
                action,
                payload,
                gameState: room.gameState,
              });
            }
            break;
          }

          case 'SEND_REACTION': {
            const room = rooms.get(normalizedCode);
            if (!room) return;

            const chatMsg: ChatMessage = {
              id: `msg-${Date.now()}-${Math.random()}`,
              senderId: player?.id || 'unknown',
              senderName: player?.name || 'لاعب',
              avatar: player?.avatar,
              text: payload?.text || '👏',
              type: payload?.type || 'reaction',
              time: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
            };

            room.messages.push(chatMsg);
            if (room.messages.length > 50) {
              room.messages.shift();
            }

            broadcastToRoom(normalizedCode, {
              type: 'REACTION_RECEIVED',
              message: chatMsg,
            });
            break;
          }

          case 'GLOBAL_CHAT_INIT': {
            ws.send(JSON.stringify({ type: 'GLOBAL_CHAT_INIT', messages: globalMessages }));
            break;
          }

          case 'GLOBAL_CHAT_SEND': {
            const sender = player || {};
            const textContent = payload?.text || msg.text || '';
            if (textContent && textContent.trim()) {
              const newMsg: ChatMessage = {
                id: `gmsg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                senderId: sender.id || 'anon',
                senderName: sender.name || 'لاعب',
                avatar: sender.avatar || '😎',
                text: textContent.trim(),
                type: payload?.type || 'chat',
                time: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
              };
              globalMessages.push(newMsg);
              if (globalMessages.length > 80) {
                globalMessages.shift();
              }
              broadcastGlobal({
                type: 'GLOBAL_CHAT_MESSAGE',
                message: newMsg,
              });
            }
            break;
          }

          case 'PING': {
            ws.send(JSON.stringify({ type: 'PONG', time: Date.now() }));
            break;
          }
        }
      } catch (err) {
        console.error('WS message handling error:', err);
      }
    });

    ws.on('close', () => {
      const info = clientRooms.get(ws);
      if (info) {
        clientRooms.delete(ws);
        const room = rooms.get(info.roomCode);
        if (room) {
          const p = room.players.find((pl) => pl.id === info.playerId);
          if (p) {
            p.isOnline = false;
          }
          broadcastToRoom(info.roomCode, {
            type: 'ROOM_UPDATED',
            room,
          });
        }
      }
    });
  });

  const isProd = process.env.NODE_ENV === 'production';
  const port = Number(process.env.PORT) || 3000;

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');

    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });

    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(port, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${port} with Online Multiplayer Room Manager`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
