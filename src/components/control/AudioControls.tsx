"use client";

import { useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useMediaUrl } from "@/lib/hooks/useMediaUrl";
import type { AudioPlayMode } from "@/lib/types/question";

export function AudioControls({
  audioPath,
  audioPlayMode,
}: {
  audioPath: string;
  audioPlayMode: AudioPlayMode;
}) {
  const audioUrl = useMediaUrl(audioPath);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (audioPlayMode === "autoplay" && audioUrl) {
      audioRef.current?.play();
    }
  }, [audioPlayMode, audioUrl]);

  if (!audioUrl) {
    return null;
  }

  return (
    <div className="flex items-center gap-2.5 rounded-panel border border-edge bg-surface px-4 py-2.5">
      <audio
        ref={audioRef}
        src={audioUrl}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />
      <Button
        variant="primary"
        onClick={() => (isPlaying ? audioRef.current?.pause() : audioRef.current?.play())}
      >
        {isPlaying ? "Pause" : "Play"}
      </Button>
      <Button
        onClick={() => {
          if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
          }
        }}
      >
        Stop
      </Button>
      <Badge className="ml-auto">{audioPlayMode === "autoplay" ? "Autoplay" : "Manual"}</Badge>
    </div>
  );
}
