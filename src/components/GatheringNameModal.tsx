import React, { useState } from 'react';
import { soundManager } from '../utils/audio';
import { X, Check, Sparkles, Edit3 } from 'lucide-react';

interface GatheringNameModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentName: string;
  onSaveName: (name: string) => void;
}

const POPULAR_SUGGESTIONS = [
  'جمعة الحبايب',
  'شلة الاستراحة',
  'ديوانية الأصدقاء',
  'سهرة الخميس',
  'مجلس النشامى',
  'أصحاب العمر',
  'لمة العائلة',
  'جمعة وناسة',
];

export const GatheringNameModal: React.FC<GatheringNameModalProps> = ({
  isOpen,
  onClose,
  currentName,
  onSaveName,
}) => {
  const [nameInput, setNameInput] = useState(currentName);

  if (!isOpen) return null;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!nameInput.trim()) return;
    soundManager.playClick();
    onSaveName(nameInput.trim());
    onClose();
  };

  const handleSelectSuggestion = (sug: string) => {
    soundManager.playClick();
    setNameInput(sug);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-stone-900 border border-stone-800 rounded-3xl max-w-md w-full flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-amber-400">
            <Edit3 className="w-5 h-5" />
            <h3 className="text-lg font-black text-stone-100">تسمية الجلسة</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-white rounded-xl hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          <div>
            <label className="text-xs font-bold text-stone-300 block mb-2">
              اكتب الاسم الذي تريده لموقعك وجلستكم:
            </label>
            <div className="relative">
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="مثال: شلة الاستراحة، جمعة الحبايب..."
                autoFocus
                className="w-full px-4 py-3 bg-stone-950 border border-stone-700 focus:border-amber-400 rounded-2xl text-stone-100 font-bold text-base focus:outline-none focus:ring-2 focus:ring-amber-400/20"
              />
            </div>
          </div>

          {/* Quick Suggestions */}
          <div>
            <span className="text-xs font-semibold text-stone-400 flex items-center gap-1 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              أو اختر من الاقتراحات السريعة:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {POPULAR_SUGGESTIONS.map((sug) => (
                <button
                  key={sug}
                  type="button"
                  onClick={() => handleSelectSuggestion(sug)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    nameInput === sug
                      ? 'bg-amber-500 text-stone-950 shadow-sm'
                      : 'bg-stone-950 hover:bg-stone-800 text-stone-300 border border-stone-850'
                  }`}
                >
                  {sug}
                </button>
              ))}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-stone-800/80 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-stone-400 hover:text-stone-200 rounded-xl"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={!nameInput.trim()}
              className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-950 font-black text-xs rounded-xl transition-colors flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <Check className="w-4 h-4" />
              تأكيد وتطبيق الاسم
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
