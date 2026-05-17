import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic2, X, Loader2, Music } from 'lucide-react';
import { useStore } from '../store';

export function LyricsPanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { currentSong } = useStore();
  const [lyrics, setLyrics] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !currentSong) return;

    const fetchLyrics = async () => {
      setLoading(true);
      setLyrics('');
      try {
        const response = await fetch(`/api/lyrics?title=${encodeURIComponent(currentSong.title)}&artist=${encodeURIComponent(currentSong.artist)}`);
        const data = await response.json();
        setLyrics(data.lyrics);
      } catch (err) {
        setLyrics('Could not load lyrics for this track. 🎤');
      } finally {
        setLoading(false);
      }
    };

    fetchLyrics();
  }, [currentSong?.id, isOpen]);

  // Scroll to top when song changes
  useEffect(() => {
    if (containerRef.current) containerRef.current.scrollTop = 0;
  }, [currentSong?.id]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 100 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed right-4 top-24 bottom-32 w-full max-w-[340px] z-[120] flex flex-col"
        >
          <div className="flex-1 glass-dark rounded-3xl border border-white/10 shadow-[0_30px_100px_rgba(0,0,0,0.7)] flex flex-col overflow-hidden backdrop-blur-3xl">
            {/* Header */}
            <div className="p-5 flex items-center justify-between border-b border-white/5 bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-void-accent/20 flex items-center justify-center text-void-accent">
                  <Mic2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white">Karaoke Mode</h3>
                  <p className="text-[9px] font-bold text-white/30 uppercase tracking-wider">Lyrics via YouWe</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/40"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div 
              ref={containerRef}
              className="flex-1 overflow-y-auto custom-scrollbar p-6 selection:bg-void-accent/30"
            >
              {!currentSong ? (
                <div className="h-full flex flex-col items-center justify-center text-center gap-4 text-white/20">
                  <Music className="w-10 h-10 opacity-10" />
                  <p className="text-sm font-bold uppercase tracking-widest">Select a song to see lyrics</p>
                </div>
              ) : loading ? (
                <div className="h-full flex flex-col items-center justify-center gap-4 text-white/30">
                  <Loader2 className="w-8 h-8 animate-spin" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Deciphering the Void...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="mb-8">
                    <h2 className="text-xl font-black tracking-tight text-white">{currentSong.title}</h2>
                    <p className="text-sm font-bold text-void-accent">{currentSong.artist}</p>
                  </div>
                  <div className="whitespace-pre-line text-lg font-bold leading-relaxed text-white/80 tracking-tight">
                    {lyrics}
                  </div>
                  <div className="h-20" /> {/* Spacer */}
                </div>
              )}
            </div>
            
            {/* Overlay Gradient at bottom */}
            <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
