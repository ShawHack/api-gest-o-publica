/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  setupFiles: ['<rootDir>/__tests__/setup.js'],
  testTimeout: 30000,
  // Gate ≥40% nos módulos críticos (auth, helpers, votação). Controllers grandes fora do gate até Fase 3.
  collectCoverageFrom: [
    'helpers/authz.js',
    'helpers/verify-token.js',
    'helpers/verify-api-key.js',
    'helpers/memorial-auth-tokens.js',
    'helpers/validate-cpf.js',
    'helpers/validate-password.js',
    'helpers/voting-identity-hash.js',
    'helpers/get-token.js',
    'helpers/get-user-by-token.js',
    'controllers/VotingAuthController.js',
    'routes/MedicamentosRoutes.js',
  ],
  coverageThreshold: {
    global: {
      lines: 40,
      statements: 40,
      branches: 35,
      functions: 40,
    },
  },
};
