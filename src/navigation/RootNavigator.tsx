import type { ComponentProps } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { PlatformPressable } from "@react-navigation/elements";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthSession } from "@/context/AuthSessionContext";
import { useAppTheme } from "@/context/ThemeContext";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";
import { AddTransactionScreen } from "@/screens/AddTransactionScreen";
import { ForgotPasswordScreen } from "@/screens/ForgotPasswordScreen";
import { GoalsScreen } from "@/screens/GoalsScreen";
import { HistoryScreen } from "@/screens/HistoryScreen";
import { HomeScreen } from "@/screens/HomeScreen";
import { LoginScreen } from "@/screens/LoginScreen";
import { SettingsScreen } from "@/screens/SettingsScreen";
import { SignUpScreen } from "@/screens/SignUpScreen";
import { AppTabParamList, RootStackParamList } from "@/navigation/types";
import { radii } from "@/theme/tokens";

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<AppTabParamList>();

type TabRouteName = keyof AppTabParamList;

function AddTabButton({ compact, style, ...props }: ComponentProps<typeof PlatformPressable> & { compact: boolean }) {
  const { theme } = useAppTheme();

  return (
    <PlatformPressable
      {...props}
      style={[
        style,
        styles.addButton,
        compact && styles.addButtonCompact,
        {
          backgroundColor: theme.colors.primary,
          borderColor: theme.colors.card,
          shadowColor: theme.colors.primary
        }
      ]}
    />
  );
}

function TabBarIcon({
  color,
  focused,
  routeName,
  surfaceColor,
  outlineColor
}: {
  color: string;
  focused: boolean;
  routeName: TabRouteName;
  surfaceColor: string;
  outlineColor: string;
}) {
  if (routeName === "Add") {
    return (
      <View style={styles.iconCanvas}>
        <View style={[styles.plusVertical, styles.addGlyph]} />
        <View style={[styles.plusHorizontal, styles.addGlyph]} />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.iconShell,
        focused && {
          backgroundColor: surfaceColor,
          borderColor: outlineColor
        }
      ]}
    >
      <View style={styles.iconCanvas}>
        {routeName === "Home" ? (
          <>
            <View style={[styles.gridCell, styles.gridCellTopLeft, { borderColor: color }]} />
            <View style={[styles.gridCell, styles.gridCellTopRight, { borderColor: color }]} />
            <View style={[styles.gridCell, styles.gridCellBottomLeft, { borderColor: color }]} />
            <View style={[styles.gridCell, styles.gridCellBottomRight, { borderColor: color }]} />
          </>
        ) : null}
        {routeName === "History" ? (
          <>
            <View style={[styles.clockRing, { borderColor: color }]} />
            <View style={[styles.clockHandVertical, { backgroundColor: color }]} />
            <View style={[styles.clockHandDiagonal, { backgroundColor: color }]} />
            <View style={[styles.clockTickLeft, { backgroundColor: color }]} />
            <View style={[styles.clockTickRight, { backgroundColor: color }]} />
          </>
        ) : null}
        {routeName === "Goals" ? (
          <>
            <View style={[styles.goalOuter, { borderColor: color }]} />
            <View style={[styles.goalInner, { borderColor: color }]} />
            <View style={[styles.goalMarkerVertical, { backgroundColor: color }]} />
            <View style={[styles.goalMarkerHorizontal, { backgroundColor: color }]} />
          </>
        ) : null}
        {routeName === "Settings" ? (
          <>
            <View style={[styles.settingTrackTop, { backgroundColor: color }]} />
            <View style={[styles.settingTrackMiddle, { backgroundColor: color }]} />
            <View style={[styles.settingTrackBottom, { backgroundColor: color }]} />
            <View style={[styles.settingDotTop, { backgroundColor: color }]} />
            <View style={[styles.settingDotMiddle, { backgroundColor: color }]} />
            <View style={[styles.settingDotBottom, { backgroundColor: color }]} />
          </>
        ) : null}
      </View>
    </View>
  );
}

