import React, { useState, useEffect } from 'react';
import { Player } from '../../types/game';
import { soundManager } from '../../utils/audio';
import { triggerConfetti } from '../../utils/confetti';
import { Eye, EyeOff, RotateCcw, Play, Users, Trophy, Sparkles, HelpCircle, AlertCircle, ArrowLeft } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  icon: string;
  words: string[];
}

const CATEGORIES: Category[] = [
  {
    id: 'food',
    name: 'أكلات ومشروبات شعبية',
    icon: '🍲',
    words: [
      'كبسة دجاج', 'مندي لحم', 'مسحب البيك', 'شاورما عربي', 'معصوب بالقشطة',
      'مطبق مالح', 'حنيني', 'كنافة نابلسية', 'لقيمات بالدبس', 'قهوة سعودية وهيل',
      'شاهي كرك', 'مضغوط حاشي', 'مرقوق', 'جريش', 'فول وتميس', 'فلافل مشكلة'
    ],
  },
  {
    id: 'places',
    name: 'أماكن وسياحة',
    icon: '🏜️',
    words: [
      'البوليفارد', 'سوق الزل بالرياض', 'العلا ومدائن صالح', 'كورنيش جدة', 'جبل طويق',
      'سوق واقف', 'دبي مول', 'برج خليفة', 'مترو الرياض', 'شاطئ نصف القمر',
      'مطار الملك خالد', 'شارع التحلية', 'ممشى الواجهة البحرية'
    ],
  },
  {
    id: 'objects',
    name: 'أشياء وأدوات يومية',
    icon: '☕',
    words: [
      'دلة رسلان', 'عقال مقصب', 'بشت حساوي', 'مسباح سندلوس', 'دفاية زيت',
      'بطانية نمر', 'شاحن متنقل', 'شبشب زنوبة', 'ميدالية مفاتيح', 'سماعات بلوتوث',
      'فنجال قهوة', 'ترمس شاي', 'مبخرة عود'
    ],
  },
  {
    id: 'cars',
    name: 'سيارات ومواقف الشارع',
    icon: '🚗',
    words: [
      'تويوتا كامري', 'شاص تويوتا', 'هايلوكس غمارتين', 'هيونداي النترا', 'كاميرا ساهر',
      'زحمة خريص', 'بنشر كفر', 'مغسلة سيارات', 'فحص دوري', 'محطة ساسكو'
    ],
  },
  {
    id: 'celebs',
    name: 'شخصيات ومسلسلات',
    icon: '🎬',
    words: [
      'طاش ما طاش', 'شباب البومب', 'باب الحارة', 'الدحيح', 'كريستيانو رونالدو',
      'ليونيل ميسي', 'سالم الدوسري', 'نيمار', 'ناصر القصبي', 'عبدالله السدحان'
    ],
  },
];

const SUGGESTED_QUESTIONS = [
  'هل هذا الشيء ينفع تشتريه هدية لواحد توك متعرف عليه؟',
  'متى آخر مرة شفت أو استخدمت هذا الشيء؟',
  'هل تلاقيه عادة في بيت جدتك؟',
  'كم سعره تقريباً؟ غالي ولا بريالين؟',
  'لو شفته قدامك في الشارع وش بتكون ردة فعلك؟',
  'هل يناسب الصغار ولا للكبار فقط؟',
  'لو انقطع هذا الشيء من العالم وش بيصير؟',
  'هل تحتاجه في الصيف أكثر ولا في الشتاء؟',
  'وش أول حرف يجي في بالك لو تبي تلمّح عنه؟',
];

interface BarraAlSalfaGameProps {
  players: Player[];
  onBack: () => void;
  onOpenRules: () => void;
  onUpdatePlayerName?: (id: string, name: string) => void;
}

type Stage = 'SETUP' | 'REVEAL' | 'QUESTIONS' | 'VOTING' | 'RESULT' | 'SPY_GUESS';

