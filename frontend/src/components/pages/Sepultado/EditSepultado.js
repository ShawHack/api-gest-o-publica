// src/components/pages/sepultados/EditSepultado.js
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../../utils/api';

import styles from './AddSepultado.module.css';
import SepultadoForm from '../../form/SepultadoForm';
import useFlashMessage from '../../../hooks/useFlashMessage';

import { fetchConcessionarios } from '../../../services/users';
import { assignConcessionario, unassignConcessionario } from '../../../services/sepultados';

function EditSepultado() {
  const [sep, setSep] = useState(null);
  const [loading, setLoading] = useState(true);

  // bloco de concess.
  const [cons, setCons] = useState([]);       // lista de concessionários (admin)
  const [target, setTarget] = useState('');   // userId selecionado
  const [busyAssign, setBusyAssign] = useState(false);

  const { id } = useParams();
  const navigate = useNavigate();
  const { setFlashMessage } = useFlashMessage();

  // Carrega o registro (GET público)
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        setLoading(true);
        const res = await api.get(`/sepultados/${id}`);
        if (!live) return;
        setSep(res.data);
      } catch (err) {
        console.error('Erro ao buscar sepultado:', err);
        if (!live) return;
        setFlashMessage('Erro ao carregar dados do sepultado.', 'error');
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => { live = false; };
  }, [id, setFlashMessage]);

  // Carrega concessionários (se admin; se não for, API retorna 403 e tratamos a mensagem)
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const list = await fetchConcessionarios();
        if (!live) return;
        setCons(list);
      } catch (e) {
        const s = e?.response?.status;
        if (s === 401) setFlashMessage('Sessão expirada: faça login novamente.', 'error');
        else if (s === 403) {
          // tudo bem: não é admin; apenas não mostraremos o select
          console.debug('Concessionários: acesso negado (admin-only).');
        } else {
          console.debug('Falha ao buscar concessionários:', e?.response?.data || e?.message);
        }
      }
    })();
    return () => { live = false; };
  }, [setFlashMessage]);

  // Atualizar dados do sepultado (sem mexer em concessionários)
  const updateSep = useCallback(
    async (payload, { isFormData }) => {
      const token = localStorage.getItem('token');
      if (!token) {
        setFlashMessage('Você precisa estar logado.', 'error');
        return;
      }
      try {
        const headers = {
          Authorization: `Bearer ${token}`,
          ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        };
        const res = await api.patch(`/sepultados/${id}`, payload, { headers });
        setFlashMessage(res.data?.message || 'Registro atualizado com sucesso!', 'success');
        navigate('/meussepultados');
      } catch (err) {
        const s = err?.response?.status;
        let msg = err?.response?.data?.message || 'Erro ao atualizar registro';
        if (s === 401) msg = 'Sessão expirada: faça login novamente.';
        if (s === 403) msg = 'Sem permissão para editar este registro.';
        setFlashMessage(msg, 'error');
      }
    },
    [id, navigate, setFlashMessage]
  );

  // Atribuir
  const onAssign = async () => {
    if (!target) {
      setFlashMessage('Selecione um concessionário.', 'error');
      return;
    }
    try {
      setBusyAssign(true);
      const data = await assignConcessionario(id, target);
      setFlashMessage(data?.message || 'Concessionário atribuído com sucesso!', 'success');

      // atualiza estado local: acrescenta o userId na lista do registro
      setSep((prev) => {
        if (!prev) return prev;
        const atual = new Set((prev.concessionarios || []).map(String));
        atual.add(String(target));
        return { ...prev, concessionarios: Array.from(atual) };
      });
      setTarget('');
    } catch (e) {
      const s = e?.response?.status;
      let msg = e?.response?.data?.message || 'Erro ao atribuir concessionário.';
      if (s === 401) msg = 'Sessão expirada: faça login novamente.';
      if (s === 403) msg = 'Sem permissão para atribuir (somente admin).';
      setFlashMessage(msg, 'error');
    } finally {
      setBusyAssign(false);
    }
  };

  // Remover atribuição
  const onUnassign = async (userId) => {
    try {
      setBusyAssign(true);
      const data = await unassignConcessionario(id, userId);
      setFlashMessage(data?.message || 'Atribuição removida com sucesso!', 'success');

      setSep((prev) => {
        if (!prev) return prev;
        const arr = (prev.concessionarios || []).filter((x) => String(x) !== String(userId));
        return { ...prev, concessionarios: arr };
      });
    } catch (e) {
      const s = e?.response?.status;
      let msg = e?.response?.data?.message || 'Erro ao remover atribuição.';
      if (s === 401) msg = 'Sessão expirada: faça login novamente.';
      if (s === 403) msg = 'Sem permissão para remover atribuição (somente admin).';
      setFlashMessage(msg, 'error');
    } finally {
      setBusyAssign(false);
    }
  };

  return (
    <section>
      <div className={styles.addsep_header}>
        <h2>Editando as informações {sep?.nome ? `de ${sep.nome}` : ''}</h2>
        <p>Depois da edição, os dados serão atualizados no sistema.</p>
      </div>

      {loading && <p>Carregando...</p>}

      {!loading && sep && (
        <>
          <SepultadoForm
            handleSubmit={updateSep}
            btnText="Atualizar"
            sepultadoData={sep}
          />

          {/* Bloco admin-only na prática (se a API 403, só não aparece a lista) */}
          {cons.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <h3>Atribuir concessionário</h3>

              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
                <select
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  disabled={busyAssign}
                >
                  <option value="">Selecione um concessionário</option>
                  {cons.map((u) => (
                    <option key={u._id} value={u._id}>
                      {u.name} ({u.email})
                    </option>
                  ))}
                </select>

                <button disabled={busyAssign || !target} onClick={onAssign}>
                  {busyAssign ? 'Atribuindo...' : 'Atribuir'}
                </button>
              </div>

              <h4>Concessionários atribuídos</h4>
              {Array.isArray(sep.concessionarios) && sep.concessionarios.length > 0 ? (
                <ul>
                  {sep.concessionarios.map((uid) => {
                    const info = cons.find((c) => String(c._id) === String(uid));
                    const label = info ? `${info.name} (${info.email})` : uid;
                    return (
                      <li key={uid} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span>{label}</span>
                        <button
                          disabled={busyAssign}
                          onClick={() => onUnassign(uid)}
                          style={{ color: '#b00' }}
                        >
                          Remover
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p>Nenhum concessionário atribuído.</p>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}

export default EditSepultado;
