import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useAppTheme } from "@/context/ThemeContext";
import { DashboardSummary } from "@/types/finance";
import { formatCurrency } from "@/utils/format";
import { palette, radii, spacing } from "@/theme/tokens";

type SummaryHeroProps = {
  balance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  healthStatus: DashboardSummary["healthStatus"];
};

const healthMeta: Record<
  DashboardSummary["healthStatus"],
  {
    label: string;
    accentColor: string;
    tone: string;
  }
> = {
  healthy: {
    label: "Saudável",
    accentColor: palette.success,
    tone: "Suas despesas em aberto ainda estão em um nível confortável."
  },
  attention: {
    label: "Atenção",
    accentColor: palette.warning,
    tone: "O mês pede atenção porque as despesas já pesam na renda."
  },
  critical: {
    label: "Crítica",
    accentColor: palette.danger,
    tone: "As despesas estão muito altas em relação ao que entrou no mês."
  }
};

export function SummaryHero({ balance, monthlyIncome, monthlyExpenses, healthStatus }: SummaryHeroProps) {
  const { theme } = useAppTheme();
  const health = healthMeta[healthStatus];
  const commitmentRatio = monthlyIncome > 0 ? Math.min(monthlyExpenses / monthlyIncome, 1) : monthlyExpenses > 0 ? 1 : 0;
  const commitmentPercent = Math.round(commitmentRatio * 100);
  const monthlySnapshot =
    monthlyIncome > 0
      ? `${formatCurrency(monthlyExpenses)} comprometidos de ${formatCurrency(monthlyIncome)} no mês`
      : monthlyExpenses > 0
        ? `${formatCurrency(monthlyExpenses)} em despesas e nenhuma receita lançada no mês`
        : "Sem movimentação suficiente para medir a saúde financeira deste mês";

  return (
    <LinearGradient colors={[theme.colors.heroStart, theme.colors.heroEnd]} style={styles.hero}>
      <Text style={styles.caption}>Saldo do mês</Text>
      <Text style={styles.balance}>{formatCurrency(balance)}</Text>
      <View style={styles.stats}>
        <View>
          <Text style={styles.caption}>Receitas do mês</Text>
          <Text style={styles.stat}>{formatCurrency(monthlyIncome)}</Text>
        </View>
        <View>
          <Text style={styles.caption}>Despesas em aberto</Text>
          <Text style={styles.stat}>{formatCurrency(monthlyExpenses)}</Text>
        </View>
      </View>
      <View style={[styles.healthCard, { backgroundColor: "rgba(11, 16, 32, 0.24)", borderColor: "rgba(255, 255, 255, 0.12)" }]}>
        <View style={styles.healthHeader}>
          <Text style={styles.healthLabel}>Saúde financeira</Text>
          <View style={[styles.healthBadge, { borderColor: health.accentColor, backgroundColor: `${health.accentColor}22` }]}>
            <View style={[styles.healthDot, { backgroundColor: health.accentColor }]} />
            <Text style={[styles.healthBadgeText, { color: health.accentColor }]}>{health.label}</Text>
          </View>
        </View>
        <Text style={styles.healthSummary}>{monthlySnapshot}</Text>
        <View style={[styles.healthTrack, { backgroundColor: "rgba(255, 255, 255, 0.14)" }]}>
          <View
            style={[
              styles.healthFill,
              {
                backgroundColor: health.accentColor,
                width: `${Math.max(commitmentPercent, monthlyExpenses > 0 ? 8 : 0)}%`
              }
            ]}
          />
        </View>
        <View style={styles.healthFooter}>
          <Text style={styles.healthMeta}>Comprometimento: {commitmentPercent}%</Text>
          <Text style={styles.healthMeta}>{health.tone}</Text>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.xs
  },
  caption: {
    color: "#E2E8F0",
    fontSize: 12
  },
  balance: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "800"
  },
  stats: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm
  },
  stat: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700"
  },
  healthCard: {
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.xs,
    marginTop: spacing.xs,
    padding: spacing.sm
  },
  healthHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm
  },
  healthLabel: {
    color: "#E2E8F0",
    fontSize: 12,
    fontWeight: "600"
  },
  healthBadge: {
    alignItems: "center",
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: spacing.xs + 1,
    paddingVertical: 5
  },
  healthDot: {
    borderRadius: radii.pill,
    height: 8,
    width: 8
  },
  healthBadgeText: {
    fontSize: 11,
    fontWeight: "700"
  },
  healthSummary: {
    color: "#FFFFFF",
    fontSize: 13,
    lineHeight: 18
  },
  healthTrack: {
    borderRadius: radii.pill,
    height: 8,
    overflow: "hidden"
  },
  healthFill: {
    borderRadius: radii.pill,
    height: "100%"
  },
  healthFooter: {
    gap: 4
  },
  healthMeta: {
    color: "#D1FAE5",
    fontSize: 11,
    lineHeight: 16
  }
});
