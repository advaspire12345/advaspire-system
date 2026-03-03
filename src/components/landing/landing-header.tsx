"use client";

import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Bell,
  MessageCircle,
  Settings,
  Search,
  ChevronDown,
} from "lucide-react";
import Link from "next/link";

const navItems = [
  { label: "HOME", href: "#", active: true },
  { label: "CAREERS", href: "#" },
  { label: "FAQS", href: "#" },
  { label: "ABOUT US", href: "#" },
  { label: "CONTACT US", href: "#" },
  { label: "FORUM", href: "#" },
];

export function LandingHeader() {
  return (
    <header className="sticky top-0 z-50 w-full bg-[#3e3f5e]">
      <div className="mx-auto flex h-[80px] max-w-[1184px] items-center justify-between px-0">
        {/* Logo */}
        <div className="flex items-center">
          <div className="flex size-[80px] items-center justify-center bg-[#615dfa]">
            <svg
              className="size-7 text-white"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex items-center gap-0">
          {navItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className={`flex h-[80px] items-center px-5 text-xs font-bold tracking-wide transition-colors ${
                item.active
                  ? "bg-[#4e4f6e] text-white"
                  : "text-white/60 hover:bg-[#4e4f6e] hover:text-white"
              }`}
            >
              {item.label}
            </a>
          ))}
          <a
            href="#"
            className="flex h-[80px] items-center gap-1 px-5 text-xs font-bold tracking-wide text-white/60 hover:bg-[#4e4f6e] hover:text-white"
          >
            FEATURES
            <ChevronDown className="size-3" />
          </a>
        </nav>

        {/* Search & Actions */}
        <div className="flex items-center">
          {/* Search */}
          <div className="relative flex h-[80px] items-center border-l border-white/10 px-5">
            <Search className="size-5 text-white/40" />
          </div>

          {/* Shopping Cart */}
          <div className="relative flex h-[80px] items-center border-l border-white/10 px-5">
            <svg
              className="size-5 text-white/40"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
              />
            </svg>
          </div>

          {/* Messages */}
          <div className="relative flex h-[80px] items-center border-l border-white/10 px-5">
            <MessageCircle className="size-5 text-white/40" />
            <span className="absolute right-3 top-5 flex size-4 items-center justify-center rounded-full bg-[#23d2e2] text-[10px] font-bold text-white">
              3
            </span>
          </div>

          {/* Notifications */}
          <div className="relative flex h-[80px] items-center border-l border-white/10 px-5">
            <Bell className="size-5 text-white/40" />
            <span className="absolute right-3 top-5 flex size-4 items-center justify-center rounded-full bg-[#23d2e2] text-[10px] font-bold text-white">
              5
            </span>
          </div>

          {/* Settings */}
          <div className="flex h-[80px] items-center border-l border-white/10 px-5">
            <Settings className="size-5 text-white/40" />
          </div>

          {/* Login Button */}
          <div className="flex h-[80px] items-center border-l border-white/10 px-5">
            <Button asChild className="bg-[#615dfa] hover:bg-[#5350e0]">
              <Link href="/login">LOGIN</Link>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
