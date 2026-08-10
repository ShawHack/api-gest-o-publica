/**
 * Deduplica resultados pelo identificador único.
 * Documentado: duplicatas no cliente indicam falha de paginação/keys React ou
 * resposta inconsistente da API — o backend também agrupa por _id na pesquisa.
 */
export function deduplicateBurials(items = []) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const key = String(item?.id || item?._id || '');
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}
