import React, { useState, useEffect } from 'react';
import { musicManager, MUSIC_TRACKS, MusicTrackId } from '../utils/audio';
import { Music, Play, Pause, Volume2, VolumeX, ChevronDown, Sparkles } from 'lucide-react';

export const MusicPlayerBar: React.FC = () => {
  const [musicState, setMusicState] = useState(() => musicManager.getState());
  const [isOpenMenu, setIsOpenMenu] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const unsub = musicManager.subscribe(() => {
      setMusicState(musicManager.getState());
    });
    return unsub;
  }, []);

  const currentTrackObj =
    MUSIC_TRACKS.find((t) => t.id === musicState.currentTrack) || MUSIC_TRACKS[0];

  const handleToggle = () => {
    musicManager.toggle();
  };

  const handleSelectTrack = (trackId: MusicTrackId) => {
    musicManager.setTrack(trackId);
    setIsOpenMenu(false);
    if (!musicState.isPlaying) {
      musicManager.play();
    }
  };

  return (
    <div className="fixed bottom-4 left-4 z-40 select-none">
      <div className="relative">
        {/* Track Selection Popover */}
        {isOpenMenu && (
          <div className="absolute bottom-full left-0 mb-2 w-64 bg-stone-900/95 backdrop-blur-md border border-stone-800 rounded-2xl p-2.5 shadow-2xl space-y-1 text-xs animate-in fade-in slide-in-from-bottom-2">
            <div className="px-2.5 py-1 text-[11px] font-bold text-stone-400 border-b border-stone-800 mb-1 flex items-center justify-between">
              <span>اختر نغمة الجلسة 🎵</span>
              <Sparkles className="w-3 h-3 text-amber-400" />
            </div>
            {MUSIC_TRACKS.map((t) => (
              <button
                key={t.id}
                onClick={() => handleSelectTrack(t.id)}
                className={`w-full text-right p-2 rounded-xl transition-all flex flex-col cursor-pointer ${
                  musicState.currentTrack === t.id
                    ? 'bg-amber-400/15 border border-amber-400/30 text-amber-300'
                    : 'hover:bg-stone-800 text-stone-300'
                }`}
              >
                <div className="font-bold flex items-center justify-between">
                  <span>{t.name}</span>
                  {musicState.currentTrack === t.id && (
                    <span className="text-[10px] text-amber-400 font-bold">الحالي ✓</span>
                  )}
                </div>
                <span className="text-[10px] text-stone-400 mt-0.5 line-clamp-1">
                  {t.description}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Main Music Capsule */}
        <div className="flex items-center gap-2 bg-stone-900/90 backdrop-blur-md border border-stone-800 hover:border-amber-500/40 rounded-2xl p-1.5 px-3 shadow-xl transition-all">
          {/* Play/Pause Button */}
          <button
            onClick={handleToggle}
            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
              musicState.isPlaying
                ? 'bg-amber-400 text-stone-950 shadow-md shadow-amber-400/20'
                : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
            }`}
            title={musicState.isPlaying ? 'إيقاف الموسيقى مؤقتاً' : 'تشغيل موسيقى الجلسة'}
          >
            {musicState.isPlaying ? (
              <Pause className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current ml-0.5" />
            )}
          </button>

          {/* Animated Equalizer Wave (when playing) */}
          <div className="flex items-end gap-0.5 h-4 w-4 shrink-0 px-0.5">
            <span
              className={`w-1 bg-amber-400 rounded-full transition-all duration-300 ${
                musicState.isPlaying ? 'h-4 animate-pulse' : 'h-1.5 opacity-40'
              }`}
            />
            <span
              className={`w-1 bg-amber-400 rounded-full transition-all duration-300 ${
                musicState.isPlaying ? 'h-2.5 animate-bounce' : 'h-1 opacity-40'
              }`}
            />
            <span
              className={`w-1 bg-amber-400 rounded-full transition-all duration-300 ${
                musicState.isPlaying ? 'h-3.5 animate-pulse' : 'h-2 opacity-40'
              }`}
            />
          </div>

          {/* Current Track Label & Selector */}
          <button
            onClick={() => setIsOpenMenu(!isOpenMenu)}
            className="flex items-center gap-1 text-xs font-bold text-stone-200 hover:text-amber-400 transition-colors py-1 cursor-pointer"
          >
            <span className="truncate max-w-[100px] sm:max-w-[130px]">{currentTrackObj.name}</span>
            <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
          </button>

          {/* Volume Control expander */}
          <div className="hidden sm:flex items-center gap-1.5 pl-1 border-r border-stone-800 mr-1">
            <button
              onClick={() => {
                if (musicState.volume > 0) {
                  musicManager.setVolume(0);
                } else {
                  musicManager.setVolume(0.35);
                }
              }}
              className="text-stone-400 hover:text-stone-200 p-1"
              title={musicState.volume === 0 ? 'إلغاء كتم الموسيقى' : 'كتم الموسيقى'}
            >
              {musicState.volume === 0 ? (
                <VolumeX className="w-3.5 h-3.5 text-stone-500" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 text-amber-400" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={musicState.volume}
              onChange={(e) => musicManager.setVolume(parseFloat(e.target.value))}
              className="w-14 h-1 bg-stone-700 rounded-lg appearance-none cursor-pointer accent-amber-400"
              title="مستوى صوت الموسيقى"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
