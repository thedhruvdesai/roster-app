/**
 * Runtime themes. Each one sets the neutral ramp (as "r g b" channels so Tailwind
 * opacity modifiers keep working), the accent, and the metallic gradient used on
 * primary buttons and money figures. Employer colours never change between themes.
 */
export type ThemeId = "base" | "signal" | "platinum";

type Ramp = [string, string, string, string, string, string, string, string, string, string, string, string];
// order: 50 100 200 300 400 500 600 700 800 900 925 950

export interface Theme {
  id: ThemeId;
  name: string;
  blurb: string;
  ramp: Ramp;
  accent: string; // solid accent for text, hands, active states
  accentSoft: string;
  ink: string; // text on accent
  metal: [string, string, string]; // light → mid → dark (primary buttons, money)
  glow: [string, string, string]; // highlight card gradient
  glowInk: string;
}

export const THEMES: Theme[] = [
  {
    id: "base",
    name: "Base",
    blurb: "Uber-style black and white",
    ramp: ["#FFFFFF", "#F6F6F6", "#E2E2E2", "#CBCBCB", "#AFAFAF", "#757575", "#545454", "#333333", "#282828", "#141414", "#0A0A0A", "#000000"],
    accent: "#FFFFFF",
    accentSoft: "#E2E2E2",
    ink: "#000000",
    metal: ["#FFFFFF", "#FFFFFF", "#F0F0F0"],
    glow: ["#FFFFFF", "#E8E8E8", "#9A9A9A"],
    glowInk: "#000000",
  },
  {
    id: "signal",
    name: "Signal",
    blurb: "Pure black, charcoal and signal green",
    ramp: ["#FFFFFF", "#F2F2F2", "#E2E2E2", "#C4C4C4", "#9A9A9A", "#6B6B6B", "#3A3A3A", "#222222", "#161616", "#0D0D0D", "#070707", "#030303"],
    accent: "#4CD07D",
    accentSoft: "#86E3A8",
    ink: "#000000",
    metal: ["#FFFFFF", "#F4F4F4", "#DCDCDC"],
    glow: ["#9AF5BC", "#3FC46C", "#14562C"],
    glowInk: "#03140A",
  },
  {
    id: "platinum",
    name: "Platinum",
    blurb: "Pure black and brushed silver",
    ramp: ["#FFFFFF", "#F3F4F6", "#E5E7EB", "#C9CCD1", "#9A9EA6", "#6D7179", "#494C52", "#2D2F33", "#1C1D20", "#0F1012", "#070708", "#000000"],
    accent: "#E3E6EA",
    accentSoft: "#FFFFFF",
    ink: "#000000",
    metal: ["#FFFFFF", "#D9DCE1", "#9EA3AB"],
    glow: ["#FFFFFF", "#C9CDD3", "#3D4046"],
    glowInk: "#060607",
  },];

const rgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
};
const STEPS = ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "925", "950"];

/** CSS for every theme, emitted once into <head> */
export function themeCss() {
  return THEMES.map((t) => {
    const vars = [
      ...t.ramp.map((c, i) => `--z${STEPS[i]}:${rgb(c)}`),
      `--accent:${rgb(t.accent)}`,
      `--accent-soft:${rgb(t.accentSoft)}`,
      `--accent-ink:${rgb(t.ink)}`,
      `--gold:${rgb(t.accent)}`,
      `--metal-1:${t.metal[0]}`,
      `--metal-2:${t.metal[1]}`,
      `--metal-3:${t.metal[2]}`,
      `--glow-1:${t.glow[0]}`,
      `--glow-2:${t.glow[1]}`,
      `--glow-3:${t.glow[2]}`,
      `--glow-ink:${t.glowInk}`,
    ].join(";");
    return `${t.id === "base" ? ":root," : ""}[data-theme="${t.id}"]{${vars}}`;
  }).join("\n");
}

export const getTheme = (id?: string) => THEMES.find((t) => t.id === id) ?? THEMES[0];
