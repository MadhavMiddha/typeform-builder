/**
 * Design tokens – single source of truth for colours, typography, spacing.
 * Tailwind theme extension in tailwind.config.ts reads from here.
 */

export const colors = {
  // Brand
  brand: {
    DEFAULT: "#262627",
    accent: "#0EC290",
    accentDark: "#0A9B74",
    salmon: "#E35F43",
  },

  // Neutrals
  neutral: {
    50: "#FAFAFA",
    100: "#F5F5F5",
    200: "#EBEBEB",
    300: "#D1D1D1",
    400: "#9B9B9B",
    500: "#6B6B6B",
    600: "#4A4A4A",
    700: "#333333",
    800: "#1A1A1A",
    900: "#0D0D0D",
  },

  // Surfaces
  surface: {
    DEFAULT: "#FFFFFF",
    muted: "#F5F5F5",
    overlay: "rgba(0,0,0,0.4)",
  },

  // Status
  status: {
    draft: "#9B9B9B",
    published: "#0EC290",
    error: "#E53E3E",
    warning: "#D69E2E",
    success: "#38A169",
  },

  // Player (respondent)
  player: {
    bg: "#FFFFFF",
    text: "#262627",
    inputBorder: "#262627",
    progress: "#0EC290",
  },
} as const;

export const typography = {
  fontApp: "var(--font-inter)",
  fontPlayer: "var(--font-karla)",
} as const;

export const radius = {
  sm: "4px",
  md: "8px",
  lg: "12px",
  xl: "16px",
  full: "9999px",
} as const;

export const shadows = {
  sm: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
  md: "0 4px 12px rgba(0,0,0,0.08)",
  lg: "0 8px 24px rgba(0,0,0,0.10)",
  xl: "0 16px 48px rgba(0,0,0,0.12)",
  card: "0 2px 8px rgba(0,0,0,0.06)",
} as const;

export const zIndex = {
  dropdown: 100,
  modal: 200,
  toast: 300,
  tooltip: 400,
} as const;
