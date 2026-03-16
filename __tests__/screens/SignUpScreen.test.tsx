import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { SignUpScreen } from "@/screens/SignUpScreen";
import { authService } from "@/services/authService";
import { biometricAuthService } from "@/services/biometricAuthService";

jest.mock("@/services/authService", () => ({
  ...jest.requireActual("@/services/authService"),
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

describe("SignUpScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("stores credentials for biometric access after creating the first account", async () => {
    (authService.register as jest.Mock).mockResolvedValueOnce({ uid: "user-1", email: "nova@example.com" });
    const navigation = { goBack: jest.fn() };

    const screen = render(<SignUpScreen navigation={navigation as never} />);

    fireEvent.changeText(screen.getByPlaceholderText("Email"), "nova@example.com");
    fireEvent.changeText(screen.getByPlaceholderText("Senha"), "123456");
    fireEvent.press(screen.getByText("Cadastrar"));

    await waitFor(() => {
      expect(biometricAuthService.rememberCredentials).toHaveBeenCalledWith("nova@example.com", "123456");
    });
  });
});
