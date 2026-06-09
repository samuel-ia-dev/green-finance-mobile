import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { authService } from "@/services/authService";
import { biometricAuthService } from "@/services/biometricAuthService";
import { remoteBackendService } from "@/services/remoteBackendService";

jest.mock("@/services/authService", () => ({
  authService: {
    login: jest.fn(),
    resumeSession: jest.fn()
  }
}));

jest.mock("@/services/remoteBackendService", () => ({
  remoteBackendService: {
    hasSavedSession: jest.fn().mockResolvedValue(false)
  }
}));

describe("biometricAuthService", () => {
  const originalPlatform = Platform.OS;
  const originalLocalStorage = global.localStorage;
  const originalNavigator = global.navigator;
  const originalPublicKeyCredential = global.PublicKeyCredential;
  const originalAtob = global.atob;
  const originalBtoa = global.btoa;

  beforeEach(() => {
    jest.clearAllMocks();
    void AsyncStorage.clear();
    (SecureStore.isAvailableAsync as jest.Mock).mockResolvedValue(true);
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
    (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(true);
    (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(true);
    (LocalAuthentication.supportedAuthenticationTypesAsync as jest.Mock).mockResolvedValue([LocalAuthentication.AuthenticationType.FINGERPRINT]);
    (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValue({ success: true });

    Object.defineProperty(Platform, "OS", {
      configurable: true,
      value: originalPlatform
    });
    Object.defineProperty(global, "navigator", {
      configurable: true,
      value: originalNavigator
    });
    Object.defineProperty(global, "localStorage", {
      configurable: true,
      value: originalLocalStorage
    });
    Object.defineProperty(global, "PublicKeyCredential", {
      configurable: true,
      value: originalPublicKeyCredential
    });
    Object.defineProperty(global, "atob", {
      configurable: true,
      value: originalAtob
    });
    Object.defineProperty(global, "btoa", {
      configurable: true,
      value: originalBtoa
    });
  });

  afterAll(() => {
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      value: originalPlatform
    });
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

  it("enables digital login on web when a saved credential and session exist", async () => {
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      value: "web"
    });
    Object.defineProperty(global, "PublicKeyCredential", {
      configurable: true,
      value: {
        isUserVerifyingPlatformAuthenticatorAvailable: jest.fn().mockResolvedValue(true)
      }
    });
    Object.defineProperty(global, "navigator", {
      configurable: true,
      value: {
        credentials: {}
      }
    });
    Object.defineProperty(global, "localStorage", {
      configurable: true,
      value: {
        getItem: jest.fn().mockReturnValue(JSON.stringify({ credentialId: "dGVzdA", email: "john@example.com", password: "123456" })),
        setItem: jest.fn(),
        removeItem: jest.fn()
      }
    });
    Object.defineProperty(global, "atob", {
      configurable: true,
      value: (value: string) => Buffer.from(value, "base64").toString("binary")
    });
    Object.defineProperty(global, "btoa", {
      configurable: true,
      value: (value: string) => Buffer.from(value, "binary").toString("base64")
    });
    (remoteBackendService.hasSavedSession as jest.Mock).mockResolvedValue(true);

    const status = await biometricAuthService.getStatus();

    expect(status).toEqual({
      isAvailable: true,
      isEnabled: true,
      label: "digital"
    });
  });

  it("logs in with the saved web credentials after validating the digital login", async () => {
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      value: "web"
    });
    Object.defineProperty(global, "PublicKeyCredential", {
      configurable: true,
      value: {
        isUserVerifyingPlatformAuthenticatorAvailable: jest.fn().mockResolvedValue(true)
      }
    });
    Object.defineProperty(global, "navigator", {
      configurable: true,
      value: {
        credentials: {
          get: jest.fn().mockResolvedValue({
            rawId: new Uint8Array([1, 2, 3]).buffer
          })
        }
      }
    });
    Object.defineProperty(global, "localStorage", {
      configurable: true,
      value: {
        getItem: jest.fn().mockReturnValue(JSON.stringify({ credentialId: "dGVzdA", email: "john@example.com", password: "123456" })),
        setItem: jest.fn(),
        removeItem: jest.fn()
      }
    });
    Object.defineProperty(global, "atob", {
      configurable: true,
      value: (value: string) => Buffer.from(value, "base64").toString("binary")
    });
    Object.defineProperty(global, "btoa", {
      configurable: true,
      value: (value: string) => Buffer.from(value, "binary").toString("base64")
    });
    (authService.login as jest.Mock).mockResolvedValue({ uid: "user-1", email: "john@example.com" });

    const user = await biometricAuthService.loginWithBiometrics();

    expect(authService.login).toHaveBeenCalledWith("john@example.com", "123456");
    expect(user).toEqual({ uid: "user-1", email: "john@example.com" });
  });

  it("registers the web credential using the canonical app host and stores it synchronously", async () => {
    const create = jest.fn().mockResolvedValue({
      rawId: new Uint8Array([9, 8, 7]).buffer
    });
    const setItem = jest.fn();

    Object.defineProperty(Platform, "OS", {
      configurable: true,
      value: "web"
    });
    Object.defineProperty(global, "location", {
      configurable: true,
      value: {
        hostname: "ad84f4dd.green-finance-backend-pages.pages.dev"
      }
    });
    Object.defineProperty(global, "PublicKeyCredential", {
      configurable: true,
      value: {
        isUserVerifyingPlatformAuthenticatorAvailable: jest.fn().mockResolvedValue(true)
      }
    });
    Object.defineProperty(global, "navigator", {
      configurable: true,
      value: {
        credentials: {
          create
        }
      }
    });
    Object.defineProperty(global, "localStorage", {
      configurable: true,
      value: {
        getItem: jest.fn().mockReturnValue(null),
        setItem,
        removeItem: jest.fn()
      }
    });
    Object.defineProperty(global, "atob", {
      configurable: true,
      value: (value: string) => Buffer.from(value, "base64").toString("binary")
    });
    Object.defineProperty(global, "btoa", {
      configurable: true,
      value: (value: string) => Buffer.from(value, "binary").toString("base64")
    });

    const enabled = await biometricAuthService.rememberCredentials("john@example.com", "123456");

    expect(enabled).toBe(true);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        publicKey: expect.objectContaining({
          rp: expect.objectContaining({
            id: "green-finance-backend-pages.pages.dev"
          })
        })
      })
    );
    expect(setItem).toHaveBeenCalled();
  });

  it("updates the stored web password without asking for a new credential when the device is already configured", async () => {
    const setItem = jest.fn();

    Object.defineProperty(Platform, "OS", {
      configurable: true,
      value: "web"
    });
    Object.defineProperty(global, "localStorage", {
      configurable: true,
      value: {
        getItem: jest.fn().mockReturnValue(JSON.stringify({ credentialId: "dGVzdA", email: "john@example.com", password: "123456" })),
        setItem,
        removeItem: jest.fn()
      }
    });

    const enabled = await biometricAuthService.rememberCredentials("john@example.com", "654321");

    expect(enabled).toBe(true);
    expect(setItem).toHaveBeenCalledWith(
      "green-finance.web-biometric-credential",
      JSON.stringify({ credentialId: "dGVzdA", email: "john@example.com", password: "654321" })
    );
  });
});
