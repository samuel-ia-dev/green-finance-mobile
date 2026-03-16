import AsyncStorage from "@react-native-async-storage/async-storage";
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, signOut } from "firebase/auth";
import { authService, mapAuthError, toAuthUser } from "@/services/authService";

describe("authService", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  it("logs in using firebase auth", async () => {
    (signInWithEmailAndPassword as jest.Mock).mockResolvedValueOnce({ user: { uid: "1" } });

    const user = await authService.login("john@example.com", "secret123");

    expect(signInWithEmailAndPassword).toHaveBeenCalled();
    expect(user.uid).toBe("1");
  });

  it("creates an account", async () => {
    (createUserWithEmailAndPassword as jest.Mock).mockResolvedValueOnce({ user: { uid: "2" } });

    const user = await authService.register("jane@example.com", "secret123");

    expect(createUserWithEmailAndPassword).toHaveBeenCalled();
    expect(user.uid).toBe("2");
  });

  it("requests a password reset", async () => {
    (sendPasswordResetEmail as jest.Mock).mockResolvedValueOnce(undefined);

    await authService.resetPassword("reset@example.com");

    expect(sendPasswordResetEmail).toHaveBeenCalled();
  });

  it("logs out", async () => {
    (signOut as jest.Mock).mockResolvedValueOnce(undefined);

    await authService.logout();

    expect(signOut).toHaveBeenCalled();
  });

  it("maps firebase auth errors to friendly messages", () => {
    expect(mapAuthError(new Error("auth/missing-credentials"))).toBe("Preencha email e senha.");
    expect(mapAuthError(new Error("auth/invalid-email"))).toBe("Digite um email válido.");
    expect(mapAuthError(new Error("auth/invalid-credential"))).toBe("Email ou senha inválidos.");
    expect(mapAuthError(new Error("auth/local-account-not-found"))).toBe("Nenhuma conta encontrada para este email. Crie seu primeiro acesso.");
    expect(mapAuthError(new Error("auth/biometric-not-available"))).toBe("A biometria não está disponível neste aparelho.");
    expect(mapAuthError(new Error("auth/biometric-not-configured"))).toBe("Entre com email e senha uma vez para ativar a biometria neste aparelho.");
    expect(mapAuthError(new Error("auth/biometric-cancelled"))).toBe("A autenticação biométrica foi cancelada.");
    expect(mapAuthError(new Error("auth/biometric-failed"))).toBe("Não foi possível validar sua biometria.");
    expect(mapAuthError(new Error("auth/email-already-in-use"))).toBe("Este email já está em uso.");
    expect(mapAuthError(new Error("auth/weak-password"))).toBe("Use uma senha mais forte.");
    expect(mapAuthError(new Error("random-error"))).toBe("Não foi possível concluir a autenticação.");
    expect(mapAuthError("plain-text-error")).toBe("Não foi possível concluir a autenticação.");
  });

  it("subscribes to auth changes", () => {
    const callback = jest.fn();
    (onAuthStateChanged as jest.Mock).mockImplementationOnce((_auth, next) => {
      next({ uid: "3", email: "user@example.com" });
      return jest.fn();
    });
    const unsubscribe = authService.subscribe(callback);

    expect(callback).toHaveBeenCalledWith({ uid: "3", email: "user@example.com" });
    expect(typeof unsubscribe).toBe("function");
  });

  it("handles null auth changes in subscriptions", () => {
    const callback = jest.fn();
    (onAuthStateChanged as jest.Mock).mockImplementationOnce((_auth, next) => {
      next(null);
      return jest.fn();
    });

    authService.subscribe(callback);

    expect(callback).toHaveBeenCalledWith(null);
  });

  it("resets password as a no-op when auth is not configured", async () => {
    jest.resetModules();
    jest.dontMock("@/services/cacheService");
    jest.doMock("@/services/firebase", () => ({
      auth: null
    }));

    let isolated: typeof import("@/services/authService");
    jest.isolateModules(() => {
      isolated = require("@/services/authService");
    });

    await expect(isolated!.authService.resetPassword("local@example.com")).resolves.toBeUndefined();
  });

  it("returns a cleanup function in local auth mode when firebase is not configured", async () => {
    jest.resetModules();
    jest.dontMock("@/services/cacheService");
    jest.doMock("@/services/firebase", () => ({
      auth: null
    }));

    let isolated: typeof import("@/services/authService");
    jest.isolateModules(() => {
      isolated = require("@/services/authService");
    });

    const callback = jest.fn();
    const unsubscribe = isolated!.authService.subscribe(callback);

    expect(callback).toHaveBeenCalledWith(null);
    expect(unsubscribe()).toBeUndefined();
  });

  it("starts local auth mode logged out when firebase auth is not configured", () => {
    jest.resetModules();
    jest.dontMock("@/services/cacheService");
    jest.doMock("@/services/firebase", () => ({
      auth: null
    }));

    let isolated: typeof import("@/services/authService");
    jest.isolateModules(() => {
      isolated = require("@/services/authService");
    });

    const callback = jest.fn();
    isolated!.authService.subscribe(callback);

    expect(callback).toHaveBeenCalledWith(null);
  });

  it("requires a created local account before allowing login when firebase auth is not configured", async () => {
    jest.resetModules();
    jest.dontMock("@/services/cacheService");
    jest.doMock("@/services/firebase", () => ({
      auth: null
    }));

    let isolated: typeof import("@/services/authService");
    jest.isolateModules(() => {
      isolated = require("@/services/authService");
    });

    await expect(isolated!.authService.login("local@example.com", "123456")).rejects.toThrow("auth/local-account-not-found");
  });

  it("does not restore a previous local session on a new boot", async () => {
    jest.resetModules();
    jest.dontMock("@/services/cacheService");
    jest.doMock("@/services/firebase", () => ({
      auth: null
    }));

    let isolated: typeof import("@/services/authService");
    jest.isolateModules(() => {
      isolated = require("@/services/authService");
    });

    await isolated!.authService.register("persisted@example.com", "123456");
    await isolated!.authService.logout();

    jest.resetModules();
    jest.doMock("@/services/firebase", () => ({
      auth: null
    }));

    jest.isolateModules(() => {
      isolated = require("@/services/authService");
    });

    const callback = jest.fn();
    isolated!.authService.subscribe(callback);

    expect(callback).toHaveBeenCalledWith(null);
  });

  it("registers in local auth mode when firebase auth is not configured", async () => {
    jest.resetModules();
    jest.dontMock("@/services/cacheService");
    jest.doMock("@/services/firebase", () => ({
      auth: null
    }));

    let isolated: typeof import("@/services/authService");
    jest.isolateModules(() => {
      isolated = require("@/services/authService");
    });

    const user = await isolated!.authService.register("register@example.com", "123456");

    expect(user).toEqual({
      uid: "local-register-example-com",
      email: "register@example.com"
    });
  });

  it("logs in with a registered local account after a fresh boot without restoring the session automatically", async () => {
    jest.resetModules();
    jest.doMock("@/services/firebase", () => ({
      auth: null
    }));
    jest.doMock("@/services/cacheService", () => ({
      cacheService: {
        getItem: jest.fn().mockResolvedValue({
          "fresh@example.com": {
            uid: "local-fresh-example-com",
            email: "fresh@example.com",
            password: "123456"
          }
        }),
        setItem: jest.fn(),
        removeItem: jest.fn()
      }
    }));

    let isolated: typeof import("@/services/authService");
    jest.isolateModules(() => {
      isolated = require("@/services/authService");
    });

    const callback = jest.fn();
    isolated!.authService.subscribe(callback);
    expect(callback).toHaveBeenCalledWith(null);

    const user = await isolated!.authService.login("fresh@example.com", "123456");
    expect(user).toEqual({
      uid: "local-fresh-example-com",
      email: "fresh@example.com"
    });
  });

  it("rejects invalid local credentials when the password does not match", async () => {
    jest.resetModules();
    jest.dontMock("@/services/cacheService");
    jest.doMock("@/services/firebase", () => ({
      auth: null
    }));

    let isolated: typeof import("@/services/authService");
    jest.isolateModules(() => {
      isolated = require("@/services/authService");
    });

    await isolated!.authService.register("wrongpass@example.com", "123456");
    await isolated!.authService.logout();

    await expect(isolated!.authService.login("wrongpass@example.com", "654321")).rejects.toThrow("auth/invalid-credential");
  });

  it("prevents duplicate local registration for the same email", async () => {
    jest.resetModules();
    jest.dontMock("@/services/cacheService");
    jest.doMock("@/services/firebase", () => ({
      auth: null
    }));

    let isolated: typeof import("@/services/authService");
    jest.isolateModules(() => {
      isolated = require("@/services/authService");
    });

    await isolated!.authService.register("duplicate@example.com", "123456");

    await expect(isolated!.authService.register("duplicate@example.com", "123456")).rejects.toThrow("auth/email-already-in-use");
  });

  it("keeps local subscribers in sync during login and logout without persisted bootstrap", async () => {
    jest.resetModules();
    jest.dontMock("@/services/cacheService");
    jest.doMock("@/services/firebase", () => ({
      auth: null
    }));

    let isolated: typeof import("@/services/authService");
    jest.isolateModules(() => {
      isolated = require("@/services/authService");
    });

    const callback = jest.fn();
    isolated!.authService.subscribe(callback);

    await isolated!.authService.register("demo@example.com", "123456");
    expect(callback).toHaveBeenLastCalledWith({
      uid: "local-demo-example-com",
      email: "demo@example.com"
    });

    await isolated!.authService.logout();
    expect(callback).toHaveBeenLastCalledWith(null);
  });

  it("normalizes firebase users into auth users", () => {
    expect(toAuthUser({ uid: "7", email: "mail@test.com" })).toEqual({ uid: "7", email: "mail@test.com" });
    expect(toAuthUser(null)).toBeNull();
  });
});
