import { NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppErrorBoundary } from "@/components/AppErrorBoundary";
import { AuthSessionProvider } from "@/context/AuthSessionContext";
import { AppThemeProvider, useAppTheme } from "@/context/ThemeContext";
import { RootNavigator } from "@/navigation/RootNavigator";

function AppContent() {
  const { theme, isDark } = useAppTheme();

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
