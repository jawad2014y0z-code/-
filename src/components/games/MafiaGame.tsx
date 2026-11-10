import React, { useState } from 'react';
import { Player } from '../../types/game';
import { soundManager } from '../../utils/audio';
import { triggerConfetti } from '../../utils/confetti';
import { Moon, Sun, Skull, Shield, Search, Users, Trophy, Play, Info, Eye, EyeOff, RotateCcw } from 'lucide-react';

export type RoleType = 'mafia' | 'doctor' | 'detective' | 'citizen';

export interface MafiaPlayer {
  id: string;
  name: string;
  role: RoleType;
  isAlive: boolean;
  avatar: string;
}

const ROLE_INFO: Record<RoleType, { title: string; color: string; desc: string; icon: string }> = {
  mafia: {
    title: 'المافيا 🔫',
    color: 'text-red-500',
    desc: 'تتآمر في ظلام الليل وتختار ضحية لقتلها. هدفك القضاء على مواطني المدينة.',
    icon: '🔫',
  },
  doctor: {
    title: 'الدكتور 💉',
    color: 'text-emerald-400',
    desc: 'تستيقظ ليلاً وتختار شخصاً واحداً لحمايته من رصاصة المافيا.',
    icon: '💉',
  },
  detective: {
    title: 'المحقق 🔍',
    color: 'text-blue-400',
    desc: 'تستيقظ ليلاً لاختيار أحد اللاعبين سراً في تحقيقاتك.',
    icon: '🔍',
  },
  citizen: {
    title: 'مواطن بريء 🛡️',
    color: 'text-amber-300',
    desc: 'لا تملك قوى ليلية، لكن صوتك في محاكمة النهار هو سلاحك لكشف المافيا!',
    icon: '🛡️',
  },
};

interface MafiaGameProps {
  players: Player[];
  onBack: () => void;
  onOpenRules: () => void;
  onUpdatePlayerName?: (id: string, name: string) => void;
}

type MafiaStage = 'SETUP' | 'REVEAL' | 'NIGHT_MAFIA' | 'NIGHT_DOCTOR' | 'NIGHT_DETECTIVE' | 'DAY_ANNOUNCE' | 'DAY_TRIAL' | 'GAME_OVER';

