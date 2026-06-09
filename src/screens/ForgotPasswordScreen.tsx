import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { ScreenShell } from "@/components/ScreenShell";
import { SectionCard } from "@/components/SectionCard";
import { useAppTheme } from "@/context/ThemeContext";
import { auth } from "@/services/firebase";
import { authService, mapAuthError } from "@/services/authService";
import { biometricAuthService } from "@/services/biometricAuthService";
import { radii, spacing } from "@/theme/tokens";

type Props = {
  navigation: {
    goBack: () => void;
  };
  route?: unknown;
};

export function ForgotPasswordScreen({ navigation }: Props) {
  const { theme } = useAppTheme();
  const supportsInAppReset = !auth;
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState("digital");

  useEffect(() => {
    let isMounted = true;

    async function loadBiometricStatus() {
      if (!supportsInAppReset) {
        return;
      }

      const status = await biometricAuthService.getStatus();

      if (!isMounted) {
        return;
      }

      setBiometricEnabled(status.isEnabled);
      setBiometricLabel(status.label);
    }

    void loadBiometricStatus();

    return () => {
      isMounted = false;
    };
  }, [supportsInAppReset]);

  async function handleReset() {
    try {
      setMessage("");

      if (supportsInAppReset) {
        const normalizedEmail = email.trim().toLowerCase();

        if (!normalizedEmail) {
          throw new Error("auth/missing-credentials");
        }

        if (newPassword !== confirmPassword) {
          throw new Error("auth/password-confirmation-mismatch");
        }

        if (!biometricEnabled) {
          throw new Error("auth/password-reset-requires-biometric");
        }

        const user = await biometricAuthService.loginWithBiometrics();
        const authenticatedEmail = String(user?.email ?? "").trim().toLowerCase();

        if (!authenticatedEmail || authenticatedEmail !== normalizedEmail) {
          throw new Error("auth/password-reset-email-mismatch");
        }

        await authService.updatePassword(newPassword);
        await biometricAuthService.rememberCredentials(normalizedEmail, newPassword).catch(() => false);
        setMessage("Senha redefinida. Volte para o login e entre com a nova senha.");
        return;
      }

      await authService.resetPassword(email);
      setMessage("Enviamos o email de recuperação.");
    } catch (error) {
      setMessage(mapAuthError(error));
    }
  }

  return (
    <ScreenShell>
      <SectionCard
        title="Recuperar senha"
        subtitle={supportsInAppReset ? "Redefina sua senha neste aparelho usando a digital já configurada." : "Você recebe um link para redefinir o acesso."}
      >
        <TextInput
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          style={[styles.input, { backgroundColor: theme.colors.cardAlt, color: theme.colors.text, borderColor: theme.colors.borderSoft }]}
          placeholderTextColor={theme.colors.textMuted}
        />
        {supportsInAppReset ? (
          <View style={styles.formStack}>
            <TextInput
              placeholder="Nova senha"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              style={[styles.input, { backgroundColor: theme.colors.cardAlt, color: theme.colors.text, borderColor: theme.colors.borderSoft }]}
              placeholderTextColor={theme.colors.textMuted}
            />
            <TextInput
              placeholder="Confirmar nova senha"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              style={[styles.input, { backgroundColor: theme.colors.cardAlt, color: theme.colors.text, borderColor: theme.colors.borderSoft }]}
              placeholderTextColor={theme.colors.textMuted}
            />
            <Text style={[styles.hint, { color: theme.colors.textMuted }]}>
              {biometricEnabled
                ? `Confirme com ${biometricLabel} para trocar a senha sem sair do app.`
                : "A redefinição no app fica disponível quando a digital já estiver ativada neste aparelho."}
            </Text>
          </View>
        ) : null}
        {message ? <Text style={[styles.message, { color: theme.colors.textMuted }]}>{message}</Text> : null}
        <Pressable onPress={handleReset} style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]}>
          <Text style={styles.primaryLabel}>{supportsInAppReset ? `Redefinir com ${biometricLabel}` : "Enviar recuperação"}</Text>
        </Pressable>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={[styles.link, { color: theme.colors.primary }]}>Voltar</Text>
        </Pressable>
      </SectionCard>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  formStack: {
    gap: spacing.sm
  },
  input: {
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 16
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
  link: {
    fontSize: 14,
    fontWeight: "600"
  },
  hint: {
    fontSize: 13,
    lineHeight: 18
  },
  message: {
    fontSize: 13
  }
});
