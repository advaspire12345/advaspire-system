import { NextRequest, NextResponse } from "next/server";

// Tiny proxy that turns a TikTok video URL into its oEmbed metadata
// (thumbnail_url, author_name, title, html). Used by the landing page so each
// social card can render the *actual* video thumbnail TikTok shows on tiktok.com
// instead of an emoji placeholder.
//
// We proxy server-side rather than calling oEmbed straight from the browser to
// (a) avoid CORS issues and (b) cache responses for 1 day so repeat visitors
// don't re-hit TikTok's API.

export const revalidate = 86400; // 1 day

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url || !/^https:\/\/www\.tiktok\.com\//.test(url)) {
    return NextResponse.json({ error: "missing or invalid url" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`,
      {
        // 1-day edge cache — TikTok rate-limits aggressively.
        next: { revalidate: 86400 },
        headers: { "User-Agent": "Mozilla/5.0 advaspire-marketing" },
      },
    );
    if (!res.ok) {
      return NextResponse.json({ error: "upstream " + res.status }, { status: 502 });
    }
    const data = await res.json();
    return NextResponse.json(
      {
        thumbnail_url: data.thumbnail_url ?? null,
        title: data.title ?? null,
        author_name: data.author_name ?? null,
      },
      { headers: { "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800" } },
    );
  } catch {
    return NextResponse.json({ error: "fetch failed" }, { status: 502 });
  }
}
