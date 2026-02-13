"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchBar({
  value,
  onChange,
  placeholder = "Search...",
  className,
}: SearchBarProps) {
  return (
    <div className={cn("relative flex-1 max-w-md", className)}>
      <Input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "pr-20 py-6 border-muted-foreground/30",
          value && "font-semibold"
        )}
      />
      <button
        type="button"
        className="absolute right-0 top-0 h-full w-12 flex items-center justify-center bg-primary rounded-lg hover:bg-primary/90 transition"
      >
        <Search className="h-5 w-5 text-primary-foreground" />
      </button>
    </div>
  );
}
