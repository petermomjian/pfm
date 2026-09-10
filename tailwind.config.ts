import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: "var(--primary)",
        "border-input": "var(--border-input)",
        muted: "var(--muted-foreground)",
        surface: "var(--surface)",
        "surface-border": "var(--surface-border)",
        "surface-strong": "var(--surface-strong)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
