// The tests here cover pure logic only — the rules that decide what the app
// believes, not what it draws. That is deliberate: those functions are the
// ones that have already gone wrong silently (a birthdate a day early, a
// traveler badged LOCAL, a failed read read as "not onboarded"), and none of
// them need a renderer to be checked.
module.exports = {
  preset: 'jest-expo',
  setupFiles: ['<rootDir>/jest.setup.js'],
  testMatch: ['<rootDir>/src/**/*.test.ts', '<rootDir>/src/**/*.test.tsx'],
  // The same aliases tsconfig.json and babel.config.js define. Three places
  // now know this list; they have to agree or imports resolve differently
  // under test than they do in the app.
  moduleNameMapper: {
    '^@app/(.*)$': '<rootDir>/src/app/$1',
    '^@features/(.*)$': '<rootDir>/src/features/$1',
    '^@shared/(.*)$': '<rootDir>/src/shared/$1',
    '^@providers/(.*)$': '<rootDir>/src/providers/$1',
    '^@store$': '<rootDir>/src/store',
    '^@store/(.*)$': '<rootDir>/src/store/$1',
    '^@config/(.*)$': '<rootDir>/src/config/$1',
    '^@theme$': '<rootDir>/src/theme/index',
    '^@theme/(.*)$': '<rootDir>/src/theme/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/i18n/**',
  ],
};
