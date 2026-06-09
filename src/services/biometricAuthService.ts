import { Platform } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import { cacheService } from "@/services/cacheService";
import { authService } from "@/services/authService";
import { remoteBackendService } from "@/services/remoteBackendService";

const BIOMETRIC_CREDENTIALS_KEY = "green-finance.biometric-credentials";
const WEB_BIOMETRIC_CREDENTIAL_KEY = "green-finance.web-biometric-credential";
const CANONICAL_WEB_AUTHN_HOSTNAME = "green-finance-backend-pages.pages.dev";

type StoredCredentials = {
  email: string;
  password: string;
};

type StoredWebCredential = {
  credentialId: string;
  email: string;
  password?: string;
};

export type BiometricStatus = {
  isAvailable: boolean;
  isEnabled: boolean;
  label: string;
};

function createAuthError(code: string) {
  return new Error(`auth/${code}`);
}

const webContext = globalThis as typeof globalThis & {
  PublicKeyCredential?: {
    isUserVerifyingPlatformAuthenticatorAvailable?: () => Promise<boolean>;
  };
  atob?: (value: string) => string;
  btoa?: (value: string) => string;
  crypto?: {
    getRandomValues: (bytes: Uint8Array) => Uint8Array;
  };
  localStorage?: {
    getItem: (key: string) => string | null;
    removeItem: (key: string) => void;
    setItem: (key: string, value: string) => void;
  };
  location?: {
    hostname?: string;
  };
  navigator?: {
    credentials?: {
      create?: (options: unknown) => Promise<{ rawId?: ArrayBuffer } | null>;
      get?: (options: unknown) => Promise<{ rawId?: ArrayBuffer } | null>;
    };
  };
};

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

function getWebBiometricRpId() {
  const currentHostname = webContext.location?.hostname?.trim().toLowerCase();

  if (!currentHostname) {
    return undefined;
  }

  if (currentHostname === CANONICAL_WEB_AUTHN_HOSTNAME || currentHostname.endsWith(`.${CANONICAL_WEB_AUTHN_HOSTNAME}`)) {
    return CANONICAL_WEB_AUTHN_HOSTNAME;
  }

  return currentHostname;
}

function supportsWebBiometrics() {
  return Boolean(
    Platform.OS === "web" &&
      typeof webContext.PublicKeyCredential !== "undefined" &&
      typeof webContext.navigator?.credentials !== "undefined" &&
      typeof webContext.crypto?.getRandomValues === "function" &&
      typeof webContext.atob === "function" &&
      typeof webContext.btoa === "function"
  );
}

function createRandomBytes(size: number) {
  const bytes = new Uint8Array(size);
  webContext.crypto?.getRandomValues(bytes);
  return bytes;
}

