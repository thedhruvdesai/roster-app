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
        zinc: {
          50: "#FFFFFF", // label
          100: "#F2F2F7",
          200: "#E5E5EA",
          300: "#C7C7CC",
          400: "#98989F", // secondaryLabel
          500: "#6C6C70", // tertiaryLabel
          600: "#48484A", // systemGray3
          700: "#3A3A3C", // systemGray4 / opaque separator
          800: "#2C2C2E", // tertiarySystemBackground
          900: "#1C1C1E", // secondarySystemBackground (grouped cells)
          925: "#121214",
          950: "#000000", // systemBackground
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
        vest: { DEFAULT: "#FFD60A", soft: "#FFE34D", ink: "#000000" }, // systemYellow tint
      },
      fontFamily: {
        sans: ["-apple-system", "BlinkMacSystemFont", '"SF Pro Text"', "Inter", "system-ui", "Segoe UI", "Roboto", "sans-serif"],
        display: ["-apple-system", "BlinkMacSystemFont", '"SF Pro Display"', "Inter", "system-ui", "sans-serif"],
        mono: ["-apple-system", "BlinkMacSystemFont", "Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
