import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { LoginScreen } from "@/screens/LoginScreen";
import { authService } from "@/services/authService";

jest.mock("@/services/authService", () => ({
  authService: {
    login: jest.fn(),
    register: jest.fn(),
    resetPassword: jest.fn(),
    logout: jest.fn(),
    subscribe: jest.fn()
  }
}));

describe("LoginScreen", () => {
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
});
