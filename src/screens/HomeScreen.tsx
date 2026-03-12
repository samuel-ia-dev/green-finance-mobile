import { createElement, useMemo, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { CategoryChart } from "@/components/CategoryChart";
import { ScreenShell } from "@/components/ScreenShell";
import { SectionCard } from "@/components/SectionCard";
import { SummaryHero } from "@/components/SummaryHero";
import { TransactionRow } from "@/components/TransactionRow";
import { useAppTheme } from "@/context/ThemeContext";
import { useFinanceRealtime } from "@/hooks/useFinanceRealtime";
import { AppTabParamList } from "@/navigation/types";
import { firestoreService } from "@/services/firestoreService";
import { useFinanceStore } from "@/store/useFinanceStore";
import { Transaction } from "@/types/finance";
import { buildDashboardSummary } from "@/utils/dashboard";
import { formatCurrency, getMonthKey } from "@/utils/format";
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { spacing } from "@/theme/tokens";

const MONTH_LABELS = [
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

const EXPENSE_SCROLLBAR_CSS = `
#launched-expenses-scroll::-webkit-scrollbar {
  width: 5px;
}

#launched-expenses-scroll::-webkit-scrollbar-track {
  background: transparent;
}

#launched-expenses-scroll::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.28);
  border-radius: 999px;
}

#launched-expenses-scroll::-webkit-scrollbar-thumb:hover {
  background: rgba(148, 163, 184, 0.42);
}

#launched-expenses-scroll::-webkit-scrollbar-button {
  display: none;
  width: 0;
  height: 0;
}
`;

const expenseScrollWebStyle = {
  scrollbarWidth: "thin",
  scrollbarColor: "rgba(148, 163, 184, 0.28) transparent"
} as const;

function formatCalendarPeriod(monthKey: string) {
  const [year, month] = monthKey.split("-");
  const monthIndex = Number(month) - 1;
  return `${MONTH_LABELS[monthIndex] ?? month} ${year}`;
}

export function HomeScreen() {
  const { isSyncing } = useFinanceRealtime();
  const { theme } = useAppTheme();
  const navigation = useNavigation<BottomTabNavigationProp<AppTabParamList>>();
  const goals = useFinanceStore((state) => state.goals);
  const transactions = useFinanceStore((state) => state.transactions);
  const removeTransaction = useFinanceStore((state) => state.removeTransaction);
  const setEditingTransaction = useFinanceStore((state) => state.setEditingTransaction);
  const updateTransactionLocal = useFinanceStore((state) => state.updateTransactionLocal);
  const currentMonth = getMonthKey();
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calendarYear, setCalendarYear] = useState(Number(currentMonth.slice(0, 4)));
  const dashboard = useMemo(() => buildDashboardSummary(transactions, goals, selectedMonth), [goals, selectedMonth, transactions]);
  const insights = dashboard.insights ?? [];
  const selectedYear = Number(selectedMonth.slice(0, 4));
  const selectedMonthLabel = formatCalendarPeriod(selectedMonth);
  const expenseTransactions = useMemo(
    () =>
      [...transactions]
        .filter((transaction) => transaction.type === "expense")
        .filter((transaction) => transaction.date.startsWith(selectedMonth))
        .sort((left, right) => right.date.localeCompare(left.date) || right.createdAt.localeCompare(left.createdAt)),
    [selectedMonth, transactions]
  );

  async function handleTogglePaid(transaction: Transaction) {
    const nextPaidState = !transaction.isPaid;

    try {
      await firestoreService.updateTransaction(transaction.id, { isPaid: nextPaidState });
      updateTransactionLocal(transaction.id, {
        isPaid: nextPaidState,
        updatedAt: new Date().toISOString()
      });
    } catch {
      return;
    }
  }

  async function handleDeleteTransaction(id: string) {
    try {
      await firestoreService.deleteTransaction(id);
      removeTransaction(id);
    } catch {
      return;
    }
  }

  function handleEditTransaction(transaction: Transaction) {
    setEditingTransaction(transaction);
    navigation.navigate("Add");
  }

  function handleToggleCalendar() {
    if (!isCalendarOpen) {
      setCalendarYear(selectedYear);
    }

    setIsCalendarOpen((current) => !current);
  }

  function handleSelectMonth(monthIndex: number) {
    const nextMonth = `${calendarYear}-${`${monthIndex + 1}`.padStart(2, "0")}`;
    setSelectedMonth(nextMonth);
    setIsCalendarOpen(false);
  }

  return (
    <ScreenShell>
      <SectionCard title="Calendario" subtitle="Abra o calendario para trocar o mes e o ano direto na tela inicial.">
        <Pressable
          accessibilityLabel={isCalendarOpen ? "Fechar calendario mensal" : "Abrir calendario mensal"}
          onPress={handleToggleCalendar}
          style={[styles.calendarTrigger, { backgroundColor: theme.colors.cardAlt, borderColor: theme.colors.borderSoft }]}
        >
          <View>
            <Text style={[styles.calendarLabel, { color: theme.colors.textMuted }]}>Periodo selecionado</Text>
            <Text style={[styles.calendarValue, { color: theme.colors.text }]}>{selectedMonthLabel}</Text>
          </View>
          <Text style={[styles.calendarAction, { color: theme.colors.primary }]}>{isCalendarOpen ? "Fechar" : "Abrir"}</Text>
        </Pressable>
        {isCalendarOpen ? (
          <View style={[styles.calendarPanel, { backgroundColor: theme.colors.cardAlt, borderColor: theme.colors.borderSoft }]}>
            <View style={styles.yearRow}>
              <Pressable
                accessibilityLabel="Ano anterior"
                onPress={() => setCalendarYear((current) => current - 1)}
                style={[styles.yearButton, { borderColor: theme.colors.borderSoft }]}
              >
                <Text style={{ color: theme.colors.text }}>Anterior</Text>
              </Pressable>
              <Text style={[styles.yearValue, { color: theme.colors.text }]}>{calendarYear}</Text>
              <Pressable
                accessibilityLabel="Ano seguinte"
                onPress={() => setCalendarYear((current) => current + 1)}
                style={[styles.yearButton, { borderColor: theme.colors.borderSoft }]}
              >
                <Text style={{ color: theme.colors.text }}>Proximo</Text>
              </Pressable>
            </View>
            <View style={styles.calendarGrid}>
              {MONTH_LABELS.map((monthLabel, monthIndex) => {
                const monthKey = `${calendarYear}-${`${monthIndex + 1}`.padStart(2, "0")}`;
                const isSelected = selectedMonth === monthKey;

                return (
                  <Pressable
                    key={monthKey}
                    accessibilityLabel={`Selecionar ${monthLabel} de ${calendarYear}`}
                    onPress={() => handleSelectMonth(monthIndex)}
                    style={[
                      styles.monthTile,
                      {
                        backgroundColor: isSelected ? theme.colors.primary : theme.colors.background,
                        borderColor: isSelected ? theme.colors.primary : theme.colors.borderSoft
                      }
                    ]}
                  >
                    <Text style={[styles.monthTileText, { color: isSelected ? "#FFFFFF" : theme.colors.text }]}>{monthLabel}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}
      </SectionCard>
      <SummaryHero
        balance={dashboard.balance}
        monthlyIncome={dashboard.monthlyIncome}
        monthlyExpenses={dashboard.monthlyExpenses}
        healthStatus={dashboard.healthStatus}
      />
      <SectionCard
        title={`Gastos por categoria em ${selectedMonthLabel}`}
        subtitle={isSyncing ? "Sincronizando em tempo real..." : "Atualização em tempo real via Firestore."}
      >
        <CategoryChart
          data={dashboard.categoryBreakdown}
          healthStatus={dashboard.healthStatus}
          monthlyExpenses={dashboard.monthlyExpenses}
          monthlyIncome={dashboard.monthlyIncome}
        />
      </SectionCard>
      <SectionCard
        title={`Despesas recorrentes de ${selectedMonthLabel}`}
        subtitle={`Total recorrente do mês: ${formatCurrency(dashboard.recurringTotal)}. Toque em PG para marcar pagamento.`}
      >
        {dashboard.recurringTransactions.length ? (
          dashboard.recurringTransactions.map((transaction) => (
            <TransactionRow key={transaction.id} transaction={transaction} onTogglePaid={() => void handleTogglePaid(transaction)} />
          ))
        ) : (
          <Text>Nenhuma despesa recorrente ativa.</Text>
        )}
      </SectionCard>
      <SectionCard
        title={`Despesas lançadas em ${selectedMonthLabel}`}
        subtitle="Todas as despesas cadastradas do mês aparecem aqui. Receitas ficam fora dessa lista e o botão PG continua indicando pagamento."
      >
        {expenseTransactions.length ? (
          <>
            {Platform.OS === "web" ? createElement("style", {}, EXPENSE_SCROLLBAR_CSS) : null}
            <ScrollView
              contentContainerStyle={styles.expenseScrollContent}
              indicatorStyle="white"
              nativeID="launched-expenses-scroll"
              nestedScrollEnabled
              showsVerticalScrollIndicator
              style={[styles.expenseScroll, Platform.OS === "web" ? (expenseScrollWebStyle as any) : null]}
              testID="launched-expenses-scroll"
            >
              {expenseTransactions.map((transaction) => (
                <TransactionRow
                  key={transaction.id}
                  onDelete={() => void handleDeleteTransaction(transaction.id)}
                  onEdit={() => handleEditTransaction(transaction)}
                  transaction={transaction}
                  onTogglePaid={() => void handleTogglePaid(transaction)}
                />
              ))}
            </ScrollView>
          </>
        ) : (
          <Text>Sem despesas cadastradas.</Text>
        )}
      </SectionCard>
      <SectionCard title={`Insights de ${selectedMonthLabel}`} subtitle="Leituras rápidas do seu comportamento financeiro no mês selecionado.">
        {insights.map((insight) => (
          <Text key={insight}>{insight}</Text>
        ))}
      </SectionCard>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  calendarTrigger: {
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  calendarLabel: {
    fontSize: 11
  },
  calendarValue: {
    fontSize: 16,
    fontWeight: "700"
  },
  calendarAction: {
    fontSize: 12,
    fontWeight: "700"
  },
  calendarPanel: {
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
    marginTop: spacing.sm,
    borderWidth: 1,
    borderRadius: 16,
    padding: spacing.sm + 2,
    gap: spacing.sm
  },
  yearRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm
  },
  yearButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs
  },
  yearValue: {
    fontSize: 16,
    fontWeight: "700"
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: spacing.xs + 2,
    columnGap: spacing.xs + 2
  },
  monthTile: {
    flexBasis: "31%",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs + 2,
    alignItems: "center"
  },
  monthTileText: {
    fontSize: 11,
    fontWeight: "600"
  },
  expenseScroll: {
    maxHeight: 340,
    paddingRight: 2
  },
  expenseScrollContent: {
    paddingRight: 2
  }
});
