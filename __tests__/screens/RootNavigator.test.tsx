import { fireEvent, render } from "@testing-library/react-native";
import { NavigationContainer } from "@react-navigation/native";
import { RootNavigator } from "@/navigation/RootNavigator";

const mockUseAuthSession = jest.fn();

jest.mock("@/context/AuthSessionContext", () => ({
  useAuthSession: () => mockUseAuthSession()
}));

jest.mock("@/context/ThemeContext", () => ({
  useAppTheme: () => ({
    isDark: false,
    theme: {
      colors: {
        card: "#111827",
        text: "#FFFFFF",
        background: "#020617",
        primary: "#16A34A",
        textMuted: "#94A3B8",
        borderSoft: "#1E293B"
      }
    }
  })
}));

jest.mock("@/services/firebase", () => ({
  isFirebaseConfigured: false
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: ({ name }: { name: string }) => {
    const React = require("react");
    const { Text } = require("react-native");
    return React.createElement(Text, null, name);
  }
}));

jest.mock("@/screens/HomeScreen", () => ({
  HomeScreen: () => {
    const { Text } = require("react-native");
    return <Text>home screen</Text>;
  }
}));

jest.mock("@/screens/HistoryScreen", () => ({
  HistoryScreen: () => {
    const { Text } = require("react-native");
    return <Text>history screen</Text>;
  }
}));

jest.mock("@/screens/AddTransactionScreen", () => ({
  AddTransactionScreen: () => {
    const { Text } = require("react-native");
    return <Text>add screen</Text>;
  }
}));

jest.mock("@/screens/GoalsScreen", () => ({
  GoalsScreen: () => {
    const { Text } = require("react-native");
    return <Text>goals screen</Text>;
  }
}));

jest.mock("@/screens/SettingsScreen", () => ({
  SettingsScreen: () => {
    const { Text } = require("react-native");
    return <Text>settings screen</Text>;
  }
}));

jest.mock("@/screens/LoginScreen", () => ({
  LoginScreen: () => {
    const { Text } = require("react-native");
    return <Text>login screen</Text>;
  }
}));

jest.mock("@/screens/SignUpScreen", () => ({
  SignUpScreen: () => {
    const { Text } = require("react-native");
    return <Text>signup screen</Text>;
  }
}));

jest.mock("@/screens/ForgotPasswordScreen", () => ({
  ForgotPasswordScreen: () => {
    const { Text } = require("react-native");
    return <Text>forgot password screen</Text>;
  }
}));

jest.mock("@/screens/FirebaseSetupScreen", () => ({
  FirebaseSetupScreen: () => {
    const { Text } = require("react-native");
    return <Text>firebase setup screen</Text>;
  }
}));

describe("RootNavigator", () => {
  it("shows the login screen first when there is no authenticated user", () => {
    mockUseAuthSession.mockReturnValue({
      user: null
    });

    const screen = render(
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    );

    expect(screen.getByText("login screen")).toBeTruthy();
    expect(screen.queryByText("home screen")).toBeNull();
  });

  it("does not block the app with the firebase setup screen when firebase is not configured", () => {
    mockUseAuthSession.mockReturnValue({
      user: {
        uid: "local-demo-user",
        email: "demo@greenfinance.local"
      }
    });

    const screen = render(
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    );

    expect(screen.queryByText("firebase setup screen")).toBeNull();
    expect(screen.getByText("home screen")).toBeTruthy();
  });

  it("navigates to the add screen from the highlighted center tab", () => {
    mockUseAuthSession.mockReturnValue({
      user: {
        uid: "local-demo-user",
        email: "demo@greenfinance.local"
      }
    });

    const screen = render(
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    );

    fireEvent.press(screen.getByText("Adicionar"));

    expect(screen.getByText("add screen")).toBeTruthy();
  });
});
