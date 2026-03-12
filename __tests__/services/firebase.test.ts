describe("firebase bootstrap", () => {
  const originalEnv = process.env;

  afterEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  it("initializes auth with RN persistence when available", () => {
    jest.doMock("firebase/app", () => ({
      getApps: jest.fn(() => []),
      initializeApp: jest.fn(() => ({ name: "app" }))
    }));
    jest.doMock("firebase/auth", () => ({
      getAuth: jest.fn(() => ({ kind: "fallback" })),
      initializeAuth: jest.fn(() => ({ kind: "persistence" }))
    }));
    jest.doMock(
      "firebase/auth/react-native",
      () => ({
        getReactNativePersistence: jest.fn(() => "persistence")
      }),
      { virtual: true }
    );
    jest.doMock("firebase/firestore", () => ({
      getFirestore: jest.fn(() => ({ name: "db" }))
    }));

    let firebaseModule: typeof import("@/services/firebase");
    jest.isolateModules(() => {
      firebaseModule = require("@/services/firebase");
    });

    expect(firebaseModule!.isFirebaseConfigured).toBe(true);
    expect(firebaseModule!.auth).toEqual({ kind: "persistence" });
    expect(firebaseModule!.db).toEqual({ name: "db" });
  });

  it("falls back to getAuth when RN persistence is unavailable", () => {
    jest.doMock("firebase/app", () => ({
      getApps: jest.fn(() => [{ name: "existing-app" }]),
      initializeApp: jest.fn()
    }));
    jest.doMock("firebase/auth", () => ({
      getAuth: jest.fn(() => ({ kind: "fallback" })),
      initializeAuth: jest.fn(() => {
        throw new Error("rn unavailable");
      })
    }));
    jest.doMock("firebase/firestore", () => ({
      getFirestore: jest.fn(() => ({ name: "db" }))
    }));

    let firebaseModule: typeof import("@/services/firebase");
    jest.isolateModules(() => {
      firebaseModule = require("@/services/firebase");
    });

    expect(firebaseModule!.firebaseApp).toEqual({ name: "existing-app" });
    expect(firebaseModule!.auth).toEqual({ kind: "fallback" });
  });

  it("keeps firebase disabled when env is missing outside jest runtime", () => {
    delete process.env.JEST_WORKER_ID;
    jest.doMock("firebase/app", () => ({
      getApps: jest.fn(() => []),
      initializeApp: jest.fn()
    }));
    jest.doMock("firebase/auth", () => ({
      getAuth: jest.fn(),
      initializeAuth: jest.fn()
    }));
    jest.doMock("firebase/firestore", () => ({
      getFirestore: jest.fn()
    }));

    let firebaseModule: typeof import("@/services/firebase");
    jest.isolateModules(() => {
      firebaseModule = require("@/services/firebase");
    });

    expect(firebaseModule!.isFirebaseConfigured).toBe(false);
    expect(firebaseModule!.firebaseApp).toBeNull();
    expect(firebaseModule!.auth).toBeNull();
    expect(firebaseModule!.db).toBeNull();
  });
});
