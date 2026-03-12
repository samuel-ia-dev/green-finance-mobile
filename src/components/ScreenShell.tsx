import { PropsWithChildren } from "react";
import { ScrollView, StyleSheet, View, ViewProps } from "react-native";
import { useAppTheme } from "@/context/ThemeContext";
import { spacing } from "@/theme/tokens";

type ScreenShellProps = PropsWithChildren<
  ViewProps & {
    scrollable?: boolean;
  }
>;

export function ScreenShell({ children, scrollable = true, style, ...props }: ScreenShellProps) {
  const { theme } = useAppTheme();
  const content = <View style={[styles.content, { backgroundColor: theme.colors.background }, style]} {...props}>{children}</View>;

  if (!scrollable) {
    return content;
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {content}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    gap: spacing.sm
  }
});
