import { useEffect, useState } from 'react';
import { fetchConcessionarios } from '../services/users';

export default function ConcessionarioSelect({ value, onChange, disabled }) {
  const [items, setItems]   = useState([]);
  const [loading, setLoad]  = useState(true);
  const [error, setError]   = useState(null);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        setLoad(true);
        const list = await fetchConcessionarios();
        if (!live) return;
        setItems(list);       // 200 com lista (vazia ou não) NÃO é erro
        setError(null);
      } catch (e) {
        if (!live) return;
        const s = e?.response?.status;

        // 👇 AQUI fica o tratamento citado:
        if (s === 403) setError('Sem permissão: precisa ser administrador.');
        else if (s === 401) setError('Sessão expirada: faça login novamente.');
        else setError('Não foi possível listar concessionários.');

        setItems([]);
      } finally {
        if (live) setLoad(false);
      }
    })();
    return () => { live = false; };
  }, []);

  if (loading) return <p>Carregando concessionários…</p>;
  if (error)   return <p style={{ color: '#c00' }}>{error}</p>;
  if (items.length === 0) return <p>Nenhum concessionário cadastrado.</p>;

  return (
    <select value={value || ''} onChange={e => onChange?.(e.target.value)} disabled={disabled}>
      <option value="" disabled>Selecione um concessionário</option>
      {items.map(u => (
        <option key={u._id} value={u._id}>
          {u.name} ({u.email})
        </option>
      ))}
    </select>
  );
}