function AppTabs() {
  const { isDark, theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { isCompact } = useResponsiveLayout();
  const tabSurfaceColor = `${theme.colors.primary}${isDark ? "20" : "16"}`;
  const tabOutlineColor = `${theme.colors.primary}${isDark ? "40" : "24"}`;
  const tabBarBottomPadding = Math.max(insets.bottom, isCompact ? 10 : 14);
  const tabBarHeight = (isCompact ? 64 : 72) + tabBarBottomPadding;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: theme.colors.card,
          borderTopColor: theme.colors.borderSoft,
          borderTopWidth: 1,
          height: tabBarHeight,
          paddingTop: isCompact ? 4 : 6,
          paddingBottom: tabBarBottomPadding,
          paddingHorizontal: isCompact ? 6 : 8
        },
        tabBarItemStyle: {
          paddingTop: isCompact ? 0 : 2,
          paddingBottom: 0
        },
        tabBarLabelStyle: {
          fontSize: isCompact ? 10 : 11,
          fontWeight: "700",
          marginTop: 0
        },
        tabBarIconStyle: {
          marginBottom: isCompact ? 0 : 1
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarIcon: ({ color, focused }) => (
          <TabBarIcon
            color={color}
            focused={focused}
            outlineColor={tabOutlineColor}
            routeName={route.name}
            surfaceColor={tabSurfaceColor}
          />
        )
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: "Home" }} />
      <Tab.Screen name="History" component={HistoryScreen} options={{ title: "Histórico" }} />
      <Tab.Screen
        name="Add"
        component={AddTransactionScreen}
        options={{
          title: "Adicionar",
          tabBarButton: (props) => <AddTabButton compact={isCompact} {...props} />
        }}
      />
      <Tab.Screen name="Goals" component={GoalsScreen} options={{ title: "Metas" }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: "Configurações" }} />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  const { user } = useAuthSession();
  const { theme } = useAppTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.card
        },
        headerTintColor: theme.colors.text,
        contentStyle: {
          backgroundColor: theme.colors.background
        }
      }}
    >
      {user ? (
        <Stack.Screen name="AppTabs" component={AppTabs} options={{ headerShown: false }} />
      ) : (
        <>
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
          <Stack.Screen name="SignUp" component={SignUpScreen} options={{ title: "Cadastro" }} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ title: "Recuperar senha" }} />
        </>
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  addGlyph: {
    backgroundColor: "#FFFFFF"
  },
  addButton: {
    marginTop: -28,
    width: 68,
    height: 68,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    shadowOpacity: 0.32,
    shadowRadius: 18,
    shadowOffset: {
      width: 0,
      height: 10
    },
    elevation: 8
  },
  addButtonCompact: {
    height: 62,
    marginTop: -22,
    width: 62
  },
  clockHandDiagonal: {
    borderRadius: radii.pill,
    height: 7,
    left: 12,
    position: "absolute",
    top: 10,
    transform: [{ rotate: "-50deg" }],
    width: 2.4
  },
  clockHandVertical: {
    borderRadius: radii.pill,
    height: 5,
    left: 11,
    position: "absolute",
    top: 7,
    width: 2.4
  },
  clockRing: {
    borderRadius: radii.pill,
    borderWidth: 2.2,
    height: 16,
    left: 4,
    position: "absolute",
    top: 4,
    width: 16
  },
  clockTickLeft: {
    borderRadius: radii.pill,
    height: 2.2,
    left: 4,
    position: "absolute",
    top: 3,
    transform: [{ rotate: "-38deg" }],
    width: 5
  },
  clockTickRight: {
    borderRadius: radii.pill,
    height: 2.2,
    left: 15,
    position: "absolute",
    top: 3,
    transform: [{ rotate: "38deg" }],
    width: 5
  },
  goalInner: {
    borderRadius: radii.pill,
    borderWidth: 2.2,
    height: 8,
    left: 8,
    position: "absolute",
    top: 8,
    width: 8
  },
  goalMarkerHorizontal: {
    borderRadius: radii.pill,
    height: 2.4,
    left: 16,
    position: "absolute",
    top: 11,
    width: 4
  },
  goalMarkerVertical: {
    borderRadius: radii.pill,
    height: 4,
    left: 11,
    position: "absolute",
    top: 2,
    width: 2.4
  },
  goalOuter: {
    borderRadius: radii.pill,
    borderWidth: 2.2,
    height: 18,
    left: 3,
    position: "absolute",
    top: 3,
    width: 18
  },
  gridCell: {
    borderRadius: 3,
    borderWidth: 2.2,
    height: 7,
    position: "absolute",
    width: 7
  },
  gridCellBottomLeft: {
    left: 4,
    top: 13
  },
  gridCellBottomRight: {
    left: 13,
    top: 13
  },
  gridCellTopLeft: {
    left: 4,
    top: 4
  },
  gridCellTopRight: {
    left: 13,
    top: 4
  },
  iconCanvas: {
    height: 24,
    position: "relative",
    width: 24
  },
  iconShell: {
    alignItems: "center",
    borderColor: "transparent",
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  plusHorizontal: {
    borderRadius: radii.pill,
    height: 3.2,
    left: 4,
    position: "absolute",
    top: 10.4,
    width: 16
  },
  plusVertical: {
    borderRadius: radii.pill,
    height: 16,
    left: 10.4,
    position: "absolute",
    top: 4,
    width: 3.2
  },
  settingDotBottom: {
    borderRadius: radii.pill,
    height: 6,
    left: 9,
    position: "absolute",
    top: 14,
    width: 6
  },
  settingDotMiddle: {
    borderRadius: radii.pill,
    height: 6,
    left: 13,
    position: "absolute",
    top: 9,
    width: 6
  },
  settingDotTop: {
    borderRadius: radii.pill,
    height: 6,
    left: 6,
    position: "absolute",
    top: 4,
    width: 6
  },
  settingTrackBottom: {
    borderRadius: radii.pill,
    height: 2.2,
    left: 4,
    position: "absolute",
    top: 16,
    width: 16
  },
  settingTrackMiddle: {
    borderRadius: radii.pill,
    height: 2.2,
    left: 4,
    position: "absolute",
    top: 11,
    width: 16
  },
  settingTrackTop: {
    borderRadius: radii.pill,
    height: 2.2,
    left: 4,
    position: "absolute",
    top: 6,
    width: 16
  }
});
