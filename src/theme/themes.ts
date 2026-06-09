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
    cardAlt: "#E4F1E8",
    textMuted: "#5B6F64",
    success: palette.success,
    warning: palette.warning,
    borderSoft: "#D8E8DE",
    heroStart: "#07140E",
    heroEnd: "#173528"
  }
};

export const darkTheme: AppTheme = {
  ...DarkTheme,
  dark: true,
  isDark: true,
  colors: {
    ...DarkTheme.colors,
    primary: palette.green,
    background: palette.darkSurface,
    card: palette.darkCard,
    text: palette.white,
    border: palette.borderDark,
    notification: palette.blue,
    cardAlt: "#12201A",
    textMuted: "#9AB7A8",
    success: palette.success,
    warning: palette.warning,
    borderSoft: "#2D463B",
    heroStart: "#07110D",
    heroEnd: "#17392B"
  }
};
