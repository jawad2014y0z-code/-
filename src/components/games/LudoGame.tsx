import React, { useState, useEffect } from 'react';
import { Player } from '../../types/game';
import { soundManager } from '../../utils/audio';
import { triggerConfetti } from '../../utils/confetti';
import { onlineService, OnlineRoom, ChatMessage } from '../../services/onlineService';
import {
  RotateCcw,
  Volume2,
  Users,
  Trophy,
  Play,
  Info,
  Radio,
  LogOut,
  Sparkles,
  Send,
  MessageSquare,
} from 'lucide-react';

interface Piece {
  id: number;
  playerIdx: number;
  step: number; // -1: base, 0..50: track, 51..55: home corridor, 56: finished home
}

interface LudoGameProps {
  players: Player[];
  onBack: () => void;
  onOpenRules: () => void;
  onUpdatePlayerName?: (id: string, name: string) => void;
  onOpenOnline?: () => void;
}

const PLAYER_THEMES = [
  { name: 'الأحمر', color: 'red', bg: 'bg-red-600', ring: 'ring-red-400', text: 'text-red-400', border: 'border-red-500', startOffset: 0, hex: '#ef4444' },
  { name: 'الأخضر', color: 'green', bg: 'bg-emerald-600', ring: 'ring-emerald-400', text: 'text-emerald-400', border: 'border-emerald-500', startOffset: 13, hex: '#10b981' },
  { name: 'الأصفر', color: 'yellow', bg: 'bg-amber-500', ring: 'ring-amber-300', text: 'text-amber-400', border: 'border-amber-400', startOffset: 26, hex: '#f59e0b' },
  { name: 'الأزرق', color: 'blue', bg: 'bg-blue-600', ring: 'ring-blue-400', text: 'text-blue-400', border: 'border-blue-500', startOffset: 39, hex: '#3b82f6' },
];

const QUICK_EMOJIS = ['🎲', '🔥', '😂', '👏', '🎉', '🎯', '💥', '😎'];

// 52 track coordinate positions on 15x15 board (col, row from 0 to 14)
const TRACK_COORDINATES: Array<[number, number]> = [
  // Red side start (bottom-left quadrant going up)
  [1, 6], [2, 6], [3, 6], [4, 6], [5, 6],
  [6, 5], [6, 4], [6, 3], [6, 2], [6, 1], [6, 0],
  [7, 0], // Top turn
  [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5],
  [9, 6], [10, 6], [11, 6], [12, 6], [13, 6], [14, 6],
  [14, 7], // Right turn
  [14, 8], [13, 8], [12, 8], [11, 8], [10, 8], [9, 8],
  [8, 9], [8, 10], [8, 11], [8, 12], [8, 13], [8, 14],
  [7, 14], // Bottom turn
  [6, 14], [6, 13], [6, 12], [6, 11], [6, 10], [6, 9],
  [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8],
  [0, 7], // Left turn
  [0, 6],
];

// Safe tiles indices along the 52-cell track
const SAFE_STAR_INDICES = [0, 8, 13, 21, 26, 34, 39, 47];

// Home corridors (5 steps each)
const HOME_CORRIDORS: Record<number, Array<[number, number]>> = {
  0: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]], // Red (left to center)
  1: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]], // Green (top to center)
  2: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]], // Yellow (right to center)
  3: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]], // Blue (bottom to center)
};

