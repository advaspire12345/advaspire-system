import { Camera } from "lucide-react";

interface ProjectGalleryProps {
  photos: { url: string; date: string; childName: string }[];
}

const MAX_DISPLAY = 6;

export function ProjectGallery({ photos }: ProjectGalleryProps) {
  const displayPhotos = photos.slice(0, MAX_DISPLAY);
  const remaining = photos.length - MAX_DISPLAY;

  return (
    <div className="rounded-xl bg-white p-4 shadow-[0_0_40px_rgba(94,92,154,0.06)]">
      <div className="flex items-center gap-2 mb-3">
        <Camera className="h-4 w-4 text-[#23D2E2]" />
        <h2 className="text-base font-bold text-[#3e3f5e]">
          Project Gallery
        </h2>
      </div>

      {!photos.length ? (
        <p className="text-sm text-[#8f91ac] text-center py-4">
          No project photos yet
        </p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {displayPhotos.map((photo, idx) => {
            const isLast = idx === displayPhotos.length - 1 && remaining > 0;

            return (
              <div
                key={`${photo.url}-${idx}`}
                className="relative aspect-square rounded-lg overflow-hidden bg-gray-100"
              >
                <img
                  src={photo.url}
                  alt={`Project by ${photo.childName}`}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
                {isLast && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="text-xl font-bold text-white">
                      +{remaining}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
