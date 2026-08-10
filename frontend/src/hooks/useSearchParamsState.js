import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

const DEFAULTS = {
  q: '',
  busca: '',
  rua: '',
  quadra: '',
  chapa: '',
  setor: '',
  ordem: 'relevancia',
  anoFalecimento: '',
  comFoto: '',
  page: '1',
  view: 'list',
};

/** Sincroniza filtros de busca com a URL (?q= ou ?busca=). */
export default function useSearchParamsState() {
  const [params, setParams] = useSearchParams();

  const state = useMemo(() => {
    const q = params.get('q') || params.get('busca') || '';
    return {
      q,
      rua: params.get('rua') || '',
      quadra: params.get('quadra') || '',
      chapa: params.get('chapa') || '',
      setor: params.get('setor') || '',
      ordem: params.get('ordem') || DEFAULTS.ordem,
      anoFalecimento: params.get('anoFalecimento') || '',
      comFoto: params.get('comFoto') === '1' || params.get('comFoto') === 'true',
      page: Math.max(parseInt(params.get('page') || '1', 10) || 1, 1),
      view: params.get('view') === 'map' ? 'map' : 'list',
    };
  }, [params]);

  const setState = useCallback(
    (patch, { replace = false } = {}) => {
      const next = new URLSearchParams(params);
      Object.entries(patch).forEach(([key, value]) => {
        if (key === 'busca') {
          if (value) next.set('q', String(value));
          else next.delete('q');
          next.delete('busca');
          return;
        }
        if (value === '' || value === false || value == null) {
          next.delete(key);
        } else if (key === 'comFoto') {
          next.set(key, value ? '1' : '');
        } else {
          next.set(key, String(value));
        }
      });
      setParams(next, { replace });
    },
    [params, setParams]
  );

  const clearFilters = useCallback(() => {
    const q = state.q;
    setParams(q ? new URLSearchParams({ q }) : new URLSearchParams(), { replace: true });
  }, [setParams, state.q]);

  return { state, setState, clearFilters, params };
}
