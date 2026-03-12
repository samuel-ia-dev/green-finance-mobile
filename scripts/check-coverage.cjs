/* eslint-env node */
const fs = require("fs");
const path = require("path");

const summaryPath = path.join(__dirname, "..", "coverage", "coverage-summary.json");
const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));

const minimums = {
  statements: 95,
  branches: 95,
  functions: 95,
  lines: 95
};

const criticalFiles = [
  "src/services/authService.ts",
  "src/services/cacheService.ts",
  "src/services/exportService.ts",
  "src/services/firebase.ts",
  "src/services/firestoreService.ts",
  "src/store/useFinanceStore.ts",
  "src/utils/categorySuggestion.ts",
  "src/utils/dashboard.ts",
  "src/utils/format.ts",
  "src/utils/historyFilters.ts",
  "src/utils/insights.ts",
  "src/utils/recurring.ts"
];

function findSummaryItem(file) {
  const normalized = file.replace(/\//g, "\\");
  return summary[file] ?? summary[normalized] ?? Object.entries(summary).find(([key]) => key.endsWith(normalized))?.[1];
}

function assertThreshold(name, current, expected) {
  if (current < expected) {
    throw new Error(`${name} coverage ${current} below ${expected}`);
  }
}

Object.entries(minimums).forEach(([key, expected]) => {
  assertThreshold(`global ${key}`, summary.total[key].pct, expected);
});

criticalFiles.forEach((file) => {
  const item = findSummaryItem(file);
  if (!item) {
    throw new Error(`coverage summary missing ${file}`);
  }
  ["statements", "branches", "functions", "lines"].forEach((metric) => {
    assertThreshold(`${file} ${metric}`, item[metric].pct, 100);
  });
});

console.log("coverage thresholds satisfied");
