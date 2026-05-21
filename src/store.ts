import { create } from 'zustand';
import { RoomState, SongMetadata, User, Playlist, JamReaction, SongRequest, ChatMessage, SkipVoteState, ToastMessage } from './types';
import { defaultPlaylists } from './data/defaultPlaylists';
import { User as FirebaseUser } from 'firebase/auth';

export type RepeatMode = 'off' | 'one' | 'all';

interface AppState {
  // Core
  roomId: string | null;
  roomState: RoomState;
  currentSong: SongMetadata | null;
  users: User[];
  isHost: boolean;
  currentUser: FirebaseUser | null;
  isInJamRoom: boolean;
  socket: any | null;
  setSocket: (socket: any | null) => void;
  emitRoomState: (state: Partial<RoomState>) => void;
  setRoomId: (id: string | null) => void;
  setRoomState: (state: Partial<RoomState>) => void;
  setCurrentSong: (song: SongMetadata | null) => void;
  setUsers: (users: User[]) => void;
  setIsHost: (isHost: boolean) => void;
  setIsInJamRoom: (inRoom: boolean) => void;
  setCurrentUser: (user: FirebaseUser | null) => void;

  // Queue
  queue: SongMetadata[];
  addToQueue: (song: SongMetadata) => void;
  playNext: (song: SongMetadata) => void;
  removeFromQueue: (id: string) => void;
  removeFromQueueAt: (index: number) => void;
  playFromQueue: (index: number) => void;
  playNextInQueue: () => void;
  playPrev: () => void;
  setQueue: (queue: SongMetadata[]) => void;

  // Playback modes
  shuffleMode: boolean;
  repeatMode: RepeatMode;
  toggleShuffle: () => void;
  cycleRepeat: () => void;

  // Like / Heart
  likedSongs: SongMetadata[];
  toggleLike: (song: SongMetadata) => void;
  isLiked: (songId: string) => boolean;

  // Recently Played
  recentlyPlayed: SongMetadata[];
  addToRecentlyPlayed: (song: SongMetadata) => void;

  // Playlists
  playlists: Playlist[];
  createPlaylist: (name: string, description?: string, accentColor?: string) => string;
  deletePlaylist: (playlistId: string) => void;
  updatePlaylist: (playlistId: string, updates: Partial<Omit<Playlist, 'id' | 'createdAt'>>) => void;
  addSongToPlaylist: (playlistId: string, song: SongMetadata) => void;
  removeSongFromPlaylist: (playlistId: string, songId: string) => void;
  playPlaylist: (playlistId: string) => void;
  setPlaylists: (playlists: Playlist[]) => void;

  // Recommendations
  recommendations: SongMetadata[];
  setRecommendations: (recommendations: SongMetadata[]) => void;

  // Jam Room — Live Features
  jamReactions: JamReaction[];
  setJamReactions: (updater: JamReaction[] | ((prev: JamReaction[]) => JamReaction[])) => void;
  skipVotes: SkipVoteState;
  setSkipVotes: (data: SkipVoteState) => void;
  songRequests: SongRequest[];
  setSongRequests: (requests: SongRequest[]) => void;
  chatMessages: ChatMessage[];
  setChatMessages: (updater: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => void;
  isBuffering: boolean;
  setIsBuffering: (v: boolean) => void;

  // Toast notifications
  toasts: ToastMessage[];
  addToast: (message: string, type?: ToastMessage['type']) => void;
  removeToast: (id: string) => void;

  // Album art accent color
  accentColor: string;
  setAccentColor: (color: string) => void;
}

export const useStore = create<AppState>((set, get) => {
  const loadFromStorage = <T>(key: string, fallback: T): T => {
    try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : fallback; } catch { return fallback; }
  };
  const saveToStorage = (key: string, value: unknown) => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
  };

