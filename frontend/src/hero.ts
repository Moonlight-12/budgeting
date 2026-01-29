import { heroui } from "@heroui/theme";

export default heroui({
  addCommonColors: false,
  defaultTheme: "dark",
  themes: {
    dark: {
      colors: {
        background: {
          DEFAULT: "oklch(26.139% 0.00148 16.148)",
        },
        foreground: {
          DEFAULT: "oklch(0.145 0 0)",
        },
        primary: {
          DEFAULT: "oklch(0.205 0 0)",
          foreground: "oklch(0.985 0 0)",
        },
      },
    },
  },
});
