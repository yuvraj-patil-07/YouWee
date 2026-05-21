import { useCallback, useRef, useState, useEffect } from 'react';
import { useStore } from '../store';
import { registerPlugin } from '@capacitor/core';

const NativeMusic = registerPlugin<any>('NativeMusic', {
  web: () => Promise.resolve({}), // Fallback if not on Android
});

export function useAudioPlayer() {
  const playerRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);
  const { roomState, setRoomState, isHost } = useStore();

  useEffect(() => {
    const init = async () => {
      try {
        await NativeMusic.requestIgnoreBatteryOptimization();
      } catch (e) {
        console.error("Battery opt prompt failed", e);
      }
    };
    init();
  }, []);

  const onReady = (event: any) => {
    console.log('YouTube Player Ready');
    playerRef.current = event.target;
    setIsReady(true);
    if (roomState.playing) {
      event.target.playVideo();
    }
  };

  const onStateChange = (event: any) => {
    // 1 = playing, 2 = paused
    if (event.data === 1) {
      setRoomState({ playing: true });
    } else if (event.data === 2) {
      setRoomState({ playing: false });
    }
  };

  const onEnd = () => {};

  const play = useCallback(async () => {
    if (playerRef.current) {
      try {
        const iframe = playerRef.current.getIframe?.();
        if (iframe && document.body.contains(iframe)) {
          playerRef.current.playVideo();
        }
      } catch (e) {
        console.error(e);
      }
    }
    // Update native music session for background state if running on Capacitor Android
    try {
      await NativeMusic.resume();
    } catch (e) {}
  }, []);

  const pause = useCallback(async () => {
    if (playerRef.current) {
      try {
        const iframe = playerRef.current.getIframe?.();
        if (iframe && document.body.contains(iframe)) {
          playerRef.current.pauseVideo();
        }
      } catch (e) {
        console.error(e);
      }
    }
    try {
      await NativeMusic.pause();
    } catch (e) {}
  }, []);

  const seekTo = useCallback(async (time: number) => {
    if (playerRef.current) {
      try {
        const iframe = playerRef.current.getIframe?.();
        if (iframe && document.body.contains(iframe)) {
          playerRef.current.seekTo(time, true);
        }
      } catch (e) {
        console.error(e);
      }
    }
    try {
      await NativeMusic.seekTo({ position: time * 1000 });
    } catch (e) {}
  }, []);

  const getCurrentTime = useCallback(() => {
    if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
      try {
        const iframe = playerRef.current.getIframe?.();
        if (iframe && document.body.contains(iframe)) {
          return playerRef.current.getCurrentTime() || 0;
        }
      } catch (e) {}
    }
    return 0;
  }, []);

  const setVolume = useCallback((vol: number) => {
    if (playerRef.current) {
      try {
        const iframe = playerRef.current.getIframe?.();
        if (iframe && document.body.contains(iframe)) {
          playerRef.current.setVolume(vol);
        }
      } catch (e) {}
    }
  }, []);

  // Sync state effect: play/pause based on room state
  useEffect(() => {
    if (!isReady || !playerRef.current) return;

    try {
      const player = playerRef.current;
      const iframe = player.getIframe?.();
      if (!iframe || !document.body.contains(iframe)) return;

      const currentState = player.getPlayerState?.();
      
      if (roomState.playing) {
        if (currentState !== 1 && currentState !== 3) { // 1=playing, 3=buffering
          player.playVideo?.();
        }
      } else {
        if (currentState !== 2 && currentState !== -1) { // 2=paused, -1=unstarted
          player.pauseVideo?.();
        }
      }
    } catch (e) {
      console.error("Error in play/pause sync:", e);
    }
  }, [roomState.playing, roomState.videoId, isReady]);

  // Drift correction (Jam room sync) — keeps all users synced with the host
  useEffect(() => {
    if (!isReady || !playerRef.current) return;
    
    // Only apply drift correction if we are in a Jam Room and NOT the host
    const state = useStore.getState();
    if (!state.isInJamRoom || !state.roomId || state.isHost) return;

    try {
      const player = playerRef.current;
      const iframe = player.getIframe?.();
      if (!iframe || !document.body.contains(iframe)) return;

      const localTime = player.getCurrentTime?.() || 0;
      const diff = Math.abs(localTime - roomState.currentTime);
      // If client time drifts more than 1.5 seconds from host, force seek to host's position
      if (diff > 1.5) {
        player.seekTo?.(roomState.currentTime, true);
      }
    } catch (e) {
      console.error("Error in drift correction:", e);
    }
  }, [roomState.currentTime, isReady]);

  return {
    onReady,
    onStateChange,
    onEnd,
    seekTo,
    play,
    pause,
    getCurrentTime,
    setVolume,
    isReady,
  };
}
