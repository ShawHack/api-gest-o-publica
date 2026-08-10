const mongoose = require('mongoose');
const { requireRole, requireSelfOrAdmin, canEditSepultado } = require('../../helpers/authz');

const oid = () => new mongoose.Types.ObjectId().toString();

describe('authz', () => {
  const res = () => {
    const r = { statusCode: 200, body: null };
    r.status = (code) => {
      r.statusCode = code;
      return r;
    };
    r.json = (body) => {
      r.body = body;
      return r;
    };
    return r;
  };

  test('requireRole permite admin', () => {
    const req = { user: { role: 'admin', id: oid(), _id: oid() } };
    const r = res();
    let nextCalled = false;
    requireRole('admin')(req, r, () => { nextCalled = true; });
    expect(nextCalled).toBe(true);
  });

  test('requireRole nega usuario', () => {
    const req = { user: { role: 'usuario', id: oid(), _id: oid() }, originalUrl: '/x', path: '/x' };
    const r = res();
    let nextCalled = false;
    requireRole('admin')(req, r, () => { nextCalled = true; });
    expect(nextCalled).toBe(false);
    expect(r.statusCode).toBe(403);
  });

  test('requireSelfOrAdmin permite self', () => {
    const id = oid();
    const req = { user: { role: 'usuario', id, _id: id }, params: { id } };
    const r = res();
    let nextCalled = false;
    requireSelfOrAdmin('id')(req, r, () => { nextCalled = true; });
    expect(nextCalled).toBe(true);
  });

  test('requireSelfOrAdmin nega outro usuario', () => {
    const req = { user: { role: 'usuario', id: oid(), _id: oid() }, params: { id: oid() }, originalUrl: '/u', path: '/u' };
    const r = res();
    let nextCalled = false;
    requireSelfOrAdmin('id')(req, r, () => { nextCalled = true; });
    expect(nextCalled).toBe(false);
    expect(r.statusCode).toBe(403);
  });

  test('requireSelfOrAdmin permite admin em outro id', () => {
    const req = { user: { role: 'admin', id: oid(), _id: oid() }, params: { id: oid() } };
    const r = res();
    let nextCalled = false;
    requireSelfOrAdmin('id')(req, r, () => { nextCalled = true; });
    expect(nextCalled).toBe(true);
  });

  test('canEditSepultado — admin, concessionario e usuario', () => {
    const concId = oid();
    const sep = { concessionarios: [concId] };
    expect(canEditSepultado(null, sep)).toBe(false);
    expect(canEditSepultado({ role: 'admin', id: oid() }, sep)).toBe(true);
    expect(canEditSepultado({ role: 'concessionario', id: concId }, sep)).toBe(true);
    expect(canEditSepultado({ role: 'concessionario', id: oid() }, sep)).toBe(false);
    expect(canEditSepultado({ role: 'usuario', id: oid() }, sep)).toBe(false);
  });
});
