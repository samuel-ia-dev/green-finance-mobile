import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { ScreenShell } from "@/components/ScreenShell";
import { SectionCard } from "@/components/SectionCard";
import { useAuthSession } from "@/context/AuthSessionContext";
import { useAppTheme } from "@/context/ThemeContext";
import { authService } from "@/services/authService";
import { exportService } from "@/services/exportService";
import { useFinanceStore } from "@/store/useFinanceStore";
import { getMonthKey } from "@/utils/format";
import { spacing } from "@/theme/tokens";

export function SettingsScreen() {
  const { user } = useAuthSession();
  const { isDark, toggleTheme, theme } = useAppTheme();
  const transactions = useFinanceStore((state) => state.transactions);
  const currentMonth = getMonthKey();
  const monthlyTransactions = useMemo(
    () => transactions.filter((transaction) => transaction.date.startsWith(currentMonth)),
    [currentMonth, transactions]
  );

  async function handleExportCsv() {
    await exportService.exportCsv(monthlyTransactions, currentMonth);
  }

  async function handleExportPdf() {
    await exportService.exportPdf(monthlyTransactions, currentMonth);
  }

  return (
    <ScreenShell scrollable={false}>
      <View style={styles.screen}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <SectionCard title="Configurações" subtitle="Perfil, tema e exportações.">
            <Text style={{ color: theme.colors.text }}>Perfil do usuário</Text>
            <Text style={{ color: theme.colors.textMuted }}>{user?.email ?? "Usuário local"}</Text>
          </SectionCard>
          <SectionCard title="Preferências" subtitle="Troque entre tema claro e escuro sem reiniciar o app.">
            <View style={styles.switchRow}>
              <Text style={{ color: theme.colors.text }}>Modo escuro</Text>
              <Switch value={isDark} onValueChange={toggleTheme} accessibilityRole="switch" />
            </View>
          </SectionCard>
          <SectionCard title="Exportação" subtitle="Exporte os lançamentos financeiros do mês atual em CSV ou em relatório para PDF.">
            <Pressable onPress={handleExportCsv}>
              <Text style={{ color: theme.colors.primary }}>Exportar CSV</Text>
            </Pressable>
            <Pressable onPress={handleExportPdf}>
              <Text style={{ color: theme.colors.primary }}>Exportar PDF</Text>
            </Pressable>
          </SectionCard>
        </ScrollView>

        <View style={[styles.footer, { backgroundColor: theme.colors.background, borderTopColor: theme.colors.borderSoft }]}>
          <Pressable accessibilityRole="button" onPress={() => authService.logout()} style={[styles.logoutButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.warning }]}>
            <Text style={[styles.logoutLabel, { color: theme.colors.warning }]}>Sair</Text>
          </Pressable>
        </View>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1
  },
  content: {
    gap: spacing.sm,
    paddingBottom: spacing.md
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.md
  },
  footer: {
    borderTopWidth: 1,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs
  },
  logoutButton: {
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 52,
    justifyContent: "center"
  },
  logoutLabel: {
    fontSize: 15,
    fontWeight: "700"
  }
});
