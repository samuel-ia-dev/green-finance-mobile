import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut
} from "firebase/auth";
import { cacheService } from "@/services/cacheService";
import { auth } from "@/services/firebase";
import { AuthUser } from "@/types/finance";

const LOCAL_ACCOUNTS_KEY = "green-finance.local-accounts";

const localSubscribers = new Set<(user: AuthUser | null) => void>();
let localCurrentUser: AuthUser | null = null;

type LocalAccount = {
  uid: string;
  email: string;
  password: string;
};

export function toAuthUser(user: { uid: string; email?: string | null } | null): AuthUser | null {
  return user ? ({ uid: user.uid, email: user.email } as AuthUser) : null;
}

export function mapAuthError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("missing-credentials")) {
    return "Preencha email e senha.";
  }
  if (message.includes("invalid-email")) {
    return "Digite um email válido.";
  }
  if (message.includes("invalid-credential")) {
    return "Email ou senha inválidos.";
  }
  if (message.includes("local-account-not-found")) {
    return "Nenhuma conta encontrada para este email. Crie seu primeiro acesso.";
  }
  if (message.includes("biometric-not-available")) {
    return "A biometria não está disponível neste aparelho.";
  }
  if (message.includes("biometric-not-configured")) {
    return "Entre com email e senha uma vez para ativar a biometria neste aparelho.";
  }
  if (message.includes("biometric-cancelled")) {
    return "A autenticação biométrica foi cancelada.";
  }
  if (message.includes("biometric-failed")) {
    return "Não foi possível validar sua biometria.";
  }
  if (message.includes("email-already-in-use")) {
    return "Este email já está em uso.";
  }
  if (message.includes("weak-password")) {
    return "Use uma senha mais forte.";
  }
  return "Não foi possível concluir a autenticação.";
}

function buildLocalUser(uid: string, email: string): AuthUser {
  return {
    uid,
    email
  };
}

function emitLocalUser(user: AuthUser | null) {
  localCurrentUser = user;
  localSubscribers.forEach((callback) => callback(user));
}

function createAuthError(code: string) {
  return new Error(`auth/${code}`);
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function validateCredentials(email: string, password: string, mode: "login" | "register") {
  const normalizedEmail = normalizeEmail(email);
  const normalizedPassword = password;

  if (!normalizedEmail || !normalizedPassword.trim()) {
    throw createAuthError("missing-credentials");
  }

  const isValidEmail = /\S+@\S+\.\S+/.test(normalizedEmail);
  if (!isValidEmail) {
    throw createAuthError("invalid-email");
  }

  if (mode === "register" && normalizedPassword.length < 6) {
    throw createAuthError("weak-password");
  }

  return {
    normalizedEmail,
    normalizedPassword
  };
}

async function getLocalAccounts() {
  return (await cacheService.getItem<Record<string, LocalAccount>>(LOCAL_ACCOUNTS_KEY, {})) ?? {};
}

async function saveLocalAccounts(accounts: Record<string, LocalAccount>) {
  await cacheService.setItem(LOCAL_ACCOUNTS_KEY, accounts);
}

function buildLocalUid(email: string) {
  return `local-${email.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "user"}`;
}

export const authService = {
  async login(email: string, password: string) {
    const { normalizedEmail, normalizedPassword } = validateCredentials(email, password, "login");

    if (!auth) {
      const localAccounts = await getLocalAccounts();
      const account = localAccounts[normalizedEmail];

      if (!account) {
        throw createAuthError("local-account-not-found");
      }

      if (account.password !== normalizedPassword) {
        throw createAuthError("invalid-credential");
      }

      const localUser = buildLocalUser(account.uid, account.email);
      emitLocalUser(localUser);
      return localUser;
    }

    const result = await signInWithEmailAndPassword(auth, normalizedEmail, normalizedPassword);
    return result.user as AuthUser;
  },

  async register(email: string, password: string) {
    const { normalizedEmail, normalizedPassword } = validateCredentials(email, password, "register");

    if (!auth) {
      const localAccounts = await getLocalAccounts();

      if (localAccounts[normalizedEmail]) {
        throw createAuthError("email-already-in-use");
      }

      const account: LocalAccount = {
        uid: buildLocalUid(normalizedEmail),
        email: normalizedEmail,
        password: normalizedPassword
      };

      await saveLocalAccounts({
        ...localAccounts,
        [normalizedEmail]: account
      });

      const localUser = buildLocalUser(account.uid, account.email);
      emitLocalUser(localUser);
      return localUser;
    }

    const result = await createUserWithEmailAndPassword(auth, normalizedEmail, normalizedPassword);
    return result.user as AuthUser;
  },

  async resetPassword(email: string) {
    if (!auth) {
      return undefined;
    }

    await sendPasswordResetEmail(auth, email);
  },

  async logout() {
    if (!auth) {
      emitLocalUser(null);
      return;
    }

    await signOut(auth);
  },

  subscribe(callback: (user: AuthUser | null) => void) {
    if (!auth) {
      localSubscribers.add(callback);
      callback(localCurrentUser);

      return () => {
        localSubscribers.delete(callback);
      };
    }

    function nextUserHandler(user: { uid: string; email?: string | null } | null) {
      callback(toAuthUser(user));
    }

    return onAuthStateChanged(auth, nextUserHandler);
  }
};
