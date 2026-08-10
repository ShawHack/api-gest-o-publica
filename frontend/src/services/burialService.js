import api from '../utils/api';
import { mapBurialListResponse } from '../utils/burialMappers';
import { deduplicateBurials } from '../utils/burialDeduplication';

let activeController = null;

export async function fetchRecentBurials(limit = 10) {
  const { data } = await api.get('/sepultados', {
    params: { page: 1, limit },
  });
  const mapped = mapBurialListResponse(data);
  return {
    ...mapped,
    items: deduplicateBurials(mapped.items).slice(0, limit),
  };
}

export async function searchBurials(filters = {}) {
  const q = String(filters.q || '').trim();
  if (q.length < 2) {
    return {
      items: [],
      total: 0,
      page: 1,
      pages: 1,
      limit: filters.limit || 20,
      searchTerm: q,
      ordem: filters.ordem || 'relevancia',
    };
  }

  if (activeController) activeController.abort();
  activeController = new AbortController();

  const params = {
    q,
    page: filters.page || 1,
    limit: filters.limit || 20,
    ordem: filters.ordem || 'relevancia',
  };
  if (filters.rua) params.rua = filters.rua;
  if (filters.quadra) params.quadra = filters.quadra;
  if (filters.chapa) params.chapa = filters.chapa;
  if (filters.setor) params.setor = filters.setor;
  if (filters.anoFalecimento) params.anoFalecimento = filters.anoFalecimento;
  if (filters.comFoto) params.comFoto = '1';

  const { data } = await api.get('/sepultados/pesquisa', {
    params,
    signal: activeController.signal,
  });

  const mapped = mapBurialListResponse(data);
  return {
    ...mapped,
    items: deduplicateBurials(mapped.items),
  };
}

export async function fetchBurialSuggestions(term) {
  const q = String(term || '').trim();
  if (q.length < 2) return [];
  const { data } = await api.get('/sepultados/sugestoes', { params: { q } });
  const list = data?.suggestions || [];
  return deduplicateBurials(
    list.map((s) => ({
      id: s._id,
      fullName: s.nome,
      street: s.rua,
      block: s.quadra,
      plate: s.chapa,
    }))
  );
}

export async function resolveMapPlusCode(quadra) {
  const normalized = String(quadra || '').trim();
  if (!normalized) return null;
  const { data } = await api.get(`/dloc/${encodeURIComponent(normalized)}`);
  return data?.pluscode || null;
}

export function openGoogleMaps(pluscode) {
  if (!pluscode) return false;
  const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pluscode)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
  return true;
}
