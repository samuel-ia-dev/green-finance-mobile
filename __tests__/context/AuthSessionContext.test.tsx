import { act, render } from "@testing-library/react-native";
import { Text } from "react-native";
import { AuthSessionProvider, useAuthSession } from "@/context/AuthSessionContext";
import { authService } from "@/services/authService";
import { savedAccessService } from "@/services/savedAccessService";

jest.mock("@/services/authService", () => ({
  authService: {
    subscribe: jest.fn(),
    resumeSession: jest.fn(),
    logout: jest.fn()
  }
}));

jest.mock("@/services/savedAccessService", () => ({
  savedAccessService: {
    isEnabled: jest.fn(),
    resumeSavedAccess: jest.fn()
  }
}));

function SessionProbe() {
  const { isLoading, user } = useAuthSession();

  return <Text>{isLoading ? "loading" : user?.email ?? "guest"}</Text>;
}

describe("AuthSessionContext", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (authService.subscribe as jest.Mock).mockImplementation((callback: (user: unknown) => void) => {
      callback(null);
      return jest.fn();
    });
  });

  it("keeps the cached session active offline even when save access is disabled", async () => {
    (savedAccessService.isEnabled as jest.Mock).mockResolvedValue(false);
    (authService.resumeSession as jest.Mock).mockResolvedValue({
      uid: "remote-user-offline",
      email: "offline@example.com"
    });

    const screen = render(
      <AuthSessionProvider>
        <SessionProbe />
      </AuthSessionProvider>
    );

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByText("offline@example.com")).toBeTruthy();
    expect(authService.logout).not.toHaveBeenCalled();
    expect(savedAccessService.resumeSavedAccess).not.toHaveBeenCalled();
  });
});