function encodeBase64Url(bytes: Uint8Array) {
  const encoder = webContext.btoa;

  if (!encoder) {
    throw createAuthError("biometric-not-available");
  }

  let binary = "";

  bytes.forEach((value) => {
    binary += String.fromCharCode(value);
  });

  return encoder(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeBase64Url(value: string) {
  const decoder = webContext.atob;

  if (!decoder) {
    throw createAuthError("biometric-not-available");
  }

  const normalizedValue = value.replace(/-/g, "+").replace(/_/g, "/");
  const paddedValue = normalizedValue.padEnd(Math.ceil(normalizedValue.length / 4) * 4, "=");
  const binary = decoder(paddedValue);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

async function readStoredWebCredential() {
  const localStorageCredential = readStoredWebCredentialSync();

  if (localStorageCredential) {
    return localStorageCredential;
  }

  return (await cacheService.getItem<StoredWebCredential | null>(WEB_BIOMETRIC_CREDENTIAL_KEY, null)) ?? null;
}

async function writeStoredWebCredential(credential: StoredWebCredential | null) {
  writeStoredWebCredentialSync(credential);

  if (!credential) {
    await cacheService.removeItem(WEB_BIOMETRIC_CREDENTIAL_KEY);
    return;
  }

  await cacheService.setItem(WEB_BIOMETRIC_CREDENTIAL_KEY, credential);
}

function readStoredWebCredentialSync() {
  const raw = webContext.localStorage?.getItem(WEB_BIOMETRIC_CREDENTIAL_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as StoredWebCredential;
  } catch {
    webContext.localStorage?.removeItem(WEB_BIOMETRIC_CREDENTIAL_KEY);
    return null;
  }
}

function writeStoredWebCredentialSync(credential: StoredWebCredential | null) {
  if (!webContext.localStorage) {
    return;
  }

  if (!credential) {
    webContext.localStorage.removeItem(WEB_BIOMETRIC_CREDENTIAL_KEY);
    return;
  }

  webContext.localStorage.setItem(WEB_BIOMETRIC_CREDENTIAL_KEY, JSON.stringify(credential));
}

async function isWebBiometricAvailable() {
  if (!supportsWebBiometrics()) {
    return false;
  }

  const availabilityCheck = webContext.PublicKeyCredential?.isUserVerifyingPlatformAuthenticatorAvailable;

  if (typeof availabilityCheck !== "function") {
    return true;
  }

  try {
    return await availabilityCheck();
  } catch {
    return false;
  }
}

async function registerWebBiometric(email: string) {
  if (!supportsWebBiometrics()) {
    return false;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existingCredential = readStoredWebCredentialSync();

  if (existingCredential?.credentialId) {
    if (existingCredential.email !== normalizedEmail) {
      await writeStoredWebCredential({
        ...existingCredential,
        email: normalizedEmail
      });
    }

    return true;
  }

  try {
    const rpId = getWebBiometricRpId();
    const credential = await webContext.navigator?.credentials?.create?.({
      publicKey: {
        attestation: "none",
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          residentKey: "preferred",
          userVerification: "required"
        },
        challenge: createRandomBytes(32),
        pubKeyCredParams: [
          { alg: -7, type: "public-key" },
          { alg: -257, type: "public-key" }
        ],
        rp: {
          id: rpId,
          name: "Green Finance"
        },
        timeout: 60000,
        user: {
          displayName: normalizedEmail,
          id: createRandomBytes(32),
          name: normalizedEmail
        }
      }
    });

    const rawId =
      credential && typeof credential === "object" && "rawId" in credential && credential.rawId instanceof ArrayBuffer
        ? credential.rawId
        : null;

    if (!rawId) {
      return false;
    }

    await writeStoredWebCredential({
      credentialId: encodeBase64Url(new Uint8Array(rawId)),
      email: normalizedEmail
    });

    return true;
  } catch {
    return false;
  }
}

async function authenticateOnWebWithBiometrics() {
  if (!(await isWebBiometricAvailable())) {
    throw createAuthError("biometric-not-available");
  }

  const storedCredential = await readStoredWebCredential();

  if (!storedCredential?.credentialId) {
    throw createAuthError("biometric-not-configured");
  }

  try {
    const rpId = getWebBiometricRpId();
    const credential = await webContext.navigator?.credentials?.get?.({
      publicKey: {
        allowCredentials: [
          {
            id: decodeBase64Url(storedCredential.credentialId),
            type: "public-key"
          }
        ],
        challenge: createRandomBytes(32),
        rpId,
        timeout: 60000,
        userVerification: "required"
      }
    });

    const rawId =
      credential && typeof credential === "object" && "rawId" in credential && credential.rawId instanceof ArrayBuffer
        ? credential.rawId
        : null;

    if (!rawId) {
      throw createAuthError("biometric-failed");
    }
  } catch (error) {
    const name = error instanceof Error ? error.name : "";

    if (["AbortError", "NotAllowedError"].includes(name)) {
      throw createAuthError("biometric-cancelled");
    }

    throw createAuthError("biometric-failed");
  }

  if (storedCredential.email && storedCredential.password) {
    try {
      return await authService.login(storedCredential.email, storedCredential.password);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      if (message.includes("invalid-credential") || message.includes("local-account-not-found")) {
        await biometricAuthService.clearCredentials();
      }

      throw error;
    }
  }

  return authService.resumeSession();
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
  hasStoredWebCredential() {
    return Boolean(readStoredWebCredentialSync()?.credentialId);
  },

  async getStatus(): Promise<BiometricStatus> {
    if (Platform.OS === "web") {
      const [isAvailable, storedCredential, hasSavedSession] = await Promise.all([
        isWebBiometricAvailable(),
        readStoredWebCredential(),
        remoteBackendService.hasSavedSession().catch(() => false)
      ]);

      return {
        isAvailable,
        isEnabled: isAvailable && Boolean(storedCredential?.credentialId) && (Boolean(storedCredential?.password) || hasSavedSession),
        label: "digital"
      };
    }

    if (!(await SecureStore.isAvailableAsync())) {
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
    if (Platform.OS === "web") {
      const normalizedEmail = email.trim().toLowerCase();
      const normalizedPassword = password;
      const existingCredential = readStoredWebCredentialSync();

      if (existingCredential?.credentialId) {
        await writeStoredWebCredential({
          ...existingCredential,
          email: normalizedEmail,
          password: normalizedPassword
        });
        return true;
      }

      const registrationSucceeded = await registerWebBiometric(normalizedEmail);

      if (!registrationSucceeded) {
        return false;
      }

      const registeredCredential = await readStoredWebCredential();

      if (!registeredCredential?.credentialId) {
        return false;
      }

      await writeStoredWebCredential({
        ...registeredCredential,
        email: normalizedEmail,
        password: normalizedPassword
      });

      return true;
    }

    if (!(await SecureStore.isAvailableAsync())) {
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
    if (Platform.OS === "web") {
      await writeStoredWebCredential(null);
      return;
    }

    if (!(await SecureStore.isAvailableAsync())) {
      return;
    }

    await SecureStore.deleteItemAsync(BIOMETRIC_CREDENTIALS_KEY);
  },

  async loginWithBiometrics() {
    if (Platform.OS === "web") {
      return authenticateOnWebWithBiometrics();
    }

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
