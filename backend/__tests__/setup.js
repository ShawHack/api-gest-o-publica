process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-ci-only';
process.env.RATE_LIMIT_MAX = '0';
process.env.TRUST_PROXY = '0';
process.env.CORS_ORIGIN = 'http://localhost:3000';
