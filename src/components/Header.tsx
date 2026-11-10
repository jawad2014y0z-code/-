import React, { useState, useEffect } from 'react';
import { GameId } from '../types/game';
import { soundManager } from '../utils/audio';
import { onlineService, OnlineRoom } from '../services/onlineService';
import { authService, AuthUser } from '../services/authService';
import {
  Volume2,
  VolumeX,
  Users,
  Maximize,
  Edit3,
  Globe,
  Radio,
  Layers,
  Sparkles,
  LogIn,
  LogOut,
  User,
} from 'lucide-react';

interface HeaderProps {
  gatheringName: string;
  onOpenNameModal: () => void;
  currentGame: GameId;
  onSelectGame: (game: GameId) => void;
  onOpenPlayersManager: () => void;
  onOpenRules: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onOpenOnline: () => void;
  onlineRoomCode?: string | null;
  onOpenLoginModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  gatheringName,
  onOpenNameModal,
  currentGame,
  onSelectGame,
  onOpenPlayersManager,
  onOpenRules,
  soundEnabled,
  onToggleSound,
  onOpenOnline,
  onlineRoomCode,
  onOpenLoginModal,
}) => {
  // Auth state
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(authService.getCurrentUser());
  const [showUserMenu, setShowUserMenu] = useState<boolean>(false);

  useEffect(() => {
    const unsub = authService.subscribe((u) => {
      setCurrentUser(u);
    });
    return unsub;
  }, []);

  // Real-time room subscription for connected players badge
  const [currentRoom, setCurrentRoom] = useState<OnlineRoom | null>(onlineService.getRoom());
  const [globalStats, setGlobalStats] = useState<{ activeRooms: number; onlinePlayers: number }>({
    activeRooms: 0,
    onlinePlayers: 0,
  });

  useEffect(() => {
    const unsub = onlineService.subscribeRoom((room) => {
      setCurrentRoom(room);
    });
    return unsub;
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/stats');
        if (res.ok) {
          const data = await res.json();
          setGlobalStats({
            activeRooms: data.activeRooms || 0,
            onlinePlayers: data.onlinePlayers || 0,
          });
        }
      } catch {
        // silent fail
      }
    };
    fetchStats();
    const interval = setInterval(fetchStats, 6000);
    return () => clearInterval(interval);
  }, []);

  const toggleFullScreen = () => {
    soundManager.playClick();
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Connected players count in the active room
  const activeRoom = currentRoom;
  const connectedPlayersCount = activeRoom
    ? activeRoom.players.filter((p) => p.isOnline).length
    : 0;

  return (
    <header className="sticky top-0 z-40 w-full bg-stone-950/90 backdrop-blur-md border-b border-stone-850 px-3 sm:px-8 py-3 flex items-center justify-between gap-4">
      {/* Zone 1: Wordmark with rename trigger */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => {
            soundManager.playClick();
            onSelectGame('hub');
          }}
          className="text-xl sm:text-2xl font-black tracking-tight text-amber-400 hover:text-amber-300 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
        >
          <span>{gatheringName}</span>
        </button>

        <button
          onClick={() => {
            soundManager.playClick();
            onOpenNameModal();
          }}
          title="تغيير اسم الجلسة"
          className="p-1 text-stone-500 hover:text-amber-400 hover:bg-stone-900 rounded-lg transition-colors shrink-0"
        >
          <Edit3 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Zone 2: Navigation links */}
      <nav className="hidden lg:flex items-center gap-5 text-xs sm:text-sm font-semibold text-stone-400">
        <button
          onClick={() => {
            soundManager.playClick();
            onSelectGame('hub');
          }}
          className={`hover:text-amber-400 transition-colors whitespace-nowrap shrink-0 ${
            currentGame === 'hub' ? 'text-amber-400 font-bold' : ''
          }`}
        >
          صالة الألعاب
        </button>
        <button
          onClick={() => {
            soundManager.playClick();
            onOpenRules();
          }}
          className="hover:text-amber-400 transition-colors whitespace-nowrap shrink-0"
        >
          قوانين الألعاب
        </button>

        {/* Taqtaqah Link (Highlighted) */}
        <button
          onClick={() => {
            soundManager.playClick();
            onSelectGame('taqtaqah');
          }}
          className={`hover:text-amber-400 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
            currentGame === 'taqtaqah' ? 'text-amber-400 font-bold' : ''
          }`}
        >
          <span>طقطقة</span>
          <span className="bg-red-500/20 text-red-400 text-[10px] px-1.5 py-0.5 rounded-full font-black border border-red-500/30">
            ضحك 🤣
          </span>
        </button>

        {/* Baloot Link */}
        <button
          onClick={() => {
            soundManager.playClick();
            onSelectGame('baloot');
          }}
          className={`hover:text-amber-400 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
            currentGame === 'baloot' ? 'text-amber-400 font-bold' : ''
          }`}
        >
          <span>بلوت</span>
          <span className="bg-amber-500/20 text-amber-400 text-[10px] px-1.5 py-0.5 rounded-full font-black border border-amber-500/30">
            152 🃏
          </span>
        </button>

        <button
          onClick={() => {
            soundManager.playClick();
            onSelectGame('ludo');
          }}
          className={`hover:text-amber-400 transition-colors whitespace-nowrap shrink-0 ${
            currentGame === 'ludo' ? 'text-amber-400 font-bold' : ''
          }`}
        >
          لودو
        </button>
        <button
          onClick={() => {
            soundManager.playClick();
            onSelectGame('jackaroo');
          }}
          className={`hover:text-amber-400 transition-colors whitespace-nowrap shrink-0 ${
            currentGame === 'jackaroo' ? 'text-amber-400 font-bold' : ''
          }`}
        >
          جاكارو
        </button>
        <button
          onClick={() => {
            soundManager.playClick();
            onSelectGame('carrom');
          }}
          className={`hover:text-amber-400 transition-colors whitespace-nowrap shrink-0 ${
            currentGame === 'carrom' ? 'text-amber-400 font-bold' : ''
          }`}
        >
          كيرم
        </button>
      </nav>

      {/* Zone 3: Live Website Players Counter, Online Room, Sound & Controls */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Dedicated Live Website Players Badge (دائماً معروض لمعرفة عدد المتواجدين في الموقع) */}
        <div
          title={`اللاعبون المتواجدون في موقع جمعة الآن: ${globalStats.onlinePlayers} لاعبين (${globalStats.activeRooms} غرف مفتوحة)`}
          className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-stone-900 border border-emerald-500/40 text-stone-200 flex items-center gap-2 shadow-sm select-none"
        >
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <div className="flex items-center gap-1 text-xs">
            <span className="text-stone-400 hidden sm:inline">في الموقع:</span>
            <span className="text-emerald-400 font-black text-xs sm:text-sm">
              {globalStats.onlinePlayers}
            </span>
            <span className="text-stone-300 text-[11px] sm:text-xs">لاعب</span>
          </div>
        </div>

        {/* Dynamic Connected Players Badge in Room OR Online Play Trigger */}
        {activeRoom ? (
          <button
            onClick={() => {
              soundManager.playClick();
              onOpenOnline();
            }}
            title={`الغرفة #${activeRoom.code}: ${connectedPlayersCount} من ${activeRoom.maxPlayers} لاعبين متصلين`}
            className="px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-md border bg-emerald-950/70 border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/70 hover:border-emerald-400"
          >
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="text-emerald-300 text-[11px] hidden sm:inline">الغرفة:</span>
              <span className="text-emerald-400 font-black text-xs">
                {connectedPlayersCount}/{activeRoom.maxPlayers}
              </span>
              <span className="font-mono text-[10px] bg-emerald-500/20 px-1.5 py-0.5 rounded text-emerald-200 border border-emerald-500/30">
                #{activeRoom.code}
              </span>
            </div>
          </button>
        ) : (
          <button
            onClick={() => {
              soundManager.playClick();
              onOpenOnline();
            }}
            title="الانضمام إلى غرفة عامة أو إنشاء غرفة خاصة"
            className="px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-sm border bg-stone-900 border-amber-500/30 text-amber-300 hover:bg-amber-400/10 hover:border-amber-400/50"
          >
            <Radio className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span className="hidden sm:inline">اللعب أونلاين</span>
            <span className="sm:hidden">أونلاين</span>
            <span className="bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded text-[10px] font-bold">
              ⚡
            </span>
          </button>
        )}

        <button
          onClick={onToggleSound}
          title={soundEnabled ? 'كتم الصوت' : 'تشغيل الصوت'}
          className="p-2 text-stone-400 hover:text-stone-100 bg-stone-900 hover:bg-stone-800 rounded-xl transition-colors border border-stone-800 cursor-pointer"
        >
          {soundEnabled ? (
            <Volume2 className="w-4 h-4 text-amber-400" />
          ) : (
            <VolumeX className="w-4 h-4 text-stone-500" />
          )}
        </button>

        <button
          onClick={toggleFullScreen}
          title="ملء الشاشة"
          className="p-2 text-stone-400 hover:text-stone-100 bg-stone-900 hover:bg-stone-800 rounded-xl transition-colors border border-stone-800 hidden sm:flex cursor-pointer"
        >
          <Maximize className="w-4 h-4" />
        </button>

        {/* User Account / Profile Dropdown OR Login Trigger */}
        {currentUser ? (
          <div className="relative">
            <button
              onClick={() => {
                soundManager.playClick();
                setShowUserMenu(!showUserMenu);
              }}
              className="px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs font-black rounded-xl bg-stone-900 hover:bg-stone-850 text-stone-100 border border-amber-500/50 flex items-center gap-1.5 shadow-md cursor-pointer transition-all"
              title="حسابك الشخصي"
            >
              <span className="text-base sm:text-lg">{currentUser.avatar}</span>
              <span className="max-w-[70px] sm:max-w-[100px] truncate">{currentUser.name}</span>
            </button>

            {showUserMenu && (
              <div className="absolute left-0 mt-2 w-48 bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl p-2 z-50 text-right space-y-1 animate-in fade-in zoom-in-95">
                <div className="p-2 border-b border-stone-800 flex items-center gap-2">
                  <span className="text-2xl">{currentUser.avatar}</span>
                  <div className="truncate">
                    <span className="text-xs font-black text-amber-400 block truncate">
                      {currentUser.name}
                    </span>
                    <span className="text-[10px] text-stone-500">حسابك مسجل 🔑</span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    soundManager.playClick();
                    setShowUserMenu(false);
                    onOpenLoginModal();
                  }}
                  className="w-full text-right px-2.5 py-1.5 text-xs text-stone-300 hover:text-white hover:bg-stone-800 rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5 text-amber-400" />
                  <span>تبديل الحساب</span>
                </button>
                <button
                  onClick={() => {
                    soundManager.playClick();
                    authService.logout();
                    setShowUserMenu(false);
                  }}
                  className="w-full text-right px-2.5 py-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-950/40 rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>تسجيل الخروج</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => {
              soundManager.playClick();
              onOpenLoginModal();
            }}
            className="px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs font-black rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-stone-950 shadow-md flex items-center gap-1.5 cursor-pointer transition-all"
            title="تسجيل الدخول (فقط ضع اسمك وكلمة سر)"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">تسجيل الدخول 🔑</span>
            <span className="sm:hidden">دخول 🔑</span>
          </button>
        )}

        <button
          onClick={onOpenPlayersManager}
          title="تغيير أسماء اللاعبين"
          className="px-3 py-1.5 sm:py-2 text-xs font-bold text-stone-200 bg-stone-900 hover:bg-stone-800 border border-stone-800 rounded-xl transition-all shadow-sm flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Users className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline">اللاعبين ✏️</span>
          <span className="sm:hidden">اللاعبين</span>
        </button>
      </div>
    </header>
  );
};
