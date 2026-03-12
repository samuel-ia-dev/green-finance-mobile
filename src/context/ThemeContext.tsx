import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";
import { useFinanceStore } from "@/store/useFinanceStore";
import { darkTheme, lightTheme } from "@/theme/themes";

type ThemeContextValue = {
  theme: typeof darkTheme;
  isDark: boolean;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  theme: darkTheme,
  isDark: true,
  toggleTheme: () => undefined
});

export function AppThemeProvider({ children }: PropsWithChildren) {
  const systemTheme = useColorScheme();
  const selectedTheme = useFinanceStore((state) => state.settings.theme);
  const setSettings = useFinanceStore((state) => state.setSettings);
  const [isDark, setIsDark] = useState(selectedTheme === "dark" || (selectedTheme === "system" && systemTheme === "dark"));

  useEffect(() => {
    setIsDark(selectedTheme === "dark" || (selectedTheme === "system" && systemTheme === "dark"));
  }, [selectedTheme, systemTheme]);

  const value = useMemo(
    () => ({
      theme: isDark ? darkTheme : lightTheme,
      isDark,
      toggleTheme: () => {
        setSettings({ theme: isDark ? "light" : "dark" });
      }
    }),
    [isDark, setSettings]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  return useContext(ThemeContext);
}
