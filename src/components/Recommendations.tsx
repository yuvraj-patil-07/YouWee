import React, { useState, useEffect } from 'react';
import { ChevronDown, Clock3, ListPlus, Play, Sparkles } from 'lucide-react';
import { useStore } from '../store';
import { SongMetadata } from '../types';
import { PlaylistMenuBtn } from './PlaylistMenuBtn';

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '--:--';

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainingSeconds}`;
}

export function Recommendations() {
  const { currentSong, setCurrentSong, setRoomState, addToQueue, recommendations, setRecommendations } = useStore();
  const [loading, setLoading] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [isOpen, setIsOpen] = useState(true);

  const fetchRecommendations = async () => {
    if (!currentSong) return;
    setLoading(true);
    setUnavailable(false);
    try {
      const response = await fetch(`/api/recommendations?title=${encodeURIComponent(currentSong.title)}&artist=${encodeURIComponent(currentSong.artist)}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server returned ${response.status}`);
      }
      const data = await response.json();
      setRecommendations(data);
    } catch (err: unknown) {
      console.error('Recommendations error:', err);
      setRecommendations([]);
      setUnavailable(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentSong) {
      fetchRecommendations();
    } else {
      setRecommendations([]);
    }
  }, [currentSong?.id]);

  if (!currentSong && recommendations.length === 0 && !loading) return null;

  return (
    <div className="mb-5 mt-2 w-full max-w-3xl">
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/55 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
        <div className="flex h-14 w-full items-center gap-3 px-4 transition-colors hover:bg-white/[0.04]">
          <button
            type="button"
            onClick={() => setIsOpen((open) => !open)}
            className="flex flex-1 items-center gap-3 text-left outline-none"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white">
              <Sparkles className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] font-black uppercase tracking-[0.2em] text-white/80">Recommended Next</span>
              <span className="block truncate text-[10px] font-semibold text-white/40">
                {loading ? 'Finding tracks that fit the room' : `${recommendations.length} songs ready`}
              </span>
            </span>
            <ChevronDown className={`h-5 w-5 shrink-0 text-white/60 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>
          
          <button
            onClick={(e) => { e.stopPropagation(); fetchRecommendations(); }}
            disabled={loading}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/40 transition-all hover:text-white hover:bg-white/10 active:scale-90 disabled:opacity-30"
            title="Refresh recommendations"
          >
            <svg className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {isOpen && (
          <div className="border-t border-white/10 bg-white/[0.025]">
            {loading ? (
              <div className="space-y-2 p-3">
                {Array(5).fill(0).map((_, i) => (
                  <div key={i} className="flex h-16 items-center gap-4 rounded-xl bg-white/[0.04] px-3">
                    <div className="h-11 w-11 shrink-0 animate-pulse rounded-lg bg-white/10" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="h-3 w-3/4 animate-pulse rounded bg-white/10" />
                      <div className="h-2 w-1/3 animate-pulse rounded bg-white/10" />
                    </div>
                  </div>
                ))}
              </div>
            ) : unavailable ? (
              <div className="px-5 py-4 text-sm font-semibold text-white/45">
                Recommendations are unavailable right now.
              </div>
            ) : recommendations.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm font-semibold text-white/35 italic">
                Looking for similar vibes...
              </div>
            ) : (
              <div className="p-2">
                {recommendations.map((song, index) => (
                  <div
                    key={`${song.id}-${index}`}
                    onClick={() => {
                      setCurrentSong(song);
                    }}
                    className="group flex min-h-[56px] items-center gap-3 rounded-xl px-2 py-1.5 transition-colors hover:bg-white/[0.06] cursor-pointer"
                  >
                    <span className="w-5 shrink-0 text-center text-xs font-black text-white/25">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-neutral-900 shadow-lg">
                      <img src={song.thumbnail} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-white transition-colors group-hover:text-void-accent">{song.title}</p>
                      <p className="truncate text-xs font-medium text-white/40">{song.artist}</p>
                    </div>
                    <div className="hidden items-center gap-1 text-xs font-bold text-white/35 sm:flex">
                      <Clock3 className="h-3.5 w-3.5" />
                      <span>{formatDuration(song.duration)}</span>
                    </div>
                    <div className="flex shrink-0 items-center gap-2" onClick={e => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => addToQueue(song)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/80 transition-all hover:bg-white/10 active:scale-95"
                        title="Add to queue"
                      >
                        <ListPlus className="h-4 w-4" />
                      </button>
                      <PlaylistMenuBtn song={song} />
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentSong(song);
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-black transition-all hover:bg-white/90 active:scale-95"
                        title="Play now"
                      >
                        <Play className="h-4 w-4 fill-current" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
