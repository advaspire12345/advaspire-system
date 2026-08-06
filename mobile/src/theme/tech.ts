import { Platform } from "react-native";

// Parent-portal design system — "Clean brand build" (Turn 4) from the Advaspire
// Claude Design handoff. Warm off-white canvas, white rounded cards with soft
// shadows and NO borders, maroon dark panels. Web palette: red actions, blue
// secondary, warm-yellow alerts. Montserrat headings, sentence-case copy.
// No mono numerals, no hazard stripes, no circuit textures (all removed in T4).
export const C = {
  bg: "#F7F3F5",         // warm off-white canvas
  card: "#FFFFFF",       // white card
  cardAlt: "#F7F3F5",    // nested block on a white card (program rows)
  sunken: "#F0EAEC",     // dividers / image placeholders
  border: "#DDDDDD",     // app-bar hairline
  borderFaint: "#F0EAEC",

  ink: "#2B161B",        // maroon — dark panels + headings + primary text
  text: "#2B161B",
  textDim: "#666666",    // secondary / body
  textMute: "#999999",   // muted / captions

  red: "#EC2127",        // actions, CTAs, active
  redDark: "#CF1A20",
  blue: "#01A0E4",       // secondary, levels
  blueDark: "#0187C0",
  yellow: "#FDC049",     // alerts, unpaid, coin (dark text on it)
  yellowText: "#4A3A20",
  green: "#0F8B3C",      // positive "3 left"

  greenChip: "#E7F7EE",
  redChip: "#FDECED",
  blueChip: "#E1F2FB",
  greyChip: "#F5F5F5",

  white: "#FFFFFF",
  black: "#000000",

  // ── Back-compat aliases (older screens import these) ──
  surface: "#FFFFFF",
  surface2: "#F7F3F5",
  surface3: "#F0EAEC",
  bgElev: "#FFFFFF",
  cardText: "#2B161B",
  cardTextDim: "#666666",
  cardTextMute: "#999999",
  cardBorder: "#DDDDDD",
  redInk: "#EC2127",
  blueInk: "#01A0E4",
  yellowInk: "#4A3A20",
  redSoft: "#EC2127",
  blueSoft: "#01A0E4",
  redDim: "#FDECED",
  redLine: "#F5C6C3",
  blueDim: "#E1F2FB",
  blueLine: "#C7E9EE",
  yellowChip: "#FEF0D6",
  yellowBorder: "#F0CE7F",
};

// Kept for compatibility (Turn-4 uses Montserrat/system, not mono). Unused by T4.
export const MONO = Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }) as string;

// Soft card shadow (design: rgba(0,0,0,.06) 0 2px 8px).
export const cardShadow = {
  shadowColor: "#000000",
  shadowOpacity: 0.06,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 2 },
  elevation: 2,
};

// Slightly stronger card shadow (design: rgba(0,0,0,.1) 0 4px 10px -2px).
export const cardShadowLg = {
  shadowColor: "#000000",
  shadowOpacity: 0.1,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 4 },
  elevation: 3,
};

// Compat no-op-ish glow (T4 doesn't use coloured glows).
export function glow(color: string, opacity = 0.2, radius = 10) {
  return { shadowColor: color, shadowOpacity: opacity, shadowRadius: radius, shadowOffset: { width: 0, height: 4 }, elevation: 4 };
}
