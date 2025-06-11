import React, { useEffect, useRef, useState } from "react";

type VideoChatProps = {
  interests: string[];
  mode: "text" | "video";
  onBack: () => void;
};

const VideoChat: React.FC<VideoChatProps> = ({ interests, mode, onBack }) => {
  const [messages, setMessages] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (mode === "video") {
      navigator.mediaDevices
        .getUserMedia({ video: true, audio: true })
        .then((stream) => {
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
          // For demonstration, show the local stream in both views
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = stream;
          }
        })
        .catch((err) => {
          console.error("Failed to access webcam", err);
        });
    }
  }, [mode]);

  const handleSendMessage = () => {
    if (input.trim() === "") return;
    setMessages([...messages, input]);
    setInput("");
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-4xl bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between mb-4">
          <h2 className="text-xl font-bold">
            {mode === "video" ? "Video Chat" : "Text Chat"}
          </h2>
          <button
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
            onClick={onBack}
          >
            Leave Chat
          </button>
        </div>

        {/* Interests Display */}
        <div className="mb-4 text-sm text-gray-600">
          <strong>Interests:</strong> {interests.join(", ") || "None"}
        </div>

        {mode === "video" ? (
          <div className="flex flex-col md:flex-row gap-4 items-center justify-center">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full md:w-1/2 h-64 bg-black rounded"
            />
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full md:w-1/2 h-64 bg-black rounded"
            />
          </div>
        ) : (
          <div>
            <div className="h-64 overflow-y-auto bg-gray-50 border rounded p-4 mb-4">
              {messages.length === 0 ? (
                <p className="text-gray-400">No messages yet...</p>
              ) : (
                messages.map((msg, index) => (
                  <div key={index} className="mb-2">
                    <span className="font-semibold text-blue-600">You:</span>{" "}
                    {msg}
                  </div>
                ))
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                className="flex-grow border px-4 py-2 rounded"
                placeholder="Type a message..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
              />
              <button
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
                onClick={handleSendMessage}
              >
                Send
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoChat;
