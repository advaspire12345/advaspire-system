"use client";

import Image from "next/image";
import type { Photo } from "@/data/landing-mock";

interface PhotoContainerProps {
  photos: Photo[];
  totalCount?: number;
}

export function PhotoContainer({ photos, totalCount = 26 }: PhotoContainerProps) {
  const displayPhotos = photos.slice(0, 7);
  const remainingCount = totalCount - 7;

  return (
    <div className="mt-4 rounded-xl bg-white shadow-[0_0_40px_rgba(94,92,154,0.06)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#eaeaf5] px-7 py-6">
        <h4 className="text-xs font-bold uppercase tracking-wide text-[#3e3f5e]">
          Photos
        </h4>
        <span className="text-xs font-bold text-[#adafca]">{totalCount}</span>
      </div>

      {/* Content */}
      <div className="p-7">
        {/* First row - 2 photos */}
        <div className="grid grid-cols-2 gap-3">
          {displayPhotos.slice(0, 2).map((photo) => (
            <div
              key={photo.id}
              className="relative aspect-[4/3] overflow-hidden rounded-xl"
            >
              <Image
                src={photo.url}
                alt={photo.alt}
                fill
                className="object-cover transition-transform hover:scale-105"
              />
            </div>
          ))}
        </div>

        {/* Second row - 3 photos */}
        <div className="mt-3 grid grid-cols-3 gap-3">
          {displayPhotos.slice(2, 5).map((photo) => (
            <div
              key={photo.id}
              className="relative aspect-square overflow-hidden rounded-xl"
            >
              <Image
                src={photo.url}
                alt={photo.alt}
                fill
                className="object-cover transition-transform hover:scale-105"
              />
            </div>
          ))}
        </div>

        {/* Third row - 2 photos with last having +N overlay */}
        <div className="mt-3 grid grid-cols-2 gap-3">
          {displayPhotos[5] && (
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl">
              <Image
                src={displayPhotos[5].url}
                alt={displayPhotos[5].alt}
                fill
                className="object-cover transition-transform hover:scale-105"
              />
            </div>
          )}

          {/* Last photo with +N overlay */}
          {displayPhotos[6] && (
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl">
              <Image
                src={displayPhotos[6].url}
                alt={displayPhotos[6].alt}
                fill
                className="object-cover"
              />
              {/* Overlay */}
              <div className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/50 transition-colors hover:bg-black/60">
                <span className="text-2xl font-bold text-white">
                  +{remainingCount}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
