import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApps, initializeApp } from "firebase/app";
import { getAuth, initializeAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

export const firebaseConfig = {
  // Configure as chaves reais do Firebase no arquivo .env seguindo o prefixo EXPO_PUBLIC_.
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID
};

export const missingFirebaseKeys = Object.entries(firebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => `EXPO_PUBLIC_FIREBASE_${key.replace(/[A-Z]/g, (letter) => `_${letter}`).toUpperCase()}`);

const isTestEnv = typeof process.env.JEST_WORKER_ID !== "undefined";
export const isFirebaseConfigured = isTestEnv || missingFirebaseKeys.length === 0;

const existingApp = getApps()[0];
export const firebaseApp = isFirebaseConfigured ? existingApp ?? initializeApp(firebaseConfig) : null;

let firebaseAuthInstance = null;
if (firebaseApp) {
  try {
    const reactNativeAuth = require("firebase/auth/react-native");
    // Em dispositivos nativos a sessão do usuário fica persistida com AsyncStorage.
    firebaseAuthInstance = initializeAuth(firebaseApp, {
      persistence: reactNativeAuth.getReactNativePersistence(AsyncStorage)
    });
  } catch {
    firebaseAuthInstance = getAuth(firebaseApp);
  }
}

export const auth = firebaseAuthInstance;
export const db = firebaseApp ? getFirestore(firebaseApp) : null;
