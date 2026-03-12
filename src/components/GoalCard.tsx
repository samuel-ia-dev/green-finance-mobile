import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "@/context/ThemeContext";
import { GoalProgress } from "@/types/finance";
import { formatCurrency } from "@/utils/format";
import { radii, spacing } from "@/theme/tokens";

type GoalCardProps = {
  goal: GoalProgress;
  onBoost?: () => void;
};

export function GoalCard({ goal, onBoost }: GoalCardProps) {
  const { theme } = useAppTheme();

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.cardAlt }]}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: theme.colors.text }]}>{goal.name}</Text>
          <Text style={[styles.caption, { color: theme.colors.textMuted }]}>{formatCurrency(goal.currentAmount)} de {formatCurrency(goal.targetAmount)}</Text>
        </View>
        <Text style={[styles.percent, { color: theme.colors.primary }]}>{goal.percent}%</Text>
      </View>
      <View style={[styles.track, { backgroundColor: theme.colors.borderSoft }]}>
        <View style={[styles.fill, { width: `${goal.percent}%`, backgroundColor: theme.colors.primary }]} />
      </View>
      {onBoost ? (
        <Pressable onPress={onBoost}>
          <Text style={[styles.action, { color: theme.colors.primary }]}>Adicionar R$ 100</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.md,
    padding: spacing.sm,
    gap: spacing.xs
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  title: {
    fontSize: 14,
    fontWeight: "700"
  },
  caption: {
    fontSize: 11
  },
  percent: {
    fontSize: 16,
    fontWeight: "800"
  },
  track: {
    height: 8,
    borderRadius: radii.pill,
    overflow: "hidden"
  },
  fill: {
    height: "100%",
    borderRadius: radii.pill
  },
  action: {
    fontSize: 12,
    fontWeight: "600"
  }
});
