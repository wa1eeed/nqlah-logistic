/**
 * Unit tests for the API. Specs live next to the code as `*.spec.ts`.
 * ts-jest compiles against the app tsconfig; isolatedModules keeps runs fast
 * (per-file transpile, no cross-file type-check — `tsc --noEmit` covers types).
 */
/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { isolatedModules: true }],
  },
};
