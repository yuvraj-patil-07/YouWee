import { useCallback, useRef, useState, useEffect } from 'react';
import { useStore } from '../store';

export function useAudioPlayer() {
  const playerRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);
  const { roomState, setRoomState, isHost } = useStore();

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

  const seekTo = useCallback((time: number) => {
    if (playerRef.current) {
      const iframe = playerRef.current.getIframe?.();
      if (iframe && document.body.contains(iframe)) {
        playerRef.current.seekTo(time, true);
      }
    }
  }, []);

  const onEnd = (event: any) => {
    if (isHost) {
      // In a real app, this would trigger playNext in the store
      // But we'll handle it via a callback passed to the player
    }
  };

  const play = useCallback(() => {
    if (playerRef.current) {
      const iframe = playerRef.current.getIframe?.();
      if (iframe && document.body.contains(iframe)) {
        playerRef.current.playVideo();
      }
    }
  }, []);

  const pause = useCallback(() => {
    if (playerRef.current) {
      const iframe = playerRef.current.getIframe?.();
      if (iframe && document.body.contains(iframe)) {
        playerRef.current.pauseVideo();
      }
    }
  }, []);

  const getCurrentTime = useCallback(() => {
    if (playerRef.current) {
      const iframe = playerRef.current.getIframe?.();
      if (iframe && document.body.contains(iframe)) {
        return playerRef.current.getCurrentTime();
      }
    }
    return 0;
  }, []);

  const setVolume = useCallback((vol: number) => {
    if (playerRef.current) {
      const iframe = playerRef.current.getIframe?.();
      if (iframe && document.body.contains(iframe)) {
        playerRef.current.setVolume(vol);
      }
    }
  }, []);

  // Sync effect
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

  // Drift correction — 3.0s threshold for stable network sync
  useEffect(() => {
    if (!isReady || !playerRef.current) return;
    
    // Only apply drift correction if we are a guest in a Jam Room with an active room ID
    const state = useStore.getState();
    if (!state.isInJamRoom || !state.roomId || state.isHost) return;

    const player = playerRef.current;
    const iframe = player.getIframe?.();
    if (!iframe || !document.body.contains(iframe)) return;

    const localTime = player.getCurrentTime?.() || 0;
    const diff = Math.abs(localTime - roomState.currentTime);
    if (diff > 3.0) {
      player.seekTo?.(roomState.currentTime, true);
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
