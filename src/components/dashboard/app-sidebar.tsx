"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, MoreHorizontal } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { HexagonAvatar } from "@/components/ui/hexagon-avatar";
import { HexagonNumberBadge } from "@/components/ui/hexagon-number-badge";
import { createClient } from "@/lib/supabase/client";
import { navigationItems, getFeaturedResources } from "@/lib/navigation";
import type { NavItem } from "@/lib/navigation";

import type { PermissionsMap, UserRole } from "@/db/schema";


// Placeholder badges - replace with actual badge images
const badges = [
  { id: 1, src: "/badges/tycoon-s.png", alt: "Badge 1" },
  { id: 2, src: "/badges/traveller-b.png", alt: "Badge 2" },
  { id: 3, src: "/badges/rulerm-s.png", alt: "Badge 3" },
  { id: 4, src: "/badges/platinumc-s.png", alt: "Badge 4" },
  { id: 5, src: "/badges/peoplesp-s.png", alt: "Badge 5" },
];

interface UserProfile {
  name: string;
  email: string;
  avatar: string | null;
  adcoinBalance: number;
}

interface AppSidebarProps {
  permissions: PermissionsMap | null;
  userRole: UserRole | null;
}

export function AppSidebar({ permissions, userRole }: AppSidebarProps) {
  const pathname = usePathname();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [othersOpen, setOthersOpen] = useState(false);
  const supabase = createClient();

  const canView = (item: NavItem) => {
    if (!permissions) return true;
    return permissions[item.resource]?.can_view;
  };

  // Dashboard + Summary always lead the list (permission-filtered).
  const dashboardItem = navigationItems.find((i) => i.href === "/dashboard");
  const summaryItem = navigationItems.find((i) => i.href === "/summary");
  const leadItems = [dashboardItem, summaryItem].filter(
    (item): item is NavItem => Boolean(item) && canView(item!)
  );

  // Featured actions for the role, in defined order, permission-filtered,
  // excluding anything already shown as a lead item.
  const featuredResources = getFeaturedResources(userRole);
  const featuredItems = featuredResources
    .map((resource) =>
      navigationItems.find(
        (item) =>
          item.resource === resource &&
          item.href !== "/dashboard" &&
          item.href !== "/summary"
      )
    )
    .filter((item): item is NavItem => Boolean(item) && canView(item!));

  const shownHrefs = new Set(
    [...leadItems, ...featuredItems].map((item) => item.href)
  );

  // Others: every remaining permitted nav item.
  const otherItems = navigationItems.filter(
    (item) => !shownHrefs.has(item.href) && canView(item)
  );

  const isItemActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  useEffect(() => {
    async function getUser() {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (authUser) {
        // Fetch adcoin balance from users table
        const { data: dbUser } = await supabase
          .from("users")
          .select("adcoin_balance")
          .eq("auth_id", authUser.id)
          .single();

        setUser({
          name:
            authUser.user_metadata?.full_name ||
            authUser.email?.split("@")[0] ||
            "User",
          email: authUser.email || "",
          avatar: authUser.user_metadata?.avatar_url || null,
          adcoinBalance: dbUser?.adcoin_balance ?? 0,
        });
      }
    }
    getUser();
  }, [supabase]);

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
              <HexagonNumberBadge value={Math.floor((user?.adcoinBalance ?? 0) / 500) + 1} size={40} />
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

          {/* Stats Row — Level / Adcoin / Mission temporarily hidden (not needed yet) */}
          <div className="mt-7 hidden w-full items-center justify-center text-center">
            <div className="flex flex-col px-6">
              <span className="text-xs font-bold">{Math.floor((user?.adcoinBalance ?? 0) / 500) + 1}</span>
              <span className="text-xs text-muted-foreground">Level</span>
            </div>
            <Separator orientation="vertical" className="!h-4 bg-border" />
            <div className="flex flex-col px-6">
              <span className="text-xs font-bold">
                {(user?.adcoinBalance ?? 0).toLocaleString()}
              </span>
              <span className="text-xs text-muted-foreground">Adcoin</span>
            </div>
            <Separator orientation="vertical" className="!h-4 bg-border" />
            <div className="flex flex-col px-6">
              <span className="text-xs font-bold">{0}</span>
              <span className="text-xs text-muted-foreground">Mission</span>
            </div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="mt-10">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Dashboard, Summary, then the role's featured actions */}
              {[...leadItems, ...featuredItems].map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={isItemActive(item.href)}>
                    <Link href={item.href}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              {/* Collapsible "Others" group for the remaining permitted items */}
              {otherItems.length > 0 && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => setOthersOpen((open) => !open)}
                    aria-expanded={othersOpen}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                    <span>Others</span>
                    <ChevronDown
                      className={`ml-auto h-4 w-4 transition-transform ${
                        othersOpen ? "rotate-180" : ""
                      }`}
                    />
                  </SidebarMenuButton>
                  {othersOpen && (
                    <SidebarMenuSub>
                      {otherItems.map((item) => (
                        <SidebarMenuSubItem key={item.href}>
                          <SidebarMenuSubButton
                            asChild
                            isActive={isItemActive(item.href)}
                          >
                            <Link href={item.href}>
                              <item.icon className="h-4 w-4" />
                              <span>{item.title}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  )}
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
