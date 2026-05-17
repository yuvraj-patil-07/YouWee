import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, MoreVertical, Trash2, Play, X } from 'lucide-react';
import { useStore } from '../store';
import { SongMetadata } from '../types';

export function PlaylistManager() {
  const { playlists, createPlaylist, deletePlaylist, addSongToPlaylist, removeSongFromPlaylist, playPlaylist, setCurrentSong, setRoomState, setQueue } = useStore();
  const [selectedPlaylist, setSelectedPlaylist] = useState<string | null>(null);

  // Removed auto-selection to keep UI compact until user interacts

  const handlePlaySong = (song: SongMetadata, playlistSongs: SongMetadata[]) => {
    setCurrentSong(song);
    setRoomState({ videoId: song.id, currentTime: 0, playing: true, currentSong: song });
    const idx = playlistSongs.findIndex(s => s.id === song.id);
    if (idx !== -1) {
      setQueue(playlistSongs.slice(idx + 1));
    }
  };

  const [isCreating, setIsCreating] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistDesc, setNewPlaylistDesc] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const handleCreatePlaylist = () => {
    if (newPlaylistName.trim()) {
      const colors = ['#00d4ff', '#ff006e', '#fb5607', '#ffbe0b', '#8338ec', '#3a86ff'];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      const id = createPlaylist(newPlaylistName, newPlaylistDesc, randomColor);
      setNewPlaylistName('');
      setNewPlaylistDesc('');
      setIsCreating(false);
      setSelectedPlaylist(id);
    }
  };

  const handleDeletePlaylist = (id: string) => {
    deletePlaylist(id);
    if (selectedPlaylist === id) {
      setSelectedPlaylist(playlists.length > 1 ? playlists[0].id : null);
    }
    setOpenMenuId(null);
  };

  const playlist = selectedPlaylist ? playlists.find(p => p.id === selectedPlaylist) : null;

  return (
    <div className="mt-4 pt-4 border-t border-white/5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Library</h2>
        <button
          onClick={() => setIsCreating(true)}
          className="p-1 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
          title="Create playlist"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      <AnimatePresence>
        {isCreating ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2 mb-4"
          >
            <input
              type="text"
              placeholder="Playlist name"
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-2 py-1.5 text-xs placeholder:text-white/30 focus:outline-none focus:border-white/40"
              autoFocus
            />
            <textarea
              placeholder="Description (optional)"
              value={newPlaylistDesc}
              onChange={(e) => setNewPlaylistDesc(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-2 py-1.5 text-xs placeholder:text-white/30 focus:outline-none focus:border-white/40 resize-none h-12"
            />
            <div className="flex gap-2">
              <button
                onClick={handleCreatePlaylist}
                className="flex-1 bg-white text-black rounded-lg py-1.5 text-xs font-semibold hover:bg-white/90 active:scale-95 transition-all"
              >
                Create
              </button>
              <button
                onClick={() => {
                  setIsCreating(false);
                  setNewPlaylistName('');
                  setNewPlaylistDesc('');
                }}
                className="flex-1 bg-white/10 text-white rounded-lg py-1.5 text-xs font-semibold hover:bg-white/20 active:scale-95 transition-all"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        ) : (
          <div className="space-y-1 pr-1">
            {playlists.length === 0 ? (
              <p className="text-xs text-white/40">No playlists yet</p>
            ) : (
              <>
                {playlists.map((pl) => (
                  <div key={pl.id} className="relative">
                    <button
                      onClick={() => setSelectedPlaylist(selectedPlaylist === pl.id ? null : pl.id)}
                      className={`w-full flex items-center gap-2 rounded-lg px-2 py-1 text-left text-xs transition-colors ${
                        selectedPlaylist === pl.id
                          ? 'bg-white/15 shadow-[inset_0_0_10px_rgba(255,255,255,0.05)]'
                          : 'hover:bg-white/5'
                      }`}
                    >
                      <div
                        className={`w-2 h-2 rounded-full flex-shrink-0 transition-all duration-500 ${selectedPlaylist === pl.id ? 'scale-125 shadow-[0_0_12px_rgba(255,255,255,0.3)]' : 'shadow-[0_0_8px_rgba(255,255,255,0.1)]'}`}
                        style={{ backgroundColor: pl.accentColor || '#00d4ff' }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className={`truncate font-bold text-[11px] transition-colors ${selectedPlaylist === pl.id ? 'text-white' : 'text-white/60'}`}>{pl.name}</p>
                        <p className="text-[9px] text-white/30">{pl.songs.length} songs</p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === pl.id ? null : pl.id);
                        }}
                        className="p-0.5 rounded hover:bg-white/10"
                      >
                        <MoreVertical className="w-2.5 h-2.5 text-white/30" />
                      </button>
                    </button>

                    <AnimatePresence>
                      {openMenuId === pl.id && (
                        <motion.div
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          className="absolute right-0 top-8 bg-black/95 border border-white/20 rounded-lg shadow-xl overflow-hidden z-50"
                        >
                          <button
                            onClick={() => {
                              playPlaylist(pl.id);
                              setOpenMenuId(null);
                            }}
                            className="w-full flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-white/10 text-left"
                          >
                            <Play className="w-3 h-3" />
                            Play
                          </button>
                          <button
                            onClick={() => handleDeletePlaylist(pl.id)}
                            className="w-full flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-red-500/20 text-red-400 text-left"
                          >
                            <Trash2 className="w-3 h-3" />
                            Delete
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </AnimatePresence>

      {/* Playlist Songs Preview */}
      {playlist && !isCreating && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mt-4 pt-4 border-t border-white/5"
        >
          <h3 className="text-[10px] font-bold text-white/60 uppercase tracking-widest mb-2">
            {playlist.name}
          </h3>
          <div className="space-y-0.5 pr-1">
            {playlist.songs.length === 0 ? (
              <p className="text-[10px] text-white/40">No songs</p>
            ) : (
              playlist.songs.map((song, idx) => (
                  <div
                    key={`${song.id}-${idx}`}
                    onClick={() => handlePlaySong(song, playlist.songs)}
                    className="group w-full flex items-center gap-1.5 rounded px-1 py-1 hover:bg-white/5 text-[10px] text-left cursor-pointer"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handlePlaySong(song, playlist.songs);
                      }
                    }}
                  >
                    <span className="text-white/30 w-3">{idx + 1}</span>
                    <img src={song.thumbnail} alt="" className="w-5 h-5 rounded object-cover" />
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-semibold text-white">{song.title}</p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeSongFromPlaylist(playlist.id, song.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-white/10 rounded transition-all"
                      title="Remove"
                      type="button"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
              ))
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}

