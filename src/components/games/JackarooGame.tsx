import React, { useState, useEffect } from 'react';
import { Player } from '../../types/game';
import { soundManager } from '../../utils/audio';
import { triggerConfetti } from '../../utils/confetti';
import { RotateCcw, Users, Trophy, Play, Info, Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';

interface Marble {
  id: number;
  playerIdx: number;
  // position:
  // -1: in base [0..3]
  // 0..63: on main perimeter track (16 holes per sector: 0..15 South, 16..31 West, 32..47 North, 48..63 East)
  // 100..103: in safe home corridor
  pos: number;
}

interface Card {
  id: string;
  suit: '♠' | '♥' | '♦' | '♣';
  rank: 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';
  value: number;
  color: 'red' | 'black';
  description: string;
}

interface JackarooGameProps {
  players: Player[];
  onBack: () => void;
  onOpenRules: () => void;
  onUpdatePlayerName?: (id: string, name: string) => void;
}

const SECTORS = [
  { name: 'الأحمر', suit: '♥', color: 'red', bg: 'bg-red-600', text: 'text-red-400', border: 'border-red-500', hex: '#ef4444', startPos: 0, entrancePos: 63, label: 'الهاص (أسفل)' },
  { name: 'الأزرق', suit: '♠', color: 'blue', bg: 'bg-blue-600', text: 'text-blue-400', border: 'border-blue-500', hex: '#3b82f6', startPos: 16, entrancePos: 15, label: 'السبيت (يسار)' },
  { name: 'الأخضر', suit: '♣', color: 'green', bg: 'bg-emerald-600', text: 'text-emerald-400', border: 'border-emerald-500', hex: '#10b981', startPos: 32, entrancePos: 31, label: 'الشرية (أعلى)' },
  { name: 'الأصفر', suit: '♦', color: 'yellow', bg: 'bg-amber-500', text: 'text-amber-400', border: 'border-amber-400', hex: '#f59e0b', startPos: 48, entrancePos: 47, label: 'الديمن (يمين)' },
];

function buildFullDeck(): Card[] {
  const suits: Array<'♠' | '♥' | '♦' | '♣'> = ['♠', '♥', '♦', '♣'];
  const ranks: Array<'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K'> = [
    'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'
  ];
  const deck: Card[] = [];

  ranks.forEach((rank) => {
    suits.forEach((suit) => {
      let desc = '';
      let val = 0;
      if (rank === 'A') {
        desc = 'نزول من القاعدة للبداية (1) أو خطوة للأمام';
        val = 1;
      } else if (rank === 'K') {
        desc = 'نزول للبداية (1) أو 13 خطوة وحرق ما بالطريق';
        val = 13;
      } else if (rank === 'Q') {
        desc = 'تحرك 12 خطوة للأمام';
        val = 12;
      } else if (rank === 'J') {
        desc = 'تبديل مكان حبتك مع أي حبة للخصم!';
        val = 11;
      } else if (rank === '7') {
        desc = 'تحرك 7 خطوات للأمام';
        val = 7;
      } else if (rank === '4') {
        desc = 'ارجع 4 خطوات للخلف (لدخول سريع للبيت!)';
        val = -4;
      } else {
        val = parseInt(rank, 10);
        desc = `تحرك ${val} خطوات للأمام`;
      }

      deck.push({
        id: `${rank}-${suit}-${Math.random()}`,
        suit,
        rank,
        value: val,
        color: suit === '♥' || suit === '♦' ? 'red' : 'black',
        description: desc,
      });
    });
  });

  return shuffleDeck(deck);
}

function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export const JackarooGame: React.FC<JackarooGameProps> = ({
  players,
  onBack,
  onOpenRules,
  onUpdatePlayerName,
}) => {
  const [numPlayers, setNumPlayers] = useState<number>(4);
  const activeSectorIndices = numPlayers === 2 ? [0, 2] : [0, 1, 2, 3];
  const activePlayers = players.slice(0, 4);

  // 16 marbles total (4 per player)
  const [marbles, setMarbles] = useState<Marble[]>(() => {
    const list: Marble[] = [];
    for (let p = 0; p < 4; p++) {
      for (let m = 0; m < 4; m++) {
        list.push({ id: p * 4 + m, playerIdx: p, pos: -1 });
      }
    }
    return list;
  });

  const [deck, setDeck] = useState<Card[]>(() => buildFullDeck());
  const [hands, setHands] = useState<Record<number, Card[]>>({ 0: [], 1: [], 2: [], 3: [] });
  const [discardPile, setDiscardPile] = useState<Card[]>([]);
  const [currentTurn, setCurrentTurn] = useState<number>(0);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [swapSourceMarble, setSwapSourceMarble] = useState<Marble | null>(null);
  const [statusText, setStatusText] = useState<string>('اختر بطاقة من يدك لبدء التحريك');
  const [winner, setWinner] = useState<number | null>(null);

  // Initial deal
  useEffect(() => {
    dealCards(numPlayers);
  }, []);

  const dealCards = (playersCount = numPlayers) => {
    soundManager.playCardSlide();
    const needed = playersCount * 4;
    let currentDeck = deck.length < needed ? buildFullDeck() : [...deck];
    const newHands: Record<number, Card[]> = { 0: [], 1: [], 2: [], 3: [] };
    const sectors = playersCount === 2 ? [0, 2] : [0, 1, 2, 3];

    for (const p of sectors) {
      newHands[p] = currentDeck.slice(0, 4);
      currentDeck = currentDeck.slice(4);
    }

    setDeck(currentDeck);
    setHands(newHands);
    setSelectedCard(null);
    setSwapSourceMarble(null);
    const turnName = activePlayers[currentTurn]?.name || SECTORS[currentTurn].name;
    setStatusText(`تم توزيع الأوراق. دور [${turnName}]`);
  };

  const curHand = hands[currentTurn] || [];

  // Determine which of the player's marbles are validly movable with the selected card
  const getPlayableOptions = (card: Card) => {
    const pIdx = currentTurn;
    const ownMarbles = marbles.filter((m) => m.playerIdx === pIdx);
    const options: Array<{
      marble: Marble;
      label: string;
      actionType: 'base_exit' | 'track_move' | 'home_move' | 'swap';
      targetPos: number;
    }> = [];

    // J (Jack): Swap
    if (card.rank === 'J') {
      const onTrack = ownMarbles.filter((m) => m.pos >= 0 && m.pos < 64);
      onTrack.forEach((m) => {
        options.push({
          marble: m,
          label: `حبة في الخانة (${(m.pos % 16) + 1}) ⬅️ تبديل مع حبة خصم`,
          actionType: 'swap',
          targetPos: m.pos,
        });
      });
      return options;
    }

    ownMarbles.forEach((m) => {
      // 1. In Base
      if (m.pos === -1) {
        if (card.rank === 'A' || card.rank === 'K') {
          options.push({
            marble: m,
            label: `إنزال حبة من القاعدة إلى نقطة البداية (خانة 1)`,
            actionType: 'base_exit',
            targetPos: SECTORS[pIdx].startPos,
          });
        }
      }

      // 2. On Main Track (0..63)
      else if (m.pos >= 0 && m.pos < 64) {
        if (card.rank === '4') {
          // 4 backwards
          const target = (m.pos - 4 + 64) % 64;
          options.push({
            marble: m,
            label: `حبة خانة (${(m.pos % 16) + 1}) ⬅️ ارجع 4 خطوات للخلف إلى (${(target % 16) + 1})`,
            actionType: 'track_move',
            targetPos: target,
          });
        } else {
          // Normal forward move
          const entrance = SECTORS[pIdx].entrancePos;
          const distToEntrance = (entrance - m.pos + 64) % 64;

          // Check if steps lead into Home
          if (card.value > distToEntrance && distToEntrance < 16) {
            const stepsIntoHome = card.value - distToEntrance - 1;
            if (stepsIntoHome >= 0 && stepsIntoHome <= 3) {
              const homeTarget = 100 + stepsIntoHome;
              options.push({
                marble: m,
                label: `حبة خانة (${(m.pos % 16) + 1}) ⬅️ دخول بيت الأمان إلى خانة [${stepsIntoHome + 1}]!`,
                actionType: 'home_move',
                targetPos: homeTarget,
              });
              return;
            }
          }

          // Regular track step
          const target = (m.pos + card.value) % 64;
          options.push({
            marble: m,
            label: `حبة خانة (${(m.pos % 16) + 1}) ⬅️ تقدم ${card.value} خطوات إلى (${(target % 16) + 1})`,
            actionType: 'track_move',
            targetPos: target,
          });
        }
      }

      // 3. In Safe Home Corridor (100..103)
      else if (m.pos >= 100 && m.pos <= 103) {
        if (card.rank !== '4' && card.value > 0) {
          const targetHome = m.pos + card.value;
          if (targetHome <= 103) {
            options.push({
              marble: m,
              label: `حبة في بيت الأمان [${m.pos - 99}] ⬅️ تقدم إلى خانة [${targetHome - 99}]`,
              actionType: 'home_move',
              targetPos: targetHome,
            });
          }
        }
      }
    });

    return options;
  };

  const playableOptions = selectedCard ? getPlayableOptions(selectedCard) : [];

  const handleSelectCard = (card: Card) => {
    soundManager.playClick();
    if (selectedCard?.id === card.id) {
      setSelectedCard(null);
      setSwapSourceMarble(null);
      return;
    }
    setSelectedCard(card);
    setSwapSourceMarble(null);

    if (card.rank === 'J') {
      setStatusText('بطاقة الولد (J): اختر حبتك من اللوحة أو القائمة أولاً ثم اختر حبة الخصم للتبديل!');
    } else if (card.rank === '4') {
      setStatusText('بطاقة 4: ارجع 4 خطوات للخلف! حركة ممتازة لدخول بيت الأمان فوراً.');
    } else {
      setStatusText(`البطاقة [${card.rank}]: ${card.description} - اضغط على الحبة في اللوحة أو من الأزرار بالأسفل`);
    }
  };

  const executeMove = (marble: Marble, targetPos: number, isBaseExit = false) => {
    const pIdx = currentTurn;
    if (!selectedCard) return;

    soundManager.playMove();

    const updated = marbles.map((m) => {
      if (m.id === marble.id) {
        return { ...m, pos: targetPos };
      }
      // If landing on an opponent on the main track: capture!
      if (targetPos >= 0 && targetPos < 64 && m.pos === targetPos && m.id !== marble.id) {
        soundManager.playCapture();
        return { ...m, pos: -1 };
      }
      return m;
    });

    finishPlay(updated, selectedCard);
  };

  const handleMarbleClick = (marble: Marble) => {
    if (!selectedCard) {
      setStatusText('اختر بطاقة من يدك أولاً للعب بها!');
      return;
    }

    const pIdx = currentTurn;

    // J (Jack) Swap
    if (selectedCard.rank === 'J') {
      if (!swapSourceMarble) {
        if (marble.playerIdx !== pIdx || marble.pos < 0 || marble.pos >= 64) {
          setStatusText('اختر إحدى حباتك الموجودة في المضمار أولاً!');
          return;
        }
        setSwapSourceMarble(marble);
        soundManager.playClick();
        setStatusText('رائع! الآن اضغط على حبة أي خصم في المضمار لتبديل المكان معها');
        return;
      } else {
        if (marble.playerIdx === pIdx || marble.pos < 0 || marble.pos >= 64) {
          setStatusText('اختر حبة الخصم الموجودة في المضمار للتبديل!');
          return;
        }

        // Execute Swap
        soundManager.playCapture();
        const updated = marbles.map((m) => {
          if (m.id === swapSourceMarble.id) return { ...m, pos: marble.pos };
          if (m.id === marble.id) return { ...m, pos: swapSourceMarble.pos };
          return m;
        });
        finishPlay(updated, selectedCard);
        return;
      }
    }

    // Normal move: check if this marble has a playable option
    const matchingOpt = playableOptions.find((opt) => opt.marble.id === marble.id);
    if (matchingOpt) {
      executeMove(matchingOpt.marble, matchingOpt.targetPos, matchingOpt.actionType === 'base_exit');
    } else {
      if (marble.playerIdx !== pIdx) {
        setStatusText('هذه الحبة تخص لاعباً آخر!');
      } else if (marble.pos === -1) {
        setStatusText('للخروج من القاعدة تحتاج إلى بطاقة [A] أو [K]!');
      } else {
        setStatusText('لا يمكن تحريك هذه الحبة بهذه البطاقة!');
      }
    }
  };

  const handleBurnCard = (card: Card) => {
    soundManager.playClick();
    setStatusText(`تم حرق البطاقة [${card.rank}] لعدم إمكانية اللعب بها.`);
    finishPlay(marbles, card);
  };

  const finishPlay = (newMarbles: Marble[], cardPlayed: Card) => {
    setMarbles(newMarbles);

    // Discard card
    const newCurHand = hands[currentTurn].filter((c) => c.id !== cardPlayed.id);
    const newHands = { ...hands, [currentTurn]: newCurHand };
    setHands(newHands);
    setDiscardPile([cardPlayed, ...discardPile]);
    setSelectedCard(null);
    setSwapSourceMarble(null);

    // Check winner
    const curPlayerMarbles = newMarbles.filter((m) => m.playerIdx === currentTurn);
    const allHome = curPlayerMarbles.every((m) => m.pos >= 100 && m.pos <= 103);
    if (allHome) {
      setWinner(currentTurn);
      triggerConfetti();
      soundManager.playFanfare();
      return;
    }

    // Check if all empty
    const allEmpty = Object.values(newHands).every((h) => h.length === 0);
    if (allEmpty) {
      setTimeout(() => {
        dealCards();
      }, 700);
      return;
    }

    // Next turn
    const nextPlayer = numPlayers === 2 ? (currentTurn === 0 ? 2 : 0) : (currentTurn + 1) % 4;
    setCurrentTurn(nextPlayer);
    const nextName = activePlayers[nextPlayer]?.name || SECTORS[nextPlayer].name;
    setStatusText(`دور [${nextName}] - اختر بطاقة من يدك`);
  };

  const resetJackaroo = (targetCount = numPlayers) => {
    soundManager.playClick();
    setMarbles(() => {
      const list: Marble[] = [];
      const sectors = targetCount === 2 ? [0, 2] : [0, 1, 2, 3];
      for (const p of sectors) {
        for (let m = 0; m < 4; m++) {
          list.push({ id: p * 4 + m, playerIdx: p, pos: -1 });
        }
      }
      return list;
    });
    setWinner(null);
    setCurrentTurn(0);
    setDiscardPile([]);
    dealCards(targetCount);
  };

  // Precise Coordinates Geometry mathematically verified on 600x600 SVG
  const OCTAGON_POINTS = "180,20 420,20 580,180 580,420 420,580 180,580 20,420 20,180";

  // Coordinates for the 16 track holes of sector 0 (South Arm)
  // Relative to center (300, 300) with Y pointing South:
  const SECTOR_TRACK_OFFSETS: Array<[number, number]> = [
    // Right column going down towards outer corner:
    [42, 115], // 0: Start Hole (marked #1 on board with square!)
    [42, 145], // 1: #2
    [42, 175], // 2: #3
    [42, 205], // 3: #4
    [42, 235], // 4: #5
    // Across the outer bottom edge:
    [20, 248], // 5: #6
    [-20, 248],// 6: #7
    [-42, 235],// 7: #8
    // Left column going back in:
    [-42, 205],// 8: #9
    [-42, 175],// 9: #10
    [-42, 145],// 10: #11
    [-42, 115],// 11: #12
    // Corner turn connecting to the next sector:
    [-65, 100],// 12: #13
    [-85, 85], // 13: #14
    [-100, 65],// 14: #15
    [-115, 42],// 15: #16 (Entrance to home corridor)
  ];

  // Rotate local (u, v) by sector (0, 90, 180, 270)
  const getTrackHoleCoords = (index: number): { x: number; y: number } => {
    const sector = Math.floor(index / 16);
    const stepInSector = index % 16;
    const [u, v] = SECTOR_TRACK_OFFSETS[stepInSector];

    const angle = (sector * Math.PI) / 2;
    const rx = u * Math.cos(angle) - v * Math.sin(angle);
    const ry = u * Math.sin(angle) + v * Math.cos(angle);

    return { x: 300 + rx, y: 300 + ry };
  };

  // 4 Base holes per player in the rectangular box:
  const getBaseHoleCoords = (playerIdx: number, marbleIdx: number): { x: number; y: number } => {
    const u = -45 + marbleIdx * 30; // -45, -15, 15, 45
    const v = 90;

    const angle = (playerIdx * Math.PI) / 2;
    const rx = u * Math.cos(angle) - v * Math.sin(angle);
    const ry = u * Math.sin(angle) + v * Math.cos(angle);

    return { x: 300 + rx, y: 300 + ry };
  };

  // 4 Safe home holes per player in the middle column:
  const getHomeHoleCoords = (playerIdx: number, homeStep: number): { x: number; y: number } => {
    const u = 0;
    const v = 115 + homeStep * 30; // 115, 145, 175, 205

    const angle = (playerIdx * Math.PI) / 2;
    const rx = u * Math.cos(angle) - v * Math.sin(angle);
    const ry = u * Math.sin(angle) + v * Math.cos(angle);

    return { x: 300 + rx, y: 300 + ry };
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-3 sm:px-6 py-4 flex flex-col items-center">
      {/* Top Header */}
      <div className="w-full flex items-center justify-between gap-4 mb-4 bg-stone-900/80 p-3 sm:p-4 rounded-2xl border border-stone-800">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="px-3.5 py-1.5 text-xs sm:text-sm font-semibold bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl transition-colors shrink-0 cursor-pointer"
          >
            ← القائمة الرئيسية
          </button>
          <div>
            <h2 className="text-lg sm:text-xl font-black text-amber-400">لعبة جاكارو الأصلية (Jackaroo)</h2>
            <p className="text-xs text-stone-400 hidden sm:block">لوحة خشبية ثمانية مطابقة للواقع مع أشكال الورق الأربعة</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Player count switcher */}
          <div className="flex items-center bg-stone-950 p-1 rounded-xl border border-stone-800">
            <span className="text-xs text-stone-400 px-2 flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">عدد اللاعبين:</span>
            </span>
            {[2, 4].map((cnt) => (
              <button
                key={cnt}
                onClick={() => {
                  soundManager.playClick();
                  setNumPlayers(cnt);
                  setCurrentTurn(0);
                  resetJackaroo(cnt);
                }}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                  numPlayers === cnt
                    ? 'bg-amber-500 text-stone-950 font-black shadow-sm'
                    : 'text-stone-400 hover:text-white'
                }`}
              >
                {cnt} {cnt === 2 ? 'لاعبان' : 'لاعبين'}
              </button>
            ))}
          </div>

          <button
            onClick={onOpenRules}
            title="شرح قوانين جاكارو"
            className="p-2 text-stone-400 hover:text-white bg-stone-800 hover:bg-stone-700 rounded-xl transition-colors cursor-pointer"
          >
            <Info className="w-4 h-4" />
          </button>
          <button
            onClick={() => resetJackaroo(numPlayers)}
            title="إعادة بدء اللعبة"
            className="p-2 text-stone-400 hover:text-white bg-stone-800 hover:bg-stone-700 rounded-xl transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quick Player Names Bar */}
      <div className="w-full bg-stone-900/90 border border-stone-800 rounded-2xl p-3 mb-4 flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs font-black text-stone-300 flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-amber-400" />
          <span>اللاعبون والجهات ({numPlayers} لاعبين - اضغط لتعديل اسمك):</span>
        </span>
        <div className="flex flex-wrap items-center gap-2">
          {activeSectorIndices.map((idx) => {
            const p = activePlayers[idx];
            if (!p) return null;
            return (
              <div
                key={p.id}
                className={`flex items-center gap-1.5 bg-stone-950 px-2.5 py-1.5 rounded-xl border transition-all ${
                  currentTurn === idx ? 'border-amber-400 ring-2 ring-amber-400/30' : 'border-stone-800'
                }`}
              >
                <span className="text-base">{SECTORS[idx].suit}</span>
                <span className={`w-2.5 h-2.5 rounded-full ${SECTORS[idx].bg}`} />
                <input
                  type="text"
                  value={p.name}
                  onChange={(e) => onUpdatePlayerName && onUpdatePlayerName(p.id, e.target.value)}
                  className="bg-transparent border-none text-xs font-bold text-stone-200 focus:outline-none w-20 focus:w-28 transition-all"
                  placeholder={`اللاعب ${idx + 1}`}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Board Arena */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Side: Turn HUD, Discard Pile & Movable Options Panel (Lg: 4 cols) */}
        <div className="lg:col-span-4 w-full flex flex-col gap-4 order-2 lg:order-1">
          {/* Active Turn Card */}
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 sm:p-5 text-center shadow-lg">
            <span className="text-xs font-bold text-stone-400 mb-1">صاحب الدور الحالي</span>
            <div className="flex items-center justify-center gap-2 text-xl font-black mb-3">
              <span className="text-2xl">{SECTORS[currentTurn].suit}</span>
              <div className={`w-4 h-4 rounded-full ${SECTORS[currentTurn].bg} animate-ping`} />
              <span className={SECTORS[currentTurn].text}>
                {activePlayers[currentTurn]?.name || SECTORS[currentTurn].name}
              </span>
              <span className="text-xs text-stone-500">({SECTORS[currentTurn].label})</span>
            </div>

            {/* Status notice */}
            <div className="w-full py-2.5 px-3 bg-stone-950 rounded-xl border border-stone-800 text-xs sm:text-sm font-medium text-stone-200 min-h-[48px] flex items-center justify-center leading-relaxed">
              {statusText}
            </div>

            {/* Discard Pile */}
            <div className="mt-4 pt-4 border-t border-stone-800 flex flex-col items-center">
              <span className="text-xs font-semibold text-stone-400 mb-2">أرض اللعب (آخر بطاقة ملعوبة)</span>
              {discardPile.length > 0 ? (
                <div className="w-20 h-28 bg-white rounded-xl shadow-xl border-2 border-stone-700 flex flex-col items-center justify-between p-2 select-none transform hover:scale-105 transition-transform">
                  <div className={`text-sm font-black self-start ${discardPile[0].color === 'red' ? 'text-red-600' : 'text-stone-900'}`}>
                    {discardPile[0].rank} {discardPile[0].suit}
                  </div>
                  <div className={`text-2xl font-bold ${discardPile[0].color === 'red' ? 'text-red-600' : 'text-stone-900'}`}>
                    {discardPile[0].suit}
                  </div>
                  <div className={`text-sm font-black self-end rotate-180 ${discardPile[0].color === 'red' ? 'text-red-600' : 'text-stone-900'}`}>
                    {discardPile[0].rank} {discardPile[0].suit}
                  </div>
                </div>
              ) : (
                <div className="w-20 h-28 border-2 border-dashed border-stone-800 rounded-xl flex items-center justify-center text-xs text-stone-600">
                  فارغة
                </div>
              )}
            </div>
          </div>

          {/* Quick Click-to-Move Actions Bar (Guarantees zero misclicks on mobile or desktop!) */}
          {selectedCard && (
            <div className="bg-amber-950/40 border border-amber-500/40 rounded-2xl p-4 shadow-lg animate-in fade-in">
              <span className="text-xs font-black text-amber-300 block mb-2 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                الحركات المتاحة ببطاقة [{selectedCard.rank}]:
              </span>

              {playableOptions.length > 0 ? (
                <div className="space-y-2">
                  {playableOptions.map((opt, i) => (
                    <button
                      key={i}
                      onClick={() => executeMove(opt.marble, opt.targetPos, opt.actionType === 'base_exit')}
                      className="w-full p-2.5 bg-stone-900 hover:bg-amber-500 hover:text-stone-950 text-stone-200 border border-stone-700 hover:border-amber-400 rounded-xl text-xs font-bold transition-all text-right flex items-center justify-between group cursor-pointer"
                    >
                      <span>{opt.label}</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-stone-400 p-2 bg-stone-950 rounded-xl border border-stone-850">
                  لا توجد حركات قانونية لهذه البطاقة. اضغط على زر "حرق 🔥" أسفل البطاقة لتمرير الدور.
                </div>
              )}
            </div>
          )}

          {/* Quick Rules Cheat Sheet */}
          <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-4 text-xs space-y-2">
            <h4 className="font-black text-amber-400 mb-1 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              أسرار بطاقات جاكارو:
            </h4>
            <div className="grid grid-cols-2 gap-2 text-stone-300">
              <div className="bg-stone-950 p-2 rounded-lg border border-stone-850"><b className="text-amber-300">A / K:</b> إنزال حبة للبداية (1)</div>
              <div className="bg-stone-950 p-2 rounded-lg border border-stone-850"><b className="text-amber-300">4:</b> رجوع 4 خطوات للخلف</div>
              <div className="bg-stone-950 p-2 rounded-lg border border-stone-850"><b className="text-amber-300">J:</b> تبديل مكان حبتك مع الخصم</div>
              <div className="bg-stone-950 p-2 rounded-lg border border-stone-850"><b className="text-amber-300">7:</b> حركة 7 خطوات للأمام</div>
              <div className="bg-stone-950 p-2 rounded-lg border border-stone-850"><b className="text-amber-300">Q:</b> تحرك 12 خطوة للأمام</div>
              <div className="bg-stone-950 p-2 rounded-lg border border-stone-850"><b className="text-amber-300">K:</b> حركة 13 مع حرق ما بالطريق!</div>
            </div>
          </div>
        </div>

        {/* Right Side: The Authentic Octagonal Wooden Jackaroo Board SVG (Lg: 8 cols) */}
        <div className="lg:col-span-8 w-full flex flex-col items-center order-1 lg:order-2">
          <div className="relative w-full max-w-[560px] aspect-square rounded-3xl overflow-hidden shadow-2xl bg-stone-950 border-4 border-amber-950/80 p-2 sm:p-3 select-none flex items-center justify-center">
            {/* Authentic SVG Vector Board matching the user's real board */}
            <svg viewBox="0 0 600 600" className="w-full h-full drop-shadow-2xl">
              <defs>
                {/* Wood Texture Gradient */}
                <radialGradient id="woodRadial" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#4a2511" />
                  <stop offset="70%" stopColor="#35190a" />
                  <stop offset="100%" stopColor="#220e05" />
                </radialGradient>

                {/* Center tan plate gradient */}
                <radialGradient id="centerPlate" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#eed2a6" />
                  <stop offset="85%" stopColor="#d4b58a" />
                  <stop offset="100%" stopColor="#bfa076" />
                </radialGradient>

                {/* Glass Marble Shading: Red */}
                <radialGradient id="marbleRed" cx="35%" cy="35%" r="65%">
                  <stop offset="0%" stopColor="#fca5a5" />
                  <stop offset="40%" stopColor="#ef4444" />
                  <stop offset="100%" stopColor="#7f1d1d" />
                </radialGradient>

                {/* Glass Marble Shading: Blue */}
                <radialGradient id="marbleBlue" cx="35%" cy="35%" r="65%">
                  <stop offset="0%" stopColor="#93c5fd" />
                  <stop offset="40%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#1e3a8a" />
                </radialGradient>

                {/* Glass Marble Shading: Green */}
                <radialGradient id="marbleGreen" cx="35%" cy="35%" r="65%">
                  <stop offset="0%" stopColor="#86efac" />
                  <stop offset="40%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#064e3b" />
                </radialGradient>

                {/* Glass Marble Shading: Yellow */}
                <radialGradient id="marbleYellow" cx="35%" cy="35%" r="65%">
                  <stop offset="0%" stopColor="#fef08a" />
                  <stop offset="40%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#78350f" />
                </radialGradient>
              </defs>

              {/* 1. Main Octagon Board Body */}
              <polygon
                points={OCTAGON_POINTS}
                fill="url(#woodRadial)"
                stroke="#693717"
                strokeWidth="6"
              />

              {/* Inner Inlay Border Line */}
              <polygon
                points="182,28 418,28 572,182 572,418 418,572 182,572 28,418 28,182"
                fill="none"
                stroke="#8a4b20"
                strokeWidth="1.5"
                opacity="0.8"
              />

              {/* 2. Carrying Handles (Top-Left and Bottom-Right diagonal facets) */}
              <g transform="translate(110, 110) rotate(-45)">
                <rect
                  x="-45"
                  y="-12"
                  width="90"
                  height="24"
                  rx="12"
                  fill="#170a04"
                  stroke="#8a4b20"
                  strokeWidth="2.5"
                />
              </g>

              <g transform="translate(490, 490) rotate(-45)">
                <rect
                  x="-45"
                  y="-12"
                  width="90"
                  height="24"
                  rx="12"
                  fill="#170a04"
                  stroke="#8a4b20"
                  strokeWidth="2.5"
                />
              </g>

              {/* 3. Four Large Engraved Playing Card Suits on the 4 diagonal wedges */}
              {/* Top-Left: Spades ♠ */}
              <text
                x="145"
                y="190"
                fill="#d4a373"
                opacity="0.5"
                fontSize="42"
                fontWeight="bold"
                textAnchor="middle"
                dominantBaseline="middle"
              >
                ♠
              </text>

              {/* Top-Right: Clubs ♣ */}
              <text
                x="455"
                y="190"
                fill="#d4a373"
                opacity="0.5"
                fontSize="42"
                fontWeight="bold"
                textAnchor="middle"
                dominantBaseline="middle"
              >
                ♣
              </text>

              {/* Bottom-Left: Hearts ♥ */}
              <text
                x="145"
                y="410"
                fill="#d4a373"
                opacity="0.5"
                fontSize="42"
                fontWeight="bold"
                textAnchor="middle"
                dominantBaseline="middle"
              >
                ♥
              </text>

              {/* Bottom-Right: Diamonds ♦ */}
              <text
                x="455"
                y="410"
                fill="#d4a373"
                opacity="0.5"
                fontSize="42"
                fontWeight="bold"
                textAnchor="middle"
                dominantBaseline="middle"
              >
                ♦
              </text>

              {/* 4. Center Tan Felt/Wood Disc Inlay */}
              <circle
                cx="300"
                cy="300"
                r="64"
                fill="url(#centerPlate)"
                stroke="#693717"
                strokeWidth="4"
              />
              <circle
                cx="300"
                cy="300"
                r="58"
                fill="none"
                stroke="#bfa076"
                strokeWidth="1.5"
              />
              <text
                x="300"
                y="300"
                fill="#542e14"
                fontSize="12"
                fontWeight="900"
                letterSpacing="2"
                textAnchor="middle"
                dominantBaseline="middle"
                opacity="0.85"
              >
                JACKAROO
              </text>

              {/* 5. Four Base Boxes (4 holes each next to center circle) */}
              {[0, 1, 2, 3].map((pIdx) => {
                const angle = (pIdx * 90);
                return (
                  <g key={`base-box-${pIdx}`} transform={`rotate(${angle}, 300, 300)`}>
                    <rect
                      x="238"
                      y="375"
                      width="124"
                      height="30"
                      rx="6"
                      fill="#261005"
                      stroke="#8a4b20"
                      strokeWidth="1.5"
                    />
                  </g>
                );
              })}

              {/* 6. Engraved Hole Sockets on the Wooden Board */}
              {/* Perimeter Track (64 holes) */}
              {Array.from({ length: 64 }).map((_, idx) => {
                const { x, y } = getTrackHoleCoords(idx);
                const isStart = idx % 16 === 0;
                const sectorIdx = Math.floor(idx / 16);

                return (
                  <g key={`track-hole-${idx}`}>
                    {/* If Start Hole (#1 on board): render distinctive engraved square around the circle! */}
                    {isStart && (
                      <rect
                        x={x - 11}
                        y={y - 11}
                        width="22"
                        height="22"
                        fill="none"
                        stroke={SECTORS[sectorIdx].hex}
                        strokeWidth="2"
                        rx="3"
                        opacity="0.9"
                      />
                    )}

                    {/* Drilled Hole Socket */}
                    <circle
                      cx={x}
                      cy={y}
                      r="8"
                      fill="#120602"
                      stroke="#421f0c"
                      strokeWidth="1.5"
                    />
                    <circle
                      cx={x}
                      cy={y}
                      r="6.5"
                      fill="#0a0301"
                    />

                    {/* Engraved Number on Board */}
                    <text
                      x={x}
                      y={y}
                      fill="#d4a373"
                      fontSize="6.5"
                      fontWeight="bold"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      opacity="0.6"
                      pointerEvents="none"
                    >
                      {(idx % 16) + 1}
                    </text>
                  </g>
                );
              })}

              {/* Base Holes (4 players x 4 holes = 16 holes) */}
              {[0, 1, 2, 3].map((pIdx) =>
                [0, 1, 2, 3].map((mIdx) => {
                  const { x, y } = getBaseHoleCoords(pIdx, mIdx);
                  return (
                    <g key={`base-hole-${pIdx}-${mIdx}`}>
                      <circle
                        cx={x}
                        cy={y}
                        r="8"
                        fill="#150702"
                        stroke="#5c2c12"
                        strokeWidth="1.5"
                      />
                      <circle cx={x} cy={y} r="6.5" fill="#0b0301" />
                    </g>
                  );
                })
              )}

              {/* Safe Home Corridor Holes (4 players x 4 holes = 16 holes) */}
              {[0, 1, 2, 3].map((pIdx) =>
                [0, 1, 2, 3].map((step) => {
                  const { x, y } = getHomeHoleCoords(pIdx, step);
                  return (
                    <g key={`home-hole-${pIdx}-${step}`}>
                      <circle
                        cx={x}
                        cy={y}
                        r="8"
                        fill="#170702"
                        stroke={SECTORS[pIdx].hex}
                        strokeWidth="1.5"
                        opacity="0.85"
                      />
                      <circle cx={x} cy={y} r="6.5" fill="#0c0401" />
                      <text
                        x={x}
                        y={y}
                        fill={SECTORS[pIdx].hex}
                        fontSize="6.5"
                        fontWeight="bold"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        opacity="0.7"
                      >
                        {step + 1}
                      </text>
                    </g>
                  );
                })
              )}

              {/* 7. Glass Marbles with Large Transparent Hit Areas for effortless touch */}
              {marbles.map((marble) => {
                let coords = { x: 300, y: 300 };

                if (marble.pos === -1) {
                  // In Base
                  const mIdx = marble.id % 4;
                  coords = getBaseHoleCoords(marble.playerIdx, mIdx);
                } else if (marble.pos >= 0 && marble.pos < 64) {
                  // On Track
                  coords = getTrackHoleCoords(marble.pos);
                } else if (marble.pos >= 100 && marble.pos <= 103) {
                  // In Safe Home
                  const homeStep = marble.pos - 100;
                  coords = getHomeHoleCoords(marble.playerIdx, homeStep);
                }

                const isCurrentTurn = marble.playerIdx === currentTurn;
                const isSelectedForSwap = swapSourceMarble?.id === marble.id;
                const isMovable = playableOptions.some((opt) => opt.marble.id === marble.id);
                const gradientId = [
                  'url(#marbleRed)',
                  'url(#marbleBlue)',
                  'url(#marbleGreen)',
                  'url(#marbleYellow)',
                ][marble.playerIdx];

                return (
                  <g
                    key={`marble-${marble.id}`}
                    onClick={() => handleMarbleClick(marble)}
                    className="cursor-pointer transition-transform duration-200"
                  >
                    {/* Pulsing ring if marble is movable with selected card */}
                    {selectedCard && (isMovable || (selectedCard.rank === 'J' && marble.pos >= 0)) && (
                      <circle
                        cx={coords.x}
                        cy={coords.y}
                        r="14"
                        fill="none"
                        stroke={isSelectedForSwap ? '#ef4444' : '#f59e0b'}
                        strokeWidth="2.5"
                        className="animate-pulse"
                      />
                    )}

                    {/* Glass Marble Sphere */}
                    <circle
                      cx={coords.x}
                      cy={coords.y}
                      r="9"
                      fill={gradientId}
                      stroke="#ffffff"
                      strokeWidth="1.2"
                      className="drop-shadow-md"
                    />

                    {/* Specular Glint Reflection */}
                    <ellipse
                      cx={coords.x - 2.5}
                      cy={coords.y - 2.5}
                      rx="3"
                      ry="2"
                      fill="#ffffff"
                      opacity="0.8"
                    />

                    {/* Huge 44px transparent touch target to guarantee zero miss-clicks! */}
                    <circle
                      cx={coords.x}
                      cy={coords.y}
                      r="22"
                      fill="transparent"
                      className="cursor-pointer"
                    />
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Current Player Hand Cards Bar */}
          <div className="w-full mt-4 bg-stone-900 border border-stone-800 rounded-2xl p-4 flex flex-col items-center shadow-lg">
            <div className="w-full flex items-center justify-between mb-3">
              <span className="text-xs font-black text-stone-200">
                أوراق [{activePlayers[currentTurn]?.name || SECTORS[currentTurn].name}]:
              </span>
              <span className="text-xs text-stone-400">
                (اختر بطاقة لتظهر لك الحبات التي يمكنك تحريكها فوراً)
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              {curHand.map((card) => {
                const isSelected = selectedCard?.id === card.id;

                return (
                  <div key={card.id} className="flex flex-col items-center gap-1.5">
                    <button
                      onClick={() => handleSelectCard(card)}
                      className={`w-16 h-24 sm:w-20 sm:h-28 rounded-xl bg-white shadow-xl flex flex-col justify-between p-2 transform transition-all cursor-pointer ${
                        isSelected
                          ? '-translate-y-3 ring-4 ring-amber-400 shadow-amber-500/30'
                          : 'hover:-translate-y-1'
                      }`}
                    >
                      <div className={`text-xs sm:text-sm font-black self-start ${card.color === 'red' ? 'text-red-600' : 'text-stone-900'}`}>
                        {card.rank} {card.suit}
                      </div>
                      <div className={`text-xl sm:text-2xl font-bold self-center ${card.color === 'red' ? 'text-red-600' : 'text-stone-900'}`}>
                        {card.suit}
                      </div>
                      <div className={`text-xs sm:text-sm font-black self-end rotate-180 ${card.color === 'red' ? 'text-red-600' : 'text-stone-900'}`}>
                        {card.rank} {card.suit}
                      </div>
                    </button>

                    <button
                      onClick={() => handleBurnCard(card)}
                      title="حرق البطاقة وتمرير الدور"
                      className="px-2 py-0.5 text-[10px] bg-stone-800 hover:bg-red-900/60 text-stone-400 hover:text-red-200 rounded-md transition-colors cursor-pointer"
                    >
                      حرق 🔥
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
          <div className="bg-stone-900 border border-amber-400/50 rounded-3xl p-6 sm:p-8 max-w-md w-full text-center shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-amber-400/20 text-amber-400 flex items-center justify-center mx-auto mb-4 border border-amber-400/40">
              <Trophy className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-black text-amber-400 mb-2">انتصار جاكارو أسطوري!</h3>
            <p className="text-lg font-bold text-stone-100 mb-6">
              تمكن اللاعب [{activePlayers[winner]?.name || SECTORS[winner].name}] من إدخال جميع حباته لبيت الأمان! 🎉
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => resetJackaroo()}
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
