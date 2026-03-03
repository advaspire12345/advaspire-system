"use client";

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
  return (
    <div className="mt-4 rounded-xl bg-white shadow-[0_0_40px_rgba(94,92,154,0.06)]">
      <div className="flex items-center">
        {/* Previous button */}
        <button className="flex h-[60px] w-12 shrink-0 items-center justify-center text-[#adafca] transition-colors hover:text-[#3e3f5e]">
          <ChevronLeft className="size-5" />
        </button>

        {/* Navigation tabs */}
        <nav className="flex flex-1 items-center">
          {navTabs.map((tab, index) => (
            <div key={tab.label} className="flex flex-1 items-center">
              <a
                href="#"
                className={`flex h-[60px] flex-1 items-center justify-center text-xs font-bold transition-colors ${
                  tab.active
                    ? "text-[#3e3f5e]"
                    : "text-[#adafca] hover:text-[#3e3f5e]"
                }`}
              >
                {tab.label}
              </a>
              {/* Vertical bar between tabs */}
              {index < navTabs.length - 1 && (
                <div className="h-5 w-px shrink-0 bg-[#eaeaf5]" />
              )}
            </div>
          ))}
        </nav>

        {/* Next button */}
        <button className="flex h-[60px] w-12 shrink-0 items-center justify-center text-[#adafca] transition-colors hover:text-[#3e3f5e]">
          <ChevronRight className="size-5" />
        </button>
      </div>
    </div>
  );
}