export const LudoGame: React.FC<LudoGameProps> = ({
  players,
  onBack,
  onOpenRules,
  onUpdatePlayerName,
  onOpenOnline,
}) => {
  const [onlineRoom, setOnlineRoom] = useState<OnlineRoom | null>(onlineService.getRoom());
  const [reactions, setReactions] = useState<Array<{ id: string; text: string; sender: string }>>([]);

  const isOnline = Boolean(onlineRoom && onlineRoom.gameId === 'ludo');
  const mySlot = onlineService.getMySlot();

  // Active players: derive from online room if connected, else local players
  const numPlayers = isOnline
    ? Math.max(onlineRoom!.players.length, 2)
    : Math.min(Math.max(players.length, 2), 4);

  const activePlayers = isOnline
    ? Array.from({ length: numPlayers }).map((_, idx) => {
        const p = onlineRoom!.players[idx];
        return {
          id: p ? p.id : `slot-${idx}`,
          name: p ? p.name : PLAYER_THEMES[idx].name,
          color: PLAYER_THEMES[idx].hex,
          avatar: p ? p.avatar : '🦁',
        };
      })
    : players.slice(0, numPlayers);

  // 4 pieces per player
  const [pieces, setPieces] = useState<Piece[]>(() => {
    const initial: Piece[] = [];
    for (let p = 0; p < 4; p++) {
      for (let i = 0; i < 4; i++) {
        initial.push({ id: p * 4 + i, playerIdx: p, step: -1 });
      }
    }
    return initial;
  });

  const [currentPlayer, setCurrentPlayer] = useState<number>(0);
  const [diceValue, setDiceValue] = useState<number | null>(null);
  const [isRolling, setIsRolling] = useState<boolean>(false);
  const [hasRolled, setHasRolled] = useState<boolean>(false);
  const [consecutiveSixes, setConsecutiveSixes] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>('ابدأ اللعبة برمي النرد!');
  const [winner, setWinner] = useState<number | null>(null);
  const [podium, setPodium] = useState<number[]>([]);

  // Is it local player's turn?
  const isMyTurn = !isOnline || currentPlayer === mySlot;

  // Real-time synchronization listeners
  useEffect(() => {
    const unsubRoom = onlineService.subscribeRoom((room) => {
      setOnlineRoom(room);
      if (room && room.gameState) {
        if (room.gameState.pieces && Array.isArray(room.gameState.pieces)) {
          setPieces(room.gameState.pieces);
        }
        if (room.gameState.currentPlayer !== undefined) {
          setCurrentPlayer(room.gameState.currentPlayer);
        }
      }
    });

    const unsubAction = onlineService.subscribeAction((action, data) => {
      if (action === 'LUDO_ROLL_DICE') {
        const rollerSlot = data.rollerSlot;
        const val = data.diceValue;

        // If another device rolled, animate roll and update state
        setIsRolling(true);
        soundManager.playDiceRoll();

        setTimeout(() => {
          setDiceValue(val);
          setIsRolling(false);
          setHasRolled(true);
          processRoll(val, rollerSlot);
        }, 500);
      } else if (action === 'LUDO_MOVE_PIECE') {
        const { newPieces, nextPlayer, winner: won, podium: pod, captured } = data.payload;
        if (newPieces) setPieces(newPieces);
        if (captured) soundManager.playCapture();
        else soundManager.playMove();

        if (won !== undefined && won !== null) {
          setWinner(won);
          if (pod) setPodium(pod);
          triggerConfetti();
          soundManager.playFanfare();
        }

        if (nextPlayer !== undefined) {
          setCurrentPlayer(nextPlayer);
        }
        setDiceValue(null);
        setHasRolled(false);
        if (data.payload.statusMessage) {
          setStatusMessage(data.payload.statusMessage);
        }
      } else if (action === 'LUDO_ADVANCE_TURN') {
        setCurrentPlayer(data.payload.nextPlayer);
        setDiceValue(null);
        setHasRolled(false);
        if (data.payload.statusMessage) {
          setStatusMessage(data.payload.statusMessage);
        }
      } else if (action === 'LUDO_RESTART') {
        restartGameLocal();
      }
    });

    const unsubReaction = onlineService.subscribeReaction((msg: ChatMessage) => {
      soundManager.playChatPop();
      const newReact = {
        id: msg.id || Math.random().toString(),
        text: msg.text,
        sender: msg.senderName,
      };
      setReactions((prev) => [...prev.slice(-3), newReact]);
      setTimeout(() => {
        setReactions((prev) => prev.filter((r) => r.id !== newReact.id));
      }, 3500);
    });

    return () => {
      unsubRoom();
      unsubAction();
      unsubReaction();
    };
  }, [pieces, currentPlayer, activePlayers, isOnline, mySlot]);

  // Check valid moves for player with the dice value
  const getMovablePieces = (playerIdx: number, dice: number): number[] => {
    return pieces
      .filter((p) => p.playerIdx === playerIdx)
      .filter((p) => {
        if (p.step === 56) return false;
        if (p.step === -1) {
          return dice === 6;
        }
        return p.step + dice <= 56;
      })
      .map((p) => p.id);
  };

  const movablePieces =
    hasRolled && diceValue ? getMovablePieces(currentPlayer, diceValue) : [];

  const handleRollDice = () => {
    if (isRolling || hasRolled || winner !== null) return;
    if (!isMyTurn) return; // Prevent out-of-turn rolls in online mode

    setIsRolling(true);
    soundManager.playDiceRoll();

    let rollCount = 0;
    const interval = setInterval(() => {
      setDiceValue(Math.floor(Math.random() * 6) + 1);
      rollCount++;
      if (rollCount > 8) {
        clearInterval(interval);
        const finalValue = Math.floor(Math.random() * 6) + 1;
        setDiceValue(finalValue);
        setIsRolling(false);
        setHasRolled(true);

        if (isOnline) {
          onlineService.sendAction('LUDO_ROLL_DICE', {
            diceValue: finalValue,
            rollerSlot: currentPlayer,
            consecutiveSixes,
          });
        }

        processRoll(finalValue, currentPlayer);
      }
    }, 60);
  };

  const processRoll = (value: number, rollerSlot: number) => {
    const curPlayerName = activePlayers[rollerSlot]?.name || PLAYER_THEMES[rollerSlot].name;
    const movables = getMovablePieces(rollerSlot, value);

    if (value === 6) {
      const nextSixes = consecutiveSixes + 1;
      setConsecutiveSixes(nextSixes);
      if (nextSixes >= 3) {
        setStatusMessage(`3 ستات متتالية! ينتقل الدور للاعب التالي.`);
        setTimeout(() => advanceTurn(false), 1400);
        return;
      }
    } else {
      setConsecutiveSixes(0);
    }

    if (movables.length === 0) {
      setStatusMessage(`لا توجد حركة متاحة لـ ${curPlayerName} (النرد: ${value})`);
      setTimeout(() => advanceTurn(false), 1200);
    } else if (movables.length === 1 && (!isOnline || isMyTurn)) {
      setStatusMessage(`نقلة إجبارية لـ ${curPlayerName}!`);
      setTimeout(() => {
        movePiece(movables[0], value);
      }, 700);
    } else {
      setStatusMessage(
        isOnline && rollerSlot !== mySlot
          ? `ينتظر ${curPlayerName} اختيار الحبة (${value} خطوات)`
          : `اختر الحبة التي تريد تحريكها (${value} خطوات)`
      );
    }
  };

  const movePiece = (pieceId: number, steps: number) => {
    // Only player whose turn it is can move
    if (isOnline && !isMyTurn) return;

    const piece = pieces.find((p) => p.id === pieceId);
    if (!piece || piece.playerIdx !== currentPlayer) return;

    soundManager.playMove();

    let newStep = piece.step;
    if (piece.step === -1) {
      newStep = 0;
    } else {
      newStep = piece.step + steps;
    }

    let bonusTurn = false;
    let captureMsg = '';

    const newPieces = pieces.map((p) => {
      if (p.id === pieceId) {
        return { ...p, step: newStep };
      }
      return p;
    });

    // Check capturing opponent pieces on main track
    if (newStep >= 0 && newStep <= 50) {
      const curGlobalTrack = (PLAYER_THEMES[currentPlayer].startOffset + newStep) % 52;
      const isSafeCell = SAFE_STAR_INDICES.includes(curGlobalTrack);

      if (!isSafeCell) {
        for (let i = 0; i < newPieces.length; i++) {
          const opp = newPieces[i];
          if (opp.playerIdx !== currentPlayer && opp.step >= 0 && opp.step <= 50) {
            const oppGlobalTrack = (PLAYER_THEMES[opp.playerIdx].startOffset + opp.step) % 52;
            if (oppGlobalTrack === curGlobalTrack) {
              soundManager.playCapture();
              newPieces[i] = { ...opp, step: -1 };
              bonusTurn = true;
              const oppName = activePlayers[opp.playerIdx]?.name || PLAYER_THEMES[opp.playerIdx].name;
              captureMsg = ` 💥 تم طرد حبة ${oppName}! رمية إضافية!`;
            }
          }
        }
      }
    }

    setPieces(newPieces);

    // Check winning condition
    const curPlayerPieces = newPieces.filter((p) => p.playerIdx === currentPlayer);
    const allHome = curPlayerPieces.every((p) => p.step === 56);
    let newWinner = winner;
    let newPodium = podium;

    if (allHome && !podium.includes(currentPlayer)) {
      newPodium = [...podium, currentPlayer];
      setPodium(newPodium);
      if (winner === null) {
        newWinner = currentPlayer;
        setWinner(currentPlayer);
        triggerConfetti();
        soundManager.playFanfare();
      }
    }

    const curName = activePlayers[currentPlayer]?.name || PLAYER_THEMES[currentPlayer].name;
    let next = currentPlayer;
    let nextMsg = '';

    if (steps === 6 || bonusTurn) {
      nextMsg = `${curName} يحصل على رمية إضافية!${captureMsg}`;
      setStatusMessage(nextMsg);
      setHasRolled(false);
      setDiceValue(null);
    } else {
      next = calculateNextPlayer();
      const nextName = activePlayers[next]?.name || PLAYER_THEMES[next].name;
      nextMsg = `دور ${nextName} - ارمِ النرد!`;
      setCurrentPlayer(next);
      setHasRolled(false);
      setDiceValue(null);
      setStatusMessage(nextMsg);
    }

    // Broadcast synchronized move to online room
    if (isOnline) {
      onlineService.sendAction('LUDO_MOVE_PIECE', {
        newPieces,
        nextPlayer: next,
        winner: newWinner,
        podium: newPodium,
        statusMessage: nextMsg,
        captured: bonusTurn,
      });
    }
  };

  const calculateNextPlayer = (): number => {
    let next = (currentPlayer + 1) % numPlayers;
    if (podium.length >= numPlayers - 1) {
      return next;
    }
    while (podium.includes(next)) {
      next = (next + 1) % numPlayers;
    }
    return next;
  };

  const advanceTurn = (resetSixes = true) => {
    if (resetSixes) setConsecutiveSixes(0);
    setHasRolled(false);
    setDiceValue(null);

    const next = calculateNextPlayer();
    setCurrentPlayer(next);
    const nextName = activePlayers[next]?.name || PLAYER_THEMES[next].name;
    const msg = `دور ${nextName} - ارمِ النرد!`;
    setStatusMessage(msg);

    if (isOnline && isMyTurn) {
      onlineService.sendAction('LUDO_ADVANCE_TURN', {
        nextPlayer: next,
        statusMessage: msg,
      });
    }
  };

  const restartGameLocal = () => {
    setPieces(() => {
      const initial: Piece[] = [];
      for (let p = 0; p < 4; p++) {
        for (let i = 0; i < 4; i++) {
          initial.push({ id: p * 4 + i, playerIdx: p, step: -1 });
        }
      }
      return initial;
    });
    setCurrentPlayer(0);
    setDiceValue(null);
    setIsRolling(false);
    setHasRolled(false);
    setConsecutiveSixes(0);
    setWinner(null);
    setPodium([]);
    setStatusMessage('ابدأ اللعبة برمي النرد!');
  };

  const restartGame = () => {
    soundManager.playClick();
    restartGameLocal();
    if (isOnline) {
      onlineService.sendAction('LUDO_RESTART', {});
    }
  };

  const handleSendReaction = (emoji: string) => {
    soundManager.playClick();
    onlineService.sendReaction(emoji, 'reaction');
  };

  // Convert piece step to grid (x, y) coordinates
  const getPieceCoordinates = (piece: Piece): [number, number] => {
    if (piece.step === -1) {
      const yardOffsets: Record<number, Array<[number, number]>> = {
        0: [[2, 2], [3, 2], [2, 3], [3, 3]],
        1: [[11, 2], [12, 2], [11, 3], [12, 3]],
        2: [[11, 11], [12, 11], [11, 12], [12, 12]],
        3: [[2, 11], [3, 11], [2, 12], [3, 12]],
      };
      const pieceIdxInPlayer = piece.id % 4;
      return yardOffsets[piece.playerIdx][pieceIdxInPlayer];
    }

    if (piece.step >= 0 && piece.step <= 50) {
      const globalIdx = (PLAYER_THEMES[piece.playerIdx].startOffset + piece.step) % 52;
      return TRACK_COORDINATES[globalIdx];
    }

    if (piece.step >= 51 && piece.step <= 55) {
      const homeStep = piece.step - 51;
      return HOME_CORRIDORS[piece.playerIdx][homeStep];
    }

    const homeCenters: Record<number, [number, number]> = {
      0: [6, 7],
      1: [7, 6],
      2: [8, 7],
      3: [7, 8],
    };
    return homeCenters[piece.playerIdx];
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-3 sm:px-6 py-4 flex flex-col items-center select-none relative">
      {/* Floating Reaction Bubbles */}
      <div className="fixed top-20 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {reactions.map((r) => (
          <div
            key={r.id}
            className="bg-stone-900/95 border border-amber-400/50 shadow-2xl rounded-2xl px-4 py-2 text-stone-100 text-xs font-bold flex items-center gap-2 animate-in slide-in-from-right-4 fade-in duration-300 backdrop-blur-md"
          >
            <span className="text-xl">{r.text}</span>
            <span className="text-stone-400 font-normal">{r.sender}:</span>
          </div>
        ))}
      </div>

      {/* ONLINE STATUS BAR (When in Online Room) */}
      {isOnline && onlineRoom && (
        <div className="w-full mb-3 p-3 rounded-2xl bg-stone-900/95 border border-amber-500/30 shadow-lg flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-bold text-amber-400">
              {onlineRoom.isPublic ? 'غرفة عامة تلقائية 🌐' : 'غرفة خاصة 🔒'}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-lg bg-stone-800 text-stone-200 font-mono font-black">
              #{onlineRoom.code}
            </span>
          </div>

          {/* Connected players avatars and names */}
          <div className="flex items-center gap-2 overflow-x-auto">
            {activePlayers.map((p, idx) => (
              <div
                key={p.id}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-xl text-xs border ${
                  currentPlayer === idx
                    ? 'bg-amber-400/20 border-amber-400 text-amber-300 font-black'
                    : 'bg-stone-950 border-stone-800 text-stone-400'
                }`}
              >
                <span>{p.avatar}</span>
                <span className="truncate max-w-[70px]">{p.name}</span>
                {idx === mySlot && <span className="text-[10px] text-amber-400 font-bold">(أنت)</span>}
              </div>
            ))}
          </div>

          {/* Quick Reaction Bar */}
          <div className="flex items-center gap-1">
            {QUICK_EMOJIS.slice(0, 5).map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleSendReaction(emoji)}
                className="w-7 h-7 rounded-lg bg-stone-800 hover:bg-stone-700 flex items-center justify-center text-sm transition-transform active:scale-90 cursor-pointer"
                title={`إرسال ${emoji}`}
              >
                {emoji}
              </button>
            ))}

            <button
              onClick={() => {
                soundManager.playClick();
                onlineService.leaveRoom();
              }}
              title="مغادرة الغرفة والتحويل للعب محلي"
              className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs border border-red-500/20 mr-1"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Top Header Controls */}
      <div className="w-full flex items-center justify-between gap-4 mb-4 bg-stone-900/80 p-3 sm:p-4 rounded-2xl border border-stone-800">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="px-3.5 py-1.5 text-xs sm:text-sm font-semibold bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl transition-colors shrink-0 cursor-pointer"
          >
            ← القائمة الرئيسية
          </button>
          <div>
            <h2 className="text-lg sm:text-xl font-black text-amber-400 flex items-center gap-2">
              <span>لعبة لودو (Ludo)</span>
              {isOnline && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  أونلاين مباشر 🟢
                </span>
              )}
            </h2>
            <p className="text-xs text-stone-400 hidden sm:block">
              {isOnline
                ? `متصل بالروم #${onlineRoom?.code} - نرد وحركات متزامنة فوراً على جميع الأجهزة`
                : 'جلسة حماسية من 2 إلى 4 لاعبين على نفس الشاشة والجوال'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Switch to Online Button if offline */}
          {!isOnline && onOpenOnline && (
            <button
              onClick={() => {
                soundManager.playClick();
                onOpenOnline();
              }}
              className="px-3 py-1.5 text-xs font-bold rounded-xl bg-amber-400/10 hover:bg-amber-400/20 text-amber-400 border border-amber-400/30 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              <span>العب أونلاين 🌐</span>
            </button>
          )}

          <button
            onClick={onOpenRules}
            title="طريقة اللعب"
            className="p-2 text-stone-400 hover:text-white bg-stone-800 hover:bg-stone-700 rounded-xl transition-colors cursor-pointer"
          >
            <Info className="w-4 h-4" />
          </button>

          <button
            onClick={restartGame}
            title="إعادة تشغيل اللعبة"
            className="p-2 text-stone-400 hover:text-white bg-stone-800 hover:bg-stone-700 rounded-xl transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Game Arena */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Side: Turn Status & Dice Roller (Lg: 4 cols) */}
        <div className="lg:col-span-4 w-full flex flex-col gap-4 order-2 lg:order-1">
          {/* Current Turn Card */}
          <div
            className={`border rounded-2xl p-4 sm:p-5 flex flex-col items-center text-center transition-all ${
              isMyTurn
                ? 'bg-stone-900 border-amber-400 shadow-xl shadow-amber-400/10'
                : 'bg-stone-900/90 border-stone-800'
            }`}
          >
            <span className="text-xs font-bold text-stone-400 mb-1">
              {isOnline ? (isMyTurn ? '🎉 دورك أنت الآن!' : 'الدور الحالي (بانتظار الخصم)') : 'الدور الحالي'}
            </span>

            <div className="flex items-center gap-2 text-lg sm:text-xl font-black mb-3">
              <div className={`w-4 h-4 rounded-full ${PLAYER_THEMES[currentPlayer].bg} animate-pulse`} />
              <span className={PLAYER_THEMES[currentPlayer].text}>
                {activePlayers[currentPlayer]?.name || PLAYER_THEMES[currentPlayer].name}
              </span>
              {isOnline && currentPlayer === mySlot && (
                <span className="text-xs px-2 py-0.5 rounded-md bg-amber-400 text-stone-950 font-bold">
                  أنت
                </span>
              )}
            </div>

            {/* Status message */}
            <div className="w-full py-2.5 px-3 bg-stone-950 rounded-xl border border-stone-800 text-xs sm:text-sm font-medium text-stone-300 min-h-[44px] flex items-center justify-center">
              {statusMessage}
            </div>

            {/* Interactive Dice Display */}
            <div className="mt-5 flex flex-col items-center">
              <button
                onClick={handleRollDice}
                disabled={isRolling || hasRolled || winner !== null || !isMyTurn}
                className={`relative w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-gradient-to-br from-stone-100 to-stone-300 shadow-2xl flex items-center justify-center border-4 border-amber-400 transition-all transform active:scale-95 ${
                  !hasRolled && !isRolling && winner === null && isMyTurn
                    ? 'hover:scale-105 cursor-pointer ring-4 ring-amber-400/40 animate-bounce'
                    : 'cursor-default opacity-85'
                } ${isRolling ? 'animate-spin' : ''}`}
              >
                {diceValue ? (
                  <DiceFace value={diceValue} />
                ) : (
                  <div className="flex flex-col items-center text-stone-900">
                    <Play className="w-8 h-8 fill-amber-500 text-amber-500" />
                    <span className="text-xs font-black mt-1">
                      {isMyTurn ? 'ارمِ النرد' : 'انتظر دورك'}
                    </span>
                  </div>
                )}
              </button>

              <button
                onClick={handleRollDice}
                disabled={isRolling || hasRolled || winner !== null || !isMyTurn}
                className={`mt-4 px-6 py-2.5 rounded-xl font-black text-sm tracking-wide shadow-lg transition-all cursor-pointer ${
                  !hasRolled && !isRolling && winner === null && isMyTurn
                    ? 'bg-amber-500 hover:bg-amber-400 text-stone-950 hover:shadow-amber-500/25'
                    : 'bg-stone-800 text-stone-500 cursor-not-allowed'
                }`}
              >
                {isRolling
                  ? 'جارٍ الرمي...'
                  : hasRolled
                  ? 'تم الرمي'
                  : isMyTurn
                  ? 'اضغط للرمي 🎲'
                  : `دور ${activePlayers[currentPlayer]?.name} ⏳`}
              </button>
            </div>
          </div>

          {/* Players Progress Summary */}
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4">
            <h3 className="text-xs font-bold text-stone-400 mb-3">حالة اللاعبين</h3>
            <div className="space-y-2">
              {activePlayers.map((p, idx) => {
                const pPieces = pieces.filter((item) => item.playerIdx === idx);
                const homeCount = pPieces.filter((item) => item.step === 56).length;
                const outCount = pPieces.filter((item) => item.step >= 0 && item.step < 56).length;
                const isCurrent = currentPlayer === idx && winner === null;

                return (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-xl flex items-center justify-between border transition-all ${
                      isCurrent
                        ? 'bg-stone-800/90 border-amber-400/50 shadow-md'
                        : 'bg-stone-950/60 border-stone-850'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-full ${PLAYER_THEMES[idx].bg}`} />
                      <span className="text-xs font-bold text-stone-200">
                        {p.name}
                        {idx === mySlot && isOnline && (
                          <span className="text-amber-400 mr-1 text-[10px]">(أنت)</span>
                        )}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-stone-400">
                      <span>في الملعب: {outCount}</span>
                      <span className="font-bold text-amber-400">وصل: {homeCount}/4</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Side: The Ludo Board (Lg: 8 cols) */}
        <div className="lg:col-span-8 w-full flex flex-col items-center order-1 lg:order-2">
          <div className="relative w-full max-w-[540px] aspect-square bg-[#0c0a09] border-4 border-stone-850 rounded-3xl shadow-2xl p-2 sm:p-3 overflow-hidden">
            {/* 15x15 CSS Grid Layout with explicit template dimensions */}
            <div
              className="w-full h-full gap-0.5 rounded-2xl overflow-hidden bg-stone-950 border border-stone-800/90 relative p-0.5"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(15, minmax(0, 1fr))',
                gridTemplateRows: 'repeat(15, minmax(0, 1fr))',
              }}
            >
              {/* Four Corner Yards (6x6 cells each) */}
              {/* Red Yard: Top-Left (cols 1..6, rows 1..6) */}
              <div
                style={{
                  gridColumnStart: 1,
                  gridColumnEnd: 7,
                  gridRowStart: 1,
                  gridRowEnd: 7,
                }}
                className="bg-red-950/40 border-2 border-red-600/70 rounded-xl p-2 sm:p-2.5 flex flex-col justify-between relative shadow-inner z-10"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] sm:text-xs font-black text-red-400 bg-red-950/80 px-2 py-0.5 rounded-md border border-red-500/40">
                    {activePlayers[0]?.name || 'الأحمر'}
                  </span>
                  <span className="text-[10px] text-red-400/80 font-bold">بيت 1</span>
                </div>
                <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-2 p-1.5 sm:p-2 items-center justify-items-center">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-red-900/40 border-2 border-red-500/50 flex items-center justify-center shadow-inner"
                    >
                      <div className="w-2 h-2 rounded-full bg-red-500/30" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Green Yard: Top-Right (cols 10..15, rows 1..6) */}
              <div
                style={{
                  gridColumnStart: 10,
                  gridColumnEnd: 16,
                  gridRowStart: 1,
                  gridRowEnd: 7,
                }}
                className="bg-emerald-950/40 border-2 border-emerald-600/70 rounded-xl p-2 sm:p-2.5 flex flex-col justify-between relative shadow-inner z-10"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] sm:text-xs font-black text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-500/40">
                    {activePlayers[1]?.name || 'الأخضر'}
                  </span>
                  <span className="text-[10px] text-emerald-400/80 font-bold">بيت 2</span>
                </div>
                <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-2 p-1.5 sm:p-2 items-center justify-items-center">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-emerald-900/40 border-2 border-emerald-500/50 flex items-center justify-center shadow-inner"
                    >
                      <div className="w-2 h-2 rounded-full bg-emerald-500/30" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Yellow Yard: Bottom-Right (cols 10..15, rows 10..15) */}
              <div
                style={{
                  gridColumnStart: 10,
                  gridColumnEnd: 16,
                  gridRowStart: 10,
                  gridRowEnd: 16,
                }}
                className="bg-amber-950/40 border-2 border-amber-500/70 rounded-xl p-2 sm:p-2.5 flex flex-col justify-between relative shadow-inner z-10"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] sm:text-xs font-black text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded-md border border-amber-500/40">
                    {activePlayers[2]?.name || 'الأصفر'}
                  </span>
                  <span className="text-[10px] text-amber-400/80 font-bold">بيت 3</span>
                </div>
                <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-2 p-1.5 sm:p-2 items-center justify-items-center">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-amber-900/40 border-2 border-amber-500/50 flex items-center justify-center shadow-inner"
                    >
                      <div className="w-2 h-2 rounded-full bg-amber-500/30" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Blue Yard: Bottom-Left (cols 1..6, rows 10..15) */}
              <div
                style={{
                  gridColumnStart: 1,
                  gridColumnEnd: 7,
                  gridRowStart: 10,
                  gridRowEnd: 16,
                }}
                className="bg-blue-950/40 border-2 border-blue-600/70 rounded-xl p-2 sm:p-2.5 flex flex-col justify-between relative shadow-inner z-10"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] sm:text-xs font-black text-blue-400 bg-blue-950/80 px-2 py-0.5 rounded-md border border-blue-500/40">
                    {activePlayers[3]?.name || 'الأزرق'}
                  </span>
                  <span className="text-[10px] text-blue-400/80 font-bold">بيت 4</span>
                </div>
                <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-2 p-1.5 sm:p-2 items-center justify-items-center">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-blue-900/40 border-2 border-blue-500/50 flex items-center justify-center shadow-inner"
                    >
                      <div className="w-2 h-2 rounded-full bg-blue-500/30" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Center Home Goal (cols 7..9, rows 7..9 = 3x3) */}
              <div
                style={{
                  gridColumnStart: 7,
                  gridColumnEnd: 10,
                  gridRowStart: 7,
                  gridRowEnd: 10,
                }}
                className="relative bg-stone-900 border-2 border-amber-400/50 rounded-xl overflow-hidden flex items-center justify-center shadow-2xl z-10"
              >
                {/* 4 Colored Triangular Quadrants */}
                <div
                  className="absolute inset-0 bg-red-600/35"
                  style={{ clipPath: 'polygon(0% 0%, 50% 50%, 0% 100%)' }}
                />
                <div
                  className="absolute inset-0 bg-emerald-600/35"
                  style={{ clipPath: 'polygon(0% 0%, 100% 0%, 50% 50%)' }}
                />
                <div
                  className="absolute inset-0 bg-amber-500/35"
                  style={{ clipPath: 'polygon(100% 0%, 100% 100%, 50% 50%)' }}
                />
                <div
                  className="absolute inset-0 bg-blue-600/35"
                  style={{ clipPath: 'polygon(0% 100%, 50% 50%, 100% 100%)' }}
                />

                {/* Central Trophy Medallion */}
                <div className="relative z-10 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-stone-950 border-2 border-amber-400 shadow-xl flex items-center justify-center">
                  <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400 animate-pulse" />
                </div>
              </div>

              {/* 52 Track Tiles (Where stones walk) */}
              {TRACK_COORDINATES.map(([col, row], idx) => {
                const isSafe = SAFE_STAR_INDICES.includes(idx);
                const isRedStart = idx === 0;
                const isGreenStart = idx === 13;
                const isYellowStart = idx === 26;
                const isBlueStart = idx === 39;

                let tileBg = 'bg-stone-900/90 border border-stone-800 text-stone-500';
                let starColor = 'text-amber-400';
                let symbol: React.ReactNode = null;

                if (isRedStart) {
                  tileBg = 'bg-red-950/80 border-2 border-red-500 text-red-400 font-bold shadow-md';
                  symbol = '★';
                  starColor = 'text-red-400';
                } else if (isGreenStart) {
                  tileBg = 'bg-emerald-950/80 border-2 border-emerald-500 text-emerald-400 font-bold shadow-md';
                  symbol = '★';
                  starColor = 'text-emerald-400';
                } else if (isYellowStart) {
                  tileBg = 'bg-amber-950/80 border-2 border-amber-500 text-amber-400 font-bold shadow-md';
                  symbol = '★';
                  starColor = 'text-amber-400';
                } else if (isBlueStart) {
                  tileBg = 'bg-blue-950/80 border-2 border-blue-500 text-blue-400 font-bold shadow-md';
                  symbol = '★';
                  starColor = 'text-blue-400';
                } else if (isSafe) {
                  tileBg = 'bg-stone-850 border border-amber-400/60 text-amber-400 font-black shadow-inner';
                  symbol = '★';
                } else {
                  symbol = (
                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-stone-750/70 border border-stone-700/50" />
                  );
                }

                return (
                  <div
                    key={`track-${idx}`}
                    style={{
                      gridColumnStart: col + 1,
                      gridRowStart: row + 1,
                    }}
                    className={`rounded-[3px] sm:rounded-md flex items-center justify-center relative transition-colors ${tileBg}`}
                  >
                    {typeof symbol === 'string' ? (
                      <span className={`text-[9px] sm:text-xs font-black ${starColor} leading-none`}>
                        {symbol}
                      </span>
                    ) : (
                      symbol
                    )}
                  </div>
                );
              })}

              {/* 20 Home Corridor Tiles (5 colored steps for each player towards center) */}
              {Object.entries(HOME_CORRIDORS).map(([playerIdxStr, coords]) => {
                const pIdx = Number(playerIdxStr);
                const arrows = ['▶', '▼', '◀', '▲']; // Red right, Green down, Yellow left, Blue up
                const arrow = arrows[pIdx];

                return coords.map(([col, row], stepIdx) => (
                  <div
                    key={`home-corr-${pIdx}-${stepIdx}`}
                    style={{
                      gridColumnStart: col + 1,
                      gridRowStart: row + 1,
                    }}
                    className={`rounded-[3px] sm:rounded-md border flex items-center justify-center font-black shadow-md ${
                      pIdx === 0
                        ? 'bg-red-600/80 border-red-400/90 text-white'
                        : pIdx === 1
                        ? 'bg-emerald-600/80 border-emerald-400/90 text-white'
                        : pIdx === 2
                        ? 'bg-amber-500/80 border-amber-300/90 text-stone-950'
                        : 'bg-blue-600/80 border-blue-400/90 text-white'
                    }`}
                  >
                    <span className="text-[7px] sm:text-[10px] leading-none opacity-90">{arrow}</span>
                  </div>
                ));
              })}

              {/* Interactive Player Pieces on Board */}
              {pieces
                .filter((p) => p.playerIdx < numPlayers)
                .map((piece) => {
                  const [col, row] = getPieceCoordinates(piece);
                  const isMovable = movablePieces.includes(piece.id) && isMyTurn;

                  // Multiple pieces stacking offset on same tile
                  const piecesOnSameTile = pieces.filter(
                    (other) =>
                      other.playerIdx < numPlayers &&
                      getPieceCoordinates(other)[0] === col &&
                      getPieceCoordinates(other)[1] === row
                  );
                  const pieceIdxOnTile = piecesOnSameTile.findIndex((item) => item.id === piece.id);
                  const offsetShift =
                    piecesOnSameTile.length > 1
                      ? (pieceIdxOnTile - (piecesOnSameTile.length - 1) / 2) * 4
                      : 0;

                  return (
                    <div
                      key={piece.id}
                      style={{
                        gridColumnStart: col + 1,
                        gridRowStart: row + 1,
                        transform: offsetShift ? `translate(${offsetShift}px, ${offsetShift}px)` : undefined,
                      }}
                      className="z-20 flex items-center justify-center transition-all duration-300 pointer-events-auto"
                    >
                      <button
                        onClick={() => {
                          if (isMovable && diceValue) {
                            movePiece(piece.id, diceValue);
                          }
                        }}
                        disabled={!isMovable}
                        title={`${PLAYER_THEMES[piece.playerIdx].name} - قطعة #${(piece.id % 4) + 1}`}
                        className={`w-5 h-5 sm:w-7 sm:h-7 rounded-full shadow-lg border-2 flex items-center justify-center transform transition-transform ${
                          PLAYER_THEMES[piece.playerIdx].bg
                        } ${PLAYER_THEMES[piece.playerIdx].border} ${
                          isMovable
                            ? 'ring-4 ring-amber-300 scale-125 cursor-pointer animate-pulse z-30'
                            : 'cursor-default'
                        }`}
                      >
                        <div className="w-1.5 h-1.5 sm:w-2.5 sm:h-2.5 rounded-full bg-white/80 shadow-sm" />
                      </button>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      </div>

      {/* Winner Modal */}
      {winner !== null && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-amber-400/50 rounded-3xl p-6 sm:p-8 max-w-md w-full text-center shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-amber-400/20 text-amber-400 flex items-center justify-center mx-auto mb-4 border border-amber-400/40">
              <Trophy className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-black text-amber-400 mb-1">مبروووك الفوز!</h3>
            <p className="text-lg font-bold text-stone-100 mb-4">
              فاز اللاعب {activePlayers[winner]?.name || PLAYER_THEMES[winner].name} بجدارة! 👑
            </p>

            <div className="bg-stone-950 p-4 rounded-2xl border border-stone-800 mb-6">
              <h4 className="text-xs font-bold text-stone-400 mb-2">ترتيب المنصة:</h4>
              <div className="space-y-1.5">
                {podium.map((pIdx, rank) => (
                  <div
                    key={pIdx}
                    className="flex items-center justify-between text-sm py-1 border-b border-stone-800/50 last:border-none"
                  >
                    <span className="font-bold text-stone-200">المركز {rank + 1}</span>
                    <span className={`font-black ${PLAYER_THEMES[pIdx].text}`}>
                      {activePlayers[pIdx]?.name || PLAYER_THEMES[pIdx].name}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={restartGame}
                className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black rounded-xl transition-colors cursor-pointer"
              >
                جولة جديدة
              </button>
              <button
                onClick={onBack}
                className="flex-1 py-3 bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold rounded-xl transition-colors cursor-pointer"
              >
                القائمة الرئيسية
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// SVG styled dice face
const DiceFace: React.FC<{ value: number }> = ({ value }) => {
  const dotCoords: Record<number, Array<[number, number]>> = {
    1: [[50, 50]],
    2: [[28, 28], [72, 72]],
    3: [[25, 25], [50, 50], [75, 75]],
    4: [[28, 28], [72, 28], [28, 72], [72, 72]],
    5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
    6: [[28, 22], [72, 22], [28, 50], [72, 50], [28, 78], [72, 78]],
  };

  const dots = dotCoords[value] || [];

  return (
    <svg className="w-20 h-20 sm:w-24 sm:h-24" viewBox="0 0 100 100">
      {dots.map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r={8.5} className="fill-stone-900" />
      ))}
    </svg>
  );
};
