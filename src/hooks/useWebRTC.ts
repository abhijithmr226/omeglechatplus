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
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' }
    ]
  };

  useEffect(() => {
    const newSocket = io('http://localhost:3001', {
      transports: ['websocket', 'polling']
    });
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Connected to signaling server');
    });

    newSocket.on('online-count', (count: number) => {
      setOnlineCount(count);
    });

    newSocket.on('waiting-for-peer', () => {
      setIsWaiting(true);
      setIsConnected(false);
    });

    newSocket.on('peer-found', async ({ roomId, peerId }) => {
      console.log('Peer found:', peerId);
      setIsWaiting(false);
      setIsConnected(true);
      onPeerFound?.();
      await initializePeerConnection();
    });

    newSocket.on('offer', async ({ offer, from }) => {
      console.log('Received offer from:', from);
      if (!peerConnectionRef.current) {
        await initializePeerConnection();
      }
      
      try {
        await peerConnectionRef.current?.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await peerConnectionRef.current?.createAnswer();
        await peerConnectionRef.current?.setLocalDescription(answer);
        newSocket.emit('answer', { answer });
      } catch (error) {
        console.error('Error handling offer:', error);
      }
    });

    newSocket.on('answer', async ({ answer, from }) => {
      console.log('Received answer from:', from);
      try {
        await peerConnectionRef.current?.setRemoteDescription(new RTCSessionDescription(answer));
      } catch (error) {
        console.error('Error handling answer:', error);
      }
    });

    newSocket.on('ice-candidate', async ({ candidate, from }) => {
      console.log('Received ICE candidate from:', from);
      if (candidate && peerConnectionRef.current) {
        try {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (error) {
          console.error('Error adding ICE candidate:', error);
        }
      }
    });

    newSocket.on('chat-message', ({ message, from }) => {
      console.log('Received message from:', from);
      onMessage?.(message);
    });

    newSocket.on('peer-disconnected', () => {
      console.log('Peer disconnected');
      setIsConnected(false);
      setIsWaiting(false);
      onPeerDisconnected?.();
      cleanup();
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
      setIsConnected(false);
      setIsWaiting(false);
    });

    return () => {
      newSocket.disconnect();
      cleanup();
    };
  }, [onPeerFound, onPeerDisconnected, onMessage]);

  const initializePeerConnection = async () => {
    try {
      const peerConnection = new RTCPeerConnection(servers);
      peerConnectionRef.current = peerConnection;

      // Add local stream tracks if available
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          if (peerConnection.signalingState !== 'closed') {
            peerConnection.addTrack(track, localStreamRef.current!);
          }
        });
      }

      // Handle remote tracks
      peerConnection.ontrack = (event) => {
        console.log('Received remote track');
        if (remoteVideoRef.current && event.streams[0]) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      // ICE Candidate handler
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('Sending ICE candidate');
          socket?.emit('ice-candidate', { candidate: event.candidate });
        }
      };

      // Connection state monitoring
      peerConnection.onconnectionstatechange = () => {
        console.log('Connection state:', peerConnection.connectionState);
        if (peerConnection.connectionState === 'failed') {
          console.log('Connection failed, attempting restart');
          peerConnection.restartIce();
        }
      };

      // Create and send offer only if we're the initiator
      if (peerConnection.signalingState === 'stable') {
        const offer = await peerConnection.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true
        });
        await peerConnection.setLocalDescription(offer);
        socket?.emit('offer', { offer });
      }
    } catch (error) {
      console.error('Error initializing peer connection:', error);
    }
  };

  const startLocalVideo = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 30 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      return true;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      
      // Try audio only if video fails
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false
        });
        localStreamRef.current = audioStream;
        return true;
      } catch (audioError) {
        console.error('Error accessing audio:', audioError);
        return false;
      }
    }
  };

  const findPeer = (interests: string[], mode: 'text' | 'video') => {
    if (socket) {
      console.log('Finding peer with interests:', interests, 'mode:', mode);
      socket.emit('find-peer', { interests, mode });
    }
  };

  const sendMessage = (message: string) => {
    if (isConnected && socket) {
      socket.emit('chat-message', { message });
    }
  };

  const disconnectPeer = () => {
    if (socket) {
      socket.emit('disconnect-peer');
    }
    setIsConnected(false);
    setIsWaiting(false);
    cleanup();
  };

  const cleanup = () => {
    // Stop all tracks
    localStreamRef.current?.getTracks().forEach(track => {
      track.stop();
    });
    localStreamRef.current = null;

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Clear video elements
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
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