/**
 * Online Multiplayer & Auto-Matchmaking Service
 * Handles WebSockets, auto-matching, room creation, QR codes & cross-device state sync
 */

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

export interface OnlineRoom {
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

type RoomListener = (room: OnlineRoom | null) => void;
type ActionBroadcastListener = (action: string, payload: any) => void;
type ReactionListener = (msg: ChatMessage) => void;

class OnlineService {
  private ws: WebSocket | null = null;
  private currentRoom: OnlineRoom | null = null;
  private myPlayerId: string = '';
  private mySlot: number = 0;
  private isConnecting: boolean = false;
  private pingInterval: number | null = null;
  private roomPollingInterval: number | null = null;

  private roomListeners: Set<RoomListener> = new Set();
  private actionListeners: Set<ActionBroadcastListener> = new Set();
  private reactionListeners: Set<ReactionListener> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        let storedId = localStorage.getItem('jumah_online_player_id');
        if (!storedId) {
          storedId = 'player_' + Math.random().toString(36).substring(2, 9);
          localStorage.setItem('jumah_online_player_id', storedId);
        }
        this.myPlayerId = storedId;
      } catch {
        this.myPlayerId = 'player_' + Math.random().toString(36).substring(2, 9);
      }

      // Initial presence registration & periodic heartbeat
      this.sendPresence();
      setInterval(() => {
        this.sendPresence();
      }, 15000);
    }
  }

  public sendPresence(name?: string) {
    if (typeof window === 'undefined') return;
    try {
      fetch('/api/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitorId: this.myPlayerId,
          name: name || 'زائر',
        }),
      }).catch(() => {});
    } catch {
      // silent
    }
  }

  public getPlayerId(): string {
    return this.myPlayerId;
  }

  public getRoom(): OnlineRoom | null {
    return this.currentRoom;
  }

  public getMySlot(): number {
    if (!this.currentRoom) return 0;
    const me = this.currentRoom.players.find((p) => p.id === this.myPlayerId);
    return me ? me.slot : this.mySlot;
  }

  public isMyTurn(currentTurnIndex: number): boolean {
    if (!this.currentRoom) return true; // Local mode always can play
    return this.getMySlot() === currentTurnIndex;
  }

  public isHost(): boolean {
    if (!this.currentRoom) return false;
    const me = this.currentRoom.players.find((p) => p.id === this.myPlayerId);
    return Boolean(me?.isHost);
  }

  public subscribeRoom(cb: RoomListener) {
    this.roomListeners.add(cb);
    cb(this.currentRoom);
    return () => {
      this.roomListeners.delete(cb);
    };
  }

  public subscribeAction(cb: ActionBroadcastListener) {
    this.actionListeners.add(cb);
    return () => {
      this.actionListeners.delete(cb);
    };
  }

  public subscribeReaction(cb: ReactionListener) {
    this.reactionListeners.add(cb);
    return () => {
      this.reactionListeners.delete(cb);
    };
  }

  private notifyRoom() {
    this.roomListeners.forEach((cb) => cb(this.currentRoom));
  }

  // Connects WebSocket if not connected
  private ensureConnection(): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        return resolve(this.ws);
      }

      this.isConnecting = true;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/game-ws`;

      try {
        const socket = new WebSocket(wsUrl);

        socket.onopen = () => {
          this.ws = socket;
          this.isConnecting = false;
          this.startHeartbeat();
          resolve(socket);
        };

        socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleServerMessage(data);
          } catch (err) {
            console.error('Failed to parse WS data:', err);
          }
        };

        socket.onclose = () => {
          this.ws = null;
          this.stopHeartbeat();
        };

        socket.onerror = (err) => {
          console.warn('Game WS connection note:', err);
          this.isConnecting = false;
          // Resolve anyway so HTTP fallback can function if WS is restricted
          resolve(socket);
        };
      } catch (err) {
        this.isConnecting = false;
        reject(err);
      }
    });
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.pingInterval = window.setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'PING' }));
      }
    }, 20000);
  }

  private stopHeartbeat() {
    if (this.pingInterval !== null) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private handleServerMessage(data: any) {
    switch (data.type) {
      case 'ROOM_SYNC':
      case 'ROOM_UPDATED':
      case 'GAME_STARTED': {
        this.currentRoom = data.room;
        if (data.assignedSlot !== undefined) {
          this.mySlot = data.assignedSlot;
        }
        this.notifyRoom();
        break;
      }

      case 'GAME_ACTION_BROADCAST': {
        if (this.currentRoom && data.gameState) {
          this.currentRoom.gameState = data.gameState;
          this.notifyRoom();
        }
        this.actionListeners.forEach((cb) => cb(data.action, data));
        break;
      }

      case 'REACTION_RECEIVED': {
        if (this.currentRoom && data.message) {
          this.currentRoom.messages.push(data.message);
          this.notifyRoom();
        }
        this.reactionListeners.forEach((cb) => cb(data.message));
        break;
      }
    }
  }

  // Auto-Matchmaking: Find any open public room or create a new public one
  public async autoMatch(gameId: string, playerName: string, avatar = '🦁'): Promise<OnlineRoom> {
    const res = await fetch('/api/rooms/auto-match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gameId,
        player: {
          id: this.myPlayerId,
          name: playerName,
          avatar,
        },
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'فشل البحث عن غرفة تلقائية');
    }

    const data = await res.json();
    this.currentRoom = data.room;
    this.notifyRoom();
    this.startRoomPolling(data.room.code);

    await this.connectWsToRoom(data.room.code, playerName, avatar);
    return data.room;
  }

  // Create Room (public or private)
  public async createRoom(
    gameId: string,
    isPublic: boolean,
    maxPlayers: number,
    playerName: string,
    avatar = '😎'
  ): Promise<OnlineRoom> {
    const res = await fetch('/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gameId,
        isPublic,
        maxPlayers,
        player: {
          id: this.myPlayerId,
          name: playerName,
          avatar,
        },
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'فشل إنشاء الغرفة');
    }

    const data = await res.json();
    this.currentRoom = data.room;
    this.notifyRoom();
    this.startRoomPolling(data.room.code);

    await this.connectWsToRoom(data.room.code, playerName, avatar);
    return data.room;
  }

  // Join Room by code
  public async joinRoom(code: string, playerName: string, avatar = '🦁'): Promise<OnlineRoom> {
    const cleanCode = code.trim().toUpperCase();
    const res = await fetch(`/api/rooms/${cleanCode}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        player: {
          id: this.myPlayerId,
          name: playerName,
          avatar,
        },
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'تعذر الانضمام للغرفة');
    }

    const data = await res.json();
    this.currentRoom = data.room;
    this.notifyRoom();
    this.startRoomPolling(cleanCode);

    await this.connectWsToRoom(cleanCode, playerName, avatar);
    return data.room;
  }

  // Poll room status every 1.5 seconds while waiting for game start
  private startRoomPolling(roomCode: string) {
    this.stopRoomPolling();
    this.roomPollingInterval = window.setInterval(async () => {
      if (!this.currentRoom || this.currentRoom.code !== roomCode) {
        this.stopRoomPolling();
        return;
      }
      if (this.currentRoom.status === 'playing') {
        this.stopRoomPolling();
        return;
      }
      try {
        const res = await fetch(`/api/rooms/${roomCode}`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.room) {
            this.currentRoom = data.room;
            if (data.room.status === 'playing') {
              this.stopRoomPolling();
            }
            this.notifyRoom();
          }
        }
      } catch {
        // Silently ignore polling network jitter
      }
    }, 1500);
  }

  private stopRoomPolling() {
    if (this.roomPollingInterval !== null) {
      clearInterval(this.roomPollingInterval);
      this.roomPollingInterval = null;
    }
  }

  private async connectWsToRoom(roomCode: string, playerName: string, avatar: string) {
    const ws = await this.ensureConnection();
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: 'JOIN_ROOM',
          roomCode,
          player: {
            id: this.myPlayerId,
            name: playerName,
            avatar,
          },
        })
      );
    }
  }

  // Send game action to room
  public sendAction(action: string, payload: any = {}) {
    if (!this.currentRoom) return;

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'GAME_ACTION',
          roomCode: this.currentRoom.code,
          player: { id: this.myPlayerId },
          action,
          payload,
        })
      );
    }
  }

  // Start game (Host only) - initiates via REST + WebSocket broadcast for 100% reliable cross-device start
  public async startGame(): Promise<OnlineRoom | null> {
    if (!this.currentRoom) return null;
    const roomCode = this.currentRoom.code;

    // Send over WebSocket immediately
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'START_GAME',
          roomCode,
          player: { id: this.myPlayerId },
        })
      );
    }

    // Call REST endpoint to ensure database / server state starts immediately
    try {
      const res = await fetch(`/api/rooms/${roomCode}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: this.myPlayerId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.room) {
          this.currentRoom = data.room;
          this.stopRoomPolling();
          this.notifyRoom();
          return data.room;
        }
      }
    } catch (err) {
      console.warn('REST startGame note:', err);
    }

    return this.currentRoom;
  }

  // Send quick reaction or phrase
  public sendReaction(text: string, type: 'reaction' | 'chat' = 'reaction') {
    if (!this.currentRoom) return;
    const me = this.currentRoom.players.find((p) => p.id === this.myPlayerId);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'SEND_REACTION',
          roomCode: this.currentRoom.code,
          player: {
            id: this.myPlayerId,
            name: me?.name || 'لاعب',
            avatar: me?.avatar,
          },
          payload: { text, type },
        })
      );
    }
  }

  // Leave current room
  public leaveRoom() {
    this.stopRoomPolling();
    this.currentRoom = null;
    this.notifyRoom();
  }
}

export const onlineService = new OnlineService();
