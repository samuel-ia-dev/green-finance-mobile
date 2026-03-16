import { act, fireEvent, render } from "@testing-library/react-native";
import { SettingsScreen } from "@/screens/SettingsScreen";
import { authService } from "@/services/authService";
import { biometricAuthService } from "@/services/biometricAuthService";
import { exportService } from "@/services/exportService";
import { useFinanceStore } from "@/store/useFinanceStore";

jest.mock("@/services/exportService", () => ({
  exportService: {
    exportCsv: jest.fn(),
    exportPdf: jest.fn()
  }
}));

jest.mock("@/services/authService", () => ({
  authService: {
    login: jest.fn(),
    register: jest.fn(),
    resetPassword: jest.fn(),
    logout: jest.fn(),
    subscribe: jest.fn()
  }
}));

jest.mock("@/services/biometricAuthService", () => ({
  biometricAuthService: {
    getStatus: jest.fn(),
    rememberCredentials: jest.fn(),
    clearCredentials: jest.fn(),
    loginWithBiometrics: jest.fn()
  }
}));

describe("SettingsScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (biometricAuthService.getStatus as jest.Mock).mockResolvedValue({
      isAvailable: true,
      isEnabled: true,
      label: "digital"
    });
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-03-11T12:00:00Z"));
    useFinanceStore.setState({
      transactions: [
        {
          id: "1",
          userId: "user-1",
          type: "expense",
          amount: 120,
          categoryId: "housing",
          categoryName: "Moradia",
          description: "Internet",
          date: "2026-03-10",
          isRecurring: true,
          recurringFrequency: "monthly",
          recurringStartDate: "2026-01-10",
          parentRecurringId: "rec-1",
          createdAt: "2026-03-10",
          updatedAt: "2026-03-10"
        },
        {
          id: "2",
          userId: "user-1",
          type: "expense",
          amount: 80,
          categoryId: "health",
          categoryName: "Saúde",
          description: "Academia",
          date: "2026-04-02",
          isRecurring: false,
          createdAt: "2026-04-02",
          updatedAt: "2026-04-02"
        }
      ]
    });
  });

  afterEach(() => {
    act(() => {
      useFinanceStore.getState().reset();
    });
    jest.useRealTimers();
  });

  it("renders export actions, theme switch, biometric controls and logout in the footer", async () => {
    const screen = render(<SettingsScreen />);
    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByText("Exportar CSV")).toBeTruthy();
    expect(screen.getByText("Exportar PDF")).toBeTruthy();
    expect(screen.getByText("Sair")).toBeTruthy();
    expect(screen.getByText("Desativar biometria")).toBeTruthy();

    fireEvent(screen.getByRole("switch"), "valueChange", true);
    await act(async () => {
      fireEvent.press(screen.getByText("Desativar biometria"));
    });
    fireEvent.press(screen.getByText("Sair"));

    expect(screen.getByText("Modo escuro")).toBeTruthy();
    expect(biometricAuthService.clearCredentials).toHaveBeenCalled();
    expect(authService.logout).toHaveBeenCalled();
  });

  it("exports only the current month financial data", () => {
    const screen = render(<SettingsScreen />);

    fireEvent.press(screen.getByText("Exportar CSV"));
    fireEvent.press(screen.getByText("Exportar PDF"));

    expect(exportService.exportCsv).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          id: "1",
          date: "2026-03-10"
        })
      ],
      "2026-03"
    );
    expect(exportService.exportPdf).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          id: "1",
          date: "2026-03-10"
        })
      ],
      "2026-03"
    );
  });
});
