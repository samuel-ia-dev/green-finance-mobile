import { Platform } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import { authService } from "@/services/authService";

const BIOMETRIC_CREDENTIALS_KEY = "green-finance.biometric-credentials";

type StoredCredentials = {
  email: string;
  password: string;
};

export type BiometricStatus = {
  isAvailable: boolean;
  isEnabled: boolean;
  label: string;
};

function createAuthError(code: string) {
  return new Error(`auth/${code}`);
}

function getBiometricLabel(types: LocalAuthentication.AuthenticationType[]) {
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION) && !types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    return Platform.OS === "ios" ? "Face ID" : "reconhecimento facial";
  }

  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    return "digital";
  }

  if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
    return "íris";
  }

  return "biometria";
}

async function readStoredCredentials() {
  if (Platform.OS === "web" || !(await SecureStore.isAvailableAsync())) {
    return null;
  }

  const raw = await SecureStore.getItemAsync(BIOMETRIC_CREDENTIALS_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as StoredCredentials;
  } catch {
    await SecureStore.deleteItemAsync(BIOMETRIC_CREDENTIALS_KEY);
    return null;
  }
}

export const biometricAuthService = {
  async getStatus(): Promise<BiometricStatus> {
    if (Platform.OS === "web" || !(await SecureStore.isAvailableAsync())) {
      return {
        isAvailable: false,
        isEnabled: false,
        label: "biometria"
      };
    }

    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = hasHardware ? await LocalAuthentication.isEnrolledAsync() : false;
    const supportedTypes = hasHardware ? await LocalAuthentication.supportedAuthenticationTypesAsync() : [];
    const storedCredentials = await readStoredCredentials();

    return {
      isAvailable: hasHardware && isEnrolled,
      isEnabled: hasHardware && isEnrolled && Boolean(storedCredentials),
      label: getBiometricLabel(supportedTypes)
    };
  },

  async rememberCredentials(email: string, password: string) {
    if (Platform.OS === "web" || !(await SecureStore.isAvailableAsync())) {
      return false;
    }

    await SecureStore.setItemAsync(
      BIOMETRIC_CREDENTIALS_KEY,
      JSON.stringify({
        email: email.trim().toLowerCase(),
        password
      }),
      {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY
      }
    );

    return true;
  },

  async clearCredentials() {
    if (Platform.OS === "web" || !(await SecureStore.isAvailableAsync())) {
      return;
    }

    await SecureStore.deleteItemAsync(BIOMETRIC_CREDENTIALS_KEY);
  },

  async loginWithBiometrics() {
    const status = await this.getStatus();

    if (!status.isAvailable) {
      throw createAuthError("biometric-not-available");
    }

    const storedCredentials = await readStoredCredentials();
    if (!storedCredentials) {
      throw createAuthError("biometric-not-configured");
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "Entrar com biometria",
      cancelLabel: "Cancelar",
      fallbackLabel: "Usar senha",
      biometricsSecurityLevel: "weak"
    });

    if (!result.success) {
      if (["user_cancel", "system_cancel", "app_cancel", "user_fallback"].includes(result.error)) {
        throw createAuthError("biometric-cancelled");
      }

      if (["not_available", "not_enrolled", "passcode_not_set"].includes(result.error)) {
        throw createAuthError("biometric-not-available");
      }

      throw createAuthError("biometric-failed");
    }

    try {
      return await authService.login(storedCredentials.email, storedCredentials.password);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      if (message.includes("invalid-credential") || message.includes("local-account-not-found")) {
        await this.clearCredentials();
      }

      throw error;
    }
  }
};
