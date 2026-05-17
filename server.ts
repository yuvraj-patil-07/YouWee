import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import * as ytSearch from 'yt-search';
import rateLimit from 'express-rate-limit';
import cors from 'cors';

const yts = (ytSearch as any).default || ytSearch;

// ─── Config ────────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '3000', 10);
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
const HOME_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

// ─── Room Code Generator ───────────────────────────────────────────────────
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars (0,O,1,I)
function generateRoomCode(): string {
  let code = 'JAM-';
  for (let i = 0; i < 4; i++) code += CHARS[Math.floor(Math.random() * CHARS.length)];
  return code;
}

// ─── Room Manager (Redis-ready interface) ─────────────────────────────────
interface RoomMember {
  id: string;
  name: string;
  avatar: string;
  isHost: boolean;
  isSynced: boolean;
  role: 'host' | 'co-host' | 'listener';
}

interface RoomStateServer {
  playing: boolean;
  currentTime: number;
  videoId: string | null;
  currentSong: any | null;
  queue: any[];
  lastUpdate: number; // epoch ms — used for elapsed-time catch-up sync
}

interface Room {
  code: string;
  hostId: string;
  state: RoomStateServer;
  members: RoomMember[];
  reactions: { emoji: string; userId: string; id: string }[];
  songRequests: { id: string; song: any; requestedBy: string; votes: string[] }[];
  skipVotes: Set<string>;
  createdAt: number;
}

const rooms = new Map<string, Room>();

function getRoom(roomId: string): Room | undefined {
  return rooms.get(roomId);
}

function cleanupEmptyRooms() {
  const now = Date.now();
  rooms.forEach((room, id) => {
    if (room.members.length === 0 && now - room.createdAt > 5 * 60 * 1000) {
      rooms.delete(id);
    }
  });
}
setInterval(cleanupEmptyRooms, 60_000); // cleanup every minute

// ─── Home API Cache ────────────────────────────────────────────────────────
let homeCache: { data: any; timestamp: number } | null = null;

