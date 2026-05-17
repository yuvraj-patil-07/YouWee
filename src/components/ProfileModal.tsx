import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Save, LogOut } from 'lucide-react';
import { updateProfile, signOut } from 'firebase/auth';
import { useStore } from '../store';
import { auth } from '../lib/firebase';

export function ProfileModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
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
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="w-full max-w-3xl overflow-hidden rounded-3xl border border-white/10 bg-void-surface p-6 shadow-2xl"
          >
            <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
              <div className="rounded-3xl border border-white/10 bg-black/40 p-6 text-center">
                <div className="mx-auto mb-6 h-28 w-28 overflow-hidden rounded-full border-2 border-white/10 bg-white/5 shadow-xl">
                  {photoUrl ? (
                    <img src={photoUrl} alt="Profile preview" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-neutral-900 text-4xl font-black text-white/70">
                      {name?.slice(0, 2).toUpperCase() || '??'}
                    </div>
                  )}
                </div>
                <h2 className="text-2xl font-black text-white">{name || 'Your Name'}</h2>
                <p className="mt-2 text-sm text-white/50">Your Jam identity appears to friends in the room.</p>
                <div className="mt-6 space-y-3 text-left text-sm text-white/60">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.24em] text-white/40">Login</p>
                    <p>{currentUser?.email || 'Not signed in'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.24em] text-white/40">Status</p>
                    <p>{currentUser ? 'Connected' : 'Guest'}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/40">Profile Settings</p>
                    <h3 className="text-xl font-black text-white">Customize your display name</h3>
                  </div>
                  <button onClick={onClose} className="rounded-full border border-white/10 bg-white/5 p-2 text-white/70 transition-colors hover:bg-white/10">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-white/60 mb-2">Display Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full rounded-2xl border border-white/10 bg-black/50 px-4 py-3 text-white placeholder-white/20 focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/30 transition-all"
                      placeholder="Enter your name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/60 mb-2">Photo URL</label>
                    <input
                      type="text"
                      value={photoUrl}
                      onChange={(e) => setPhotoUrl(e.target.value)}
                      className="w-full rounded-2xl border border-white/10 bg-black/50 px-4 py-3 text-white placeholder-white/20 focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/30 transition-all"
                      placeholder="https://..."
                    />
                  </div>
                </div>

                <div className="rounded-3xl border border-white/10 bg-black/40 p-5">
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/40">Profile Preview</p>
                  <div className="mt-4 flex flex-wrap items-center gap-4">
                    <div className="h-16 w-16 overflow-hidden rounded-full bg-neutral-900">
                      {photoUrl ? (
                        <img src={photoUrl} alt="Preview" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xl font-black text-white/70">
                          {name?.slice(0, 2).toUpperCase() || '??'}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white">{name || 'Your Name'}</p>
                      <p className="text-xs text-white/40">This is the name shown in Jam Room.</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 pt-4 border-t border-white/10">
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="w-full rounded-2xl bg-white px-4 py-3 text-sm font-bold text-black transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Save className="w-4 h-4" />
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </span>
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="w-full rounded-2xl bg-red-500/10 px-4 py-3 text-sm font-bold text-red-300 transition-colors hover:bg-red-500/20 active:scale-[0.98]"
                  >
                    <span className="inline-flex items-center gap-2">
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
