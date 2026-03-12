import "@testing-library/jest-native/extend-expect";

jest.mock("@react-native-async-storage/async-storage", () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"));

jest.mock("expo-sharing", () => ({
  isAvailableAsync: jest.fn().mockResolvedValue(true),
  shareAsync: jest.fn().mockResolvedValue(undefined)
}));

jest.mock("expo-file-system", () => ({
  documentDirectory: "file:///mock-docs/",
  writeAsStringAsync: jest.fn().mockResolvedValue(undefined)
}));

jest.mock("expo-print", () => ({
  printToFileAsync: jest.fn().mockResolvedValue({ uri: "file:///mock-docs/report.pdf" })
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: ({ name }: { name: string }) => {
    const React = require("react");
    const { Text } = require("react-native");
    return React.createElement(Text, null, name);
  }
}));

jest.mock("firebase/app", () => ({
  getApps: jest.fn(() => []),
  initializeApp: jest.fn(() => ({ name: "test-app" }))
}));

jest.mock("firebase/auth", () => ({
  getAuth: jest.fn(() => ({ currentUser: null })),
  initializeAuth: jest.fn(() => ({ currentUser: null })),
  onAuthStateChanged: jest.fn((_auth, callback) => {
    callback(null);
    return jest.fn();
  }),
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  signOut: jest.fn()
}));

jest.mock(
  "firebase/auth/react-native",
  () => ({
    getReactNativePersistence: jest.fn(() => "persistence")
  }),
  { virtual: true }
);

jest.mock("firebase/firestore", () => ({
  getFirestore: jest.fn(() => ({ name: "firestore" })),
  collection: jest.fn((_db, path) => path),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  doc: jest.fn((_db, path, id) => `${path}/${id}`),
  serverTimestamp: jest.fn(() => "SERVER_TIMESTAMP"),
  onSnapshot: jest.fn((_query, callback) => {
    callback({
      docs: []
    });
    return jest.fn();
  }),
  query: jest.fn((_collectionRef) => _collectionRef),
  where: jest.fn(() => "where"),
  orderBy: jest.fn(() => "orderBy"),
  setDoc: jest.fn(),
  getDocs: jest.fn().mockResolvedValue({ docs: [] })
}));
