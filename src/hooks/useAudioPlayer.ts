import { useCallback, useRef, useState, useEffect } from 'react';
import { useStore } from '../store';

import { registerPlugin } from '@capacitor/core';

const NativeMusic = registerPlugin<any>('NativeMusic');

export function useAudioPlayer() {
  const [isReady, setIsReady] = useState(false);
  const { roomState, setRoomState, isHost } = useStore();
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    let playbackStateListener: any;
    let trackChangedListener: any;

    const init = async () => {
      playbackStateListener = await NativeMusic.addListener('playbackStateChanged', (data: any) => {
        setRoomState({ playing: data.isPlaying });
      });

      trackChangedListener = await NativeMusic.addListener('trackChanged', (data: any) => {
        // track changed
      });

      setIsReady(true);
      
      // Request battery optimization ignore for stable background
      try {
        await NativeMusic.requestIgnoreBatteryOptimization();
      } catch (e) {
        console.error("Battery opt prompt failed", e);
      }
    };

    init();

    // Polling for current time since getCurrentTime needs to be synchronous for some UI
    const interval = setInterval(async () => {
      try {
        const state = await NativeMusic.getPlaybackState();
        setCurrentTime(state.position / 1000);
      } catch (e) {}
    }, 1000);

    return () => {
      playbackStateListener?.remove();
      trackChangedListener?.remove();
      clearInterval(interval);
    };
  }, []);

  const onReady = () => setIsReady(true);

  const onStateChange = () => {};
  const onEnd = () => {};

  const play = useCallback(async (url?: string) => {
    try {
      if (url) {
        await NativeMusic.play({ url });
      } else {
        await NativeMusic.resume();
      }
    } catch (e) { console.error(e) }
  }, []);

  const pause = useCallback(async () => {
    try {
      await NativeMusic.pause();
    } catch (e) { console.error(e) }
  }, []);

  const seekTo = useCallback(async (time: number) => {
    try {
      await NativeMusic.seekTo({ position: time * 1000 });
    } catch (e) { console.error(e) }
  }, []);

  const getCurrentTimeSync = useCallback(() => {
    return currentTime;
  }, [currentTime]);

  const setVolume = useCallback((vol: number) => {
    // Handle volume if needed
  }, []);

  // Sync effect
  useEffect(() => {
    if (!isReady) return;
    
    if (roomState.playing) {
      play(roomState.videoId ? `https://www.youtube.com/watch?v=${roomState.videoId}` : undefined);
    } else {
      pause();
    }
  }, [roomState.playing, roomState.videoId, isReady]);

  return {
    onReady,
    onStateChange,
    onEnd,
    seekTo,
    play,
    pause,
    getCurrentTime: getCurrentTimeSync,
    setVolume,
    isReady,
  };
}
