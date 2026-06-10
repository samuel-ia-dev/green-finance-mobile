import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { ScreenShell } from "@/components/ScreenShell";
import { useAppTheme } from "@/context/ThemeContext";
import { useFinanceRealtime } from "@/hooks/useFinanceRealtime";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";
import { AppTabParamList } from "@/navigation/types";
import { useFinanceStore } from "@/store/useFinanceStore";
import { Transaction } from "@/types/finance";
import { buildDashboardSummary } from "@/utils/dashboard";
import { formatCurrency, formatShortDate, shiftMonthKey } from "@/utils/format";
import { palette, radii, spacing } from "@/theme/tokens";

const MONTH_SHORT_LABELS = [
  "Jan.",
  "Fev.",
  "Mar.",
  "Abr.",
  "Mai.",
  "Jun.",
  "Jul.",
  "Ago.",
  "Set.",
  "Out.",
  "Nov.",
  "Dez."
];

const MONTH_FULL_LABELS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro"
];

const UPCOMING_LIST_HEIGHT = 188;
const LATEST_LIST_HEIGHT = 252;

function formatMonthNavigationLabel(monthKey: string) {
  const monthIndex = Number(monthKey.slice(5, 7)) - 1;
  return MONTH_SHORT_LABELS[monthIndex] ?? monthKey.slice(5, 7);
}

function formatMonthHeading(monthKey: string) {
  const monthIndex = Number(monthKey.slice(5, 7)) - 1;
  const year = monthKey.slice(0, 4);
  const monthLabel = MONTH_FULL_LABELS[monthIndex] ?? monthKey.slice(5, 7);
  return `${monthLabel} de ${year}`;
}

function getHealthLabel(status: "healthy" | "attention" | "critical") {
  if (status === "healthy") {
    return "Em dia";
  }

  if (status === "attention") {
    return "Atenção";
  }

  return "Crítico";
}

type MetricCardProps = {
  iconName: keyof typeof Ionicons.glyphMap;
  iconTone: string;
  label: string;
  value: number;
};

function MetricCard({ iconName, iconTone, label, value }: MetricCardProps) {
  const { theme, isDark } = useAppTheme();

  return (
    <View
      style={[
        styles.metricCard,
        {
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.borderSoft,
          shadowColor: isDark ? "#000000" : "#0F172A"
        }
      ]}
    >
      <View style={styles.metricHeader}>
        <View style={[styles.metricIcon, { backgroundColor: `${iconTone}18` }]}>
          <Ionicons color={iconTone} name={iconName} size={16} />
        </View>
        <Text style={[styles.metricLabel, { color: theme.colors.textMuted }]}>{label}</Text>
      </View>
      <Text numberOfLines={1} style={[styles.metricValue, { color: theme.colors.text }]}>
        {formatCurrency(value)}
      </Text>
    </View>
  );
}

type HomeTransactionItemProps = {
  amountColor: string;
  iconName: keyof typeof Ionicons.glyphMap;
  iconTone: string;
  meta: string;
  onPress: () => void;
  title: string;
  transaction: Transaction;
};

