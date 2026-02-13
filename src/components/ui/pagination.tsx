"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalResults: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}

function VerticalDivider() {
  return (
    <div
      className="h-5 w-px bg-gray-200"
      role="separator"
      aria-orientation="vertical"
    />
  );
}

function getVisiblePages(
  currentPage: number,
  totalPages: number,
  maxVisible: number
): number[] {
  if (totalPages <= maxVisible) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const half = Math.floor(maxVisible / 2);
  let start = Math.max(1, currentPage - half);
  let end = Math.min(totalPages, start + maxVisible - 1);

  if (end - start + 1 < maxVisible) {
    start = Math.max(1, end - maxVisible + 1);
  }

  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

export function Pagination({
  currentPage,
  totalPages,
  totalResults,
  itemsPerPage,
  onPageChange,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const startResult = (currentPage - 1) * itemsPerPage + 1;
  const endResult = Math.min(currentPage * itemsPerPage, totalResults);

  const mobilePages = getVisiblePages(currentPage, totalPages, 3);
  const desktopPages = getVisiblePages(currentPage, totalPages, 5);

  const canGoPrevious = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  return (
    <div className="flex items-center justify-between py-3">
      {/* Mobile Pagination */}
      <div className="flex flex-1 justify-end sm:hidden">
        <nav
          className="inline-flex items-center rounded-md bg-white py-2"
          aria-label="Pagination"
        >
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={!canGoPrevious}
            className="flex items-center rounded-l-md px-4 py-3 text-gray-400 transition-colors hover:text-black disabled:opacity-50"
          >
            <span className="sr-only">Previous</span>
            <ChevronLeft className="h-5 w-5" />
          </button>

          <VerticalDivider />

          {mobilePages.map((page, idx) => (
            <div key={page} className="flex items-center">
              <button
                onClick={() => onPageChange(page)}
                aria-current={currentPage === page ? "page" : undefined}
                className={cn(
                  "mx-1 flex items-center rounded-md px-4 py-3 text-sm font-bold transition-all",
                  currentPage === page
                    ? "bg-white text-[#23D2E2] shadow-[0_2px_20px_rgba(173,175,202,0.2)]"
                    : "text-black hover:shadow-[0_2px_20px_rgba(173,175,202,0.2)]"
                )}
              >
                {page}
              </button>
              {idx < mobilePages.length - 1 && <VerticalDivider />}
            </div>
          ))}

          <VerticalDivider />

          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={!canGoNext}
            className="flex items-center rounded-r-md px-4 py-3 text-gray-400 transition-colors hover:text-black disabled:opacity-50"
          >
            <span className="sr-only">Next</span>
            <ChevronRight className="h-5 w-5" />
          </button>
        </nav>
      </div>

      {/* Desktop Pagination */}
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <p className="text-sm text-gray-700">
          Showing <span className="font-medium">{startResult}</span> to{" "}
          <span className="font-medium">{endResult}</span> of{" "}
          <span className="font-medium">{totalResults}</span> results
        </p>

        <nav
          className="inline-flex items-center rounded-md bg-white"
          aria-label="Pagination"
        >
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={!canGoPrevious}
            className="flex items-center rounded-l-md px-5 py-5 text-gray-400 transition-colors hover:text-black disabled:opacity-50"
          >
            <span className="sr-only">Previous</span>
            <ChevronLeft className="h-5 w-5" />
          </button>

          <VerticalDivider />

          {desktopPages.map((page, idx) => (
            <div key={page} className="flex items-center">
              <button
                onClick={() => onPageChange(page)}
                aria-current={currentPage === page ? "page" : undefined}
                className={cn(
                  "mx-2 flex items-center rounded-md px-5 py-3 text-sm font-bold transition-all",
                  currentPage === page
                    ? "bg-white text-[#23D2E2] shadow-[0_2px_20px_rgba(173,175,202,0.2)]"
                    : "text-black hover:shadow-[0_2px_20px_rgba(173,175,202,0.2)]"
                )}
              >
                {page}
              </button>
              {idx < desktopPages.length - 1 && <VerticalDivider />}
            </div>
          ))}

          <VerticalDivider />

          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={!canGoNext}
            className="flex items-center rounded-r-md px-5 py-5 text-gray-400 transition-colors hover:text-black disabled:opacity-50"
          >
            <span className="sr-only">Next</span>
            <ChevronRight className="h-5 w-5" />
          </button>
        </nav>
      </div>
    </div>
  );
}
