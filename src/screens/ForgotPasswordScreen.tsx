import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput } from "react-native";
import { ScreenShell } from "@/components/ScreenShell";
import { SectionCard } from "@/components/SectionCard";
import { useAppTheme } from "@/context/ThemeContext";
import { authService, mapAuthError } from "@/services/authService";
import { radii, spacing } from "@/theme/tokens";

type Props = {
  navigation: {
    goBack: () => void;
  };
  route?: unknown;
};

export function ForgotPasswordScreen({ navigation }: Props) {
  const { theme } = useAppTheme();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  async function handleReset() {
    try {
      await authService.resetPassword(email);
      setMessage("Enviamos o email de recuperação.");
    } catch (error) {
      setMessage(mapAuthError(error));
    }
  }

  return (
    <ScreenShell>
      <SectionCard title="Recuperar senha" subtitle="Você recebe um link para redefinir o acesso.">
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
        {message ? <Text style={[styles.message, { color: theme.colors.textMuted }]}>{message}</Text> : null}
        <Pressable onPress={handleReset} style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]}>
          <Text style={styles.primaryLabel}>Enviar recuperação</Text>
        </Pressable>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={[styles.link, { color: theme.colors.primary }]}>Voltar</Text>
        </Pressable>
      </SectionCard>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
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
  message: {
    fontSize: 13
  }
});
