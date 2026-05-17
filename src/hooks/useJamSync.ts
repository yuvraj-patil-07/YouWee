import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useStore } from '../store';
import { SongMetadata, JamReaction, SongRequest, ChatMessage, SkipVoteState } from '../types';

export function useJamSync(roomId: string | null, isInJamRoom: boolean, currentUser: any) {
  const socketRef = useRef<Socket | null>(null);
  const isApplyingRemoteUpdate = useRef(false);
  const prevStateRef = useRef<any>(null);

  const roomState = useStore(s => s.roomState);
  const isHost = useStore(s => s.isHost);
  const {
    setRoomState, setCurrentSong, setIsHost, setUsers, setQueue, setSocket, setRoomId,
    setJamReactions, setSkipVotes, setSongRequests, setChatMessages, playNextInQueue,
  } = useStore();

  const roomStateRef = useRef(roomState);
  useEffect(() => { roomStateRef.current = roomState; }, [roomState]);
  const isHostRef = useRef(isHost);
  useEffect(() => { isHostRef.current = isHost; }, [isHost]);
  const roomIdRef = useRef(roomId);
  useEffect(() => { roomIdRef.current = roomId; }, [roomId]);

  // ── Socket Lifecycle ────────────────────────────────────────────────────
  useEffect(() => {
    if (!isInJamRoom) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setSocket(null);
      prevStateRef.current = null;
      return;
    }

    const socket = io({ transports: ['websocket', 'polling'] });
    socketRef.current = socket;
    setSocket(socket);

    // ── Incoming Events ─────────────────────────────────────────────
    socket.on('sync-state', (state) => {
      isApplyingRemoteUpdate.current = true;
      
      // If the song changed remotely, update local store without triggering 'setCurrentSong' side effects (like currentTime: 0)
      const currentSongId = useStore.getState().currentSong?.id;
      if (state.currentSong !== undefined && state.currentSong.id !== currentSongId) {
        useStore.setState({ currentSong: state.currentSong });
        if (state.currentSong) useStore.getState().addToRecentlyPlayed(state.currentSong);
      }
      
      setRoomState(state);
      if (state.queue !== undefined) setQueue(state.queue);
      setTimeout(() => { isApplyingRemoteUpdate.current = false; }, 100);
    });
    socket.on('room-members', (members) => setUsers(members));
    socket.on('new-host', (hostId: string) => setIsHost(socket.id === hostId));
    socket.on('reaction', (r: JamReaction) => setJamReactions((prev: JamReaction[]) => [...prev.slice(-30), r]));
    socket.on('skip-votes', (data: SkipVoteState) => setSkipVotes(data));
    socket.on('force-skip', () => { if (isHostRef.current) playNextInQueue(); });
    socket.on('song-requests', (reqs: SongRequest[]) => setSongRequests(reqs));
    socket.on('chat-message', (msg: ChatMessage) => setChatMessages((prev: ChatMessage[]) => [...prev.slice(-100), msg]));

    // ── Create or Join on Connect ────────────────────────────────────
    socket.once('connect', () => {
      const currentRoomId = roomIdRef.current;
      const userName = currentUser?.displayName || `Guest_${socket.id?.slice(0, 4)}`;
      const avatar = currentUser?.photoURL || '';

      if (!currentRoomId) {
        // CREATE new room
        socket.emit('create-room', { user: { name: userName, avatar } }, (res: any) => {
          if (res?.success) {
            setRoomId(res.code);
            roomIdRef.current = res.code;
          }
        });
      } else {
        // JOIN existing room
        socket.emit('join-room', { roomId: currentRoomId, user: { name: userName, avatar } }, (_res: any) => {
          // sync-state will be received via the 'sync-state' event
        });
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setSocket(null);
    };
  }, [isInJamRoom]); // Only reconnect when isInJamRoom changes

  // ── DELTA STATE EMITTER (All users) ───────────────────────────────────────
  useEffect(() => {
    if (!socketRef.current || !isInJamRoom || !roomIdRef.current) return;
    
    if (isApplyingRemoteUpdate.current) {
      prevStateRef.current = roomState;
      return;
    }

    const prev = prevStateRef.current;
    const curr = roomState;
    if (!prev) { prevStateRef.current = curr; return; }

    const delta: Record<string, any> = {};
    if (prev.playing !== curr.playing) delta.playing = curr.playing;
    if (prev.videoId !== curr.videoId) delta.videoId = curr.videoId;
    if (Math.abs((prev.currentTime ?? 0) - (curr.currentTime ?? 0)) > 0.5) delta.currentTime = curr.currentTime;
    if (JSON.stringify(prev.queue) !== JSON.stringify(curr.queue)) delta.queue = curr.queue;
    if (JSON.stringify(prev.currentSong) !== JSON.stringify(curr.currentSong)) delta.currentSong = curr.currentSong;

    if (Object.keys(delta).length > 0) {
      socketRef.current.emit('update-state', { roomId: roomIdRef.current, state: delta });
    }
    prevStateRef.current = curr;
  }, [roomId, roomState, isInJamRoom]);

  // ── Exposed Methods ─────────────────────────────────────────────────────
  const sendReaction = (emoji: string) => {
    if (socketRef.current && roomIdRef.current)
      socketRef.current.emit('send-reaction', { roomId: roomIdRef.current, emoji });
  };
  const requestSong = (song: SongMetadata) => {
    if (socketRef.current && roomIdRef.current)
      socketRef.current.emit('request-song', { roomId: roomIdRef.current, song });
  };
  const approveRequest = (requestId: string) => {
    if (socketRef.current && roomIdRef.current)
      socketRef.current.emit('approve-request', { roomId: roomIdRef.current, requestId });
  };
  const voteSkip = () => {
    if (socketRef.current && roomIdRef.current)
      socketRef.current.emit('vote-skip', { roomId: roomIdRef.current });
  };
  const sendChat = (message: string) => {
    if (socketRef.current && roomIdRef.current)
      socketRef.current.emit('chat-message', { roomId: roomIdRef.current, message });
  };
  const promoteCoHost = (targetId: string) => {
    if (socketRef.current && roomIdRef.current)
      socketRef.current.emit('promote-cohost', { roomId: roomIdRef.current, targetId });
  };

  return { sendReaction, requestSong, approveRequest, voteSkip, sendChat, promoteCoHost };
}
