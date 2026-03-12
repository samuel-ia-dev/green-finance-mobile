import type { ErrorInfo, ReactNode } from "react";
import { Component } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { palette, radii, spacing } from "@/theme/tokens";

type AppErrorBoundaryProps = {
  children: ReactNode;
};

type AppErrorBoundaryState = {
  error?: Error;
};

function reloadApp() {
  if (typeof window !== "undefined" && typeof window.location?.reload === "function") {
    window.location.reload();
  }
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = {};

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("AppErrorBoundary captured an error", error, info.componentStack);
  }

  private handleRetry = () => {
    this.setState({ error: undefined });
  };

  render() {
    const { error } = this.state;

    if (!error) {
      return this.props.children;
    }

    return (
      <View style={styles.screen} testID="app-error-boundary">
        <View style={styles.card}>
          <Text style={styles.title}>A tela encontrou um erro</Text>
          <Text style={styles.description}>O aplicativo não fica mais em branco. Use uma das ações abaixo para recuperar a interface.</Text>
          <Text numberOfLines={3} style={styles.errorMessage}>
            {error.message || "Erro inesperado no frontend."}
          </Text>
          <Pressable accessibilityRole="button" onPress={this.handleRetry} style={[styles.button, styles.primaryButton]}>
            <Text style={styles.primaryLabel}>Tentar novamente</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={reloadApp} style={[styles.button, styles.secondaryButton]}>
            <Text style={styles.secondaryLabel}>Recarregar frontend</Text>
          </Pressable>
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  screen: {
    alignItems: "center",
    backgroundColor: palette.ink,
    flex: 1,
    justifyContent: "center",
    padding: spacing.lg
  },
  card: {
    backgroundColor: palette.darkCard,
    borderColor: palette.borderDark,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.sm,
    maxWidth: 420,
    padding: spacing.lg,
    width: "100%"
  },
  title: {
    color: palette.white,
    fontSize: 20,
    fontWeight: "700"
  },
  description: {
    color: "#C7D2FE",
    fontSize: 14,
    lineHeight: 20
  },
  errorMessage: {
    color: "#94A3B8",
    fontSize: 12,
    lineHeight: 18
  },
  button: {
    alignItems: "center",
    borderRadius: radii.md,
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: spacing.md
  },
  primaryButton: {
    backgroundColor: palette.green
  },
  secondaryButton: {
    backgroundColor: "#0F172A",
    borderColor: "#334155",
    borderWidth: 1
  },
  primaryLabel: {
    color: palette.white,
    fontSize: 14,
    fontWeight: "700"
  },
  secondaryLabel: {
    color: palette.white,
    fontSize: 14,
    fontWeight: "600"
  }
});
