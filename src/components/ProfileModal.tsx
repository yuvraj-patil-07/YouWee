import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Save, LogOut, Flower2, Sparkles, Mail, Lock, User, LogIn } from 'lucide-react';
import { updateProfile, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { useStore } from '../store';
import { auth, signInWithGoogle } from '../lib/firebase';
import { Capacitor } from '@capacitor/core';

export function ProfileModal({
  isOpen,
  onClose,
  theme,
  onThemeChange,
}: {
  isOpen: boolean;
  onClose: () => void;
  theme: 'void' | 'p';
  onThemeChange: (theme: 'void' | 'p') => void;
}) {
  const { currentUser, setCurrentUser } = useStore();
  const [name, setName] = useState(currentUser?.displayName || '');
  const [photoUrl, setPhotoUrl] = useState(currentUser?.photoURL || '');
  const [isSaving, setIsSaving] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser) {
      setName(currentUser.displayName || '');
      setPhotoUrl(currentUser.photoURL || '');
    }
  }, [currentUser]);

  if (!isOpen) return null;

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setIsSaving(true);
    setAuthError(null);
    try {
      if (authMode === 'login') {
        const result = await signInWithEmailAndPassword(auth, email, password);
        setCurrentUser(result.user);
      } else {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        if (name.trim()) {
          await updateProfile(result.user, {
            displayName: name.trim(),
          });
        }
        setCurrentUser({ ...auth.currentUser });
      }
    } catch (err: any) {
      console.error(err);
      let msg = err.message;
      if (err.code === 'auth/invalid-credential') msg = 'Invalid email or password';
      else if (err.code === 'auth/email-already-in-use') msg = 'Email already in use';
      else if (err.code === 'auth/weak-password') msg = 'Password should be at least 6 characters';
      else if (err.code === 'auth/invalid-email') msg = 'Invalid email address';
      setAuthError(msg || 'Authentication failed');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    if (!auth.currentUser) return;
    setIsSaving(true);
    try {
      await updateProfile(auth.currentUser, {
        displayName: name,
        photoURL: photoUrl,
      });
      setCurrentUser({ ...auth.currentUser });
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      onClose();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSignIn = async () => {
    setIsSaving(true);
    try {
      await signInWithGoogle();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative w-full max-w-3xl max-h-[95vh] overflow-y-auto rounded-3xl border border-white/10 bg-void-surface p-4 sm:p-6 shadow-2xl"
          >
            {/* Mobile close button */}
            <button onClick={onClose} className="absolute right-4 top-4 z-10 rounded-full border border-white/10 bg-black/50 p-2 text-white/70 backdrop-blur-md transition-colors hover:bg-white/10 lg:hidden">
              <X className="w-5 h-5" />
            </button>

            <div className="grid gap-4 sm:gap-6 lg:grid-cols-[280px_1fr]">
              <div className="rounded-3xl border border-white/10 bg-black/40 p-4 sm:p-6 text-center">
                <div className="mx-auto mb-4 sm:mb-6 h-20 w-20 sm:h-28 sm:w-28 overflow-hidden rounded-full border-2 border-white/10 bg-white/5 shadow-xl">
                  {photoUrl ? (
                    <img src={photoUrl} alt="Profile preview" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-neutral-900 text-3xl sm:text-4xl font-black text-white/70">
                      {name?.slice(0, 2).toUpperCase() || '??'}
                    </div>
                  )}
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white">{name || 'Your Name'}</h2>
                <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-white/50">Your Jam identity appears to friends in the room.</p>
                <div className="mt-4 sm:mt-6 space-y-2 sm:space-y-3 text-left text-xs sm:text-sm text-white/60">
                  <div>
                    <p className="text-[9px] sm:text-[10px] uppercase tracking-[0.24em] text-white/40">Login</p>
                    <p className="truncate">{currentUser?.email || 'Not signed in'}</p>
                  </div>
                  <div>
                    <p className="text-[9px] sm:text-[10px] uppercase tracking-[0.24em] text-white/40">Status</p>
                    <p>{currentUser ? 'Connected' : 'Guest'}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 sm:space-y-6">
                <div className="flex items-center justify-between mt-2 lg:mt-0">
                  <div className="pr-12 lg:pr-0">
                    <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.28em] text-white/40">Profile Settings</p>
                    <h3 className="text-lg sm:text-xl font-black text-white">Customize your display name</h3>
                  </div>
                  <button onClick={onClose} className="hidden lg:block rounded-full border border-white/10 bg-white/5 p-2 text-white/70 transition-colors hover:bg-white/10">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {currentUser ? (
                  <>
                    <div className="grid gap-3 sm:gap-5 sm:grid-cols-2">
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-white/60 mb-1.5 sm:mb-2">Display Name</label>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full rounded-xl sm:rounded-2xl border border-white/10 bg-black/50 px-3 py-2.5 sm:px-4 sm:py-3 text-sm sm:text-base text-white placeholder-white/20 focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/30 transition-all"
                          placeholder="Enter your name"
                        />
                      </div>

                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-white/60 mb-1.5 sm:mb-2">Photo URL</label>
                        <input
                          type="text"
                          value={photoUrl}
                          onChange={(e) => setPhotoUrl(e.target.value)}
                          className="w-full rounded-xl sm:rounded-2xl border border-white/10 bg-black/50 px-3 py-2.5 sm:px-4 sm:py-3 text-sm sm:text-base text-white placeholder-white/20 focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/30 transition-all"
                          placeholder="https://..."
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="rounded-2xl sm:rounded-3xl border border-white/10 bg-black/40 p-4 sm:p-6 text-left">
                    <h4 className="text-lg font-black text-white mb-2 text-center">Create your YouWe Profile</h4>
                    <p className="text-xs sm:text-sm text-white/60 mb-6 text-center">Sign in to save your playlists, like songs, and join Jam Rooms.</p>
                    
                    <form onSubmit={handleEmailAuth} className="space-y-4">
                      {authMode === 'signup' && (
                        <div>
                          <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5">Display Name</label>
                          <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-white/30">
                              <User className="w-4 h-4" />
                            </span>
                            <input
                              type="text"
                              required
                              value={name}
                              onChange={(e) => setName(e.target.value)}
                              className="w-full rounded-xl border border-white/10 bg-black/50 pl-10 pr-4 py-2.5 text-sm text-white focus:border-white/30 focus:outline-none transition-all"
                              placeholder="Your display name"
                            />
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5">Email Address</label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-white/30">
                            <Mail className="w-4 h-4" />
                          </span>
                          <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-black/50 pl-10 pr-4 py-2.5 text-sm text-white focus:border-white/30 focus:outline-none transition-all"
                            placeholder="you@example.com"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5">Password</label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-white/30">
                            <Lock className="w-4 h-4" />
                          </span>
                          <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-black/50 pl-10 pr-4 py-2.5 text-sm text-white focus:border-white/30 focus:outline-none transition-all"
                            placeholder="••••••••"
                          />
                        </div>
                      </div>

                      {authError && (
                        <p className="text-xs text-red-400 font-bold bg-red-500/10 px-3 py-2 rounded-xl border border-red-500/20">{authError}</p>
                      )}

                      <button
                        type="submit"
                        disabled={isSaving}
                        className="w-full rounded-xl bg-white py-2.5 text-sm font-bold text-black hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <LogIn className="w-4 h-4" />
                        {isSaving ? 'Authenticating...' : authMode === 'login' ? 'Sign In with Email' : 'Sign Up with Email'}
                      </button>
                    </form>

                    <div className="mt-4 flex items-center justify-center text-xs font-bold text-white/40 px-1">
                      <button
                        onClick={() => {
                          setAuthMode(authMode === 'login' ? 'signup' : 'login');
                          setAuthError(null);
                        }}
                        className="hover:text-white transition-colors cursor-pointer"
                      >
                        {authMode === 'login' ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
                      </button>
                    </div>

                    {!Capacitor.isNativePlatform() && (
                      <>
                        <div className="relative my-6 flex items-center justify-center">
                          <div className="absolute inset-x-0 h-px bg-white/10" />
                          <span className="relative bg-void-surface px-3 text-[10px] font-black uppercase tracking-widest text-white/35">Or</span>
                        </div>

                        <button
                          onClick={handleSignIn}
                          disabled={isSaving}
                          className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm font-bold text-white transition-all hover:bg-white/10 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3 cursor-pointer"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24">
                            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                          </svg>
                          Continue with Google
                        </button>
                      </>
                    )}
                  </div>
                )}

                <div className="rounded-2xl sm:rounded-3xl border border-white/10 bg-black/40 p-3 sm:p-5">
                  <p className="text-[10px] sm:text-sm font-semibold uppercase tracking-[0.2em] text-white/40">Profile Preview</p>
                  <div className="mt-2 sm:mt-4 flex flex-wrap items-center gap-3 sm:gap-4">
                    <div className="h-12 w-12 sm:h-16 sm:w-16 shrink-0 overflow-hidden rounded-full bg-neutral-900">
                      {photoUrl ? (
                        <img src={photoUrl} alt="Preview" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-lg sm:text-xl font-black text-white/70">
                          {name?.slice(0, 2).toUpperCase() || '??'}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-white truncate">{name || 'Your Name'}</p>
                      <p className="text-[10px] sm:text-xs text-white/40 truncate">This is the name shown in Jam Room.</p>
                    </div>
                  </div>
                </div>

                <div className="p-theme-card rounded-2xl sm:rounded-3xl border border-white/10 bg-black/40 p-3 sm:p-5">
                  <div className="flex items-start justify-between gap-3 sm:gap-4">
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-semibold uppercase tracking-[0.2em] text-white/45">
                        <Sparkles className="h-3 w-3 sm:h-4 sm:w-4 text-void-accent" />
                        Appearance
                      </p>
                      <h4 className="mt-1 sm:mt-2 text-lg sm:text-xl font-black text-white">P Theme</h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => onThemeChange(theme === 'p' ? 'void' : 'p')}
                      className={`relative h-7 w-12 sm:h-8 sm:w-14 shrink-0 rounded-full border transition-all ${
                        theme === 'p'
                          ? 'border-void-accent/60 bg-void-accent/25 shadow-[0_0_22px_var(--accent-glow)]'
                          : 'border-white/15 bg-white/10'
                      }`}
                      aria-pressed={theme === 'p'}
                      title="Toggle P Theme"
                    >
                      <span
                        className={`absolute top-0.5 sm:top-1 flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full bg-white text-black shadow-lg transition-transform ${
                          theme === 'p' ? 'translate-x-6 sm:translate-x-7' : 'translate-x-0.5 sm:translate-x-1'
                        }`}
                      >
                        <Flower2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      </span>
                    </button>
                  </div>
                  <div className="mt-3 sm:mt-4 flex flex-wrap gap-1.5 sm:gap-2">
                    {['Tulips', 'Cherry red', 'Rain journal'].map((item) => (
                      <div key={item} className="rounded-xl sm:rounded-2xl border border-white/10 bg-white/[0.035] px-2 py-1 sm:px-3 sm:py-2 text-center text-[9px] sm:text-[10px] font-black uppercase tracking-[0.14em] text-white/45">
                        {item}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-3 sm:pt-4 border-t border-white/10">
                  {currentUser && (
                    <>
                      <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="w-full sm:flex-1 rounded-xl sm:rounded-2xl bg-white px-4 py-2.5 sm:py-3 text-sm font-bold text-black transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                      >
                        <span className="inline-flex items-center justify-center gap-2">
                          <Save className="w-4 h-4" />
                          {isSaving ? 'Saving...' : 'Save Changes'}
                        </span>
                      </button>
                      <button
                        onClick={handleSignOut}
                        className="w-full sm:flex-1 rounded-xl sm:rounded-2xl bg-red-500/10 px-4 py-2.5 sm:py-3 text-sm font-bold text-red-300 transition-colors hover:bg-red-500/20 active:scale-[0.98]"
                      >
                        <span className="inline-flex items-center justify-center gap-2">
                          <LogOut className="w-4 h-4" />
                          Sign Out
                        </span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
