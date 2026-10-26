/**
 * Runtime themes. Each one sets the neutral ramp (as "r g b" channels so Tailwind
 * opacity modifiers keep working), the accent, and the metallic gradient used on
 * primary buttons and money figures. Employer colours never change between themes.
 */
export type ThemeId = "onyx" | "midnight" | "rose" | "platinum" | "aurora";

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
  metal: [string, string, string]; // light → mid → dark
}

export const THEMES: Theme[] = [
  {
    id: "onyx",
    name: "Onyx",
    blurb: "Black and champagne gold",
    ramp: ["#FFFFFF", "#F2F2F7", "#E5E5EA", "#C7C7CC", "#98989F", "#6C6C70", "#48484A", "#2E2E31", "#1E1E20", "#111112", "#080808", "#000000"],
    accent: "#E9C46A",
    accentSoft: "#F2D58E",
    ink: "#000000",
    metal: ["#F6E1A6", "#E9C46A", "#C9A04B"],
  },
  {
    id: "midnight",
    name: "Midnight",
    blurb: "Navy black and ice blue",
    ramp: ["#FFFFFF", "#EEF2F7", "#DDE3EC", "#BFC7D6", "#8E99B0", "#5F6B84", "#3A4760", "#1F2A40", "#131C2E", "#0B1220", "#060A14", "#03060D"],
    accent: "#A7C7FF",
    accentSoft: "#C6DAFF",
    ink: "#03060D",
    metal: ["#E2ECFF", "#A7C7FF", "#6F93D9"],
  },
  {
    id: "rose",
    name: "Rose Noir",
    blurb: "Warm black and rose gold",
    ramp: ["#FFFFFF", "#F5F0F2", "#E9E1E4", "#CFC4C8", "#A2959A", "#76696E", "#4F4448", "#33292D", "#211A1D", "#141012", "#0A0708", "#050304"],
    accent: "#E8A896",
    accentSoft: "#F2C3B5",
    ink: "#1A0D09",
    metal: ["#F8D6CB", "#E8A896", "#C07A66"],
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
  },
  {
    id: "aurora",
    name: "Aurora",
    blurb: "Deep space with a cyan-to-violet glow",
    ramp: ["#FFFFFF", "#F1F0FA", "#E2E0F2", "#C6C3DD", "#9894B4", "#6B6788", "#47445E", "#2A2840", "#1A182C", "#0F0D1C", "#08070F", "#030209"],
    accent: "#9FD8FF",
    accentSoft: "#C5E8FF",
    ink: "#030209",
    metal: ["#8AF3FF", "#A9B6FF", "#B98CFF"],
  },
];

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
    ].join(";");
    return `${t.id === "onyx" ? ":root," : ""}[data-theme="${t.id}"]{${vars}}`;
  }).join("\n");
}

export const getTheme = (id?: string) => THEMES.find((t) => t.id === id) ?? THEMES[0];
