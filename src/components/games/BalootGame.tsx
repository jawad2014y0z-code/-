import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Player } from '../../types/game';
import { soundManager } from '../../utils/audio';
import { triggerConfetti } from '../../utils/confetti';
import { onlineService, OnlineRoom } from '../../services/onlineService';
import {
  ArrowRight,
  RotateCcw,
  Volume2,
  VolumeX,
  HelpCircle,
  Trophy,
  Users,
  Shield,
  Zap,
  Sparkles,
  ChevronRight,
  Flame,
  Radio,
  Clock,
  Award,
} from 'lucide-react';

export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';
export type Rank = '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  id: string;
  suit: Suit;
  rank: Rank;
}

export type ContractType = 'sun' | 'hokum';

export interface Contract {
  type: ContractType;
  hokumSuit?: Suit;
  buyerSeat: number; // 0: South (Us), 1: East (Them), 2: North (Us), 3: West (Them)
  doubled?: boolean;
}

export interface PlayedCard {
  seat: number;
  card: Card;
}

export interface RoundScore {
  round: number;
  contract: Contract;
  tricksWonUs: number;
  tricksWonThem: number;
  rawPointsUs: number;
  rawPointsThem: number;
  projectsUs: number;
  projectsThem: number;
  abnatUs: number;
  abnatThem: number;
  buyerLost: boolean;
  kaboot: 'us' | 'them' | null;
}

interface BalootGameProps {
  players: Player[];
  onBack: () => void;
  onOpenRules: () => void;
  onUpdatePlayerName?: (id: string, name: string) => void;
  onOpenOnline?: () => void;
}

const SUIT_ICONS: Record<Suit, { symbol: string; name: string; color: string }> = {
  spades: { symbol: '♠', name: 'سباتي', color: 'text-stone-900' },
  hearts: { symbol: '♥', name: 'هاص', color: 'text-red-600' },
  diamonds: { symbol: '♦', name: 'ديمن', color: 'text-red-600' },
  clubs: { symbol: '♣', name: 'شيريا', color: 'text-stone-900' },
};

const SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
const RANKS: Rank[] = ['7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

// Build 32-card standard Baloot deck
function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ id: `${suit}-${rank}`, suit, rank });
    }
  }
  // Shuffle Fisher-Yates
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

// Points & Ranks in Sun (صن)
const SUN_RANK_POWER: Record<Rank, number> = {
  'A': 8, '10': 7, 'K': 6, 'Q': 5, 'J': 4, '9': 3, '8': 2, '7': 1,
};
const SUN_POINTS: Record<Rank, number> = {
  'A': 11, '10': 10, 'K': 4, 'Q': 3, 'J': 2, '9': 0, '8': 0, '7': 0,
};

// Points & Ranks in Hokum (حكم)
const HOKUM_TRUMP_POWER: Record<Rank, number> = {
  'J': 8, '9': 7, 'A': 6, '10': 5, 'K': 4, 'Q': 3, '8': 2, '7': 1,
};
const HOKUM_TRUMP_POINTS: Record<Rank, number> = {
  'J': 20, '9': 14, 'A': 11, '10': 10, 'K': 4, 'Q': 3, '8': 0, '7': 0,
};

const HOKUM_PLAIN_POWER: Record<Rank, number> = {
  'A': 8, '10': 7, 'K': 6, 'Q': 5, 'J': 4, '9': 3, '8': 2, '7': 1,
};
const HOKUM_PLAIN_POINTS: Record<Rank, number> = {
  'A': 11, '10': 10, 'K': 4, 'Q': 3, 'J': 2, '9': 0, '8': 0, '7': 0,
};

