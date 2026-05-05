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
  coverageReporters: ["text", "text-summary", "lcov", "html", "cobertura"],
  // Default reporter (console output) + JUnit XML for CI artifacts. The
  // jest-junit reporter is configured via `reporterOptions` below; the
  // file lands at coverage/junit.xml so it ships alongside the coverage
  // reports in a single artifact upload.
  reporters: [
    "default",
    [
      "jest-junit",
      {
        outputDirectory: "coverage",
        outputName: "junit.xml",
        suiteNameTemplate: "{filepath}",
        classNameTemplate: "{classname}",
        titleTemplate: "{title}",
        ancestorSeparator: " › ",
        addFileAttribute: "true",
        includeConsoleOutput: "false",
      },
    ],
  ],
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 93,
      lines: 85,
      statements: 85,
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

