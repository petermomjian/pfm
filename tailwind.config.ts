import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";

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
  plugins: [
    // iOS Safari simulates :hover on tap and only clears it when a different
    // element is next touched, so touch users see hover/pressed styling
    // "stick" after tapping a button. Gate hover: to real hover-capable
    // pointers so touch devices never enter that sticky state.
    //
    // Also excludes :active so a pressed element never fights an active:
    // utility for the same property (e.g. hover:scale-110 vs active:scale-90)
    // — re-registering "hover" here moves its generated CSS after the core
    // active variant, so without :not(:active) the hover rule would win the
    // cascade tie while a mouse button is held down.
    plugin(({ addVariant }) => {
      addVariant("hover", "@media (hover: hover) and (pointer: fine) { &:hover:not(:active) }");
    }),
  ],
} satisfies Config;
