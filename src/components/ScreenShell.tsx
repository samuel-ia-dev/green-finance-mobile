import { PropsWithChildren } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, ViewProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "@/context/ThemeContext";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";
import { spacing } from "@/theme/tokens";

type ScreenShellProps = PropsWithChildren<
  ViewProps & {
    scrollable?: boolean;
  }
>;

export function ScreenShell({ children, scrollable = true, style, ...props }: ScreenShellProps) {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { contentMaxWidth, horizontalPadding, verticalPadding } = useResponsiveLayout();
  const content = (
    <View
      style={[
        styles.content,
        {
          backgroundColor: theme.colors.background,
          maxWidth: contentMaxWidth,
          paddingBottom: Math.max(insets.bottom, spacing.sm) + verticalPadding,
          paddingHorizontal: horizontalPadding,
          paddingTop: Math.max(insets.top, spacing.xs) + verticalPadding
        },
        style
      ]}
      {...props}
    >
      {children}
    </View>
  );

  if (!scrollable) {
    return (
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={[styles.wrapper, { backgroundColor: theme.colors.background }]}>
        {content}
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={[styles.wrapper, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
        contentContainerStyle={styles.scrollContent}
        contentInsetAdjustmentBehavior="automatic"
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        style={[styles.wrapper, { backgroundColor: theme.colors.background }]}
      >
        {content}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1
  },
  scrollContent: {
    flexGrow: 1
  },
  content: {
    alignSelf: "center",
    flex: 1,
    gap: spacing.sm,
    width: "100%"
  }
});
