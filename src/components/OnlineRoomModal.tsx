import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { onlineService, OnlineRoom } from '../services/onlineService';
import { soundManager } from '../utils/audio';
import { GameId } from '../types/game';
import {
  Users,
  Globe,
  Lock,
  Zap,
  Copy,
  Check,
  QrCode,
  X,
  Play,
  RotateCcw,
  Sparkles,
  ArrowRight,
  LogOut,
  Radio,
} from 'lucide-react';

interface OnlineRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultGameId?: GameId;
  onLaunchGame: (gameId: GameId) => void;
  initialPlayerName: string;
}

const AVATARS = ['😎', '🦁', '⚡', '👑', '💎', '🚀', '🔥', '🎯', '🦅', '🐺'];

export const OnlineRoomModal: React.FC<OnlineRoomModalProps> = ({
  isOpen,
  onClose,
  defaultGameId = 'ludo',
  onLaunchGame,
  initialPlayerName,
}) => {
  const [activeTab, setActiveTab] = useState<'public' | 'private'>('public');
  const [selectedGame, setSelectedGame] = useState<GameId>(
    defaultGameId === 'hub' ? 'ludo' : defaultGameId
  );
  const [playerName, setPlayerName] = useState<string>(initialPlayerName || 'لاعب');
  const [playerAvatar, setPlayerAvatar] = useState<string>('🦁');
  const [privateCodeInput, setPrivateCodeInput] = useState<string>('');
  const [maxPlayers, setMaxPlayers] = useState<number>(4);

  const [currentRoom, setCurrentRoom] = useState<OnlineRoom | null>(onlineService.getRoom());
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [showQrModal, setShowQrModal] = useState<boolean>(false);

  useEffect(() => {
    const unsub = onlineService.subscribeRoom((room) => {
      setCurrentRoom(room);
      if (room) {
        setIsSearching(false);
        // Automatically launch game and close modal for all devices when host starts
        if (room.status === 'playing') {
          soundManager.playFanfare();
          onLaunchGame(room.gameId as GameId);
          onClose();
        }
      }
    });
    return unsub;
  }, [onLaunchGame, onClose]);

  // Update QR Code when room changes
  useEffect(() => {
    if (currentRoom) {
      const roomUrl = `${window.location.origin}/?room=${currentRoom.code}`;
      QRCode.toDataURL(roomUrl, {
        width: 260,
        margin: 2,
        color: {
          dark: '#1c1917',
          light: '#f5f5f4',
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch(() => {});
    }
  }, [currentRoom]);

  if (!isOpen) return null;

  const handleAutoMatch = async () => {
    soundManager.playClick();
    setErrorMessage('');
    setIsSearching(true);
    try {
      const room = await onlineService.autoMatch(selectedGame, playerName, playerAvatar);
      soundManager.playJoinRoom();
      if (room.status === 'playing') {
        onLaunchGame(room.gameId as GameId);
        onClose();
      }
    } catch (err: any) {
      setIsSearching(false);
      setErrorMessage(err.message || 'تعذر الاتصال بالمطابقة التلقائية');
    }
  };

  const handleCreatePrivate = async () => {
    soundManager.playClick();
    setErrorMessage('');
    try {
      await onlineService.createRoom(selectedGame, false, maxPlayers, playerName, playerAvatar);
      soundManager.playJoinRoom();
    } catch (err: any) {
      setErrorMessage(err.message || 'تعذر إنشاء الغرفة الخاصة');
    }
  };

  const handleJoinPrivate = async () => {
    if (!privateCodeInput.trim()) {
      setErrorMessage('يرجى إدخال رمز الغرفة المكون من 4 خانات');
      return;
    }
    soundManager.playClick();
    setErrorMessage('');
    try {
      const room = await onlineService.joinRoom(privateCodeInput, playerName, playerAvatar);
      soundManager.playJoinRoom();
      if (room.status === 'playing') {
        onLaunchGame(room.gameId as GameId);
        onClose();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'تعذر الانضمام للغرفة الخاصة');
    }
  };

  const handleCopyLink = () => {
    if (!currentRoom) return;
    const roomUrl = `${window.location.origin}/?room=${currentRoom.code}`;
    navigator.clipboard.writeText(roomUrl).then(() => {
      soundManager.playClick();
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2200);
    });
  };

  const handleStartGame = async () => {
    if (!currentRoom) return;
    soundManager.playClick();
    try {
      await onlineService.startGame();
    } catch (err) {
      console.warn('Start game error:', err);
    }
    onLaunchGame(currentRoom.gameId as GameId);
    onClose();
  };

  const handleLeaveRoom = () => {
    soundManager.playClick();
    onlineService.leaveRoom();
  };

  const myId = onlineService.getPlayerId();
  const isHost = onlineService.isHost();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-stone-900 border border-stone-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Bar */}
        <div className="p-5 sm:p-6 border-b border-stone-800 bg-stone-900/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl font-black text-stone-100 flex items-center gap-2">
                <span>اللعب أونلاين</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  متصل ومباشر 🟢
                </span>
              </h2>
              <p className="text-xs text-stone-400">
                غرف عامة للمطابقة السريعة أو غرف خاصة برمز سري لأصدقائك
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-200 hover:bg-stone-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center justify-between animate-in fade-in">
              <span>⚠️ {errorMessage}</span>
              <button
                onClick={() => setErrorMessage('')}
                className="text-red-400 hover:text-red-300 font-bold"
              >
                ✕
              </button>
            </div>
          )}

          {/* ACTIVE ROOM LOBBY VIEW */}
          {currentRoom ? (
            <div className="space-y-6">
              {/* Room Card Status */}
              <div className="p-5 rounded-2xl bg-stone-950 border border-amber-500/30 relative overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-400/10 text-amber-400 border border-amber-400/20">
                        {currentRoom.isPublic ? 'غرفة عامة تلقائية 🌐' : 'غرفة خاصة برمز 🔒'}
                      </span>
                      <span className="text-xs text-stone-400">
                        اللعبة:{' '}
                        <span className="text-stone-200 font-semibold">
                          {currentRoom.gameId === 'ludo'
                            ? 'لودو'
                            : currentRoom.gameId === 'jackaroo'
                            ? 'جاكارو'
                            : currentRoom.gameId === 'carrom'
                            ? 'كيرم'
                            : currentRoom.gameId}
                        </span>
                      </span>
                    </div>

                    <div className="flex items-baseline gap-2">
                      <span className="text-xs text-stone-400">رمز الغرفة:</span>
                      <span className="text-3xl font-black tracking-widest text-amber-400 font-mono">
                        {currentRoom.code}
                      </span>
                    </div>
                  </div>

                  {/* Actions: Copy Link & Show QR */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopyLink}
                      className="px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-xs font-bold text-stone-200 border border-stone-700 flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                    >
                      {copiedLink ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-400" />
                          <span className="text-emerald-400">تم النسخ!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 text-stone-400" />
                          <span>نسخ الرابط</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => setShowQrModal(true)}
                      className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 transition-all cursor-pointer shadow-sm"
                      title="عرض الباركود للمسح بالجوال"
                    >
                      <QrCode className="w-4 h-4 text-amber-400" />
                    </button>
                  </div>
                </div>

                {/* Direct Link Info text */}
                <p className="mt-3 text-xs text-stone-400 pt-3 border-t border-stone-850 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>
                    شارك الرابط أو الكود مع أصدقائك في الجلسة أو عن بعد للدخول الفوري!
                  </span>
                </p>
              </div>

              {/* Connected Players List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-stone-400 font-medium px-1">
                  <span>
                    اللاعبون المتصلون ({currentRoom.players.length} / {currentRoom.maxPlayers})
                  </span>
                  <span>{currentRoom.status === 'playing' ? 'المباراة جارية' : 'في الانتظار'}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {currentRoom.players.map((p, idx) => (
                    <div
                      key={p.id || idx}
                      className="p-3 rounded-2xl bg-stone-950 border border-stone-800 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 shadow-inner"
                          style={{
                            backgroundColor: p.color + '25',
                            border: `2px solid ${p.color}`,
                          }}
                        >
                          {p.avatar || '😎'}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-bold text-stone-100 truncate">
                              {p.name}
                            </span>
                            {p.id === myId && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 font-bold shrink-0">
                                أنت
                              </span>
                            )}
                            {p.isHost && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-yellow-500/20 text-yellow-300 font-bold shrink-0">
                                👑 مضيف
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-stone-400">
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                p.isOnline ? 'bg-emerald-400' : 'bg-stone-600'
                              }`}
                            />
                            <span>{p.isOnline ? 'متصل' : 'غير متصل'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <span className="text-xs px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                          جاهز ✓
                        </span>
                      </div>
                    </div>
                  ))}

                  {/* Empty Slot Placeholders */}
                  {Array.from({ length: currentRoom.maxPlayers - currentRoom.players.length }).map(
                    (_, i) => (
                      <div
                        key={`empty-${i}`}
                        className="p-3 rounded-2xl bg-stone-950/40 border border-dashed border-stone-800 flex items-center justify-center gap-2 text-stone-600 text-xs"
                      >
                        <span className="w-2 h-2 rounded-full bg-stone-700 animate-pulse" />
                        <span>بانتظار لاعب {currentRoom.players.length + i + 1}...</span>
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* Lobby Action Controls */}
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                {isHost ? (
                  <button
                    onClick={handleStartGame}
                    disabled={currentRoom.players.length < 2}
                    className={`flex-1 w-full py-3.5 px-6 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer ${
                      currentRoom.players.length >= 2
                        ? 'bg-amber-400 hover:bg-amber-300 text-stone-950 shadow-amber-400/20'
                        : 'bg-stone-800 text-stone-500 cursor-not-allowed'
                    }`}
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>
                      {currentRoom.players.length >= 2
                        ? 'بدء اللعبة الآن 🚀'
                        : 'في انتظار لاعب آخر على الأقل للبدء (2 لاعبين)'}
                    </span>
                  </button>
                ) : (
                  <div className="flex-1 w-full p-3.5 rounded-2xl bg-stone-950 border border-stone-800 text-center text-xs text-stone-400 flex items-center justify-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                    <span>في انتظار المضيف لبدء المباراة... جهز نفسك!</span>
                  </div>
                )}

                <button
                  onClick={handleLeaveRoom}
                  className="w-full sm:w-auto py-3.5 px-4 rounded-2xl bg-stone-800 hover:bg-stone-700 text-xs font-bold text-red-400 border border-stone-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>مغادرة الغرفة</span>
                </button>
              </div>
            </div>
          ) : (
            /* ROOM SELECTION TABS & MATCHMAKING */
            <div className="space-y-6">
              {/* Profile Bar: Name & Avatar */}
              <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800 space-y-3">
                <span className="text-xs font-bold text-stone-400">ملفك في اللعب أونلاين:</span>
                <div className="flex items-center gap-3">
                  <div className="relative group">
                    <div className="w-12 h-12 rounded-2xl bg-stone-800 border-2 border-amber-400/60 flex items-center justify-center text-2xl shadow-inner cursor-pointer">
                      {playerAvatar}
                    </div>
                  </div>
                  <div className="flex-1">
                    <input
                      type="text"
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      placeholder="اسمك في اللعبة"
                      maxLength={18}
                      className="w-full bg-stone-900 border border-stone-750 focus:border-amber-400 rounded-xl px-3.5 py-2 text-sm text-stone-100 placeholder-stone-600 outline-none transition-colors"
                    />
                  </div>
                </div>

                {/* Avatar Quick Select */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 scrollbar-none">
                  {AVATARS.map((av) => (
                    <button
                      key={av}
                      type="button"
                      onClick={() => {
                        soundManager.playClick();
                        setPlayerAvatar(av);
                      }}
                      className={`w-8 h-8 rounded-xl text-base flex items-center justify-center transition-all cursor-pointer ${
                        playerAvatar === av
                          ? 'bg-amber-400/20 border-2 border-amber-400 scale-110'
                          : 'bg-stone-900 hover:bg-stone-800 border border-stone-800 opacity-70 hover:opacity-100'
                      }`}
                    >
                      {av}
                    </button>
                  ))}
                </div>
              </div>

              {/* Game Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-stone-400">اختر اللعبة:</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'baloot' as GameId, name: 'بلوت 🃏🔥', desc: 'صن وحكم 152' },
                    { id: 'ludo' as GameId, name: 'لودو 🎲', desc: 'نرد وطرد' },
                    { id: 'jackaroo' as GameId, name: 'جاكارو ♠️', desc: 'أوراق وتكتيك' },
                    { id: 'carrom' as GameId, name: 'كيرم ⚪', desc: 'ضربات وفيزياء' },
                  ].map((g) => (
                    <button
                      key={g.id}
                      onClick={() => {
                        soundManager.playClick();
                        setSelectedGame(g.id);
                      }}
                      className={`p-3 rounded-2xl text-right transition-all cursor-pointer border ${
                        selectedGame === g.id
                          ? 'bg-amber-400/10 border-amber-400 text-stone-100 shadow-md ring-1 ring-amber-400/40'
                          : 'bg-stone-950 hover:bg-stone-850 border-stone-800 text-stone-400'
                      }`}
                    >
                      <div className="font-bold text-xs sm:text-sm">{g.name}</div>
                      <div className="text-[10px] text-stone-500 mt-0.5">{g.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tabs: Public (Auto-Match) vs Private */}
              <div className="flex items-center p-1 rounded-2xl bg-stone-950 border border-stone-800">
                <button
                  onClick={() => {
                    soundManager.playClick();
                    setActiveTab('public');
                  }}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    activeTab === 'public'
                      ? 'bg-amber-400 text-stone-950 shadow-md font-black'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>غرفة عامة تلقائية (مطابقة سريعة ⚡)</span>
                </button>
                <button
                  onClick={() => {
                    soundManager.playClick();
                    setActiveTab('private');
                  }}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    activeTab === 'private'
                      ? 'bg-amber-400 text-stone-950 shadow-md font-black'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>غرفة خاصة (تتطلب كود 🔒)</span>
                </button>
              </div>

              {/* TAB 1: PUBLIC AUTO-MATCH */}
              {activeTab === 'public' && (
                <div className="p-5 rounded-2xl bg-stone-950 border border-stone-800 space-y-4">
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-stone-200 flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-amber-400" />
                      <span>دخول تلقائي مع أي لاعب متصل</span>
                    </h3>
                    <p className="text-xs text-stone-400 leading-relaxed">
                      بمجرد الضغط يدخلك النظام فوراً في أي طاولة عامة مفتوحة بانتظار لاعبين، أو ينشئ
                      لك طاولة عامة جديدة يدخل فيها أول لاعب يبحث تلقائياً!
                    </p>
                  </div>

                  {isSearching ? (
                    <div className="py-6 flex flex-col items-center justify-center space-y-3">
                      <div className="relative w-16 h-16 flex items-center justify-center">
                        <div className="absolute inset-0 rounded-full border-2 border-amber-400 animate-ping opacity-40" />
                        <div className="w-12 h-12 rounded-full bg-amber-400/20 border border-amber-400 flex items-center justify-center text-amber-400">
                          <Radio className="w-6 h-6 animate-pulse" />
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-bold text-stone-200">
                          جاري البحث عن لاعبين متاحين...
                        </div>
                        <div className="text-xs text-stone-400 mt-0.5">
                          يرجى الانتظار بضع ثوانٍ للمطابقة
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={handleAutoMatch}
                      className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-stone-950 font-black text-sm shadow-xl shadow-amber-400/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Zap className="w-4 h-4 fill-current" />
                      <span>⚡ دخول سريع / غرفة عامة تلقائية</span>
                    </button>
                  )}
                </div>
              )}

              {/* TAB 2: PRIVATE ROOM WITH CODE */}
              {activeTab === 'private' && (
                <div className="space-y-4">
                  {/* Action 1: Create Private Room */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-stone-950 border border-stone-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-stone-200 flex items-center gap-1.5">
                        <Lock className="w-4 h-4 text-amber-400" />
                        <span>إنشاء غرفة خاصة جديدة</span>
                      </h3>
                      <div className="flex items-center gap-1 text-xs text-stone-400">
                        <span>اللاعبين:</span>
                        <select
                          value={maxPlayers}
                          onChange={(e) => setMaxPlayers(Number(e.target.value))}
                          className="bg-stone-900 border border-stone-700 rounded-lg px-2 py-1 text-amber-400 font-bold outline-none"
                        >
                          <option value={2}>2 لاعبين</option>
                          <option value={3}>3 لاعبين</option>
                          <option value={4}>4 لاعبين</option>
                        </select>
                      </div>
                    </div>
                    <p className="text-xs text-stone-400">
                      ينشئ رمزاً سرياً خاصاً مكوناً من 4 خانات ورابط مباشر للمشاركة مع أصدقائك في
                      الجلسة.
                    </p>
                    <button
                      onClick={handleCreatePrivate}
                      className="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>توليد كود غرفة خاصة</span>
                    </button>
                  </div>

                  {/* Action 2: Join with Code */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-stone-950 border border-stone-800 space-y-3">
                    <h3 className="text-sm font-bold text-stone-200 flex items-center gap-1.5">
                      <ArrowRight className="w-4 h-4 text-emerald-400" />
                      <span>الانضمام برمز غرفة خاصة</span>
                    </h3>
                    <p className="text-xs text-stone-400">
                      إذا شارك معك صديقك رمز الغرفة، أدخله هنا للانضمام لطاولته مباشرة:
                    </p>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={privateCodeInput}
                        onChange={(e) => setPrivateCodeInput(e.target.value.toUpperCase().slice(0, 6))}
                        placeholder="مثال: JMAH"
                        className="flex-1 bg-stone-900 border border-stone-750 focus:border-amber-400 rounded-xl px-4 py-2.5 text-base font-black tracking-widest text-amber-400 uppercase text-center placeholder-stone-600 outline-none font-mono"
                      />
                      <button
                        onClick={handleJoinPrivate}
                        className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-black text-xs transition-all cursor-pointer shadow-md flex items-center gap-1.5"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                        <span>انضمام</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* QR Code Popover Modal */}
      {showQrModal && qrDataUrl && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-stone-950/90 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-xs bg-stone-900 border border-stone-800 rounded-3xl p-6 text-center space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-400">امسح الكاميرا للدخول الفوري</span>
              <button
                onClick={() => setShowQrModal(false)}
                className="p-1 text-stone-400 hover:text-stone-200"
              >
                ✕
              </button>
            </div>
            <div className="bg-stone-100 p-3 rounded-2xl shadow-inner inline-block">
              <img src={qrDataUrl} alt="QR Code for Room" className="w-56 h-56 mx-auto rounded-lg" />
            </div>
            <div className="text-xs text-stone-400 font-mono">
              كود الغرفة:{' '}
              <span className="text-amber-400 font-black text-base">{currentRoom?.code}</span>
            </div>
            <button
              onClick={() => setShowQrModal(false)}
              className="w-full py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
