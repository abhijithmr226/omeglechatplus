import React, { useEffect, useRef, useState } from "react";
import { useWebRTC } from "../hooks/useWebRTC";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent } from "./ui/card";
import { Alert, AlertDescription } from "./ui/alert";
import { AlertTriangle01Icon, Send01Icon, VideoIcon, MicrophoneIcon, MicrophoneOffIcon, VideoOffIcon } from "@hugeicons/react";

type VideoChatProps = {
  interests: string[];
  mode: "text" | "video";
  onBack: () => void;
};

const VideoChat: React.FC<VideoChatProps> = ({ interests, mode, onBack }) => {
  const [messages, setMessages] = useState<Array<{ text: string; sender: 'me' | 'stranger' }>>([]);
  const [input, setInput] = useState("");
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

  const {
    localVideoRef,
    remoteVideoRef,
    isConnected,
    isWaiting,
    onlineCount,
    startLocalVideo,
    findPeer,
    sendMessage,
    disconnectPeer
  } = useWebRTC({
    onPeerFound: () => {
      setConnectionStatus('connected');
      setMessages(prev => [...prev, { text: 'Stranger connected!', sender: 'me' }]);
    },
    onPeerDisconnected: () => {
      setConnectionStatus('disconnected');
      setMessages(prev => [...prev, { text: 'Stranger disconnected.', sender: 'me' }]);
    },
    onMessage: (message: string) => {
      setMessages(prev => [...prev, { text: message, sender: 'stranger' }]);
    }
  });

  useEffect(() => {
    if (mode === "video") {
      startLocalVideo();
    }
    
    // Start looking for peer
    findPeer(interests, mode);
  }, [mode, interests]);

  const handleSendMessage = () => {
    if (input.trim() === "" || !isConnected) return;
    
    const message = input.trim();
    setMessages(prev => [...prev, { text: message, sender: 'me' }]);
    sendMessage(message);
    setInput("");
  };

  const handleDisconnect = () => {
    disconnectPeer();
    onBack();
  };

  const toggleAudio = () => {
    if (localVideoRef.current?.srcObject) {
      const stream = localVideoRef.current.srcObject as MediaStream;
      const audioTracks = stream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !isAudioEnabled;
      });
      setIsAudioEnabled(!isAudioEnabled);
    }
  };

  const toggleVideo = () => {
    if (localVideoRef.current?.srcObject) {
      const stream = localVideoRef.current.srcObject as MediaStream;
      const videoTracks = stream.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !isVideoEnabled;
      });
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  const getStatusMessage = () => {
    if (isWaiting) return "Looking for someone to chat with...";
    if (isConnected) return "Connected to stranger";
    if (connectionStatus === 'disconnected') return "Stranger disconnected";
    return "Connecting...";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">
              {mode === "video" ? "Video Chat" : "Text Chat"}
            </h1>
            <p className="text-gray-600 mt-1">{getStatusMessage()}</p>
          </div>
          <div className="flex gap-3">
            <span className="text-sm text-gray-500 bg-white px-3 py-1 rounded-full">
              {onlineCount}+ online
            </span>
            <Button
              variant="destructive"
              onClick={handleDisconnect}
              className="bg-red-500 hover:bg-red-600"
            >
              Leave Chat
            </Button>
          </div>
        </div>

        {/* Interests Display */}
        {interests.length > 0 && (
          <Alert className="mb-4 bg-blue-50 border-blue-200">
            <AlertDescription>
              <strong>Common interests:</strong> {interests.join(", ")}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video Section */}
          {mode === "video" && (
            <div className="lg:col-span-2">
              <Card className="p-4">
                <CardContent className="p-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {/* Remote Video */}
                    <div className="relative">
                      <video
                        ref={remoteVideoRef}
                        autoPlay
                        playsInline
                        className="w-full h-64 bg-gray-900 rounded-lg object-cover"
                      />
                      <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
                        Stranger
                      </div>
                    </div>

                    {/* Local Video */}
                    <div className="relative">
                      <video
                        ref={localVideoRef}
                        autoPlay
                        muted
                        playsInline
                        className="w-full h-64 bg-gray-900 rounded-lg object-cover"
                      />
                      <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
                        You
                      </div>
                    </div>
                  </div>

                  {/* Video Controls */}
                  <div className="flex justify-center gap-3">
                    <Button
                      variant={isAudioEnabled ? "default" : "destructive"}
                      size="icon"
                      onClick={toggleAudio}
                      className="rounded-full"
                    >
                      {isAudioEnabled ? (
                        <MicrophoneIcon className="h-5 w-5" />
                      ) : (
                        <MicrophoneOffIcon className="h-5 w-5" />
                      )}
                    </Button>
                    <Button
                      variant={isVideoEnabled ? "default" : "destructive"}
                      size="icon"
                      onClick={toggleVideo}
                      className="rounded-full"
                    >
                      {isVideoEnabled ? (
                        <VideoIcon className="h-5 w-5" />
                      ) : (
                        <VideoOffIcon className="h-5 w-5" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Chat Section */}
          <div className={mode === "video" ? "lg:col-span-1" : "lg:col-span-3"}>
            <Card className="h-96 flex flex-col">
              <CardContent className="p-4 flex-1 flex flex-col">
                {/* Messages */}
                <div className="flex-1 overflow-y-auto mb-4 space-y-2">
                  {messages.length === 0 ? (
                    <div className="text-center text-gray-500 mt-8">
                      {isWaiting ? "Waiting for someone to connect..." : "Start chatting!"}
                    </div>
                  ) : (
                    messages.map((msg, index) => (
                      <div
                        key={index}
                        className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                            msg.sender === 'me'
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-200 text-gray-800'
                          }`}
                        >
                          <div className="font-semibold text-xs mb-1">
                            {msg.sender === 'me' ? 'You' : 'Stranger'}
                          </div>
                          {msg.text}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Message Input */}
                <div className="flex gap-2">
                  <Input
                    placeholder={isConnected ? "Type a message..." : "Waiting for connection..."}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                    disabled={!isConnected}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!isConnected || !input.trim()}
                    size="icon"
                  >
                    <Send01Icon className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Connection Status */}
        {!isConnected && (
          <Alert className="mt-4 bg-yellow-50 border-yellow-200">
            <AlertTriangle01Icon className="h-4 w-4" />
            <AlertDescription>
              {isWaiting 
                ? "Looking for someone to chat with. This may take a moment..." 
                : "Connecting to chat service..."}
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
};

export default VideoChat;