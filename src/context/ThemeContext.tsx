import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";
import { useAuthSession } from "@/context/AuthSessionContext";
import { firestoreService } from "@/services/firestoreService";
import { useFinanceStore } from "@/store/useFinanceStore";
import { darkTheme, lightTheme } from "@/theme/themes";
import { ThemePreference } from "@/types/finance";

type ThemeContextValue = {
  theme: typeof darkTheme;
  isDark: boolean;
  toggleTheme: () => void;
  setThemeMode: (mode: Extract<ThemePreference, "light" | "dark">) => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue>({
  theme: darkTheme,
  isDark: true,
  toggleTheme: () => undefined,
  setThemeMode: async () => undefined
});

export function AppThemeProvider({ children }: PropsWithChildren) {
  const systemTheme = useColorScheme();
  const { user } = useAuthSession();
  const selectedTheme = useFinanceStore((state) => state.settings.theme);
  const setSettings = useFinanceStore((state) => state.setSettings);
  const [isDark, setIsDark] = useState(selectedTheme === "dark" || (selectedTheme === "system" && systemTheme === "dark"));

  useEffect(() => {
    setIsDark(selectedTheme === "dark" || (selectedTheme === "system" && systemTheme === "dark"));
  }, [selectedTheme, systemTheme]);

  async function setThemeMode(mode: Extract<ThemePreference, "light" | "dark">) {
    setSettings({ theme: mode });

    if (!user?.uid) {
      return;
    }

    const currentSettings = useFinanceStore.getState().settings;
    await firestoreService.saveUserSettings(user.uid, {
      ...currentSettings,
      theme: mode
    });
  }

  const value = useMemo(
    () => ({
      theme: isDark ? darkTheme : lightTheme,
      isDark,
      toggleTheme: () => {
        void setThemeMode(isDark ? "light" : "dark");
      },
      setThemeMode
    }),
    [isDark, setThemeMode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  return useContext(ThemeContext);
}
