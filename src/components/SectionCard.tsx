import { PropsWithChildren } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "@/context/ThemeContext";
import { radii, spacing } from "@/theme/tokens";

type SectionCardProps = PropsWithChildren<{
  title?: string;
  subtitle?: string;
}>;

export function SectionCard({ title, subtitle, children }: SectionCardProps) {
  const { theme } = useAppTheme();

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.borderSoft }]}>
      {title ? <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text> : null}
      {subtitle ? <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>{subtitle}</Text> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    gap: spacing.xs
  },
  title: {
    fontSize: 16,
    fontWeight: "700"
  },
  subtitle: {
    fontSize: 12
  }
});
