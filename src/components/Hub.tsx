import React, { useState, useEffect } from 'react';
import { GameId, GameInfo, Player } from '../types/game';
import { soundManager } from '../utils/audio';
import {
  Play,
  Users,
  Clock,
  Sparkles,
  BookOpen,
  ShieldCheck,
  Flame,
  Edit3,
  UserCheck,
  Globe,
  Lock,
  Zap,
  Radio,
  ArrowRight,
} from 'lucide-react';

interface HubProps {
  gatheringName: string;
  onOpenNameModal: () => void;
  onSelectGame: (game: GameId) => void;
  onOpenRules: (game?: GameId) => void;
  onOpenPlayers: () => void;
  players: Player[];
  onUpdatePlayerName: (id: string, name: string) => void;
  onOpenOnline: (tab?: 'public' | 'private') => void;
}

export const GAME_EMOJI_COVERS: Record<
  string,
  { emoji: string; title: string; subtitle: string; gradient: string; textColor: string }
> = {
  baloot: {
    emoji: '🃏',
    title: 'بلوت',
    subtitle: 'صن وحكم وصكة 152',
    gradient: 'from-emerald-950 via-stone-900 to-stone-950',
    textColor: 'text-emerald-400',
  },
  ludo: {
    emoji: '🎲',
    title: 'لودو',
    subtitle: 'سباق النرد وطرد الحبات',
    gradient: 'from-red-950 via-stone-900 to-amber-950',
    textColor: 'text-amber-400',
  },
  jackaroo: {
    emoji: '♠️',
    title: 'جاكارو',
    subtitle: 'أوراق وحبوب وتكتيك',
    gradient: 'from-blue-950 via-stone-900 to-stone-950',
    textColor: 'text-blue-400',
  },
  carrom: {
    emoji: '⚪',
    title: 'كيرم',
    subtitle: 'ضربات خشبية وملكة حمراء',
    gradient: 'from-amber-950 via-stone-900 to-stone-950',
    textColor: 'text-amber-400',
  },
  barra_alsalfa: {
    emoji: '🕵️‍♂️',
    title: 'برا السالفة',
    subtitle: 'من الجاسوس بينكم؟',
    gradient: 'from-amber-950 via-stone-900 to-stone-950',
    textColor: 'text-amber-400',
  },
  mafia: {
    emoji: '🔫',
    title: 'المافيا والمدينة',
    subtitle: 'ليل وغموض ومحاكمات',
    gradient: 'from-red-950 via-stone-950 to-stone-900',
    textColor: 'text-red-400',
  },
  taqtaqah: {
    emoji: '🤣',
    title: 'طقطقة',
    subtitle: 'قصف واعترافات وفضايح',
    gradient: 'from-amber-950 via-stone-900 to-red-950',
    textColor: 'text-amber-400',
  },
};

