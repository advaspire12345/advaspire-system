"use client";

import Link from "next/link";
import { navigationItems, getFeaturedResources } from "@/lib/navigation";
import type { NavItem } from "@/lib/navigation";
import type { PermissionsMap, UserRole } from "@/db/schema";

interface ActionLauncherProps {
  permissions: PermissionsMap | null;
  userRole: UserRole | null;
}

function ActionCard({ item, featured }: { item: NavItem; featured?: boolean }) {
  return (
    <Link
      href={item.href}
      className={
        featured
          ? "group flex flex-col items-center justify-center gap-3 rounded-xl border border-primary/20 bg-white p-6 text-center shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-md"
          : "group flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-white p-5 text-center shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-md"
      }
    >
      <span
        className={
          featured
            ? "flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground"
            : "flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary"
        }
      >
        <item.icon className={featured ? "h-6 w-6" : "h-5 w-5"} />
      </span>
      <span
        className={
          featured
            ? "text-sm font-semibold"
            : "text-sm font-medium text-foreground"
        }
      >
        {item.title}
      </span>
    </Link>
  );
}

export function ActionLauncher({ permissions, userRole }: ActionLauncherProps) {
  const canView = (item: NavItem) => {
    if (!permissions) return true;
    return permissions[item.resource]?.can_view;
  };

  const featuredResources = getFeaturedResources(userRole);

  // Featured items: in the order defined by getFeaturedResources, permission-filtered.
  const featuredItems = featuredResources
    .map((resource) =>
      navigationItems.find(
        (item) => item.resource === resource && item.href !== "/dashboard"
      )
    )
    .filter((item): item is NavItem => Boolean(item) && canView(item!));

  const featuredHrefs = new Set(featuredItems.map((item) => item.href));

  // Others: every permitted nav item except Dashboard itself and the featured ones.
  const otherItems = navigationItems.filter(
    (item) =>
      item.href !== "/dashboard" &&
      !featuredHrefs.has(item.href) &&
      canView(item)
  );

  return (
    <div className="space-y-8">
      {featuredItems.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Featured</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {featuredItems.map((item) => (
              <ActionCard key={item.href} item={item} featured />
            ))}
          </div>
        </section>
      )}

      {otherItems.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Others</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {otherItems.map((item) => (
              <ActionCard key={item.href} item={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
