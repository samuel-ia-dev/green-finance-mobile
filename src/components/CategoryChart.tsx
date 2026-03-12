import { createElement, useMemo } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "@/context/ThemeContext";
import { CategoryBreakdown, DashboardSummary } from "@/types/finance";
import { formatCurrency } from "@/utils/format";
import { palette, radii, spacing } from "@/theme/tokens";

type CategoryChartProps = {
  data: CategoryBreakdown[];
  monthlyExpenses: number;
  monthlyIncome: number;
  healthStatus: DashboardSummary["healthStatus"];
};

const chartColors = [palette.green, palette.blue, palette.warning, "#F97316", "#EC4899", "#8B5CF6"];
const chartWidth = 300;
const chartHeight = 190;
const chartPaddingTop = 18;
const chartPaddingRight = 18;
const chartPaddingBottom = 30;
const chartPaddingLeft = 22;

const statusMeta: Record<
  DashboardSummary["healthStatus"],
  {
    label: string;
    color: string;
    description: string;
  }
> = {
  healthy: {
    label: "Saudável",
    color: palette.success,
    description: "Despesas sob controle neste mês."
  },
  attention: {
    label: "Atenção",
    color: palette.warning,
    description: "As despesas já consomem boa parte da renda."
  },
  critical: {
    label: "Crítico",
    color: palette.danger,
    description: "As despesas estão pressionando seu caixa."
  }
};

function buildVisibleData(data: CategoryBreakdown[]) {
  if (data.length <= 6) {
    return data;
  }

  const leadingCategories = data.slice(0, 5);
  const remainingAmount = data.slice(5).reduce((sum, item) => sum + item.amount, 0);

  return [
    ...leadingCategories,
    {
      categoryId: "__remaining__",
      categoryName: "Demais",
      amount: remainingAmount,
      percent: 0
    }
  ];
}

function renderWebLineChart(
  points: {
    categoryId: string;
    categoryName: string;
    color: string;
    amount: number;
    x: number;
    y: number;
  }[],
  maxAmount: number,
  trackColor: string,
  lineColor: string
) {
  const usableHeight = chartHeight - chartPaddingTop - chartPaddingBottom;
  const baselineY = chartHeight - chartPaddingBottom;
  const linePoints = points.map((point) => `${point.x},${point.y}`).join(" ");
  const lastPoint = points[points.length - 1];
  const areaPoints = [`${chartPaddingLeft},${baselineY}`, ...points.map((point) => `${point.x},${point.y}`), `${lastPoint?.x ?? chartPaddingLeft},${baselineY}`].join(" ");
  const gridSteps = [1, 0.66, 0.33, 0];

  return createElement(
    "svg",
    {
      height: chartHeight,
      width: chartWidth,
      viewBox: `0 0 ${chartWidth} ${chartHeight}`
    },
    ...gridSteps.flatMap((step) => {
      const y = chartPaddingTop + usableHeight * (1 - step);
      const value = Math.round(maxAmount * step);

      return [
        createElement("line", {
          key: `grid-${step}`,
          x1: chartPaddingLeft,
          x2: chartWidth - chartPaddingRight,
          y1: y,
          y2: y,
          stroke: trackColor,
          strokeDasharray: "4 6",
          strokeWidth: 1
        }),
        createElement(
          "text",
          {
            key: `label-${step}`,
            fill: "#94A3B8",
            fontSize: 10,
            textAnchor: "start",
            x: chartPaddingLeft,
            y: y - 6
          },
          formatCurrency(value)
        )
      ];
    }),
    createElement("polygon", {
      fill: `${lineColor}22`,
      points: areaPoints
    }),
    createElement("polyline", {
      fill: "none",
      points: linePoints,
      stroke: lineColor,
      strokeLinecap: "round",
      strokeLinejoin: "round",
      strokeWidth: 4
    }),
    ...points.flatMap((point) => [
      createElement("circle", {
        key: `point-${point.categoryId}`,
        cx: point.x,
        cy: point.y,
        fill: "#FFFFFF",
        r: 7,
        stroke: point.color,
        strokeWidth: 4
      }),
      createElement(
        "text",
        {
          key: `point-label-${point.categoryId}`,
          fill: "#E2E8F0",
          fontSize: 11,
          textAnchor: "middle",
          x: point.x,
          y: chartHeight - 10
        },
        point.categoryName.length > 10 ? `${point.categoryName.slice(0, 10)}...` : point.categoryName
      )
    ])
  );
}