export const GAMES_CATALOG: GameInfo[] = [
  {
    id: 'baloot',
    title: 'بلوت (Baloot)',
    tagline: 'ملك ألعاب الورق الخليجية (4 لاعبين - لنا ولهم)',
    description: 'أقوى لعبة ورق استراتيجية سعودية وخليجية! صراع الصن والحكم، مشاريع سرا و50 ومية، حساب الأبناط والنشرة الحية وصولاً إلى 152 نقطة (الصكة).',
    minPlayers: 4,
    maxPlayers: 4,
    duration: '15-30 دقيقة',
    image: '',
    category: 'ورق واستراتيجية',
    tags: ['صن وحكم', 'لنا ولهم', 'مشاريع', 'أبناط'],
  },
  {
    id: 'ludo',
    title: 'لودو (Ludo)',
    tagline: 'سباق النرد وضرب الخصوم (2 إلى 4 لاعبين)',
    description: 'لعبة الطاولة الكلاسيكية بـ 4 ألوان، نرد متحرك بفيزياء سريعة، خانات نجوم آمنة، وطرد الحبات للقاعدة حتى خط النهاية.',
    minPlayers: 2,
    maxPlayers: 4,
    duration: '15-25 دقيقة',
    image: '',
    category: 'لوحية كلاسيكية',
    tags: ['نرد', 'طرد', 'حماس'],
  },
  {
    id: 'jackaroo',
    title: 'جاكارو (Jackaroo)',
    tagline: 'لعبة الأوراق والحبوب الشهيرة (2 أو 4 لاعبين)',
    description: 'أشهر لعبة لوحية جماعية بالأوراق! استخدم الآص، الشايب الحارق، الولد للتبديل، و4 للخلف لإيصال حبوبك لبر الأمان.',
    minPlayers: 2,
    maxPlayers: 4,
    duration: '20-30 دقيقة',
    image: '',
    category: 'تكتيك وأوراق',
    tags: ['بطاقات', 'تحدي', 'تخطيط'],
  },
  {
    id: 'carrom',
    title: 'كيرم (Carrom)',
    tagline: 'لعبة الخشب والضربات الدقيقة (2 إلى 4 لاعبين)',
    description: 'طاولة خشبية تفاعلية بفيزياء تصادم حقيقية تدعم 2 أو 3 أو 4 لاعبين، مضرب قابل للتوجيه وتحديد قوة الضربة، حبات بيضاء وسوداء والملكة الحمراء.',
    minPlayers: 2,
    maxPlayers: 4,
    duration: '15-25 دقيقة',
    image: '',
    category: 'فيزياء ومهارة',
    tags: ['2-4 لاعبين', 'ضربات', 'ملكة', 'تصويب'],
  },
  {
    id: 'barra_alsalfa',
    title: 'برا السالفة (Out of the Loop)',
    tagline: 'لعبة الشك والتمويه والتخمين (3 إلى 8 لاعبين)',
    description: 'الجميع يعرف السالفة السرية ما عدا الجاسوس! أسئلة مضحكة وذكية بتمرير الجوال لكشف من يلف ويدور، مع فرصة أخيرة للجاسوس لسرقة الفوز.',
    minPlayers: 3,
    maxPlayers: 8,
    duration: '10-15 دقيقة',
    image: '',
    category: 'جلسات وضحك',
    tags: ['جاسوس', 'أسئلة', 'ضحك'],
  },
  {
    id: 'mafia',
    title: 'المافيا (Mafia)',
    tagline: 'صراع البقاء مع راوٍ رقمي ذكي (4 إلى 8 لاعبين)',
    description: 'أمسية ليلية مثيرة بين عصابة المافيا والمواطنين الأبرياء والدكتور والمحقق. التطبيق يتولى إدارة الليل والنهار دون الحاجة لحكم خارج اللعب.',
    minPlayers: 4,
    maxPlayers: 8,
    duration: '15-30 دقيقة',
    image: '',
    category: 'أدوار سرية',
    tags: ['تحقيق', 'ليل ونهار', 'محاكمة'],
  },
  {
    id: 'taqtaqah',
    title: 'طقطقة (Taqtaqah)',
    tagline: 'لعبة القصف والاعترافات الفضائحية (3 إلى 8 لاعبين)',
    description: 'أقوى لعبة ضحك وتصويت صريح للجلسة! بطاقات مواقف قوية ومحرجة، تصويت فوري على الضحية، مع بطاقات "عقوبة طقطقة" خفيفة دم وتتويج لملك القصف.',
    minPlayers: 3,
    maxPlayers: 8,
    duration: '10-20 دقيقة',
    image: '',
    category: 'ضحك وقصف',
    tags: ['ضحك', 'اعترافات', 'عقوبات', 'تصويت'],
  },
];

