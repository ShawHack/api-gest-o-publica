// components/pages/ShiftHandover/ShiftHandoverList.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ShiftHandoverService from '../../../services/shiftHandoverService';
import styles from './ShiftHandover.module.css';

function ShiftHandoverList() {
    const [handovers, setHandovers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({});
    const [filters, setFilters] = useState({
        page: 1,
        limit: 10,
        sector: '',
        status: '',
        shift: '',
        search: ''
    });

    const navigate = useNavigate();

    useEffect(() => {
        loadHandovers();
    }, [filters]);

    const loadHandovers = async () => {
        try {
            setLoading(true);
            const data = await ShiftHandoverService.list(filters);
            setHandovers(data.handovers);
            setPagination(data.pagination);
        } catch (error) {
            console.error('Erro ao carregar passagens:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value, page: 1 }));
    };

    const handlePageChange = (newPage) => {
        setFilters(prev => ({ ...prev, page: newPage }));
    };

    const handleDelete = async (id) => {
        if (window.confirm('Tem certeza que deseja deletar esta passagem de plantão?')) {
            try {
                await ShiftHandoverService.delete(id);
                loadHandovers();
            } catch (error) {
                console.error('Erro ao deletar:', error);
                alert('Erro ao deletar passagem de plantão');
            }
        }
    };

    const getStatusBadge = (status) => {
        const badges = {
            'Pendente': 'badge-warning',
            'Recebido': 'badge-success',
            'Arquivado': 'badge-secondary'
        };
        return badges[status] || 'badge-secondary';
    };

    const getClimateBadge = (climate) => {
        const badges = {
            'Tranquilo': 'badge-success',
            'Normal': 'badge-info',
            'Agitado': 'badge-warning',
            'Crítico': 'badge-danger',
            'Sobrecarga': 'badge-danger'
        };
        return badges[climate] || 'badge-secondary';
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1>📋 Passagem de Plantão</h1>
                <Link to="/shift-handovers/create" className={styles.btnPrimary}>
                    ➕ Nova Passagem
                </Link>
            </div>

            <div className={styles.filters}>
                <input
                    type="text"
                    name="search"
                    placeholder="🔍 Buscar..."
                    value={filters.search}
                    onChange={handleFilterChange}
                    className={styles.searchInput}
                />

                <select
                    name="status"
                    value={filters.status}
                    onChange={handleFilterChange}
                    className={styles.select}
                >
                    <option value="">Todos os Status</option>
                    <option value="Pendente">Pendente</option>
                    <option value="Recebido">Recebido</option>
                    <option value="Arquivado">Arquivado</option>
                </select>

                <select
                    name="shift"
                    value={filters.shift}
                    onChange={handleFilterChange}
                    className={styles.select}
                >
                    <option value="">Todos os Turnos</option>
                    <option value="Manhã">Manhã</option>
                    <option value="Tarde">Tarde</option>
                    <option value="Noite">Noite</option>
                </select>

                <input
                    type="text"
                    name="sector"
                    placeholder="Setor"
                    value={filters.sector}
                    onChange={handleFilterChange}
                    className={styles.input}
                />
            </div>

            {loading ? (
                <div className={styles.loading}>Carregando...</div>
            ) : (
                <>
                    <div className={styles.tableContainer}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Data</th>
                                    <th>Setor</th>
                                    <th>Turno</th>
                                    <th>Entrega</th>
                                    <th>Recebe</th>
                                    <th>Clima</th>
                                    <th>Status</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {handovers.length === 0 ? (
                                    <tr>
                                        <td colSpan="8" className={styles.noData}>
                                            Nenhuma passagem de plantão encontrada
                                        </td>
                                    </tr>
                                ) : (
                                    handovers.map((handover) => (
                                        <tr key={handover._id}>
                                            <td>{new Date(handover.shiftDate).toLocaleDateString('pt-BR')}</td>
                                            <td>{handover.sector}</td>
                                            <td>
                                                <span className={styles.shiftBadge}>
                                                    {handover.shift}
                                                </span>
                                            </td>
                                            <td>{handover.handingOverName}</td>
                                            <td>{handover.receivingName || '-'}</td>
                                            <td>
                                                <span className={`${styles.badge} ${styles[getClimateBadge(handover.shiftClimate)]}`}>
                                                    {handover.shiftClimate}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`${styles.badge} ${styles[getStatusBadge(handover.status)]}`}>
                                                    {handover.status}
                                                </span>
                                            </td>
                                            <td className={styles.actions}>
                                                <button
                                                    onClick={() => navigate(`/shift-handovers/${handover._id}`)}
                                                    className={styles.btnView}
                                                    title="Visualizar"
                                                >
                                                    👁️
                                                </button>
                                                {!handover.locked && (
                                                    <button
                                                        onClick={() => navigate(`/shift-handovers/edit/${handover._id}`)}
                                                        className={styles.btnEdit}
                                                        title="Editar"
                                                    >
                                                        ✏️
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleDelete(handover._id)}
                                                    className={styles.btnDelete}
                                                    title="Deletar"
                                                >
                                                    🗑️
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {pagination.totalPages > 1 && (
                        <div className={styles.pagination}>
                            <button
                                onClick={() => handlePageChange(filters.page - 1)}
                                disabled={filters.page === 1}
                                className={styles.btnPage}
                            >
                                ← Anterior
                            </button>
                            <span className={styles.pageInfo}>
                                Página {pagination.page} de {pagination.totalPages}
                            </span>
                            <button
                                onClick={() => handlePageChange(filters.page + 1)}
                                disabled={filters.page === pagination.totalPages}
                                className={styles.btnPage}
                            >
                                Próxima →
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

export default ShiftHandoverList;
