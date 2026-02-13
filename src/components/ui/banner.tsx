import { cn } from "@/lib/utils";

interface BannerProps {
  backgroundImage: string;
  title: string;
  description: string;
  mascotImage?: string;
  className?: string;
}

export function Banner({
  backgroundImage,
  title,
  description,
  mascotImage,
  className,
}: BannerProps) {
  return (
    <div className={cn("relative w-full overflow-visible", className)}>
      {/* Mascot image - positioned outside container */}
      {mascotImage && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 z-20 pointer-events-none w-20 h-20 sm:w-36 sm:h-36 md:w-44 md:h-44">
          <img
            src={mascotImage}
            alt=""
            className="w-full h-full object-contain"
            loading="lazy"
          />
        </div>
      )}

      {/* Banner container */}
      <div className="relative w-full h-20 sm:h-32 md:h-40 rounded-lg overflow-hidden bg-primary">
        {/* Background image */}
        <img
          src={backgroundImage}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />

        {/* Content */}
        <div className="relative z-10 flex items-center h-full px-4">
          <div className={cn("text-white", mascotImage && "ml-20 sm:ml-36 md:ml-48")}>
            <h2 className="text-lg sm:text-2xl md:text-4xl font-bold leading-tight">
              {title}
            </h2>
            <p className="text-xs sm:text-sm md:text-base font-medium mt-0.5 sm:mt-1 opacity-90">
              {description}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