export function CategoryChart({ data, healthStatus, monthlyExpenses, monthlyIncome }: CategoryChartProps) {
  const { theme } = useAppTheme();
  const trackedExpenses = data.reduce((sum, item) => sum + item.amount, 0);
  const totalOpenExpenses = monthlyExpenses > 0 ? monthlyExpenses : trackedExpenses;
  const chart = useMemo(() => {
    const visibleData = buildVisibleData(data);
    const total = visibleData.reduce((sum, item) => sum + item.amount, 0);
    const maxAmount = Math.max(...visibleData.map((item) => item.amount), 1);
    const usableWidth = chartWidth - chartPaddingLeft - chartPaddingRight;
    const usableHeight = chartHeight - chartPaddingTop - chartPaddingBottom;

    return {
      total,
      maxAmount,
      items: visibleData.map((item, index) => {
        const ratio = total > 0 ? item.amount / total : 0;
        const x =
          visibleData.length === 1
            ? chartPaddingLeft + usableWidth / 2
            : chartPaddingLeft + (usableWidth / (visibleData.length - 1)) * index;
        const y = chartPaddingTop + usableHeight * (1 - item.amount / maxAmount);

        return {
          ...item,
          color: chartColors[index % chartColors.length],
          percent: total > 0 ? Math.round(ratio * 100) : 0,
          ratio,
          x,
          y
        };
      })
    };
  }, [data]);
  const commitmentRate = monthlyIncome > 0 ? Math.round((totalOpenExpenses / monthlyIncome) * 100) : totalOpenExpenses > 0 ? 100 : 0;
  const topCategory = chart.items[0];
  const health = statusMeta[healthStatus];

  if (!data.length) {
    return <Text style={{ color: theme.colors.textMuted }}>Sem gastos por categoria neste período.</Text>;
  }

  return (
    <View style={styles.chart}>
      <View style={styles.overview}>
        <View accessibilityLabel="Gráfico em linha de gastos por categoria" style={styles.chartShell} testID="category-line-chart">
          {Platform.OS === "web" ? (
            renderWebLineChart(chart.items, chart.maxAmount, theme.colors.borderSoft, theme.colors.primary)
          ) : (
            <View style={[styles.nativeLineFallback, { backgroundColor: theme.colors.cardAlt, borderColor: theme.colors.borderSoft }]}>
              {chart.items.map((item) => (
                <View key={item.categoryId} style={styles.nativeLineRow}>
                  <Text numberOfLines={1} style={[styles.nativeLineLabel, { color: theme.colors.textMuted }]}>
                    {item.categoryName}
                  </Text>
                  <View style={[styles.nativeLineTrack, { backgroundColor: theme.colors.borderSoft }]}>
                    <View style={[styles.nativeLineFill, { backgroundColor: theme.colors.primary, width: `${Math.max(item.ratio * 100, 8)}%` }]} />
                  </View>
                </View>
              ))}
              <Text style={[styles.nativeLineCaption, { color: theme.colors.textMuted }]}>Distribuição das categorias em linha.</Text>
            </View>
          )}
        </View>
        <View style={styles.summaryColumn}>
          <View style={[styles.summaryCard, { backgroundColor: theme.colors.cardAlt, borderColor: theme.colors.borderSoft }]}>
            <Text style={[styles.summaryLabel, { color: theme.colors.textMuted }]}>Comprometimento</Text>
            <Text style={[styles.summaryValue, { color: theme.colors.text }]}>{commitmentRate}%</Text>
            <Text style={[styles.summaryCaption, { color: theme.colors.textMuted }]}>
              {monthlyIncome > 0 ? `${formatCurrency(totalOpenExpenses)} de ${formatCurrency(monthlyIncome)}` : "Sem receita lançada no mês"}
            </Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: theme.colors.cardAlt, borderColor: theme.colors.borderSoft }]}>
            <Text style={[styles.summaryLabel, { color: theme.colors.textMuted }]}>Maior categoria</Text>
            <Text numberOfLines={1} style={[styles.summaryValue, { color: theme.colors.text }]}>
              {topCategory?.categoryName ?? "Sem categoria"}
            </Text>
            <Text style={[styles.summaryCaption, { color: theme.colors.textMuted }]}>
              {topCategory ? `${topCategory.percent}% das despesas abertas` : "Sem despesas abertas"}
            </Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: theme.colors.cardAlt, borderColor: theme.colors.borderSoft }]}>
            <Text style={[styles.summaryLabel, { color: theme.colors.textMuted }]}>Ritmo do mês</Text>
            <Text style={[styles.summaryValue, { color: health.color }]}>{health.label}</Text>
            <Text style={[styles.summaryCaption, { color: theme.colors.textMuted }]}>{health.description}</Text>
          </View>
        </View>
      </View>
      <View style={styles.legend}>
        {chart.items.map((item) => (
          <View key={item.categoryId || item.categoryName} style={[styles.legendCard, { backgroundColor: theme.colors.cardAlt, borderColor: theme.colors.borderSoft }]}>
            <View style={styles.row}>
              <View style={styles.legendLabel}>
                <View style={[styles.swatch, { backgroundColor: item.color }]} />
                <Text numberOfLines={1} style={[styles.label, { color: theme.colors.text }]}>
                  {item.categoryName}
                </Text>
              </View>
              <Text style={[styles.percentPill, { color: item.color, borderColor: item.color }]}>{item.percent}%</Text>
            </View>
            <View style={styles.legendValueRow}>
              <Text style={[styles.value, { color: theme.colors.text }]}>{formatCurrency(item.amount)}</Text>
              <Text style={[styles.share, { color: theme.colors.textMuted }]}>{Math.round(item.ratio * 100)} do total</Text>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: theme.colors.borderSoft }]}>
              <View style={[styles.progressFill, { width: `${Math.max(item.ratio * 100, 6)}%`, backgroundColor: item.color }]} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chart: {
    gap: spacing.md
  },
  overview: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    justifyContent: "center"
  },
  chartShell: {
    alignItems: "center",
    borderRadius: radii.lg,
    justifyContent: "center",
    minHeight: chartHeight,
    minWidth: chartWidth,
    overflow: "hidden"
  },
  nativeLineFallback: {
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.xs,
    minHeight: chartHeight,
    padding: spacing.sm,
    width: chartWidth
  },
  nativeLineRow: {
    gap: 6
  },
  nativeLineLabel: {
    fontSize: 11,
    fontWeight: "600"
  },
  nativeLineTrack: {
    borderRadius: radii.pill,
    height: 8,
    overflow: "hidden"
  },
  nativeLineFill: {
    borderRadius: radii.pill,
    height: "100%"
  },
  nativeLineCaption: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: spacing.xs
  },
  summaryColumn: {
    gap: spacing.xs,
    maxWidth: 220,
    minWidth: 190
  },
  summaryCard: {
    borderRadius: radii.md,
    borderWidth: 1,
    gap: 4,
    padding: spacing.sm
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase"
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: "700"
  },
  summaryCaption: {
    fontSize: 11,
    lineHeight: 16
  },
  legend: {
    gap: spacing.xs,
    width: "100%"
  },
  legendCard: {
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.sm
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between"
  },
  legendLabel: {
    alignItems: "center",
    flexDirection: "row",
    flexShrink: 1,
    gap: spacing.xs,
    marginRight: spacing.sm
  },
  legendValueRow: {
    flexDirection: "row",
    justifyContent: "space-between"
  },
  label: {
    fontSize: 12,
    fontWeight: "600"
  },
  value: {
    fontSize: 11
  },
  share: {
    fontSize: 10,
    textTransform: "lowercase"
  },
  percentPill: {
    borderRadius: radii.pill,
    borderWidth: 1,
    fontSize: 10,
    fontWeight: "700",
    overflow: "hidden",
    paddingHorizontal: spacing.xs,
    paddingVertical: 3
  },
  progressTrack: {
    borderRadius: radii.pill,
    height: 6,
    overflow: "hidden"
  },
  progressFill: {
    borderRadius: radii.pill,
    height: "100%"
  },
  swatch: {
    borderRadius: radii.pill,
    height: 8,
    width: 8
  }
});
