import React, { useState, useEffect, useRef } from 'react';
import { chatService } from '../services/chatService';
import { authService, AuthUser } from '../services/authService';
import { ChatMessage } from '../services/onlineService';
import { soundManager } from '../utils/audio';
import {
  MessageSquare,
  X,
  Send,
  Smile,
  Minimize2,
  Maximize2,
  Flame,
  Radio,
  Lock,
} from 'lucide-react';

interface GlobalChatDrawerProps {
  onOpenLoginModal: () => void;
  defaultUserName?: string;
  defaultUserAvatar?: string;
}

const QUICK_EMOJIS = ['🔥', '🤣', '👏', '💀', '🍿', '😱', '❤️', '🤡'];
const QUICK_PHRASES = [
  'كفووو! 👏',
  'وينك يا خوي؟ 👀',
  'ما توقعتك كذا 😂',
  'سجل يا تاريخ! 📜',
  'جاهز للتحدي 🔥',
  'حكم الجلسة يسلّم عليك ⚖️',
];

export const GlobalChatDrawer: React.FC<GlobalChatDrawerProps> = ({
  onOpenLoginModal,
  defaultUserName = 'لاعب',
  defaultUserAvatar = '😎',
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [messages, setMessages] = useState<ChatMessage[]>(chatService.getMessages());
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [inputText, setInputText] = useState<string>('');
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(authService.getCurrentUser());
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Subscribe to auth updates
  useEffect(() => {
    const unsub = authService.subscribe((u) => {
      setCurrentUser(u);
    });
    return unsub;
  }, []);

  // Subscribe to chat updates
  useEffect(() => {
    const unsub = chatService.subscribe((msgs) => {
      setMessages([...msgs]);
    });
    return unsub;
  }, []);

  // Subscribe to new incoming messages for sound & unread count
  useEffect(() => {
    const unsub = chatService.onNewMessage(() => {
      if (!isOpen) {
        setUnreadCount((c) => c + 1);
        soundManager.playTick();
      }
    });
    return unsub;
  }, [isOpen]);

  // Scroll to bottom on new message
  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isMinimized]);

  const toggleOpen = () => {
    soundManager.playClick();
    const next = !isOpen;
    setIsOpen(next);
    chatService.setChatOpen(next);
    if (next) {
      setUnreadCount(0);
      setIsMinimized(false);
    }
  };

  const handleSendMessage = (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text) return;

    soundManager.playClick();

    const sender = {
      id: currentUser ? currentUser.id : 'anon_' + defaultUserName,
      name: currentUser ? currentUser.name : defaultUserName,
      avatar: currentUser ? currentUser.avatar : defaultUserAvatar,
    };

    chatService.sendMessage(text, sender, 'chat');
    if (!textToSend) {
      setInputText('');
    }
  };

  const handleSendEmoji = (emoji: string) => {
    soundManager.playClick();
    const sender = {
      id: currentUser ? currentUser.id : 'anon_' + defaultUserName,
      name: currentUser ? currentUser.name : defaultUserName,
      avatar: currentUser ? currentUser.avatar : defaultUserAvatar,
    };
    chatService.sendMessage(emoji, sender, 'reaction');
  };

  return (
    <div className="fixed bottom-4 left-4 z-40 select-none font-cairo">
      {/* Floating Trigger Button (when closed) */}
      {!isOpen && (
        <button
          onClick={toggleOpen}
          className="relative px-3.5 py-2.5 bg-gradient-to-r from-stone-900 to-stone-950 hover:from-stone-850 hover:to-stone-900 text-stone-100 rounded-2xl border border-amber-500/40 shadow-2xl flex items-center gap-2 cursor-pointer transition-all hover:scale-105 active:scale-95 group"
        >
          <div className="relative">
            <MessageSquare className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <span className="text-xs font-black text-amber-300">محادثة الجلسة</span>

          {unreadCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center animate-bounce">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      )}

      {/* Chat Drawer / Window (when open) */}
      {isOpen && (
        <div
          className={`bg-stone-900/95 backdrop-blur-xl border border-stone-800 rounded-3xl shadow-2xl flex flex-col transition-all overflow-hidden ${
            isMinimized
              ? 'w-72 sm:w-80 h-14'
              : 'w-[calc(100vw-2rem)] sm:w-96 max-w-sm h-[480px] sm:h-[520px]'
          }`}
        >
          {/* Header */}
          <div className="p-3 sm:p-3.5 bg-stone-950 border-b border-stone-850 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-sm">
                💬
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs sm:text-sm font-black text-white">محادثة الجلسة</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>
                <span className="text-[10px] text-stone-400 block">
                  {currentUser ? `مسجل كـ: ${currentUser.name} ${currentUser.avatar}` : 'وضع زائر (سجل دخولك لحفظ اسمك)'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  soundManager.playClick();
                  setIsMinimized(!isMinimized);
                }}
                className="p-1.5 text-stone-400 hover:text-white rounded-lg hover:bg-stone-900 transition-colors cursor-pointer"
                title={isMinimized ? 'تكبير' : 'تصغير'}
              >
                {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={toggleOpen}
                className="p-1.5 text-stone-400 hover:text-white rounded-lg hover:bg-stone-900 transition-colors cursor-pointer"
                title="إغلاق"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body (when expanded) */}
          {!isMinimized && (
            <>
              {/* Login Banner if not logged in */}
              {!currentUser && (
                <div className="px-3 py-2 bg-amber-950/40 border-b border-amber-500/20 flex items-center justify-between text-right">
                  <span className="text-[11px] text-amber-300 font-bold">
                    سجّل اسمك وكلمة سرك لتمييز رسائلك!
                  </span>
                  <button
                    onClick={() => {
                      soundManager.playClick();
                      onOpenLoginModal();
                    }}
                    className="px-2 py-0.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-[10px] rounded-lg shadow-sm"
                  >
                    دخول 🔑
                  </button>
                </div>
              )}

              {/* Messages List */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2.5 text-right">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-stone-500 text-xs">
                    <span className="text-3xl mb-1">💬</span>
                    <span>لا توجد رسائل بعد... ابدأ السوالف!</span>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMe =
                      currentUser && msg.senderId === currentUser.id
                        ? true
                        : msg.senderName === (currentUser?.name || defaultUserName);

                    if (msg.type === 'system') {
                      return (
                        <div key={msg.id} className="text-center my-1.5">
                          <span className="inline-block px-2.5 py-1 rounded-full bg-stone-950/80 border border-stone-850 text-[10px] text-amber-400/90 font-bold">
                            {msg.text}
                          </span>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={msg.id}
                        className={`flex gap-2 items-end ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
                      >
                        <span className="text-lg shrink-0 select-none" title={msg.senderName}>
                          {msg.avatar || '😎'}
                        </span>
                        <div
                          className={`max-w-[78%] rounded-2xl p-2.5 text-xs shadow-sm leading-relaxed ${
                            isMe
                              ? 'bg-amber-500 text-stone-950 font-bold rounded-bl-sm'
                              : 'bg-stone-950 text-stone-200 border border-stone-800 rounded-br-sm'
                          }`}
                        >
                          <div
                            className={`flex items-center gap-1.5 text-[9px] mb-1 ${
                              isMe ? 'text-stone-900/75 justify-end' : 'text-stone-500'
                            }`}
                          >
                            <span className="font-black">{msg.senderName}</span>
                            <span>·</span>
                            <span>{msg.time}</span>
                          </div>
                          <p className="break-words font-medium">{msg.text}</p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Fast Canned Phrases */}
              <div className="px-2 py-1 bg-stone-950 border-t border-stone-850 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {QUICK_PHRASES.map((phrase) => (
                  <button
                    key={phrase}
                    type="button"
                    onClick={() => handleSendMessage(phrase)}
                    className="px-2.5 py-1 bg-stone-900 hover:bg-stone-850 text-stone-300 hover:text-white rounded-xl text-[10px] font-bold border border-stone-800 shrink-0 transition-colors whitespace-nowrap cursor-pointer"
                  >
                    {phrase}
                  </button>
                ))}
              </div>

              {/* Fast Emoji Reactions */}
              <div className="px-2 py-1.5 bg-stone-950/80 border-t border-stone-850 flex items-center justify-between">
                {QUICK_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => handleSendEmoji(emoji)}
                    className="text-base sm:text-lg hover:scale-125 transition-transform p-1 cursor-pointer"
                    title={`إرسال ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              {/* Input Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="p-2.5 bg-stone-950 border-t border-stone-800 flex items-center gap-2"
              >
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="اكتب رسالتك للجلسة..."
                  className="flex-1 bg-stone-900 border border-stone-750 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-stone-100 placeholder-stone-600 outline-none transition-colors"
                  maxLength={120}
                />
                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className="p-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-stone-950 rounded-xl transition-all shadow-md cursor-pointer shrink-0"
                  title="إرسال"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  );
};
