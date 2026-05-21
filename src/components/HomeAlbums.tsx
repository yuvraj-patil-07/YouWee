import React, { useState, useEffect } from 'react';
import { Clock3, ListPlus, Play, Sparkles, Loader2, ArrowLeft, ListMusic } from 'lucide-react';
import { useStore } from '../store';
import { SongMetadata } from '../types';
import { PlaylistMenuBtn } from './PlaylistMenuBtn';

interface HomeCategory {
  id: string;
  title: string;
  songs: SongMetadata[];
}

export function HomeAlbums() {
  const { setCurrentSong, setRoomState, addToQueue, playNext, setQueue, currentSong, recentlyPlayed, addToast } = useStore();
  const [categories, setCategories] = useState<HomeCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<HomeCategory | null>(null);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  useEffect(() => {
    const cachedHome = localStorage.getItem('youwe_home_cache');
    if (cachedHome) {
      try {
        setCategories(JSON.parse(cachedHome));
        setLoading(false);
      } catch (e) {
        console.error('Failed to parse cached home feed');
      }
    }

    const fetchHome = async () => {
      try {
        const response = await fetch('/api/home');
        const data = await response.json();
        setCategories(data);
        localStorage.setItem('youwe_home_cache', JSON.stringify(data));
      } catch (err) {
        console.error('Failed to fetch home feed:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchHome();
  }, []);

  const playSong = (song: SongMetadata, categorySongs: SongMetadata[]) => {
    setCurrentSong(song);
    
    // Queue the rest of the category
    const idx = categorySongs.findIndex(s => s.id === song.id);
    if (idx !== -1) {
      setQueue(categorySongs.slice(idx + 1));
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-white/30">
        <Loader2 className="w-10 h-10 animate-spin" />
        <p className="text-sm font-bold uppercase tracking-widest">Curating your Void...</p>
      </div>
    );
  }

  if (selectedCategory) {
    return (
      <div className="space-y-4 pb-32">
        <div className="flex flex-col sm:flex-row items-center sm:items-end gap-3 sm:gap-6 px-1 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="h-28 w-28 sm:h-48 sm:w-48 shrink-0 overflow-hidden rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] bg-neutral-900 border border-white/10">
            <img src={selectedCategory.songs[0]?.thumbnail} className="h-full w-full object-cover" alt="" />
          </div>
          <div className="flex flex-col items-center sm:items-start justify-end gap-0.5 pb-1 text-center sm:text-left">
            <span className="text-[7px] sm:text-[9px] font-black uppercase tracking-[0.2em] text-void-accent">Playlist</span>
            <h1 className="text-xl sm:text-5xl font-black tracking-tight leading-tight max-w-[90vw] sm:max-w-none">{selectedCategory.title}</h1>
            <div className="flex items-center gap-2 text-[9px] sm:text-sm font-bold text-white/40">
              <Sparkles className="w-2.5 h-2.5 text-void-accent" />
              <span>Curated by YouWe</span>
              <span>•</span>
              <span>{selectedCategory.songs.length} tracks</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6 px-1">
          <button 
            onClick={() => setSelectedCategory(null)}
            className="group flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 text-sm font-bold text-white/60 transition-all hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            <span>Back to Home</span>
          </button>

          <button 
            onClick={() => playSong(selectedCategory.songs[0], selectedCategory.songs)}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-void-accent text-black shadow-2xl transition-all hover:scale-105 active:scale-95"
          >
            <Play className="h-7 w-7 fill-current" />
          </button>
        </div>

        <div className="space-y-0.5 sm:space-y-1">
          {selectedCategory.songs.map((song, idx) => (
            <div 
              key={song.id}
              className="group flex items-center gap-3 rounded-lg px-2 py-1.5 sm:px-4 sm:py-2 hover:bg-white/5 transition-colors cursor-pointer"
              onClick={() => playSong(song, selectedCategory.songs)}
            >
              <span className="w-3 sm:w-4 text-right text-[10px] sm:text-xs font-bold text-white/20 group-hover:text-void-accent">
                {idx + 1}
              </span>
              <img src={song.thumbnail} className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg object-cover" alt="" />
              <div className="flex-1 min-w-0">
                <p className="truncate text-[11px] sm:text-sm font-bold group-hover:text-void-accent transition-colors">{song.title}</p>
                <p className="truncate text-[9px] sm:text-xs font-semibold text-white/40">{song.artist}</p>
              </div>
              <div className="flex items-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all" onClick={e => e.stopPropagation()}>
                <button
                  onClick={() => { playNext(song); addToast(`"${song.title}" added to play next`, 'success'); }}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-void-accent/20 text-white/40 hover:text-void-accent transition-all"
                  title="Play Next"
                >
                  <ListPlus className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => { addToQueue(song); addToast(`"${song.title}" added to queue`, 'info'); }}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all"
                  title="Add to Queue"
                >
                  <ListMusic className="w-3.5 h-3.5" />
                </button>
                <PlaylistMenuBtn song={song} />
              </div>
              <span className="hidden sm:inline text-[10px] font-mono w-10 text-right text-white/20 group-hover:text-white/60">
                {Math.floor(song.duration / 60)}:{(song.duration % 60).toString().padStart(2, '0')}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8 pb-32 animate-in fade-in duration-1000">
      {/* Recently Played */}
      {recentlyPlayed.length > 1 && (
        <section className="space-y-2">
          <h2 className="text-sm sm:text-xl font-black tracking-tight text-white/70">Recently Played</h2>
          <div className="relative">
            <div className="flex gap-3 overflow-x-auto pb-3 custom-scrollbar snap-x snap-mandatory">
              {recentlyPlayed.slice(0, 10).map((song, i) => (
                <div
                  key={`recent-${song.id}-${i}`}
                  onClick={() => playSong(song, recentlyPlayed)}
                  className={`group w-28 sm:w-36 shrink-0 snap-start cursor-pointer relative`}
                >
                  <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-white/5 bg-neutral-900 shadow-lg">
                    <img src={song.thumbnail} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" alt={song.title} />
                    {currentSong?.id === song.id && (
                      <div className="absolute inset-0 bg-void-accent/20 flex items-center justify-center">
                        <span className="flex gap-0.5">
                          {[1,2,3].map(b => <span key={b} className="w-0.5 bg-void-accent rounded-full animate-bounce" style={{height: `${8 + b * 4}px`, animationDelay: `${b * 0.15}s`}} />)}
                        </span>
                      </div>
                    )}
                  </div>
                  <p className="mt-1.5 truncate text-[10px] sm:text-xs font-bold text-white/70 group-hover:text-white">{song.title}</p>
                </div>
              ))}
            </div>
            <div className="pointer-events-none absolute right-0 top-0 h-full w-10 bg-gradient-to-l from-void-bg to-transparent" />
          </div>
        </section>
      )}

      {/* Featured Playlists Grid */}
      <section className="space-y-3">
        <h2 className="text-lg sm:text-3xl font-black tracking-tight">{greeting} 👋</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {categories.slice(0, 6).map((cat) => (
            <div 
              key={`featured-${cat.id}`}
              onClick={() => setSelectedCategory(cat)}
              className="group flex h-14 sm:h-20 cursor-pointer items-center overflow-hidden rounded-md sm:rounded-lg bg-white/5 transition-all hover:bg-white/10 shadow-xl border border-white/5"
            >
              <div className="h-full aspect-square bg-neutral-800 shadow-2xl">
                <img src={cat.songs[0]?.thumbnail} className="h-full w-full object-cover shadow-lg" alt="" />
              </div>
              <div className="flex flex-1 items-center justify-between px-2 sm:px-4">
                <span className="font-bold tracking-tight text-[11px] sm:text-[14px] text-white/90 group-hover:text-white transition-colors truncate pr-1">
                  {cat.title}
                </span>
                <button 
                  onClick={(e) => { e.stopPropagation(); playSong(cat.songs[0], cat.songs); }}
                  className="flex h-10 w-10 shrink-0 scale-90 items-center justify-center rounded-full bg-void-accent text-black opacity-0 shadow-2xl transition-all group-hover:scale-100 group-hover:opacity-100 hover:scale-110 active:scale-95"
                >
                  <Play className="h-5 w-5 fill-current" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {categories.map((category) => (
        <section key={category.id} className="space-y-3">
          <div className="flex items-end justify-between px-1">
            <div 
              className="cursor-pointer group"
              onClick={() => setSelectedCategory(category)}
            >
              <h2 className="text-base sm:text-2xl font-black tracking-tight hover:underline">
                {category.title}
              </h2>
            </div>
            <button 
              onClick={() => setSelectedCategory(category)}
              className="text-[9px] font-bold uppercase tracking-wider text-white/30 hover:text-white transition-colors"
            >
              Show all
            </button>
          </div>

          <div className="relative">
            <div className="flex gap-3 overflow-x-auto pb-3 custom-scrollbar snap-x snap-mandatory">
              {category.songs.map((song, index) => (
                <div
                  key={`${category.id}-${song.id}-${index}`}
                  className="group w-32 sm:w-44 shrink-0 snap-start"
                >
                  <div
                    className="relative aspect-square w-full cursor-pointer overflow-hidden rounded-xl border border-white/5 bg-neutral-900 transition-all duration-300 hover:scale-[1.02] shadow-lg"
                    onClick={() => playSong(song, category.songs)}
                  >
                    <img src={song.thumbnail} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" alt={song.title} />
                    {/* Now Playing indicator */}
                    {currentSong?.id === song.id ? (
                      <div className="absolute inset-0 bg-void-accent/20 flex items-center justify-center">
                        <span className="flex gap-0.5">
                          {[1,2,3].map(b => <span key={b} className="w-0.5 bg-void-accent rounded-full animate-bounce" style={{height: `${8+b*4}px`, animationDelay: `${b*0.15}s`}} />)}
                        </span>
                      </div>
                    ) : (
                      <div className="absolute inset-0 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100 flex items-center justify-center">
                        <div className="h-9 w-9 rounded-full bg-void-accent flex items-center justify-center text-black shadow-2xl scale-75 group-hover:scale-100 transition-transform">
                          <Play className="w-4 h-4 fill-current" />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="mt-2 flex items-start justify-between gap-1">
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-[11px] sm:text-xs font-bold tracking-tight transition-colors ${currentSong?.id === song.id ? 'text-void-accent' : 'text-white/80 group-hover:text-white'}`}>
                        {song.title}
                      </p>
                      <p className="truncate text-[9px] font-medium text-white/30 italic">{song.artist}</p>
                    </div>
                    <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                       <button
                        onClick={() => { playNext(song); addToast(`"${song.title}" added to play next`, 'success'); }}
                        className="p-1 rounded bg-white/5 hover:bg-void-accent/20 text-white/40 hover:text-void-accent transition-all"
                        title="Play Next"
                      >
                        <ListPlus className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => { addToQueue(song); addToast(`"${song.title}" added to queue`, 'info'); }}
                        className="p-1 rounded bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all"
                        title="Add to Queue"
                      >
                        <ListMusic className="w-3 h-3" />
                      </button>
                      <PlaylistMenuBtn song={song} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="pointer-events-none absolute right-0 top-0 h-[calc(100%-12px)] w-10 bg-gradient-to-l from-void-bg to-transparent" />
          </div>
        </section>
      ))}
    </div>
  );
}
