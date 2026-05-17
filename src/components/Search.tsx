import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search as SearchIcon, X, Music, Play, Loader2, AlertCircle, ListMusic, Clock, ListPlus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../store';
import { SongMetadata } from '../types';
import { PlaylistMenuBtn } from './PlaylistMenuBtn';

function formatDur(secs: number) {
  if (!secs) return '';
  return `${Math.floor(secs / 60)}:${(secs % 60).toString().padStart(2, '0')}`;
}

const RECENT_KEY = 'youwe_recent_searches';
const loadRecentSearches = (): string[] => {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch { return []; }
};
const saveRecentSearch = (q: string) => {
  try {
    const existing = loadRecentSearches().filter(s => s !== q);
    localStorage.setItem(RECENT_KEY, JSON.stringify([q, ...existing].slice(0, 8)));
  } catch { /* ignore */ }
};

export function Search({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SongMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const { setCurrentSong, setRoomState, addToQueue, playNext, addToast } = useStore();

  useEffect(() => {
    if (isOpen) setRecentSearches(loadRecentSearches());
  }, [isOpen]);

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) { setResults([]); setError(null); return; }

    // Cancel any in-flight request
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`, {
        signal: abortRef.current.signal,
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `Server returned ${response.status}`);
      }
      const data = await response.json();
      setResults(data);
      saveRecentSearch(searchQuery.trim());
      setRecentSearches(loadRecentSearches());
    } catch (err: unknown) {
      if ((err as Error).name === 'AbortError') return; // cancelled — ignore
      setError(`Search failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleQueryChange = (newQuery: string) => {
    setQuery(newQuery);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => performSearch(newQuery), 350);
  };

  const selectSong = (song: SongMetadata) => {
    setCurrentSong(song);
    onClose();
  };

  // Cleanup on unmount
  useEffect(() => () => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    abortRef.current?.abort();
  }, []);

  // Keyboard shortcut — Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (!isOpen) onClose(); // trigger open via parent (called from App)
      }
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-3 bg-black/70 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: -10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: -10 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="w-full max-w-2xl glass rounded-2xl overflow-hidden shadow-2xl border border-white/10"
          >
            {/* Input */}
            <div className="p-3 sm:p-4 border-b border-white/10 flex items-center gap-2 sm:gap-3">
              <SearchIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white/40 shrink-0" />
              <input
                autoFocus
                placeholder="Search for tracks, artists, genres..."
                className="flex-1 bg-transparent border-none outline-none text-sm sm:text-base placeholder:text-white/20"
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
              />
              {query && (
                <button onClick={() => { setQuery(''); setResults([]); }} className="text-white/30 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              )}
              <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors text-white/40">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Results area */}
            <div className="max-h-[55vh] overflow-y-auto custom-scrollbar">
              {loading ? (
                <div className="p-10 flex flex-col items-center gap-3 text-white/40">
                  <Loader2 className="w-7 h-7 animate-spin" />
                  <p className="text-xs font-medium">Scanning the soundscape...</p>
                </div>
              ) : error ? (
                <div className="p-8 flex flex-col items-center gap-3 text-center">
                  <AlertCircle className="w-7 h-7 text-red-400" />
                  <p className="text-xs text-red-400 font-medium max-w-sm">{error}</p>
                </div>
              ) : results.length > 0 ? (
                <div className="p-2 space-y-0.5">
                  {results.map((song, index) => (
                    <div
                      key={`${song.id}-${index}`}
                      onClick={() => selectSong(song)}
                      className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-white/5 group transition-colors cursor-pointer"
                    >
                      <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg bg-white/5 overflow-hidden flex-shrink-0 shadow-lg">
                        {song.thumbnail
                          ? <img src={song.thumbnail} alt={song.title} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center"><Music className="w-4 h-4 text-white/20" /></div>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] sm:text-sm font-bold truncate group-hover:text-void-accent transition-colors">{song.title}</p>
                        <p className="text-[9px] sm:text-[11px] text-white/30 truncate">
                          {song.artist}
                          {song.duration > 0 && <span className="ml-2 text-white/20">{formatDur(song.duration)}</span>}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => { playNext(song); addToast(`"${song.title}" will play next`, 'success'); }}
                          className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 text-white/30 hover:text-void-accent hover:bg-void-accent/10 transition-all active:scale-90 border border-white/5"
                          title="Play Next"
                        >
                          <ListPlus className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => { addToQueue(song); addToast(`"${song.title}" added to queue`, 'info'); }}
                          className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 text-white/30 hover:text-white hover:bg-white/10 transition-all active:scale-90 border border-white/5"
                          title="Add to Queue"
                        >
                          <ListMusic className="w-3.5 h-3.5" />
                        </button>
                        <PlaylistMenuBtn song={song} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : query && !loading ? (
                <div className="p-12 text-center">
                  <p className="text-white/20 text-sm">No results for "<span className="text-white/40">{query}</span>"</p>
                </div>
              ) : (
                /* Recent searches when empty */
                <div className="p-3">
                  {recentSearches.length > 0 ? (
                    <>
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/25 px-2 mb-2">Recent Searches</p>
                      {recentSearches.map((s, i) => (
                        <button
                          key={i}
                          onClick={() => { setQuery(s); performSearch(s); }}
                          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/5 transition-colors text-left"
                        >
                          <Clock className="w-3.5 h-3.5 text-white/20 shrink-0" />
                          <span className="text-[12px] text-white/50 truncate">{s}</span>
                        </button>
                      ))}
                    </>
                  ) : (
                    <div className="py-8 text-center text-white/20">
                      <SearchIcon className="w-8 h-8 mx-auto mb-2 opacity-20" />
                      <p className="text-sm">Type to search the Void</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-2.5 bg-white/[0.02] border-t border-white/5 flex justify-between items-center px-4">
              <div className="flex gap-3 text-[9px] text-white/20 uppercase tracking-widest font-bold">
                <span>⌘K to open</span>
                <span>ESC to close</span>
                <span>Click to play</span>
              </div>
              <div className="text-[9px] text-void-accent/60 uppercase tracking-widest font-bold flex items-center gap-1">
                Live Search <div className="w-1 h-1 rounded-full bg-void-accent animate-pulse" />
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
