import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Copy, Check, Users, MessageCircle, Music, SkipForward, ListPlus, Crown, ThumbsUp, Send, X, LogOut } from 'lucide-react';
import { useStore } from '../store';
import { SongMetadata } from '../types';

const EMOJIS = ['🔥', '❤️', '🎵', '💀', '👑', '🎶', '⚡', '🤯'];

interface FloatingReaction {
  id: string;
  emoji: string;
  x: number;
}

interface JamRoomProps {
  roomCode: string;
  onLeave: () => void;
  jamSync: {
    sendReaction: (emoji: string) => void;
    requestSong: (song: SongMetadata) => void;
    approveRequest: (id: string) => void;
    voteSkip: () => void;
    sendChat: (message: string) => void;
    promoteCoHost: (id: string) => void;
  };
}

export function JamRoom({ roomCode, onLeave, jamSync }: JamRoomProps) {
  const { users, currentSong, isHost, jamReactions, skipVotes, songRequests, chatMessages, currentUser, socket } = useStore();
  const [activeTab, setActiveTab] = useState<'vibes' | 'queue' | 'chat'>('vibes');
  const [chatInput, setChatInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([]);
  const [hasVotedSkip, setHasVotedSkip] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const mySkipVotedRef = useRef(false);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Animate incoming reactions
  useEffect(() => {
    if (jamReactions.length === 0) return;
    const latest = jamReactions[jamReactions.length - 1];
    const floating: FloatingReaction = { id: latest.id, emoji: latest.emoji, x: 20 + Math.random() * 60 };
    setFloatingReactions(prev => [...prev.slice(-15), floating]);
    setTimeout(() => setFloatingReactions(prev => prev.filter(r => r.id !== floating.id)), 2500);
  }, [jamReactions]);

  const copyRoomCode = () => {
    const url = `${window.location.origin}?jam=${roomCode}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const sendReaction = (emoji: string) => {
    navigator.vibrate?.(10);
    jamSync.sendReaction(emoji);
  };

  const handleVoteSkip = () => {
    if (mySkipVotedRef.current) return;
    mySkipVotedRef.current = true;
    setHasVotedSkip(true);
    jamSync.voteSkip();
  };

  const sendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    jamSync.sendChat(chatInput.trim());
    setChatInput('');
  };

  return (
    <div className="flex flex-col h-full relative overflow-hidden">
      {/* Floating Emoji Reactions */}
      <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
        <AnimatePresence>
          {floatingReactions.map(r => (
            <motion.div
              key={r.id}
              initial={{ opacity: 1, y: '80%', scale: 0.5 }}
              animate={{ opacity: 0, y: '0%', scale: 1.5 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2.2, ease: 'easeOut' }}
              className="absolute text-2xl select-none"
              style={{ left: `${r.x}%` }}
            >
              {r.emoji}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Room Header */}
      <div className="shrink-0 px-4 py-3 border-b border-white/5">
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">Jam Room</span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-lg font-black tracking-widest text-white">{roomCode}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={copyRoomCode}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all border
                ${copied ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-white/5 border-white/10 text-white/60 hover:text-white'}`}
              title="Copy invite link"
            >
              {copied ? <><Check className="w-3 h-3" />Copied!</> : <><Copy className="w-3 h-3" />Share</>}
            </button>
            <button
              onClick={onLeave}
              className="flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-[10px] font-bold text-red-400/70 hover:text-red-400 hover:bg-red-500/10 border border-white/5 transition-all"
              title="Leave room"
            >
              <LogOut className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Members strip */}
        <div className="flex items-center gap-2 mt-2">
          <div className="flex -space-x-2">
            {users.slice(0, 5).map(u => (
              <div
                key={u.id}
                className="w-6 h-6 rounded-full border-2 border-void-bg overflow-hidden bg-neutral-800"
                title={u.name}
              >
                {u.avatar
                  ? <img src={u.avatar} className="w-full h-full object-cover" alt={u.name} />
                  : <div className="w-full h-full flex items-center justify-center text-[8px] font-bold text-white">{u.name.slice(0, 2).toUpperCase()}</div>
                }
              </div>
            ))}
          </div>
          <span className="text-[10px] text-white/30 font-semibold">{users.length} in room</span>
          {users.length > 5 && <span className="text-[9px] text-white/20">+{users.length - 5} more</span>}
        </div>
      </div>

      {/* Now Playing mini card */}
      {currentSong && (
        <div className="shrink-0 mx-3 mt-3 flex items-center gap-2.5 rounded-xl bg-white/5 border border-white/5 p-2">
          <img src={currentSong.thumbnail} className="w-10 h-10 rounded-lg object-cover" alt="" />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold truncate">{currentSong.title}</p>
            <p className="text-[9px] text-white/30 truncate">{currentSong.artist}</p>
          </div>
          {/* Vote to skip */}
          <button
            onClick={handleVoteSkip}
            disabled={hasVotedSkip}
            className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[9px] font-bold transition-all border
              ${hasVotedSkip ? 'bg-white/5 border-white/5 text-white/20' : 'bg-white/5 border-white/10 text-white/50 hover:text-white hover:border-white/20 active:scale-95'}`}
            title="Vote to skip"
          >
            <SkipForward className="w-3 h-3" />
            {skipVotes.votes > 0 && <span>{skipVotes.votes}/{skipVotes.required}</span>}
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="shrink-0 flex gap-1 px-3 mt-3">
        {([['vibes', '🎛️ Vibes'], ['queue', `🎵 Requests${songRequests.length ? ` (${songRequests.length})` : ''}`], ['chat', `💬 Chat${chatMessages.length ? '' : ''}`]] as const).map(([tab, label]) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 rounded-xl py-1.5 text-[9px] font-bold uppercase tracking-wider transition-all border
              ${activeTab === tab ? 'bg-white/10 border-white/15 text-white' : 'bg-transparent border-transparent text-white/30 hover:text-white/50'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 flex flex-col mt-2 px-3 pb-4 min-h-0 overflow-hidden">
        {activeTab === 'vibes' && (
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-5">
            {/* Emoji Reaction Pad */}
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/25 mb-2.5">Express your vibe</p>
              <div className="grid grid-cols-4 gap-2">
                {EMOJIS.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => sendReaction(emoji)}
                    className="aspect-square rounded-2xl bg-white/5 border border-white/5 text-2xl flex items-center justify-center hover:bg-white/10 hover:scale-105 active:scale-90 transition-all shadow-lg cursor-pointer"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Members list */}
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/25 mb-2">In the room</p>
              <div className="space-y-1">
                {users.map(user => (
                  <div key={user.id} className="flex items-center gap-2.5 rounded-xl p-2 hover:bg-white/5 transition-colors">
                    <div className="relative w-8 h-8 rounded-full overflow-hidden bg-neutral-800 border border-white/10">
                      {user.avatar
                        ? <img src={user.avatar} className="w-full h-full object-cover" alt={user.name} />
                        : <div className="w-full h-full flex items-center justify-center text-[9px] font-bold">{user.name.slice(0, 2).toUpperCase()}</div>
                      }
                      <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-400 border border-void-bg" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold truncate">{user.name}</p>
                      <p className="text-[9px] text-white/30">{user.role || (user.isHost ? 'host' : 'listener')}</p>
                    </div>
                    {user.isHost && <Crown className="w-3.5 h-3.5 text-yellow-400" />}
                    {isHost && !user.isHost && user.id !== currentUser?.uid && (
                      <button
                        onClick={() => jamSync.promoteCoHost(user.id)}
                        className="text-[9px] text-white/20 hover:text-void-accent transition-colors"
                        title="Make co-host"
                      >
                        <ThumbsUp className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'queue' && (
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/25">Song Requests</p>
            {songRequests.length === 0 ? (
              <div className="py-8 text-center text-white/20">
                <Music className="w-6 h-6 mx-auto mb-2 opacity-20" />
                <p className="text-xs">No requests yet</p>
                <p className="text-[10px] mt-1 text-white/15">Search for a song to request it</p>
              </div>
            ) : (
              songRequests.map(req => (
                <div key={req.id} className="flex items-center gap-2.5 rounded-xl bg-white/5 border border-white/5 p-2.5">
                  <img src={req.song.thumbnail} className="w-9 h-9 rounded-lg object-cover" alt="" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold truncate">{req.song.title}</p>
                    <p className="text-[9px] text-white/30">by {req.requestedBy}</p>
                  </div>
                  {isHost && (
                    <button
                      onClick={() => jamSync.approveRequest(req.id)}
                      className="rounded-lg bg-void-accent/20 border border-void-accent/30 text-void-accent px-2 py-1 text-[9px] font-bold hover:bg-void-accent/30 transition-all active:scale-95 cursor-pointer"
                    >
                      Add
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 space-y-2 overflow-y-auto custom-scrollbar pr-1">
              {chatMessages.length === 0 ? (
                <div className="py-8 text-center text-white/20">
                  <MessageCircle className="w-6 h-6 mx-auto mb-2 opacity-20" />
                  <p className="text-xs">No messages yet</p>
                </div>
              ) : (
                chatMessages.map(msg => (
                  <div key={msg.id} className={`flex gap-2 ${msg.userId === socket?.id ? 'flex-row-reverse' : ''}`}>
                    <div className="w-6 h-6 rounded-full bg-neutral-800 overflow-hidden shrink-0 border border-white/10">
                      {msg.avatar ? <img src={msg.avatar} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center text-[8px] font-bold">{msg.name.slice(0, 2).toUpperCase()}</div>}
                    </div>
                    <div className={`max-w-[75%] ${msg.userId === socket?.id ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                      <span className="text-[8px] text-white/25 font-semibold">{msg.name}</span>
                      <div className={`rounded-2xl px-3 py-1.5 text-[11px] font-medium
                        ${msg.userId === socket?.id ? 'bg-void-accent/20 border border-void-accent/20 text-white' : 'bg-white/5 border border-white/5 text-white/80'}`}>
                        {msg.message}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={sendChat} className="flex gap-2 mt-3 shrink-0">
              <input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                placeholder="Say something..."
                maxLength={200}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs placeholder:text-white/20 focus:outline-none focus:border-white/25 text-white"
              />
              <button type="submit" disabled={!chatInput.trim()} className="p-2 rounded-xl bg-white/10 border border-white/10 text-white/50 hover:text-white hover:bg-white/15 transition-all disabled:opacity-20 active:scale-90 cursor-pointer">
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
