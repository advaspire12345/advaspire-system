"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Bell,
  MessageCircle,
  Settings,
  Search,
  ChevronDown,
  Menu,
  X,
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full bg-[#3e3f5e]">
      <div className="mx-auto flex h-[60px] max-w-[1184px] items-center justify-between px-4 md:h-[80px] md:px-0">
        {/* Logo */}
        <div className="flex items-center">
          <div className="flex size-[60px] items-center justify-center bg-[#615dfa] md:size-[80px]">
            <svg
              className="size-6 text-white md:size-7"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-0 lg:flex">
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

        {/* Desktop Search & Actions */}
        <div className="hidden items-center lg:flex">
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

        {/* Mobile/Tablet Actions */}
        <div className="flex items-center gap-2 lg:hidden">
          {/* Mobile Search */}
          <button className="flex size-10 items-center justify-center text-white/60">
            <Search className="size-5" />
          </button>

          {/* Mobile Notifications */}
          <button className="relative flex size-10 items-center justify-center text-white/60">
            <Bell className="size-5" />
            <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-[#23d2e2] text-[10px] font-bold text-white">
              5
            </span>
          </button>

          {/* Mobile Menu */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <button className="flex size-10 items-center justify-center text-white/60">
                <Menu className="size-6" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] bg-[#3e3f5e] p-0">
              <div className="flex flex-col">
                {/* Mobile Nav Items */}
                <nav className="flex flex-col">
                  {navItems.map((item) => (
                    <a
                      key={item.label}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex h-14 items-center border-b border-white/10 px-6 text-sm font-bold tracking-wide transition-colors ${
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
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex h-14 items-center justify-between border-b border-white/10 px-6 text-sm font-bold tracking-wide text-white/60 hover:bg-[#4e4f6e] hover:text-white"
                  >
                    FEATURES
                    <ChevronDown className="size-4" />
                  </a>
                </nav>

                {/* Mobile Actions */}
                <div className="flex flex-col gap-4 p-6">
                  <div className="flex items-center gap-4">
                    <button className="relative flex size-12 items-center justify-center rounded-lg bg-[#4e4f6e] text-white/60">
                      <MessageCircle className="size-5" />
                      <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-[#23d2e2] text-[10px] font-bold text-white">
                        3
                      </span>
                    </button>
                    <button className="flex size-12 items-center justify-center rounded-lg bg-[#4e4f6e] text-white/60">
                      <svg
                        className="size-5"
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
                    </button>
                    <button className="flex size-12 items-center justify-center rounded-lg bg-[#4e4f6e] text-white/60">
                      <Settings className="size-5" />
                    </button>
                  </div>

                  <Button asChild className="w-full bg-[#615dfa] hover:bg-[#5350e0]">
                    <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                      LOGIN
                    </Link>
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
