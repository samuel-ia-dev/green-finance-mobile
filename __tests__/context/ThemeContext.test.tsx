import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { Pressable, Text } from "react-native";
import { AppThemeProvider, useAppTheme } from "@/context/ThemeContext";
import { firestoreService } from "@/services/firestoreService";
import { useFinanceStore } from "@/store/useFinanceStore";

jest.mock("@/context/AuthSessionContext", () => ({
  useAuthSession: () => ({
    user: {
      uid: "user-1"
    }
  })
}));

jest.mock("@/services/firestoreService", () => ({
  firestoreService: {
    saveUserSettings: jest.fn()
  }
}));

function ThemeProbe() {
  const { isDark, setThemeMode } = useAppTheme();

  return (
    <>
      <Text>{isDark ? "dark" : "light"}</Text>
      <Pressable accessibilityRole="button" onPress={() => void setThemeMode("dark")}>
        <Text>set-dark</Text>
      </Pressable>
    </>
  );
}

describe("ThemeContext", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    act(() => {
      useFinanceStore.getState().reset();
      useFinanceStore.setState({
        settings: {
          theme: "light",
          currency: "BRL"
        },
        transactions: [
          {
            id: "tx-1",
            userId: "user-1",
            type: "expense",
            amount: 120,
            categoryId: "housing",
            categoryName: "Moradia",
            description: "Internet",
            date: "2026-03-10",
            isRecurring: false,
            isPaid: false,
            createdAt: "2026-03-10",
            updatedAt: "2026-03-10"
          }
        ]
      });
    });
    (firestoreService.saveUserSettings as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(() => {
    act(() => {
      useFinanceStore.getState().reset();
    });
  });

  it("persists an explicit theme change", async () => {
    const screen = render(
      <AppThemeProvider>
        <ThemeProbe />
      </AppThemeProvider>
    );

    expect(screen.getByText("light")).toBeTruthy();

    fireEvent.press(screen.getByText("set-dark"));

    await waitFor(() => {
      expect(firestoreService.saveUserSettings).toHaveBeenCalledWith(
        "user-1",
        expect.objectContaining({
          theme: "dark",
          currency: "BRL"
        })
      );
    });

    expect(screen.getByText("dark")).toBeTruthy();
  });

  it("keeps the chosen theme when a transaction is marked as paid", () => {
    const screen = render(
      <AppThemeProvider>
        <ThemeProbe />
      </AppThemeProvider>
    );

    expect(screen.getByText("light")).toBeTruthy();

    act(() => {
      useFinanceStore.getState().updateTransactionLocal("tx-1", {
        isPaid: true,
        updatedAt: "2026-03-11"
      });
    });

    expect(screen.getByText("light")).toBeTruthy();
  });
});
