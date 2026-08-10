import { useCallback, useEffect, useRef, useState } from 'react';
import { searchBurials } from '../services/burialService';
import { pushSearchHistory } from './useSearchHistory';

function isAbortError(err) {
  return (
    err?.name === 'AbortError' ||
    err?.name === 'CanceledError' ||
    err?.code === 'ERR_CANCELED' ||
    /aborted|canceled|cancelled/i.test(String(err?.message || ''))
  );
}

/**
 * @returns {{
 *  items: array,
 *  total: number,
 *  page: number,
 *  pages: number,
 *  loading: boolean,
 *  error: string,
 *  status: 'idle'|'loading'|'success'|'empty'|'error',
 *  retry: Function
 * }}
 */
export default function useBurialSearch(filters, { enabled = true } = {}) {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('idle');
  const requestId = useRef(0);

  const q = String(filters?.q || '').trim();
  const pageNum = filters?.page || 1;
  const rua = filters?.rua || '';
  const quadra = filters?.quadra || '';
  const chapa = filters?.chapa || '';
  const setor = filters?.setor || '';
  const ordem = filters?.ordem || 'relevancia';
  const anoFalecimento = filters?.anoFalecimento || '';
  const comFoto = !!filters?.comFoto;

  const runSearch = useCallback(async () => {
    if (!enabled || q.length < 2) {
      setItems([]);
      setTotal(0);
      setPage(1);
      setPages(1);
      setError('');
      setLoading(false);
      setStatus('idle');
      return;
    }

    const id = ++requestId.current;
    setLoading(true);
    setError('');
    setStatus('loading');

    try {
      const result = await searchBurials({
        q,
        page: pageNum,
        limit: 20,
        rua,
        quadra,
        chapa,
        setor,
        ordem,
        anoFalecimento,
        comFoto,
      });

      if (id !== requestId.current) return;

      const normalized = Array.isArray(result?.items) ? result.items : [];
      setItems(normalized);
      setTotal(Number(result?.total) || normalized.length);
      setPage(Number(result?.page) || pageNum);
      setPages(Number(result?.pages) || 1);
      setStatus(normalized.length ? 'success' : 'empty');
      pushSearchHistory(q);
    } catch (err) {
      if (id !== requestId.current) return;
      if (isAbortError(err)) return;
      console.error('Erro ao pesquisar sepulturas:', err);
      setError(
        err?.response?.data?.message ||
          'Não foi possível realizar a pesquisa. Tente novamente.'
      );
      setItems([]);
      setTotal(0);
      setStatus('error');
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [
    enabled,
    q,
    pageNum,
    rua,
    quadra,
    chapa,
    setor,
    ordem,
    anoFalecimento,
    comFoto,
  ]);

  useEffect(() => {
    runSearch();
  }, [runSearch]);

  return {
    items,
    total,
    page,
    pages,
    loading,
    error,
    status,
    retry: runSearch,
  };
}
