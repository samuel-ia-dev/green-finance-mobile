import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ScreenShell } from "@/components/ScreenShell";
import { SectionCard } from "@/components/SectionCard";
import { TransactionRow } from "@/components/TransactionRow";
import { useAppTheme } from "@/context/ThemeContext";
import { firestoreService } from "@/services/firestoreService";
import { useFinanceStore } from "@/store/useFinanceStore";
import { formatMonthChip, getMonthKey, shiftMonthKey } from "@/utils/format";
import { filterTransactions } from "@/utils/historyFilters";
import { spacing } from "@/theme/tokens";

export function HistoryScreen() {
  const { theme } = useAppTheme();
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
      <SectionCard title="Histórico" subtitle="Filtre por mês, acompanhe os meses seguintes e toque em PG para controlar contas pagas.">
        <View style={styles.filters}>
          <Pressable onPress={() => setType(undefined)}>
            <Text style={{ color: theme.colors.textMuted }}>Todos</Text>
          </Pressable>
          <Pressable onPress={() => setType("income")}>
            <Text style={{ color: theme.colors.textMuted }}>Receita</Text>
          </Pressable>
          <Pressable onPress={() => setType("expense")}>
            <Text style={{ color: theme.colors.text }}>Despesa</Text>
          </Pressable>
        </View>
        <View style={styles.filters}>
          <Pressable onPress={() => setMonth(undefined)}>
            <Text style={{ color: month ? theme.colors.textMuted : theme.colors.primary }}>Tudo</Text>
          </Pressable>
          {monthOptions.map((monthKey) => (
            <Pressable key={monthKey} onPress={() => setMonth(monthKey)}>
              <Text style={{ color: month === monthKey ? theme.colors.primary : theme.colors.textMuted }}>{formatMonthChip(monthKey)}</Text>
            </Pressable>
          ))}
        </View>
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
    flexDirection: "row",
    gap: spacing.md
  }
});
