/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { GameId, Player } from './types/game';
import { soundManager } from './utils/audio';
import { onlineService, OnlineRoom } from './services/onlineService';
import { authService, AuthUser } from './services/authService';
import { Header } from './components/Header';
import { Hub } from './components/Hub';
import { LudoGame } from './components/games/LudoGame';
import { JackarooGame } from './components/games/JackarooGame';
import { CarromGame } from './components/games/CarromGame';
import { BarraAlSalfaGame } from './components/games/BarraAlSalfaGame';
import { MafiaGame } from './components/games/MafiaGame';
import { BalootGame } from './components/games/BalootGame';
import { TaqtaqahGame } from './components/games/TaqtaqahGame';
import { RulesModal } from './components/RulesModal';
import { PlayersManagerModal } from './components/PlayersManagerModal';
import { GatheringNameModal } from './components/GatheringNameModal';
import { OnlineRoomModal } from './components/OnlineRoomModal';
import { MusicPlayerBar } from './components/MusicPlayerBar';
import { LoginModal } from './components/LoginModal';
import { GlobalChatDrawer } from './components/GlobalChatDrawer';

const DEFAULT_PLAYERS: Player[] = [
  { id: 'p-1', name: 'محمد', color: '#ef4444', avatar: '😎' },
  { id: 'p-2', name: 'خالد', color: '#10b981', avatar: '🦁' },
  { id: 'p-3', name: 'فيصل', color: '#f59e0b', avatar: '⚡' },
  { id: 'p-4', name: 'سارة', color: '#3b82f6', avatar: '👑' },
  { id: 'p-5', name: 'نورة', color: '#ec4899', avatar: '💎' },
  { id: 'p-6', name: 'عمر', color: '#8b5cf6', avatar: '🚀' },
];

