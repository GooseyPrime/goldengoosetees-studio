/**
 * GoldenGooseTees Studio — Theme Configuration
 * Brand: Bold adult humor apparel. Gold on black. Unapologetic.
 */

export const theme = {
  project: {
    name: "GoldenGooseTees",
    domain: "goldengoosetees.com",
    tagline: "Wear your truth. Loudly.",
    description: "Self-roasting, provocatively hilarious adult humor print-on-demand apparel",
  },

  colors: {
    // Primary — GGT Gold
    primary: {
      50:  "#fefce8",
      100: "#fef9c3",
      200: "#fef08a",
      300: "#fde047",
      400: "#facc15",
      500: "#eab308",  // GGT brand gold
      600: "#ca8a04",  // hover
      700: "#a16207",  // active
      800: "#854d0e",
      900: "#713f12",
      950: "#422006",
    },

    // Secondary — Pure Black
    secondary: {
      50:  "#fafafa",
      100: "#f4f4f5",
      200: "#e4e4e7",
      300: "#d4d4d8",
      400: "#a1a1aa",
      500: "#71717a",
      600: "#52525b",
      700: "#3f3f46",
      800: "#27272a",
      900: "#18181b",
      950: "#09090b",  // near-black background
    },

    // Accent — Warm White (for text on dark)
    accent: {
      DEFAULT: "#fafafa",
      muted:   "#e4e4e7",
      subtle:  "#a1a1aa",
    },

    semantic: {
      success: "#22c55e",
      warning: "#f59e0b",
      error:   "#ef4444",
      info:    "#3b82f6",
    },

    // Studio editor surface colors
    studio: {
      canvas:    "#1a1a1a",   // canvas background in editor
      toolbar:   "#111111",   // toolbar background
      panel:     "#1c1c1c",   // side panels
      border:    "#2a2a2a",   // panel borders
      highlight: "#eab308",   // selected element highlight
    },

    // Print area overlay in canvas
    printArea: {
      guide:    "rgba(234, 179, 8, 0.3)",   // gold semi-transparent guide
      text:     "rgba(234, 179, 8, 0.8)",   // guide label text
    },
  },

  typography: {
    fontFamily: {
      display: ['"Black Han Sans"', '"Impact"', '"Arial Black"', "sans-serif"],
      sans:    ["Inter", "system-ui", "sans-serif"],
      mono:    ['"JetBrains Mono"', "Consolas", "monospace"],
    },
    fontSize: {
      xs:   ["0.75rem",  { lineHeight: "1rem" }],
      sm:   ["0.875rem", { lineHeight: "1.25rem" }],
      base: ["1rem",     { lineHeight: "1.5rem" }],
      lg:   ["1.125rem", { lineHeight: "1.75rem" }],
      xl:   ["1.25rem",  { lineHeight: "1.75rem" }],
      "2xl":["1.5rem",   { lineHeight: "2rem" }],
      "3xl":["1.875rem", { lineHeight: "2.25rem" }],
      "4xl":["2.25rem",  { lineHeight: "2.5rem" }],
      "5xl":["3rem",     { lineHeight: "1.16" }],
      "6xl":["3.75rem",  { lineHeight: "1.1" }],
      "7xl":["4.5rem",   { lineHeight: "1.1" }],
    },
  },

  components: {
    button: {
      // Primary CTA: gold bg, black text
      primary: {
        background: "#eab308",
        text: "#000000",
        hover: "#ca8a04",
        borderRadius: "0.5rem",
      },
      // Secondary: black bg, gold border + text
      secondary: {
        background: "transparent",
        border: "#eab308",
        text: "#eab308",
        hover: "rgba(234, 179, 8, 0.1)",
        borderRadius: "0.5rem",
      },
      // Ghost: for low-priority actions
      ghost: {
        background: "transparent",
        text: "#a1a1aa",
        hover: "rgba(255,255,255,0.05)",
        borderRadius: "0.5rem",
      },
    },

    card: {
      background:   "#111111",
      border:       "#2a2a2a",
      borderRadius: "0.75rem",
      padding:      "1.5rem",
      shadow:       "0 4px 24px rgba(0,0,0,0.5)",
      hoverBorder:  "#eab308",
    },

    input: {
      background:   "#1a1a1a",
      border:       "#3f3f46",
      text:         "#fafafa",
      placeholder:  "#71717a",
      focus:        "#eab308",
      borderRadius: "0.5rem",
    },

    badge: {
      borderRadius: "9999px",
      padding:      "0.25rem 0.75rem",
      fontSize:     "0.75rem",
    },

    // Studio-specific
    canvas: {
      size:          800,  // px display size
      background:    "#1a1a1a",
      guideColor:    "rgba(234,179,8,0.4)",
      selectionColor:"rgba(234,179,8,0.8)",
    },

    placementTab: {
      active: {
        background: "#eab308",
        text:       "#000000",
      },
      inactive: {
        background: "#1c1c1c",
        text:       "#a1a1aa",
        border:     "#2a2a2a",
      },
      hasContent: {
        indicator: "#22c55e",  // green dot
      },
      empty: {
        indicator: "#52525b",  // gray dot
      },
    },
  },

  // GGT is dark-mode-first
  darkMode: {
    enabled: true,
    default: "dark" as const,
  },

  breakpoints: {
    xs:   "475px",
    sm:   "640px",
    md:   "768px",
    lg:   "1024px",
    xl:   "1280px",
    "2xl":"1536px",
  },

  zIndex: {
    hide:     -1,
    base:      0,
    dropdown: 1000,
    sticky:   1100,
    modal:    1300,
    popover:  1400,
    tooltip:  1500,
    toast:    1600,
  },

  animation: {
    easing: {
      default: "cubic-bezier(0.4, 0, 0.2, 1)",
      out:     "cubic-bezier(0, 0, 0.2, 1)",
      bounce:  "cubic-bezier(0.34, 1.56, 0.64, 1)",
    },
    duration: {
      fast:   "150ms",
      normal: "250ms",
      slow:   "400ms",
    },
  },
} as const;

export type Theme = typeof theme;

// Helper: get product type display color (for catalog UI)
export const productTypeColor: Record<string, string> = {
  tshirt:     theme.colors.primary[500],
  hoodie:     theme.colors.primary[600],
  sweatshirt: theme.colors.primary[700],
  mug:        "#60a5fa",
};

// Helper: mockup status colors
export const mockupStatusColor: Record<string, string> = {
  pending:  theme.colors.semantic.warning,
  partial:  "#f97316",
  complete: theme.colors.semantic.success,
  failed:   theme.colors.semantic.error,
};