export const BarraAlSalfaGame: React.FC<BarraAlSalfaGameProps> = ({ players, onBack, onOpenRules, onUpdatePlayerName }) => {
  const [stage, setStage] = useState<Stage>('SETUP');
  const [selectedCategory, setSelectedCategory] = useState<Category>(CATEGORIES[0]);
  const [activePlayerNames, setActivePlayerNames] = useState<string[]>(() => {
    return players.slice(0, 5).map((p) => p.name);
  });
  const [secretWord, setSecretWord] = useState<string>('');
  const [spyIndex, setSpyIndex] = useState<number>(0);
  const [revealIndex, setRevealIndex] = useState<number>(0);
  const [isSecretVisible, setIsSecretVisible] = useState<boolean>(false);
  const [timerSeconds, setTimerSeconds] = useState<number>(120);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [randomQuestion, setRandomQuestion] = useState<string>('');
  const [votedIndex, setVotedIndex] = useState<number | null>(null);
  const [spyGuessOptions, setSpyGuessOptions] = useState<string[]>([]);
  const [scores, setScores] = useState<Record<string, number>>({});

  // Start new round
  const startNewGame = () => {
    soundManager.playClick();
    if (activePlayerNames.length < 3) return;

    // Pick random secret word
    const wordList = selectedCategory.words;
    const word = wordList[Math.floor(Math.random() * wordList.length)];
    const chosenSpy = Math.floor(Math.random() * activePlayerNames.length);

    setSecretWord(word);
    setSpyIndex(chosenSpy);
    setRevealIndex(0);
    setIsSecretVisible(false);
    setStage('REVEAL');
    setTimerSeconds(120);
    setIsTimerRunning(false);
    setVotedIndex(null);
    setRandomQuestion(SUGGESTED_QUESTIONS[0]);

    // Prepare 4 choices for spy guess
    const otherWords = wordList.filter((w) => w !== word);
    const shuffledOthers = [...otherWords].sort(() => 0.5 - Math.random()).slice(0, 3);
    const choices = [word, ...shuffledOthers].sort(() => 0.5 - Math.random());
    setSpyGuessOptions(choices);
  };

  // Timer countdown
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            soundManager.playNightBell();
            setIsTimerRunning(false);
            return 0;
          }
          if (prev <= 5) {
            soundManager.playTick();
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerSeconds]);

  const handleNextReveal = () => {
    soundManager.playClick();
    setIsSecretVisible(false);
    if (revealIndex + 1 < activePlayerNames.length) {
      setRevealIndex(revealIndex + 1);
    } else {
      // Done revealing to everyone, start questions!
      setStage('QUESTIONS');
      setIsTimerRunning(true);
    }
  };

  const handleGetRandomQuestion = () => {
    soundManager.playClick();
    const q = SUGGESTED_QUESTIONS[Math.floor(Math.random() * SUGGESTED_QUESTIONS.length)];
    setRandomQuestion(q);
  };

  const handleVotePlayer = (idx: number) => {
    soundManager.playClick();
    setVotedIndex(idx);
    setStage('RESULT');

    const isSpyCaught = idx === spyIndex;
    if (isSpyCaught) {
      soundManager.playFanfare();
      // Caught! Spy gets guess
    } else {
      triggerConfetti();
      soundManager.playFanfare();
      // Imposter won! Add score
      const spyName = activePlayerNames[spyIndex];
      setScores((prev) => ({
        ...prev,
        [spyName]: (prev[spyName] || 0) + 100,
      }));
    }
  };

  const handleSpyGuess = (guessedWord: string) => {
    soundManager.playClick();
    const spyName = activePlayerNames[spyIndex];
    if (guessedWord === secretWord) {
      // Spy guessed correctly! Steal victory
      triggerConfetti();
      soundManager.playFanfare();
      setScores((prev) => ({
        ...prev,
        [spyName]: (prev[spyName] || 0) + 150,
      }));
      setStage('RESULT');
    } else {
      // Spy failed! Innocent group wins
      triggerConfetti();
      soundManager.playFanfare();
      activePlayerNames.forEach((name, i) => {
        if (i !== spyIndex) {
          setScores((prev) => ({
            ...prev,
            [name]: (prev[name] || 0) + 50,
          }));
        }
      });
      setStage('RESULT');
    }
  };

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
            <h2 className="text-lg sm:text-xl font-black text-amber-400">لعبة برا السالفة (Out of the Loop)</h2>
            <p className="text-xs text-stone-400 hidden sm:block">لعبة الشك والتلميحات والضحك لجلسات الأصدقاء</p>
          </div>
        </div>

        <button
          onClick={onOpenRules}
          title="شرح قوانين برا السالفة"
          className="p-2 text-stone-400 hover:text-white bg-stone-800 hover:bg-stone-700 rounded-xl transition-colors"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
      </div>

      {/* STAGE 1: SETUP */}
      {stage === 'SETUP' && (
        <div className="w-full max-w-2xl bg-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-8 flex flex-col gap-6 shadow-2xl">
          <div>
            <h3 className="text-xl font-black text-stone-100 mb-1">إعداد الجولة الجديدة</h3>
            <p className="text-xs text-stone-400">اختر تصنيف السالفة وتأكد من أسماء الحضور (3 إلى 8 لاعبين)</p>
          </div>

          {/* Categories Grid */}
          <div>
            <label className="text-xs font-bold text-stone-300 block mb-2">تصنيف السالفة:</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    soundManager.playClick();
                    setSelectedCategory(cat);
                  }}
                  className={`p-3 rounded-2xl border text-right flex items-center gap-3 transition-all ${
                    selectedCategory.id === cat.id
                      ? 'bg-amber-950/60 border-amber-400 shadow-md ring-1 ring-amber-400/50'
                      : 'bg-stone-950 border-stone-850 hover:bg-stone-800'
                  }`}
                >
                  <span className="text-2xl">{cat.icon}</span>
                  <div>
                    <div className="text-sm font-bold text-stone-200">{cat.name}</div>
                    <div className="text-[11px] text-stone-500">{cat.words.length} كلمة سرية جاهزة</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Players in Gathering & Count Selector */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-2.5">
              <label className="text-xs font-bold text-stone-300">عدد وأسماء اللاعبين (3 إلى 8 لاعبين):</label>
              <div className="flex items-center gap-1 bg-stone-950 p-1 rounded-xl border border-stone-800">
                {[3, 4, 5, 6, 7, 8].map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => {
                      soundManager.playClick();
                      const currentNames = [...activePlayerNames];
                      if (count > currentNames.length) {
                        for (let i = currentNames.length; i < count; i++) {
                          currentNames.push(players[i]?.name || `اللاعب ${i + 1}`);
                        }
                      } else {
                        currentNames.length = count;
                      }
                      setActivePlayerNames(currentNames);
                    }}
                    className={`px-2.5 py-1 text-xs font-black rounded-lg transition-all ${
                      activePlayerNames.length === count
                        ? 'bg-amber-500 text-stone-950 shadow-sm'
                        : 'text-stone-400 hover:text-white'
                    }`}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {activePlayerNames.map((name, idx) => (
                <div
                  key={idx}
                  className="px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs font-bold text-stone-300 flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-amber-400 font-bold">{idx + 1}.</span>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => {
                        const updated = [...activePlayerNames];
                        updated[idx] = e.target.value;
                        setActivePlayerNames(updated);
                        if (players[idx] && onUpdatePlayerName) {
                          onUpdatePlayerName(players[idx].id, e.target.value);
                        }
                      }}
                      className="bg-transparent border-none text-xs font-bold text-stone-100 focus:outline-none flex-1"
                      placeholder={`اللاعب ${idx + 1}`}
                    />
                  </div>
                  {activePlayerNames.length > 3 && (
                    <button
                      type="button"
                      onClick={() => {
                        soundManager.playClick();
                        setActivePlayerNames(activePlayerNames.filter((_, i) => i !== idx));
                      }}
                      title="حذف هذا اللاعب من الجولة"
                      className="text-stone-500 hover:text-red-400 font-bold px-1"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={startNewGame}
            disabled={activePlayerNames.length < 3}
            className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-base rounded-2xl shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Play className="w-5 h-5 fill-stone-950" />
            بدء كشف السالفة (مرر الجوال)
          </button>
        </div>
      )}

      {/* STAGE 2: PASS & REVEAL */}
      {stage === 'REVEAL' && (
        <div className="w-full max-w-md bg-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-8 flex flex-col items-center text-center shadow-2xl">
          <div className="text-xs font-bold text-stone-500 mb-2">
            اللاعب ({revealIndex + 1} من {activePlayerNames.length})
          </div>

          <h3 className="text-2xl font-black text-amber-400 mb-1">
            مرر الجوال إلى {activePlayerNames[revealIndex]}
          </h3>
          <p className="text-xs text-stone-400 mb-6">
            لا تجعل أحداً يرى شاشتك! اضغط للكشف عن دورك ثم احفظ السالفة.
          </p>

          {/* Secret Reveal Card */}
          <div className="w-full min-h-[180px] bg-stone-950 border-2 border-dashed border-stone-800 rounded-2xl p-5 flex flex-col items-center justify-center relative mb-6">
            {isSecretVisible ? (
              revealIndex === spyIndex ? (
                <div className="animate-in fade-in zoom-in-95 duration-200">
                  <div className="text-4xl mb-2">🕵️‍♂️</div>
                  <h4 className="text-xl font-black text-red-500 mb-1">أنت برا السالفة!</h4>
                  <p className="text-xs text-stone-400 max-w-xs">
                    ما تدري وش السالفة! استمع لأسئلة وأجوبة أصحابك، تظاهر أنك فاهم وما تنكشف!
                  </p>
                </div>
              ) : (
                <div className="animate-in fade-in zoom-in-95 duration-200">
                  <div className="text-4xl mb-2">🟢</div>
                  <span className="text-xs text-emerald-400 font-bold block mb-1">أنت داخل السالفة:</span>
                  <h4 className="text-2xl font-black text-stone-100">{secretWord}</h4>
                  <p className="text-[11px] text-stone-500 mt-2">التصنيف: {selectedCategory.name}</p>
                </div>
              )
            ) : (
              <div className="flex flex-col items-center text-stone-500">
                <EyeOff className="w-10 h-10 mb-2 opacity-50" />
                <span className="text-xs font-bold">المحتوى مخفي لحفظ السرية</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="w-full flex flex-col gap-3">
            {!isSecretVisible ? (
              <button
                onClick={() => {
                  soundManager.playClick();
                  setIsSecretVisible(true);
                }}
                className="w-full py-3 bg-stone-800 hover:bg-stone-700 text-stone-100 font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Eye className="w-4 h-4 text-amber-400" />
                اضغط لرؤية السالفة
              </button>
            ) : (
              <button
                onClick={handleNextReveal}
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black rounded-xl transition-all shadow-lg cursor-pointer"
              >
                {revealIndex + 1 < activePlayerNames.length ? 'تم الحفظ! مرر للاعب التالي ←' : 'الجميع جاهز! ابدأ جولة الأسئلة ←'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* STAGE 3: QUESTIONS & TIMER */}
      {stage === 'QUESTIONS' && (
        <div className="w-full max-w-2xl bg-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-8 flex flex-col items-center shadow-2xl">
          <div className="w-full flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-stone-400">التصنيف الحالي: {selectedCategory.name}</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-amber-400 tabular-nums">
                ⏳ {Math.floor(timerSeconds / 60)}:{(timerSeconds % 60).toString().padStart(2, '0')}
              </span>
            </div>
          </div>

          <h3 className="text-2xl font-black text-stone-100 mb-2">وقت الأسئلة والشك!</h3>
          <p className="text-xs text-stone-400 text-center max-w-md mb-6">
            كل لاعب يسأل اللاعب اللي جنبه سؤالاً ذكياً وغير مباشر عن السالفة. الجاسوس يحاول يلف ويدور!
          </p>

          {/* Random Question Card */}
          <div className="w-full bg-stone-950 border border-amber-500/30 rounded-2xl p-5 mb-6 text-center">
            <span className="text-[11px] font-bold text-amber-400 block mb-1">💡 فكرة سؤال مقترح:</span>
            <p className="text-base sm:text-lg font-black text-stone-200 mb-3">{randomQuestion}</p>
            <button
              onClick={handleGetRandomQuestion}
              className="px-3.5 py-1.5 text-xs font-bold bg-stone-900 hover:bg-stone-800 text-stone-300 rounded-xl transition-colors border border-stone-800"
            >
              سؤال آخر 🔄
            </button>
          </div>

          <div className="w-full flex gap-3">
            <button
              onClick={() => {
                soundManager.playClick();
                setIsTimerRunning(!isTimerRunning);
              }}
              className="py-3 px-5 bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold rounded-xl transition-colors text-xs"
            >
              {isTimerRunning ? 'إيقاف المؤقت' : 'استئناف المؤقت'}
            </button>
            <button
              onClick={() => {
                soundManager.playClick();
                setIsTimerRunning(false);
                setStage('VOTING');
              }}
              className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black rounded-xl transition-colors shadow-lg"
            >
              انتقل للتصويت والاتهام! 🎯
            </button>
          </div>
        </div>
      )}

      {/* STAGE 4: VOTING */}
      {stage === 'VOTING' && (
        <div className="w-full max-w-2xl bg-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-8 flex flex-col items-center shadow-2xl">
          <h3 className="text-2xl font-black text-amber-400 mb-1">مين اللي برا السالفة؟</h3>
          <p className="text-xs text-stone-400 text-center mb-6">
            تشاوروا وصوتوا على الشخص اللي تشكون إنه يلف ويدور وما يدري وش السالفة!
          </p>

          <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            {activePlayerNames.map((name, idx) => (
              <button
                key={idx}
                onClick={() => handleVotePlayer(idx)}
                className="p-4 rounded-2xl bg-stone-950 border border-stone-800 hover:border-amber-400 hover:bg-amber-950/40 text-stone-200 font-black text-base flex items-center justify-between transition-all group"
              >
                <span>{name}</span>
                <span className="text-xs text-stone-500 group-hover:text-amber-400">اتهم هذا اللاعب 👈</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* STAGE 5: RESULT */}
      {stage === 'RESULT' && votedIndex !== null && (
        <div className="w-full max-w-md bg-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-8 flex flex-col items-center text-center shadow-2xl">
          {votedIndex === spyIndex ? (
            <div>
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-3 border border-emerald-500/30">
                <Trophy className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-black text-emerald-400 mb-1">كفووو! كشفتم الجاسوس!</h3>
              <p className="text-sm font-bold text-stone-200 mb-2">
                بالفعل كان <span className="text-amber-400 font-black">{activePlayerNames[spyIndex]}</span> هو اللي برا السالفة!
              </p>
              <div className="bg-stone-950 p-3 rounded-xl border border-stone-800 my-4 text-xs text-stone-400">
                السالفة الحقيقية كانت: <b className="text-stone-100">{secretWord}</b>
              </div>

              {/* Spy final guess bonus button */}
              <button
                onClick={() => setStage('SPY_GUESS')}
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black rounded-xl transition-colors mb-3 shadow-lg"
              >
                فرصة أخيرة للجاسوس لتخمين الكلمة وسرقة الفوز! 🕵️‍♂️
              </button>
            </div>
          ) : (
            <div>
              <div className="w-16 h-16 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mx-auto mb-3 border border-red-500/30">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-black text-red-400 mb-1">ضحك عليكم الجاسوس! 😂</h3>
              <p className="text-sm text-stone-300 mb-2">
                اتهمتم <b className="text-stone-100">{activePlayerNames[votedIndex]}</b> وهو بريء تماماً!
              </p>
              <div className="bg-stone-950 p-4 rounded-xl border border-stone-800 my-4 text-xs space-y-1">
                <div>الجاسوس الحقيقي كان: <b className="text-amber-400">{activePlayerNames[spyIndex]}</b> 🕵️‍♂️</div>
                <div>السالفة كانت: <b className="text-stone-100">{secretWord}</b></div>
              </div>
            </div>
          )}

          <div className="w-full flex gap-3 mt-4">
            <button
              onClick={() => setStage('SETUP')}
              className="flex-1 py-3 bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold rounded-xl transition-colors text-xs"
            >
              جولة جديدة
            </button>
            <button
              onClick={onBack}
              className="flex-1 py-3 bg-stone-950 hover:bg-stone-850 text-stone-400 font-bold rounded-xl transition-colors text-xs border border-stone-800"
            >
              القائمة الرئيسية
            </button>
          </div>
        </div>
      )}

      {/* STAGE 6: SPY GUESS */}
      {stage === 'SPY_GUESS' && (
        <div className="w-full max-w-md bg-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-8 flex flex-col items-center text-center shadow-2xl">
          <span className="text-xs font-bold text-amber-400 mb-1">تحدي الجاسوس</span>
          <h3 className="text-2xl font-black text-stone-100 mb-2">وش كانت السالفة يا {activePlayerNames[spyIndex]}؟</h3>
          <p className="text-xs text-stone-400 mb-6">
            لو خمّنت الكلمة الصحيحة، تسرق الفوز والنقاط من كل أصحابك!
          </p>

          <div className="w-full space-y-2.5 mb-6">
            {spyGuessOptions.map((opt, i) => (
              <button
                key={i}
                onClick={() => handleSpyGuess(opt)}
                className="w-full py-3.5 px-4 bg-stone-950 hover:bg-amber-950/60 border border-stone-800 hover:border-amber-400 rounded-xl font-black text-stone-200 text-sm transition-all"
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
