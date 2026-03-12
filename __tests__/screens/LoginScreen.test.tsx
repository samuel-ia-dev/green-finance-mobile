import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { LoginScreen } from "@/screens/LoginScreen";
import { authService } from "@/services/authService";

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

describe("LoginScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows a validation message when email and password are missing", async () => {
    const navigation = { navigate: jest.fn() };
    (authService.login as jest.Mock).mockRejectedValueOnce(new Error("auth/missing-credentials"));

    const screen = render(<LoginScreen navigation={navigation as never} />);

    fireEvent.press(screen.getByText("Entrar"));

    await waitFor(() => {
      expect(screen.getByText("Preencha email e senha.")).toBeTruthy();
    });
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
});
