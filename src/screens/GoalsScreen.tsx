import { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, TextInput } from "react-native";
import { GoalCard } from "@/components/GoalCard";
import { ScreenShell } from "@/components/ScreenShell";
import { SectionCard } from "@/components/SectionCard";
import { useAuthSession } from "@/context/AuthSessionContext";
import { useAppTheme } from "@/context/ThemeContext";
import { firestoreService } from "@/services/firestoreService";
import { useFinanceStore } from "@/store/useFinanceStore";
import { getMonthKey } from "@/utils/format";
import { radii, spacing } from "@/theme/tokens";

export function GoalsScreen() {
  const { theme } = useAppTheme();
  const { user } = useAuthSession();
  const goals = useFinanceStore((state) => state.dashboard.goalProgress);
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [deadline, setDeadline] = useState(`${getMonthKey()}-30`);

  async function handleCreateGoal() {
    if (!user?.uid || !name || !targetAmount) {
      return;
    }
    await firestoreService.createGoal({
      userId: user.uid,
      name,
      targetAmount: Number(targetAmount),
      currentAmount: 0,
      deadline
    });
    setName("");
    setTargetAmount("");
  }

  return (
    <ScreenShell>
      <SectionCard title="Metas financeiras" subtitle="Acompanhe reserva, viagem, carro e outros objetivos.">
        <TextInput
          placeholder="Nome da meta"
          value={name}
          onChangeText={setName}
          style={[styles.input, { backgroundColor: theme.colors.cardAlt, borderColor: theme.colors.borderSoft, color: theme.colors.text }]}
          placeholderTextColor={theme.colors.textMuted}
        />
        <TextInput
          placeholder="Valor alvo"
          value={targetAmount}
          onChangeText={setTargetAmount}
          keyboardType={Platform.select({ android: "numeric", ios: "decimal-pad", default: "numeric" })}
          style={[styles.input, { backgroundColor: theme.colors.cardAlt, borderColor: theme.colors.borderSoft, color: theme.colors.text }]}
          placeholderTextColor={theme.colors.textMuted}
        />
        <TextInput
          placeholder="Prazo (YYYY-MM-DD)"
          value={deadline}
          onChangeText={setDeadline}
          style={[styles.input, { backgroundColor: theme.colors.cardAlt, borderColor: theme.colors.borderSoft, color: theme.colors.text }]}
          placeholderTextColor={theme.colors.textMuted}
        />
        <Pressable onPress={handleCreateGoal} style={[styles.button, { backgroundColor: theme.colors.primary }]}>
          <Text style={styles.buttonLabel}>Criar meta</Text>
        </Pressable>
      </SectionCard>
      <SectionCard title="Progresso" subtitle="Atualização fácil do valor atual.">
        {goals.length ? goals.map((goal) => <GoalCard key={goal.id} goal={goal} />) : <Text>Sem metas criadas.</Text>}
      </SectionCard>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md
  },
  button: {
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: "center"
  },
  buttonLabel: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700"
  }
});
