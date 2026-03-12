import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut
} from "firebase/auth";
import { auth } from "@/services/firebase";
import { AuthUser } from "@/types/finance";

const LOCAL_USER_ID = "local-demo-user";
const DEFAULT_LOCAL_EMAIL = "demo@greenfinance.local";

const localSubscribers = new Set<(user: AuthUser | null) => void>();
let localCurrentUser: AuthUser | null = null;

export function toAuthUser(user: { uid: string; email?: string | null } | null): AuthUser | null {
  return user ? ({ uid: user.uid, email: user.email } as AuthUser) : null;
}

export function mapAuthError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("invalid-credential")) {
    return "Email ou senha inválidos.";
  }
  if (message.includes("email-already-in-use")) {
    return "Este email já está em uso.";
  }
  if (message.includes("weak-password")) {
    return "Use uma senha mais forte.";
  }
  return "Não foi possível concluir a autenticação.";
}

function buildLocalUser(email = DEFAULT_LOCAL_EMAIL): AuthUser {
  return {
    uid: LOCAL_USER_ID,
    email
  };
}

function emitLocalUser(user: AuthUser | null) {
  localCurrentUser = user;
  localSubscribers.forEach((callback) => callback(user));
}

export const authService = {
  async login(email: string, password: string) {
    if (!auth) {
      const localUser = buildLocalUser(email);
      emitLocalUser(localUser);
      return localUser;
    }

    const result = await signInWithEmailAndPassword(auth, email, password);
    return result.user as AuthUser;
  },

  async register(email: string, password: string) {
    if (!auth) {
      const localUser = buildLocalUser(email);
      emitLocalUser(localUser);
      return localUser;
    }

    const result = await createUserWithEmailAndPassword(auth, email, password);
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
