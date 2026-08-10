const IMG_BASE = '';

function cleanImage(raw) {
  const cleaned = typeof raw === 'string' ? raw.trim() : '';
  if (!cleaned || cleaned === 'null' || cleaned === 'undefined' || cleaned === '/') {
    return null;
  }
  return `${IMG_BASE}/images/sepultados/${cleaned}`;
}

function initialsFromName(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Normaliza registro da API para a UI de busca. */
export function mapBurialFromApi(raw = {}) {
  const id = raw._id || raw.id || '';
  const fullName = raw.nome || raw.fullName || '';
  const photoUrl = cleanImage(raw.images?.[0]);

  return {
    id: String(id),
    fullName,
    birthDate: raw.dtNasc || raw.birthDate || null,
    deathDate: raw.dtFal || raw.deathDate || null,
    photoUrl,
    initials: initialsFromName(fullName),
    street: raw.rua || raw.street || null,
    block: raw.quadra || raw.block || null,
    plate: raw.chapa || raw.plate || null,
    sector: raw.quadraNome || raw.setor || raw.sector || null,
    burialType: raw.tipoSepultura || raw.burialType || null,
    plusCode: raw.plusCodePreciso || raw.plusCodeQuadra || null,
    latitude: raw.location?.coordinates?.[1] ?? null,
    longitude: raw.location?.coordinates?.[0] ?? null,
    hasLocation: Boolean(
      raw.rua || raw.quadra || raw.chapa || raw.plusCodeQuadra || raw.location?.coordinates?.length
    ),
    updatedAt: raw.updatedAt || null,
  };
}

export function mapBurialListResponse(data) {
  const list = Array.isArray(data?.sepultados)
    ? data.sepultados
    : Array.isArray(data?.sepultado)
      ? data.sepultado
      : Array.isArray(data)
        ? data
        : [];

  return {
    items: list.map(mapBurialFromApi),
    total: data?.total ?? list.length,
    page: data?.page ?? 1,
    pages: data?.pages ?? 1,
    limit: data?.limit ?? list.length,
    searchTerm: data?.searchTerm || '',
    ordem: data?.ordem || 'relevancia',
  };
}
