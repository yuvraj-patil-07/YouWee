import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Heart, Play, MoreVertical, Music, Trash2, ListMusic, X, ArrowLeft, ListPlus } from 'lucide-react';
import { useStore } from '../store';
import { SongMetadata } from '../types';
import { PlaylistMenuBtn } from './PlaylistMenuBtn';

export function Library({ view }: { view: 'library' | 'liked-songs' }) {
  const { likedSongs, toggleLike, setCurrentSong, roomState, setRoomState, isHost, playlists, deletePlaylist, addToQueue, playNext, addToast } = useStore();
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);

  const playSong = (song: SongMetadata) => {
    setCurrentSong(song);
  };

  const removeFromLiked = (song: SongMetadata) => {
    toggleLike(song);
  };

  const selectedPlaylist = playlists.find(p => p.id === selectedPlaylistId);

  // If viewing Liked Songs or a specific playlist
  if (view === 'liked-songs' || selectedPlaylistId) {
    const title = view === 'liked-songs' ? 'Liked Songs' : selectedPlaylist?.name || 'Playlist';
    const songs = view === 'liked-songs' ? likedSongs : selectedPlaylist?.songs || [];
    const iconColor = view === 'liked-songs' ? 'from-pink-600 to-purple-600' : `from-void-accent to-blue-600`;

    return (
      <div className="flex flex-col gap-8 pb-32 animate-in fade-in duration-500">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => setSelectedPlaylistId(null)}
            className="flex items-center gap-2 text-white/40 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Library
          </button>
          {selectedPlaylistId && (
            <button 
              onClick={() => deletePlaylist(selectedPlaylistId)}
              className="text-red-500/40 hover:text-red-500 transition-colors text-[10px] font-black uppercase tracking-widest"
            >
              Delete Playlist
            </button>
          )}
        </div>

        <div 
          className="flex flex-col md:flex-row items-center md:items-end gap-6 px-6 py-10 rounded-3xl relative overflow-hidden"
          style={{ background: `linear-gradient(to bottom, ${(view === 'liked-songs' ? '#ec4899' : (selectedPlaylist?.accentColor || '#00d4ff'))}33, transparent)` }}
        >
          <div className={`w-40 h-40 sm:w-56 sm:h-56 rounded-3xl bg-gradient-to-br ${iconColor} shadow-2xl flex items-center justify-center relative overflow-hidden group`}>
            {view === 'liked-songs' ? <Heart className="w-20 h-20 text-white fill-current" /> : <ListMusic className="w-20 h-20 text-white" />}
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
               <button 
                onClick={() => songs[0] && playSong(songs[0])}
                className="w-16 h-16 rounded-full bg-void-accent text-black flex items-center justify-center shadow-2xl scale-90 group-hover:scale-100 transition-all"
              >
                <Play className="w-8 h-8 fill-current ml-1" />
              </button>
            </div>
          </div>
          <div className="flex-1 text-center md:text-left space-y-2">
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40">Collection</span>
            <h1 className="text-4xl md:text-7xl font-black tracking-tighter">{title}</h1>
            <div className="flex items-center justify-center md:justify-start gap-3 text-sm font-bold text-white/40">
              <span className="text-white">{songs.length} songs</span>
              {selectedPlaylist?.description && (
                <>
                  <span className="opacity-50">•</span>
                  <span className="italic">{selectedPlaylist.description}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="px-1">
          <div className="space-y-1">
            {songs.map((song, index) => (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
                key={`${song.id}-${index}`}
                className="group flex items-center gap-4 p-2 rounded-xl hover:bg-white/5 transition-all cursor-pointer"
                onClick={() => playSong(song)}
              >
                <span className="w-6 text-center font-mono text-[10px] text-white/20 group-hover:text-void-accent">{index + 1}</span>
                <img src={song.thumbnail} alt="" className="w-10 h-10 rounded-lg object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate group-hover:text-void-accent transition-colors">{song.title}</p>
                  <p className="text-[10px] font-semibold text-white/30">{song.artist}</p>
                </div>
                <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                  <button 
                    onClick={() => { playNext(song); addToast(`"${song.title}" added to play next`, 'success'); }}
                    className="p-2 rounded-lg bg-white/5 hover:bg-void-accent/20 text-white/40 hover:text-void-accent transition-all"
                    title="Play Next"
                  >
                    <ListPlus className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => { addToQueue(song); addToast(`"${song.title}" added to queue`, 'info'); }}
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all"
                    title="Add to Queue"
                  >
                    <ListMusic className="w-4 h-4" />
                  </button>
                  <PlaylistMenuBtn song={song} />
                  {view === 'liked-songs' && (
                    <button 
                      onClick={() => removeFromLiked(song)}
                      className="p-2 rounded-lg bg-white/5 hover:bg-red-500/20 text-white/40 hover:text-red-500 transition-all"
                      title="Remove from Liked"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
            {songs.length === 0 && (
              <div className="py-20 text-center text-white/20 italic text-sm">No tracks in this collection yet.</div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-32 animate-in fade-in duration-700">
      <div className="space-y-2">
        <h1 className="text-4xl sm:text-6xl font-black tracking-tighter">Your Library</h1>
        <p className="text-white/40 font-bold text-sm uppercase tracking-[0.3em]">Personal Collection</p>
      </div>

      <div className="space-y-2">
        {/* Liked Songs Item */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          onClick={() => { /* App logic handles view switch */ }}
          className="group flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 transition-all cursor-pointer"
        >
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-gradient-to-br from-pink-600 to-purple-600 flex items-center justify-center shadow-xl shrink-0">
            <Heart className="w-8 h-8 text-white fill-current" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-black group-hover:text-pink-500 transition-colors">Liked Songs</h3>
            <p className="text-xs font-bold text-white/30 uppercase tracking-widest">{likedSongs.length} Tracks</p>
          </div>
          <div className="flex items-center gap-4">
             <div className="hidden sm:flex h-8 items-center gap-1.5 px-3 rounded-full bg-pink-500/10 text-pink-500 text-[10px] font-black uppercase">
               Featured
             </div>
             <Play className="w-5 h-5 text-white/20 group-hover:text-void-accent transition-colors" />
          </div>
        </motion.div>

        {/* Custom Playlists Items */}
        {playlists.map((pl, idx) => (
          <motion.div 
            key={pl.id}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            onClick={() => setSelectedPlaylistId(pl.id)}
            className="group flex items-center gap-4 p-4 rounded-2xl bg-white/[0.01] hover:bg-white/[0.05] border border-white/5 transition-all cursor-pointer"
          >
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-neutral-900 border border-white/10 flex items-center justify-center shadow-xl shrink-0 overflow-hidden">
              {pl.songs[0] ? (
                <img src={pl.songs[0].thumbnail} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" alt="" />
              ) : (
                <ListMusic className="w-8 h-8 text-white/10" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-black group-hover:text-void-accent transition-colors truncate pr-2">{pl.name}</h3>
              <p className="text-xs font-bold text-white/30 uppercase tracking-widest">{pl.songs.length} Tracks</p>
            </div>
            <div className="flex items-center gap-4">
               <div 
                 className="w-2 h-2 rounded-full"
                 style={{ backgroundColor: pl.accentColor || '#00d4ff', boxShadow: `0 0 10px ${pl.accentColor || '#00d4ff'}` }}
               />
               <Play className="w-5 h-5 text-white/20 group-hover:text-void-accent transition-colors" />
            </div>
          </motion.div>
        ))}

        {playlists.length === 0 && likedSongs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-6 text-center">
            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
              <Music className="w-8 h-8 text-white/20" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-black">Your collection is empty</h2>
              <p className="text-white/40 font-medium text-xs">Start building your sound scape.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
