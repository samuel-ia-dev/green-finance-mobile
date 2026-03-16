import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenShell } from "@/components/ScreenShell";
import { SectionCard } from "@/components/SectionCard";
import { useAuthSession } from "@/context/AuthSessionContext";
import { useAppTheme } from "@/context/ThemeContext";
import { authService } from "@/services/authService";
import { biometricAuthService, BiometricStatus } from "@/services/biometricAuthService";
import { exportService } from "@/services/exportService";
import { useFinanceStore } from "@/store/useFinanceStore";
import { getMonthKey } from "@/utils/format";
import { spacing } from "@/theme/tokens";

export function SettingsScreen() {
  const { user } = useAuthSession();
  const { isDark, toggleTheme, theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const transactions = useFinanceStore((state) => state.transactions);
  const [biometricStatus, setBiometricStatus] = useState<BiometricStatus>({
    isAvailable: false,
    isEnabled: false,
    label: "biometria"
  });
  const currentMonth = getMonthKey();
  const monthlyTransactions = useMemo(
    () => transactions.filter((transaction) => transaction.date.startsWith(currentMonth)),
    [currentMonth, transactions]
  );

  useEffect(() => {
    let isMounted = true;

    async function loadBiometricStatus() {
      const status = await biometricAuthService.getStatus();

      if (!isMounted) {
        return;
      }

      setBiometricStatus(status);
    }

    void loadBiometricStatus();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleExportCsv() {
    await exportService.exportCsv(monthlyTransactions, currentMonth);
  }

  async function handleExportPdf() {
    await exportService.exportPdf(monthlyTransactions, currentMonth);
  }

  async function handleDisableBiometric() {
    await biometricAuthService.clearCredentials();
    setBiometricStatus((current) => ({
      ...current,
      isEnabled: false
    }));
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
          <SectionCard title="Segurança" subtitle="Use biometria para entrar mais rápido neste aparelho.">
            <Text style={{ color: theme.colors.text }}>
              {biometricStatus.isEnabled
                ? `Acesso com ${biometricStatus.label} ativo neste aparelho.`
                : biometricStatus.isAvailable
                  ? "Entre com email e senha uma vez para ativar a biometria."
                  : "Biometria indisponível neste aparelho."}
            </Text>
            {biometricStatus.isEnabled ? (
              <Pressable onPress={handleDisableBiometric}>
                <Text style={{ color: theme.colors.primary }}>Desativar biometria</Text>
              </Pressable>
            ) : null}
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

        <View style={[styles.footer, { backgroundColor: theme.colors.background, borderTopColor: theme.colors.borderSoft, paddingBottom: Math.max(insets.bottom, spacing.xs) }]}>
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
