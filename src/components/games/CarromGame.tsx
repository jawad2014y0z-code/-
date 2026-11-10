import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Player } from '../../types/game';
import { soundManager } from '../../utils/audio';
import { triggerConfetti } from '../../utils/confetti';
import { RotateCcw, Volume2, Trophy, Info, Target, Award, Users } from 'lucide-react';

interface Coin {
  id: number;
  type: 'white' | 'black' | 'queen';
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  isPocketed: boolean;
}

interface CarromGameProps {
  players: Player[];
  onBack: () => void;
  onOpenRules: () => void;
  onUpdatePlayerName?: (id: string, name: string) => void;
}

const CARROM_SIDES = [
  { label: 'الأسفل (South)', side: 'bottom', color: 'text-red-400', bg: 'bg-red-500', hex: '#ef4444' },
  { label: 'اليمين (East)', side: 'right', color: 'text-amber-400', bg: 'bg-amber-500', hex: '#f59e0b' },
  { label: 'الأعلى (North)', side: 'top', color: 'text-emerald-400', bg: 'bg-emerald-500', hex: '#10b981' },
  { label: 'اليسار (West)', side: 'left', color: 'text-blue-400', bg: 'bg-blue-500', hex: '#3b82f6' },
];

export const CarromGame: React.FC<CarromGameProps> = ({
  players,
  onBack,
  onOpenRules,
  onUpdatePlayerName,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [playerCount, setPlayerCount] = useState<number>(4);
  const activePlayers = players.slice(0, playerCount);

  const getSideIndex = (pIdx: number, count: number): number => {
    if (count === 2) return pIdx === 0 ? 0 : 2; // South & North
    if (count === 3) return pIdx; // South, East, North
    return pIdx; // 0, 1, 2, 3
  };

  const [currentPlayer, setCurrentPlayer] = useState<number>(0);
  const [scores, setScores] = useState<number[]>([0, 0, 0, 0]);
  const [queenCoverPending, setQueenCoverPending] = useState<number | null>(null);
  const [gameMessage, setGameMessage] = useState<string>('حرّك المضرب على خطك، ثم اسحب للخلف وصوّب!');
  const [isAiming, setIsAiming] = useState<boolean>(false);
  const [aimStart, setAimStart] = useState<{ x: number; y: number } | null>(null);
  const [aimCurrent, setAimCurrent] = useState<{ x: number; y: number } | null>(null);
  const [strikerPos, setStrikerPos] = useState<number>(300); // 140..460 on active baseline
  const [coinsMoving, setCoinsMoving] = useState<boolean>(false);
  const [winner, setWinner] = useState<number | null>(null);

  // Board dimensions in virtual canvas units (600x600)
  const BOARD_SIZE = 600;
  const POCKET_RADIUS = 30;
  const STRIKER_RADIUS = 18;
  const COIN_RADIUS = 13;

  // Internal state refs for 60fps physics
  const coinsRef = useRef<Coin[]>([]);
  const strikerRef = useRef<{ x: number; y: number; vx: number; vy: number; isPocketed: boolean }>({
    x: 300,
    y: 500,
    vx: 0,
    vy: 0,
    isPocketed: false,
  });

  // Pockets positions
  const pockets = [
    { x: 38, y: 38 },
    { x: BOARD_SIZE - 38, y: 38 },
    { x: 38, y: BOARD_SIZE - 38 },
    { x: BOARD_SIZE - 38, y: BOARD_SIZE - 38 },
  ];

  // Set striker position depending on active player's baseline
  const updateStrikerBaselinePosition = (pIdx: number, pos: number) => {
    if (pIdx === 0) {
      // Bottom: Y=500, X=pos
      strikerRef.current.x = pos;
      strikerRef.current.y = 500;
    } else if (pIdx === 1) {
      // Right: X=500, Y=pos
      strikerRef.current.x = 500;
      strikerRef.current.y = pos;
    } else if (pIdx === 2) {
      // Top: Y=100, X=pos
      strikerRef.current.x = pos;
      strikerRef.current.y = 100;
    } else {
      // Left: X=100, Y=pos
      strikerRef.current.x = 100;
      strikerRef.current.y = pos;
    }
  };

  // Setup initial carrom arrangement in center
  const initBoard = useCallback(() => {
    soundManager.playClick();
    const cx = BOARD_SIZE / 2;
    const cy = BOARD_SIZE / 2;
    const list: Coin[] = [];

    // Red Queen in center
    list.push({
      id: 0,
      type: 'queen',
      x: cx,
      y: cy,
      vx: 0,
      vy: 0,
      radius: COIN_RADIUS,
      isPocketed: false,
    });

    // 1st ring: 6 coins alternating white & black
    const r1 = COIN_RADIUS * 2 + 1;
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      list.push({
        id: i + 1,
        type: i % 2 === 0 ? 'white' : 'black',
        x: cx + r1 * Math.cos(angle),
        y: cy + r1 * Math.sin(angle),
        vx: 0,
        vy: 0,
        radius: COIN_RADIUS,
        isPocketed: false,
      });
    }

    // 2nd ring: 12 coins alternating
    const r2 = COIN_RADIUS * 4 + 2;
    for (let i = 0; i < 12; i++) {
      const angle = (i * Math.PI) / 6 + Math.PI / 12;
      list.push({
        id: i + 7,
        type: i % 2 === 0 ? 'white' : 'black',
        x: cx + r2 * Math.cos(angle),
        y: cy + r2 * Math.sin(angle),
        vx: 0,
        vy: 0,
        radius: COIN_RADIUS,
        isPocketed: false,
      });
    }

    coinsRef.current = list;
    strikerRef.current = { x: 300, y: 500, vx: 0, vy: 0, isPocketed: false };
    setStrikerPos(300);
    setCurrentPlayer(0);
    setScores([0, 0, 0, 0]);
    setQueenCoverPending(null);
    setWinner(null);
    setCoinsMoving(false);
    setGameMessage('حرّك المضرب على خطك، ثم اسحب للخلف وصوّب!');
  }, []);

  useEffect(() => {
    initBoard();
  }, [initBoard]);

  // Update striker baseline when currentPlayer or slider changes
  useEffect(() => {
    updateStrikerBaselinePosition(currentPlayer, strikerPos);
    strikerRef.current.vx = 0;
    strikerRef.current.vy = 0;
    strikerRef.current.isPocketed = false;
  }, [currentPlayer, strikerPos]);

  // Main Canvas Render & Physics Loop
  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const friction = 0.985;
    const minVelocity = 0.05;

    const loop = () => {
      // 1. Physics update
      let anyMoving = false;
      const striker = strikerRef.current;

      // Update striker physics
      if (!striker.isPocketed && (Math.abs(striker.vx) > 0.01 || Math.abs(striker.vy) > 0.01)) {
        striker.x += striker.vx;
        striker.y += striker.vy;
        striker.vx *= friction;
        striker.vy *= friction;

        if (Math.abs(striker.vx) < minVelocity) striker.vx = 0;
        if (Math.abs(striker.vy) < minVelocity) striker.vy = 0;
        anyMoving = true;

        // Bounce striker off edges (border cushions: 35 to 565)
        const minBound = 35 + STRIKER_RADIUS;
        const maxBound = BOARD_SIZE - 35 - STRIKER_RADIUS;
        if (striker.x < minBound) {
          striker.x = minBound;
          striker.vx = -striker.vx * 0.75;
          soundManager.playStrikerHit(0.4);
        } else if (striker.x > maxBound) {
          striker.x = maxBound;
          striker.vx = -striker.vx * 0.75;
          soundManager.playStrikerHit(0.4);
        }
        if (striker.y < minBound) {
          striker.y = minBound;
          striker.vy = -striker.vy * 0.75;
          soundManager.playStrikerHit(0.4);
        } else if (striker.y > maxBound) {
          striker.y = maxBound;
          striker.vy = -striker.vy * 0.75;
          soundManager.playStrikerHit(0.4);
        }

        // Pocket check for striker (foul!)
        for (const p of pockets) {
          const dx = striker.x - p.x;
          const dy = striker.y - p.y;
          if (Math.sqrt(dx * dx + dy * dy) < POCKET_RADIUS - 4) {
            striker.isPocketed = true;
            striker.vx = 0;
            striker.vy = 0;
            soundManager.playBuzzer();
            break;
          }
        }
      }

      // Update coins physics
      const coins = coinsRef.current;
      for (const coin of coins) {
        if (coin.isPocketed) continue;

        if (Math.abs(coin.vx) > 0.01 || Math.abs(coin.vy) > 0.01) {
          coin.x += coin.vx;
          coin.y += coin.vy;
          coin.vx *= friction;
          coin.vy *= friction;

          if (Math.abs(coin.vx) < minVelocity) coin.vx = 0;
          if (Math.abs(coin.vy) < minVelocity) coin.vy = 0;
          anyMoving = true;

          // Cushion bounce
          const minBound = 35 + coin.radius;
          const maxBound = BOARD_SIZE - 35 - coin.radius;
          if (coin.x < minBound) {
            coin.x = minBound;
            coin.vx = -coin.vx * 0.8;
          } else if (coin.x > maxBound) {
            coin.x = maxBound;
            coin.vx = -coin.vx * 0.8;
          }
          if (coin.y < minBound) {
            coin.y = minBound;
            coin.vy = -coin.vy * 0.8;
          } else if (coin.y > maxBound) {
            coin.y = maxBound;
            coin.vy = -coin.vy * 0.8;
          }

          // Pocket check for coin
          for (const p of pockets) {
            const dx = coin.x - p.x;
            const dy = coin.y - p.y;
            if (Math.sqrt(dx * dx + dy * dy) < POCKET_RADIUS) {
              coin.isPocketed = true;
              coin.vx = 0;
              coin.vy = 0;
              soundManager.playPocket();
              handleCoinPocketed(coin);
              break;
            }
          }
        }
      }

      // Striker vs Coins Collisions
      if (!striker.isPocketed) {
        for (const coin of coins) {
          if (coin.isPocketed) continue;
          const dx = coin.x - striker.x;
          const dy = coin.y - striker.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const minDist = STRIKER_RADIUS + coin.radius;

          if (dist < minDist && dist > 0) {
            // Collision resolution
            const nx = dx / dist;
            const ny = dy / dist;
            const kx = striker.vx - coin.vx;
            const ky = striker.vy - coin.vy;
            const p = (2 * (nx * kx + ny * ky)) / 1.7; // mass ratio

            striker.vx -= p * nx * 0.55;
            striker.vy -= p * ny * 0.55;
            coin.vx += p * nx * 0.85;
            coin.vy += p * ny * 0.85;

            // Separate overlapping
            const overlap = (minDist - dist) / 2;
            striker.x -= overlap * nx;
            striker.y -= overlap * ny;
            coin.x += overlap * nx;
            coin.y += overlap * ny;

            soundManager.playStrikerHit(Math.sqrt(coin.vx * coin.vx + coin.vy * coin.vy) / 6);
            anyMoving = true;
          }
        }
      }

      // Coin vs Coin Collisions
      for (let i = 0; i < coins.length; i++) {
        const c1 = coins[i];
        if (c1.isPocketed) continue;
        for (let j = i + 1; j < coins.length; j++) {
          const c2 = coins[j];
          if (c2.isPocketed) continue;

          const dx = c2.x - c1.x;
          const dy = c2.y - c1.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const minDist = c1.radius + c2.radius;

          if (dist < minDist && dist > 0) {
            const nx = dx / dist;
            const ny = dy / dist;
            const kx = c1.vx - c2.vx;
            const ky = c1.vy - c2.vy;
            const p = nx * kx + ny * ky;

            c1.vx -= p * nx * 0.9;
            c1.vy -= p * ny * 0.9;
            c2.vx += p * nx * 0.9;
            c2.vy += p * ny * 0.9;

            const overlap = (minDist - dist) / 2;
            c1.x -= overlap * nx;
            c1.y -= overlap * ny;
            c2.x += overlap * nx;
            c2.y += overlap * ny;

            anyMoving = true;
          }
        }
      }

      // State transition when everything stopped moving
      if (coinsMoving && !anyMoving) {
        setCoinsMoving(false);
        endTurn();
      }

      // 2. Canvas Drawing
      ctx.clearRect(0, 0, BOARD_SIZE, BOARD_SIZE);

      // Wooden Frame
      ctx.fillStyle = '#451a03'; // deep mahogany wood
      ctx.fillRect(0, 0, BOARD_SIZE, BOARD_SIZE);

      // Playing Surface (Light Maple Wood)
      ctx.fillStyle = '#fde68a'; // warm amber beige
      ctx.fillRect(30, 30, BOARD_SIZE - 60, BOARD_SIZE - 60);

      // Board Border Inlay Lines
      ctx.strokeStyle = '#92400e';
      ctx.lineWidth = 2;
      ctx.strokeRect(32, 32, BOARD_SIZE - 64, BOARD_SIZE - 64);

      // Pockets (4 Corners)
      for (const p of pockets) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, POCKET_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = '#18181b';
        ctx.fill();
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      // Center Concentric Circles & Star
      const cx = BOARD_SIZE / 2;
      const cy = BOARD_SIZE / 2;

      ctx.beginPath();
      ctx.arc(cx, cy, 55, 0, Math.PI * 2);
      ctx.strokeStyle = '#b45309';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx, cy, 22, 0, Math.PI * 2);
      ctx.fillStyle = '#ef4444'; // Red Queen Base
      ctx.fill();

      // Draw all 4 Baselines (South, East, North, West)
      const activeSide = getSideIndex(currentPlayer, playerCount);
      drawBaselines(ctx, activeSide, playerCount);

      // Draw Coins
      for (const coin of coins) {
        if (coin.isPocketed) continue;
        ctx.save();
        ctx.beginPath();
        ctx.arc(coin.x, coin.y, coin.radius, 0, Math.PI * 2);

        if (coin.type === 'queen') {
          // Red Queen
          const grad = ctx.createRadialGradient(coin.x - 3, coin.y - 3, 2, coin.x, coin.y, coin.radius);
          grad.addColorStop(0, '#f87171');
          grad.addColorStop(1, '#dc2626');
          ctx.fillStyle = grad;
          ctx.fill();
          ctx.strokeStyle = '#991b1b';
          ctx.lineWidth = 2;
          ctx.stroke();

          // Star on Queen
          ctx.fillStyle = '#fef08a';
          ctx.font = '10px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('★', coin.x, coin.y);
        } else if (coin.type === 'white') {
          // White Coin
          const grad = ctx.createRadialGradient(coin.x - 3, coin.y - 3, 2, coin.x, coin.y, coin.radius);
          grad.addColorStop(0, '#ffffff');
          grad.addColorStop(1, '#e2e8f0');
          ctx.fillStyle = grad;
          ctx.fill();
          ctx.strokeStyle = '#94a3b8';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        } else {
          // Black Coin
          const grad = ctx.createRadialGradient(coin.x - 3, coin.y - 3, 2, coin.x, coin.y, coin.radius);
          grad.addColorStop(0, '#52525b');
          grad.addColorStop(1, '#18181b');
          ctx.fillStyle = grad;
          ctx.fill();
          ctx.strokeStyle = '#09090b';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
        ctx.restore();
      }

      // Draw Striker
      if (!striker.isPocketed) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(striker.x, striker.y, STRIKER_RADIUS, 0, Math.PI * 2);
        const sGrad = ctx.createRadialGradient(striker.x - 4, striker.y - 4, 3, striker.x, striker.y, STRIKER_RADIUS);
        sGrad.addColorStop(0, '#fef08a');
        sGrad.addColorStop(1, '#eab308');
        ctx.fillStyle = sGrad;
        ctx.fill();
        ctx.strokeStyle = '#854d0e';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Inner circle mark
        ctx.beginPath();
        ctx.arc(striker.x, striker.y, 7, 0, Math.PI * 2);
        ctx.strokeStyle = '#ca8a04';
        ctx.stroke();
        ctx.restore();
      }

      // Draw Aiming Guide Vector
      if (isAiming && aimStart && aimCurrent) {
        const pullX = aimStart.x - aimCurrent.x;
        const pullY = aimStart.y - aimCurrent.y;
        const pullDist = Math.min(Math.sqrt(pullX * pullX + pullY * pullY), 120);

        if (pullDist > 5) {
          const aimAngle = Math.atan2(pullY, pullX);
          const aimLen = pullDist * 2.2;
          const targetX = striker.x + aimLen * Math.cos(aimAngle);
          const targetY = striker.y + aimLen * Math.sin(aimAngle);

          // Aim line
          ctx.save();
          ctx.beginPath();
          ctx.setLineDash([6, 4]);
          ctx.moveTo(striker.x, striker.y);
          ctx.lineTo(targetX, targetY);
          ctx.strokeStyle = 'rgba(234, 179, 8, 0.9)';
          ctx.lineWidth = 3;
          ctx.stroke();

          // Target circle
          ctx.beginPath();
          ctx.arc(targetX, targetY, 6, 0, Math.PI * 2);
          ctx.fillStyle = '#f59e0b';
          ctx.fill();
          ctx.restore();
        }
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [coinsMoving, isAiming, aimStart, aimCurrent, currentPlayer]);

  // Draw baselines depending on player count (2, 3, or 4)
  const drawBaselines = (ctx: CanvasRenderingContext2D, activeSide: number, count: number) => {
    ctx.lineWidth = 1.5;

    // 0: Bottom baseline (South) - always used
    ctx.strokeStyle = activeSide === 0 ? '#ef4444' : '#b45309';
    ctx.lineWidth = activeSide === 0 ? 2.5 : 1.5;
    ctx.strokeRect(100, 485, 400, 30);
    ctx.beginPath();
    ctx.arc(100, 500, 15, 0, Math.PI * 2);
    ctx.arc(500, 500, 15, 0, Math.PI * 2);
    ctx.fillStyle = '#ef4444';
    ctx.fill();
    ctx.stroke();

    // 1: Right baseline (East) - only drawn for 3 or 4 players
    if (count >= 3) {
      ctx.strokeStyle = activeSide === 1 ? '#f59e0b' : '#b45309';
      ctx.lineWidth = activeSide === 1 ? 2.5 : 1.5;
      ctx.strokeRect(485, 100, 30, 400);
      ctx.beginPath();
      ctx.arc(500, 100, 15, 0, Math.PI * 2);
      ctx.arc(500, 500, 15, 0, Math.PI * 2);
      ctx.fillStyle = '#f59e0b';
      ctx.fill();
      ctx.stroke();
    }

    // 2: Top baseline (North) - drawn for 2, 3, 4 players
    ctx.strokeStyle = activeSide === 2 ? '#10b981' : '#b45309';
    ctx.lineWidth = activeSide === 2 ? 2.5 : 1.5;
    ctx.strokeRect(100, 85, 400, 30);
    ctx.beginPath();
    ctx.arc(100, 100, 15, 0, Math.PI * 2);
    ctx.arc(500, 100, 15, 0, Math.PI * 2);
    ctx.fillStyle = '#10b981';
    ctx.fill();
    ctx.stroke();

    // 3: Left baseline (West) - only drawn for 4 players
    if (count === 4) {
      ctx.strokeStyle = activeSide === 3 ? '#3b82f6' : '#b45309';
      ctx.lineWidth = activeSide === 3 ? 2.5 : 1.5;
      ctx.strokeRect(85, 100, 30, 400);
      ctx.beginPath();
      ctx.arc(100, 100, 15, 0, Math.PI * 2);
      ctx.arc(100, 500, 15, 0, Math.PI * 2);
      ctx.fillStyle = '#3b82f6';
      ctx.fill();
      ctx.stroke();
    }
  };

  const handleCoinPocketed = (coin: Coin) => {
    let pts = 0;
    if (coin.type === 'white') pts = 10;
    else if (coin.type === 'black') pts = 5;
    else if (coin.type === 'queen') {
      pts = 25;
      setQueenCoverPending(currentPlayer);
      setGameMessage(`أحسنت! أدخلت الملكة (25 نقطة). عليك تغطيتها بحبة أخرى!`);
    }

    setScores((prev) => {
      const next = [...prev];
      next[currentPlayer] = (next[currentPlayer] || 0) + pts;
      return next;
    });
  };

  const endTurn = () => {
    // If striker was pocketed, penalize!
    if (strikerRef.current.isPocketed) {
      setScores((prev) => {
        const next = [...prev];
        next[currentPlayer] = Math.max(0, (next[currentPlayer] || 0) - 5);
        return next;
      });
      setGameMessage('خطأ! سقط المضرب في الجيب (خصم 5 نقاط)');
    }

    // Check if all coins are pocketed
    const remainingCoins = coinsRef.current.filter((c) => !c.isPocketed);
    if (remainingCoins.length === 0) {
      // Find highest score
      let maxScore = -1;
      let winIdx = 0;
      scores.forEach((s, idx) => {
        if (s > maxScore) {
          maxScore = s;
          winIdx = idx;
        }
      });
      setWinner(winIdx);
      triggerConfetti();
      soundManager.playFanfare();
      return;
    }

    // Rotate turn between the active players
    const nextP = (currentPlayer + 1) % playerCount;
    setCurrentPlayer(nextP);
    const nextSide = getSideIndex(nextP, playerCount);
    setStrikerPos(300);
    updateStrikerBaselinePosition(nextSide, 300);
    strikerRef.current.vx = 0;
    strikerRef.current.vy = 0;
    strikerRef.current.isPocketed = false;

    const nextName = activePlayers[nextP]?.name || `اللاعب ${nextP + 1}`;
    setGameMessage(`دور [${nextName}] (${CARROM_SIDES[nextSide].label})! صوّب المضرب`);
  };

  // Touch & Mouse handlers for Aiming
  const getCanvasCoords = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const scaleX = BOARD_SIZE / rect.width;
    const scaleY = BOARD_SIZE / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (coinsMoving || winner !== null) return;
    const coords = getCanvasCoords(e);
    if (!coords) return;

    // Check proximity to striker
    const striker = strikerRef.current;
    const dx = coords.x - striker.x;
    const dy = coords.y - striker.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < STRIKER_RADIUS * 2.8) {
      setIsAiming(true);
      setAimStart(coords);
      setAimCurrent(coords);
    }
  };

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isAiming) return;
    const coords = getCanvasCoords(e);
    if (coords) {
      setAimCurrent(coords);
    }
  };

  const handlePointerUp = () => {
    if (!isAiming || !aimStart || !aimCurrent) {
      setIsAiming(false);
      return;
    }

    const pullX = aimStart.x - aimCurrent.x;
    const pullY = aimStart.y - aimCurrent.y;
    const pullDist = Math.sqrt(pullX * pullX + pullY * pullY);

    if (pullDist > 8) {
      // Release strike!
      const power = Math.min(pullDist / 6, 18);
      const angle = Math.atan2(pullY, pullX);

      strikerRef.current.vx = power * Math.cos(angle);
      strikerRef.current.vy = power * Math.sin(angle);
      setCoinsMoving(true);
      soundManager.playStrikerHit(power / 10);
    }

    setIsAiming(false);
    setAimStart(null);
    setAimCurrent(null);
  };

  const handleSelectPlayerCount = (cnt: number) => {
    soundManager.playClick();
    setPlayerCount(cnt);
    setCurrentPlayer(0);
    setScores(new Array(cnt).fill(0));
    setWinner(null);
    initBoard();
    const side = getSideIndex(0, cnt);
    updateStrikerBaselinePosition(side, 300);
    setStrikerPos(300);
  };

  const currentSide = getSideIndex(currentPlayer, playerCount);
  const isHorizontalBaseline = currentSide === 0 || currentSide === 2;

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
            <h2 className="text-lg sm:text-xl font-black text-amber-400">لعبة كيرم (Carrom)</h2>
            <p className="text-xs text-stone-400 hidden sm:block">طاولة خشبية تفاعلية بفيزياء تصادم حقيقية (2 أو 3 أو 4 لاعبين)</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Player Count Selector */}
          <div className="flex items-center bg-stone-950 p-1 rounded-xl border border-stone-800">
            <span className="text-xs text-stone-400 px-2 flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">عدد اللاعبين:</span>
            </span>
            {[2, 3, 4].map((cnt) => (
              <button
                key={cnt}
                onClick={() => handleSelectPlayerCount(cnt)}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                  playerCount === cnt
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
            title="طريقة لعب الكيرم"
            className="p-2 text-stone-400 hover:text-white bg-stone-800 hover:bg-stone-700 rounded-xl transition-colors cursor-pointer"
          >
            <Info className="w-4 h-4" />
          </button>
          <button
            onClick={initBoard}
            title="إعادة ترتيب الطاولة"
            className="p-2 text-stone-400 hover:text-white bg-stone-800 hover:bg-stone-700 rounded-xl transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quick In-Game Player Names Bar */}
      <div className="w-full bg-stone-900/90 border border-stone-800 rounded-2xl p-3 mb-4 flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs font-black text-stone-300 flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-amber-400" />
          <span>اللاعبون ({playerCount} لاعبين - اضغط لتعديل أسمائكم):</span>
        </span>
        <div className="flex flex-wrap items-center gap-2.5">
          {activePlayers.map((p, idx) => {
            const sideIdx = getSideIndex(idx, playerCount);
            return (
              <div
                key={p.id}
                className={`flex items-center gap-1.5 bg-stone-950 px-2.5 py-1.5 rounded-xl border transition-all ${
                  currentPlayer === idx ? 'border-amber-400 ring-2 ring-amber-400/30' : 'border-stone-800'
                }`}
              >
                <span className={`w-2.5 h-2.5 rounded-full ${CARROM_SIDES[sideIdx].bg}`} />
                <span className="text-[11px] text-stone-500 font-bold">{CARROM_SIDES[sideIdx].label.split(' ')[0]}:</span>
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
        {/* Left Side: Scoreboard & Striker Position Slider (Lg: 4 cols) */}
        <div className="lg:col-span-4 w-full flex flex-col gap-4 order-2 lg:order-1">
          {/* Scoreboard */}
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 text-center shadow-lg">
            <span className="text-xs font-bold text-stone-400">نتائج اللاعبين ({playerCount} لاعبين)</span>
            <div className={`grid ${playerCount === 2 ? 'grid-cols-2' : playerCount === 3 ? 'grid-cols-3' : 'grid-cols-2'} gap-2.5 mt-3`}>
              {activePlayers.map((p, idx) => {
                const isCurrent = currentPlayer === idx;
                const sideIdx = getSideIndex(idx, playerCount);
                return (
                  <div
                    key={p.id}
                    className={`p-2.5 rounded-xl border text-right transition-all ${
                      isCurrent
                        ? 'bg-amber-950/70 border-amber-400 shadow-md ring-1 ring-amber-400/40'
                        : 'bg-stone-950 border-stone-850'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-stone-300 truncate max-w-[85px]">{p.name || `اللاعب ${idx + 1}`}</span>
                      <span className={`text-[10px] font-black ${CARROM_SIDES[sideIdx].color}`}>
                        {CARROM_SIDES[sideIdx].label.split(' ')[0]}
                      </span>
                    </div>
                    <div className="text-xl font-black text-amber-400 mt-1 tabular-nums">{scores[idx] || 0}</div>
                  </div>
                );
              })}
            </div>

            <div className="mt-3.5 p-2.5 bg-stone-950 rounded-xl border border-stone-800 text-xs font-medium text-stone-200">
              {gameMessage}
            </div>
          </div>

          {/* Striker Slider Control */}
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 shadow-lg">
            <div className="flex items-center justify-between text-xs font-bold text-stone-300 mb-2">
              <span>
                موضع المضرب على {CARROM_SIDES[currentSide].label} ({isHorizontalBaseline ? 'أفقياً' : 'عمودياً'}):
              </span>
              <span className="text-amber-400">{Math.round(strikerPos)}</span>
            </div>
            <input
              type="range"
              min="140"
              max="460"
              value={strikerPos}
              disabled={coinsMoving || isAiming}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                setStrikerPos(val);
                updateStrikerBaselinePosition(currentSide, val);
              }}
              className="w-full accent-amber-500 cursor-pointer h-2.5 bg-stone-950 rounded-lg"
            />
            <p className="text-[11px] text-stone-500 mt-2 leading-relaxed">
              حرّك المؤشر لاختيار موضع المضرب على خطك، ثم اضغط على المضرب واسحب للخلف للإطلاق.
            </p>
          </div>

          {/* Points Reference */}
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-3.5 text-xs">
            <h4 className="font-bold text-stone-300 mb-2">قيمة الحبات:</h4>
            <div className="flex items-center justify-around text-center">
              <div>
                <div className="w-5 h-5 rounded-full bg-white border border-stone-400 mx-auto mb-1" />
                <span className="text-stone-300 font-bold">بيضاء = 10</span>
              </div>
              <div>
                <div className="w-5 h-5 rounded-full bg-stone-900 border border-stone-700 mx-auto mb-1" />
                <span className="text-stone-300 font-bold">سوداء = 5</span>
              </div>
              <div>
                <div className="w-5 h-5 rounded-full bg-red-600 border border-red-400 mx-auto mb-1 flex items-center justify-center text-[8px] text-white">★</div>
                <span className="text-red-400 font-black">الملكة = 25</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Interactive HTML5 Canvas Carrom Board (Lg: 8 cols) */}
        <div className="lg:col-span-8 w-full flex justify-center order-1 lg:order-2">
          <div className="relative w-full max-w-[540px] aspect-square rounded-3xl overflow-hidden shadow-2xl border-4 border-amber-950/80 bg-stone-950 touch-none">
            <canvas
              ref={canvasRef}
              width={BOARD_SIZE}
              height={BOARD_SIZE}
              onMouseDown={handlePointerDown}
              onMouseMove={handlePointerMove}
              onMouseUp={handlePointerUp}
              onTouchStart={handlePointerDown}
              onTouchMove={handlePointerMove}
              onTouchEnd={handlePointerUp}
              className="w-full h-full cursor-crosshair"
            />
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
            <h3 className="text-2xl font-black text-amber-400 mb-2">أستاذ الكيرم! 🎯</h3>
            <p className="text-lg font-bold text-stone-100 mb-2">
              فاز اللاعب [{activePlayers[winner]?.name || `اللاعب ${winner + 1}`}] بمجموع {scores[winner]} نقطة!
            </p>
            <div className="flex gap-3 mt-6">
              <button
                onClick={initBoard}
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
