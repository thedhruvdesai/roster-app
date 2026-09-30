import type { Config } from "tailwindcss";

/**
 * "Night-shift duty board" tokens.
 * The zinc scale is remapped to a navy-ink ramp so every surface shares one hue.
 */
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        zinc: {
          50: "#F1F5F8",
          100: "#E4EBF0",
          200: "#C9D5DD",
          300: "#A8B8C4",
          400: "#8598A7",
          500: "#657A8A",
          600: "#4B5F6E",
          700: "#344755",
          800: "#233441",
          900: "#172633",
          925: "#122029",
          950: "#0D1822",
        },
        vest: { DEFAULT: "#FFD23F", soft: "#FFE27A", ink: "#241C00" },
      },
      fontFamily: {
        sans: ["Barlow", "system-ui", "sans-serif"],
        display: ['"Barlow Condensed"', "Barlow", "system-ui", "sans-serif"],
        mono: ['"Barlow Condensed"', "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
