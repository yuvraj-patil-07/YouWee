export interface RoomState {
  playing: boolean;
  currentTime: number;
  videoId: string | null;
  currentSong?: SongMetadata | null;
  queue?: SongMetadata[];
  lastUpdate: number;
}

export interface SongMetadata {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
  duration: number;
  accentColor?: string;
}

export interface User {
  id: string;
  name: string;
  avatar: string;
  isHost: boolean;
  isSynced: boolean;
  role?: 'host' | 'co-host' | 'listener';
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  songs: SongMetadata[];
  createdAt: number;
  updatedAt: number;
  accentColor?: string;
}

export interface JamReaction {
  emoji: string;
  userId: string;
  name: string;
  id: string;
}

export interface SongRequest {
  id: string;
  song: SongMetadata;
  requestedBy: string;
  votes: string[];
}

export interface ChatMessage {
  id: string;
  userId: string;
  name: string;
  avatar: string;
  message: string;
  timestamp: number;
}

export interface SkipVoteState {
  votes: number;
  required: number;
}

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}
