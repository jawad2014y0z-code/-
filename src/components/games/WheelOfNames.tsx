import React, { useState, useEffect, useRef } from 'react';
import { Player } from '../../types/game';
import { soundManager } from '../../utils/audio';
import { triggerConfetti } from '../../utils/confetti';
import { Dice5, Sparkles, UserPlus, Volume2, Trophy, RotateCcw, ArrowRight } from 'lucide-react';

interface WheelOfNamesProps {
  players: Player[];
  onWinnerSelected: (player: Player) => void;
  onProceedToChallenge: (player: Player) => void;
}

const SECTOR_COLORS = [
  '#ef4444', // Red
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#3b82f6', // Blue
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#14b8a6', // Teal
  '#f97316', // Orange
];

export const WheelOfNames: React.FC<WheelOfNamesProps> = ({
  players,
  onWinnerSelected,
  onProceedToChallenge,
}) => {
  // Wheel items (can toggle active/inactive or add quick name)
  const [wheelPlayers, setWheelPlayers] = useState<Player[]>(players);
  const [rotationAngle, setRotationAngle] = useState<number>(0);
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [selectedWinner, setSelectedWinner] = useState<Player | null>(null);
  const [newQuickName, setNewQuickName] = useState<string>('');
  const [showAddQuick, setShowAddQuick] = useState<boolean>(false);

  const lastTickSliceRef = useRef<number>(-1);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    setWheelPlayers(players);
  }, [players]);

  const activeCount = wheelPlayers.length;
  const sliceAngle = 360 / (activeCount || 1);

  // Helper to calculate SVG wedge path
  const createSlicePath = (index: number, total: number, radius: number, cx: number, cy: number) => {
    const startDeg = index * (360 / total);
    const endDeg = (index + 1) * (360 / total);

    const startRad = (startDeg * Math.PI) / 180;
    const endRad = (endDeg * Math.PI) / 180;

    const x1 = cx + radius * Math.cos(startRad);
    const y1 = cy + radius * Math.sin(startRad);
    const x2 = cx + radius * Math.cos(endRad);
    const y2 = cy + radius * Math.sin(endRad);

    const largeArc = endDeg - startDeg > 180 ? 1 : 0;

    return `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
  };

  // Spin the Wheel with physics & audio ticking
  const handleSpin = () => {
    if (isSpinning || wheelPlayers.length === 0) return;

    soundManager.playDrumRoll();
    setIsSpinning(true);
    setSelectedWinner(null);

    // Pick random winner index
    const winnerIdx = Math.floor(Math.random() * wheelPlayers.length);
    const chosenPlayer = wheelPlayers[winnerIdx];

    // Pointer needle is at top (270° in standard Cartesian, or 0° at top in CSS rotation)
    // In CSS rotate: top needle points down at angle = (270 - midAngle) mod 360
    const sliceCenterDeg = winnerIdx * sliceAngle + sliceAngle / 2;
    // We want the winner wedge center to stop under the top pointer (at 270 deg)
    const targetStopOffset = (270 - sliceCenterDeg + 360) % 360;

    // Add 5 to 7 full rotations (1800° - 2520°) for suspense
    const extraSpins = 360 * (5 + Math.floor(Math.random() * 3));
    const currentBase = Math.floor(rotationAngle / 360) * 360;
    const finalAngle = currentBase + extraSpins + targetStopOffset;

    setRotationAngle(finalAngle);

    // Ticking audio simulation during deceleration
    const spinDuration = 3500; // ms
    const startTime = Date.now();

    const checkTick = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed < spinDuration) {
        // Easing progress (cubic-bezier approximation)
        const t = elapsed / spinDuration;
        const eased = 1 - Math.pow(1 - t, 3);
        const currentRot = rotationAngle + (finalAngle - rotationAngle) * eased;
        const currentSlice = Math.floor((currentRot % 360) / sliceAngle);

        if (currentSlice !== lastTickSliceRef.current) {
          lastTickSliceRef.current = currentSlice;
          soundManager.playTick();
        }
        animFrameRef.current = requestAnimationFrame(checkTick);
      }
    };
    animFrameRef.current = requestAnimationFrame(checkTick);

    // When spin completes
    setTimeout(() => {
      setIsSpinning(false);
      setSelectedWinner(chosenPlayer);
      triggerConfetti();
      soundManager.playApplause();
      onWinnerSelected(chosenPlayer);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    }, spinDuration + 100);
  };

  // Add quick name to the wheel
  const handleAddQuickName = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newQuickName.trim();
    if (!clean) return;

    soundManager.playClick();
    const newP: Player = {
      id: `p_quick_${Date.now()}`,
      name: clean,
      avatar: '🎯',
      color: SECTOR_COLORS[wheelPlayers.length % SECTOR_COLORS.length],
    };
    setWheelPlayers((prev) => [...prev, newP]);
    setNewQuickName('');
    setShowAddQuick(false);
  };

  // Remove player from wheel
  const handleRemoveFromWheel = (id: string) => {
    if (wheelPlayers.length <= 2) return;
    soundManager.playClick();
    setWheelPlayers((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <div className="w-full flex flex-col items-center gap-6 animate-in zoom-in-95 duration-200">
      {/* Title */}
      <div className="text-center space-y-1">
        <h3 className="text-2xl sm:text-3xl font-black text-white flex items-center justify-center gap-2">
          <span>عجلة الأسماء (Wheel of Names)</span>
          <span className="text-2xl animate-spin">🎡</span>
        </h3>
        <p className="text-xs text-stone-400">
          لف العجلة لتحديد ضحية التحدي القادم بالعدل والحظ!
        </p>
      </div>

      {/* The Wheel Container */}
      <div className="relative w-80 h-80 sm:w-96 sm:h-96 flex items-center justify-center">
        {/* Top Needle Pointer (Arrow pointing down into winning wedge) */}
        <div className="absolute -top-3 z-30 flex flex-col items-center filter drop-shadow-lg">
          <div className="w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-t-[28px] border-t-amber-400" />
          <div className="w-3.5 h-3.5 rounded-full bg-white -mt-5 border-2 border-amber-600 shadow-md" />
        </div>

        {/* Outer Decorative Ring */}
        <div className="absolute inset-0 rounded-full border-8 border-stone-800 shadow-2xl bg-stone-950 pointer-events-none" />

        {/* Spinning SVG Wheel */}
        <svg
          className="w-full h-full rounded-full transition-transform"
          style={{
            transform: `rotate(${rotationAngle}deg)`,
            transitionDuration: isSpinning ? '3.5s' : '0s',
            transitionTimingFunction: 'cubic-bezier(0.12, 0.8, 0.32, 1)',
          }}
          viewBox="0 0 400 400"
        >
          {wheelPlayers.map((player, idx) => {
            const midAngle = idx * sliceAngle + sliceAngle / 2;
            const midRad = (midAngle * Math.PI) / 180;
            const textRadius = 135;
            const textX = 200 + textRadius * Math.cos(midRad);
            const textY = 200 + textRadius * Math.sin(midRad);
            const color = SECTOR_COLORS[idx % SECTOR_COLORS.length];

            return (
              <g key={player.id}>
                {/* Wedge slice */}
                <path
                  d={createSlicePath(idx, wheelPlayers.length, 192, 200, 200)}
                  fill={color}
                  stroke="#1c1917"
                  strokeWidth="2.5"
                  className="transition-opacity hover:opacity-90"
                />

                {/* Player Label along slice */}
                <g transform={`translate(${textX}, ${textY}) rotate(${midAngle + 180})`}>
                  <text
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#ffffff"
                    fontSize="13"
                    fontWeight="900"
                    fontFamily="Cairo, sans-serif"
                    className="select-none filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
                  >
                    {player.name} {player.avatar}
                  </text>
                </g>
              </g>
            );
          })}
        </svg>

        {/* Center Interactive Hub / Spin Trigger */}
        <button
          type="button"
          onClick={handleSpin}
          disabled={isSpinning}
          className="absolute z-20 w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-amber-300 via-amber-500 to-amber-600 hover:from-amber-200 hover:to-amber-400 text-stone-950 font-black text-xs sm:text-sm flex flex-col items-center justify-center shadow-2xl border-4 border-stone-900 cursor-pointer active:scale-95 transition-all disabled:opacity-80"
          title="انقر لتدوير العجلة"
        >
          <span className="text-xl sm:text-2xl leading-none">🎲</span>
          <span className="font-black text-[11px] sm:text-xs mt-0.5">
            {isSpinning ? 'تدور...' : 'لَف الآن'}
          </span>
        </button>
      </div>

      {/* Winner Announcement Box */}
      {selectedWinner && !isSpinning && (
        <div className="w-full max-w-md p-4 bg-gradient-to-r from-amber-950/60 via-stone-900 to-amber-950/60 border-2 border-amber-500 rounded-3xl text-center space-y-2 shadow-2xl animate-in zoom-in-95 duration-200">
          <span className="text-xs font-black text-amber-400 uppercase tracking-widest block">
            🎯 وقع الاختيار بالقرعة على:
          </span>
          <div className="flex items-center justify-center gap-3">
            <span className="text-4xl animate-bounce">{selectedWinner.avatar}</span>
            <span className="text-2xl font-black text-white">{selectedWinner.name}</span>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={() => onProceedToChallenge(selectedWinner)}
              className="flex-1 py-3 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-stone-950 font-black text-xs sm:text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>بدء التحدي لـ {selectedWinner.name}! 🔥</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={handleSpin}
              className="px-3.5 py-3 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-xs font-bold border border-stone-700 transition-colors flex items-center gap-1 cursor-pointer"
              title="إعادة التدوير"
            >
              <RotateCcw className="w-4 h-4" />
              <span>إعادة</span>
            </button>
          </div>
        </div>
      )}

      {/* Action Controls & Players Chips */}
      <div className="w-full max-w-lg space-y-3">
        <div className="flex items-center justify-between text-xs text-stone-400 px-1">
          <span className="font-bold">المشاركون بالعجلة ({wheelPlayers.length} لاعبين):</span>
          <button
            onClick={() => setShowAddQuick(!showAddQuick)}
            className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 text-[11px] cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>إضافة اسم للعجلة</span>
          </button>
        </div>

        {/* Quick Add Form */}
        {showAddQuick && (
          <form
            onSubmit={handleAddQuickName}
            className="flex gap-2 p-2 bg-stone-950 rounded-2xl border border-stone-800 animate-in fade-in"
          >
            <input
              type="text"
              value={newQuickName}
              onChange={(e) => setNewQuickName(e.target.value)}
              placeholder="اكتب اسم اللاعب الجديد..."
              className="flex-1 bg-stone-900 border border-stone-750 focus:border-amber-400 rounded-xl px-3 py-1.5 text-xs text-stone-100 placeholder-stone-600 outline-none"
              autoFocus
            />
            <button
              type="submit"
              disabled={!newQuickName.trim()}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-950 font-black text-xs rounded-xl shadow-md cursor-pointer"
            >
              إضافة ➕
            </button>
          </form>
        )}

        {/* Chips list */}
        <div className="flex flex-wrap gap-2 justify-center">
          {wheelPlayers.map((p, idx) => (
            <div
              key={p.id}
              className="px-3 py-1.5 bg-stone-950 rounded-xl border border-stone-800 flex items-center gap-2 text-xs text-stone-200 shadow-sm"
            >
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: SECTOR_COLORS[idx % SECTOR_COLORS.length] }}
              />
              <span>{p.avatar}</span>
              <span className="font-black">{p.name}</span>
              {wheelPlayers.length > 2 && (
                <button
                  onClick={() => handleRemoveFromWheel(p.id)}
                  className="text-stone-600 hover:text-red-400 mr-1 text-[11px] cursor-pointer"
                  title="استبعاد مؤقت من العجلة"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
