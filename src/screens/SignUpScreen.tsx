import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput } from "react-native";
import { ScreenShell } from "@/components/ScreenShell";
import { SectionCard } from "@/components/SectionCard";
import { useAppTheme } from "@/context/ThemeContext";
import { authService, mapAuthError } from "@/services/authService";
import { biometricAuthService } from "@/services/biometricAuthService";
import { radii, spacing } from "@/theme/tokens";

type Props = {
  navigation: {
    goBack: () => void;
  };
  route?: unknown;
};

export function SignUpScreen({ navigation }: Props) {
  const { theme } = useAppTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleRegister() {
    try {
      setError("");
      await authService.register(email, password);
      await biometricAuthService.rememberCredentials(email, password).catch(() => false);
    } catch (currentError) {
      setError(mapAuthError(currentError));
    }
  }

  return (
    <ScreenShell>
      <SectionCard title="Criar conta" subtitle="Configure seu acesso e sincronize seus dados com segurança.">
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
        <TextInput
          placeholder="Senha"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={[styles.input, { backgroundColor: theme.colors.cardAlt, color: theme.colors.text, borderColor: theme.colors.borderSoft }]}
          placeholderTextColor={theme.colors.textMuted}
        />
        {error ? <Text style={[styles.error, { color: theme.colors.warning }]}>{error}</Text> : null}
        <Pressable onPress={handleRegister} style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]}>
          <Text style={styles.primaryLabel}>Cadastrar</Text>
        </Pressable>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={[styles.link, { color: theme.colors.primary }]}>Voltar para login</Text>
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
  error: {
    fontSize: 13,
    fontWeight: "600"
  }
});