  const getInitialPlaylists = () => {
    try {
      const stored = localStorage.getItem('youwe_playlists_guest');
      if (!stored) return defaultPlaylists;
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed) || parsed.length === 0) return defaultPlaylists;
      return parsed.map((p: Playlist) => {
        const def = defaultPlaylists.find(d => d.id === p.id);
        return (def && def.songs.length > p.songs.length) ? { ...def, updatedAt: Date.now() } : p;
      });
    } catch { return defaultPlaylists; }
  };
  const savePlaylists = (playlists: Playlist[], uid: string) => {
    try { localStorage.setItem(`youwe_playlists_${uid}`, JSON.stringify(playlists)); } catch {}
  };

  return {
    // ── Core ──────────────────────────────────────────────────────────────
    roomId: null,
    roomState: { playing: false, currentTime: 0, videoId: null, currentSong: null, queue: [], lastUpdate: Date.now() },
    currentSong: null,
    users: [],
    isHost: false,
    currentUser: null,
    isInJamRoom: false,
    socket: null,
    accentColor: '#00d4ff',
    setAccentColor: (accentColor) => set({ accentColor }),

    setSocket: (socket) => set({ socket }),
    emitRoomState: (state) => {
      const { socket, roomId } = get();
      if (socket && roomId) socket.emit('update-state', { roomId, state });
    },
    setRoomId: (roomId) => set({ roomId }),
    setRoomState: (state) => set(prev => ({ roomState: { ...prev.roomState, ...state } })),
    setCurrentSong: (currentSong) => {
      if (currentSong) get().addToRecentlyPlayed(currentSong);
      const newState = { 
        ...get().roomState, 
        currentSong, 
        videoId: currentSong?.id ?? get().roomState.videoId,
        playing: !!currentSong,
        currentTime: 0
      };
      
      set({ currentSong, roomState: newState });
      
      if (get().isInJamRoom && get().isHost) {
        get().emitRoomState(newState);
      }
    },
    setUsers: (users) => set({ users }),
    setIsHost: (isHost) => set({ isHost }),
    setIsInJamRoom: (isInJamRoom) => set({ isInJamRoom }),
    setCurrentUser: (currentUser) => {
      set({ currentUser });
      const uid = currentUser?.uid || 'guest';
      
      const newPlaylists = (() => {
        try {
          const stored = localStorage.getItem(`youwe_playlists_${uid}`);
          if (!stored) return defaultPlaylists;
          const parsed = JSON.parse(stored);
          if (!Array.isArray(parsed) || parsed.length === 0) return defaultPlaylists;
          return parsed.map((p: Playlist) => {
            const def = defaultPlaylists.find(d => d.id === p.id);
            return (def && def.songs.length > p.songs.length) ? { ...def, updatedAt: Date.now() } : p;
          });
        } catch { return defaultPlaylists; }
      })();

      const newLiked = (() => {
        try { const s = localStorage.getItem(`youwe_liked_${uid}`); return s ? JSON.parse(s) : []; } catch { return []; }
      })();

      const newRecent = (() => {
        try { const s = localStorage.getItem(`youwe_recent_${uid}`); return s ? JSON.parse(s) : []; } catch { return []; }
      })();

      set({ playlists: newPlaylists, likedSongs: newLiked, recentlyPlayed: newRecent });
    },

    // ── Queue ─────────────────────────────────────────────────────────────
    queue: [],
    setQueue: (queue) => set(s => ({ queue, roomState: s.isInJamRoom ? { ...s.roomState, queue } : s.roomState })),
    addToQueue: (song) => set(s => {
      const nextQueue = [...s.queue, song];
      return { queue: nextQueue, roomState: s.isInJamRoom ? { ...s.roomState, queue: nextQueue } : s.roomState };
    }),
    removeFromQueue: (id) => set(s => {
      const nextQueue = s.queue.filter(sq => sq.id !== id);
      return { queue: nextQueue, roomState: s.isInJamRoom ? { ...s.roomState, queue: nextQueue } : s.roomState };
    }),
    removeFromQueueAt: (index) => set(s => {
      const nextQueue = s.queue.filter((_, i) => i !== index);
      return { queue: nextQueue, roomState: s.isInJamRoom ? { ...s.roomState, queue: nextQueue } : s.roomState };
    }),
    playFromQueue: (index) => set(s => {
      const nextSong = s.queue[index];
      if (!nextSong) return s;
      get().addToRecentlyPlayed(nextSong);
      const remaining = s.queue.filter((_, i) => i !== index);
      return { currentSong: nextSong, queue: remaining, roomState: { ...s.roomState, videoId: nextSong.id, currentTime: 0, playing: true, currentSong: nextSong, queue: remaining } };
    }),
    playNext: (song) => set(s => {
      const nextQueue = [song, ...s.queue];
      return { queue: nextQueue, roomState: s.isInJamRoom ? { ...s.roomState, queue: nextQueue } : s.roomState };
    }),

    playNextInQueue: async () => {
      const s = get();
      if (s.repeatMode === 'one' && s.currentSong) {
        set({ roomState: { ...s.roomState, currentTime: 0, playing: true } });
        return;
      }
      if (s.queue.length > 0) {
        const idx = s.shuffleMode ? Math.floor(Math.random() * s.queue.length) : 0;
        const nextSong = s.queue[idx];
        get().addToRecentlyPlayed(nextSong);
        const remaining = s.queue.filter((_, i) => i !== idx);
        set({ currentSong: nextSong, queue: remaining, roomState: { ...s.roomState, videoId: nextSong.id, currentTime: 0, playing: true, currentSong: nextSong, queue: remaining } });
        return;
      }
      if (s.recommendations.length > 0) {
        const idx = Math.floor(Math.random() * s.recommendations.length);
        const nextSong = s.recommendations[idx];
        get().addToRecentlyPlayed(nextSong);
        const remainingRecs = s.recommendations.filter((_, i) => i !== idx);
        set({ currentSong: nextSong, recommendations: remainingRecs, roomState: { ...s.roomState, videoId: nextSong.id, currentTime: 0, playing: true, currentSong: nextSong, queue: [] } });
        return;
      }

      // If no recommendations are currently loaded, try to fetch them dynamically
      if (s.currentSong) {
        try {
          set({ isBuffering: true });
          const response = await fetch(`/api/recommendations?title=${encodeURIComponent(s.currentSong.title)}&artist=${encodeURIComponent(s.currentSong.artist)}`);
          if (response.ok) {
            const newRecs = await response.json();
            if (newRecs && newRecs.length > 0) {
              const idx = Math.floor(Math.random() * newRecs.length);
              const nextSong = newRecs[idx];
              get().addToRecentlyPlayed(nextSong);
              const remainingRecs = newRecs.filter((_: any, i: number) => i !== idx);
              set(state => ({
                recommendations: remainingRecs,
                currentSong: nextSong,
                roomState: { ...state.roomState, videoId: nextSong.id, currentTime: 0, playing: true, currentSong: nextSong, queue: [] }
              }));
            }
          }
        } catch (error) {
          console.error("Failed to fetch next recommendation automatically:", error);
        } finally {
          set({ isBuffering: false });
        }
      }
    },

    playPrev: () => set(s => {
      // Find previous: skip over current song in history
      const history = s.recentlyPlayed;
      // recentlyPlayed[0] = most recent (current). [1] = actual previous
      const prevSong = history[1];
      if (!prevSong) return s;
      return { currentSong: prevSong, roomState: { ...s.roomState, videoId: prevSong.id, currentTime: 0, playing: true, currentSong: prevSong } };
    }),

    // ── Playback Modes ────────────────────────────────────────────────────
    shuffleMode: false,
    repeatMode: 'off',
    toggleShuffle: () => set(s => ({ shuffleMode: !s.shuffleMode })),
    cycleRepeat: () => set(s => {
      const next: RepeatMode = s.repeatMode === 'off' ? 'all' : s.repeatMode === 'all' ? 'one' : 'off';
      return { repeatMode: next };
    }),

    // ── Likes ─────────────────────────────────────────────────────────────
    likedSongs: loadFromStorage<SongMetadata[]>('youwe_liked_guest', []),
    toggleLike: (song) => set(s => {
      const uid = s.currentUser?.uid || 'guest';
      const exists = s.likedSongs.some(l => l.id === song.id);
      const updated = exists ? s.likedSongs.filter(l => l.id !== song.id) : [song, ...s.likedSongs];
      try { localStorage.setItem(`youwe_liked_${uid}`, JSON.stringify(updated)); } catch {}
      get().addToast(exists ? 'Removed from Liked Songs' : `❤️ Liked "${song.title.slice(0, 25)}"`, 'success');
      return { likedSongs: updated };
    }),
    isLiked: (songId) => get().likedSongs.some(l => l.id === songId),

    // ── Recently Played ───────────────────────────────────────────────────
    recentlyPlayed: loadFromStorage<SongMetadata[]>('youwe_recent_guest', []),
    addToRecentlyPlayed: (song) => set(s => {
      const uid = s.currentUser?.uid || 'guest';
      const filtered = s.recentlyPlayed.filter(r => r.id !== song.id);
      const updated = [song, ...filtered].slice(0, 20);
      try { localStorage.setItem(`youwe_recent_${uid}`, JSON.stringify(updated)); } catch {}
      return { recentlyPlayed: updated };
    }),

    // ── Playlists ─────────────────────────────────────────────────────────
    playlists: getInitialPlaylists(),
    setPlaylists: (playlists) => set(s => { 
      const uid = s.currentUser?.uid || 'guest';
      savePlaylists(playlists, uid); 
      return { playlists }; 
    }),
    createPlaylist: (name, description = '', accentColor = '#00d4ff') => {
      const id = `playlist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const newPlaylist: Playlist = { id, name, description, songs: [], createdAt: Date.now(), updatedAt: Date.now(), accentColor };
      set(s => { 
        const uid = s.currentUser?.uid || 'guest';
        const updated = [...s.playlists, newPlaylist]; 
        savePlaylists(updated, uid); 
        return { playlists: updated }; 
      });
      return id;
    },
    deletePlaylist: (playlistId) => set(s => {
      const uid = s.currentUser?.uid || 'guest';
      const updated = s.playlists.filter(p => p.id !== playlistId);
      savePlaylists(updated, uid);
      return { playlists: updated };
    }),
    updatePlaylist: (playlistId, updates) => set(s => {
      const uid = s.currentUser?.uid || 'guest';
      const updated = s.playlists.map(p => p.id === playlistId ? { ...p, ...updates, updatedAt: Date.now() } : p);
      savePlaylists(updated, uid);
      return { playlists: updated };
    }),
    addSongToPlaylist: (playlistId, song) => set(s => {
      const uid = s.currentUser?.uid || 'guest';
      const updated = s.playlists.map(p => {
        if (p.id !== playlistId) return p;
        const exists = p.songs.some(s => s.id === song.id);
        if (exists) { get().addToast('Song already in playlist', 'info'); return p; }
        get().addToast(`✅ Added to "${p.name}"`, 'success');
        return { ...p, songs: [...p.songs, song], updatedAt: Date.now() };
      });
      savePlaylists(updated, uid);
      return { playlists: updated };
    }),
    removeSongFromPlaylist: (playlistId, songId) => set(s => {
      const uid = s.currentUser?.uid || 'guest';
      const updated = s.playlists.map(p => p.id === playlistId ? { ...p, songs: p.songs.filter(s => s.id !== songId), updatedAt: Date.now() } : p);
      savePlaylists(updated, uid);
      return { playlists: updated };
    }),
    playPlaylist: (playlistId) => set(s => {
      const playlist = s.playlists.find(p => p.id === playlistId);
      if (!playlist || playlist.songs.length === 0) return s;
      get().addToRecentlyPlayed(playlist.songs[0]);
      return { currentSong: playlist.songs[0], queue: playlist.songs.slice(1), roomState: { ...s.roomState, videoId: playlist.songs[0].id, currentTime: 0, playing: true, currentSong: playlist.songs[0] } };
    }),

    // ── Recommendations ───────────────────────────────────────────────────
    recommendations: [],
    setRecommendations: (recommendations) => set({ recommendations }),

    // ── Jam Room Live Features ────────────────────────────────────────────
    jamReactions: [],
    setJamReactions: (updater) => set(s => ({ jamReactions: typeof updater === 'function' ? updater(s.jamReactions) : updater })),
    skipVotes: { votes: 0, required: 2 },
    setSkipVotes: (skipVotes) => set({ skipVotes }),
    songRequests: [],
    setSongRequests: (songRequests) => set({ songRequests }),
    chatMessages: [],
    setChatMessages: (updater) => set(s => ({ chatMessages: typeof updater === 'function' ? updater(s.chatMessages) : updater })),
    isBuffering: false,
    setIsBuffering: (isBuffering) => set({ isBuffering }),

    // ── Toast Notifications ───────────────────────────────────────────────
    toasts: [],
    addToast: (message, type = 'info') => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      set(s => ({ toasts: [...s.toasts.slice(-4), { id, message, type }] }));
      setTimeout(() => get().removeToast(id), 3000);
    },
    removeToast: (id) => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),
  };
});