function HomeTransactionItem({ amountColor, iconName, iconTone, meta, onPress, title, transaction }: HomeTransactionItemProps) {
  const { theme } = useAppTheme();

  return (
    <Pressable
      accessibilityLabel={`Abrir ${title}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.transactionCard,
        {
          borderBottomColor: theme.colors.borderSoft,
          opacity: pressed ? 0.84 : 1
        }
      ]}
    >
      <View style={styles.transactionLeft}>
        <View style={[styles.transactionIcon, { backgroundColor: `${iconTone}18` }]}>
          <Ionicons color={iconTone} name={iconName} size={15} />
        </View>
        <View style={styles.transactionText}>
          <Text numberOfLines={1} style={[styles.transactionTitle, { color: theme.colors.text }]}>
            {title}
          </Text>
          <Text numberOfLines={1} style={[styles.transactionMeta, { color: theme.colors.textMuted }]}>
            {meta}
          </Text>
        </View>
      </View>
      <View style={styles.transactionRight}>
        <Text numberOfLines={1} style={[styles.transactionAmount, { color: amountColor }]}>
          {transaction.type === "income" ? "+" : "-"} {formatCurrency(transaction.amount)}
        </Text>
        <View style={styles.transactionDateRow}>
          <Text style={[styles.transactionMeta, { color: theme.colors.textMuted }]}>{formatShortDate(transaction.date)}</Text>
          <Ionicons color={theme.colors.textMuted} name="chevron-forward" size={14} />
        </View>
      </View>
    </Pressable>
  );
}

export function HomeScreen() {
  const { isSyncing } = useFinanceRealtime();
  const { theme, isDark } = useAppTheme();
  const { isCompact } = useResponsiveLayout();
  const navigation = useNavigation<BottomTabNavigationProp<AppTabParamList>>();
  const goals = useFinanceStore((state) => state.goals);
  const transactions = useFinanceStore((state) => state.transactions);
  const activeMonthKey = useFinanceStore((state) => state.activeMonthKey);
  const setActiveMonthKey = useFinanceStore((state) => state.setActiveMonthKey);
  const setEditingTransaction = useFinanceStore((state) => state.setEditingTransaction);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calendarYear, setCalendarYear] = useState(Number(activeMonthKey.slice(0, 4)));
  const dashboard = useMemo(() => buildDashboardSummary(transactions, goals, activeMonthKey), [activeMonthKey, goals, transactions]);
  const selectedYear = Number(activeMonthKey.slice(0, 4));
  const selectedMonthLabel = formatMonthHeading(activeMonthKey);
  const monthStrip = useMemo(() => [shiftMonthKey(activeMonthKey, -1), activeMonthKey, shiftMonthKey(activeMonthKey, 1)], [activeMonthKey]);
  const upcomingTransactions = useMemo(
    () =>
      [...transactions]
        .filter((transaction) => transaction.type === "expense" && !transaction.isPaid && transaction.date.startsWith(activeMonthKey))
        .sort((left, right) => left.date.localeCompare(right.date) || left.createdAt.localeCompare(right.createdAt)),
    [activeMonthKey, transactions]
  );
  const latestTransactions = useMemo(() => dashboard.recentTransactions, [dashboard.recentTransactions]);

  function handleToggleCalendar() {
    if (!isCalendarOpen) {
      setCalendarYear(selectedYear);
    }

    setIsCalendarOpen((current) => !current);
  }

  function handleSelectMonth(monthIndex: number) {
    const nextMonth = `${calendarYear}-${`${monthIndex + 1}`.padStart(2, "0")}`;
    setActiveMonthKey(nextMonth);
    setIsCalendarOpen(false);
  }

  function handleOpenTransaction(transaction: Transaction) {
    setEditingTransaction(transaction);
    navigation.navigate("Add");
  }

  return (
    <ScreenShell style={styles.screen}>
      <View style={styles.topBar}>
        <Pressable
          accessibilityLabel="Abrir configurações"
          onPress={() => navigation.navigate("Settings")}
          style={[styles.topIconButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.borderSoft }]}
        >
          <Ionicons color={theme.colors.text} name="notifications-outline" size={18} />
        </Pressable>
        <View style={[styles.monthStrip, { backgroundColor: theme.colors.card, borderColor: theme.colors.borderSoft }]}>
          {monthStrip.map((monthKey) => {
            const isActive = monthKey === activeMonthKey;

            return (
              <Pressable
                key={monthKey}
                accessibilityLabel={`Selecionar ${formatMonthHeading(monthKey)}`}
                onPress={() => setActiveMonthKey(monthKey)}
                style={[styles.monthChip, isActive && { backgroundColor: `${theme.colors.primary}18` }]}
              >
                <Text
                  style={[
                    styles.monthChipLabel,
                    {
                      color: isActive ? theme.colors.primary : theme.colors.textMuted,
                      fontWeight: isActive ? "800" : "600"
                    }
                  ]}
                >
                  {formatMonthNavigationLabel(monthKey)}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Pressable
          accessibilityLabel={isCalendarOpen ? "Fechar calendário mensal" : "Abrir calendário mensal"}
          onPress={handleToggleCalendar}
          style={[styles.topIconButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.borderSoft }]}
        >
          <Ionicons color={theme.colors.text} name="calendar-outline" size={18} />
        </Pressable>
      </View>

      {isCalendarOpen ? (
        <View style={[styles.calendarPanel, { backgroundColor: theme.colors.card, borderColor: theme.colors.borderSoft }]}>
          <View style={styles.calendarHeader}>
            <Pressable
              accessibilityLabel="Ano anterior"
              onPress={() => setCalendarYear((current) => current - 1)}
              style={[styles.calendarArrow, { borderColor: theme.colors.borderSoft }]}
            >
              <Ionicons color={theme.colors.text} name="chevron-back" size={16} />
            </Pressable>
            <Text style={[styles.calendarYear, { color: theme.colors.text }]}>{calendarYear}</Text>
            <Pressable
              accessibilityLabel="Ano seguinte"
              onPress={() => setCalendarYear((current) => current + 1)}
              style={[styles.calendarArrow, { borderColor: theme.colors.borderSoft }]}
            >
              <Ionicons color={theme.colors.text} name="chevron-forward" size={16} />
            </Pressable>
          </View>
          <View style={styles.calendarGrid}>
            {MONTH_SHORT_LABELS.map((monthLabel, monthIndex) => {
              const monthKey = `${calendarYear}-${`${monthIndex + 1}`.padStart(2, "0")}`;
              const isSelected = activeMonthKey === monthKey;
              const fullMonthLabel = MONTH_FULL_LABELS[monthIndex] ?? monthLabel;

              return (
                <Pressable
                  key={monthKey}
                  accessibilityLabel={`Selecionar ${fullMonthLabel} de ${calendarYear}`}
                  onPress={() => handleSelectMonth(monthIndex)}
                  style={[
                    styles.calendarMonth,
                    {
                      backgroundColor: isSelected ? theme.colors.primary : theme.colors.cardAlt,
                      borderColor: isSelected ? theme.colors.primary : theme.colors.borderSoft
                    }
                  ]}
                >
                  <Text style={[styles.calendarMonthLabel, { color: isSelected ? palette.ink : theme.colors.text }]}>{monthLabel}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      <View
        style={[
          styles.heroCard,
          isCompact && styles.heroCardCompact,
          {
            backgroundColor: theme.colors.primary,
            shadowColor: theme.colors.primary
          }
        ]}
      >
        <View style={styles.heroHeader}>
          <View style={styles.heroTitleRow}>
            <Text style={styles.heroCaption}>Saldo total</Text>
            <Ionicons color={palette.ink} name="eye-outline" size={15} />
          </View>
          <Pressable onPress={() => navigation.navigate("History")} style={styles.heroAction}>
            <Text style={styles.heroActionText}>Detalhes</Text>
            <Ionicons color={palette.ink} name="chevron-forward" size={14} />
          </Pressable>
        </View>
        <Text numberOfLines={1} style={[styles.heroBalance, isCompact && styles.heroBalanceCompact]}>
          {formatCurrency(dashboard.balance)}
        </Text>
        <View style={styles.heroFooter}>
          <Text style={styles.heroFooterText}>{isSyncing ? "Sincronizando agora" : "Atualizado há instantes"}</Text>
          <View style={[styles.heroBadge, { backgroundColor: "rgba(5, 5, 5, 0.12)" }]}>
            <Text style={styles.heroBadgeText}>{getHealthLabel(dashboard.healthStatus)}</Text>
          </View>
        </View>
      </View>

      <View style={[styles.metricsRow, isCompact && styles.metricsRowCompact]}>
        <MetricCard iconName="trending-up" iconTone={theme.colors.success} label="Ganhos" value={dashboard.monthlyIncome} />
        <MetricCard iconName="trending-down" iconTone={palette.danger} label="Gastos" value={dashboard.monthlyExpenses} />
      </View>

      <View
        style={[
          styles.sectionSurface,
          {
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.borderSoft,
            shadowColor: isDark ? "#000000" : "#0F172A"
          }
        ]}
      >
        <View style={styles.sectionHeader}>
          <View>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Próximos lançamentos</Text>
            <Text style={[styles.sectionSubtitle, { color: theme.colors.textMuted }]}>{selectedMonthLabel}</Text>
          </View>
          <Pressable onPress={() => navigation.navigate("History")}>
            <Text style={[styles.sectionAction, { color: theme.colors.primary }]}>Ver tudo</Text>
          </Pressable>
        </View>
        {upcomingTransactions.length ? (
          <ScrollView
            contentContainerStyle={styles.transactionsListContent}
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
            style={styles.upcomingTransactionsList}
          >
            {upcomingTransactions.map((transaction) => (
              <HomeTransactionItem
                key={transaction.id}
                amountColor={palette.danger}
                iconName={transaction.isRecurring ? "repeat" : "receipt-outline"}
                iconTone={transaction.isRecurring ? theme.colors.primary : theme.colors.notification}
                meta={`${transaction.categoryName} | ${transaction.isRecurring ? "Recorrente" : "Lançamento do mês"}`}
                onPress={() => handleOpenTransaction(transaction)}
                title={transaction.description}
                transaction={transaction}
              />
            ))}
          </ScrollView>
        ) : (
          <Text style={[styles.emptyState, { color: theme.colors.textMuted }]}>Nenhuma conta pendente neste mês.</Text>
        )}
      </View>

      <View
        style={[
          styles.sectionSurface,
          {
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.borderSoft,
            shadowColor: isDark ? "#000000" : "#0F172A"
          }
        ]}
      >
        <View style={styles.sectionHeader}>
          <View>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Últimas transações</Text>
            <Text style={[styles.sectionSubtitle, { color: theme.colors.textMuted }]}>Movimentos recentes de {selectedMonthLabel}</Text>
          </View>
          <Pressable onPress={() => navigation.navigate("History")}>
            <Text style={[styles.sectionAction, { color: theme.colors.primary }]}>Histórico</Text>
          </Pressable>
        </View>
        {latestTransactions.length ? (
          <ScrollView
            contentContainerStyle={styles.transactionsListContent}
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
            style={styles.latestTransactionsList}
          >
            {latestTransactions.map((transaction) => (
              <HomeTransactionItem
                key={transaction.id}
                amountColor={transaction.type === "income" ? theme.colors.success : transaction.isPaid ? theme.colors.success : theme.colors.text}
                iconName={transaction.type === "income" ? "arrow-up-outline" : "arrow-down-outline"}
                iconTone={transaction.type === "income" ? theme.colors.success : theme.colors.notification}
                meta={`${transaction.categoryName} | ${transaction.type === "income" ? "Receita" : transaction.isPaid ? "Pago" : "Despesa"}`}
                onPress={() => handleOpenTransaction(transaction)}
                title={transaction.description}
                transaction={transaction}
              />
            ))}
          </ScrollView>
        ) : (
          <Text style={[styles.emptyState, { color: theme.colors.textMuted }]}>Sem transações cadastradas neste mês.</Text>
        )}
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  screen: {
    gap: spacing.md
  },
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm
  },
  topIconButton: {
    alignItems: "center",
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    width: 42
  },
  monthStrip: {
    alignItems: "center",
    borderRadius: radii.pill,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 6,
    paddingVertical: 4
  },
  monthChip: {
    alignItems: "center",
    borderRadius: radii.pill,
    minWidth: 68,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 1
  },
  monthChipLabel: {
    fontSize: 13
  },
  calendarPanel: {
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md
  },
  calendarHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  calendarArrow: {
    alignItems: "center",
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 34,
    justifyContent: "center",
    width: 34
  },
  calendarYear: {
    fontSize: 17,
    fontWeight: "800"
  },
  calendarGrid: {
    columnGap: spacing.xs + 2,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: spacing.xs + 2
  },
  calendarMonth: {
    alignItems: "center",
    borderRadius: radii.md,
    borderWidth: 1,
    flexBasis: "31%",
    paddingVertical: spacing.sm
  },
  calendarMonthLabel: {
    fontSize: 12,
    fontWeight: "700"
  },
  heroCard: {
    borderRadius: 30,
    gap: spacing.xs,
    minHeight: 146,
    padding: spacing.lg,
    shadowOffset: {
      width: 0,
      height: 16
    },
    shadowOpacity: 0.26,
    shadowRadius: 26
  },
  heroCardCompact: {
    borderRadius: 24,
    padding: spacing.md
  },
  heroHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm
  },
  heroTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6
  },
  heroCaption: {
    color: palette.ink,
    fontSize: 12,
    fontWeight: "700"
  },
  heroAction: {
    alignItems: "center",
    flexDirection: "row",
    gap: 2
  },
  heroActionText: {
    color: palette.ink,
    fontSize: 12,
    fontWeight: "700"
  },
  heroBalance: {
    color: palette.ink,
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: -0.8
  },
  heroBalanceCompact: {
    fontSize: 28
  },
  heroFooter: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.xs
  },
  heroFooterText: {
    color: "rgba(5, 5, 5, 0.72)",
    fontSize: 11,
    fontWeight: "600"
  },
  heroBadge: {
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6
  },
  heroBadgeText: {
    color: palette.ink,
    fontSize: 11,
    fontWeight: "800"
  },
  metricsRow: {
    flexDirection: "row",
    gap: spacing.sm
  },
  metricsRowCompact: {
    flexDirection: "column"
  },
  metricCard: {
    borderRadius: radii.lg,
    borderWidth: 1,
    elevation: 2,
    flex: 1,
    gap: spacing.xs,
    minHeight: 108,
    padding: spacing.md,
    shadowOffset: {
      width: 0,
      height: 8
    },
    shadowOpacity: 0.08,
    shadowRadius: 18
  },
  metricHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs
  },
  metricIcon: {
    alignItems: "center",
    borderRadius: radii.pill,
    height: 30,
    justifyContent: "center",
    width: 30
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: "700"
  },
  metricValue: {
    fontSize: 22,
    fontWeight: "800"
  },
  sectionSurface: {
    borderRadius: 28,
    borderWidth: 1,
    elevation: 2,
    gap: spacing.xs,
    padding: spacing.md,
    shadowOffset: {
      width: 0,
      height: 8
    },
    shadowOpacity: 0.08,
    shadowRadius: 18
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
    gap: spacing.sm
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800"
  },
  sectionSubtitle: {
    fontSize: 12,
    marginTop: 2
  },
  sectionAction: {
    fontSize: 12,
    fontWeight: "800"
  },
  upcomingTransactionsList: {
    height: UPCOMING_LIST_HEIGHT,
    paddingRight: spacing.xs
  },
  latestTransactionsList: {
    height: LATEST_LIST_HEIGHT,
    paddingRight: spacing.xs
  },
  transactionsListContent: {
    paddingBottom: spacing.xs,
    paddingRight: spacing.xs
  },
  transactionCard: {
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.sm
  },
  transactionLeft: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: spacing.sm
  },
  transactionIcon: {
    alignItems: "center",
    borderRadius: radii.pill,
    height: 34,
    justifyContent: "center",
    width: 34
  },
  transactionText: {
    flex: 1,
    gap: 2
  },
  transactionTitle: {
    fontSize: 14,
    fontWeight: "700"
  },
  transactionMeta: {
    fontSize: 11
  },
  transactionRight: {
    alignItems: "flex-end",
    gap: 3,
    marginLeft: spacing.sm
  },
  transactionAmount: {
    fontSize: 13,
    fontWeight: "800"
  },
  transactionDateRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 2
  },
  emptyState: {
    fontSize: 13,
    lineHeight: 19,
    paddingVertical: spacing.xs
  }
});
