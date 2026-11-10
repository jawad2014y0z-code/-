import React, { useState } from 'react';
import { Player } from '../types/game';
import { soundManager } from '../utils/audio';
import { X, Users, Plus, Trash2, Check, UserCheck, Sparkles } from 'lucide-react';

interface PlayersManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  players: Player[];
  onSavePlayers: (players: Player[]) => void;
}

const AVATAR_OPTIONS = ['😎', '🦁', '👑', '⚡', '🎯', '🔥', '🦅', '💎', '🚀', '🌟', '🎲', '🌙'];
const COLOR_OPTIONS = [
  '#ef4444', '#10b981', '#f59e0b', '#3b82f6',
  '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6'
];

export const PlayersManagerModal: React.FC<PlayersManagerModalProps> = ({
  isOpen,
  onClose,
  players,
  onSavePlayers,
}) => {
  const [currentList, setCurrentList] = useState<Player[]>(players);
  const [newName, setNewName] = useState('');

  if (!isOpen) return null;

  const handleAddPlayer = () => {
    if (!newName.trim() || currentList.length >= 8) return;
    soundManager.playClick();
    const newP: Player = {
      id: `p-${Date.now()}`,
      name: newName.trim(),
      avatar: AVATAR_OPTIONS[currentList.length % AVATAR_OPTIONS.length],
      color: COLOR_OPTIONS[currentList.length % COLOR_OPTIONS.length],
    };
    setCurrentList([...currentList, newP]);
    setNewName('');
  };

  const handleRemovePlayer = (id: string) => {
    if (currentList.length <= 2) return; // Keep at least 2 players
    soundManager.playClick();
    setCurrentList(currentList.filter((p) => p.id !== id));
  };

  const handleUpdateName = (id: string, name: string) => {
    setCurrentList(currentList.map((p) => (p.id === id ? { ...p, name } : p)));
  };

  const handleCycleAvatar = (id: string) => {
    soundManager.playClick();
    setCurrentList(
      currentList.map((p) => {
        if (p.id !== id) return p;
        const curIdx = AVATAR_OPTIONS.indexOf(p.avatar);
        const nextAvatar = AVATAR_OPTIONS[(curIdx + 1) % AVATAR_OPTIONS.length];
        return { ...p, avatar: nextAvatar };
      })
    );
  };

  const handleSave = () => {
    soundManager.playClick();
    onSavePlayers(currentList);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-stone-900 border border-stone-800 rounded-3xl max-w-lg w-full flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-amber-400">
            <UserCheck className="w-5 h-5" />
            <h3 className="text-lg font-black text-stone-100">اختيار وتعديل أسماء اللاعبين</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-white rounded-xl hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto max-h-[60vh] space-y-4">
          <div className="p-3 bg-amber-950/40 border border-amber-500/30 rounded-2xl text-xs text-amber-200 leading-relaxed">
            💡 <b>اكتب اسمك بنفسك</b> وأسماء أصحابك في الحقول أدناه. ستظهر الأسماء مباشرة في كافة الألعاب (لودو، جاكارو، كيرم، برا السالفة، والمافيا).
          </div>

          <div className="space-y-2.5">
            {currentList.map((p, idx) => (
              <div
                key={p.id}
                className="flex items-center gap-3 p-2.5 bg-stone-950 rounded-2xl border border-stone-800 hover:border-stone-700 transition-colors"
              >
                {/* Avatar changer button */}
                <button
                  type="button"
                  onClick={() => handleCycleAvatar(p.id)}
                  title="اضغط لتغيير الأيقونة"
                  className="text-lg w-10 h-10 flex items-center justify-center bg-stone-900 hover:bg-stone-800 rounded-xl border border-stone-700 cursor-pointer shrink-0 transition-transform active:scale-95"
                >
                  {p.avatar}
                </button>

                {/* Direct name input */}
                <div className="flex-1 flex flex-col">
                  <span className="text-[10px] font-bold text-stone-500">
                    اللاعب {idx + 1} ({idx === 0 ? 'أنت' : `اللاعب ${idx + 1}`}):
                  </span>
                  <input
                    type="text"
                    value={p.name}
                    onChange={(e) => handleUpdateName(p.id, e.target.value)}
                    className="w-full bg-transparent border-b border-stone-800 focus:border-amber-400 py-1 text-sm font-black text-stone-100 focus:outline-none"
                    placeholder="اكتب الاسم هنا..."
                  />
                </div>

                {/* Color preview */}
                <div
                  className="w-4 h-4 rounded-full shrink-0 shadow"
                  style={{ backgroundColor: p.color }}
                />

                {currentList.length > 2 && (
                  <button
                    onClick={() => handleRemovePlayer(p.id)}
                    title="حذف هذا اللاعب"
                    className="p-2 text-stone-500 hover:text-red-400 rounded-xl hover:bg-stone-900 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {currentList.length < 8 && (
            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-stone-800">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddPlayer()}
                placeholder="أضف لاعباً إضافياً..."
                className="flex-1 px-3.5 py-2.5 bg-stone-950 border border-stone-800 rounded-xl text-xs sm:text-sm font-bold text-stone-200 focus:border-amber-400 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddPlayer}
                disabled={!newName.trim()}
                className="px-4 py-2.5 bg-stone-800 hover:bg-stone-700 disabled:opacity-50 text-stone-200 font-black text-xs rounded-xl transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                إضافة
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-stone-950 border-t border-stone-800 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-stone-400 hover:text-stone-200 rounded-xl"
          >
            إلغاء
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs rounded-xl transition-colors flex items-center gap-1.5 shadow-lg cursor-pointer"
          >
            <Check className="w-4 h-4" />
            حفظ الأسماء
          </button>
        </div>
      </div>
    </div>
  );
};
