"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const navTabs = [
  { label: "NEWSFEED", active: true },
  { label: "OVERVIEW", active: false },
  { label: "SOCIAL & STREAM", active: false },
  { label: "BLOG", active: false },
  { label: "FORUM", active: false },
  { label: "STORE", active: false },
];

export function ProfileNavigation() {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollAmount = 150;
      scrollContainerRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  return (
    <div className="mt-3 rounded-xl bg-white shadow-[0_0_40px_rgba(94,92,154,0.06)] sm:mt-4">
      <div className="flex items-center">
        {/* Previous button */}
        <button
          onClick={() => scroll("left")}
          className="flex h-[50px] w-10 shrink-0 items-center justify-center text-[#adafca] transition-colors hover:text-[#3e3f5e] sm:h-[60px] sm:w-12"
        >
          <ChevronLeft className="size-4 sm:size-5" />
        </button>

        {/* Navigation tabs - scrollable on mobile */}
        <nav
          ref={scrollContainerRef}
          className="flex flex-1 items-center overflow-x-auto scrollbar-hide md:overflow-visible"
        >
          {navTabs.map((tab, index) => (
            <div key={tab.label} className="flex shrink-0 items-center md:flex-1">
              <a
                href="#"
                className={`flex h-[50px] items-center justify-center whitespace-nowrap px-4 text-[10px] font-bold transition-colors sm:h-[60px] sm:px-3 sm:text-xs md:flex-1 md:px-0 ${
                  tab.active
                    ? "text-[#3e3f5e]"
                    : "text-[#adafca] hover:text-[#3e3f5e]"
                }`}
              >
                {tab.label}
              </a>
              {/* Vertical bar between tabs */}
              {index < navTabs.length - 1 && (
                <div className="hidden h-5 w-px shrink-0 bg-[#eaeaf5] md:block" />
              )}
            </div>
          ))}
        </nav>

        {/* Next button */}
        <button
          onClick={() => scroll("right")}
          className="flex h-[50px] w-10 shrink-0 items-center justify-center text-[#adafca] transition-colors hover:text-[#3e3f5e] sm:h-[60px] sm:w-12"
        >
          <ChevronRight className="size-4 sm:size-5" />
        </button>
      </div>
    </div>
  );
}
