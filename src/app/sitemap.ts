import type { MetadataRoute } from "next";

const BASE = "https://www.advaspire.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${BASE}/`, lastModified: now, changeFrequency: "weekly", priority: 1.0 },
    { url: `${BASE}/learn`, lastModified: now, changeFrequency: "weekly", priority: 0.95 },
    { url: `${BASE}/#tracks`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE}/#projects`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/#ages`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/#why`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/#portfolio`, lastModified: now, changeFrequency: "weekly", priority: 0.85 },
    { url: `${BASE}/#pricing`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/#trial`, lastModified: now, changeFrequency: "weekly", priority: 0.95 },
    { url: `${BASE}/#social`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE}/#branches`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/login`, lastModified: now, changeFrequency: "yearly", priority: 0.4 },
    { url: `${BASE}/student-login`, lastModified: now, changeFrequency: "yearly", priority: 0.4 },
  ];
}
