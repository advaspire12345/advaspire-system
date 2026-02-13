"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarCheck,
  ClipboardList,
  CreditCard,
  Clock,
  Building2,
  Trophy,
  ArrowLeftRight,
  Settings,
  FlaskConical,
  LogOut,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { HexagonAvatar } from "@/components/ui/hexagon-avatar";
import { HexagonNumberBadge } from "@/components/ui/hexagon-number-badge";
import { createClient } from "@/lib/supabase/client";

const navigationItems = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    href: "/dashboard",
  },
  {
    title: "Branches",
    icon: Building2,
    href: "/branches",
  },
  {
    title: "Trial",
    icon: FlaskConical,
    href: "/trial",
  },
  {
    title: "Mark Attendance",
    icon: CalendarCheck,
    href: "/attendance",
  },
  {
    title: "Attendance History",
    icon: ClipboardList,
    href: "/attendance-log",
  },
  {
    title: "Payment Record",
    icon: CreditCard,
    href: "/payment-record",
  },
  {
    title: "Pending Payments",
    icon: Clock,
    href: "/pending-payments",
  },
  {
    title: "Leaderboard",
    icon: Trophy,
    href: "/leaderboard",
  },
  {
    title: "Transactions",
    icon: ArrowLeftRight,
    href: "/transactions",
  },
];

const settingsItems = [
  {
    title: "Settings",
    icon: Settings,
    href: "/settings",
  },
];

// Placeholder badges - replace with actual badge images
const badges = [
  { id: 1, src: "/badges/tycoon-s.png", alt: "Badge 1" },
  { id: 2, src: "/badges/traveller-b.png", alt: "Badge 2" },
  { id: 3, src: "/badges/rulerm-s.png", alt: "Badge 3" },
  { id: 4, src: "/badges/platinumc-s.png", alt: "Badge 4" },
  { id: 5, src: "/badges/peoplesp-s.png", alt: "Badge 5" },
];

// Placeholder stats - replace with actual user data
const userStats = {
  level: 12,
  adcoin: 2450,
  mission: 8,
};

interface UserProfile {
  name: string;
  email: string;
  avatar: string | null;
}

export function AppSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<UserProfile | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function getUser() {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (authUser) {
        setUser({
          name:
            authUser.user_metadata?.full_name ||
            authUser.email?.split("@")[0] ||
            "User",
          email: authUser.email || "",
          avatar: authUser.user_metadata?.avatar_url || null,
        });
      }
    }
    getUser();
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const userName = user?.name || "User";
  const userEmail = user?.email || "";
  const userAvatar = user?.avatar;
  const userInitials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <Sidebar>
      {/* User Profile Section */}
      <SidebarHeader className="p-0">
        {/* Cover Photo */}
        <div className="relative h-29 w-full bg-gradient-to-r from-primary/80 to-primary">
          <div className="absolute inset-0 bg-[url('/cover-pattern.png')] opacity-20" />
        </div>

        {/* Avatar overlapping cover */}
        <div className="relative -mt-16 flex flex-col items-center px-4">
          <div className="relative" aria-label="Profile Picture">
            <HexagonAvatar
              size={140}
              imageUrl={userAvatar ?? undefined}
              percentage={0.85}
              fallbackInitials={userInitials}
              cornerRadius={20}
            />
            <div className="absolute bottom-3 right-3 z-20 pointer-events-none">
              <HexagonNumberBadge value={userStats.level} size={40} />
            </div>
          </div>

          {/* Name and Email */}
          <h3 className="mt-2 text-base font-semibold">{userName}</h3>
          <p className="text-xs text-muted-foreground">{userEmail}</p>

          {/* Badges Row */}
          <div className="mt-7 flex gap-1">
            {badges.map((badge) => (
              <div
                key={badge.id}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-muted"
              >
                <Image
                  src={badge.src}
                  alt={badge.alt}
                  width={30}
                  height={30}
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              </div>
            ))}
          </div>

          {/* Stats Row */}
          <div className="mt-7 flex w-full items-center justify-center text-center">
            <div className="flex flex-col px-6">
              <span className="text-xs font-bold">{userStats.level}</span>
              <span className="text-xs text-muted-foreground">Level</span>
            </div>
            <Separator orientation="vertical" className="!h-4 bg-border" />
            <div className="flex flex-col px-6">
              <span className="text-xs font-bold">
                {userStats.adcoin.toLocaleString()}
              </span>
              <span className="text-xs text-muted-foreground">Adcoin</span>
            </div>
            <Separator orientation="vertical" className="!h-4 bg-border" />
            <div className="flex flex-col px-6">
              <span className="text-xs font-bold">{userStats.mission}</span>
              <span className="text-xs text-muted-foreground">Mission</span>
            </div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="mt-10">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  pathname.startsWith(item.href + "/");
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link href={item.href}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
