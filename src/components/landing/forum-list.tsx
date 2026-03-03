"use client";

import Link from "next/link";
import { HexagonAvatar } from "@/components/ui/hexagon-avatar";
import type { ForumTopic } from "@/data/landing-mock";

interface ForumListProps {
  topics: ForumTopic[];
}

export function ForumList({ topics }: ForumListProps) {
  return (
    <div className="rounded-xl bg-white shadow-[0_0_40px_rgba(94,92,154,0.06)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#eaeaf5] px-7 py-6">
        <h4 className="text-xs font-bold uppercase tracking-wide text-[#3e3f5e]">
          Forum
        </h4>
        <span className="text-xs font-bold text-[#adafca]">{topics.length}</span>
      </div>

      {/* Content */}
      <div className="px-7 py-6">
        <div className="space-y-5">
          {topics.map((topic) => (
            <ForumTopicRow key={topic.id} topic={topic} />
          ))}
        </div>

        {/* View All Button */}
        <Link
          href="/forum"
          className="mt-6 flex h-10 w-full items-center justify-center rounded-xl bg-[#615dfa] text-xs font-bold text-white transition-colors hover:bg-[#5652e0]"
        >
          View All Topics
        </Link>
      </div>
    </div>
  );
}

interface ForumTopicRowProps {
  topic: ForumTopic;
}

function ForumTopicRow({ topic }: ForumTopicRowProps) {
  return (
    <div className="space-y-1.5">
      {/* Title */}
      <h5 className="cursor-pointer text-sm font-bold text-[#3e3f5e] transition-colors hover:text-[#615dfa]">
        {topic.title}
      </h5>

      {/* Author info */}
      <div className="flex items-center gap-2">
        <HexagonAvatar
          size={28}
          imageUrl={topic.authorAvatar}
          fallbackInitials={topic.author.charAt(0)}
          cornerRadius={3}
        />
        <span className="flex-1 text-xs text-[#8f91ac]">
          by <span className="font-medium text-[#3e3f5e]">{topic.author}</span>
        </span>
        <span className="text-xs text-[#adafca]">{topic.timestamp}</span>
      </div>
    </div>
  );
}
