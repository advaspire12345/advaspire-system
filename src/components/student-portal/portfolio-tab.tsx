"use client";

import { useEffect } from "react";

const ITEMS_PER_PAGE = 12;

interface PortfolioTabProps {
  studentId: string;
  page?: number;
  onPageInfo?: (info: { hasNext: boolean; hasPrev: boolean }) => void;
}

export function PortfolioTab({ studentId, page = 0, onPageInfo }: PortfolioTabProps) {
  // Placeholder images — replace with real data later
  const allImages = Array.from({ length: 30 }, (_, i) => ({
    idx: i,
    url: `https://picsum.photos/seed/portfolio${i}/400/400`,
  }));

  const totalPages = Math.ceil(allImages.length / ITEMS_PER_PAGE);
  const hasNext = page < totalPages - 1;
  const hasPrev = page > 0;

  useEffect(() => {
    onPageInfo?.({ hasNext, hasPrev });
  }, [page, hasNext, hasPrev, onPageInfo]);

  return (
    <div className="w-full grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3">
      {allImages.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE).map((img) => (
        <div
          key={img.idx}
          className="aspect-square overflow-hidden"
          style={{
            background: "linear-gradient(to bottom, #1D4965 80%, #1C3D52 80.85%)",
            border: "2px solid black",
            borderRadius: "12%",
            padding: "3%",
          }}
        >
          <img
            src={img.url}
            alt=""
            className="w-full h-full object-cover"
            style={{ borderRadius: "8%", border: "2px solid #0a1927" }}
          />
        </div>
      ))}
    </div>
  );
}
