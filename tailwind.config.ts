import type { Config } from "tailwindcss";

/**
 * Black "departure board" tokens.
 * zinc is remapped to a neutral graphite ramp on true black, so every existing
 * surface/text class picks up the new theme without per-component rewrites.
 */
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        zinc: {
          50: "#F4F3EF", // warm off-white text
          100: "#E7E6E1",
          200: "#CFCEC9",
          300: "#AEADA8",
          400: "#8E8D89",
          500: "#6E6D6A",
          600: "#4F4E4C",
          700: "#353534",
          800: "#232323",
          900: "#141414",
          925: "#0C0C0C",
          950: "#000000",
        },
        vest: { DEFAULT: "#FFD400", soft: "#FFE04D", ink: "#141100" },
      },
      fontFamily: {
        sans: ["Archivo", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        display: ["Archivo", "system-ui", "sans-serif"],
        mono: ["Archivo", "ui-monospace", "monospace"],
      },
      letterSpacing: { board: "-0.035em" },
    },
  },
  plugins: [],
};
export default config;
