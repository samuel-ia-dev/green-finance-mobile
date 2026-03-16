import { PropsWithChildren } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "@/context/ThemeContext";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";
import { radii, spacing } from "@/theme/tokens";

type SectionCardProps = PropsWithChildren<{
  title?: string;
  subtitle?: string;
}>;

export function SectionCard({ title, subtitle, children }: SectionCardProps) {
  const { theme } = useAppTheme();
  const { cardPadding, isCompact } = useResponsiveLayout();

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.borderSoft, padding: cardPadding }]}>
      {title ? <Text style={[styles.title, isCompact && styles.titleCompact, { color: theme.colors.text }]}>{title}</Text> : null}
      {subtitle ? <Text style={[styles.subtitle, isCompact && styles.subtitleCompact, { color: theme.colors.textMuted }]}>{subtitle}</Text> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.xs
  },
  title: {
    fontSize: 16,
    fontWeight: "700"
  },
  titleCompact: {
    fontSize: 15
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 18
  },
  subtitleCompact: {
    fontSize: 11,
    lineHeight: 16
  }
});
