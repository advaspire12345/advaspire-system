"use client";

import Image from "next/image";
import Link from "next/link";
import type { MarketplaceItem } from "@/data/landing-mock";

interface MarketplaceListProps {
  items: MarketplaceItem[];
}

export function MarketplaceList({ items }: MarketplaceListProps) {
  return (
    <div className="rounded-xl bg-white shadow-[0_0_40px_rgba(94,92,154,0.06)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#eaeaf5] px-7 py-6">
        <h4 className="text-xs font-bold uppercase tracking-wide text-[#3e3f5e]">
          Marketplace
        </h4>
        <span className="text-xs font-bold text-[#adafca]">{items.length}</span>
      </div>

      {/* Content */}
      <div className="px-7 py-6">
        <div className="space-y-4">
          {items.map((item) => (
            <MarketplaceItemRow key={item.id} item={item} />
          ))}
        </div>

        {/* View All Button */}
        <Link
          href="/marketplace"
          className="mt-6 flex h-10 w-full items-center justify-center rounded-xl bg-[#615dfa] text-xs font-bold text-white transition-colors hover:bg-[#5652e0]"
        >
          Browse Marketplace
        </Link>
      </div>
    </div>
  );
}

interface MarketplaceItemRowProps {
  item: MarketplaceItem;
}

function MarketplaceItemRow({ item }: MarketplaceItemRowProps) {
  return (
    <div className="flex items-center gap-4">
      {/* Product Image */}
      <div className="relative size-14 shrink-0 overflow-hidden rounded-xl">
        <Image
          src={item.imageUrl}
          alt={item.name}
          fill
          className="object-cover"
        />
      </div>

      {/* Product Info */}
      <div className="flex-1">
        <h5 className="text-sm font-bold text-[#3e3f5e]">{item.name}</h5>
        <p className="text-xs text-[#adafca]">by {item.seller}</p>
      </div>

      {/* Price */}
      <div className="shrink-0">
        <span className="text-sm font-bold text-[#615dfa]">${item.price}</span>
      </div>
    </div>
  );
}
