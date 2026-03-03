"use client";

import Image from "next/image";
import { Play } from "lucide-react";

interface VideoPlayerProps {
  videos: string[];
}

export function VideoPlayer({ videos }: VideoPlayerProps) {
  return (
    <div className="rounded-xl bg-white shadow-[0_0_40px_rgba(94,92,154,0.06)]">
      {/* Header */}
      <div className="border-b border-[#eaeaf5] px-7 py-6">
        <h4 className="text-xs font-bold uppercase tracking-wide text-[#3e3f5e]">
          Video Stream
        </h4>
      </div>

      {/* Videos - One per row */}
      <div className="p-7">
        <div className="space-y-3">
          {videos.slice(0, 4).map((video, index) => (
            <div
              key={index}
              className="relative aspect-video w-full cursor-pointer overflow-hidden rounded-xl"
            >
              <Image
                src={video}
                alt={`Video ${index + 1}`}
                fill
                className="object-cover"
              />
              {/* Dark overlay */}
              <div className="absolute inset-0 bg-black/30 transition-colors hover:bg-black/40" />
              {/* Play button */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex size-12 items-center justify-center rounded-full bg-white/90 transition-transform hover:scale-110">
                  <Play className="ml-0.5 size-6 fill-[#615dfa] text-[#615dfa]" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
