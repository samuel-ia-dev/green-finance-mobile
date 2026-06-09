import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Transaction } from "@/types/finance";
import { formatCurrency, formatShortDate } from "@/utils/format";
import { useAppTheme } from "@/context/ThemeContext";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";
import { palette, radii, spacing } from "@/theme/tokens";

type TransactionRowProps = {
  transaction: Transaction;
  onEdit?: () => void;
  onDelete?: () => void;
  onTogglePaid?: () => void;
};

function PaymentFlagIcon({ isDark, isPaid }: { isDark: boolean; isPaid: boolean }) {
  const backgroundColor = isPaid ? palette.success : "rgba(34, 197, 94, 0.12)";
  const textColor = isPaid ? palette.white : isDark ? "#86EFAC" : palette.success;

  return (
    <View style={[styles.paymentFlag, { backgroundColor, borderColor: palette.success }]}>
      <Text style={[styles.paymentFlagLetter, { color: textColor }]}>P</Text>
      <Text style={[styles.paymentFlagLetter, { color: textColor }]}>G</Text>
    </View>
  );
}

type ActionButtonProps = {
  accessibilityLabel: string;
  backgroundColor: string;
  borderColor: string;
  compact: boolean;
  iconColor: string;
  iconName: "pencil" | "trash";
  label: string;
  onPress: () => void;
};

function ActionButton({ accessibilityLabel, backgroundColor, borderColor, compact, iconColor, iconName, label, onPress }: ActionButtonProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconAction,
        compact && styles.iconActionCompact,
        {
          backgroundColor,
          borderColor,
          opacity: pressed ? 0.78 : 1,
          transform: [{ scale: pressed ? 0.96 : 1 }]
        }
      ]}
    >
      <Ionicons color={iconColor} name={iconName} size={compact ? 15 : 16} />
      <Text style={[styles.iconActionLabel, compact && styles.iconActionLabelCompact, { color: iconColor }]}>{label}</Text>
    </Pressable>
  );
}

export function TransactionRow({ transaction, onEdit, onDelete, onTogglePaid }: TransactionRowProps) {
  const { isDark, theme } = useAppTheme();
  const { isCompact } = useResponsiveLayout();
  const editActionBackground = isDark ? "rgba(34, 197, 94, 0.18)" : "rgba(34, 197, 94, 0.12)";
  const deleteActionBackground = isDark ? "rgba(239, 68, 68, 0.18)" : "rgba(239, 68, 68, 0.1)";
  const actionBorder = isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(11, 16, 32, 0.08)";
  const isExpense = transaction.type === "expense";
  const isPaid = Boolean(transaction.isPaid);
  const amountColor = transaction.type === "income" ? theme.colors.success : isPaid ? theme.colors.success : theme.colors.text;

  return (
    <View style={[styles.row, isCompact && styles.rowCompact, { borderBottomColor: theme.colors.borderSoft }]}>
      <View style={[styles.textBlock, isCompact && styles.textBlockCompact]}>
        <View style={styles.titleRow}>
          <Text numberOfLines={2} style={[styles.title, { color: theme.colors.text }]}>{transaction.description}</Text>
          {transaction.isRecurring ? <Text style={styles.recurrent}>🔁</Text> : null}
        </View>
        <Text numberOfLines={1} style={[styles.caption, { color: theme.colors.textMuted }]}>{transaction.categoryName}</Text>
      </View>
      <View style={[styles.side, isCompact && styles.sideCompact]}>
        <View style={[styles.metaBlock, isCompact && styles.metaBlockCompact]}>
          <View style={styles.amountRow}>
            {isExpense ? (
              <Pressable
                accessibilityLabel={isPaid ? `Marcar ${transaction.description} como pendente` : `Marcar ${transaction.description} como paga`}
                accessibilityRole={onTogglePaid ? "button" : undefined}
                accessibilityState={{ selected: isPaid }}
                disabled={!onTogglePaid}
                hitSlop={8}
                onPress={onTogglePaid}
                style={({ pressed }) => [
                  styles.paymentToggle,
                  {
                    opacity: onTogglePaid && pressed ? 0.72 : 1
                  }
                ]}
              >
                <PaymentFlagIcon isDark={isDark} isPaid={isPaid} />
              </Pressable>
            ) : null}
            <Text numberOfLines={1} style={[styles.amount, { color: amountColor }]}>
              {transaction.type === "income" ? "+" : "-"} {formatCurrency(transaction.amount)}
            </Text>
          </View>
          <Text style={[styles.caption, { color: theme.colors.textMuted }]}>{formatShortDate(transaction.date)}</Text>
        </View>
        {(onEdit || onDelete) ? (
          <View style={styles.actions}>
            {onEdit ? (
              <ActionButton
                accessibilityLabel={`Editar ${transaction.description}`}
                backgroundColor={editActionBackground}
                borderColor={actionBorder}
                compact={isCompact}
                iconColor={theme.colors.primary}
                iconName="pencil"
                label="Editar"
                onPress={onEdit}
              />
            ) : null}
            {onDelete ? (
              <ActionButton
                accessibilityLabel={`Excluir ${transaction.description}`}
                backgroundColor={deleteActionBackground}
                borderColor={actionBorder}
                compact={isCompact}
                iconColor={palette.danger}
                iconName="trash"
                label="Excluir"
                onPress={onDelete}
              />
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.xs + 2,
    borderBottomWidth: StyleSheet.hairlineWidth
  },
  rowCompact: {
    alignItems: "flex-start",
    flexDirection: "column",
    gap: spacing.xs
  },
  textBlock: {
    flex: 1,
    gap: 4
  },
  textBlockCompact: {
    width: "100%"
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4
  },
  title: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: "600"
  },
  caption: {
    fontSize: 11
  },
  recurrent: {
    fontSize: 13
  },
  side: {
    alignItems: "flex-end",
    gap: 2
  },
  sideCompact: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
    width: "100%"
  },
  metaBlock: {
    alignItems: "flex-end",
    gap: 2
  },
  metaBlockCompact: {
    alignItems: "flex-start",
    flex: 1
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs
  },
  amount: {
    fontSize: 13,
    fontWeight: "700"
  },
  paymentToggle: {
    alignItems: "center",
    justifyContent: "center"
  },
  paymentFlag: {
    minWidth: 32,
    height: 18,
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 1
  },
  paymentFlagLetter: {
    fontSize: 9,
    fontWeight: "800",
    lineHeight: 9
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs
  },
  iconAction: {
    minWidth: 78,
    height: 36,
    borderRadius: radii.md,
    borderWidth: 1,
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    paddingHorizontal: spacing.sm
  },
  iconActionCompact: {
    minWidth: 72,
    height: 34,
    paddingHorizontal: spacing.xs + 2
  },
  iconActionLabel: {
    fontSize: 12,
    fontWeight: "700"
  },
  iconActionLabelCompact: {
    fontSize: 11
  }
});
