import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { ScreenShell } from "@/components/ScreenShell";
import { SectionCard } from "@/components/SectionCard";
import { TransactionRow } from "@/components/TransactionRow";
import { useAppTheme } from "@/context/ThemeContext";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";
import { firestoreService } from "@/services/firestoreService";
import { useFinanceStore } from "@/store/useFinanceStore";
import { formatMonthChip, getMonthKey, shiftMonthKey } from "@/utils/format";
import { filterTransactions } from "@/utils/historyFilters";
import { radii, spacing } from "@/theme/tokens";

export function HistoryScreen() {
  const { theme } = useAppTheme();
  const { isCompact } = useResponsiveLayout();
  const transactions = useFinanceStore((state) => state.transactions);
  const removeTransaction = useFinanceStore((state) => state.removeTransaction);
  const updateTransactionLocal = useFinanceStore((state) => state.updateTransactionLocal);
  const currentMonth = getMonthKey();
  const [type, setType] = useState<"income" | "expense" | undefined>();
  const [month, setMonth] = useState<string | undefined>(currentMonth);

  const monthOptions = useMemo(() => {
    const futureMonths = Array.from({ length: 6 }, (_, index) => shiftMonthKey(currentMonth, index));
    const transactionMonths = transactions.map((transaction) => transaction.date.slice(0, 7));
    return Array.from(new Set([...futureMonths, ...transactionMonths])).sort();
  }, [currentMonth, transactions]);

  const filtered = useMemo(
    () =>
      filterTransactions(transactions, {
        month,
        type
      }),
    [month, transactions, type]
  );

  async function handleDeleteTransaction(id: string) {
    try {
      await firestoreService.deleteTransaction(id);
      removeTransaction(id);
    } catch {
      return;
    }
  }

  async function handleTogglePaid(id: string, isPaid: boolean) {
    try {
      await firestoreService.updateTransaction(id, { isPaid });
      updateTransactionLocal(id, {
        isPaid,
        updatedAt: new Date().toISOString()
      });
    } catch {
      return;
    }
  }

  return (
    <ScreenShell>
      <SectionCard title="Histórico" subtitle="Cada mês mostra só seus próprios lançamentos. Recorrências aparecem apenas nos meses em que foram geradas.">
        <ScrollView horizontal contentContainerStyle={styles.filters} showsHorizontalScrollIndicator={false}>
          <Pressable
            onPress={() => setType(undefined)}
            style={[styles.filterChip, { borderColor: type === undefined ? theme.colors.primary : theme.colors.borderSoft, backgroundColor: type === undefined ? theme.colors.cardAlt : "transparent" }]}
          >
            <Text style={[styles.filterChipLabel, { color: type === undefined ? theme.colors.primary : theme.colors.textMuted }]}>Todos</Text>
          </Pressable>
          <Pressable
            onPress={() => setType("income")}
            style={[styles.filterChip, { borderColor: type === "income" ? theme.colors.primary : theme.colors.borderSoft, backgroundColor: type === "income" ? theme.colors.cardAlt : "transparent" }]}
          >
            <Text style={[styles.filterChipLabel, { color: type === "income" ? theme.colors.primary : theme.colors.textMuted }]}>Receita</Text>
          </Pressable>
          <Pressable
            onPress={() => setType("expense")}
            style={[styles.filterChip, { borderColor: type === "expense" ? theme.colors.primary : theme.colors.borderSoft, backgroundColor: type === "expense" ? theme.colors.cardAlt : "transparent" }]}
          >
            <Text style={[styles.filterChipLabel, { color: type === "expense" ? theme.colors.primary : theme.colors.textMuted }]}>Despesa</Text>
          </Pressable>
        </ScrollView>
        <ScrollView horizontal contentContainerStyle={styles.filters} showsHorizontalScrollIndicator={false}>
          <Pressable
            onPress={() => setMonth(undefined)}
            style={[styles.filterChip, { borderColor: month ? theme.colors.borderSoft : theme.colors.primary, backgroundColor: month ? "transparent" : theme.colors.cardAlt }]}
          >
            <Text style={[styles.filterChipLabel, { color: month ? theme.colors.textMuted : theme.colors.primary }]}>Tudo</Text>
          </Pressable>
          {monthOptions.map((monthKey) => (
            <Pressable
              key={monthKey}
              onPress={() => setMonth(monthKey)}
              style={[styles.filterChip, { borderColor: month === monthKey ? theme.colors.primary : theme.colors.borderSoft, backgroundColor: month === monthKey ? theme.colors.cardAlt : "transparent" }]}
            >
              <Text style={[styles.filterChipLabel, isCompact && styles.filterChipLabelCompact, { color: month === monthKey ? theme.colors.primary : theme.colors.textMuted }]}>{formatMonthChip(monthKey)}</Text>
            </Pressable>
          ))}
        </ScrollView>
        {filtered.length ? (
          filtered.map((transaction) => (
            <TransactionRow
              key={transaction.id}
              transaction={transaction}
              onDelete={() => void handleDeleteTransaction(transaction.id)}
              onTogglePaid={transaction.type === "expense" ? () => void handleTogglePaid(transaction.id, !transaction.isPaid) : undefined}
            />
          ))
        ) : (
          <Text style={{ color: theme.colors.textMuted }}>Nenhuma transação encontrada para os filtros selecionados.</Text>
        )}
      </SectionCard>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  filters: {
    alignItems: "center",
    gap: spacing.sm,
    paddingRight: spacing.xs
  },
  filterChip: {
    borderRadius: radii.pill,
    borderWidth: 1,
    minHeight: 36,
    justifyContent: "center",
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs
  },
  filterChipLabel: {
    fontSize: 13,
    fontWeight: "600"
  },
  filterChipLabelCompact: {
    fontSize: 12
  }
});