export const Hub: React.FC<HubProps> = ({
  gatheringName,
  onOpenNameModal,
  onSelectGame,
  onOpenRules,
  onOpenPlayers,
  players,
  onUpdatePlayerName,
  onOpenOnline,
}) => {
  const [siteStats, setSiteStats] = useState<{ onlinePlayers: number; activeRooms: number }>({
    onlinePlayers: 1,
    activeRooms: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/stats');
        if (res.ok) {
          const data = await res.json();
          setSiteStats({
            onlinePlayers: data.onlinePlayers || 1,
            activeRooms: data.activeRooms || 0,
          });
        }
      } catch {
        // silent
      }
    };
    fetchStats();
    const interval = setInterval(fetchStats, 6000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-8">
      {/* Hero Banner Section */}
      <div className="relative rounded-3xl overflow-hidden border border-stone-800 bg-stone-900 shadow-2xl">
        <div className="relative h-64 sm:h-80 md:h-96 w-full">
          <img
            src="/src/assets/images/jumah_gathering_hero_1793281754686.jpg"
            alt="جلسة الأصدقاء في جمعة"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover brightness-75"
          />
          {/* Gradient Scrim for WCAG AA readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/60 to-transparent flex flex-col justify-end p-6 sm:p-10" />

          {/* Hero Content */}
          <div className="absolute inset-x-0 bottom-0 p-6 sm:p-10 flex flex-col items-start gap-3 z-10 text-right">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-400 bg-amber-950/70 border border-amber-500/40 px-3 py-1 rounded-lg backdrop-blur-sm">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span>ألعاب الجلسة والبيت في مكان واحد</span>
              </div>

              <button
                onClick={() => {
                  soundManager.playClick();
                  onOpenNameModal();
                }}
                className="flex items-center gap-1.5 text-xs font-bold text-stone-300 hover:text-white bg-stone-900/80 hover:bg-stone-800 border border-stone-700/80 px-2.5 py-1 rounded-lg backdrop-blur-sm transition-colors cursor-pointer"
              >
                <Edit3 className="w-3 h-3 text-amber-400" />
                <span>
                  تسمية الجلسة: <b>«{gatheringName}»</b>
                </span>
              </button>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-stone-100 tracking-tight leading-tight">
              {gatheringName} تحلى باللعب والتحدي!
            </h1>

            <p className="text-sm sm:text-base text-stone-300 max-w-2xl leading-relaxed">
              لودو، جاكارو، كيرم، المافيا، وبرا السالفة! العب محلياً على نفس الشاشة أو أونلاين عبر الغرفة التلقائية والغرف الخاصة برموز سريعة.
            </p>

            <div className="flex flex-wrap items-center gap-3 mt-2">
              <button
                onClick={() => {
                  soundManager.playClick();
                  onOpenOnline('public');
                }}
                className="px-6 py-3.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-stone-950 font-black text-sm rounded-xl transition-all shadow-lg flex items-center gap-2 cursor-pointer shadow-amber-400/20"
              >
                <Zap className="w-4 h-4 fill-stone-950" />
                دخول سريع (غرفة عامة تلقائية ⚡)
              </button>

              <button
                onClick={() => {
                  soundManager.playClick();
                  onOpenOnline('private');
                }}
                className="px-4 py-3.5 bg-stone-900/90 hover:bg-stone-850 text-amber-300 border border-amber-500/30 font-bold text-sm rounded-xl transition-all flex items-center gap-2 backdrop-blur-sm cursor-pointer"
              >
                <Lock className="w-4 h-4 text-amber-400" />
                غرفة خاصة بكود 🔒
              </button>

              <button
                onClick={() => {
                  soundManager.playClick();
                  onSelectGame('ludo');
                }}
                className="px-4 py-3.5 bg-stone-900/80 hover:bg-stone-800 text-stone-200 border border-stone-700 font-bold text-sm rounded-xl transition-all flex items-center gap-2 backdrop-blur-sm cursor-pointer"
              >
                <Play className="w-4 h-4 text-amber-400 fill-amber-400" />
                لعب محلي (أوفلاين)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Online Multiplayer Feature Highlights & Live Player Count */}
      <div className="bg-stone-900/95 border border-stone-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center">
              <Radio className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-black text-stone-100 flex items-center gap-2">
                <span>نظام اللعب أونلاين والغرف الحية</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold">
                  متصل ومباشر 🟢
                </span>
              </h3>
              <p className="text-xs text-stone-400">
                اختر الغرفة التلقائية للدخول مع أي لاعب متصل، أو أنشئ غرفة خاصة تتطلب كود للدخول
              </p>
            </div>
          </div>
        </div>

        {/* Live Site Stats Bar (معرفة عدد اللاعبين في الموقع) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 bg-stone-950 rounded-2xl border border-stone-800">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-3 w-3 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <div>
              <div className="text-[11px] text-stone-400">اللاعبون في الموقع الآن</div>
              <div className="text-base sm:text-lg font-black text-emerald-400">
                {siteStats.onlinePlayers} لاعبين متصلين
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center text-xs">
              🎲
            </div>
            <div>
              <div className="text-[11px] text-stone-400">الغرف النشطة بالموقع</div>
              <div className="text-base sm:text-lg font-black text-amber-300">
                {siteStats.activeRooms} غرف جارية
              </div>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2.5 col-span-1">
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center text-xs">
              ⚡
            </div>
            <div>
              <div className="text-[11px] text-stone-400">اتصال الخادم المباشر</div>
              <div className="text-xs font-bold text-blue-300">
                نشط ومستقر
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {/* Card 1: Public Auto-Match */}
          <div
            onClick={() => {
              soundManager.playClick();
              onOpenOnline('public');
            }}
            className="p-4 sm:p-5 rounded-2xl bg-stone-950 border border-stone-800 hover:border-amber-400/50 transition-all cursor-pointer group flex flex-col justify-between space-y-3"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-400/10 text-amber-400 border border-amber-400/20 font-bold">
                  الغرفة العامة التلقائية ⚡
                </span>
                <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  مطابقة فورية
                </span>
              </div>
              <h4 className="text-sm font-black text-stone-100 group-hover:text-amber-400 transition-colors">
                دخول سريع مع أي لاعب متصل
              </h4>
              <p className="text-xs text-stone-400 leading-relaxed">
                لو كنت تلعب وتريد الدخول مباشرة، اضغط هنا وسيدخلك النظام فوراً مع أي لاعب متاح أو يفتح طاولة عامة.
              </p>
            </div>

            <div className="pt-2 flex items-center gap-1.5 text-xs font-bold text-amber-400 group-hover:translate-x-[-4px] transition-transform">
              <span>ابدأ المطابقة الآن</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Card 2: Private Code Room */}
          <div
            onClick={() => {
              soundManager.playClick();
              onOpenOnline('private');
            }}
            className="p-4 sm:p-5 rounded-2xl bg-stone-950 border border-stone-800 hover:border-amber-400/50 transition-all cursor-pointer group flex flex-col justify-between space-y-3"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-stone-800 text-stone-300 border border-stone-700 font-bold">
                  الغرفة الخاصة 🔒
                </span>
                <span className="text-xs text-stone-400 font-medium">كود سري + باركود QR</span>
              </div>
              <h4 className="text-sm font-black text-stone-100 group-hover:text-amber-400 transition-colors">
                غرفة خاصة مغلقة تتطلب كود
              </h4>
              <p className="text-xs text-stone-400 leading-relaxed">
                أنشئ طاولة خاصة برمز سري مكون من 4 خانات لأصدقائك في الجلسة، مع رابط مباشر ومسح سريع بالكاميرا.
              </p>
            </div>

            <div className="pt-2 flex items-center gap-1.5 text-xs font-bold text-amber-400 group-hover:translate-x-[-4px] transition-transform">
              <span>إنشاء أو انضمام بكود</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </div>

      {/* Direct Inline Player Names Editor */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-3xl p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-black text-stone-100">
                اختر اسمك بنفسك وأسماء اللاعبين
              </h3>
              <p className="text-xs text-stone-400">
                اكتب اسمك واسم كل صديق في الخانات أدناه لتظهر مباشرة في جميع الألعاب
              </p>
            </div>
          </div>

          <button
            onClick={onOpenPlayers}
            className="px-3 py-1.5 text-xs font-bold text-amber-400 hover:text-amber-300 bg-stone-950 border border-stone-850 hover:border-amber-400/50 rounded-xl transition-colors self-start sm:self-auto flex items-center gap-1.5 cursor-pointer"
          >
            <Users className="w-3.5 h-3.5" />
            إدارة وإضافة لاعبين
          </button>
        </div>

        {/* Player Name Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {players.map((p, idx) => (
            <div
              key={p.id}
              className="p-3 bg-stone-950 rounded-2xl border border-stone-850 hover:border-amber-400/40 transition-colors flex items-center gap-3"
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0 border border-stone-700/60"
                style={{ backgroundColor: `${p.color}25` }}
              >
                {p.avatar}
              </div>

              <div className="flex-1 flex flex-col min-w-0">
                <span className="text-[10px] font-bold text-stone-500">
                  {idx === 0 ? 'اسمك (اللاعب 1):' : `اللاعب ${idx + 1}:`}
                </span>
                <input
                  type="text"
                  value={p.name}
                  onChange={(e) => onUpdatePlayerName(p.id, e.target.value)}
                  placeholder="اكتب اسم اللاعب..."
                  className="w-full bg-transparent border-b border-transparent hover:border-stone-700 focus:border-amber-400 text-xs sm:text-sm font-black text-stone-100 focus:outline-none transition-colors"
                />
              </div>

              <div
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: p.color }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Gathering Quick Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-stone-900/80 border border-stone-800 rounded-2xl flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-stone-200">من 2 إلى 8 لاعبين</h4>
            <p className="text-xs text-stone-400">لعب أونلاين عبر الغرف أو محلي على نفس الشاشة</p>
          </div>
        </div>

        <div className="p-4 bg-stone-900/80 border border-stone-800 rounded-2xl flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-stone-200">ألعاب تعمل فعلاً 100%</h4>
            <p className="text-xs text-stone-400">فيزياء كيرم حقيقية وقوانين لودو وجاكارو كاملة</p>
          </div>
        </div>

        <div className="p-4 bg-stone-900/80 border border-stone-800 rounded-2xl flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-stone-200">أنغام وموسيقى شرقية</h4>
            <p className="text-xs text-stone-400">موسيقى هادئة وحماسية ومؤثرات واقعية بدون إنترنت</p>
          </div>
        </div>
      </div>

      {/* Games Catalog Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-stone-100">اختر لعبة الجلسة</h2>
            <p className="text-xs text-stone-400">اضغط على أي لعبة للبدء فوراً دون تعقيد</p>
          </div>
          <button
            onClick={() => onOpenRules()}
            className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
          >
            <BookOpen className="w-4 h-4" />
            دليل القوانين لجميع الألعاب
          </button>
        </div>

        {/* 5 Games Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {GAMES_CATALOG.map((game) => {
            return (
              <div
                key={game.id}
                className="bg-stone-900 border border-stone-800 hover:border-amber-500/50 rounded-3xl overflow-hidden shadow-xl flex flex-col justify-between transition-all group"
              >
                <div>
                  {/* Thematic Emoji Cover for all games */}
                  <div className="relative h-44 w-full bg-stone-950 overflow-hidden flex items-center justify-center">
                    {(() => {
                      const cover = GAME_EMOJI_COVERS[game.id] || {
                        emoji: '🎮',
                        title: game.title,
                        subtitle: game.tagline,
                        gradient: 'from-stone-900 to-stone-950',
                        textColor: 'text-amber-400',
                      };
                      return (
                        <div
                          className={`w-full h-full bg-gradient-to-br ${cover.gradient} flex flex-col items-center justify-center p-4 text-center group-hover:scale-105 transition-transform duration-300 select-none`}
                        >
                          <span className="text-5xl mb-2 drop-shadow-md group-hover:scale-110 transition-transform">
                            {cover.emoji}
                          </span>
                          <span className={`text-lg font-black ${cover.textColor}`}>
                            {cover.title}
                          </span>
                          <span className="text-xs text-stone-400">{cover.subtitle}</span>
                        </div>
                      );
                    })()}

                    <div className="absolute top-3 right-3 bg-stone-950/80 backdrop-blur-md px-2.5 py-1 rounded-lg text-[10px] font-bold text-amber-400 border border-stone-800">
                      {game.category}
                    </div>
                  </div>

                  {/* Body Info */}
                  <div className="p-5 space-y-3">
                    <div>
                      <h3 className="text-lg font-black text-stone-100 group-hover:text-amber-400 transition-colors">
                        {game.title}
                      </h3>
                      <p className="text-xs font-semibold text-amber-400/90">{game.tagline}</p>
                    </div>

                    <p className="text-xs text-stone-400 leading-relaxed line-clamp-2">
                      {game.description}
                    </p>

                    {/* Metadata unboxed with separators */}
                    <div className="flex items-center gap-2 text-xs text-stone-400 pt-1">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-stone-400" />
                        {game.minPlayers} - {game.maxPlayers} لاعبين
                      </span>
                      <span aria-hidden="true" className="text-stone-600">
                        ·
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-stone-400" />
                        {game.duration}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="p-5 pt-0 flex items-center gap-2">
                  <button
                    onClick={() => {
                      soundManager.playClick();
                      onSelectGame(game.id);
                    }}
                    className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs rounded-xl transition-colors shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-stone-950" />
                    العب محلياً
                  </button>
                  <button
                    onClick={() => {
                      soundManager.playClick();
                      onOpenOnline('public');
                    }}
                    className="px-3 py-2.5 bg-stone-800 hover:bg-stone-750 text-amber-400 border border-amber-500/20 font-bold text-xs rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                    title="العب أونلاين"
                  >
                    <Radio className="w-3.5 h-3.5 text-amber-400" />
                    <span>أونلاين</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
