import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { ForgotPasswordScreen } from "@/screens/ForgotPasswordScreen";
import { authService } from "@/services/authService";
import { biometricAuthService } from "@/services/biometricAuthService";

jest.mock("@/services/firebase", () => ({
  auth: null
}));

jest.mock("@/services/authService", () => ({
  ...jest.requireActual("@/services/authService"),
  authService: {
    login: jest.fn(),
    register: jest.fn(),
    resetPassword: jest.fn(),
    updatePassword: jest.fn(),
    logout: jest.fn(),
    subscribe: jest.fn()
  }
}));

jest.mock("@/services/biometricAuthService", () => ({
  biometricAuthService: {
    getStatus: jest.fn(),
    hasStoredWebCredential: jest.fn().mockReturnValue(true),
    rememberCredentials: jest.fn(),
    clearCredentials: jest.fn(),
    loginWithBiometrics: jest.fn()
  }
}));

describe("ForgotPasswordScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (biometricAuthService.getStatus as jest.Mock).mockResolvedValue({
      isAvailable: true,
      isEnabled: true,
      label: "digital"
    });
  });

  it("redefines the password in-app after confirming with the device biometric", async () => {
    (biometricAuthService.loginWithBiometrics as jest.Mock).mockResolvedValue({
      uid: "user-1",
      email: "john@example.com"
    });
    (authService.updatePassword as jest.Mock).mockResolvedValue(undefined);
    const navigation = { goBack: jest.fn() };

    const screen = render(<ForgotPasswordScreen navigation={navigation as never} />);

    fireEvent.changeText(screen.getByPlaceholderText("Email"), "john@example.com");
    fireEvent.changeText(screen.getByPlaceholderText("Nova senha"), "654321");
    fireEvent.changeText(screen.getByPlaceholderText("Confirmar nova senha"), "654321");
    fireEvent.press(await screen.findByText("Redefinir com digital"));

    await waitFor(() => {
      expect(biometricAuthService.loginWithBiometrics).toHaveBeenCalled();
      expect(authService.updatePassword).toHaveBeenCalledWith("654321");
      expect(biometricAuthService.rememberCredentials).toHaveBeenCalledWith("john@example.com", "654321");
    });
  });

  it("shows a validation message when the new password confirmation does not match", async () => {
    const navigation = { goBack: jest.fn() };

    const screen = render(<ForgotPasswordScreen navigation={navigation as never} />);

    fireEvent.changeText(screen.getByPlaceholderText("Email"), "john@example.com");
    fireEvent.changeText(screen.getByPlaceholderText("Nova senha"), "654321");
    fireEvent.changeText(screen.getByPlaceholderText("Confirmar nova senha"), "123456");
    fireEvent.press(await screen.findByText("Redefinir com digital"));

    expect(await screen.findByText("Digite a mesma senha nos dois campos.")).toBeTruthy();
  });
});
