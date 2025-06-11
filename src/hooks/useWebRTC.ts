import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface UseWebRTCProps {
  onPeerFound?: () => void;
  onPeerDisconnected?: () => void;
  onMessage?: (message: string) => void;
}

export const useWebRTC = ({
  onPeerFound,
  onPeerDisconnected,
  onMessage
}: UseWebRTCProps = {}) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isWaiting, setIsWaiting] = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const servers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  useEffect(() => {
    const newSocket = io('http://localhost:3001');
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Connected to signaling server');
    });

    newSocket.on('online-count', (count: number) => {
      setOnlineCount(count);
    });

    newSocket.on('waiting-for-peer', () => {
      setIsWaiting(true);
    });

    newSocket.on('peer-found', async () => {
      setIsWaiting(false);
      setIsConnected(true);
      onPeerFound?.();
      await initializePeerConnection();
    });

    newSocket.on('offer', async ({ offer }) => {
      if (!peerConnectionRef.current) await initializePeerConnection();
      await peerConnectionRef.current?.setRemoteDescription(offer);
      const answer = await peerConnectionRef.current?.createAnswer();
      await peerConnectionRef.current?.setLocalDescription(answer);
      newSocket.emit('answer', { answer });
    });

    newSocket.on('answer', async ({ answer }) => {
      await peerConnectionRef.current?.setRemoteDescription(answer);
    });

    newSocket.on('ice-candidate', async ({ candidate }) => {
      if (candidate) {
        await peerConnectionRef.current?.addIceCandidate(candidate);
      }
    });

    newSocket.on('chat-message', ({ message }) => {
      onMessage?.(message);
    });

    newSocket.on('peer-disconnected', () => {
      setIsConnected(false);
      setIsWaiting(false);
      onPeerDisconnected?.();
      cleanup();
    });

    return () => {
      newSocket.disconnect();
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initializePeerConnection = async () => {
    const peerConnection = new RTCPeerConnection(servers);
    peerConnectionRef.current = peerConnection;

    // Add local stream tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStreamRef.current!);
      });
    }

    // Handle remote tracks
    peerConnection.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    // ICE Candidate handler
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket?.emit('ice-candidate', { candidate: event.candidate });
      }
    };

    // Create and send offer
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket?.emit('offer', { offer });
  };

  const startLocalVideo = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      return true;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      return false;
    }
  };

  const findPeer = (interests: string[], mode: 'text' | 'video') => {
    socket?.emit('find-peer', { interests, mode });
  };

  const sendMessage = (message: string) => {
    if (isConnected) {
      socket?.emit('chat-message', { message });
    }
  };

  const disconnectPeer = () => {
    socket?.emit('disconnect-peer');
    setIsConnected(false);
    setIsWaiting(false);
    cleanup();
  };

  const cleanup = () => {
    localStreamRef.current?.getTracks().forEach(track => track.stop());
    localStreamRef.current = null;

    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;

    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
  };

  return {
    localVideoRef,
    remoteVideoRef,
    isConnected,
    isWaiting,
    onlineCount,
    startLocalVideo,
    findPeer,
    sendMessage,
    disconnectPeer
  };
};