export default function App() {
  const [currentGame, setCurrentGame] = useState<GameId>('hub');
  const [gatheringName, setGatheringName] = useState<string>(() => {
    try {
      return localStorage.getItem('jumah_gathering_name') || 'جمعة';
    } catch {
      return 'جمعة';
    }
  });

  const [players, setPlayers] = useState<Player[]>(() => {
    try {
      const saved = localStorage.getItem('jumah_players');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 2) return parsed;
      }
    } catch {
      // ignore
    }
    return DEFAULT_PLAYERS;
  });

  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isRulesOpen, setIsRulesOpen] = useState<boolean>(false);
  const [rulesInitialGame, setRulesInitialGame] = useState<GameId>('ludo');
  const [isPlayersModalOpen, setIsPlayersModalOpen] = useState<boolean>(false);
  const [isNameModalOpen, setIsNameModalOpen] = useState<boolean>(false);

  // Online Multiplayer State
  const [isOnlineModalOpen, setIsOnlineModalOpen] = useState<boolean>(false);
  const [onlineRoom, setOnlineRoom] = useState<OnlineRoom | null>(onlineService.getRoom());

  // Simple Auth System State (Name + Password)
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);

  useEffect(() => {
    const unsub = authService.subscribe((user) => {
      if (user) {
        setPlayers((prev) => {
          const updated = [...prev];
          if (updated[0]) {
            updated[0] = { ...updated[0], name: user.name, avatar: user.avatar };
          }
          return updated;
        });
        onlineService.sendPresence(user.name);
      }
    });
    return unsub;
  }, []);

  // Subscribe to room updates
  useEffect(() => {
    const unsub = onlineService.subscribeRoom((room) => {
      setOnlineRoom(room);
      if (room && room.status === 'playing') {
        setCurrentGame(room.gameId as GameId);
        setIsOnlineModalOpen(false);
      }
    });
    return unsub;
  }, []);

  // Check URL query parameters for auto-joining room (e.g. ?room=ABCD)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const roomParam = params.get('room') || params.get('join');
      if (roomParam) {
        const cleanCode = roomParam.trim().toUpperCase();
        setIsOnlineModalOpen(true);
        onlineService
          .joinRoom(cleanCode, players[0]?.name || 'لاعب', players[0]?.avatar || '🦁')
          .then((room) => {
            if (room.status === 'playing') {
              setCurrentGame(room.gameId as GameId);
              setIsOnlineModalOpen(false);
            }
          })
          .catch(() => {});
      }
    } catch {
      // ignore
    }
  }, []);

  // Sync custom gathering name to localStorage
  const handleSaveGatheringName = (newName: string) => {
    setGatheringName(newName);
    try {
      localStorage.setItem('jumah_gathering_name', newName);
    } catch {
      // ignore
    }
  };

  // Sync players to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('jumah_players', JSON.stringify(players));
    } catch {
      // ignore
    }
  }, [players]);

  const handleToggleSound = () => {
    const newState = soundManager.toggle();
    setSoundEnabled(newState);
    if (newState) soundManager.playClick();
  };

  const handleOpenRules = (game?: GameId) => {
    soundManager.playClick();
    if (game && game !== 'hub') {
      setRulesInitialGame(game);
    } else if (currentGame !== 'hub') {
      setRulesInitialGame(currentGame);
    }
    setIsRulesOpen(true);
  };

  const handleSavePlayers = (newPlayers: Player[]) => {
    setPlayers(newPlayers);
  };

  const handleUpdatePlayerName = (id: string, name: string) => {
    setPlayers((prev) => prev.map((p) => (p.id === id ? { ...p, name } : p)));
  };

  const handleOpenOnline = () => {
    soundManager.playClick();
    setIsOnlineModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col justify-between selection:bg-amber-500 selection:text-stone-950">
      {/* Top Bar Navigation with Gathering Name, Online Status & Controls */}
      <Header
        gatheringName={gatheringName}
        onOpenNameModal={() => {
          soundManager.playClick();
          setIsNameModalOpen(true);
        }}
        currentGame={currentGame}
        onSelectGame={(g) => setCurrentGame(g)}
        onOpenPlayersManager={() => {
          soundManager.playClick();
          setIsPlayersModalOpen(true);
        }}
        onOpenRules={() => handleOpenRules()}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
        onOpenOnline={handleOpenOnline}
        onlineRoomCode={onlineRoom?.code}
        onOpenLoginModal={() => {
          soundManager.playClick();
          setIsLoginModalOpen(true);
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full py-4 sm:py-6">
        {currentGame === 'hub' && (
          <Hub
            gatheringName={gatheringName}
            onOpenNameModal={() => {
              soundManager.playClick();
              setIsNameModalOpen(true);
            }}
            onSelectGame={(g) => setCurrentGame(g)}
            onOpenRules={handleOpenRules}
            onOpenPlayers={() => setIsPlayersModalOpen(true)}
            players={players}
            onUpdatePlayerName={handleUpdatePlayerName}
            onOpenOnline={handleOpenOnline}
          />
        )}

        {currentGame === 'taqtaqah' && (
          <TaqtaqahGame
            players={players}
            onBack={() => {
              soundManager.playClick();
              setCurrentGame('hub');
            }}
            onOpenRules={() => handleOpenRules('taqtaqah')}
            onUpdatePlayerName={handleUpdatePlayerName}
          />
        )}

        {currentGame === 'baloot' && (
          <BalootGame
            players={players}
            onBack={() => {
              soundManager.playClick();
              setCurrentGame('hub');
            }}
            onOpenRules={() => handleOpenRules('baloot')}
            onUpdatePlayerName={handleUpdatePlayerName}
            onOpenOnline={handleOpenOnline}
          />
        )}

        {currentGame === 'ludo' && (
          <LudoGame
            players={players}
            onBack={() => {
              soundManager.playClick();
              setCurrentGame('hub');
            }}
            onOpenRules={() => handleOpenRules('ludo')}
            onUpdatePlayerName={handleUpdatePlayerName}
            onOpenOnline={handleOpenOnline}
          />
        )}

        {currentGame === 'jackaroo' && (
          <JackarooGame
            players={players}
            onBack={() => {
              soundManager.playClick();
              setCurrentGame('hub');
            }}
            onOpenRules={() => handleOpenRules('jackaroo')}
            onUpdatePlayerName={handleUpdatePlayerName}
          />
        )}

        {currentGame === 'carrom' && (
          <CarromGame
            players={players}
            onBack={() => {
              soundManager.playClick();
              setCurrentGame('hub');
            }}
            onOpenRules={() => handleOpenRules('carrom')}
            onUpdatePlayerName={handleUpdatePlayerName}
          />
        )}

        {currentGame === 'barra_alsalfa' && (
          <BarraAlSalfaGame
            players={players}
            onBack={() => {
              soundManager.playClick();
              setCurrentGame('hub');
            }}
            onOpenRules={() => handleOpenRules('barra_alsalfa')}
            onUpdatePlayerName={handleUpdatePlayerName}
          />
        )}

        {currentGame === 'mafia' && (
          <MafiaGame
            players={players}
            onBack={() => {
              soundManager.playClick();
              setCurrentGame('hub');
            }}
            onOpenRules={() => handleOpenRules('mafia')}
            onUpdatePlayerName={handleUpdatePlayerName}
          />
        )}
      </main>

      {/* Floating Music Player with Track Selection & Volume */}
      <MusicPlayerBar />

      {/* Footer */}
      <footer className="w-full border-t border-stone-850 py-6 px-4 text-center text-xs text-stone-500 bg-stone-950">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>«{gatheringName}» — منصة الألعاب الجماعية للجلسات والبيت</span>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>لعب أونلاين عبر الغرف التلقائية والخاصة أو محلي على نفس الشاشة</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <OnlineRoomModal
        isOpen={isOnlineModalOpen}
        onClose={() => setIsOnlineModalOpen(false)}
        defaultGameId={currentGame === 'hub' ? 'ludo' : currentGame}
        onLaunchGame={(g) => setCurrentGame(g)}
        initialPlayerName={players[0]?.name || 'لاعب'}
      />

      <GatheringNameModal
        isOpen={isNameModalOpen}
        onClose={() => setIsNameModalOpen(false)}
        currentName={gatheringName}
        onSaveName={handleSaveGatheringName}
      />

      <RulesModal
        isOpen={isRulesOpen}
        onClose={() => setIsRulesOpen(false)}
        initialGame={rulesInitialGame}
      />

      <PlayersManagerModal
        isOpen={isPlayersModalOpen}
        onClose={() => setIsPlayersModalOpen(false)}
        players={players}
        onSavePlayers={handleSavePlayers}
      />

      {/* Global Real-Time Chat Drawer */}
      <GlobalChatDrawer
        onOpenLoginModal={() => setIsLoginModalOpen(true)}
        defaultUserName={players[0]?.name || 'لاعب'}
        defaultUserAvatar={players[0]?.avatar || '😎'}
      />

      {/* Login / Registration Modal (Name + Password) */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={(user) => {
          setPlayers((prev) => {
            const updated = [...prev];
            if (updated[0]) {
              updated[0] = { ...updated[0], name: user.name, avatar: user.avatar };
            }
            return updated;
          });
        }}
      />
    </div>
  );
}
