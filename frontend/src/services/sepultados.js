
// src/services/sepultados.js
import api from '../utils/api';

// Atribui um concessionário ao sepultado (admin-only na API)
export async function assignConcessionario(sepultadoId, userId) {
  const res = await api.patch(`/sepultados/${sepultadoId}/atribuir/${userId}`);
  return res.data;
}

// Remove a atribuição (admin-only)
export async function unassignConcessionario(sepultadoId, userId) {
  const res = await api.patch(`/sepultados/${sepultadoId}/desatribuir/${userId}`);
  return res.data;
}
