const STORAGE_KEY = 'memorial_search_history_v1';
const MAX_ITEMS = 10;

export function readSearchHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(Boolean).slice(0, MAX_ITEMS) : [];
  } catch {
    return [];
  }
}

export function pushSearchHistory(term) {
  const q = String(term || '').trim();
  if (q.length < 2) return readSearchHistory();
  const prev = readSearchHistory().filter((t) => t.toLowerCase() !== q.toLowerCase());
  const next = [q, ...prev].slice(0, MAX_ITEMS);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore quota */
  }
  return next;
}

export function clearSearchHistory() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
