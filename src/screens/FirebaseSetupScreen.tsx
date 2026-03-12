import { StyleSheet, Text } from "react-native";
import { missingFirebaseKeys } from "@/services/firebase";
import { ScreenShell } from "@/components/ScreenShell";
import { SectionCard } from "@/components/SectionCard";
import { useAppTheme } from "@/context/ThemeContext";

export function FirebaseSetupScreen() {
  const { theme } = useAppTheme();

  return (
    <ScreenShell>
      <SectionCard title="Firebase Auth não configurado" subtitle="Preencha o arquivo .env antes de entrar no app.">
        {missingFirebaseKeys.map((key) => (
          <Text key={key} style={[styles.item, { color: theme.colors.textMuted }]}>{key}</Text>
        ))}
      </SectionCard>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  item: {
    fontSize: 14
  }
});
