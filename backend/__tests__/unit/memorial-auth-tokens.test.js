const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const User = require('../../models/User');
const UserRefreshToken = require('../../models/UserRefreshToken');
const {
  signAccess,
  issueRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  ACCESS_TTL,
} = require('../../helpers/memorial-auth-tokens');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

describe('memorial-auth-tokens', () => {
  test('signAccess gera JWT com id e role', () => {
    const user = { _id: new mongoose.Types.ObjectId(), name: 'Ana', role: 'Admin' };
    const token = signAccess(user);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    expect(decoded.id).toBe(String(user._id));
    expect(decoded.role).toBe('admin');
    expect(ACCESS_TTL).toBeTruthy();
  });

  test('rotateRefreshToken rotaciona e invalida token antigo', async () => {
    const user = await User.create({
      name: 'Refresh User',
      email: 'mem-tok@test.local',
      password: 'hash',
      phone: '16999990099',
      role: 'usuario',
      emailVerified: true,
    });
    const raw = await issueRefreshToken(user._id);
    const first = await rotateRefreshToken(raw);
    expect(first.accessToken).toBeTruthy();
    expect(first.refreshToken).not.toBe(raw);

    const replay = await rotateRefreshToken(raw);
    expect(replay).toBeNull();
  });

  test('revokeRefreshToken impede renovação', async () => {
    const user = await User.create({
      name: 'Logout User',
      email: 'mem-revoke@test.local',
      password: 'hash',
      phone: '16999990098',
      role: 'usuario',
      emailVerified: true,
    });
    const raw = await issueRefreshToken(user._id);
    await revokeRefreshToken(raw);
    const rotated = await rotateRefreshToken(raw);
    expect(rotated).toBeNull();
    const count = await UserRefreshToken.countDocuments({ userId: user._id });
    expect(count).toBe(0);
  });
});
