import { useWindowDimensions } from "react-native";
import { spacing } from "@/theme/tokens";

export function useResponsiveLayout() {
  const { width } = useWindowDimensions();
  const isNarrow = width < 360;
  const isCompact = width < 390;
  const isTablet = width >= 768;

  return {
    width,
    isNarrow,
    isCompact,
    isTablet,
    horizontalPadding: isNarrow ? spacing.sm : spacing.md,
    verticalPadding: isCompact ? spacing.md : spacing.lg,
    cardPadding: isCompact ? spacing.sm + 2 : spacing.md,
    contentMaxWidth: isTablet ? 720 : 560
  };
}
