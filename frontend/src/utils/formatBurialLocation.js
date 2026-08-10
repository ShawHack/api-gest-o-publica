export function formatBurialLocation(burial) {
  if (!burial) return 'Localização não informada';
  const parts = [];
  if (burial.street) parts.push(`Rua ${burial.street}`);
  if (burial.block) parts.push(`Quadra ${burial.block}`);
  if (burial.plate) parts.push(`Placa ${burial.plate}`);
  if (burial.sector && !burial.block) parts.push(`Setor ${burial.sector}`);
  return parts.length ? parts.join(' • ') : 'Localização não informada';
}

export function formatBurialLocationCopy(burial, memorialName = 'Memorial Santa Faustina') {
  const loc = formatBurialLocation(burial);
  return `${burial?.fullName || 'Sepultura'} — ${loc} (${memorialName})`;
}

export function formatDateDisplay(value) {
  if (!value) return null;
  const s = String(value).trim();
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return s;
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) {
    return d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  }
  return s;
}