export const BalootGame: React.FC<BalootGameProps> = ({
  players,
  onBack,
  onOpenRules,
  onOpenOnline,
}) => {
  // Seats:
  // 0: South (Us - You)
  // 1: East (Them)
  // 2: North (Us - Teammate)
  // 3: West (Them)
  const seatNames = useMemo(() => {
    return [
      players[0]?.name || 'أنت (الجنوب)',
      players[1]?.name || 'خالد (الشرق)',
      players[2]?.name || 'فيصل (الشمال)',
      players[3]?.name || 'سارة (الغرب)',
    ];
  }, [players]);

  const seatAvatars = useMemo(() => {
    return [
      players[0]?.avatar || '😎',
      players[1]?.avatar || '🦁',
      players[2]?.avatar || '⚡',
      players[3]?.avatar || '👑',
    ];
  }, [players]);

  // Overall Match state (الصكة حتى 152)
  const [scoreUs, setScoreUs] = useState<number>(0);
  const [scoreThem, setScoreThem] = useState<number>(0);
  const [roundHistory, setRoundHistory] = useState<RoundScore[]>([]);
  const [roundNumber, setRoundNumber] = useState<number>(1);
  const [dealerSeat, setDealerSeat] = useState<number>(0);
  const [showScoreSheet, setShowScoreSheet] = useState<boolean>(false);
  const [matchWinner, setMatchWinner] = useState<'us' | 'them' | null>(null);

  // Current Round state
  const [deck, setDeck] = useState<Card[]>([]);
  const [hands, setHands] = useState<Card[][]>([[], [], [], []]);
  const [centerCard, setCenterCard] = useState<Card | null>(null);
  const [gamePhase, setGamePhase] = useState<
    'bidding_round1' | 'bidding_round2' | 'playing' | 'round_end'
  >('bidding_round1');

  const [activeTurn, setActiveTurn] = useState<number>(1); // starts after dealer
  const [contract, setContract] = useState<Contract | null>(null);
  const [biddingPassCount, setBiddingPassCount] = useState<number>(0);

  // Trick state (الأكلة)
  const [currentTrick, setCurrentTrick] = useState<PlayedCard[]>([]);
  const [trickCount, setTrickCount] = useState<number>(0);
  const [tricksWon, setTricksWon] = useState<{ us: PlayedCard[][]; them: PlayedCard[][] }>({
    us: [],
    them: [],
  });
  const [trickMessage, setTrickMessage] = useState<string>('مرحلة الشراء والمزايدة...');
  const [lastTrickWinner, setLastTrickWinner] = useState<number | null>(null);

  // Real-time online integration
  const [onlineRoom, setOnlineRoom] = useState<OnlineRoom | null>(onlineService.getRoom());
  useEffect(() => {
    const unsub = onlineService.subscribeRoom((r) => setOnlineRoom(r));
    return unsub;
  }, []);

  // Initialize a fresh deal for a round
  const startNewDeal = (dealer: number) => {
    const newDeck = createDeck();
    // Deal 5 cards each
    const h0 = newDeck.slice(0, 5);
    const h1 = newDeck.slice(5, 10);
    const h2 = newDeck.slice(10, 15);
    const h3 = newDeck.slice(15, 20);
    const mid = newDeck[20];
    const rest = newDeck.slice(21);

    setDeck(rest);
    setHands([h0, h1, h2, h3]);
    setCenterCard(mid);
    setContract(null);
    setGamePhase('bidding_round1');
    const firstBidder = (dealer + 1) % 4;
    setActiveTurn(firstBidder);
    setBiddingPassCount(0);
    setCurrentTrick([]);
    setTrickCount(0);
    setTricksWon({ us: [], them: [] });
    setLastTrickWinner(null);
    setTrickMessage(`تم توزيع الورق! ورقة الساح: ${mid.rank} ${SUIT_ICONS[mid.suit].name}`);
    soundManager.playCardSlide();
  };

  // Start round on component mount
  useEffect(() => {
    startNewDeal(dealerSeat);
  }, [dealerSeat]);

  // Complete deal after bidding is won
  const finishDealAndStartPlaying = (winningContract: Contract) => {
    setContract(winningContract);
    setGamePhase('playing');
    const buyer = winningContract.buyerSeat;

    // Buyer takes center card, then deals remaining cards:
    // South, East, North, West get 3 cards except buyer gets 2 (total 8 cards each)
    let currentDeck = [...deck];
    if (centerCard) {
      currentDeck = [centerCard, ...currentDeck];
    }

    setHands((prev) => {
      const nextHands = prev.map((hand) => [...hand]);
      // Give buyer centerCard
      if (centerCard) {
        nextHands[buyer].push(centerCard);
      }
      // Give 2 more to buyer, 3 to others
      for (let s = 0; s < 4; s++) {
        const needed = 8 - nextHands[s].length;
        for (let k = 0; k < needed; k++) {
          if (deck.length > 0) {
            const c = deck.pop();
            if (c) nextHands[s].push(c);
          }
        }
      }
      return nextHands;
    });

    setCenterCard(null);
    // Trick leader is seat after dealer
    const leader = (dealerSeat + 1) % 4;
    setActiveTurn(leader);
    const buyerTeam = buyer === 0 || buyer === 2 ? 'لنا' : 'لهم';
    const contractLabel =
      winningContract.type === 'sun'
        ? 'صن ☀️'
        : `حكم ${SUIT_ICONS[winningContract.hokumSuit || 'spades'].symbol} (${SUIT_ICONS[winningContract.hokumSuit || 'spades'].name})`;
    setTrickMessage(`تم الشراء: ${contractLabel} لصالح فريق (${buyerTeam})! اللعب بدأ.`);
    soundManager.playMove();
  };

  // Automated AI / Bot Bidding & Playing
  useEffect(() => {
    if (gamePhase === 'round_end' || matchWinner) return;

    // If active turn is a bot (seat 1, 2, or 3)
    if (activeTurn !== 0) {
      const timer = setTimeout(() => {
        handleBotTurn();
      }, 750);
      return () => clearTimeout(timer);
    }
  }, [activeTurn, gamePhase, currentTrick, contract]);

  const handleBotTurn = () => {
    if (gamePhase === 'bidding_round1') {
      botBidRound1(activeTurn);
    } else if (gamePhase === 'bidding_round2') {
      botBidRound2(activeTurn);
    } else if (gamePhase === 'playing') {
      botPlayCard(activeTurn);
    }
  };

  // Bot logic for Bidding Round 1
  const botBidRound1 = (seat: number) => {
    if (!centerCard) return;
    const hand = hands[seat];
    const suitMatches = hand.filter((c) => c.suit === centerCard.suit).length;
    const acesCount = hand.filter((c) => c.rank === 'A').length;
    const tensCount = hand.filter((c) => c.rank === '10').length;

    // Strong Sun hand?
    if (acesCount >= 2 && tensCount >= 1 && Math.random() > 0.4) {
      acceptBid({ type: 'sun', buyerSeat: seat });
      return;
    }
    // Strong Hokum with center card?
    if (suitMatches >= 3 || (suitMatches >= 2 && hand.some((c) => c.suit === centerCard.suit && (c.rank === 'J' || c.rank === '9')))) {
      acceptBid({ type: 'hokum', hokumSuit: centerCard.suit, buyerSeat: seat });
      return;
    }

    // Otherwise Pass (بس)
    handlePass();
  };

  // Bot logic for Bidding Round 2
  const botBidRound2 = (seat: number) => {
    const hand = hands[seat];
    // Find best suit
    const suitCounts: Record<Suit, number> = { spades: 0, hearts: 0, diamonds: 0, clubs: 0 };
    hand.forEach((c) => suitCounts[c.suit]++);

    let bestSuit: Suit = 'spades';
    let maxCount = 0;
    SUITS.forEach((s) => {
      if (suitCounts[s] > maxCount) {
        maxCount = suitCounts[s];
        bestSuit = s;
      }
    });

    if (maxCount >= 4) {
      acceptBid({ type: 'hokum', hokumSuit: bestSuit, buyerSeat: seat });
      return;
    }

    const aces = hand.filter((c) => c.rank === 'A').length;
    if (aces >= 3) {
      acceptBid({ type: 'sun', buyerSeat: seat });
      return;
    }

    handlePass();
  };

  // Handle Pass
  const handlePass = () => {
    soundManager.playClick();
    const nextPassCount = biddingPassCount + 1;
    setBiddingPassCount(nextPassCount);

    if (gamePhase === 'bidding_round1') {
      if (nextPassCount >= 4) {
        // Transition to Round 2 (ثاني)
        setGamePhase('bidding_round2');
        setBiddingPassCount(0);
        setActiveTurn((dealerSeat + 1) % 4);
        setTrickMessage('الجميع قال (بس) في الأول! بدأ الدور الثاني (ثاني)...');
      } else {
        setActiveTurn((activeTurn + 1) % 4);
      }
    } else if (gamePhase === 'bidding_round2') {
      if (nextPassCount >= 4) {
        // Redeal completely (حلت الورقة)
        setTrickMessage('حلت الورقة! إعادة توزيع الورق لنفس الموزع...');
        const nextDealer = (dealerSeat + 1) % 4;
        setDealerSeat(nextDealer);
      } else {
        setActiveTurn((activeTurn + 1) % 4);
      }
    }
  };

  // Accept Bid
  const acceptBid = (newContract: Contract) => {
    soundManager.playMove();
    finishDealAndStartPlaying(newContract);
  };

  // Bot Card Play
  const botPlayCard = (seat: number) => {
    const hand = hands[seat];
    if (hand.length === 0) return;

    const validCards = getLegalCards(seat, hand);
    if (validCards.length === 0) return;

    // Bot picks lowest point or highest trick winner
    let chosen = validCards[0];
    if (currentTrick.length === 0) {
      // Leading: prefer Aces or small cards
      const ace = validCards.find((c) => c.rank === 'A');
      chosen = ace || validCards[Math.floor(Math.random() * validCards.length)];
    } else {
      // Following: if teammate is winning, throw garbage; if opponent winning, try to beat
      chosen = validCards[0];
    }

    executePlayCard(seat, chosen);
  };

  // Calculate Legal Playable Cards based on Baloot Rules
  const getLegalCards = (seat: number, playerHand: Card[]): Card[] => {
    if (currentTrick.length === 0) {
      // First card can be anything
      return playerHand;
    }

    const leadCard = currentTrick[0].card;
    const sameSuitCards = playerHand.filter((c) => c.suit === leadCard.suit);

    // Rule 1: MUST follow suit if you have it!
    if (sameSuitCards.length > 0) {
      return sameSuitCards;
    }

    // Rule 2: If you do NOT have the led suit
    if (contract?.type === 'hokum' && contract.hokumSuit) {
      const trumpSuit = contract.hokumSuit;
      const trumpCards = playerHand.filter((c) => c.suit === trumpSuit);

      // If teammate is winning the trick, you are free to play anything (حل)
      const currentWinner = evaluateTrickWinner(currentTrick, contract);
      const teammateSeat = (seat + 2) % 4;
      const isTeammateWinning = currentWinner === teammateSeat;

      if (isTeammateWinning) {
        return playerHand; // can throw garbage or trump
      }

      // If opponent is winning, you MUST trump (تدق بحكم) if you have any trump cards
      if (trumpCards.length > 0) {
        return trumpCards;
      }
    }

    // In Sun, or when no trumps available, play any card
    return playerHand;
  };

  // Execute playing a card
  const executePlayCard = (seat: number, card: Card) => {
    soundManager.playCardSlide();

    // Remove from hand
    setHands((prev) => {
      const next = prev.map((h, s) => (s === seat ? h.filter((c) => c.id !== card.id) : h));
      return next;
    });

    const newTrick = [...currentTrick, { seat, card }];
    setCurrentTrick(newTrick);

    // If trick is complete (4 cards)
    if (newTrick.length === 4) {
      setTimeout(() => {
        resolveTrick(newTrick);
      }, 900);
    } else {
      setActiveTurn((seat + 1) % 4);
    }
  };

  // Resolve a completed trick
  const resolveTrick = (trick: PlayedCard[]) => {
    if (!contract) return;
    const winnerSeat = evaluateTrickWinner(trick, contract);
    setLastTrickWinner(winnerSeat);

    const isUs = winnerSeat === 0 || winnerSeat === 2;
    const winnerTeam = isUs ? 'لنا' : 'لهم';
    const winnerName = seatNames[winnerSeat];

    soundManager.playCapture();
    setTrickMessage(`أكلها ${winnerName} لصالح فريق (${winnerTeam})!`);

    // Add to trick history
    setTricksWon((prev) => ({
      ...prev,
      [isUs ? 'us' : 'them']: [...prev[isUs ? 'us' : 'them'], trick],
    }));

    setCurrentTrick([]);
    const nextTrickCount = trickCount + 1;
    setTrickCount(nextTrickCount);

    if (nextTrickCount >= 8) {
      // Round Complete -> Calculate Abnat & Scores
      setTimeout(() => {
        resolveRoundEnd();
      }, 1000);
    } else {
      // Trick winner leads the next trick
      setActiveTurn(winnerSeat);
    }
  };

  // Evaluate which seat won the trick
  const evaluateTrickWinner = (trick: PlayedCard[], c: Contract): number => {
    if (trick.length === 0) return 0;
    const leadCard = trick[0].card;

    if (c.type === 'hokum' && c.hokumSuit) {
      // Check for trumps
      const trumpPlays = trick.filter((p) => p.card.suit === c.hokumSuit);
      if (trumpPlays.length > 0) {
        trumpPlays.sort(
          (a, b) => HOKUM_TRUMP_POWER[b.card.rank] - HOKUM_TRUMP_POWER[a.card.rank]
        );
        return trumpPlays[0].seat;
      }
    }

    // Compare cards of led suit
    const ledPlays = trick.filter((p) => p.card.suit === leadCard.suit);
    if (c.type === 'sun') {
      ledPlays.sort((a, b) => SUN_RANK_POWER[b.card.rank] - SUN_RANK_POWER[a.card.rank]);
    } else {
      ledPlays.sort((a, b) => HOKUM_PLAIN_POWER[b.card.rank] - HOKUM_PLAIN_POWER[a.card.rank]);
    }

    return ledPlays[0].seat;
  };

  // End of Round: Calculate Points, Abnat, Buyer Success/Failure
  const resolveRoundEnd = () => {
    if (!contract) return;

    let pointsUs = 0;
    let pointsThem = 0;

    // Sum points from tricks won
    tricksWon.us.forEach((trick) => {
      trick.forEach((p) => {
        pointsUs += getCardPoints(p.card, contract);
      });
    });
    tricksWon.them.forEach((trick) => {
      trick.forEach((p) => {
        pointsThem += getCardPoints(p.card, contract);
      });
    });

    // Last trick (الأكلة الأخيرة / القاع) = 10 points
    if (lastTrickWinner === 0 || lastTrickWinner === 2) {
      pointsUs += 10;
    } else {
      pointsThem += 10;
    }

    // Projects calculation (simple simulation: Sira = 20/40)
    const projectsUs = 0;
    const projectsThem = 0;

    // Convert to Baloot Abnat:
    // Sun: points are doubled and divided by 5 (rounded)
    // Hokum: points are divided by 10 (rounded)
    let abnatUs = 0;
    let abnatThem = 0;

    if (contract.type === 'sun') {
      abnatUs = Math.round((pointsUs * 2) / 10);
      abnatThem = Math.round((pointsThem * 2) / 10);
    } else {
      abnatUs = Math.round(pointsUs / 10);
      abnatThem = Math.round(pointsThem / 10);
    }

    // Check Buyer Target (خسران أم ناجح):
    const buyerIsUs = contract.buyerSeat === 0 || contract.buyerSeat === 2;
    const buyerAbnat = buyerIsUs ? abnatUs : abnatThem;
    const defenderAbnat = buyerIsUs ? abnatThem : abnatUs;

    let buyerLost = false;
    let kaboot: 'us' | 'them' | null = null;

    if (tricksWon.us.length === 8) {
      kaboot = 'us';
      abnatUs += contract.type === 'sun' ? 44 : 25;
    } else if (tricksWon.them.length === 8) {
      kaboot = 'them';
      abnatThem += contract.type === 'sun' ? 44 : 25;
    }

    // In Baloot, buyer must score strictly more than the defenders
    if (buyerAbnat <= defenderAbnat && !kaboot) {
      buyerLost = true;
      // All points go to defenders!
      const totalAbnat = abnatUs + abnatThem;
      if (buyerIsUs) {
        abnatUs = 0;
        abnatThem = totalAbnat;
      } else {
        abnatThem = 0;
        abnatUs = totalAbnat;
      }
    }

    const newScoreUs = scoreUs + abnatUs;
    const newScoreThem = scoreThem + abnatThem;

    const roundScore: RoundScore = {
      round: roundNumber,
      contract,
      tricksWonUs: tricksWon.us.length,
      tricksWonThem: tricksWon.them.length,
      rawPointsUs: pointsUs,
      rawPointsThem: pointsThem,
      projectsUs,
      projectsThem,
      abnatUs,
      abnatThem,
      buyerLost,
      kaboot,
    };

    setRoundHistory((prev) => [...prev, roundScore]);
    setScoreUs(newScoreUs);
    setScoreThem(newScoreThem);
    setGamePhase('round_end');

    if (newScoreUs >= 152 || newScoreThem >= 152) {
      setMatchWinner(newScoreUs >= 152 ? 'us' : 'them');
      triggerConfetti();
      soundManager.playFanfare();
    } else {
      soundManager.playMove();
    }
  };

  const getCardPoints = (card: Card, c: Contract): number => {
    if (c.type === 'sun') {
      return SUN_POINTS[card.rank];
    }
    if (c.hokumSuit && card.suit === c.hokumSuit) {
      return HOKUM_TRUMP_POINTS[card.rank];
    }
    return HOKUM_PLAIN_POINTS[card.rank];
  };

  // Next Round Trigger
  const handleNextRound = () => {
    soundManager.playClick();
    setRoundNumber((r) => r + 1);
    const nextDealer = (dealerSeat + 1) % 4;
    setDealerSeat(nextDealer);
  };

  // Restart complete match
  const handleRestartMatch = () => {
    soundManager.playClick();
    setScoreUs(0);
    setScoreThem(0);
    setRoundHistory([]);
    setRoundNumber(1);
    setMatchWinner(null);
    setDealerSeat(0);
    startNewDeal(0);
  };

  // User Hand & Legal cards
  const userHand = hands[0];
  const userLegalCards = useMemo(() => {
    if (activeTurn !== 0 || gamePhase !== 'playing') return [];
    return getLegalCards(0, userHand);
  }, [activeTurn, gamePhase, userHand, currentTrick, contract]);

  const isCardLegal = (card: Card): boolean => {
    return userLegalCards.some((c) => c.id === card.id);
  };

  return (
    <div className="relative w-full min-h-[calc(100vh-80px)] flex flex-col justify-between max-w-7xl mx-auto px-2 sm:px-4 py-2 font-cairo select-none">
      {/* Top Header Bar inside Baloot Game */}
      <div className="w-full bg-stone-900/90 backdrop-blur-md border border-stone-800 rounded-2xl p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3 shadow-xl">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              soundManager.playClick();
              onBack();
            }}
            className="p-2 text-stone-400 hover:text-white bg-stone-950 rounded-xl border border-stone-800 hover:border-amber-400/50 transition-colors flex items-center gap-1.5 text-xs font-bold"
          >
            <ArrowRight className="w-4 h-4" />
            <span className="hidden sm:inline">صالة الألعاب</span>
          </button>

          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-black text-amber-400 flex items-center gap-1.5">
              <span>بلوت جمعة</span>
              <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full border border-red-500/30">
                الصكة 152
              </span>
            </h2>
          </div>
        </div>

        {/* Live Scoreboard (النشرة) */}
        <div className="flex items-center gap-2 sm:gap-4 bg-stone-950 px-3 sm:px-5 py-2 rounded-xl border border-stone-800">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-bold">
            <span className="text-emerald-400">لنا: {scoreUs}</span>
            <span className="text-stone-600">|</span>
            <span className="text-red-400">لهم: {scoreThem}</span>
          </div>
          <button
            onClick={() => {
              soundManager.playClick();
              setShowScoreSheet(true);
            }}
            className="text-[11px] font-bold text-amber-400 hover:text-amber-300 underline underline-offset-4 decoration-amber-500/40"
          >
            النشرة الكاملة 📜
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              soundManager.playClick();
              onOpenRules();
            }}
            title="قوانين البلوت"
            className="p-2 text-stone-400 hover:text-amber-400 bg-stone-950 rounded-xl border border-stone-800 transition-colors"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
          <button
            onClick={handleRestartMatch}
            title="صكة جديدة"
            className="p-2 text-stone-400 hover:text-white bg-stone-950 rounded-xl border border-stone-800 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Felt Card Table Container */}
      <div className="relative my-3 flex-1 w-full min-h-[520px] sm:min-h-[580px] bg-gradient-to-b from-emerald-950 via-emerald-900 to-emerald-950 rounded-3xl border-4 sm:border-8 border-stone-900 shadow-2xl overflow-hidden flex flex-col justify-between p-3 sm:p-6">
        {/* Felt Texture subtle overlay */}
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

        {/* Table Felt Center Gold Pattern */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 sm:w-72 h-48 sm:h-72 rounded-full border border-emerald-500/20 pointer-events-none flex items-center justify-center">
          <div className="w-32 sm:w-48 h-32 sm:h-48 rounded-full border border-emerald-500/15" />
        </div>

        {/* SEAT 2: North (Teammate - خويك) */}
        <div className="flex flex-col items-center z-10">
          <div
            className={`px-3 py-1.5 rounded-2xl flex items-center gap-2 border transition-all ${
              activeTurn === 2
                ? 'bg-amber-500 text-stone-950 border-amber-300 shadow-lg scale-105'
                : 'bg-stone-900/90 text-stone-300 border-stone-700'
            }`}
          >
            <span className="text-lg">{seatAvatars[2]}</span>
            <div className="text-right">
              <div className="text-xs font-black leading-tight flex items-center gap-1">
                <span>{seatNames[2]}</span>
                <span className="text-[10px] bg-emerald-500/30 text-emerald-300 px-1 rounded">خويك (لنا)</span>
              </div>
              <span className="text-[10px] opacity-75">{hands[2].length} بطاقات</span>
            </div>
            {dealerSeat === 2 && (
              <span className="w-5 h-5 rounded-full bg-amber-400 text-stone-950 font-black text-[10px] flex items-center justify-center">
                D
              </span>
            )}
          </div>
          {/* Card Backs for Teammate */}
          <div className="flex -space-x-3 mt-1.5 rtl:space-x-reverse">
            {hands[2].map((_, i) => (
              <div
                key={i}
                className="w-8 h-12 sm:w-10 sm:h-14 bg-red-950 border border-amber-500/30 rounded-lg shadow-md"
              />
            ))}
          </div>
        </div>

        {/* MIDDLE ROW: West (Seat 3) + Center Play Arena + East (Seat 1) */}
        <div className="flex items-center justify-between w-full z-10 px-2 sm:px-6">
          {/* SEAT 3: West (Opponent - لهم) */}
          <div className="flex flex-col items-center">
            <div
              className={`px-3 py-1.5 rounded-2xl flex items-center gap-2 border transition-all ${
                activeTurn === 3
                  ? 'bg-amber-500 text-stone-950 border-amber-300 shadow-lg scale-105'
                  : 'bg-stone-900/90 text-stone-300 border-stone-700'
              }`}
            >
              <span className="text-lg">{seatAvatars[3]}</span>
              <div className="text-right">
                <div className="text-xs font-black leading-tight flex items-center gap-1">
                  <span>{seatNames[3]}</span>
                  <span className="text-[10px] bg-red-500/30 text-red-300 px-1 rounded">لهم</span>
                </div>
                <span className="text-[10px] opacity-75">{hands[3].length} بطاقات</span>
              </div>
              {dealerSeat === 3 && (
                <span className="w-5 h-5 rounded-full bg-amber-400 text-stone-950 font-black text-[10px] flex items-center justify-center">
                  D
                </span>
              )}
            </div>
            {/* Card Backs for West */}
            <div className="flex flex-col -space-y-6 mt-2">
              {hands[3].slice(0, 5).map((_, i) => (
                <div
                  key={i}
                  className="w-12 h-8 sm:w-14 sm:h-9 bg-red-950 border border-amber-500/30 rounded-md shadow-md"
                />
              ))}
            </div>
          </div>

          {/* CENTER ARENA: Bidding Card / Played Trick Cards */}
          <div className="flex flex-col items-center justify-center">
            {/* Active Contract Info Pill */}
            {contract ? (
              <div className="mb-2 px-3 py-1 bg-stone-950/80 border border-amber-500/40 rounded-full text-xs font-black text-amber-300 flex items-center gap-2 shadow-md">
                <span>
                  {contract.type === 'sun'
                    ? 'اللعب: صن ☀️'
                    : `اللعب: حكم ${SUIT_ICONS[contract.hokumSuit || 'spades'].symbol} (${SUIT_ICONS[contract.hokumSuit || 'spades'].name})`}
                </span>
                <span className="text-stone-400">|</span>
                <span className="text-[11px] text-stone-300">
                  المشتري:{' '}
                  {contract.buyerSeat === 0 || contract.buyerSeat === 2
                    ? 'فريقنا (لنا)'
                    : 'فريق الخصم (لهم)'}
                </span>
              </div>
            ) : (
              <div className="mb-2 px-3 py-1 bg-emerald-950/90 border border-emerald-500/30 rounded-full text-xs font-bold text-emerald-200">
                {gamePhase === 'bidding_round1' ? 'مرحلة الشراء: الدور الأول (أول)' : 'مرحلة الشراء: الدور الثاني (ثاني)'}
              </div>
            )}

            {/* Center Area: Trick Cards or Center Card */}
            <div className="relative w-44 sm:w-60 h-44 sm:h-60 rounded-2xl bg-emerald-950/50 border border-emerald-500/20 flex items-center justify-center shadow-inner">
              {/* If Bidding Phase: Show Center Bidding Card */}
              {centerCard && (gamePhase === 'bidding_round1' || gamePhase === 'bidding_round2') && (
                <div className="flex flex-col items-center animate-in zoom-in-95 duration-200">
                  <span className="text-[11px] font-black text-amber-400 mb-1">ورقة الساح</span>
                  <div className="w-16 h-24 sm:w-20 sm:h-28 bg-white rounded-xl shadow-2xl border-2 border-amber-400 p-2 flex flex-col justify-between">
                    <div className="flex justify-between items-start font-black text-sm">
                      <span className={SUIT_ICONS[centerCard.suit].color}>{centerCard.rank}</span>
                      <span className={SUIT_ICONS[centerCard.suit].color}>
                        {SUIT_ICONS[centerCard.suit].symbol}
                      </span>
                    </div>
                    <div className="text-center text-3xl select-none">
                      <span className={SUIT_ICONS[centerCard.suit].color}>
                        {SUIT_ICONS[centerCard.suit].symbol}
                      </span>
                    </div>
                    <div className="flex justify-between items-end font-black text-sm rotate-180">
                      <span className={SUIT_ICONS[centerCard.suit].color}>{centerCard.rank}</span>
                      <span className={SUIT_ICONS[centerCard.suit].color}>
                        {SUIT_ICONS[centerCard.suit].symbol}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* If Playing Phase: Show Played Trick Cards */}
              {gamePhase === 'playing' && (
                <div className="relative w-full h-full">
                  {currentTrick.map((played, idx) => {
                    // Position by seat:
                    // 0: South (bottom)
                    // 1: East (right)
                    // 2: North (top)
                    // 3: West (left)
                    const positions = [
                      'bottom-2 left-1/2 -translate-x-1/2',
                      'right-2 top-1/2 -translate-y-1/2',
                      'top-2 left-1/2 -translate-x-1/2',
                      'left-2 top-1/2 -translate-y-1/2',
                    ];
                    return (
                      <div
                        key={idx}
                        className={`absolute ${positions[played.seat]} w-14 h-20 sm:w-16 sm:h-24 bg-white rounded-xl shadow-2xl border border-stone-300 p-1.5 flex flex-col justify-between transition-all duration-300`}
                      >
                        <div className="flex justify-between items-start font-black text-xs">
                          <span className={SUIT_ICONS[played.card.suit].color}>
                            {played.card.rank}
                          </span>
                          <span className={SUIT_ICONS[played.card.suit].color}>
                            {SUIT_ICONS[played.card.suit].symbol}
                          </span>
                        </div>
                        <div className="text-center text-xl select-none">
                          <span className={SUIT_ICONS[played.card.suit].color}>
                            {SUIT_ICONS[played.card.suit].symbol}
                          </span>
                        </div>
                        <div className="flex justify-between items-end font-black text-xs rotate-180">
                          <span className={SUIT_ICONS[played.card.suit].color}>
                            {played.card.rank}
                          </span>
                          <span className={SUIT_ICONS[played.card.suit].color}>
                            {SUIT_ICONS[played.card.suit].symbol}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  {currentTrick.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center text-emerald-400/40 text-xs font-bold">
                      الأكلة #{trickCount + 1}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Commentary Banner */}
            <div className="mt-2 text-center text-xs font-bold text-stone-300 max-w-xs">
              {trickMessage}
            </div>
          </div>

          {/* SEAT 1: East (Opponent - لهم) */}
          <div className="flex flex-col items-center">
            <div
              className={`px-3 py-1.5 rounded-2xl flex items-center gap-2 border transition-all ${
                activeTurn === 1
                  ? 'bg-amber-500 text-stone-950 border-amber-300 shadow-lg scale-105'
                  : 'bg-stone-900/90 text-stone-300 border-stone-700'
              }`}
            >
              <span className="text-lg">{seatAvatars[1]}</span>
              <div className="text-right">
                <div className="text-xs font-black leading-tight flex items-center gap-1">
                  <span>{seatNames[1]}</span>
                  <span className="text-[10px] bg-red-500/30 text-red-300 px-1 rounded">لهم</span>
                </div>
                <span className="text-[10px] opacity-75">{hands[1].length} بطاقات</span>
              </div>
              {dealerSeat === 1 && (
                <span className="w-5 h-5 rounded-full bg-amber-400 text-stone-950 font-black text-[10px] flex items-center justify-center">
                  D
                </span>
              )}
            </div>
            {/* Card Backs for East */}
            <div className="flex flex-col -space-y-6 mt-2">
              {hands[1].slice(0, 5).map((_, i) => (
                <div
                  key={i}
                  className="w-12 h-8 sm:w-14 sm:h-9 bg-red-950 border border-amber-500/30 rounded-md shadow-md"
                />
              ))}
            </div>
          </div>
        </div>

        {/* SEAT 0: South (Player - أنت) */}
        <div className="flex flex-col items-center z-10 w-full mt-2">
          {/* User Status Tag */}
          <div className="flex items-center gap-3 mb-2">
            <div
              className={`px-3 py-1 rounded-2xl flex items-center gap-2 border transition-all ${
                activeTurn === 0
                  ? 'bg-amber-500 text-stone-950 border-amber-300 shadow-lg scale-105 font-black'
                  : 'bg-stone-900/90 text-stone-300 border-stone-700 font-bold'
              }`}
            >
              <span className="text-lg">{seatAvatars[0]}</span>
              <span className="text-xs">{seatNames[0]} (دورك)</span>
              {dealerSeat === 0 && (
                <span className="w-5 h-5 rounded-full bg-amber-400 text-stone-950 font-black text-[10px] flex items-center justify-center">
                  D
                </span>
              )}
            </div>
          </div>

          {/* Human Bidding Action Controls (Shown during bidding when activeTurn === 0) */}
          {(gamePhase === 'bidding_round1' || gamePhase === 'bidding_round2') && activeTurn === 0 && (
            <div className="mb-3 flex flex-wrap items-center justify-center gap-2 p-2 bg-stone-950/90 border border-amber-500/40 rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200">
              <span className="text-xs font-black text-amber-400 px-2">دورك للشراء:</span>
              <button
                onClick={() => {
                  soundManager.playClick();
                  handlePass();
                }}
                className="px-4 py-1.5 bg-stone-850 hover:bg-stone-750 text-stone-200 font-bold text-xs rounded-xl border border-stone-700"
              >
                بس ⏭️
              </button>

              {gamePhase === 'bidding_round1' && centerCard && (
                <>
                  <button
                    onClick={() => {
                      soundManager.playClick();
                      acceptBid({
                        type: 'hokum',
                        hokumSuit: centerCard.suit,
                        buyerSeat: 0,
                      });
                    }}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-md flex items-center gap-1"
                  >
                    <span>حكم</span>
                    <span>{SUIT_ICONS[centerCard.suit].symbol}</span>
                    <span>({SUIT_ICONS[centerCard.suit].name})</span>
                  </button>
                  <button
                    onClick={() => {
                      soundManager.playClick();
                      acceptBid({ type: 'sun', buyerSeat: 0 });
                    }}
                    className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs rounded-xl shadow-md"
                  >
                    صن ☀️
                  </button>
                </>
              )}

              {gamePhase === 'bidding_round2' && (
                <>
                  {SUITS.map((suit) => (
                    <button
                      key={suit}
                      onClick={() => {
                        soundManager.playClick();
                        acceptBid({
                          type: 'hokum',
                          hokumSuit: suit,
                          buyerSeat: 0,
                        });
                      }}
                      className="px-2.5 py-1.5 bg-stone-850 hover:bg-stone-750 text-white font-bold text-xs rounded-xl border border-stone-700 flex items-center gap-1"
                    >
                      <span className={SUIT_ICONS[suit].color}>{SUIT_ICONS[suit].symbol}</span>
                      <span>{SUIT_ICONS[suit].name}</span>
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      soundManager.playClick();
                      acceptBid({ type: 'sun', buyerSeat: 0 });
                    }}
                    className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs rounded-xl shadow-md"
                  >
                    صن ☀️
                  </button>
                </>
              )}
            </div>
          )}

          {/* User Hand of Cards */}
          <div className="flex items-center justify-center -space-x-2 sm:-space-x-4 rtl:space-x-reverse overflow-x-auto max-w-full px-2 py-2">
            {userHand.map((card) => {
              const legal = isCardLegal(card);
              const isMyTurn = activeTurn === 0 && gamePhase === 'playing';

              return (
                <button
                  key={card.id}
                  disabled={!isMyTurn || !legal}
                  onClick={() => {
                    if (isMyTurn && legal) {
                      executePlayCard(0, card);
                    }
                  }}
                  className={`w-14 h-22 sm:w-20 sm:h-30 rounded-xl bg-white shadow-xl p-1.5 sm:p-2 flex flex-col justify-between transition-all duration-200 cursor-pointer ${
                    isMyTurn && legal
                      ? 'hover:-translate-y-4 hover:shadow-2xl hover:border-amber-400 ring-2 ring-amber-400/80 -translate-y-1'
                      : isMyTurn && !legal
                      ? 'opacity-40 grayscale-[40%] cursor-not-allowed'
                      : 'hover:-translate-y-1 opacity-90'
                  }`}
                >
                  <div className="flex justify-between items-start font-black text-xs sm:text-sm">
                    <span className={SUIT_ICONS[card.suit].color}>{card.rank}</span>
                    <span className={SUIT_ICONS[card.suit].color}>
                      {SUIT_ICONS[card.suit].symbol}
                    </span>
                  </div>
                  <div className="text-center text-xl sm:text-3xl select-none">
                    <span className={SUIT_ICONS[card.suit].color}>
                      {SUIT_ICONS[card.suit].symbol}
                    </span>
                  </div>
                  <div className="flex justify-between items-end font-black text-xs sm:text-sm rotate-180">
                    <span className={SUIT_ICONS[card.suit].color}>{card.rank}</span>
                    <span className={SUIT_ICONS[card.suit].color}>
                      {SUIT_ICONS[card.suit].symbol}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Round End Modal / Overlay */}
      {gamePhase === 'round_end' && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl max-w-md w-full p-6 text-center shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-black text-amber-400 mb-1">
              نهاية الجولة #{roundNumber}
            </h3>
            <p className="text-xs text-stone-400 mb-4">
              نوع اللعب:{' '}
              {contract?.type === 'sun'
                ? 'صن'
                : `حكم (${SUIT_ICONS[contract?.hokumSuit || 'spades'].name})`}
            </p>

            <div className="grid grid-cols-2 gap-3 bg-stone-950 p-4 rounded-2xl border border-stone-800 mb-5">
              <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl">
                <span className="text-xs font-bold text-emerald-400 block mb-1">فريقنا (لنا)</span>
                <span className="text-2xl font-black text-white">{scoreUs}</span>
                <span className="text-[10px] text-stone-400 block mt-1">
                  أبناط الجولة: +{roundHistory[roundHistory.length - 1]?.abnatUs || 0}
                </span>
              </div>
              <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-xl">
                <span className="text-xs font-bold text-red-400 block mb-1">فريق الخصم (لهم)</span>
                <span className="text-2xl font-black text-white">{scoreThem}</span>
                <span className="text-[10px] text-stone-400 block mt-1">
                  أبناط الجولة: +{roundHistory[roundHistory.length - 1]?.abnatThem || 0}
                </span>
              </div>
            </div>

            {roundHistory[roundHistory.length - 1]?.buyerLost && (
              <div className="p-2.5 bg-red-500/15 border border-red-500/30 rounded-xl text-xs font-bold text-red-300 mb-4">
                ⚠️ خسر المشتري الرهان! ذهبت جميع الأبناط للفريق المدافع.
              </div>
            )}

            <button
              onClick={handleNextRound}
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-sm rounded-xl transition-colors shadow-lg cursor-pointer"
            >
              بدء الجولة التالية 🃏
            </button>
          </div>
        </div>
      )}

      {/* Match Victory Celebration Modal (الصكة) */}
      {matchWinner && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-stone-900 border-2 border-amber-400/60 rounded-3xl max-w-md w-full p-6 text-center shadow-2xl animate-in zoom-in-95 duration-200">
            <Trophy className="w-16 h-16 text-amber-400 mx-auto mb-3 animate-bounce" />
            <h3 className="text-2xl font-black text-stone-100 mb-1">
              {matchWinner === 'us' ? 'مبروووك الفوز بالصكة! 🏆🔥' : 'فاز الخصم بالصكة! 👏'}
            </h3>
            <p className="text-xs text-stone-400 mb-4">
              وصول الفريق إلى 152 نقطة وحسم الصكة بنجاح
            </p>

            <div className="grid grid-cols-2 gap-3 bg-stone-950 p-4 rounded-2xl border border-stone-800 mb-5">
              <div className="p-3 bg-emerald-950/40 rounded-xl">
                <span className="text-xs font-bold text-emerald-400 block">لنا</span>
                <span className="text-3xl font-black text-white">{scoreUs}</span>
              </div>
              <div className="p-3 bg-red-950/40 rounded-xl">
                <span className="text-xs font-bold text-red-400 block">لهم</span>
                <span className="text-3xl font-black text-white">{scoreThem}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleRestartMatch}
                className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs rounded-xl transition-colors cursor-pointer"
              >
                صكة جديدة 🔄
              </button>
              <button
                onClick={onBack}
                className="flex-1 py-3 bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                صالة الألعاب
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Score Sheet Drawer / Modal (النشرة الكاملة) */}
      {showScoreSheet && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-stone-800 flex items-center justify-between">
              <h3 className="text-base font-black text-amber-400">نشرة البلوت (الصكة 152)</h3>
              <button
                onClick={() => setShowScoreSheet(false)}
                className="text-stone-400 hover:text-white text-xs font-bold px-2 py-1 bg-stone-950 rounded-lg"
              >
                إغلاق ✕
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3">
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl">
                  <span className="text-xs font-bold text-emerald-400">لنا</span>
                  <div className="text-2xl font-black text-white">{scoreUs}</div>
                </div>
                <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-xl">
                  <span className="text-xs font-bold text-red-400">لهم</span>
                  <div className="text-2xl font-black text-white">{scoreThem}</div>
                </div>
              </div>

              <div className="border border-stone-800 rounded-2xl overflow-hidden">
                <table className="w-full text-right text-xs">
                  <thead className="bg-stone-950 text-stone-400 font-bold border-b border-stone-800">
                    <tr>
                      <th className="p-2.5">الجولة</th>
                      <th className="p-2.5">النوع</th>
                      <th className="p-2.5">لنا</th>
                      <th className="p-2.5">لهم</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-850">
                    {roundHistory.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-4 text-center text-stone-500">
                          لم تكتمل أي جولة بعد
                        </td>
                      </tr>
                    ) : (
                      roundHistory.map((r, i) => (
                        <tr key={i} className="hover:bg-stone-850/50">
                          <td className="p-2.5 font-bold text-stone-300">#{r.round}</td>
                          <td className="p-2.5 text-stone-400">
                            {r.contract.type === 'sun'
                              ? 'صن'
                              : `حكم ${SUIT_ICONS[r.contract.hokumSuit || 'spades'].symbol}`}
                          </td>
                          <td className="p-2.5 font-black text-emerald-400">+{r.abnatUs}</td>
                          <td className="p-2.5 font-black text-red-400">+{r.abnatThem}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
