import { useCallback, useEffect, useState } from 'react';
import { fetchRecentBurials } from '../services/burialService';

const RECENT_LIMIT = 10;

export default function useRecentBurials({ enabled = true } = {}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!enabled) {
      setItems([]);
      setError('');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const result = await fetchRecentBurials(RECENT_LIMIT);
      setItems(result.items);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          'Não foi possível carregar os sepultamentos recentes.'
      );
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    load();
  }, [load]);

  return { items, loading, error, retry: load, limit: RECENT_LIMIT };
}
