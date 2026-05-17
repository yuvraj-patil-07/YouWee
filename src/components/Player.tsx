import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, SkipForward, SkipBack, Users, Volume2, VolumeX, ListMusic, X, Trash2, Shuffle, Repeat, Repeat1, Heart, Mic2, ChevronDown, Share2, MoreHorizontal, Settings2, Minus, Maximize2 } from 'lucide-react';
import YouTube from 'react-youtube';
import { useStore } from '../store';
import { useAudioPlayer } from '../hooks/useAudioPlayer';

class YouTubeErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('YouTube inner crash caught:', error);
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

export function Player() {
  const {
    currentSong, roomState, setRoomState, users, isHost,
    queue, playNextInQueue, playPrev, playFromQueue, removeFromQueueAt, emitRoomState,
    shuffleMode, repeatMode, toggleShuffle, cycleRepeat,
    likedSongs, toggleLike,
  } = useStore();
  const { onReady, onStateChange, play, pause, seekTo, getCurrentTime, isReady, setVolume } = useAudioPlayer();
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolumeState] = useState(80);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showVolume, setShowVolume] = useState(false);
  const youtubeOpts = useMemo(
    () => ({
      height: '200',
      width: '300',
      playerVars: {
        autoplay: 1,
        controls: 0,
        rel: 0,
        playsinline: 1,
        origin: window.location.origin,
      },
    }),
    [],
  );

  const isLiked = likedSongs.some(l => l.id === currentSong?.id);

  useEffect(() => {
    if (!currentSong || !isReady) return;
    const interval = setInterval(() => {
      try {
        const current = getCurrentTime();
        const total = currentSong.duration || 1;
        const progressValue = (current / total) * 100;
        if (!isNaN(progressValue)) { setProgress(progressValue); setCurrentTime(current); }
        if ((!useStore.getState().isInJamRoom || isHost) && Math.abs(current - roomState.currentTime) > 1) { setRoomState({ currentTime: current }); }
      } catch (e) { console.error('Player interval error:', e); }
    }, 1000);
    return () => clearInterval(interval);
  }, [currentSong, isHost, getCurrentTime, setRoomState, isReady, roomState.currentTime]);

  const handleSeek = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const x = clientX - rect.left;
    const percent = Math.max(0, Math.min(1, x / rect.width));
    const newTime = percent * (currentSong?.duration || 0);
    seekTo(newTime);
    setRoomState({ currentTime: newTime });
    emitRoomState({ currentTime: newTime });
  };

  const handlePlayPause = () => {
    const nextPlaying = !roomState.playing;
    const currentTimeNow = getCurrentTime();
    navigator.vibrate?.(8);
    setRoomState({ playing: nextPlaying, currentTime: currentTimeNow });
    emitRoomState({ playing: nextPlaying, currentTime: currentTimeNow });
    if (nextPlaying) play(); else pause();
  };

  if (!roomState.videoId) return null;

  const repeatIcon = repeatMode === 'one'
    ? <Repeat1 className="h-3.5 w-3.5 sm:h-4 sm:w-4 fill-current" />
    : <Repeat className="h-3.5 w-3.5 sm:h-4 sm:w-4" />;

  return (
    <>
      {/* Hidden YouTube iframe */}
      <div style={{ position: 'fixed', top: '-9999px', left: '-9999px', width: '300px', height: '200px', overflow: 'hidden', pointerEvents: 'none' }}>
        <YouTubeErrorBoundary>
          <YouTube
            videoId={roomState.videoId}
            opts={youtubeOpts}
            onReady={onReady}
            onStateChange={onStateChange}
            onEnd={() => { if (isHost) playNextInQueue(); }}
            onError={(e) => console.error('YouTube Player Error:', e.data)}
          />
        </YouTubeErrorBoundary>
      </div>

      {/* Queue Panel */}
      <AnimatePresence>
        {isQueueOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.98 }}
            className="fixed bottom-[148px] left-3 right-3 z-[110] mx-auto max-w-xl overflow-hidden rounded-2xl border border-white/10 bg-black/90 shadow-[0_28px_80px_rgba(0,0,0,0.75)] backdrop-blur-2xl sm:bottom-[140px]"
          >
            <div className="flex h-12 items-center gap-3 border-b border-white/10 px-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10">
                <ListMusic className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black uppercase tracking-[0.18em]">Up Next</p>
                <p className="truncate text-[10px] font-semibold text-white/40">
                  {queue.length ? `${queue.length} songs queued` : 'Add songs from Home, Search, or Recommendations'}
                </p>
              </div>
              <button type="button" onClick={() => setIsQueueOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-xl text-white/55 transition-colors hover:bg-white/10 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[38vh] overflow-y-auto p-2 custom-scrollbar">
              {queue.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm font-semibold text-white/35">Your queue is empty.</div>
              ) : (
                queue.map((song, index) => (
                  <div key={`${song.id}-${index}`} className="group flex min-h-14 items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-white/[0.07]">
                    <span className="w-5 shrink-0 text-center text-[10px] font-black text-white/25">{String(index + 1).padStart(2, '0')}</span>
                    <img src={song.thumbnail} alt="" className="h-10 w-10 shrink-0 rounded-lg border border-white/10 object-cover" />
                    <button type="button" onClick={() => playFromQueue(index)} className="min-w-0 flex-1 text-left" title={`Play ${song.title}`}>
                      <p className="truncate text-sm font-bold group-hover:text-void-accent">{song.title}</p>
                      <p className="truncate text-xs font-medium text-white/40">{song.artist}</p>
                    </button>
                    <button type="button" onClick={() => removeFromQueueAt(index)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/35 transition-colors hover:bg-white/10 hover:text-white">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expanded Player View */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300, mass: 0.8 }}
            className="expanded-player fixed inset-0 z-[100] flex flex-col bg-void-bg"
          >
            {/* Background Blur Artwork */}
            <div className="absolute inset-0 z-0 overflow-hidden opacity-30">
              <img src={currentSong?.thumbnail} className="h-full w-full object-cover blur-[100px] scale-150" alt="" />
              <div className="absolute inset-0 bg-gradient-to-b from-void-bg/50 via-void-bg to-void-bg" />
            </div>

            {/* Header */}
            <div className="relative z-10 flex items-center justify-between px-6 py-6 sm:px-12">
              <button onClick={() => setIsExpanded(false)} className="p-3 rounded-full hover:bg-white/10 transition-colors">
                <ChevronDown className="w-8 h-8" />
              </button>
              <div className="text-center">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40">Now Playing</p>
                <p className="text-xs font-bold text-void-accent uppercase tracking-widest mt-1">Synced to Jam</p>
              </div>
              <button className="p-3 rounded-full hover:bg-white/10 transition-colors text-white/40">
                <Settings2 className="w-6 h-6" />
              </button>
            </div>

            {/* Content Container */}
            <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-8 pb-12 max-w-5xl mx-auto w-full">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center w-full">
                
                {/* Left: Large Artwork */}
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="album-art relative mx-auto w-full max-w-[320px] sm:max-w-[480px] aspect-square rounded-[3rem] overflow-hidden shadow-[0_50px_100px_rgba(0,0,0,0.8)] border border-white/10 group"
                >
                  <img src={currentSong?.thumbnail} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" alt="" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                  
                  {/* Dynamic Glow */}
                  <div className="absolute -inset-4 bg-void-accent/20 blur-3xl rounded-full opacity-50 group-hover:opacity-100 transition-opacity" />
                </motion.div>

                {/* Right: Info & Detailed Controls */}
                <div className="flex flex-col gap-8">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <motion.h1 
                        layoutId="player-title"
                        className="text-3xl sm:text-5xl font-black tracking-tighter leading-tight"
                      >
                        {currentSong?.title}
                      </motion.h1>
                      <button onClick={() => currentSong && toggleLike(currentSong)} className={`p-4 rounded-full transition-all active:scale-90 ${isLiked ? 'text-pink-500' : 'text-white/20'}`}>
                        <Heart className={`w-8 h-8 ${isLiked ? 'fill-current' : ''}`} />
                      </button>
                    </div>
                    <p className="text-xl sm:text-2xl font-bold text-void-accent opacity-80">{currentSong?.artist}</p>
                  </div>

                  {/* Progress Section */}
                  <div className="space-y-3">
                    <div className="player-progress h-2 w-full bg-white/5 rounded-full overflow-hidden cursor-pointer group/seek" onClick={handleSeek}>
                      <div className="h-full bg-void-accent relative shadow-[0_0_20px_rgba(0,212,255,0.5)]" style={{ width: `${progress}%` }}>
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full scale-0 group-hover/seek:scale-100 transition-transform shadow-xl" />
                      </div>
                    </div>
                    <div className="flex justify-between font-mono text-sm font-bold text-white/30 tabular-nums">
                      <span>{Math.floor(currentTime / 60)}:{Math.floor(currentTime % 60).toString().padStart(2, '0')}</span>
                      <span>{Math.floor((currentSong?.duration || 0) / 60)}:{Math.floor((currentSong?.duration || 0) % 60).toString().padStart(2, '0')}</span>
                    </div>
                  </div>

                  {/* Playback Controls */}
                  <div className="flex items-center justify-between px-2">
                    <button onClick={toggleShuffle} className={`p-3 rounded-xl transition-all ${shuffleMode ? 'text-void-accent bg-void-accent/10' : 'text-white/30'}`}>
                      <Shuffle className="w-6 h-6" />
                    </button>
                    <div className="flex items-center gap-6 sm:gap-10">
                      <button onClick={playPrev} className="p-4 text-white/60 hover:text-white transition-all active:scale-90">
                        <SkipBack className="w-10 h-10 fill-current" />
                      </button>
                      <button onClick={handlePlayPause} className="w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center rounded-full bg-white text-black shadow-[0_20px_50px_rgba(255,255,255,0.2)] hover:scale-105 active:scale-95 transition-all">
                        {roomState.playing ? <Pause className="w-10 h-10 fill-current" /> : <Play className="w-10 h-10 fill-current ml-2" />}
                      </button>
                      <button onClick={playNextInQueue} className="p-4 text-white/60 hover:text-white transition-all active:scale-90">
                        <SkipForward className="w-10 h-10 fill-current" />
                      </button>
                    </div>
                    <button onClick={cycleRepeat} className={`p-3 rounded-xl transition-all ${repeatMode !== 'off' ? 'text-void-accent bg-void-accent/10' : 'text-white/30'}`}>
                      {repeatIcon}
                    </button>
                  </div>

                  {/* Secondary Actions Row */}
                  <div className="flex items-center justify-center gap-8 pt-4">
                    <button onClick={() => setIsQueueOpen(true)} className="flex items-center gap-3 px-6 py-3 rounded-2xl border border-white/10 text-white/50 bg-white/5 hover:bg-white/10 transition-all">
                      <ListMusic className="w-5 h-5" />
                      <span className="text-sm font-bold uppercase tracking-widest">Queue</span>
                    </button>
                    <button className="p-4 rounded-full bg-white/5 border border-white/10 text-white/50 hover:text-white transition-all">
                      <Share2 className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Metadata Specs */}
                  <div className="mt-8 grid grid-cols-3 gap-4 border-t border-white/5 pt-8">
                    <div className="text-center">
                      <p className="text-[10px] font-black uppercase tracking-widest text-white/20 mb-1">Quality</p>
                      <p className="text-xs font-bold text-white/60">FLAC 24-bit</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] font-black uppercase tracking-widest text-white/20 mb-1">Source</p>
                      <p className="text-xs font-bold text-white/60">YouTube HQ</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] font-black uppercase tracking-widest text-white/20 mb-1">Sync</p>
                      <p className="text-xs font-bold text-green-400">Low Latency</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Volume Popup */}
      <AnimatePresence>
        {showVolume && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            className="fixed bottom-[148px] right-4 z-50 flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-black/80 p-3 backdrop-blur-2xl shadow-2xl sm:hidden"
          >
            <VolumeX className="w-4 h-4 text-white/30" />
            <input
              type="range" min="0" max="100" value={volume}
              onChange={(e) => { const v = parseInt(e.target.value); setVolumeState(v); setVolume(v); }}
              className="h-24 w-2 cursor-pointer appearance-none rounded-full bg-white/10"
              style={{ writingMode: 'vertical-lr', direction: 'rtl', background: `linear-gradient(to top, white 0%, white ${volume}%, rgba(255,255,255,0.1) ${volume}%, rgba(255,255,255,0.1) 100%)` }}
            />
            <Volume2 className="w-4 h-4 text-white/80" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Vinyl Disk (Minimized State) */}
      <AnimatePresence>
        {isMinimized && !isExpanded && (
          <motion.div
            initial={{ scale: 0, x: 100, opacity: 0 }}
            animate={{ scale: 1, x: 0, opacity: 1 }}
            exit={{ scale: 0, x: 100, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            drag
            dragConstraints={{ left: -window.innerWidth + 100, right: 0, top: -window.innerHeight + 100, bottom: 0 }}
            onClick={() => setIsMinimized(false)}
            className="fixed bottom-24 right-6 z-[200] cursor-pointer group"
          >
            <div className="relative">
              {/* Vinyl Base */}
              <div className={`h-16 w-16 rounded-full bg-black border-4 border-neutral-800 shadow-2xl overflow-hidden relative ${roomState.playing ? 'animate-spin-slow' : ''}`}>
                <img src={currentSong?.thumbnail} className="h-full w-full object-cover opacity-60" alt="" />
                <div className="absolute inset-0 bg-[radial-gradient(circle,transparent_20%,black_100%)]" />
                {/* Center Hole */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-void-bg rounded-full border border-white/20 z-10" />
              </div>
              
              {/* Vibe Pulse */}
              <div className={`absolute -inset-1 rounded-full border border-void-accent/50 ${roomState.playing ? 'animate-ping opacity-20' : 'opacity-0'}`} />
              
              {/* Mini Play/Pause Indicator */}
              <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-void-accent flex items-center justify-center text-black shadow-lg">
                {roomState.playing ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current ml-0.5" />}
              </div>
            </div>
            {/* Tooltip */}
            <div className="absolute right-full mr-4 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-black/80 backdrop-blur-xl border border-white/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              <p className="text-[10px] font-black text-white">{currentSong?.title}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Player Bar */}
      <motion.footer
        initial={{ y: 200, opacity: 0 }}
        animate={{ y: isMinimized ? 200 : 0, opacity: isMinimized ? 0 : 1 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="player-shell fixed bottom-[58px] left-1/2 z-50 flex min-h-[68px] w-[calc(100%-1rem)] max-w-4xl -translate-x-1/2 flex-col overflow-hidden rounded-2xl border border-white/10 bg-black/80 shadow-[0_20px_60px_rgba(0,0,0,0.8)] backdrop-blur-3xl sm:bottom-6 sm:min-h-[88px] lg:bottom-6"
      >
        {/* Progress bar — full width, large touch target */}
        <div
          className="player-progress relative h-1 w-full cursor-pointer group/progress"
          onClick={handleSeek}
          onTouchStart={handleSeek}
          style={{ touchAction: 'none' }}
        >
          {/* Invisible tall touch target */}
          <div className="absolute inset-x-0 -top-3 h-7 z-10" onClick={handleSeek} onTouchStart={handleSeek} />
          <div className="h-full w-full bg-white/5">
            <div
              className="h-full bg-gradient-to-r from-void-accent to-pink-500 relative shadow-[0_0_8px_rgba(255,107,0,0.5)] transition-all duration-300"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white scale-0 group-hover/progress:scale-100 transition-transform shadow-lg" />
            </div>
          </div>
        </div>

        {/* Controls Row */}
        <div className="flex flex-1 items-center gap-1.5 px-2 py-1.5 sm:gap-4 sm:px-5 sm:py-2">
          {/* Song Info */}
          <div 
            onClick={() => setIsExpanded(true)}
            className="flex min-w-0 flex-[1.5] items-center gap-2 sm:w-[240px] sm:flex-none md:w-[300px] cursor-pointer group/mini"
          >
            <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg border border-white/5 bg-neutral-800 shadow-lg sm:h-12 sm:w-12 transition-transform group-hover/mini:scale-105">
              <img src={currentSong?.thumbnail} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="overflow-hidden min-w-0 flex-1">
              <div className="relative overflow-hidden group/marquee">
                <p className={`text-[12px] font-black sm:text-[14px] whitespace-nowrap leading-tight transition-colors group-hover/mini:text-void-accent ${currentSong && currentSong.title.length > 20 ? 'animate-marquee hover:pause' : ''}`}>
                  {currentSong?.title}
                  {currentSong && currentSong.title.length > 20 && <span className="ml-8">{currentSong.title}</span>}
                </p>
              </div>
              <p className="text-[10px] sm:text-[11px] text-white/40 truncate italic font-medium">{currentSong?.artist}</p>
            </div>
          </div>

          <div className="flex items-center">
            {/* Like button */}
            <button
              onClick={(e) => { e.stopPropagation(); navigator.vibrate?.(10); currentSong && toggleLike(currentSong); }}
              className={`shrink-0 p-1 rounded-full transition-all active:scale-90 ${isLiked ? 'text-pink-500' : 'text-white/20 hover:text-white/50'}`}
              title={isLiked ? 'Unlike' : 'Like'}
            >
              <Heart className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isLiked ? 'fill-current' : ''}`} />
            </button>
          </div>

          {/* Center Controls */}
          <div className="flex shrink-0 flex-col items-center gap-1 sm:flex-1">
            <div className="flex items-center gap-1.5 sm:gap-5 md:gap-6">
              {/* Shuffle - Desktop Only or Right Side */}
              <button
                onClick={() => { navigator.vibrate?.(8); toggleShuffle(); }}
                className={`hidden sm:block transition-all active:scale-90 ${shuffleMode ? 'text-void-accent' : 'text-white/30 hover:text-white/60'}`}
                title="Shuffle"
              >
                <Shuffle className="h-4 w-4" />
              </button>

              {/* Skip Back */}
              <button
                onClick={() => { navigator.vibrate?.(8); playPrev(); }}
                className="text-white/40 hover:text-white transition-all active:scale-90 p-1"
                title="Previous"
              >
                <SkipBack className="h-4 w-4 fill-current sm:h-5 sm:w-5" />
              </button>

              {/* Play/Pause */}
              <button
                onClick={handlePlayPause}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-black shadow-xl transition-all hover:scale-105 active:scale-90 sm:h-11 sm:w-11"
              >
                {roomState.playing
                  ? <Pause className="h-4 w-4 fill-current sm:h-5 sm:w-5" />
                  : <Play className="ml-0.5 h-4 w-4 fill-current sm:h-5 sm:w-5" />
                }
              </button>

              {/* Skip Forward */}
              <button
                onClick={() => { navigator.vibrate?.(8); playNextInQueue(); }}
                className={`transition-all active:scale-90 p-1 ${queue.length === 0 ? 'text-white/10 cursor-not-allowed' : 'text-white/40 hover:text-white'}`}
                disabled={queue.length === 0}
                title="Next"
              >
                <SkipForward className="h-4 w-4 fill-current sm:h-5 sm:w-5" />
              </button>

              {/* Repeat - Desktop Only */}
              <button
                onClick={() => { navigator.vibrate?.(8); cycleRepeat(); }}
                className={`hidden sm:block transition-all active:scale-90 ${repeatMode !== 'off' ? 'text-void-accent' : 'text-white/30 hover:text-white/60'}`}
                title={`Repeat: ${repeatMode}`}
              >
                {repeatIcon}
              </button>
            </div>

            {/* Time + Seek bar (row below on sm+) */}
            <div className="hidden sm:flex w-full max-w-[400px] items-center gap-2">
              <span className="font-mono text-[9px] tabular-nums text-white/30 min-w-[32px] text-right">
                {Math.floor(currentTime / 60)}:{Math.floor(currentTime % 60).toString().padStart(2, '0')}
              </span>
              <div
                className="flex-1 h-[2px] bg-white/5 rounded-full overflow-visible cursor-pointer group/bar relative"
                onClick={handleSeek}
              >
                <div className="h-full bg-void-accent rounded-full relative" style={{ width: `${progress}%` }}>
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white rounded-full scale-0 group-hover/bar:scale-100 transition-transform shadow-lg" />
                </div>
              </div>
              <span className="font-mono text-[9px] tabular-nums text-white/30 min-w-[32px]">
                {Math.floor((currentSong?.duration || 0) / 60)}:{Math.floor((currentSong?.duration || 0) % 60).toString().padStart(2, '0')}
              </span>
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-1.5 sm:gap-3">
            {/* Mobile: volume tap */}
            <button
              onClick={() => setShowVolume(v => !v)}
              className={`p-1.5 rounded-lg transition-colors sm:hidden ${showVolume ? 'text-white' : 'text-white/20'}`}
              title="Volume"
            >
              <Volume2 className="w-3.5 h-3.5" />
            </button>

            {/* Desktop: volume slider */}
            <div className="hidden items-center gap-2 group md:flex">
              <Volume2 className="w-4 h-4 text-white/30 group-hover:text-white transition-colors" />
              <input
                type="range" min="0" max="100" value={volume}
                onChange={(e) => { const v = parseInt(e.target.value); setVolumeState(v); setVolume(v); }}
                className="w-20 h-[3px] rounded-full cursor-pointer appearance-none"
                style={{ background: `linear-gradient(to right, white 0%, white ${volume}%, rgba(255,255,255,0.05) ${volume}%, rgba(255,255,255,0.05) 100%)` }}
              />
            </div>

            {/* Desktop: Active users */}
            <div className="hidden sm:flex items-center gap-1.5 text-white/25">
              <Users className="w-3.5 h-3.5" />
              <span className="text-[10px] font-black">{users.length}</span>
            </div>

            <div className="flex items-center gap-1">
              {/* Queue button */}
              <button
                type="button"
                onClick={() => setIsQueueOpen(open => !open)}
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/10 transition-colors ${isQueueOpen ? 'bg-void-accent/20 border-void-accent/40 text-void-accent' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
                title={`${queue.length} songs in queue`}
              >
                <span className="relative">
                  <ListMusic className="h-3.5 w-3.5" />
                  {queue.length > 0 && (
                    <span className="absolute -right-1.5 -top-1.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-void-accent px-0.5 text-[8px] font-black text-black">
                      {queue.length}
                    </span>
                  )}
                </span>
              </button>

              {/* Minimize button */}
              <button
                onClick={() => setIsMinimized(true)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/40 hover:bg-white/10 transition-all active:scale-90"
                title="Minimize to Vinyl"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </motion.footer>
    </>
  );
}