export const MafiaGame: React.FC<MafiaGameProps> = ({ players, onBack, onOpenRules, onUpdatePlayerName }) => {
  const [stage, setStage] = useState<MafiaStage>('SETUP');
  const [mafiaPlayers, setMafiaPlayers] = useState<MafiaPlayer[]>([]);
  const [revealIndex, setRevealIndex] = useState<number>(0);
  const [isRoleVisible, setIsRoleVisible] = useState<boolean>(false);

  // Night action choices
  const [numPlayers, setNumPlayers] = useState<number>(() => {
    return Math.min(Math.max(players.length, 4), 8);
  });
  const [mafiaTargetId, setMafiaTargetId] = useState<string | null>(null);
  const [doctorTargetId, setDoctorTargetId] = useState<string | null>(null);
  const [detectiveTargetId, setDetectiveTargetId] = useState<string | null>(null);
  const [detectiveResult, setDetectiveResult] = useState<string | null>(null);

  // Day states
  const [killedThisNight, setKilledThisNight] = useState<MafiaPlayer | null>(null);
  const [winnerTeam, setWinnerTeam] = useState<'citizens' | 'mafia' | null>(null);
  const [trialVoteTarget, setTrialVoteTarget] = useState<string | null>(null);

  // Setup roles
  const startGame = () => {
    soundManager.playClick();
    const count = numPlayers;
    const names: string[] = [];
    for (let i = 0; i < count; i++) {
      names.push(players[i]?.name || `اللاعب ${i + 1}`);
    }

    // Distribution:
    // 4-5 players: 1 Mafia, 1 Doctor, 1 Detective, Rest Citizens
    // 6-8 players: 2 Mafia, 1 Doctor, 1 Detective, Rest Citizens
    const numMafia = count >= 6 ? 2 : 1;
    const roles: RoleType[] = [];
    for (let i = 0; i < numMafia; i++) roles.push('mafia');
    roles.push('doctor');
    roles.push('detective');
    while (roles.length < count) {
      roles.push('citizen');
    }

    // Shuffle roles
    const shuffledRoles = [...roles].sort(() => 0.5 - Math.random());

    const created: MafiaPlayer[] = names.map((name, idx) => ({
      id: `p-${idx}`,
      name,
      role: shuffledRoles[idx],
      isAlive: true,
      avatar: players[idx]?.avatar || '👤',
    }));

    setMafiaPlayers(created);
    setRevealIndex(0);
    setIsRoleVisible(false);
    setStage('REVEAL');
    setMafiaTargetId(null);
    setDoctorTargetId(null);
    setDetectiveTargetId(null);
    setDetectiveResult(null);
    setKilledThisNight(null);
    setWinnerTeam(null);
  };

  const handleNextReveal = () => {
    soundManager.playClick();
    setIsRoleVisible(false);
    if (revealIndex + 1 < mafiaPlayers.length) {
      setRevealIndex(revealIndex + 1);
    } else {
      // Done revealing! Begin Night phase!
      soundManager.playNightBell();
      setStage('NIGHT_MAFIA');
    }
  };

  const handleMafiaSelectTarget = (targetId: string) => {
    soundManager.playClick();
    setMafiaTargetId(targetId);
  };

  const handleMafiaConfirm = () => {
    soundManager.playClick();
    soundManager.playNightBell();
    // Next step: Doctor
    const doctorAlive = mafiaPlayers.some((p) => p.role === 'doctor' && p.isAlive);
    if (doctorAlive) {
      setStage('NIGHT_DOCTOR');
    } else {
      checkDetectiveStep();
    }
  };

  const handleDoctorConfirm = () => {
    soundManager.playClick();
    soundManager.playNightBell();
    checkDetectiveStep();
  };

  const checkDetectiveStep = () => {
    const detectiveAlive = mafiaPlayers.some((p) => p.role === 'detective' && p.isAlive);
    if (detectiveAlive) {
      setStage('NIGHT_DETECTIVE');
    } else {
      resolveNight();
    }
  };

  const handleDetectiveInvestigate = (targetId: string) => {
    soundManager.playClick();
    setDetectiveTargetId(targetId);
  };

  const resolveNight = () => {
    soundManager.playFanfare();
    let victim: MafiaPlayer | null = null;

    if (mafiaTargetId && mafiaTargetId !== doctorTargetId) {
      // Victim died
      victim = mafiaPlayers.find((p) => p.id === mafiaTargetId) || null;
      if (victim) {
        soundManager.playCapture();
      }
    }

    const updated = mafiaPlayers.map((p) => {
      if (victim && p.id === victim.id) {
        return { ...p, isAlive: false };
      }
      return p;
    });

    setMafiaPlayers(updated);
    setKilledThisNight(victim);
    setStage('DAY_ANNOUNCE');

    checkVictory(updated);
  };

  const handleExecuteTrial = (targetId: string) => {
    soundManager.playClick();
    soundManager.playBuzzer();
    const updated = mafiaPlayers.map((p) => (p.id === targetId ? { ...p, isAlive: false } : p));
    setMafiaPlayers(updated);
    setTrialVoteTarget(null);

    const executed = mafiaPlayers.find((p) => p.id === targetId);

    // Check victory
    if (!checkVictory(updated)) {
      // Continue to next night!
      setStage('NIGHT_MAFIA');
      setMafiaTargetId(null);
      setDoctorTargetId(null);
      setDetectiveTargetId(null);
      setDetectiveResult(null);
      soundManager.playNightBell();
    }
  };

  const checkVictory = (currentPlayers: MafiaPlayer[]): boolean => {
    const aliveMafia = currentPlayers.filter((p) => p.role === 'mafia' && p.isAlive).length;
    const aliveTown = currentPlayers.filter((p) => p.role !== 'mafia' && p.isAlive).length;

    if (aliveMafia === 0) {
      setWinnerTeam('citizens');
      setStage('GAME_OVER');
      triggerConfetti();
      soundManager.playFanfare();
      return true;
    }
    if (aliveMafia >= aliveTown) {
      setWinnerTeam('mafia');
      setStage('GAME_OVER');
      triggerConfetti();
      soundManager.playFanfare();
      return true;
    }
    return false;
  };

  const alivePlayers = mafiaPlayers.filter((p) => p.isAlive);

  return (
    <div className="w-full max-w-4xl mx-auto px-3 sm:px-6 py-4 flex flex-col items-center">
      {/* Top Header */}
      <div className="w-full flex items-center justify-between gap-4 mb-4 bg-stone-900/80 p-3 sm:p-4 rounded-2xl border border-stone-800">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="px-3.5 py-1.5 text-xs sm:text-sm font-semibold bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl transition-colors shrink-0"
          >
            ← القائمة الرئيسية
          </button>
          <div>
            <h2 className="text-lg sm:text-xl font-black text-amber-400">لعبة المافيا (Mafia)</h2>
            <p className="text-xs text-stone-400 hidden sm:block">مع راوي إلكتروني ذكي يدير الجلسة تلقائياً (4 إلى 8 لاعبين)</p>
          </div>
        </div>

        <button
          onClick={onOpenRules}
          title="شرح أدوار المافيا"
          className="p-2 text-stone-400 hover:text-white bg-stone-800 hover:bg-stone-700 rounded-xl transition-colors"
        >
          <Info className="w-4 h-4" />
        </button>
      </div>

      {/* STAGE 1: SETUP */}
      {stage === 'SETUP' && (
        <div className="w-full max-w-2xl bg-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-8 flex flex-col gap-6 shadow-2xl">
          <div>
            <h3 className="text-xl font-black text-stone-100 mb-1">إعداد جلسة المافيا</h3>
            <p className="text-xs text-stone-400">توزيع سري للأدوار وإدارة آلية بالكامل للنهار والليل دون الحاجة لراوي خارج اللعبة!</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.entries(ROLE_INFO).map(([key, info]) => (
              <div key={key} className="bg-stone-950 p-3 rounded-2xl border border-stone-800 text-center">
                <span className="text-2xl block mb-1">{info.icon}</span>
                <span className="text-xs font-black text-stone-200 block mb-1">{info.title}</span>
                <p className="text-[10px] text-stone-500 leading-tight">{info.desc}</p>
              </div>
            ))}
          </div>

          {/* Number of players selector */}
          <div className="bg-stone-950 p-4 rounded-2xl border border-stone-800">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <span className="text-xs font-bold text-stone-300 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-red-500" />
                <span>اختر عدد اللاعبين في الجلسة:</span>
              </span>
              <div className="flex items-center gap-1.5 bg-stone-900 p-1 rounded-xl border border-stone-800">
                {[4, 5, 6, 7, 8].map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => {
                      soundManager.playClick();
                      setNumPlayers(count);
                    }}
                    className={`px-3 py-1 text-xs font-black rounded-lg transition-all ${
                      numPlayers === count
                        ? 'bg-red-600 text-white shadow-md'
                        : 'text-stone-400 hover:text-white hover:bg-stone-800'
                    }`}
                  >
                    {count} لاعبين
                  </button>
                ))}
              </div>
            </div>
            <p className="text-[11px] text-stone-500">
              {numPlayers < 6
                ? `تشكيلة الجلسة لـ ${numPlayers} لاعبين: 1 مافيا، 1 دكتور، 1 محقق، و${numPlayers - 3} مواطنين.`
                : `تشكيلة الجلسة لـ ${numPlayers} لاعبين: 2 مافيا، 1 دكتور، 1 محقق، و${numPlayers - 4} مواطنين.`}
            </p>
          </div>

          <div className="bg-stone-950 p-4 rounded-2xl border border-stone-800">
            <span className="text-xs font-bold text-stone-400 block mb-2">
              أسماء اللاعبين الـ {numPlayers} (عدّل أسماء الحاضرين):
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {Array.from({ length: numPlayers }).map((_, i) => {
                const playerObj = players[i];
                const displayName = playerObj?.name || `اللاعب ${i + 1}`;
                const avatar = playerObj?.avatar || '👤';
                const playerId = playerObj?.id || `p-${i}`;

                return (
                  <div key={playerId} className="flex items-center gap-2 p-2 bg-stone-900 rounded-xl border border-stone-800">
                    <span className="text-sm">{avatar}</span>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => {
                        if (playerObj && onUpdatePlayerName) {
                          onUpdatePlayerName(playerObj.id, e.target.value);
                        }
                      }}
                      className="flex-1 bg-transparent border-none text-xs font-bold text-stone-200 focus:outline-none"
                      placeholder={`اللاعب ${i + 1}`}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <button
            onClick={startGame}
            className="w-full py-3.5 bg-red-600 hover:bg-red-500 text-white font-black text-base rounded-2xl shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Moon className="w-5 h-5" />
            بدء اللعبة وتوزيع الأدوار سراً
          </button>
        </div>
      )}

      {/* STAGE 2: PASS & REVEAL ROLE */}
      {stage === 'REVEAL' && (
        <div className="w-full max-w-md bg-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-8 flex flex-col items-center text-center shadow-2xl">
          <span className="text-xs font-bold text-stone-500 mb-2">
            اللاعب ({revealIndex + 1} من {mafiaPlayers.length})
          </span>
          <h3 className="text-2xl font-black text-amber-400 mb-1">
            مرر الجوال إلى {mafiaPlayers[revealIndex].name}
          </h3>
          <p className="text-xs text-stone-400 mb-6">
            انظر لدورك في سرية تامة ولا تظهره لأحد!
          </p>

          <div className="w-full min-h-[190px] bg-stone-950 border-2 border-dashed border-stone-800 rounded-2xl p-5 flex flex-col items-center justify-center mb-6">
            {isRoleVisible ? (
              <div className="animate-in fade-in zoom-in-95 duration-200">
                <span className="text-4xl block mb-2">{ROLE_INFO[mafiaPlayers[revealIndex].role].icon}</span>
                <h4 className={`text-2xl font-black mb-2 ${ROLE_INFO[mafiaPlayers[revealIndex].role].color}`}>
                  {ROLE_INFO[mafiaPlayers[revealIndex].role].title}
                </h4>
                <p className="text-xs text-stone-300 max-w-xs">
                  {ROLE_INFO[mafiaPlayers[revealIndex].role].desc}
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center text-stone-500">
                <EyeOff className="w-10 h-10 mb-2 opacity-50" />
                <span className="text-xs font-bold">البطاقة مقلوبة</span>
              </div>
            )}
          </div>

          {!isRoleVisible ? (
            <button
              onClick={() => {
                soundManager.playClick();
                setIsRoleVisible(true);
              }}
              className="w-full py-3 bg-stone-800 hover:bg-stone-700 text-stone-100 font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Eye className="w-4 h-4 text-amber-400" />
              اضغط لرؤية دورك
            </button>
          ) : (
            <button
              onClick={handleNextReveal}
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black rounded-xl transition-all shadow-lg cursor-pointer"
            >
              {revealIndex + 1 < mafiaPlayers.length ? 'حفظت دوري! مرر للتالي ←' : 'الجميع حفظ دوره! حلول الليل 🌙 ←'}
            </button>
          )}
        </div>
      )}

      {/* NIGHT PHASES (MAFIA) */}
      {stage === 'NIGHT_MAFIA' && (
        <div className="w-full max-w-md bg-stone-950 border border-red-900/60 rounded-3xl p-6 sm:p-8 flex flex-col items-center text-center shadow-2xl">
          <div className="flex items-center gap-2 text-red-500 mb-2">
            <Moon className="w-6 h-6 animate-pulse" />
            <span className="text-xs font-black tracking-widest">مرحلة الليل 🌙</span>
          </div>

          <h3 className="text-2xl font-black text-stone-100 mb-1">المافيا تستيقظ في الظلام</h3>
          <p className="text-xs text-stone-400 mb-6">
            (مرر الجوال لعضو المافيا سراً لاختيار ضحية الليلة)
          </p>

          <div className="w-full space-y-2 mb-6">
            {alivePlayers
              .filter((p) => p.role !== 'mafia')
              .map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleMafiaSelectTarget(p.id)}
                  className={`w-full p-3 rounded-xl border flex items-center justify-between text-sm font-bold transition-all ${
                    mafiaTargetId === p.id
                      ? 'bg-red-950/80 border-red-500 text-red-300 ring-2 ring-red-500/50'
                      : 'bg-stone-900 border-stone-800 text-stone-300 hover:bg-stone-800'
                  }`}
                >
                  <span>{p.name}</span>
                  <span>{mafiaTargetId === p.id ? '🎯 الهدف المحدد' : 'اختيار'}</span>
                </button>
              ))}
          </div>

          <button
            onClick={handleMafiaConfirm}
            disabled={!mafiaTargetId}
            className="w-full py-3 bg-red-600 hover:bg-red-500 disabled:bg-stone-800 disabled:text-stone-600 text-white font-black rounded-xl transition-colors shadow-lg"
          >
            تأكيد الهدف وإنهاء دور المافيا
          </button>
        </div>
      )}

      {/* NIGHT PHASES (DOCTOR) */}
      {stage === 'NIGHT_DOCTOR' && (
        <div className="w-full max-w-md bg-stone-950 border border-emerald-900/60 rounded-3xl p-6 sm:p-8 flex flex-col items-center text-center shadow-2xl">
          <div className="flex items-center gap-2 text-emerald-400 mb-2">
            <Shield className="w-6 h-6" />
            <span className="text-xs font-black">دور الدكتور 💉</span>
          </div>

          <h3 className="text-2xl font-black text-stone-100 mb-1">الدكتور يستيقظ</h3>
          <p className="text-xs text-stone-400 mb-6">
            (مرر الجوال للدكتور سراً لاختيار من يريد إنقاذه من الرصاصة)
          </p>

          <div className="w-full space-y-2 mb-6">
            {alivePlayers.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  soundManager.playClick();
                  setDoctorTargetId(p.id);
                }}
                className={`w-full p-3 rounded-xl border flex items-center justify-between text-sm font-bold transition-all ${
                  doctorTargetId === p.id
                    ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 ring-2 ring-emerald-500/50'
                    : 'bg-stone-900 border-stone-800 text-stone-300 hover:bg-stone-800'
                }`}
              >
                <span>{p.name}</span>
                <span>{doctorTargetId === p.id ? '🛡️ محمي' : 'حماية'}</span>
              </button>
            ))}
          </div>

          <button
            onClick={handleDoctorConfirm}
            disabled={!doctorTargetId}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-stone-800 disabled:text-stone-600 text-white font-black rounded-xl transition-colors shadow-lg"
          >
            تأكيد الحماية ومتابعة الليل
          </button>
        </div>
      )}

      {/* NIGHT PHASES (DETECTIVE) */}
      {stage === 'NIGHT_DETECTIVE' && (
        <div className="w-full max-w-md bg-stone-950 border border-blue-900/60 rounded-3xl p-6 sm:p-8 flex flex-col items-center text-center shadow-2xl">
          <div className="flex items-center gap-2 text-blue-400 mb-2">
            <Search className="w-6 h-6" />
            <span className="text-xs font-black">دور المحقق 🔍</span>
          </div>

          <h3 className="text-2xl font-black text-stone-100 mb-1">اختيار المحقق</h3>
          <p className="text-xs text-stone-400 mb-6">
            (مرر الجوال للمحقق سراً لتسجيل اختياره الليلة)
          </p>

          <div className="w-full space-y-2 mb-4">
            {alivePlayers
              .filter((p) => p.role !== 'detective')
              .map((p) => {
                const isSelected = detectiveTargetId === p.id;
                const isLockedOther = Boolean(detectiveTargetId && detectiveTargetId !== p.id);

                return (
                  <button
                    key={p.id}
                    onClick={() => handleDetectiveInvestigate(p.id)}
                    disabled={isLockedOther}
                    className={`w-full p-3.5 rounded-xl border flex items-center justify-between text-sm font-bold transition-all ${
                      isSelected
                        ? 'bg-blue-950/90 border-blue-500 text-blue-200 ring-2 ring-blue-500/40 shadow-lg'
                        : isLockedOther
                        ? 'bg-stone-950/50 border-stone-900 text-stone-600 opacity-40 cursor-not-allowed'
                        : 'bg-stone-900 border-stone-800 text-stone-300 hover:bg-stone-800 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">{p.avatar}</span>
                      <span>{p.name}</span>
                    </div>
                    <div>
                      {isSelected ? (
                        <span className="text-xs font-black px-2.5 py-1 rounded-lg border bg-blue-900/70 border-blue-400 text-blue-200">
                          تم الاختيار ✓
                        </span>
                      ) : (
                        <span className="text-xs text-stone-500">
                          {detectiveTargetId ? '—' : 'تحديد 🔍'}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
          </div>

          {detectiveTargetId && (
            <div className="w-full flex items-center justify-between mb-4 px-1">
              <span className="text-xs text-stone-400">تم تسجيل اختيار المحقق سراً</span>
              <button
                type="button"
                onClick={() => setDetectiveTargetId(null)}
                className="text-xs text-amber-400 hover:text-amber-300 underline font-bold cursor-pointer"
              >
                تغيير الاختيار 🔄
              </button>
            </div>
          )}

          <button
            onClick={resolveNight}
            disabled={!detectiveTargetId}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-stone-800 disabled:text-stone-600 text-white font-black rounded-xl transition-colors shadow-lg cursor-pointer"
          >
            تأكيد الاختيار وحلول الصباح ☀️
          </button>
        </div>
      )}

      {/* DAY ANNOUNCEMENT */}
      {stage === 'DAY_ANNOUNCE' && (
        <div className="w-full max-w-md bg-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-8 flex flex-col items-center text-center shadow-2xl">
          <div className="w-14 h-14 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mb-3">
            <Sun className="w-7 h-7" />
          </div>
          <h3 className="text-2xl font-black text-amber-400 mb-1">أشرقت الشمس على المدينة!</h3>
          <p className="text-xs text-stone-400 mb-6">الجميع يفتح عينيه ويستمع لنشرة أخبار الصباح</p>

          <div className="w-full p-5 bg-stone-950 border border-stone-800 rounded-2xl mb-6">
            {killedThisNight ? (
              <div>
                <Skull className="w-10 h-10 text-red-500 mx-auto mb-2" />
                <h4 className="text-lg font-black text-red-400 mb-1">سقط قتيل الليلة!</h4>
                <p className="text-sm font-bold text-stone-200">
                  للأسف، فارق الحياة اللاعب <b className="text-amber-400">{killedThisNight.name}</b> برصاص المافيا!
                </p>
                <div className="text-xs text-stone-500 mt-2">
                  دوره كان: {ROLE_INFO[killedThisNight.role].title}
                </div>
              </div>
            ) : (
              <div>
                <Shield className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
                <h4 className="text-lg font-black text-emerald-400 mb-1">ليلة هادئة بفضل الدكتور!</h4>
                <p className="text-sm font-bold text-stone-200">
                  نجح الدكتور في التدخل وإنقاذ الضحية في اللحظة الأخيرة! لم يمت أحد! 🎉
                </p>
              </div>
            )}
          </div>

          <button
            onClick={() => {
              soundManager.playClick();
              setStage('DAY_TRIAL');
            }}
            className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black rounded-xl transition-colors shadow-lg"
          >
            بدء نقاش النهار والمحاكمة! ⚖️
          </button>
        </div>
      )}

      {/* DAY TRIAL / VOTING */}
      {stage === 'DAY_TRIAL' && (
        <div className="w-full max-w-2xl bg-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-8 flex flex-col items-center shadow-2xl">
          <h3 className="text-2xl font-black text-amber-400 mb-1">محكمة الشعب والمدينة ⚖️</h3>
          <p className="text-xs text-stone-400 text-center mb-6">
            تناقشوا وصوتوا لاختيار اللاعب المستبعد من المدينة!
          </p>

          <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            {alivePlayers.map((p) => (
              <button
                key={p.id}
                onClick={() => setTrialVoteTarget(p.id)}
                className={`p-4 rounded-2xl border text-right flex items-center justify-between transition-all ${
                  trialVoteTarget === p.id
                    ? 'bg-red-950/80 border-red-500 text-red-200 ring-2 ring-red-500/40'
                    : 'bg-stone-950 border-stone-800 hover:bg-stone-800 text-stone-200'
                }`}
              >
                <div>
                  <span className="text-base font-black block">{p.name}</span>
                  <span className="text-[11px] text-stone-500">على قيد الحياة</span>
                </div>
                <span className="text-xs font-bold text-stone-400">
                  {trialVoteTarget === p.id ? 'تم اختياره ⚖️' : 'تصويت'}
                </span>
              </button>
            ))}
          </div>

          <button
            onClick={() => trialVoteTarget && handleExecuteTrial(trialVoteTarget)}
            disabled={!trialVoteTarget}
            className="w-full py-3 bg-red-600 hover:bg-red-500 disabled:bg-stone-800 disabled:text-stone-600 text-white font-black text-base rounded-2xl shadow-xl transition-all"
          >
            تأكيد استبعاد اللاعب ⚖️
          </button>
        </div>
      )}

      {/* GAME OVER */}
      {stage === 'GAME_OVER' && (
        <div className="w-full max-w-md bg-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-8 flex flex-col items-center text-center shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-amber-400/20 text-amber-400 flex items-center justify-center mx-auto mb-3 border border-amber-400/30">
            <Trophy className="w-8 h-8" />
          </div>

          {winnerTeam === 'citizens' ? (
            <div>
              <h3 className="text-2xl font-black text-emerald-400 mb-1">انتصار ساحق للمدينة! 🕊️</h3>
              <p className="text-sm font-bold text-stone-200 mb-4">
                تم القضاء على جميع أفراد المافيا وعاد الأمان للمواطنين الأبرياء!
              </p>
            </div>
          ) : (
            <div>
              <h3 className="text-2xl font-black text-red-500 mb-1">سيطرة المافيا! 🔫</h3>
              <p className="text-sm font-bold text-stone-200 mb-4">
                تفوقت المافيا وقضت على المقاومة وسيطرت على المدينة بالكامل!
              </p>
            </div>
          )}

          {/* Roles summary */}
          <div className="w-full bg-stone-950 p-4 rounded-2xl border border-stone-800 text-xs space-y-1.5 mb-6 text-right">
            <span className="text-stone-400 font-bold block mb-2">كشف هويات جميع اللاعبين:</span>
            {mafiaPlayers.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-1 border-b border-stone-900 last:border-none">
                <span className="font-bold text-stone-200">{p.name}</span>
                <span className={`font-black ${ROLE_INFO[p.role].color}`}>
                  {ROLE_INFO[p.role].title} {!p.isAlive && '(مات)'}
                </span>
              </div>
            ))}
          </div>

          <div className="w-full flex gap-3">
            <button
              onClick={startGame}
              className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black rounded-xl transition-colors text-xs"
            >
              لعبة جديدة
            </button>
            <button
              onClick={onBack}
              className="flex-1 py-3 bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold rounded-xl transition-colors text-xs"
            >
              القائمة الرئيسية
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
