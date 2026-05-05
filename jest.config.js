/** @type {import('jest').Config} */
module.exports = {
  clearMocks: true,
  moduleFileExtensions: ["js", "ts"],
  testEnvironment: "node",
  testMatch: ["**/__tests__/**/*.test.ts"],
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        tsconfig: "tsconfig.test.json",
      },
    ],
  },
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/*.d.ts",
    "!src/index.ts",
  ],
  coverageReporters: ["text", "text-summary", "lcov", "html"],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 65,
      lines: 60,
      statements: 60,
    },
  },
  verbose: true,
};

const processStdoutWrite = process.stdout.write.bind(process.stdout);
process.stdout.write = (str, encoding, cb) => {
  // Core library will directly call process.stdout.write for runner commands.
  // We don't want :: commands to be executed by the runner during tests.
  if (typeof str === "string" && !str.match(/^::/)) {
    return processStdoutWrite(str, encoding, cb);
  }
  return true;
};

