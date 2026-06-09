import { useEffect, useState } from "react";
import { Image, Platform, Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { ScreenShell } from "@/components/ScreenShell";
import { useAppTheme } from "@/context/ThemeContext";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";
import { authService, mapAuthError } from "@/services/authService";
import { biometricAuthService } from "@/services/biometricAuthService";
import { savedAccessService } from "@/services/savedAccessService";
import { radii, spacing } from "@/theme/tokens";

type Props = {
  navigation: {
    navigate: (screen: "SignUp" | "ForgotPassword") => void;
  };
  route?: unknown;
};

export function LoginScreen({ navigation }: Props) {
  const { theme } = useAppTheme();
  const { isCompact, isNarrow } = useResponsiveLayout();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState("biometria");
  const [saveAccessEnabled, setSaveAccessEnabled] = useState(true);
  const errorBackground = theme.dark ? "rgba(183, 245, 59, 0.12)" : "#F4FFE4";

  useEffect(() => {
    let isMounted = true;

    async function loadAccessOptions() {
      const [status, savedAccessEnabledValue] = await Promise.all([
        biometricAuthService.getStatus(),
        savedAccessService.isEnabled()
      ]);

      if (!isMounted) {
        return;
      }

      setBiometricEnabled(status.isEnabled);
      setBiometricLabel(status.label);
      setSaveAccessEnabled(savedAccessEnabledValue);
    }

    void loadAccessOptions();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleSaveAccessChange(nextValue: boolean) {
    setSaveAccessEnabled(nextValue);
    await savedAccessService.setEnabled(nextValue);
  }

  async function handleLogin() {
    const webBiometricRegistration =
      Platform.OS === "web" && !biometricAuthService.hasStoredWebCredential() && email.trim() && password.trim()
        ? biometricAuthService.rememberCredentials(email, password).catch(() => false)
        : null;

    try {
      setError("");
      await authService.login(email, password);
      if (saveAccessEnabled) {
        await savedAccessService.rememberCredentials(email, password).catch(() => false);
      } else {
        await savedAccessService.clearSavedAccess().catch(() => undefined);
      }
      if (webBiometricRegistration) {
        await webBiometricRegistration;
      } else {
        await biometricAuthService.rememberCredentials(email, password).catch(() => false);
      }
    } catch (currentError) {
      if (webBiometricRegistration) {
        await biometricAuthService.clearCredentials().catch(() => undefined);
      }
      setError(typeof mapAuthError === "function" ? mapAuthError(currentError) : "Email ou senha inválidos.");
    }
  }

  async function handleBiometricLogin() {
    try {
      setError("");
      await biometricAuthService.loginWithBiometrics();
    } catch (currentError) {
      setError(typeof mapAuthError === "function" ? mapAuthError(currentError) : "Não foi possível validar sua biometria.");
      const status = await biometricAuthService.getStatus();
      setBiometricEnabled(status.isEnabled);
      setBiometricLabel(status.label);
    }
  }

  return (
    <ScreenShell style={styles.screen}>
      <View style={styles.layout}>
        <LinearGradient colors={[theme.colors.heroStart, theme.colors.heroEnd]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.hero, isCompact && styles.heroCompact]}>
          <View style={styles.heroBrandRow}>
            <Image
              source={require("../../assets/icon.png")}
              accessibilityLabel="Green Finance icon"
              style={[styles.heroIcon, isCompact && styles.heroIconCompact]}
            />
          </View>
          <View style={styles.heroBadge}>
            <View style={styles.heroBadgeDot} />
            <Text style={styles.heroBadgeLabel}>Suas finanças na palma da mão</Text>
          </View>
          <Text style={[styles.heroTitle, isCompact && styles.heroTitleCompact]}>Seu dinheiro em ordem, com uma entrada mais elegante.</Text>
          <Text style={styles.heroSubtitle}>Acompanhe saldo, despesas, recorrências e metas em uma experiência mais clara desde o primeiro acesso.</Text>
          <View style={styles.heroMetrics}>
            <View style={[styles.metricCard, isNarrow && styles.metricCardFull]}>
              <Text style={styles.metricLabel}>Visão mensal</Text>
              <Text style={styles.metricValue}>Saldo e categorias</Text>
            </View>
            <View style={[styles.metricCard, isNarrow && styles.metricCardFull]}>
              <Text style={styles.metricLabel}>Rotina</Text>
              <Text style={styles.metricValue}>Recorrências sob controle</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={[styles.formCard, isCompact && styles.formCardCompact, { backgroundColor: theme.colors.card, borderColor: theme.colors.borderSoft, shadowColor: theme.colors.primary }]}>
          <Text style={[styles.formEyebrow, { color: theme.colors.primary }]}>Acesso seguro</Text>
          <Text style={[styles.formTitle, { color: theme.colors.text }]}>Acesse sua conta</Text>
          <Text style={[styles.formSubtitle, { color: theme.colors.textMuted }]}>Faça login para liberar o painel financeiro.</Text>

          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: theme.colors.text }]}>Email</Text>
            <TextInput
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              style={[styles.input, { backgroundColor: theme.colors.cardAlt, color: theme.colors.text, borderColor: theme.colors.borderSoft }]}
              placeholderTextColor={theme.colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: theme.colors.text }]}>Senha</Text>
            <TextInput
              placeholder="Senha"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              style={[styles.input, { backgroundColor: theme.colors.cardAlt, color: theme.colors.text, borderColor: theme.colors.borderSoft }]}
              placeholderTextColor={theme.colors.textMuted}
            />
          </View>

          <View style={[styles.preferenceCard, { backgroundColor: theme.colors.cardAlt, borderColor: theme.colors.borderSoft }]}>
            <View style={styles.switchRow}>
              <View style={styles.preferenceCopy}>
                <Text style={[styles.preferenceTitle, { color: theme.colors.text }]}>Salvar acesso</Text>
                <Text style={[styles.preferenceDescription, { color: theme.colors.textMuted }]}>Mantém esta conta conectada neste aparelho.</Text>
              </View>
              <Switch
                value={saveAccessEnabled}
                onValueChange={(nextValue) => void handleSaveAccessChange(nextValue)}
                accessibilityLabel="Salvar acesso"
              />
            </View>
            <Text style={[styles.preferenceHint, { color: theme.colors.textMuted }]}>
              Usando a mesma conta em outro celular, as despesas ficam sincronizadas.
            </Text>
          </View>

          {error ? (
            <View style={[styles.errorCard, { backgroundColor: errorBackground, borderColor: theme.colors.warning }]}>
              <Text style={[styles.error, { color: theme.colors.warning }]}>{error}</Text>
            </View>
          ) : null}

          <Pressable onPress={handleLogin} style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]}>
            <Text style={styles.primaryLabel}>Entrar</Text>
          </Pressable>

          {biometricEnabled ? (
            <Pressable onPress={handleBiometricLogin} style={[styles.secondaryButton, { borderColor: theme.colors.primary, backgroundColor: theme.colors.cardAlt }]}>
              <Text style={[styles.secondaryLabel, { color: theme.colors.primary }]}>Entrar com {biometricLabel}</Text>
            </Pressable>
          ) : null}

          <Pressable onPress={() => navigation.navigate("ForgotPassword")} style={styles.inlineAction}>
            <Text style={[styles.inlineActionLabel, { color: theme.colors.textMuted }]}>Esqueci minha senha</Text>
          </Pressable>

          <View style={[styles.divider, { backgroundColor: theme.colors.borderSoft }]} />

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: theme.colors.textMuted }]}>Primeiro acesso?</Text>
            <Pressable onPress={() => navigation.navigate("SignUp")}>
              <Text style={[styles.link, { color: theme.colors.primary }]}>Criar conta</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  screen: {
    justifyContent: "center"
  },
  layout: {
    gap: spacing.sm,
    marginHorizontal: "auto",
    maxWidth: 460,
    width: "100%"
  },
  hero: {
    borderRadius: radii.lg,
    gap: spacing.xs,
    overflow: "hidden",
    padding: spacing.lg
  },
  heroCompact: {
    padding: spacing.md
  },
  heroBrandRow: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 0
  },
  heroIcon: {
    borderRadius: radii.md,
    height: 50,
    width: 50
  },
  heroIconCompact: {
    height: 44,
    width: 44
  },
  heroBadge: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "rgba(7, 24, 17, 0.36)",
    borderColor: "rgba(183, 245, 59, 0.18)",
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5
  },
  heroBadgeDot: {
    backgroundColor: "#B7F53B",
    borderRadius: radii.pill,
    height: 7,
    width: 7
  },
  heroBadgeLabel: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700"
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 21,
    fontWeight: "800",
    lineHeight: 26,
    maxWidth: 260
  },
  heroTitleCompact: {
    fontSize: 19,
    lineHeight: 24
  },
  heroSubtitle: {
    color: "#D6E6DB",
    fontSize: 12,
    lineHeight: 17,
    maxWidth: 300
  },
  heroMetrics: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 0
  },
  metricCard: {
    backgroundColor: "rgba(10, 27, 20, 0.52)",
    borderColor: "rgba(183, 245, 59, 0.14)",
    borderRadius: radii.md,
    borderWidth: 1,
    flexGrow: 1,
    gap: 2,
    minWidth: 142,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 1
  },
  metricCardFull: {
    minWidth: "100%"
  },
  metricLabel: {
    color: "#B7F53B",
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase"
  },
  metricValue: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 15
  },
  formCard: {
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.xl,
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: {
      width: 0,
      height: 10
    }
  },
  formCardCompact: {
    padding: spacing.lg
  },
  formEyebrow: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase"
  },
  formTitle: {
    fontSize: 26,
    fontWeight: "800"
  },
  formSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: -4
  },
  fieldGroup: {
    gap: spacing.xs
  },
  switchRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between"
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "700"
  },
  preferenceCard: {
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  preferenceCopy: {
    flex: 1,
    gap: 2
  },
  preferenceTitle: {
    fontSize: 14,
    fontWeight: "700"
  },
  preferenceDescription: {
    fontSize: 12,
    lineHeight: 18
  },
  preferenceHint: {
    fontSize: 12,
    lineHeight: 18
  },
  input: {
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 16
  },
  errorCard: {
    borderRadius: radii.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  primaryButton: {
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: "center"
  },
  primaryLabel: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700"
  },
  secondaryButton: {
    alignItems: "center",
    borderRadius: radii.md,
    borderWidth: 1,
    paddingVertical: spacing.md
  },
  secondaryLabel: {
    fontSize: 15,
    fontWeight: "700"
  },
  inlineAction: {
    alignItems: "flex-end"
  },
  inlineActionLabel: {
    fontSize: 13,
    fontWeight: "600"
  },
  divider: {
    height: 1,
    marginVertical: 2,
    width: "100%"
  },
  footer: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
    justifyContent: "center"
  },
  footerText: {
    fontSize: 14
  },
  link: {
    fontSize: 14,
    fontWeight: "600"
  },
  error: {
    fontSize: 13,
    fontWeight: "600"
  }
});
