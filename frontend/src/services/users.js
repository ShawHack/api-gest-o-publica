 // frontend/src/services/users.js
import api from '../utils/api';

export async function fetchConcessionarios() {
  const res = await api.get('/users/concessionarios');
  const data = res.data;

  // aceita array puro ou { items: [...] }
  const list = Array.isArray(data)
    ? data
    : (Array.isArray(data?.items) ? data.items : []);

  return list;
}
