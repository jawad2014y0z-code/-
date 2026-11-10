import React, { useState, useEffect } from 'react';
import { Player } from '../../types/game';
import { soundManager } from '../../utils/audio';
import { triggerConfetti } from '../../utils/confetti';
import {
  ArrowRight,
  Flame,
  HelpCircle,
  Clock,
  Plus,
  Dice5,
  CheckCircle2,
  AlertTriangle,
  Trophy,
  Check,
  Edit3,
  Shuffle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { WheelOfNames } from './WheelOfNames';

export type ChallengeType = 'confession' | 'action';
export type SessionMode = 'all_confessions' | 'all_actions' | 'mixed';

export interface ConfessionCard {
  id: string;
  category: string;
  question: string;
  intensity: 'خفيف' | 'قوي' | 'ناري';
}

export interface ActionCard {
  id: string;
  category: string;
  dare: string;
  timeLimit: number; // seconds
  intensity: 'خفيف' | 'قوي' | 'ناري';
}

// 1. بنك تحديات الاعترافات (Confessions Bank)
export const DEFAULT_CONFESSIONS: ConfessionCard[] = [
  {
    id: 'c-1',
    category: 'فضايح شخصية',
    question: 'اعترف بأكبر كذبة كذبتها على أهلك أو خوياك في الجلسة وما انكشفت للحين؟',
    intensity: 'ناري',
  },
  {
    id: 'c-2',
    category: 'مواقف محرجة',
    question: 'وش أغبى وأفشل تصرف سويته في حياتك وتتمنى ينمحي تماماً من الذاكرة؟',
    intensity: 'قوي',
  },
  {
    id: 'c-3',
    category: 'علاقات وسوالف',
    question: 'مين من الموجودين في الجلسة لو طلب منك سلفة 5,000 ريال بتصرفه فوراً وتتعذر بأي كذبة؟',
    intensity: 'ناري',
  },
  {
    id: 'c-4',
    category: 'فضايح شخصية',
    question: 'وش الرسالة أو المحادثة اللي كتبتها وندمت أشد الندم إنك أرسلتها؟ لمين كانت؟',
    intensity: 'قوي',
  },
  {
    id: 'c-5',
    category: 'سحبات',
    question: 'اعترف بأقوى سحبة سحبتها على الجلسة وقلت لهم عذر وهمي وأنت رايح مكان ثاني؟',
    intensity: 'خفيف',
  },
  {
    id: 'c-6',
    category: 'مواقف محرجة',
    question: 'وش الموقف اللي بكيت فيه قدام الناس أو انحرجت لدرجة ودك الأرض تنشق وتبلعك؟',
    intensity: 'قوي',
  },
  {
    id: 'c-7',
    category: 'علاقات وسوالف',
    question: 'مين في الجلسة أكثر شخص أسلوبه أو كلامه ينرفزك أحياناً بس تسلك له عشان ما يزعل؟',
    intensity: 'ناري',
  },
  {
    id: 'c-8',
    category: 'فضايح شخصية',
    question: 'هل عندك حساب وهمي أو سري بأي منصة؟ وليه سويته وش كنت تتابع فيه؟',
    intensity: 'قوي',
  },
  {
    id: 'c-9',
    category: 'مال وتناقضات',
    question: 'وش أكبر مبلغ تافه ضيعته على شي ما يسوى وندمت عليه أشد الندم؟',
    intensity: 'خفيف',
  },
  {
    id: 'c-10',
    category: 'علاقات وسوالف',
    question: 'لو أُجبرت تسافر شهر كامل في غرفة واحدة مع شخص واحد من الجلسة، مين تختار ومين تستبعد مستحيل تسافر معه؟',
    intensity: 'ناري',
  },
  {
    id: 'c-11',
    category: 'فضايح شخصية',
    question: 'وش السر اللي ما يعرفه عنك إلا شخص واحد فقط في حياتك؟',
    intensity: 'قوي',
  },
  {
    id: 'c-12',
    category: 'مواقف محرجة',
    question: 'وش أسوأ موقف صار لك مع تفتيش أو شرطة مرور وطلعت منه بالحظ أو الواسطة؟',
    intensity: 'خفيف',
  },
  {
    id: 'c-13',
    category: 'علاقات وسوالف',
    question: 'لو قالوا لك احذف شخص واحد فقط من قروب الجلسة بدون ما يدري مين كان السبب، مين تختار؟',
    intensity: 'ناري',
  },
  {
    id: 'c-14',
    category: 'مواقف محرجة',
    question: 'وش أكثر إشاعة أو كلام سمعته عن نفسك وكان صادم ومضحك؟',
    intensity: 'خفيف',
  },
  {
    id: 'c-15',
    category: 'فضايح شخصية',
    question: 'اعترف بشيء سويته بالسر وأنت صغير أو مراهق وحطيت التهمة في أخوك أو خويك؟',
    intensity: 'قوي',
  },
];

// 2. بنك تحديات الأفعال (أن تفعل شيء ينقال لك - Action / Dares Bank)
export const DEFAULT_ACTIONS: ActionCard[] = [
  {
    id: 'a-1',
    category: 'مكالمات ورسائل',
    dare: 'أرسل فويس نوت بصوت شيبة عجوز لقروب العائلة بالواتساب تقول بجدية: "وين غداي يا جماعة الخير؟"',
    timeLimit: 45,
    intensity: 'ناري',
  },
  {
    id: 'a-2',
    category: 'مكالمات ورسائل',
    dare: 'اتصل على أي مطعم قريب واسأله بجدية تامة: "عندكم مندي لحم خالي من الجلوتين ومويه عضوية؟"',
    timeLimit: 60,
    intensity: 'ناري',
  },
  {
    id: 'a-3',
    category: 'تفتيش وإحراج',
    dare: 'خل الشخص اللي على يمينك يفتش آخر 3 صور في ألبوم الكاميرا بدون ما تلمس الجوال!',
    timeLimit: 30,
    intensity: 'قوي',
  },
  {
    id: 'a-4',
    category: 'تمثيل وتقليد',
    dare: 'قلّد طريقة كلام ومشية خويك اللي قدامك لمدة 45 ثانية بكل تفاصيلها وحركاتها!',
    timeLimit: 45,
    intensity: 'خفيف',
  },
  {
    id: 'a-5',
    category: 'ضيافة وأفعال',
    dare: 'صب شاي أو قهوة لكل المتواجدين في الجلسة وأنت واقف بكل احترام وتقول: "أمرك يا طويل العمر".',
    timeLimit: 60,
    intensity: 'خفيف',
  },
  {
    id: 'a-6',
    category: 'تمثيل وتقليد',
    dare: 'امشِ في نص الصالة كأنك عارض أزياء في أسبوع باريس للموضة وأنت جاد بدون ما تبتسم نهائياً!',
    timeLimit: 30,
    intensity: 'قوي',
  },
  {
    id: 'a-7',
    category: 'سوشيال ميديا',
    dare: 'خل خويك يكتب ستوري في حسابك (نكتة أو اعتراف مضحك يختاره هو) وما تحذفه إلا بعد ساعة!',
    timeLimit: 60,
    intensity: 'ناري',
  },
  {
    id: 'a-8',
    category: 'لهجات ولغات',
    dare: 'تكلم دقيقة كاملة بلهجة ثانية بدون ما ترجع للهجتك أبداً (مثلاً مغربي، مصري، أو سوداني)!',
    timeLimit: 60,
    intensity: 'خفيف',
  },
  {
    id: 'a-9',
    category: 'سوشيال ميديا',
    dare: 'افتح الكاميرا الأمامية وسوِّ سيلفي بأغبى وجه تقدر عليه وأرسله لأول شخص يظهر بقائمة الشات!',
    timeLimit: 30,
    intensity: 'قوي',
  },
  {
    id: 'a-10',
    category: 'لياقة وقوة',
    dare: 'سوِّ 15 عدة ضغط (Push-ups) وأنت تعد الأرقام بصوت كرتوني مضحك!',
    timeLimit: 45,
    intensity: 'خفيف',
  },
  {
    id: 'a-11',
    category: 'مكالمات ورسائل',
    dare: 'اتصل على خوي لك مو موجود بالجلسة، وأول ما يرد قول له بحرارة: "أحبك في الله!" وقفل الخط بوجهه فوراً!',
    timeLimit: 45,
    intensity: 'ناري',
  },
  {
    id: 'a-12',
    category: 'تمثيل وتقليد',
    dare: 'خل الحضور يختارون لك شخصية مشهورة وتمثلها صوتاً وحركة حتى يخمنونها صح!',
    timeLimit: 60,
    intensity: 'قوي',
  },
  {
    id: 'a-13',
    category: 'مواقف مجنونة',
    dare: 'اشرب كاسة ماء كاملة بدون ما تستخدم يديك نهائياً!',
    timeLimit: 30,
    intensity: 'خفيف',
  },
  {
    id: 'a-14',
    category: 'مكالمات ورسائل',
    dare: 'أرسل إيموجي 🤡 لخامس محادثة عندك بالواتساب بدون أي توضيح!',
    timeLimit: 30,
    intensity: 'قوي',
  },
  {
    id: 'a-15',
    category: 'تمثيل وتقليد',
    dare: 'تكلم كأنك معلق مباراة كرة قدم حماسي على أي حركة يسويها أي شخص في الغرفة لمدة دقيقة!',
    timeLimit: 60,
    intensity: 'خفيف',
  },
];

interface PlayerScore {
  braveryPoints: number; // +15 per executed dare/confession
  confessionCount: number;
  actionCount: number;
  chickenCount: number; // -5 if bailed out
}

interface SelectedPreChallenge {
  type: ChallengeType;
  title: string;
  category: string;
  timeLimit?: number;
}

interface TaqtaqahGameProps {
  players: Player[];
  onBack: () => void;
  onOpenRules: () => void;
  onUpdatePlayerName?: (id: string, name: string) => void;
}

export const TaqtaqahGame: React.FC<TaqtaqahGameProps> = ({
  players,
  onBack,
  onOpenRules,
}) => {
  // Game Stages:
  // SETUP -> CHOOSE_TURN -> CHOOSE_CHALLENGE -> ACTIVE_CHALLENGE -> SUMMARY
  const [stage, setStage] = useState<
    'SETUP' | 'CHOOSE_TURN' | 'CHOOSE_CHALLENGE' | 'ACTIVE_CHALLENGE' | 'SUMMARY'
  >('SETUP');

  const [activePlayers, setActivePlayers] = useState<Player[]>(() => {
    return players.slice(0, Math.min(Math.max(players.length, 3), 8));
  });

  // Open-ended continuous challenges counter (No rounds limit!)
  const [challengeNumber, setChallengeNumber] = useState<number>(1);

  // Challenge selection BEFORE session creation
  const [sessionMode, setSessionMode] = useState<SessionMode>('mixed');
  const [preselectedChallenge, setPreselectedChallenge] = useState<SelectedPreChallenge | null>(null);
  const [showPreselectAccordion, setShowPreselectAccordion] = useState<boolean>(false);
  const [preselectTab, setPreselectTab] = useState<'confession' | 'action' | 'custom'>('confession');
  const [customPreselectText, setCustomPreselectText] = useState<string>('');

  // Active Player for the turn
  const [currentTurnIdx, setCurrentTurnIdx] = useState<number>(0);
  const [isSpinningBottle, setIsSpinningBottle] = useState<boolean>(false);
  const [bottleAngle, setBottleAngle] = useState<number>(0);

  // Active Challenge in turn
  const [chosenType, setChosenType] = useState<ChallengeType>('confession');
  const [currentChallengeTitle, setCurrentChallengeTitle] = useState<string>('');
  const [currentChallengeCategory, setCurrentChallengeCategory] = useState<string>('');

  // Timer for Action
  const [timerSeconds, setTimerSeconds] = useState<number>(60);
  const [timerActive, setTimerActive] = useState<boolean>(false);

  // Scores: playerId -> PlayerScore
  const [scores, setScores] = useState<Record<string, PlayerScore>>({});

  // In-game Custom question/dare modal
  const [showCustomModal, setShowCustomModal] = useState<boolean>(false);
  const [customType, setCustomType] = useState<ChallengeType>('action');
  const [customInputText, setCustomInputText] = useState<string>('');

  const activeVictim = activePlayers[currentTurnIdx] || activePlayers[0];

  // Initialize scores
  useEffect(() => {
    const initScores: Record<string, PlayerScore> = {};
    activePlayers.forEach((p) => {
      initScores[p.id] = {
        braveryPoints: 0,
        confessionCount: 0,
        actionCount: 0,
        chickenCount: 0,
      };
    });
    setScores(initScores);
  }, [activePlayers]);

  // Action timer countdown
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (timerActive && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((sec) => {
          if (sec <= 1) {
            soundManager.playBuzzer();
            setTimerActive(false);
            return 0;
          }
          if (sec <= 6) soundManager.playTick();
          return sec - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerActive, timerSeconds]);

  // Pick a random challenge based on challenge type
  const drawChallenge = (type: ChallengeType) => {
    setChosenType(type);
    if (type === 'confession') {
      const rand = DEFAULT_CONFESSIONS[Math.floor(Math.random() * DEFAULT_CONFESSIONS.length)];
      setCurrentChallengeTitle(rand.question);
      setCurrentChallengeCategory(rand.category);
    } else {
      const rand = DEFAULT_ACTIONS[Math.floor(Math.random() * DEFAULT_ACTIONS.length)];
      setCurrentChallengeTitle(rand.dare);
      setCurrentChallengeCategory(rand.category);
      setTimerSeconds(rand.timeLimit);
      setTimerActive(false);
    }
  };

  // Start the Game from SETUP
  const handleStartGame = () => {
    soundManager.playClick();
    setChallengeNumber(1);
    setCurrentTurnIdx(0);

    // If a specific preselected challenge was chosen before creating session, use it for turn 1!
    if (preselectedChallenge) {
      setChosenType(preselectedChallenge.type);
      setCurrentChallengeTitle(preselectedChallenge.title);
      setCurrentChallengeCategory(preselectedChallenge.category);
      if (preselectedChallenge.type === 'action') {
        setTimerSeconds(preselectedChallenge.timeLimit || 60);
        setTimerActive(false);
      }
    }

    setStage('CHOOSE_TURN');
  };

  // Spin the Bottle / Roulette to select who's turn it is
  const handleSpinRoulette = () => {
    if (isSpinningBottle) return;
    soundManager.playDrumRoll();
    setIsSpinningBottle(true);

    const randomDegrees = 1440 + Math.floor(Math.random() * 360);
    setBottleAngle((prev) => prev + randomDegrees);

    setTimeout(() => {
      setIsSpinningBottle(false);
      const chosenIdx = Math.floor(Math.random() * activePlayers.length);
      setCurrentTurnIdx(chosenIdx);
      soundManager.playLaugh();
      proceedAfterTurnSelection();
    }, 1800);
  };

  // Pick Turn Directly by Next Order
  const handleDirectNextTurn = () => {
    soundManager.playClick();
    proceedAfterTurnSelection();
  };

  // Route to either active challenge or choice based on sessionMode
  const proceedAfterTurnSelection = () => {
    // If turn 1 and preselectedChallenge exists, go straight to it
    if (challengeNumber === 1 && preselectedChallenge) {
      setStage('ACTIVE_CHALLENGE');
      return;
    }

    if (sessionMode === 'all_confessions') {
      drawChallenge('confession');
      setStage('ACTIVE_CHALLENGE');
    } else if (sessionMode === 'all_actions') {
      drawChallenge('action');
      setStage('ACTIVE_CHALLENGE');
    } else {
      // Mixed mode: victim gets to pick confession or action
      setStage('CHOOSE_CHALLENGE');
    }
  };

  // Player Chooses Challenge Type in Mixed Mode
  const handleSelectChallengeType = (type: ChallengeType) => {
    soundManager.playMove();
    drawChallenge(type);
    setStage('ACTIVE_CHALLENGE');
  };

  // Re-draw a different challenge from bank
  const handleRerollChallenge = () => {
    soundManager.playMove();
    drawChallenge(chosenType);
  };

  // Group Verdict: Player Executed the Challenge (كفو ونفّذ!)
  const handleVerdictSuccess = () => {
    triggerConfetti();
    soundManager.playApplause();

    setScores((prev) => {
      const current = prev[activeVictim.id] || {
        braveryPoints: 0,
        confessionCount: 0,
        actionCount: 0,
        chickenCount: 0,
      };
      return {
        ...prev,
        [activeVictim.id]: {
          ...current,
          braveryPoints: current.braveryPoints + 15,
          confessionCount: chosenType === 'confession' ? current.confessionCount + 1 : current.confessionCount,
          actionCount: chosenType === 'action' ? current.actionCount + 1 : current.actionCount,
        },
      };
    });

    advanceNextTurn();
  };

  // Group Verdict: Player Bailed Out (انسحب وخاف!)
  const handleVerdictChicken = () => {
    soundManager.playBuzzer();

    setScores((prev) => {
      const current = prev[activeVictim.id] || {
        braveryPoints: 0,
        confessionCount: 0,
        actionCount: 0,
        chickenCount: 0,
      };
      return {
        ...prev,
        [activeVictim.id]: {
          ...current,
          braveryPoints: Math.max(0, current.braveryPoints - 5),
          chickenCount: current.chickenCount + 1,
        },
      };
    });

    advanceNextTurn();
  };

  // Advance to next turn (Open-ended continuous play - NO rounds limit!)
  const advanceNextTurn = () => {
    setTimerActive(false);
    setChallengeNumber((c) => c + 1);
    setCurrentTurnIdx((idx) => (idx + 1) % activePlayers.length);
    setStage('CHOOSE_TURN');
  };

  // Finish session at any time and show winners
  const handleFinishSession = () => {
    soundManager.playClick();
    triggerConfetti();
    soundManager.playApplause();
    setStage('SUMMARY');
  };

  // In-game Custom Challenge
  const handleAddCustomChallenge = () => {
    if (!customInputText.trim()) return;
    soundManager.playClick();

    setChosenType(customType);
    setCurrentChallengeTitle(customInputText.trim());
    setCurrentChallengeCategory(
      customType === 'confession' ? 'اعتراف مخصص من الجلسة' : 'طلب خاص ينقال لك'
    );

    if (customType === 'action') {
      setTimerSeconds(60);
      setTimerActive(false);
    }

    setCustomInputText('');
    setShowCustomModal(false);
    setStage('ACTIVE_CHALLENGE');
  };

  // Pre-select custom challenge in SETUP screen before session start
  const handleApplyPreselectedCustom = () => {
    if (!customPreselectText.trim()) return;
    soundManager.playClick();
    setPreselectedChallenge({
      type: preselectTab === 'action' ? 'action' : 'confession',
      title: customPreselectText.trim(),
      category: 'تحدي مسبق خاص للجلسة',
      timeLimit: preselectTab === 'action' ? 60 : undefined,
    });
    setCustomPreselectText('');
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-3 sm:px-6 py-4 flex flex-col items-center select-none font-cairo">
      {/* Top Header */}
      <div className="w-full flex items-center justify-between gap-4 mb-4 bg-stone-900/90 backdrop-blur-md p-3 sm:p-4 rounded-2xl border border-stone-800 shadow-xl">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              soundManager.playClick();
              onBack();
            }}
            className="p-2 text-stone-400 hover:text-white bg-stone-950 rounded-xl border border-stone-800 transition-colors flex items-center gap-1.5 text-xs font-bold"
          >
            <ArrowRight className="w-4 h-4" />
            <span className="hidden sm:inline">صالة الألعاب</span>
          </button>

          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-black text-amber-400 flex items-center gap-1.5">
              <span>طقطقة (Taqtaqah)</span>
              <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full border border-red-500/30">
                اعترافات وأفعال ⚡🗣️
              </span>
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {stage !== 'SETUP' && stage !== 'SUMMARY' && (
            <>
              <div className="px-3 py-1 bg-stone-950 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-red-400 animate-pulse" />
                <span>تحدي #{challengeNumber}</span>
              </div>

              <button
                onClick={handleFinishSession}
                className="px-2.5 py-1.5 bg-amber-500/15 hover:bg-amber-500 text-amber-400 hover:text-stone-950 border border-amber-500/40 rounded-xl text-xs font-black transition-all flex items-center gap-1 cursor-pointer"
                title="إنهاء الجلسة وإعلان الفائز"
              >
                <Trophy className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">إنهاء الجلسة 🏆</span>
              </button>
            </>
          )}

          <button
            onClick={() => {
              soundManager.playClick();
              onOpenRules();
            }}
            title="قوانين طقطقة"
            className="p-2 text-stone-400 hover:text-white bg-stone-950 rounded-xl border border-stone-800 transition-colors cursor-pointer"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ================= STAGE 1: SETUP (قبل صنع الجلسة) ================= */}
      {stage === 'SETUP' && (
        <div className="w-full max-w-2xl bg-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-8 flex flex-col gap-6 shadow-2xl animate-in zoom-in-95 duration-200">
          <div className="text-center space-y-2">
            <span className="text-5xl block animate-bounce">🤣⚡🗣️</span>
            <h3 className="text-2xl sm:text-3xl font-black text-stone-100">
              إعداد جلسة طقطقة
            </h3>
            <p className="text-xs sm:text-sm text-stone-400 max-w-md mx-auto leading-relaxed">
              اختر نوع التحدي والتحدي المفضل قبل بدء الجلسة، والعبوا بدون قيود جولات حتى تنهوا الجلسة وتتوجوا البطل!
            </p>
          </div>

          {/* 1. اختيار نمط التحديات الأساسي قبل صنع الجلسة */}
          <div className="space-y-3">
            <label className="text-xs font-black text-amber-400 flex items-center gap-1.5">
              <span>🎯 اختر نوع التحدي للجلسة قبل البدء:</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Option A: Confessions Only */}
              <button
                type="button"
                onClick={() => {
                  soundManager.playClick();
                  setSessionMode('all_confessions');
                  if (preselectedChallenge?.type === 'action') {
                    setPreselectedChallenge(null);
                  }
                }}
                className={`p-3.5 rounded-2xl border text-right transition-all flex flex-col gap-1.5 cursor-pointer ${
                  sessionMode === 'all_confessions'
                    ? 'bg-gradient-to-br from-amber-950/60 via-stone-950 to-stone-900 border-amber-400 shadow-lg scale-[1.02]'
                    : 'bg-stone-950/80 border-stone-800 hover:bg-stone-850 opacity-80'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl">🗣️</span>
                  {sessionMode === 'all_confessions' && (
                    <Check className="w-4 h-4 text-amber-400 font-bold" />
                  )}
                </div>
                <span className="text-xs font-black text-amber-300">تحدي الاعترافات فقط</span>
                <span className="text-[10px] text-stone-400 leading-tight">
                  أسئلة إحراج وفضايح وصراحة تامة أمام الجلسة
                </span>
              </button>

              {/* Option B: Actions Only */}
              <button
                type="button"
                onClick={() => {
                  soundManager.playClick();
                  setSessionMode('all_actions');
                  if (preselectedChallenge?.type === 'confession') {
                    setPreselectedChallenge(null);
                  }
                }}
                className={`p-3.5 rounded-2xl border text-right transition-all flex flex-col gap-1.5 cursor-pointer ${
                  sessionMode === 'all_actions'
                    ? 'bg-gradient-to-br from-red-950/60 via-stone-950 to-stone-900 border-red-400 shadow-lg scale-[1.02]'
                    : 'bg-stone-950/80 border-stone-800 hover:bg-stone-850 opacity-80'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl">⚡</span>
                  {sessionMode === 'all_actions' && (
                    <Check className="w-4 h-4 text-red-400 font-bold" />
                  )}
                </div>
                <span className="text-xs font-black text-red-300">تفعل شيء ينقال لك فقط</span>
                <span className="text-[10px] text-stone-400 leading-tight">
                  أفعال وأحكام ومقالب حقيقية وموقوتة بالثواني
                </span>
              </button>

              {/* Option C: Mixed */}
              <button
                type="button"
                onClick={() => {
                  soundManager.playClick();
                  setSessionMode('mixed');
                }}
                className={`p-3.5 rounded-2xl border text-right transition-all flex flex-col gap-1.5 cursor-pointer ${
                  sessionMode === 'mixed'
                    ? 'bg-gradient-to-br from-stone-900 via-stone-950 to-stone-900 border-amber-500 shadow-lg scale-[1.02]'
                    : 'bg-stone-950/80 border-stone-800 hover:bg-stone-850 opacity-80'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl">🎲</span>
                  {sessionMode === 'mixed' && (
                    <Check className="w-4 h-4 text-amber-400 font-bold" />
                  )}
                </div>
                <span className="text-xs font-black text-amber-400">منوع (اللاعب يختار)</span>
                <span className="text-[10px] text-stone-400 leading-tight">
                  اللاعب في كل دور يختار بين الاعتراف أو الفعل
                </span>
              </button>
            </div>
          </div>

          {/* 2. اختيار أو كتابة تحدي محدد مسبقاً قبل صنع الجلسة */}
          <div className="bg-stone-950 p-4 rounded-2xl border border-stone-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-black text-stone-200">
                  اختيار تحدي مسبق للبداية (اختياري)
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  soundManager.playClick();
                  setShowPreselectAccordion(!showPreselectAccordion);
                }}
                className="text-[11px] text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1"
              >
                <span>{showPreselectAccordion ? 'إخفاء القائمة' : 'تصفح وتحديد تحدي'}</span>
                {showPreselectAccordion ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>
            </div>

            {/* Currently Selected Pre-Challenge Pill */}
            {preselectedChallenge ? (
              <div className="p-3 bg-amber-950/40 border border-amber-500/50 rounded-xl flex items-center justify-between gap-3 animate-in fade-in">
                <div className="text-right">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs">
                      {preselectedChallenge.type === 'confession' ? '🗣️ اعتراف مسبق' : '⚡ فعل مسبق'}
                    </span>
                    <span className="text-[10px] text-amber-400 font-bold">
                      «{preselectedChallenge.category}»
                    </span>
                  </div>
                  <p className="text-xs font-bold text-stone-100 line-clamp-2">
                    {preselectedChallenge.title}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    soundManager.playClick();
                    setPreselectedChallenge(null);
                  }}
                  className="px-2.5 py-1 bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-white rounded-lg text-[11px] font-bold border border-stone-750 transition-colors shrink-0"
                >
                  إلغاء التحديد ✕
                </button>
              </div>
            ) : (
              <p className="text-[11px] text-stone-500">
                لم يتم اختيار تحدٍ محدد، سيتم السحب عشوائياً حسب نوع التحديات المختار.
              </p>
            )}

            {/* Expandable Challenge Selector Drawer */}
            {showPreselectAccordion && (
              <div className="pt-2 border-t border-stone-850 space-y-3 animate-in fade-in duration-200">
                {/* Tabs */}
                <div className="flex gap-1.5 p-1 bg-stone-900 rounded-xl">
                  <button
                    type="button"
                    onClick={() => {
                      soundManager.playClick();
                      setPreselectTab('confession');
                    }}
                    className={`flex-1 py-1.5 text-xs font-black rounded-lg transition-all ${
                      preselectTab === 'confession'
                        ? 'bg-amber-500 text-stone-950 shadow-sm'
                        : 'text-stone-400 hover:text-white'
                    }`}
                  >
                    🗣️ بنك الاعترافات ({DEFAULT_CONFESSIONS.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      soundManager.playClick();
                      setPreselectTab('action');
                    }}
                    className={`flex-1 py-1.5 text-xs font-black rounded-lg transition-all ${
                      preselectTab === 'action'
                        ? 'bg-red-500 text-white shadow-sm'
                        : 'text-stone-400 hover:text-white'
                    }`}
                  >
                    ⚡ بنك الأفعال ({DEFAULT_ACTIONS.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      soundManager.playClick();
                      setPreselectTab('custom');
                    }}
                    className={`flex-1 py-1.5 text-xs font-black rounded-lg transition-all ${
                      preselectTab === 'custom'
                        ? 'bg-stone-800 text-amber-400 shadow-sm border border-stone-700'
                        : 'text-stone-400 hover:text-white'
                    }`}
                  >
                    ✍️ كتابة تحدي خاص
                  </button>
                </div>

                {/* Tab 1: Confessions list */}
                {preselectTab === 'confession' && (
                  <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 text-right">
                    {DEFAULT_CONFESSIONS.map((c) => {
                      const isChosen =
                        preselectedChallenge?.type === 'confession' &&
                        preselectedChallenge.title === c.question;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            soundManager.playClick();
                            setPreselectedChallenge({
                              type: 'confession',
                              title: c.question,
                              category: c.category,
                            });
                          }}
                          className={`w-full p-2.5 rounded-xl border text-right transition-all flex items-start justify-between gap-2 ${
                            isChosen
                              ? 'bg-amber-950/60 border-amber-400 text-amber-300 font-bold'
                              : 'bg-stone-900/60 border-stone-800 text-stone-300 hover:bg-stone-850'
                          }`}
                        >
                          <div className="flex-1">
                            <span className="text-[10px] text-amber-400/80 block mb-0.5">
                              {c.category} · {c.intensity}
                            </span>
                            <span className="text-xs leading-relaxed">{c.question}</span>
                          </div>
                          {isChosen && <Check className="w-4 h-4 text-amber-400 shrink-0 mt-1" />}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Tab 2: Actions list */}
                {preselectTab === 'action' && (
                  <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 text-right">
                    {DEFAULT_ACTIONS.map((a) => {
                      const isChosen =
                        preselectedChallenge?.type === 'action' &&
                        preselectedChallenge.title === a.dare;
                      return (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => {
                            soundManager.playClick();
                            setPreselectedChallenge({
                              type: 'action',
                              title: a.dare,
                              category: a.category,
                              timeLimit: a.timeLimit,
                            });
                          }}
                          className={`w-full p-2.5 rounded-xl border text-right transition-all flex items-start justify-between gap-2 ${
                            isChosen
                              ? 'bg-red-950/60 border-red-400 text-red-200 font-bold'
                              : 'bg-stone-900/60 border-stone-800 text-stone-300 hover:bg-stone-850'
                          }`}
                        >
                          <div className="flex-1">
                            <span className="text-[10px] text-red-400/80 block mb-0.5">
                              {a.category} · مؤقت {a.timeLimit} ثانية
                            </span>
                            <span className="text-xs leading-relaxed">{a.dare}</span>
                          </div>
                          {isChosen && <Check className="w-4 h-4 text-red-400 shrink-0 mt-1" />}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Tab 3: Custom Input */}
                {preselectTab === 'custom' && (
                  <div className="space-y-2">
                    <textarea
                      rows={2}
                      value={customPreselectText}
                      onChange={(e) => setCustomPreselectText(e.target.value)}
                      placeholder="اكتب التحدي الخاص أو السؤال الفضائحي الذي تريد أن يبدأ به أول لاعب..."
                      className="w-full bg-stone-900 border border-stone-750 focus:border-amber-400 rounded-xl p-2.5 text-xs text-stone-100 placeholder-stone-600 outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleApplyPreselectedCustom}
                      disabled={!customPreselectText.trim()}
                      className="w-full py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-950 font-black text-xs rounded-xl transition-all shadow-md"
                    >
                      تثبيت هذا التحدي الخاص كأول تحدٍ للجلسة ✅
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 3. المشاركون في الجلسة */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-stone-300 font-bold">
              <span>المشاركون في الطقطقة ({activePlayers.length} لاعبين):</span>
              <span className="text-stone-500 text-[11px]">(3 إلى 8 لاعبين)</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {players.map((p) => {
                const isSelected = activePlayers.some((ap) => ap.id === p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      soundManager.playClick();
                      if (isSelected) {
                        if (activePlayers.length > 3) {
                          setActivePlayers((prev) => prev.filter((ap) => ap.id !== p.id));
                        }
                      } else {
                        if (activePlayers.length < 8) {
                          setActivePlayers((prev) => [...prev, p]);
                        }
                      }
                    }}
                    className={`p-2.5 rounded-xl border text-right flex items-center gap-2.5 transition-all ${
                      isSelected
                        ? 'bg-amber-950/40 border-amber-500/60 text-white'
                        : 'bg-stone-950 border-stone-850 text-stone-500 opacity-60'
                    }`}
                  >
                    <span className="text-xl">{p.avatar}</span>
                    <span className="text-xs font-black truncate">{p.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* زر بدء الجلسة مباشرة */}
          <button
            onClick={handleStartGame}
            className="w-full py-4 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 hover:from-amber-300 hover:to-amber-400 text-stone-950 font-black text-sm rounded-2xl shadow-xl transition-all shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Flame className="w-5 h-5 fill-stone-950" />
            <span>ابدأ جلسة الطقطقة الآن 🔥</span>
          </button>
        </div>
      )}

      {/* ================= STAGE 2: CHOOSE TURN (عجلة الأسماء المطورة) ================= */}
      {stage === 'CHOOSE_TURN' && (
        <div className="w-full max-w-2xl bg-stone-900 border border-stone-800 rounded-3xl p-5 sm:p-7 flex flex-col items-center gap-6 shadow-2xl text-center animate-in zoom-in-95 duration-200">
          <WheelOfNames
            players={activePlayers}
            onWinnerSelected={(winner) => {
              const idx = activePlayers.findIndex((p) => p.id === winner.id);
              if (idx !== -1) {
                setCurrentTurnIdx(idx);
              } else {
                setActivePlayers((prev) => [...prev, winner]);
                setCurrentTurnIdx(activePlayers.length);
              }
            }}
            onProceedToChallenge={(winner) => {
              const idx = activePlayers.findIndex((p) => p.id === winner.id);
              if (idx !== -1) {
                setCurrentTurnIdx(idx);
              } else {
                setActivePlayers((prev) => [...prev, winner]);
                setCurrentTurnIdx(activePlayers.length);
              }
              proceedAfterTurnSelection();
            }}
          />
        </div>
      )}

      {/* ================= STAGE 3: CHOOSE CHALLENGE (في النمط المنوع فقط) ================= */}
      {stage === 'CHOOSE_CHALLENGE' && (
        <div className="w-full max-w-2xl bg-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-8 flex flex-col items-center gap-6 shadow-2xl text-center animate-in zoom-in-95 duration-200">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/15 border border-amber-500/30 rounded-full text-xs font-black text-amber-400 mb-1">
              <span>{activeVictim.avatar}</span>
              <span>دور الضحية: {activeVictim.name}</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-black text-white">
              اختر نوع التحدي يا {activeVictim.name}!
            </h3>
            <p className="text-xs text-stone-400 max-w-md mx-auto">
              وش تختار؟ تعترف بفضايحك وسرك بصراحة، أو تسوي فعل حقيقي ينقال لك وتثبت شجاعتك؟
            </p>
          </div>

          {/* TWO GIANT CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
            {/* OPTION 1: CONFESSION */}
            <button
              onClick={() => handleSelectChallengeType('confession')}
              className="p-6 rounded-3xl bg-gradient-to-b from-amber-950/60 via-stone-950 to-stone-950 border-2 border-amber-500/50 hover:border-amber-400 hover:scale-[1.03] transition-all cursor-pointer shadow-xl flex flex-col items-center text-center gap-3 group"
            >
              <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
                🗣️
              </div>
              <h4 className="text-lg font-black text-amber-400">تحدي الاعترافات</h4>
              <p className="text-xs text-stone-300 leading-relaxed">
                سؤال صريح وفضائحي ومحرج، ولازم تجاوب عليه بدون كذب قدام الكل!
              </p>
              <span className="text-[11px] font-bold text-amber-300/80 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20 mt-1">
                صراحة تامة 💬
              </span>
            </button>

            {/* OPTION 2: ACTION / DARE */}
            <button
              onClick={() => handleSelectChallengeType('action')}
              className="p-6 rounded-3xl bg-gradient-to-b from-red-950/60 via-stone-950 to-stone-950 border-2 border-red-500/50 hover:border-red-400 hover:scale-[1.03] transition-all cursor-pointer shadow-xl flex flex-col items-center text-center gap-3 group"
            >
              <div className="w-16 h-16 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
                ⚡
              </div>
              <h4 className="text-lg font-black text-red-400">تفعل شيء ينقال لك</h4>
              <p className="text-xs text-stone-300 leading-relaxed">
                طلب حقيقي وفعل مجنون ينقال لك ولازم تسويه أمام الجلسة مباشرة!
              </p>
              <span className="text-[11px] font-bold text-red-300/80 bg-red-500/10 px-2.5 py-1 rounded-full border border-red-500/20 mt-1">
                تحدي شجاعة 🔥
              </span>
            </button>
          </div>

          {/* Custom input from friends */}
          <div className="pt-2 border-t border-stone-800 w-full flex items-center justify-between">
            <button
              onClick={() => {
                soundManager.playClick();
                setShowCustomModal(true);
              }}
              className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>أو اكتبوا له طلب/اعتراف خاص من عندكم ✍️</span>
            </button>
            <span className="text-[11px] text-stone-500">الجلسة تحكم</span>
          </div>
        </div>
      )}

      {/* ================= STAGE 4: ACTIVE CHALLENGE (عرض السؤال أو الفعل) ================= */}
      {stage === 'ACTIVE_CHALLENGE' && (
        <div className="w-full max-w-2xl bg-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-8 flex flex-col items-center gap-6 shadow-2xl text-center animate-in zoom-in-95 duration-200">
          <div className="space-y-1">
            <div
              className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black border ${
                chosenType === 'confession'
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                  : 'bg-red-500/20 text-red-400 border-red-500/30'
              }`}
            >
              <span>{chosenType === 'confession' ? '🗣️ تحدي الاعترافات' : '⚡ تفعل شيء ينقال لك'}</span>
              <span>·</span>
              <span>المطلوب من: {activeVictim.name} {activeVictim.avatar}</span>
            </div>
          </div>

          {/* THE CARD */}
          <div
            className={`w-full p-6 sm:p-8 rounded-3xl border-2 shadow-2xl relative overflow-hidden text-center space-y-4 ${
              chosenType === 'confession'
                ? 'bg-gradient-to-b from-amber-950/70 via-stone-950 to-stone-900 border-amber-500/50'
                : 'bg-gradient-to-b from-red-950/70 via-stone-950 to-stone-900 border-red-500/50'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-stone-400">
              <span className="font-bold">{currentChallengeCategory || 'تحدي الجلسة'}</span>
              <button
                onClick={handleRerollChallenge}
                className="text-[11px] text-amber-400/80 hover:text-amber-300 flex items-center gap-1 font-bold"
                title="تغيير التحدي عشوائياً"
              >
                <Shuffle className="w-3.5 h-3.5" />
                <span>سحب سؤال/طلب آخر 🎲</span>
              </button>
            </div>

            <h3 className="text-xl sm:text-2xl font-black text-white leading-relaxed max-w-lg mx-auto py-2">
              «{currentChallengeTitle}»
            </h3>

            {/* Timer if Action */}
            {chosenType === 'action' && (
              <div className="flex flex-col items-center gap-2 pt-2">
                <div className="flex items-center gap-2 text-2xl font-black text-amber-400 font-mono bg-stone-950 px-4 py-2 rounded-2xl border border-stone-800">
                  <Clock className="w-5 h-5 text-red-400 animate-spin" />
                  <span>{timerSeconds} ثانية</span>
                </div>
                {!timerActive ? (
                  <button
                    onClick={() => {
                      soundManager.playClick();
                      setTimerActive(true);
                    }}
                    className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs rounded-xl shadow-md cursor-pointer"
                  >
                    بدء المؤقت ⏱️
                  </button>
                ) : (
                  <button
                    onClick={() => setTimerActive(false)}
                    className="px-4 py-1.5 bg-stone-800 text-stone-300 font-bold text-xs rounded-xl cursor-pointer"
                  >
                    إيقاف مؤقت ⏸️
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Group Verdict Controls */}
          <div className="w-full space-y-3 pt-2">
            <span className="text-xs font-bold text-stone-300 block">
              حكم الجلسة على {activeVictim.name}:
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
              <button
                onClick={handleVerdictSuccess}
                className="py-4 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer shadow-emerald-600/20"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>كفو! نفّذ التحدي بشجاعة 👏 (+15 نقطة)</span>
              </button>

              <button
                onClick={handleVerdictChicken}
                className="py-4 px-4 bg-red-950/60 hover:bg-red-900/60 text-red-300 border border-red-500/40 font-black text-sm rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <AlertTriangle className="w-5 h-5 text-red-400" />
                <span>انسحب وخاف! 🐔 (-5 نقاط)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= STAGE 5: SUMMARY & LEADERBOARD ================= */}
      {stage === 'SUMMARY' && (
        <div className="w-full max-w-2xl bg-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-8 flex flex-col items-center gap-6 shadow-2xl text-center animate-in zoom-in-95 duration-200">
          <Trophy className="w-16 h-16 text-amber-400 mx-auto animate-bounce" />
          <div>
            <h3 className="text-2xl sm:text-3xl font-black text-white mb-1">
              ترتيب أبطال جلسة الطقطقة! 🏆
            </h3>
            <p className="text-xs text-stone-400">
              تم إنجاز {challengeNumber - 1} تحديات! إليك من كان الأكثر شجاعة ومن خاف وانسحب!
            </p>
          </div>

          {/* Ranking list */}
          <div className="w-full space-y-2.5 bg-stone-950 p-4 rounded-2xl border border-stone-850">
            {activePlayers
              .map((p) => ({
                player: p,
                stat: scores[p.id] || {
                  braveryPoints: 0,
                  confessionCount: 0,
                  actionCount: 0,
                  chickenCount: 0,
                },
              }))
              .sort((a, b) => b.stat.braveryPoints - a.stat.braveryPoints)
              .map(({ player, stat }, idx) => (
                <div
                  key={player.id}
                  className={`p-3 rounded-xl flex items-center justify-between border ${
                    idx === 0
                      ? 'bg-amber-950/40 border-amber-500/50 text-amber-300'
                      : 'bg-stone-900 border-stone-800 text-stone-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-stone-800 flex items-center justify-center text-xs font-mono font-bold">
                      #{idx + 1}
                    </span>
                    <span className="text-2xl">{player.avatar}</span>
                    <div className="text-right">
                      <span className="text-sm font-black block">{player.name}</span>
                      <span className="text-[10px] text-stone-500">
                        {stat.confessionCount} اعتراف · {stat.actionCount} فعل · {stat.chickenCount} انسحاب
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-black text-amber-400">
                      {stat.braveryPoints} نقطة
                    </div>
                    {idx === 0 && (
                      <span className="text-[9px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-black border border-amber-500/30">
                        بطل الجلسة 👑
                      </span>
                    )}
                  </div>
                </div>
              ))}
          </div>

          <div className="flex gap-3 w-full">
            <button
              onClick={() => {
                soundManager.playClick();
                setStage('SETUP');
              }}
              className="flex-1 py-3.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs sm:text-sm rounded-xl transition-all cursor-pointer shadow-lg"
            >
              جلسة جديدة وإعداد تحديات 🔄
            </button>
            <button
              onClick={onBack}
              className="flex-1 py-3.5 bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-xs sm:text-sm rounded-xl transition-all cursor-pointer"
            >
              صالة الألعاب
            </button>
          </div>
        </div>
      )}

      {/* In-game Custom Challenge Modal */}
      {showCustomModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl max-w-md w-full p-6 text-right space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-black text-amber-400">
              اكتب تحدي أو اعتراف لـ {activeVictim.name} ✍️
            </h3>
            <p className="text-xs text-stone-400">
              اختر النوع واكتب الطلب أو السؤال المحرج الخاص بجلستكم:
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCustomType('confession')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                  customType === 'confession'
                    ? 'bg-amber-500 text-stone-950 border-amber-400 font-black'
                    : 'bg-stone-950 text-stone-400 border-stone-800'
                }`}
              >
                🗣️ تحدي اعتراف
              </button>
              <button
                type="button"
                onClick={() => setCustomType('action')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                  customType === 'action'
                    ? 'bg-red-500 text-white border-red-400 font-black'
                    : 'bg-stone-950 text-stone-400 border-stone-800'
                }`}
              >
                ⚡ أن يفعل شيء
              </button>
            </div>

            <textarea
              rows={3}
              value={customInputText}
              onChange={(e) => setCustomInputText(e.target.value)}
              placeholder={
                customType === 'confession'
                  ? 'مثال: اعترف بسالفة صارت معك وما يدري عنها إلا فلان...'
                  : 'مثال: اتصل على فلان وقل له سالفة مضحكة وقفل الخط...'
              }
              className="w-full bg-stone-950 border border-stone-750 focus:border-amber-400 rounded-2xl p-3 text-xs sm:text-sm text-stone-100 placeholder-stone-600 outline-none transition-colors"
            />

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowCustomModal(false)}
                className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-xs rounded-xl"
              >
                إلغاء
              </button>
              <button
                onClick={handleAddCustomChallenge}
                disabled={!customInputText.trim()}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-950 font-black text-xs rounded-xl shadow-md"
              >
                تطبيق التحدي عليه فوراً 🔥
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
