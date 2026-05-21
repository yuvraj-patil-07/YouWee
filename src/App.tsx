import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search as SearchIcon, Music, Radio, Compass, AlertCircle, Home, X, Heart, Play } from 'lucide-react';
import { onAuthStateChanged } from 'firebase/auth';
import { useStore } from './store';
import { Player } from './components/Player';
import { Search } from './components/Search';
import { Recommendations } from './components/Recommendations';
import { HomeAlbums } from './components/HomeAlbums';
import { ProfileModal } from './components/ProfileModal';
import { PlaylistManager } from './components/PlaylistManager';
import { JamRoom } from './components/JamRoom';
import { Library } from './components/Library';
import { ToastContainer } from './components/Toast';
import { useJamSync } from './hooks/useJamSync';
import { auth, completeRedirectSignIn, signInWithGoogle } from './lib/firebase';

function getSignInErrorMessage(error: unknown) {
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
  const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  switch (code) {
    case 'auth/unauthorized-domain': return `Firebase blocked this domain. Add "${hostname}" in Firebase Authentication > Settings > Authorized domains.`;
    case 'auth/operation-not-allowed': return 'Enable Google sign-in in Firebase Authentication.';
    case 'auth/network-request-failed': return 'Network error. Check your connection and try again.';
    case 'auth/popup-closed-by-user': return 'Sign-in window was closed before finishing.';
    default: return 'Google sign-in failed. Try again.';
  }
}