// ─── App ───────────────────────────────────────────────────────────────────
async function startServer() {
  const app = express();
  const httpServer = createServer(app);

  const io = new Server(httpServer, {
    cors: { origin: CORS_ORIGIN, methods: ['GET', 'POST'] },
    pingTimeout: 30000,
    pingInterval: 10000,
  });

  app.use(express.json());

  // ─── Rate Limiting ────────────────────────────────────────────────────
  const apiLimiter = rateLimit({
    windowMs: 60_000, // 1 minute
    max: 60,          // 60 requests per minute per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests. Please slow down.' },
  });
  const searchLimiter = rateLimit({
    windowMs: 10_000, // 10 seconds
    max: 5,           // 5 searches per 10s
    message: { error: 'Search rate limit exceeded. Please wait.' },
  });
  app.use('/api/', apiLimiter);
  app.use('/api/search', searchLimiter);

  // ─── Socket.IO ────────────────────────────────────────────────────────
  io.on('connection', (socket) => {
    console.log(`[Socket] Connected: ${socket.id}`);

    // ── CREATE ROOM ────────────────────────────────────────────────────
    socket.on('create-room', ({ user }, callback) => {
      let code: string;
      do { code = generateRoomCode(); } while (rooms.has(code)); // ensure unique

      const member: RoomMember = {
        id: socket.id,
        name: user?.name || `DJ_${socket.id.slice(0, 4)}`,
        avatar: user?.avatar || '',
        isHost: true,
        isSynced: true,
        role: 'host',
      };

      const room: Room = {
        code,
        hostId: socket.id,
        state: { playing: false, currentTime: 0, videoId: null, currentSong: null, queue: [], lastUpdate: Date.now() },
        members: [member],
        reactions: [],
        songRequests: [],
        skipVotes: new Set(),
        createdAt: Date.now(),
      };

      rooms.set(code, room);
      socket.join(code);
      socket.emit('new-host', socket.id);
      io.to(code).emit('room-members', room.members);

      console.log(`[Room] Created: ${code} by ${member.name}`);
      callback?.({ code, success: true });
    });

    // ── JOIN ROOM ──────────────────────────────────────────────────────
    socket.on('join-room', ({ roomId, user }, callback) => {
      const room = getRoom(roomId);
      if (!room) {
        callback?.({ error: 'Room not found', success: false });
        return;
      }

      socket.join(roomId);

      const existing = room.members.find(m => m.id === socket.id);
      if (!existing) {
        const member: RoomMember = {
          id: socket.id,
          name: user?.name || `Guest_${socket.id.slice(0, 4)}`,
          avatar: user?.avatar || '',
          isHost: false,
          isSynced: true,
          role: 'listener',
        };
        room.members.push(member);
      }

      // ── CATCH-UP SYNC: compensate for elapsed time ──────────────────
      const elapsed = (Date.now() - room.state.lastUpdate) / 1000;
      const adjustedTime = room.state.playing
        ? room.state.currentTime + elapsed
        : room.state.currentTime;

      socket.emit('sync-state', { ...room.state, currentTime: adjustedTime });
      socket.emit('new-host', room.hostId);
      socket.emit('song-requests', room.songRequests);
      io.to(roomId).emit('room-members', room.members);

      console.log(`[Room] ${user?.name || socket.id} joined ${roomId}`);
      callback?.({ success: true, code: roomId });
    });

    // ── UPDATE STATE (All Users) ───────────────────────────────────────
    socket.on('update-state', ({ roomId, state }) => {
      const room = getRoom(roomId);
      if (!room) return;

      // Verify socket is actually in this room
      if (!socket.rooms.has(roomId)) return;

      // Merge delta update — only update fields that were sent
      room.state = { ...room.state, ...state, lastUpdate: Date.now() };
      socket.to(roomId).emit('sync-state', room.state);
    });

    // ── PROMOTE CO-HOST ────────────────────────────────────────────────
    socket.on('promote-cohost', ({ roomId, targetId }) => {
      const room = getRoom(roomId);
      if (!room || room.hostId !== socket.id) return;
      const member = room.members.find(m => m.id === targetId);
      if (member) { member.role = 'co-host'; member.isHost = true; }
      io.to(roomId).emit('room-members', room.members);
    });

    // ── EMOJI REACTION ─────────────────────────────────────────────────
    socket.on('send-reaction', ({ roomId, emoji }) => {
      const room = getRoom(roomId);
      if (!room || !socket.rooms.has(roomId)) return;
      const member = room.members.find(m => m.id === socket.id);
      const reaction = { emoji, userId: socket.id, name: member?.name || 'Guest', id: `${socket.id}-${Date.now()}` };
      io.to(roomId).emit('reaction', reaction);
    });

    // ── SONG REQUEST ───────────────────────────────────────────────────
    socket.on('request-song', ({ roomId, song }) => {
      const room = getRoom(roomId);
      if (!room || !socket.rooms.has(roomId)) return;
      const member = room.members.find(m => m.id === socket.id);
      const request = {
        id: `req-${Date.now()}-${socket.id.slice(0, 4)}`,
        song,
        requestedBy: member?.name || 'Guest',
        votes: [socket.id],
      };
      room.songRequests.push(request);
      io.to(roomId).emit('song-requests', room.songRequests);
    });

    // ── APPROVE SONG REQUEST (host only) ──────────────────────────────
    socket.on('approve-request', ({ roomId, requestId }) => {
      const room = getRoom(roomId);
      if (!room || (room.hostId !== socket.id)) return;
      const req = room.songRequests.find(r => r.id === requestId);
      if (req) {
        room.songRequests = room.songRequests.filter(r => r.id !== requestId);
        // Add to queue via state update
        const newQueue = [...room.state.queue, req.song];
        room.state = { ...room.state, queue: newQueue, lastUpdate: Date.now() };
        io.to(roomId).emit('sync-state', room.state);
        io.to(roomId).emit('song-requests', room.songRequests);
      }
    });

    // ── VOTE TO SKIP ───────────────────────────────────────────────────
    socket.on('vote-skip', ({ roomId }) => {
      const room = getRoom(roomId);
      if (!room || !socket.rooms.has(roomId)) return;
      room.skipVotes.add(socket.id);
      const total = room.members.length;
      const votes = room.skipVotes.size;
      io.to(roomId).emit('skip-votes', { votes, required: Math.ceil(total / 2) });

      // Majority vote threshold
      if (votes >= Math.ceil(total / 2)) {
        room.skipVotes.clear();
        io.to(roomId).emit('skip-votes', { votes: 0, required: Math.ceil(total / 2) });
        io.to(roomId).emit('force-skip');
      }
    });

    // ── CHAT MESSAGE ───────────────────────────────────────────────────
    socket.on('chat-message', ({ roomId, message }) => {
      const room = getRoom(roomId);
      if (!room || !socket.rooms.has(roomId)) return;
      const member = room.members.find(m => m.id === socket.id);
      if (!message?.trim() || message.length > 200) return;
      io.to(roomId).emit('chat-message', {
        id: `${socket.id}-${Date.now()}`,
        userId: socket.id,
        name: member?.name || 'Guest',
        avatar: member?.avatar || '',
        message: message.trim(),
        timestamp: Date.now(),
      });
    });

    // ── DISCONNECT ─────────────────────────────────────────────────────
    socket.on('disconnecting', () => {
      socket.rooms.forEach(roomId => {
        const room = getRoom(roomId);
        if (!room) return;

        room.members = room.members.filter(m => m.id !== socket.id);
        room.skipVotes.delete(socket.id);

        if (room.members.length === 0) {
          // Keep room alive for 2 minutes in case host refreshes
          setTimeout(() => {
            if (getRoom(roomId)?.members.length === 0) rooms.delete(roomId);
          }, 120_000);
        } else {
          // Transfer host to next co-host, or first member
          if (room.hostId === socket.id) {
            const coHost = room.members.find(m => m.role === 'co-host');
            const nextHost = coHost || room.members[0];
            nextHost.isHost = true;
            nextHost.role = 'host';
            room.hostId = nextHost.id;
            io.to(roomId).emit('new-host', room.hostId);
            io.to(roomId).emit('room-members', room.members);
          } else {
            io.to(roomId).emit('room-members', room.members);
          }
        }
      });
    });

    // ── LIST ROOMS (public lobby) ──────────────────────────────────────
    socket.on('list-rooms', (callback) => {
      const publicRooms = Array.from(rooms.entries()).map(([code, room]) => ({
        code,
        memberCount: room.members.length,
        currentSong: room.state.currentSong,
        playing: room.state.playing,
      }));
      callback?.(publicRooms);
    });
  });

  // ─── Search API ──────────────────────────────────────────────────────────
  app.get('/api/search', async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query?.trim()) return res.status(400).json({ error: 'Missing query' });

      const r = await yts(`${query} official audio`);
      const videos = r.videos
        .filter((v: any) => v.seconds > 40 && !['#shorts', 'tiktok', 'reels'].some(s => v.title.toLowerCase().includes(s)))
        .slice(0, 12)
        .map((v: any) => ({
          id: v.videoId || '',
          title: v.title || 'Unknown Title',
          artist: v.author?.name || 'Unknown Artist',
          duration: v.seconds || 0,
          thumbnail: v.image || v.thumbnail || '',
        }));

      res.json(videos);
    } catch (error) {
      console.error('[Search] Error:', error);
      res.status(500).json({ error: 'Search failed' });
    }
  });

  // ─── Recommendations API ─────────────────────────────────────────────────
  app.get('/api/recommendations', async (req, res) => {
    try {
      const title = req.query.title as string;
      const artist = req.query.artist as string;
      if (!title) return res.status(400).json({ error: 'Missing song info' });

      const searchTerms = `${artist} best songs playlist mix`;
      const r = await yts(searchTerms);
      const currentWords = title.toLowerCase().split(' ').filter((w: string) => w.length > 3);

      const videos = r.videos
        .filter((v: any) => {
          const vTitle = v.title.toLowerCase();
          if (currentWords.every((w: string) => vTitle.includes(w))) return false;
          if (v.seconds < 60) return false;
          if (vTitle.includes('#shorts') || vTitle.includes('tiktok')) return false;
          return true;
        })
        .slice(0, 15) // increased from 5 to 15
        .map((v: any) => ({
          id: v.videoId || '',
          title: v.title || 'Unknown Title',
          artist: v.author?.name || 'Unknown Artist',
          duration: v.seconds || 0,
          thumbnail: v.image || v.thumbnail || '',
        }));

      res.json(videos);
    } catch (error) {
      console.error('[Recs] Error:', error);
      res.status(500).json({ error: 'Failed to get recommendations' });
    }
  });


  // ─── Home API (with 30-min server-side cache) ────────────────────────────
  app.get('/api/home', async (req, res) => {
    // Check cache
    if (homeCache && Date.now() - homeCache.timestamp < HOME_CACHE_TTL_MS) {
      console.log('[Home] Serving from cache');
      return res.json(homeCache.data);
    }

    console.log('[Home] Fetching fresh home feed...');
    try {
      const categories = [
        { id: 'global', title: '🌍 Global Top 50', query: 'top hits global 2024 official music' },
        { id: 'cyberpunk', title: '🤖 Cyberpunk Essentials', query: 'dark synthwave cyberpunk industrial mix' },
        { id: 'lofi', title: '☕ Late Night Coffee Shop', query: 'lofi jazz hip hop chill beats' },
        { id: 'rock', title: '🎸 Rock Legends', query: 'classic rock greatest hits official' },
        { id: 'hyperpop', title: '⚡ Hyperpop & Future', query: 'hyperpop glitchcore 2024 new' },
        { id: 'classical', title: '🎻 Modern Classical', query: 'cinematic orchestral modern classical' },
        { id: 'workout', title: '💪 Power Workout', query: 'phonk workout high energy music' },
        { id: 'jazz', title: '🎷 Jazz for Rainy Nights', query: 'smooth jazz saxophone night mix' },
        { id: 'bollywood', title: '🎬 Bollywood Gems', query: 'bollywood hit songs 2024' },
        { id: 'retro', title: '🕹️ 80s Synthwave Disco', query: '80s disco retro synthwave official' },
        { id: 'ambient', title: '🌊 Ambient Study Flow', query: 'ambient meditation study music' },
        { id: 'hardstyle', title: '🔥 Hardstyle Rebellion', query: 'hardstyle rawstyle gym music' },
        { id: 'acoustic', title: '🎵 Unplugged & Acoustic', query: 'acoustic covers popular songs official' },
        { id: 'afrobeats', title: '🌺 Global Afrobeats', query: 'top afrobeats hits 2024' },
        { id: 'metal', title: '🤘 Metal Heavies', query: 'heavy metal top tracks 2024' },
      ];

      const results = await Promise.all(categories.map(async (cat) => {
        try {
          const r = await yts(cat.query);
          const songs = r.videos
            .filter((v: any) => v.seconds > 40 && v.seconds < 3600)
            .slice(0, 10)
            .map((v: any) => ({
              id: v.videoId,
              title: v.title,
              artist: v.author.name,
              duration: v.seconds,
              thumbnail: v.image,
            }));
          return { ...cat, songs };
        } catch {
          return { ...cat, songs: [] };
        }
      }));

      homeCache = { data: results, timestamp: Date.now() };
      res.json(results);
    } catch (error) {
      console.error('[Home] Error:', error);
      // Return cached stale data if available
      if (homeCache) return res.json(homeCache.data);
      res.status(500).json({ error: 'Failed to fetch home feed' });
    }
  });

  // ─── Room Info API ────────────────────────────────────────────────────────
  app.get('/api/room/:code', (req, res) => {
    const room = getRoom(req.params.code.toUpperCase());
    if (!room) return res.status(404).json({ error: 'Room not found' });
    res.json({
      code: room.code,
      memberCount: room.members.length,
      currentSong: room.state.currentSong,
      playing: room.state.playing,
    });
  });

  // ─── Vite / Static ───────────────────────────────────────────────────────
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🎵 YouWe ♥ Server — http://localhost:${PORT}`);
    console.log(`📡 Socket.IO ready | CORS: ${CORS_ORIGIN}\n`);
  });
}

startServer();
