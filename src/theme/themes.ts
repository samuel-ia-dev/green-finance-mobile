import { DarkTheme, DefaultTheme, Theme } from "@react-navigation/native";
import { palette } from "@/theme/tokens";

export type AppTheme = Theme & {
  colors: Theme["colors"] & {
    cardAlt: string;
    textMuted: string;
    success: string;
    warning: string;
    borderSoft: string;
    heroStart: string;
    heroEnd: string;
  };
  isDark: boolean;
};

export const lightTheme: AppTheme = {
  ...DefaultTheme,
  dark: false,
  isDark: false,
  colors: {
    ...DefaultTheme.colors,
    primary: palette.green,
    background: palette.lightSurface,
    card: palette.lightCard,
    text: palette.ink,
    border: palette.borderLight,
    notification: palette.blue,
    cardAlt: "#EEF4FF",
    textMuted: "#475569",
    success: palette.success,
    warning: palette.warning,
    borderSoft: "#E2E8F0",
    heroStart: "#0F172A",
    heroEnd: "#1D4ED8"
  }
};

export const darkTheme: AppTheme = {
  ...DarkTheme,
  dark: true,
  isDark: true,
  colors: {
    ...DarkTheme.colors,
    primary: palette.green,
    background: palette.ink,
    card: palette.darkCard,
    text: palette.white,
    border: palette.borderDark,
    notification: palette.blue,
    cardAlt: "#0F172A",
    textMuted: "#94A3B8",
    success: palette.success,
    warning: palette.warning,
    borderSoft: "#23314D",
    heroStart: "#14532D",
    heroEnd: "#1D4ED8"
  }
};