export default function App() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [currentView, setCurrentView] = useState<'home' | 'search' | 'library' | 'liked-songs'>('home');
  const [isJamHubOpen, setIsJamHubOpen] = useState(window.innerWidth >= 1024);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [theme, setTheme] = useState<'void' | 'pookie'>(() => {
    try { return localStorage.getItem('youwe_theme') === 'pookie' ? 'pookie' : 'void'; } catch { return 'void'; }
  });
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showJoinInput, setShowJoinInput] = useState(false);
  const [roomCodeInput, setRoomCodeInput] = useState('');
  
  const { roomId, setRoomId, currentSong, currentUser, setCurrentUser, users, isInJamRoom,
    setIsInJamRoom, setIsHost, setUsers, roomState, setRoomState, likedSongs, setAccentColor } = useStore();

  const jamSync = useJamSync(roomId, isInJamRoom, currentUser);

  useEffect(() => {
    const root = document.documentElement;
    const hour = new Date().getHours();
    const timeMood = hour < 11 ? 'sakura-morning' : hour < 18 ? 'warm-sunset' : 'rainy-night';
    root.setAttribute('data-theme', theme);
    root.setAttribute('data-pookie-time', timeMood);
    try { localStorage.setItem('youwe_theme', theme); } catch { /* ignore */ }
  }, [theme]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) { setSignInError(null); setIsSigningIn(false); }
    });
    completeRedirectSignIn().catch((error) => setSignInError(getSignInErrorMessage(error))).finally(() => setIsSigningIn(false));
    return () => unsub();
  }, [setCurrentUser]);

  useEffect(() => {
    if (currentSong?.thumbnail) {
      import('./utils/colorUtils').then(({ getAverageColor }) => {
        getAverageColor(currentSong.thumbnail).then(color => {
          setAccentColor(color);
          if (document.documentElement.getAttribute('data-theme') !== 'pookie') {
            document.documentElement.style.setProperty('--accent-color', color);
            document.documentElement.style.setProperty('--accent-glow', `${color}44`);
          }
        });
      });
    }
  }, [currentSong?.id, theme]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setIsSearchOpen(true); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    try { await signInWithGoogle(); } catch (error) { setSignInError(getSignInErrorMessage(error)); setIsSigningIn(false); }
  };

  const handleCreateRoom = () => {
    if (!currentUser) { handleGoogleSignIn(); return; }
    setRoomId(null);
    setIsInJamRoom(true);
    setIsJamHubOpen(true);
  };

  const handleJoinWithCode = () => {
    const code = roomCodeInput.trim().toUpperCase();
    if (!code || code.length < 3) return;
    if (!currentUser) { handleGoogleSignIn(); return; }
    setRoomId(code);
    setIsInJamRoom(true);
    setIsJamHubOpen(true);
    setShowJoinInput(false);
    setRoomCodeInput('');
  };

  const confirmLeave = () => {
    setIsInJamRoom(false);
    setRoomId(null);
    setIsHost(false);
    setUsers([]);
    setShowLeaveConfirm(false);
  };

  return (
    <div className="h-screen w-full bg-void-bg text-white overflow-hidden flex flex-col relative selection:bg-void-accent/30 selection:text-white">
      <PookieAtmosphere enabled={theme === 'pookie'} />
      {/* Top Header */}
      <header className="relative z-30 flex items-center justify-between gap-3 border-b border-white/5 bg-black/30 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-void-accent shadow-[0_0_20px_rgba(0,212,255,0.4)]">
             <Music className="w-5 h-5 text-black" />
          </div>
          <span className="text-xl font-black tracking-tighter">YouWe</span>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsSearchOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-4 py-2 hover:bg-white/10 transition-all group"
          >
            <SearchIcon className="w-4 h-4 text-white/40 group-hover:text-void-accent" />
            <span className="hidden sm:block text-xs font-bold text-white/40 uppercase tracking-widest">Search</span>
          </button>
          <div className="w-px h-6 bg-white/10 mx-1" />
          <button onClick={() => setIsProfileOpen(true)} className="w-9 h-9 rounded-full bg-neutral-800 border border-white/10 overflow-hidden hover:border-void-accent transition-all">
            {currentUser?.photoURL ? <img src={currentUser.photoURL} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center text-[10px] font-black">{currentUser?.displayName?.slice(0, 2).toUpperCase() || '??'}</div>}
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Desktop Navigation Sidebar */}
        <aside className="hidden lg:flex w-64 flex-col border-r border-white/5 bg-black/20 p-4 gap-6">
          <nav className="space-y-1">
            <p className="px-4 text-[9px] font-black uppercase tracking-[0.3em] text-white/20 mb-3">Navigation</p>
            {[
              { id: 'home', icon: Home, label: 'Home' },
              { id: 'search', icon: SearchIcon, label: 'Explore', action: () => setIsSearchOpen(true) },
              { id: 'library', icon: Compass, label: 'Library' },
              { id: 'jam', icon: Radio, label: 'Jam Sessions', action: () => setIsJamHubOpen(!isJamHubOpen) },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => item.action ? item.action() : setCurrentView(item.id as any)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all
                  ${currentView === item.id ? 'bg-void-accent/10 text-void-accent' : 'text-white/40 hover:bg-white/5 hover:text-white'}`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </button>
            ))}
          </nav>

          <div className="space-y-1 overflow-y-auto custom-scrollbar flex-1 pr-2">
            <p className="px-4 text-[9px] font-black uppercase tracking-[0.3em] text-white/20 mb-3">Your Collection</p>
            <button
              onClick={() => setCurrentView('liked-songs')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all
                ${currentView === 'liked-songs' ? 'bg-pink-500/10 text-pink-500' : 'text-white/40 hover:bg-white/5 hover:text-white'}`}
            >
              <Heart className={`w-5 h-5 ${currentView === 'liked-songs' ? 'fill-current' : ''}`} />
              Liked Songs
              {likedSongs.length > 0 && <span className="ml-auto text-[10px] opacity-40">{likedSongs.length}</span>}
            </button>
            <PlaylistManager />
          </div>

          <div className="mt-auto p-4 rounded-3xl bg-void-accent/5 border border-void-accent/10">
            <button 
              onClick={() => setIsJamHubOpen(!isJamHubOpen)}
              className="w-full py-3 rounded-xl bg-void-accent text-black font-black text-[10px] uppercase tracking-widest hover:scale-[1.02] transition-all shadow-xl"
            >
              {isJamHubOpen ? 'Hide Jam Hub' : 'Show Jam Hub'}
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto custom-scrollbar relative">
          <div className="max-w-7xl mx-auto p-4 sm:p-8 lg:p-12">
            {currentView === 'home' && (
              <>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentSong?.id || 'empty'}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="mb-12 flex flex-col items-center gap-8 lg:flex-row lg:items-center"
                  >
                    <div className="relative group shrink-0">
                      <div className="absolute -inset-4 bg-void-accent/20 blur-3xl rounded-full opacity-50" />
                      <div className="relative h-48 w-48 overflow-hidden rounded-[2.5rem] border border-white/10 shadow-2xl sm:h-64 sm:w-64">
                        <img src={currentSong?.thumbnail} alt="" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100 flex items-center justify-center">
                           <Play className="w-12 h-12 text-white fill-current" />
                        </div>
                      </div>
                    </div>
                    <div className="w-full space-y-4 text-center lg:text-left">
                      <span className="inline-block rounded-full border border-void-accent/20 bg-void-accent/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.24em] text-void-accent">Now Streaming</span>
                      <h1 className="text-4xl font-black leading-tight tracking-tighter sm:text-6xl">{currentSong?.title || 'Welcome to YouWe'}</h1>
                      <p className="text-base font-bold text-white/40 sm:text-2xl">{currentSong?.artist || 'Discover the next wave'}</p>
                    </div>
                  </motion.div>
                </AnimatePresence>
                <Recommendations />
                <HomeAlbums />
              </>
            )}

            {(currentView === 'library' || currentView === 'liked-songs') && <Library view={currentView} />}
          </div>
        </main>

        {/* Jam Hub (Right Sidebar) */}
        <AnimatePresence>
          {isJamHubOpen && (
            <motion.aside
              initial={{ x: 400 }} animate={{ x: 0 }} exit={{ x: 400 }}
              className="fixed top-0 bottom-20 lg:bottom-0 right-0 z-[40] w-full border-l border-white/5 bg-void-bg/95 backdrop-blur-2xl sm:w-[380px] lg:relative lg:bg-black/20"
            >
              <div className={`flex h-full flex-col ${currentSong ? 'pb-[76px] sm:pb-0' : ''}`}>
                <div className="flex items-center justify-between p-4 lg:hidden">
                  <span className="font-black uppercase tracking-widest text-xs">Jam Hub</span>
                  <button onClick={() => setIsJamHubOpen(false)}><X className="w-6 h-6" /></button>
                </div>
                {isInJamRoom && roomId ? (
                  <JamRoom roomCode={roomId} onLeave={() => setShowLeaveConfirm(true)} jamSync={jamSync} />
                ) : (
                  <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
                    <div className="mb-6 h-16 w-16 rounded-3xl bg-void-accent/10 flex items-center justify-center text-void-accent border border-void-accent/20"><Radio className="h-8 w-8 animate-pulse" /></div>
                    <h3 className="mb-2 text-xl font-black tracking-tight">Sync the Void</h3>
                    <p className="mb-8 text-sm font-medium text-white/40">Collaborative listening in real-time. Start a room or join a friend.</p>
                    <div className="w-full space-y-3">
                      <button onClick={handleCreateRoom} className="w-full rounded-2xl bg-white py-4 text-xs font-black uppercase tracking-widest text-black hover:scale-[1.02] transition-all shadow-xl">Create Jam Room</button>
                      <button onClick={() => setShowJoinInput(!showJoinInput)} className="w-full rounded-2xl border border-white/10 bg-white/5 py-4 text-xs font-black uppercase tracking-widest text-white hover:bg-white/10 transition-all">Join with Code</button>
                      {showJoinInput && <div className="flex gap-2 p-2 bg-white/5 rounded-2xl mt-2"><input value={roomCodeInput} onChange={e => setRoomCodeInput(e.target.value.toUpperCase())} placeholder="CODE" className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-mono" /><button onClick={handleJoinWithCode} className="px-4 py-2 bg-void-accent text-black rounded-xl text-xs font-black">Join</button></div>}
                    </div>
                  </div>
                )}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-20 bg-black/80 backdrop-blur-3xl border-t border-white/5 z-40 px-6 flex items-center justify-between">
        {[
          { id: 'home', icon: Home, label: 'Home' },
          { id: 'search', icon: SearchIcon, label: 'Search', action: () => setIsSearchOpen(true) },
          { id: 'jam', icon: Radio, label: 'Jam', action: () => setIsJamHubOpen(!isJamHubOpen) },
          { id: 'library', icon: Compass, label: 'Library' },
        ].map((item) => (
          <button key={item.id} onClick={() => item.action ? item.action() : setCurrentView(item.id as any)} className={`flex flex-col items-center gap-1 transition-all ${(item.id === 'jam' ? isJamHubOpen : currentView === item.id) ? 'text-void-accent' : 'text-white/30'}`}><item.icon className="w-6 h-6" /><span className="text-[9px] font-black uppercase tracking-widest">{item.label}</span></button>
        ))}
      </nav>

      <ErrorBoundary fallback={<div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 px-6 py-4 bg-red-500/10 border border-red-500/50 text-red-500 rounded-2xl backdrop-blur-xl z-[60] shadow-2xl"><AlertCircle className="w-5 h-5" /><span>Player Error</span></div>}>
        <Player />
      </ErrorBoundary>
      <Search isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
      <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} theme={theme} onThemeChange={setTheme} />
      <ToastContainer />
      <AnimatePresence>{showLeaveConfirm && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[150] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4" onClick={() => setShowLeaveConfirm(false)}>
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={e => e.stopPropagation()} className="w-full max-w-sm rounded-3xl border border-white/10 bg-black/90 p-8 shadow-2xl backdrop-blur-2xl">
            <h2 className="text-xl font-black mb-2">Leave the Jam? 🎧</h2>
            <p className="text-sm text-white/40 mb-8 font-medium">You'll lose your spot in the room. The music keeps playing for others.</p>
            <div className="flex gap-4"><button onClick={() => setShowLeaveConfirm(false)} className="flex-1 rounded-2xl border border-white/10 bg-white/5 py-4 text-sm font-bold hover:bg-white/10 transition-colors">Stay</button><button onClick={confirmLeave} className="flex-1 rounded-2xl bg-red-500 py-4 text-sm font-bold text-white hover:bg-red-400 transition-colors active:scale-95">Leave</button></div>
          </motion.div>
        </motion.div>
      )}</AnimatePresence>
    </div>
  );
}

function PookieAtmosphere({ enabled }: { enabled: boolean }) {
  if (!enabled) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden pookie-atmosphere" aria-hidden="true">
      <div className="pookie-ambient pookie-ambient-a" />
      <div className="pookie-ambient pookie-ambient-b" />
      <div className="pookie-rain" />
      <div className="pookie-petals">
        {Array.from({ length: 9 }).map((_, index) => <span key={index} />)}
      </div>
      <div className="pookie-paper" />
    </div>
  );
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode; fallback: React.ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: any) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
  render() { 
    if (this.state.hasError) {
      return (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 px-6 py-4 bg-red-500/10 border border-red-500/50 text-red-500 rounded-2xl backdrop-blur-xl z-[60] shadow-2xl max-w-2xl w-full">
          <div className="flex items-center gap-2 font-bold"><AlertCircle className="w-5 h-5" /><span>Player Error</span></div>
          <div className="text-xs font-mono break-all opacity-80 text-left w-full max-h-40 overflow-auto whitespace-pre-wrap">{this.state.error?.stack || this.state.error?.message || 'Unknown Error'}</div>
          <button onClick={() => this.setState({ hasError: false, error: null })} className="px-4 py-1.5 mt-2 bg-red-500/20 rounded-lg text-xs font-bold hover:bg-red-500/30">Dismiss & Retry</button>
        </div>
      );
    }
    return this.props.children; 
  }
}
