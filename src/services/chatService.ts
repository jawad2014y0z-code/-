/**
 * Global Real-Time Chat Service
 * Manages live group chat across the application with WebSocket sync & REST fallback
 */

import { ChatMessage } from './onlineService';

type ChatListener = (messages: ChatMessage[]) => void;
type NewMessageListener = (msg: ChatMessage) => void;

class ChatService {
  private messages: ChatMessage[] = [];
  private listeners: Set<ChatListener> = new Set();
  private newMsgListeners: Set<NewMessageListener> = new Set();
  private ws: WebSocket | null = null;
  private unreadCount: number = 0;
  private isChatOpen: boolean = false;

  constructor() {
    this.fetchInitialMessages();
    this.connectWs();
  }

  public getMessages(): ChatMessage[] {
    return this.messages;
  }

  public getUnreadCount(): number {
    return this.unreadCount;
  }

  public setChatOpen(open: boolean) {
    this.isChatOpen = open;
    if (open) {
      this.unreadCount = 0;
      this.notify();
    }
  }

  public subscribe(cb: ChatListener): () => void {
    this.listeners.add(cb);
    cb(this.messages);
    return () => {
      this.listeners.delete(cb);
    };
  }

  public onNewMessage(cb: NewMessageListener): () => void {
    this.newMsgListeners.add(cb);
    return () => {
      this.newMsgListeners.delete(cb);
    };
  }

  private notify() {
    this.listeners.forEach((cb) => cb(this.messages));
  }

  public async fetchInitialMessages() {
    try {
      const res = await fetch('/api/chat');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.messages)) {
          this.messages = data.messages;
          this.notify();
        }
      }
    } catch {
      // ignore
    }
  }

  private connectWs() {
    if (typeof window === 'undefined') return;
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/game-ws`;
      const socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        this.ws = socket;
        socket.send(JSON.stringify({ type: 'GLOBAL_CHAT_INIT' }));
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'GLOBAL_CHAT_INIT' && Array.isArray(data.messages)) {
            this.messages = data.messages;
            this.notify();
          } else if (data.type === 'GLOBAL_CHAT_MESSAGE' && data.message) {
            const exists = this.messages.some((m) => m.id === data.message.id);
            if (!exists) {
              this.messages.push(data.message);
              if (this.messages.length > 80) this.messages.shift();
              if (!this.isChatOpen) {
                this.unreadCount += 1;
              }
              this.notify();
              this.newMsgListeners.forEach((cb) => cb(data.message));
            }
          }
        } catch {
          // ignore
        }
      };

      socket.onclose = () => {
        this.ws = null;
        setTimeout(() => this.connectWs(), 4000);
      };

      socket.onerror = () => {
        // silent
      };
    } catch {
      // silent
    }
  }

  public async sendMessage(
    text: string,
    sender: { id: string; name: string; avatar: string },
    type: 'chat' | 'reaction' = 'chat'
  ) {
    if (!text || !text.trim()) return;
    const cleanText = text.trim();

    // Send via WebSocket if open
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'GLOBAL_CHAT_SEND',
          player: sender,
          payload: { text: cleanText, type },
        })
      );
      return;
    }

    // Fallback to REST
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: sender.id,
          senderName: sender.name,
          avatar: sender.avatar,
          text: cleanText,
          type,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.message) {
          const exists = this.messages.some((m) => m.id === data.message.id);
          if (!exists) {
            this.messages.push(data.message);
            this.notify();
          }
        }
      }
    } catch {
      // Local optimistic display
      const localMsg: ChatMessage = {
        id: `local-${Date.now()}`,
        senderId: sender.id,
        senderName: sender.name,
        avatar: sender.avatar,
        text: cleanText,
        type,
        time: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
      };
      this.messages.push(localMsg);
      this.notify();
    }
  }
}

export const chatService = new ChatService();
