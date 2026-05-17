import React, { useState, useRef, useEffect } from 'react';
import { Plus, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../store';
import { SongMetadata } from '../types';

export function PlaylistMenuBtn({ song }: { song: SongMetadata }) {
  const [isOpen, setIsOpen] = useState(false);
  const { playlists, addSongToPlaylist, createPlaylist } = useStore();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  const handleAdd = (e: React.MouseEvent, playlistId: string) => {
    e.stopPropagation();
    addSongToPlaylist(playlistId, song);
    setIsOpen(false);
  };

  const handleCreateAndAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    const name = `My Playlist ${playlists.length + 1}`;
    const id = createPlaylist(name);
    addSongToPlaylist(id, song);
    setIsOpen(false);
  };

  return (
    <div ref={ref} className="relative" onClick={e => e.stopPropagation()}>
      <button
        onClick={(e) => { e.stopPropagation(); setIsOpen(o => !o); }}
        className={`flex h-7 w-7 items-center justify-center rounded-lg border transition-all active:scale-90
          ${isOpen ? 'border-void-accent/40 bg-void-accent/10 text-void-accent' : 'border-white/10 bg-white/5 text-white/40 hover:text-white hover:bg-white/10'}`}
        title="Add to playlist"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: -6 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute right-0 top-9 z-50 min-w-[180px] overflow-hidden rounded-xl border border-white/10 bg-black/90 shadow-[0_20px_60px_rgba(0,0,0,0.8)] backdrop-blur-2xl"
          >
            <div className="px-3 py-2 border-b border-white/5">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30">Add to Playlist</p>
            </div>

            <div className="max-h-48 overflow-y-auto custom-scrollbar p-1">
              {playlists.length === 0 ? (
                <div className="px-3 py-3 text-[11px] text-white/30 text-center">No playlists yet</div>
              ) : (
                playlists.map(pl => {
                  const alreadyAdded = pl.songs.some(s => s.id === song.id);
                  return (
                    <button
                      key={pl.id}
                      onClick={(e) => !alreadyAdded && handleAdd(e, pl.id)}
                      disabled={alreadyAdded}
                      className={`w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[11px] transition-colors
                        ${alreadyAdded ? 'opacity-50 cursor-default' : 'hover:bg-white/8 cursor-pointer'}`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: pl.accentColor || '#00d4ff' }} />
                      <span className="flex-1 font-semibold truncate text-white/80">{pl.name}</span>
                      {alreadyAdded
                        ? <Check className="w-3 h-3 text-green-400 shrink-0" />
                        : <span className="text-white/20 text-[9px]">{pl.songs.length}</span>
                      }
                    </button>
                  );
                })
              )}
            </div>

            <div className="border-t border-white/5 p-1">
              <button
                onClick={handleCreateAndAdd}
                className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-[11px] font-bold text-void-accent hover:bg-void-accent/10 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                New Playlist + Add
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
