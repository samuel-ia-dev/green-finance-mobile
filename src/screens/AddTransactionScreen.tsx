import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { ScreenShell } from "@/components/ScreenShell";
import { SectionCard } from "@/components/SectionCard";
import { useAuthSession } from "@/context/AuthSessionContext";
import { useAppTheme } from "@/context/ThemeContext";
import { firestoreService } from "@/services/firestoreService";
import { useFinanceStore } from "@/store/useFinanceStore";
import { TransactionType } from "@/types/finance";
import { suggestCategory } from "@/utils/categorySuggestion";
import { getMonthKey, parseCurrencyInput } from "@/utils/format";
import { resolveRecurringEndDate } from "@/utils/recurring";
import { radii, spacing } from "@/theme/tokens";

// Para expandir categorias, altere a lista base abaixo e a semente em firestoreService.ensureDefaultCategories.
const builtInCategories = ["Alimentação", "Transporte", "Moradia", "Saúde", "Educação", "Lazer", "Investimentos", "Outros"];

export function AddTransactionScreen() {
  const { theme } = useAppTheme();
  const { user } = useAuthSession();
  const history = useFinanceStore((state) => state.transactions);
  const editingTransaction = useFinanceStore((state) => state.editingTransaction);
  const addTransaction = useFinanceStore((state) => state.addTransaction);
  const updateTransactionLocal = useFinanceStore((state) => state.updateTransactionLocal);
  const clearEditingTransaction = useFinanceStore((state) => state.clearEditingTransaction);
  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [categoryName, setCategoryName] = useState("Outros");
  const [date, setDate] = useState(`${getMonthKey()}-10`);
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState<"weekly" | "monthly" | "yearly">("monthly");
  const [endDate, setEndDate] = useState("");

  const suggestedCategory = useMemo(() => suggestCategory(description, history), [description, history]);

  function resetForm() {
    setType("expense");
    setAmount("");
    setDescription("");
    setCategoryName("Outros");
    setDate(`${getMonthKey()}-10`);
    setIsRecurring(false);
    setFrequency("monthly");
    setEndDate("");
  }

  useEffect(() => {
    if (!editingTransaction) {
      return;
    }

    setType(editingTransaction.type);
    setAmount(`${editingTransaction.amount}`);
    setDescription(editingTransaction.description);
    setCategoryName(editingTransaction.categoryName);
    setDate(editingTransaction.date);
    setIsRecurring(Boolean(editingTransaction.isRecurring));
    setFrequency(editingTransaction.recurringFrequency ?? "monthly");
    setEndDate(editingTransaction.recurringEndDate ?? "");
  }, [editingTransaction]);

  async function handleSave() {
    if (!user?.uid) {
      return;
    }

    const resolvedRecurringEndDate = type === "expense" && isRecurring ? resolveRecurringEndDate(date, endDate || undefined) : undefined;

    const payload = {
      userId: user.uid,
      type,
      amount: parseCurrencyInput(amount),
      categoryId: categoryName.toLowerCase(),
      categoryName,
      description,
      date,
      isRecurring: type === "expense" ? isRecurring : false,
      isPaid: type === "expense" ? editingTransaction?.isPaid ?? false : undefined,
      recurringFrequency: type === "expense" && isRecurring ? frequency : undefined,
      recurringStartDate: type === "expense" && isRecurring ? date : undefined,
      recurringEndDate: resolvedRecurringEndDate
    } as const;

    if (editingTransaction) {
      await firestoreService.updateTransaction(editingTransaction.id, payload);
      updateTransactionLocal(editingTransaction.id, {
        ...payload,
        updatedAt: new Date().toISOString()
      });
      clearEditingTransaction();
      resetForm();
      return;
    }

    const id = await firestoreService.createTransaction(payload);
    addTransaction({
      id,
      ...payload,
      createdAt: date,
      updatedAt: date
    });
    resetForm();
  }

  return (
    <ScreenShell>
      <SectionCard title={editingTransaction ? "Editar transação" : "Nova transação"} subtitle={`Sugestão automática: ${suggestedCategory}`}>
        <View style={styles.row}>
          <Pressable onPress={() => setType("income")}>
            <Text style={{ color: type === "income" ? theme.colors.primary : theme.colors.textMuted }}>Receita</Text>
          </Pressable>
          <Pressable onPress={() => setType("expense")}>
            <Text style={{ color: type === "expense" ? theme.colors.primary : theme.colors.textMuted }}>Despesa</Text>
          </Pressable>
        </View>
        <TextInput
          placeholder="Valor"
          value={amount}
          onChangeText={setAmount}
          style={[styles.input, { backgroundColor: theme.colors.cardAlt, borderColor: theme.colors.borderSoft, color: theme.colors.text }]}
          placeholderTextColor={theme.colors.textMuted}
        />
        <TextInput
          placeholder="Descrição"
          value={description}
          onChangeText={setDescription}
          style={[styles.input, { backgroundColor: theme.colors.cardAlt, borderColor: theme.colors.borderSoft, color: theme.colors.text }]}
          placeholderTextColor={theme.colors.textMuted}
        />
        <Text style={{ color: theme.colors.textMuted }}>Categoria</Text>
        <View style={styles.categoryWrap}>
          {builtInCategories.map((category) => (
            <Pressable key={category} onPress={() => setCategoryName(category)} style={[styles.chip, { borderColor: categoryName === category ? theme.colors.primary : theme.colors.borderSoft }]}>
              <Text style={{ color: theme.colors.text }}>{category}</Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          placeholder="Data (YYYY-MM-DD)"
          value={date}
          onChangeText={setDate}
          style={[styles.input, { backgroundColor: theme.colors.cardAlt, borderColor: theme.colors.borderSoft, color: theme.colors.text }]}
          placeholderTextColor={theme.colors.textMuted}
        />

        {type === "expense" ? (
          <Pressable style={styles.switchRow} onPress={() => setIsRecurring((value) => !value)}>
            <Text style={{ color: theme.colors.text }}>Marcar recorrente</Text>
            <Switch value={isRecurring} onValueChange={setIsRecurring} accessibilityRole="switch" />
          </Pressable>
        ) : null}

        {type === "expense" && isRecurring ? (
          <>
            <Text style={{ color: theme.colors.text }}>Frequência</Text>
            <View style={styles.row}>
              <Pressable onPress={() => setFrequency("weekly")}><Text style={{ color: frequency === "weekly" ? theme.colors.primary : theme.colors.textMuted }}>Semanal</Text></Pressable>
              <Pressable onPress={() => setFrequency("monthly")}><Text style={{ color: frequency === "monthly" ? theme.colors.primary : theme.colors.textMuted }}>Mensal</Text></Pressable>
              <Pressable onPress={() => setFrequency("yearly")}><Text style={{ color: frequency === "yearly" ? theme.colors.primary : theme.colors.textMuted }}>Anual</Text></Pressable>
            </View>
            <Text style={{ color: theme.colors.text }}>Data de início</Text>
            <TextInput
              placeholder="Data de início"
              value={date}
              onChangeText={setDate}
              style={[styles.input, { backgroundColor: theme.colors.cardAlt, borderColor: theme.colors.borderSoft, color: theme.colors.text }]}
              placeholderTextColor={theme.colors.textMuted}
            />
            <TextInput
              placeholder="Data final (opcional)"
              value={endDate}
              onChangeText={setEndDate}
              style={[styles.input, { backgroundColor: theme.colors.cardAlt, borderColor: theme.colors.borderSoft, color: theme.colors.text }]}
              placeholderTextColor={theme.colors.textMuted}
            />
          </>
        ) : null}

        <View style={styles.actions}>
          {editingTransaction ? (
            <Pressable onPress={() => {
              clearEditingTransaction();
              resetForm();
            }} style={[styles.secondaryButton, { borderColor: theme.colors.borderSoft }]}>
              <Text style={[styles.secondaryButtonLabel, { color: theme.colors.text }]}>Cancelar edição</Text>
            </Pressable>
          ) : null}
          <Pressable onPress={handleSave} style={[styles.button, { backgroundColor: theme.colors.primary }]}>
            <Text style={styles.buttonLabel}>{editingTransaction ? "Salvar alterações" : "Salvar transação"}</Text>
          </Pressable>
        </View>
      </SectionCard>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: spacing.md
  },
  input: {
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md
  },
  categoryWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  chip: {
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  actions: {
    gap: spacing.sm
  },
  button: {
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: "center"
  },
  secondaryButton: {
    alignItems: "center",
    borderRadius: radii.md,
    borderWidth: 1,
    paddingVertical: spacing.md
  },
  buttonLabel: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700"
  },
  secondaryButtonLabel: {
    fontSize: 15,
    fontWeight: "600"
  }
});
