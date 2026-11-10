import React, { useState } from 'react';
import { authService, AuthUser } from '../services/authService';
import { soundManager } from '../utils/audio';
import { X, Lock, User, Sparkles, Check, Eye, EyeOff, LogIn } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess?: (user: AuthUser) => void;
}

const AVATARS = ['😎', '🦁', '👑', '⚡', '💎', '🚀', '🎭', '🧙‍♂️', '🦊', '🏆', '🔥', '🎯'];

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const [name, setName] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [selectedAvatar, setSelectedAvatar] = useState<string>('😎');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanName = name.trim();
    const cleanPassword = password.trim();

    if (!cleanName) {
      setErrorMessage('يرجى كتابة اسمك');
      return;
    }
    if (!cleanPassword) {
      setErrorMessage('يرجى كتابة كلمة السر');
      return;
    }

    setIsLoading(true);
    soundManager.playClick();

    const res = await authService.login(cleanName, cleanPassword, selectedAvatar);
    setIsLoading(false);

    if (!res.success || !res.user) {
      soundManager.playBuzzer();
      setErrorMessage(res.error || 'فشل تسجيل الدخول، يرجى المحاولة مرة أخرى');
      return;
    }

    soundManager.playFanfare();
    setSuccessMessage(
      res.isNew
        ? `أهلاً بك يا ${res.user.name}! تم إنشاء حسابك بنجاح 🎉`
        : `أهلاً بعودتك يا ${res.user.name}! تم تسجيل الدخول بنجاح 👏`
    );

    if (onLoginSuccess) {
      onLoginSuccess(res.user);
    }

    setTimeout(() => {
      onClose();
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 font-cairo">
      <div className="bg-stone-900 border border-stone-800 rounded-3xl max-w-md w-full p-6 text-right space-y-5 shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-850 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <LogIn className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white">تسجيل الدخول</h3>
              <p className="text-[11px] text-stone-400">فقط ضع اسمك وكلمة السر للبدء</p>
            </div>
          </div>
          <button
            onClick={() => {
              soundManager.playClick();
              onClose();
            }}
            className="p-1.5 text-stone-400 hover:text-white rounded-xl hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Avatar selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-stone-300 block">اختر شخصيتك / الأفاتار:</label>
            <div className="grid grid-cols-6 gap-2 bg-stone-950 p-2.5 rounded-2xl border border-stone-850">
              {AVATARS.map((av) => (
                <button
                  key={av}
                  type="button"
                  onClick={() => {
                    soundManager.playClick();
                    setSelectedAvatar(av);
                  }}
                  className={`text-2xl p-1.5 rounded-xl transition-all cursor-pointer flex items-center justify-center ${
                    selectedAvatar === av
                      ? 'bg-amber-500 scale-110 shadow-md ring-2 ring-amber-300'
                      : 'hover:bg-stone-800 opacity-75 hover:opacity-100'
                  }`}
                >
                  {av}
                </button>
              ))}
            </div>
          </div>

          {/* Name Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-300 block flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-amber-400" />
              <span>الاسم:</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: محمد أو بو فهد..."
              className="w-full bg-stone-950 border border-stone-750 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-stone-100 placeholder-stone-600 outline-none transition-colors"
              autoFocus
              maxLength={25}
            />
          </div>

          {/* Password Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-300 block flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>كلمة السر:</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="أدخل كلمة السر الخاصة بك..."
                className="w-full bg-stone-950 border border-stone-750 focus:border-amber-400 rounded-xl px-3.5 py-2.5 pl-10 text-xs sm:text-sm text-stone-100 placeholder-stone-600 outline-none transition-colors"
                maxLength={30}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300 p-1 cursor-pointer"
                title={showPassword ? 'إخفاء' : 'إظهار'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[10px] text-stone-500">
              * إذا كان هذا أول دخول لك بهذا الاسم سيتم حفظه مع كلمة السر كحساب جديد تلقائياً.
            </p>
          </div>

          {/* Feedback Alerts */}
          {errorMessage && (
            <div className="p-3 bg-red-950/60 border border-red-500/40 rounded-xl text-red-300 text-xs font-bold animate-in fade-in">
              {errorMessage}
            </div>
          )}
          {successMessage && (
            <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs font-black animate-in fade-in flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 hover:from-amber-300 hover:to-amber-400 text-stone-950 font-black text-xs sm:text-sm rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4 fill-stone-950" />
            <span>{isLoading ? 'جاري التحقق...' : 'دخول / حفظ الحساب 🔑'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
