import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Save, LogOut, Flower2, Sparkles } from 'lucide-react';
import { updateProfile, signOut } from 'firebase/auth';
import { useStore } from '../store';
import { auth } from '../lib/firebase';

export function ProfileModal({
  isOpen,
  onClose,
  theme,
  onThemeChange,
}: {
  isOpen: boolean;
  onClose: () => void;
  theme: 'void' | 'pookie';
  onThemeChange: (theme: 'void' | 'pookie') => void;
}) {
  const { currentUser, setCurrentUser } = useStore();
  const [name, setName] = useState(currentUser?.displayName || '');
  const [photoUrl, setPhotoUrl] = useState(currentUser?.photoURL || '');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setName(currentUser.displayName || '');
      setPhotoUrl(currentUser.photoURL || '');
    }
  }, [currentUser]);

  if (!isOpen) return null;

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
                  <div>
                    <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.28em] text-white/40">Profile Settings</p>
                    <h3 className="text-lg sm:text-xl font-black text-white">Customize your display name</h3>
                  </div>
                  <button onClick={onClose} className="hidden lg:block rounded-full border border-white/10 bg-white/5 p-2 text-white/70 transition-colors hover:bg-white/10">
                    <X className="w-5 h-5" />
                  </button>
                </div>

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

                <div className="pookie-theme-card rounded-2xl sm:rounded-3xl border border-white/10 bg-black/40 p-3 sm:p-5">
                  <div className="flex items-start justify-between gap-3 sm:gap-4">
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-semibold uppercase tracking-[0.2em] text-white/45">
                        <Sparkles className="h-3 w-3 sm:h-4 sm:w-4 text-void-accent" />
                        Appearance
                      </p>
                      <h4 className="mt-1 sm:mt-2 text-lg sm:text-xl font-black text-white">Pookie Theme</h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => onThemeChange(theme === 'pookie' ? 'void' : 'pookie')}
                      className={`relative h-7 w-12 sm:h-8 sm:w-14 shrink-0 rounded-full border transition-all ${
                        theme === 'pookie'
                          ? 'border-void-accent/60 bg-void-accent/25 shadow-[0_0_22px_var(--accent-glow)]'
                          : 'border-white/15 bg-white/10'
                      }`}
                      aria-pressed={theme === 'pookie'}
                      title="Toggle Pookie Theme"
                    >
                      <span
                        className={`absolute top-0.5 sm:top-1 flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full bg-white text-black shadow-lg transition-transform ${
                          theme === 'pookie' ? 'translate-x-6 sm:translate-x-7' : 'translate-x-0.5 sm:translate-x-1'
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
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
