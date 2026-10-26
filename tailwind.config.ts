import type { Config } from "tailwindcss";

/**
 * Apple Human Interface Guidelines, dark appearance.
 * - zinc → iOS dark system greys (systemBackground, secondarySystemBackground, systemGray1–6, labels)
 * - colour palettes → iOS dark system colours, so every existing badge/status class picks them up
 * - vest → systemYellow, the app tint (as in Apple Notes)
 */
const sys = (c: string, light: string) => ({ 200: light, 300: light, 400: c, 500: c, 600: c });

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Neutral ramp comes from the active theme (lib/themes.ts)
        zinc: {
          50: "rgb(var(--z50) / <alpha-value>)",
          100: "rgb(var(--z100) / <alpha-value>)",
          200: "rgb(var(--z200) / <alpha-value>)",
          300: "rgb(var(--z300) / <alpha-value>)",
          400: "rgb(var(--z400) / <alpha-value>)",
          500: "rgb(var(--z500) / <alpha-value>)",
          600: "rgb(var(--z600) / <alpha-value>)",
          700: "rgb(var(--z700) / <alpha-value>)",
          800: "rgb(var(--z800) / <alpha-value>)",
          900: "rgb(var(--z900) / <alpha-value>)",
          925: "rgb(var(--z925) / <alpha-value>)",
          950: "rgb(var(--z950) / <alpha-value>)",
        },
        sky: sys("#0A84FF", "#409CFF"), // systemBlue
        orange: sys("#FF9F0A", "#FFB340"), // systemOrange
        violet: sys("#BF5AF2", "#DA8FFF"), // systemPurple
        rose: sys("#FF453A", "#FF6961"), // systemRed
        emerald: sys("#30D158", "#4CD964"), // systemGreen
        lime: sys("#63E6E2", "#8CF0EC"), // systemMint
        cyan: sys("#64D2FF", "#8ADDFF"), // systemCyan
        amber: sys("#FF9F0A", "#FFB340"), // pending = systemOrange
        indigo: sys("#5E5CE6", "#7D7AFF"), // systemIndigo
        vest: { DEFAULT: "rgb(var(--accent) / <alpha-value>)", soft: "rgb(var(--accent-soft) / <alpha-value>)", ink: "rgb(var(--accent-ink) / <alpha-value>)" },
      },
      fontFamily: {
        sans: ["Figtree", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        display: ["Figtree", "-apple-system", "sans-serif"],
        mono: ["Figtree", "ui-monospace", "monospace"],
        serif: ["Figtree", "-apple-system", "sans-serif"], // big figures (see .font-serif in globals)
      },
    },
  },
  plugins: [],
};
export default config;
