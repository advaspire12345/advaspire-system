// Vikinger-style color palette for landing page
export const landingColors = {
  // Page backgrounds
  pageBackground: "#f8f8fb",

  // Header/Navigation
  header: "#3e3f5e",
  headerLight: "#5e5f8e",

  // Accent colors
  accent: "#23d2e2",
  accentHover: "#1bc5d4",

  // Card colors
  cardBackground: "#ffffff",
  cardBorder: "#eaeaf5",

  // Text colors
  textPrimary: "#3e3f5e",
  textSecondary: "#8f91ac",
  textMuted: "#adafca",

  // Social button colors
  socialTwitter: "#1da1f2",
  socialInstagram: "#f77737",
  socialTwitch: "#7b5dfa",
  socialYoutube: "#ff0000",
  socialDiscord: "#7289da",

  // Status colors
  online: "#4ff461",
  offline: "#8f91ac",

  // Stats badge colors
  statsPosts: "#615dfa",
  statsFollowing: "#23d2e2",
  statsFollowers: "#4ff461",

  // Reaction colors
  like: "#ff6b6b",
  love: "#ff6b81",
  happy: "#ffd93d",
  wow: "#ff9ff3",
} as const;

export type LandingColorKey = keyof typeof landingColors;
