import { NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppErrorBoundary } from "@/components/AppErrorBoundary";
import { AuthSessionProvider } from "@/context/AuthSessionContext";
import { AppThemeProvider, useAppTheme } from "@/context/ThemeContext";
import { RootNavigator } from "@/navigation/RootNavigator";

function AppContent() {
  const { theme, isDark } = useAppTheme();

  useEffect(() => {
    if (Platform.OS !== "web") {
      return;
    }

    document.documentElement.lang = "pt-BR";
    document.documentElement.setAttribute("translate", "no");
    document.body?.setAttribute("translate", "no");

    let meta = document.querySelector('meta[name="google"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "google");
      document.head?.appendChild(meta);
    }

    meta.setAttribute("content", "notranslate");
  }, []);

  return (
    <NavigationContainer theme={theme}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <RootNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppErrorBoundary>
        <SafeAreaProvider>
          <AuthSessionProvider>
            <AppThemeProvider>
              <AppContent />
            </AppThemeProvider>
          </AuthSessionProvider>
        </SafeAreaProvider>
      </AppErrorBoundary>
    </GestureHandlerRootView>
  );
}
