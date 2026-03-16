import { cacheService } from "@/services/cacheService";
import { AuthUser, Category, FinanceHydrationPayload, Goal, Transaction, UserSettings } from "@/types/finance";

type RemoteSession = {
  token: string;
  user: AuthUser;
};

const REMOTE_SESSION_KEY = "green-finance.remote-session";
const inlineRemoteApiBaseUrl = process.env.EXPO_PUBLIC_REMOTE_API_BASE_URL;

function getGlobalRemoteApiBaseUrlOverride() {
  const override = (globalThis as typeof globalThis & { __GREEN_FINANCE_REMOTE_API_BASE_URL__?: string })
    .__GREEN_FINANCE_REMOTE_API_BASE_URL__;

  if (typeof override !== "string") {
    return null;
  }

  return override.trim().replace(/\/+$/, "");
}

let cachedRemoteSession: RemoteSession | null | undefined;

function buildAuthError(code: string) {
  return new Error(`auth/${code}`);
}

function getRemoteApiBaseUrl() {
  const globalOverride = getGlobalRemoteApiBaseUrlOverride();

  if (globalOverride !== null) {
    return globalOverride;
  }

  const runtimeBaseUrl =
    typeof process !== "undefined" ? process.env?.["EXPO_PUBLIC_REMOTE_API_BASE_URL"]?.trim().replace(/\/+$/, "") : "";

  if (runtimeBaseUrl) {
    return runtimeBaseUrl;
  }

  return inlineRemoteApiBaseUrl?.trim().replace(/\/+$/, "") || "";
}

function ensureRemoteBackendConfigured() {
  const baseUrl = getRemoteApiBaseUrl();

  if (!baseUrl) {
    throw buildAuthError("remote-backend-not-configured");
  }

  return baseUrl;
}

async function getRemoteSession() {
  if (typeof cachedRemoteSession !== "undefined") {
    return cachedRemoteSession;
  }

  cachedRemoteSession = (await cacheService.getItem<RemoteSession | null>(REMOTE_SESSION_KEY, null)) ?? null;
  return cachedRemoteSession;
}

async function setRemoteSession(session: RemoteSession | null) {
  cachedRemoteSession = session;

  if (!session) {
    await cacheService.removeItem(REMOTE_SESSION_KEY);
    return;
  }

  await cacheService.setItem(REMOTE_SESSION_KEY, session);
}

async function requestRemote<T>(
  path: string,
  init: Omit<RequestInit, "body" | "headers"> & {
    body?: unknown;
    headers?: Record<string, string>;
    skipAuth?: boolean;
  } = {}
) {
  const baseUrl = ensureRemoteBackendConfigured();
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(init.headers ?? {})
  };

  if (typeof init.body !== "undefined") {
    headers["Content-Type"] = "application/json";
  }

  if (!init.skipAuth) {
    const session = await getRemoteSession();

    if (!session?.token) {
      throw buildAuthError("session-expired");
    }

    headers.Authorization = `Bearer ${session.token}`;
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers,
    body: typeof init.body === "undefined" ? undefined : JSON.stringify(init.body)
  });

  const raw = await response.text();
  let payload = null;

  if (raw) {
    try {
      payload = JSON.parse(raw);
    } catch {
      payload = {
        error: raw
      };
    }
  }

  if (!response.ok) {
    throw buildAuthError(typeof payload?.error === "string" ? payload.error : `http-${response.status}`);
  }

  return payload as T;
}

type BulkUpsertCollection = "categories" | "goals" | "transactions";

export function isRemoteBackendConfigured() {
  return Boolean(getRemoteApiBaseUrl());
}

export const remoteBackendService = {
  isConfigured() {
    return isRemoteBackendConfigured();
  },

  async restoreSession() {
    const session = await getRemoteSession();

    if (!session?.token) {
      return null;
    }

    const payload = await requestRemote<{ user: AuthUser }>("/auth/session");
    const nextSession = {
      token: session.token,
      user: payload.user
    };
    await setRemoteSession(nextSession);
    return nextSession.user;
  },

  async login(email: string, password: string) {
    const payload = await requestRemote<RemoteSession>("/auth/login", {
      method: "POST",
      body: {
        email,
        password
      },
      skipAuth: true
    });

    await setRemoteSession(payload);
    return payload.user;
  },

  async register(email: string, password: string) {
    const payload = await requestRemote<RemoteSession>("/auth/register", {
      method: "POST",
      body: {
        email,
        password
      },
      skipAuth: true
    });

    await setRemoteSession(payload);
    return payload.user;
  },

  async logout() {
    const session = await getRemoteSession();

    if (session?.token) {
      await requestRemote("/auth/logout", {
        method: "POST"
      }).catch(() => undefined);
    }

    await setRemoteSession(null);
  },

  async getFinanceBootstrap() {
    return requestRemote<FinanceHydrationPayload>("/bootstrap");
  },

  async bulkUpsert<T extends Category | Goal | Transaction>(collection: BulkUpsertCollection, items: T[]) {
    if (!items.length) {
      return;
    }

    await requestRemote(`/${collection}/bulk-upsert`, {
      method: "POST",
      body: {
        items
      }
    });
  },

  async patchTransaction(id: string, input: Partial<Transaction>) {
    await requestRemote(`/transactions/${id}`, {
      method: "PATCH",
      body: input
    });
  },

  async deleteTransaction(id: string) {
    await requestRemote(`/transactions/${id}`, {
      method: "DELETE"
    });
  },

  async saveSettings(settings: UserSettings) {
    await requestRemote("/settings", {
      method: "PUT",
      body: settings
    });
  },

  async patchGoal(id: string, input: Partial<Goal>) {
    await requestRemote(`/goals/${id}`, {
      method: "PATCH",
      body: input
    });
  }
};
