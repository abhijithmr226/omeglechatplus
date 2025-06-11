// src/screens/Tv/Tv.tsx

import { AlertTriangleIcon } from "lucide-react";
import React, { useState } from "react";
import VideoChat from "@/components/VideoChat";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useWebRTC } from "@/hooks/useWebRTC";

const Tv = (): JSX.Element => {
  const [interests, setInterests] = useState<string>("");
  const [isInChat, setIsInChat] = useState(false);
  const [chatMode, setChatMode] = useState<'text' | 'video'>('text');

  const { onlineCount } = useWebRTC();

  const handleStartChat = (mode: 'text' | 'video') => {
    setChatMode(mode);
    setIsInChat(true);
  };

  const handleBackToHome = () => {
    setIsInChat(false);
  };

  const interestsArray = interests.split(',').map(i => i.trim()).filter(i => i.length > 0);

  if (isInChat) {
    return (
      <VideoChat
        interests={interestsArray}
        mode={chatMode}
        onBack={handleBackToHome}
      />
    );
  }

  return (
    <div className="bg-white flex flex-row justify-center w-full min-h-screen">
      <div className="bg-white w-full max-w-[1280px] min-h-[720px]">
        <div className="relative min-h-[684px]">
          {/* Header */}
          <div className="absolute w-full h-[132px] top-0 left-0 bg-white shadow-[-6px_-16px_26.9px_2px_#000000] flex justify-center items-center">
            <img
              className="w-80 h-[66px] object-cover"
              alt="Omegle logo"
              src="/omegle-logo.png"
            />
          </div>

          {/* Online count */}
          <div className="absolute w-[251px] top-[82px] right-[56px] font-sans text-[15px]">
            <span className="font-black text-[#3fa0ff]">{onlineCount}+</span>
            <span className="text-[#3fa0ff]">&nbsp;</span>
            <span className="font-semibold text-[#3fa0ff]">Online Now</span>
          </div>

          {/* Tagline */}
          <div className="absolute w-[182px] top-[92px] right-[200px] font-['Marck_Script',Helvetica] text-black text-xl whitespace-nowrap">
            Talk to strangers!
          </div>

          {/* Card */}
          <Card className="absolute w-[860px] h-[520px] top-[164px] left-1/2 transform -translate-x-1/2 shadow-[14px_-7px_119.8px_-49px_#000000]">
            <CardContent className="p-0 h-full relative">
              <img
                className="w-[425px] h-[339px] mx-auto mt-6 object-cover"
                alt="Abstract indian flag"
                src="/abstract-indian-flag-png-free-download---3890x2779-1.png"
              />

              <div className="absolute top-[348px] left-[370px] font-medium text-sm text-center">
                Omegle (oh·meg·ull) is a great way to meet new friends. When you use Omegle, <br />
                you are paired randomly with another person to talk one-on-one. If you prefer,
                you can add your interests <br />
                and you'll be randomly paired with someone who selected some of the same interests.
              </div>

              <Alert className="absolute w-[443px] h-[49px] top-[417px] left-[485px] flex items-center bg-[#e6f7ff] border-[#91d5ff]">
                <AlertTriangleIcon className="h-6 w-6 text-amber-500" />
                <AlertDescription className="ml-2 font-bold text-xl">
                  The Video is Monitored. Keep it Clean
                </AlertDescription>
              </Alert>

              {/* Interests */}
              <div className="absolute top-[486px] left-[448px] font-bold text-sm">
                What do you wanna talk about ??
              </div>

              <div className="absolute w-[251px] h-[25px] top-[511px] left-[435px]">
                <Input
                  className="h-[25px] bg-[#f0f0f0] shadow-[2px_0px_4px_#00000040] text-sm font-semibold"
                  placeholder="Add your Interests (optional)"
                  value={interests}
                  onChange={(e) => setInterests(e.target.value)}
                />
              </div>

              {/* Start buttons */}
              <div className="absolute top-[486px] left-[830px] font-bold text-sm">
                Start Chatting:
              </div>

              <div className="absolute top-[512px] left-[764px] flex space-x-2">
                <Button
                  className="w-[111px] h-[42px] bg-[#3fa0ff] hover:bg-[#3590e8] rounded-md transition-all duration-200 transform hover:scale-105"
                  onClick={() => handleStartChat('text')}
                >
                  <span className="font-black text-white text-xl">Text</span>
                </Button>

                <Button
                  className="w-[111px] h-[42px] bg-[#3fa0ff] hover:bg-[#3590e8] rounded-md transition-all duration-200 transform hover:scale-105"
                  onClick={() => handleStartChat('video')}
                >
                  <span className="font-black text-white text-xl">Video</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Tv;