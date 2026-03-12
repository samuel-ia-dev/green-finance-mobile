import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, signOut } from "firebase/auth";
import { authService, mapAuthError, toAuthUser } from "@/services/authService";

describe("authService", () => {
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
    expect(mapAuthError(new Error("auth/invalid-credential"))).toBe("Email ou senha inválidos.");
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

  it("uses local auth mode for login and logout when firebase auth is not configured", async () => {
    jest.resetModules();
    jest.doMock("@/services/firebase", () => ({
      auth: null
    }));

    let isolated: typeof import("@/services/authService");
    jest.isolateModules(() => {
      isolated = require("@/services/authService");
    });

    const user = await isolated!.authService.login("local@example.com", "123456");
    expect(user).toEqual({
      uid: "local-demo-user",
      email: "local@example.com"
    });

    const callback = jest.fn();
    isolated!.authService.subscribe(callback);

    expect(callback).toHaveBeenLastCalledWith({
      uid: "local-demo-user",
      email: "local@example.com"
    });

    await isolated!.authService.logout();
    expect(callback).toHaveBeenLastCalledWith(null);
  });

  it("does not restore a previous local session on a new boot", () => {
    jest.resetModules();
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

  it("registers in local auth mode when firebase auth is not configured", async () => {
    jest.resetModules();
    jest.doMock("@/services/firebase", () => ({
      auth: null
    }));

    let isolated: typeof import("@/services/authService");
    jest.isolateModules(() => {
      isolated = require("@/services/authService");
    });

    const user = await isolated!.authService.register("register@example.com", "123456");

    expect(user).toEqual({
      uid: "local-demo-user",
      email: "register@example.com"
    });
  });

  it("keeps local subscribers in sync during login and logout without persisted bootstrap", async () => {
    jest.resetModules();
    jest.doMock("@/services/firebase", () => ({
      auth: null
    }));

    let isolated: typeof import("@/services/authService");
    jest.isolateModules(() => {
      isolated = require("@/services/authService");
    });

    const callback = jest.fn();
    isolated!.authService.subscribe(callback);

    await isolated!.authService.login("demo@example.com", "123456");
    expect(callback).toHaveBeenLastCalledWith({
      uid: "local-demo-user",
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
