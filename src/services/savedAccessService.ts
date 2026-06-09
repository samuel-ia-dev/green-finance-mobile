import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { authService } from "@/services/authService";
import { cacheService } from "@/services/cacheService";

const SAVED_ACCESS_ENABLED_KEY = "green-finance.saved-access-enabled";
const SAVED_ACCESS_CREDENTIALS_KEY = "green-finance.saved-access-credentials";

type SavedAccessCredentials = {
  email: string;
  password: string;
};

const webContext = globalThis as typeof globalThis & {
  localStorage?: {
    getItem: (key: string) => string | null;
    removeItem: (key: string) => void;
    setItem: (key: string, value: string) => void;
  };
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function readStoredWebCredentialsSync() {
  const raw = webContext.localStorage?.getItem(SAVED_ACCESS_CREDENTIALS_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as SavedAccessCredentials;
  } catch {
    webContext.localStorage?.removeItem(SAVED_ACCESS_CREDENTIALS_KEY);
    return null;
  }
}

function writeStoredWebCredentialsSync(credentials: SavedAccessCredentials | null) {
  if (!webContext.localStorage) {
    return;
  }

  if (!credentials) {
    webContext.localStorage.removeItem(SAVED_ACCESS_CREDENTIALS_KEY);
    return;
  }

  webContext.localStorage.setItem(SAVED_ACCESS_CREDENTIALS_KEY, JSON.stringify(credentials));
}

async function readStoredCredentials() {
  if (Platform.OS === "web") {
    const storedCredentials = readStoredWebCredentialsSync();

    if (storedCredentials) {
      return storedCredentials;
    }

    return (await cacheService.getItem<SavedAccessCredentials | null>(SAVED_ACCESS_CREDENTIALS_KEY, null)) ?? null;
  }

  if (!(await SecureStore.isAvailableAsync())) {
    return (await cacheService.getItem<SavedAccessCredentials | null>(SAVED_ACCESS_CREDENTIALS_KEY, null)) ?? null;
  }

  const raw = await SecureStore.getItemAsync(SAVED_ACCESS_CREDENTIALS_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as SavedAccessCredentials;
  } catch {
    await SecureStore.deleteItemAsync(SAVED_ACCESS_CREDENTIALS_KEY);
    return null;
  }
}

async function writeStoredCredentials(credentials: SavedAccessCredentials | null) {
  writeStoredWebCredentialsSync(credentials);

  if (Platform.OS === "web") {
    if (!credentials) {
      await cacheService.removeItem(SAVED_ACCESS_CREDENTIALS_KEY);
      return;
    }

    await cacheService.setItem(SAVED_ACCESS_CREDENTIALS_KEY, credentials);
    return;
  }

  if (!(await SecureStore.isAvailableAsync())) {
    if (!credentials) {
      await cacheService.removeItem(SAVED_ACCESS_CREDENTIALS_KEY);
      return;
    }

    await cacheService.setItem(SAVED_ACCESS_CREDENTIALS_KEY, credentials);
    return;
  }

  if (!credentials) {
    await SecureStore.deleteItemAsync(SAVED_ACCESS_CREDENTIALS_KEY);
    return;
  }

  await SecureStore.setItemAsync(
    SAVED_ACCESS_CREDENTIALS_KEY,
    JSON.stringify(credentials),
    {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY
    }
  );
}

export const savedAccessService = {
  async isEnabled() {
    return (await cacheService.getItem<boolean>(SAVED_ACCESS_ENABLED_KEY, true)) ?? true;
  },

  async setEnabled(value: boolean) {
    await cacheService.setItem(SAVED_ACCESS_ENABLED_KEY, value);

    if (!value) {
      await writeStoredCredentials(null);
    }
  },

  async rememberCredentials(email: string, password: string) {
    if (!(await this.isEnabled())) {
      await writeStoredCredentials(null);
      return false;
    }

    await writeStoredCredentials({
      email: normalizeEmail(email),
      password
    });

    return true;
  },

  async clearSavedAccess() {
    await writeStoredCredentials(null);
  },

  async resumeSavedAccess() {
    if (!(await this.isEnabled())) {
      return null;
    }

    const credentials = await readStoredCredentials();

    if (!credentials) {
      return null;
    }

    try {
      return await authService.login(credentials.email, credentials.password);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      if (
        message.includes("invalid-credential") ||
        message.includes("local-account-not-found") ||
        message.includes("session-expired")
      ) {
        await writeStoredCredentials(null);
      }

      throw error;
    }
  }
};
