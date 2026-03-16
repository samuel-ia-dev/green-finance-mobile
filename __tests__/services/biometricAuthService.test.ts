import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import { authService } from "@/services/authService";
import { biometricAuthService } from "@/services/biometricAuthService";

jest.mock("@/services/authService", () => ({
  authService: {
    login: jest.fn()
  }
}));

describe("biometricAuthService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (SecureStore.isAvailableAsync as jest.Mock).mockResolvedValue(true);
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
    (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(true);
    (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(true);
    (LocalAuthentication.supportedAuthenticationTypesAsync as jest.Mock).mockResolvedValue([LocalAuthentication.AuthenticationType.FINGERPRINT]);
    (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValue({ success: true });
  });

  it("reports biometric login as enabled when hardware, enrollment and stored credentials exist", async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(JSON.stringify({ email: "john@example.com", password: "123456" }));

    const status = await biometricAuthService.getStatus();

    expect(status).toEqual({
      isAvailable: true,
      isEnabled: true,
      label: "digital"
    });
  });

  it("stores normalized credentials securely for future biometric login", async () => {
    await biometricAuthService.rememberCredentials(" John@Example.com ", "123456");

    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      "green-finance.biometric-credentials",
      JSON.stringify({
        email: "john@example.com",
        password: "123456"
      }),
      expect.objectContaining({
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY
      })
    );
  });

  it("authenticates with biometrics and logs in with the stored credentials", async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(JSON.stringify({ email: "john@example.com", password: "123456" }));
    (authService.login as jest.Mock).mockResolvedValue({ uid: "user-1", email: "john@example.com" });

    const user = await biometricAuthService.loginWithBiometrics();

    expect(LocalAuthentication.authenticateAsync).toHaveBeenCalled();
    expect(authService.login).toHaveBeenCalledWith("john@example.com", "123456");
    expect(user).toEqual({ uid: "user-1", email: "john@example.com" });
  });

  it("maps cancellation from biometric prompt into a dedicated auth error", async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(JSON.stringify({ email: "john@example.com", password: "123456" }));
    (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValue({ success: false, error: "user_cancel" });

    await expect(biometricAuthService.loginWithBiometrics()).rejects.toThrow("auth/biometric-cancelled");
  });

  it("removes stale stored credentials when biometric login fails with invalid credentials", async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(JSON.stringify({ email: "john@example.com", password: "123456" }));
    (authService.login as jest.Mock).mockRejectedValue(new Error("auth/invalid-credential"));

    await expect(biometricAuthService.loginWithBiometrics()).rejects.toThrow("auth/invalid-credential");

    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith("green-finance.biometric-credentials");
  });
});
