import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { LoginScreen } from "@/screens/LoginScreen";
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

describe("LoginScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (biometricAuthService.getStatus as jest.Mock).mockResolvedValue({
      isAvailable: false,
      isEnabled: false,
      label: "biometria"
    });
  });

  it("shows a validation message when email and password are missing", async () => {
    const navigation = { navigate: jest.fn() };
    (authService.login as jest.Mock).mockRejectedValueOnce(new Error("auth/missing-credentials"));

    const screen = render(<LoginScreen navigation={navigation as never} />);

    fireEvent.press(screen.getByText("Entrar"));

    expect(await screen.findByText("Preencha email e senha.")).toBeTruthy();
  });

  it("submits credentials and shows firebase errors nicely", async () => {
    (authService.login as jest.Mock).mockRejectedValueOnce(new Error("auth/invalid-credential"));
    const navigation = { navigate: jest.fn() };

    const screen = render(<LoginScreen navigation={navigation as never} />);

    fireEvent.changeText(screen.getByPlaceholderText("Email"), "john@example.com");
    fireEvent.changeText(screen.getByPlaceholderText("Senha"), "123456");
    fireEvent.press(screen.getByText("Entrar"));

    await waitFor(() => {
      expect(screen.getByText("Email ou senha inválidos.")).toBeTruthy();
    });
  });

  it("guides the user to create the first access when the account does not exist", async () => {
    (authService.login as jest.Mock).mockRejectedValueOnce(new Error("auth/local-account-not-found"));
    const navigation = { navigate: jest.fn() };

    const screen = render(<LoginScreen navigation={navigation as never} />);

    fireEvent.changeText(screen.getByPlaceholderText("Email"), "novo@example.com");
    fireEvent.changeText(screen.getByPlaceholderText("Senha"), "123456");
    fireEvent.press(screen.getByText("Entrar"));

    await waitFor(() => {
      expect(screen.getByText("Nenhuma conta encontrada para este email. Crie seu primeiro acesso.")).toBeTruthy();
    });
  });

  it("stores credentials for biometric access after a successful login", async () => {
    (authService.login as jest.Mock).mockResolvedValueOnce({ uid: "user-1", email: "john@example.com" });
    const navigation = { navigate: jest.fn() };

    const screen = render(<LoginScreen navigation={navigation as never} />);

    fireEvent.changeText(screen.getByPlaceholderText("Email"), "john@example.com");
    fireEvent.changeText(screen.getByPlaceholderText("Senha"), "123456");
    fireEvent.press(screen.getByText("Entrar"));

    await waitFor(() => {
      expect(biometricAuthService.rememberCredentials).toHaveBeenCalledWith("john@example.com", "123456");
    });
  });

  it("shows the biometric access button when the device is already configured", async () => {
    (biometricAuthService.getStatus as jest.Mock).mockResolvedValueOnce({
      isAvailable: true,
      isEnabled: true,
      label: "digital"
    });
    (biometricAuthService.loginWithBiometrics as jest.Mock).mockResolvedValueOnce({ uid: "user-1", email: "john@example.com" });
    const navigation = { navigate: jest.fn() };

    const screen = render(<LoginScreen navigation={navigation as never} />);

    const biometricButton = await waitFor(() => screen.getByText("Entrar com digital"));
    fireEvent.press(biometricButton);

    expect(biometricAuthService.loginWithBiometrics).toHaveBeenCalled();
  });

  it("shows the new app icon in the hero section", () => {
    const navigation = { navigate: jest.fn() };
    const screen = render(<LoginScreen navigation={navigation as never} />);

    expect(screen.getByLabelText("Green Finance icon")).toBeTruthy();
  });
});
