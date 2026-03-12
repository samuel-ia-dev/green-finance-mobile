module.exports = {
  preset: "jest-expo",
  testMatch: ["**/__tests__/**/*.test.ts", "**/__tests__/**/*.test.tsx"],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  coverageReporters: ["json-summary", "text", "lcov"],
  collectCoverageFrom: [
    "src/services/**/*.{ts,tsx}",
    "src/utils/**/*.{ts,tsx}",
    "src/store/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/types/**"
  ],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1"
  },
  coverageThreshold: {
    global: {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    }
  }
};
