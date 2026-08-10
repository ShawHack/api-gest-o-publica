// components/pages/ShiftHandover/ShiftHandoverDetail.jsx
import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ShiftHandoverService from '../../../services/shiftHandoverService';
import { Context } from '../../../context/UserContext';
import styles from './ShiftHandover.module.css';

function ShiftHandoverDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useContext(Context);

    const [handover, setHandover] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadHandover();
    }, [id]);

    const loadHandover = async () => {
        try {
            setLoading(true);
            const data = await ShiftHandoverService.getById(id);
            setHandover(data.handover);
        } catch (error) {
            console.error('Erro ao carregar passagem:', error);
            alert('Erro ao carregar passagem de plantão');
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmReceipt = async () => {
        if (window.confirm('Confirmar recebimento desta passagem de plantão?')) {
            try {
                await ShiftHandoverService.confirmReceipt(id);
                alert('Recebimento confirmado com sucesso!');
                loadHandover();
            } catch (error) {
                console.error('Erro ao confirmar:', error);
                alert(error.response?.data?.message || 'Erro ao confirmar recebimento');
            }
        }
    };

    const handleExport = async () => {
        try {
            const data = await ShiftHandoverService.exportData(id);
            // Aqui você pode implementar a geração de PDF
            // Por enquanto, vamos apenas fazer o download dos dados
            const dataStr = JSON.stringify(data.handover, null, 2);
            const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

            const exportFileDefaultName = `passagem-plantao-${handover.sector}-${new Date(handover.shiftDate).toLocaleDateString('pt-BR')}.json`;

            const linkElement = document.createElement('a');
            linkElement.setAttribute('href', dataUri);
            linkElement.setAttribute('download', exportFileDefaultName);
            linkElement.click();
        } catch (error) {
            console.error('Erro ao exportar:', error);
            alert('Erro ao exportar passagem');
        }
    };

    const handlePrint = () => {
        window.print();
    };

    if (loading) {
        return <div className={styles.loading}>Carregando...</div>;
    }

    if (!handover) {
        return <div className={styles.error}>Passagem de plantão não encontrada</div>;
    }

    const canConfirm = handover.status === 'Pendente' && user;
    const canEdit = !handover.locked && (user?.role === 'admin' || handover.handingOverUser?._id === user?._id);

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1>📋 Detalhes da Passagem de Plantão</h1>
                <div className={styles.headerActions}>
                    {canEdit && (
                        <button
                            onClick={() => navigate(`/shift-handovers/edit/${id}`)}
                            className={styles.btnPrimary}
                        >
                            ✏️ Editar
                        </button>
                    )}
                    {canConfirm && (
                        <button
                            onClick={handleConfirmReceipt}
                            className={styles.btnSuccess}
                        >
                            ✅ Confirmar Recebimento
                        </button>
                    )}
                    <button onClick={handlePrint} className={styles.btnSecondary}>
                        🖨️ Imprimir
                    </button>
                    <button onClick={handleExport} className={styles.btnSecondary}>
                        📥 Exportar
                    </button>
                    <button onClick={() => navigate('/shift-handovers')} className={styles.btnSecondary}>
                        ← Voltar
                    </button>
                </div>
            </div>

            <div className={styles.detailContent}>
                {/* Status e Bloqueio */}
                <div className={styles.statusBar}>
                    <span className={`${styles.badge} ${styles[`badge${handover.status}`]}`}>
                        {handover.status}
                    </span>
                    {handover.locked && (
                        <span className={styles.lockedBadge}>
                            🔒 Bloqueado para edição
                        </span>
                    )}
                </div>

                {/* 1️⃣ Identificação */}
                <section className={styles.detailSection}>
                    <h2>1️⃣ Identificação do Plantão</h2>
                    <div className={styles.infoGrid}>
                        <div className={styles.infoItem}>
                            <strong>Setor:</strong>
                            <span>{handover.sector}</span>
                        </div>
                        {handover.unit && (
                            <div className={styles.infoItem}>
                                <strong>Unidade:</strong>
                                <span>{handover.unit}</span>
                            </div>
                        )}
                        <div className={styles.infoItem}>
                            <strong>Data:</strong>
                            <span>{new Date(handover.shiftDate).toLocaleDateString('pt-BR')}</span>
                        </div>
                        <div className={styles.infoItem}>
                            <strong>Horário:</strong>
                            <span>{handover.shiftTime}</span>
                        </div>
                        <div className={styles.infoItem}>
                            <strong>Turno:</strong>
                            <span className={styles.shiftBadge}>{handover.shift}</span>
                        </div>
                        <div className={styles.infoItem}>
                            <strong>Profissional que Entrega:</strong>
                            <span>{handover.handingOverName}</span>
                        </div>
                        <div className={styles.infoItem}>
                            <strong>Profissional que Recebe:</strong>
                            <span>{handover.receivingName || 'Aguardando confirmação'}</span>
                        </div>
                    </div>
                </section>

                {/* 2️⃣ Resumo Geral */}
                <section className={styles.detailSection}>
                    <h2>2️⃣ Resumo Geral do Plantão</h2>
                    <div className={styles.infoItem}>
                        <strong>Clima do Plantão:</strong>
                        <span className={`${styles.badge} ${styles[`climate${handover.shiftClimate}`]}`}>
                            {handover.shiftClimate}
                        </span>
                    </div>
                    <div className={styles.summaryBox}>
                        <p>{handover.generalSummary}</p>
                    </div>
                </section>

                {/* 3️⃣ Pendências */}
                {handover.pendingTasks && handover.pendingTasks.length > 0 && (
                    <section className={styles.detailSection}>
                        <h2>3️⃣ Pendências ({handover.pendingTasks.length})</h2>
                        {handover.pendingTasks.map((task, index) => (
                            <div key={index} className={styles.taskCard}>
                                <div className={styles.taskHeader}>
                                    <h4>Pendência #{index + 1}</h4>
                                    <span className={`${styles.badge} ${styles[`priority${task.priority}`]}`}>
                                        {task.priority}
                                    </span>
                                </div>
                                <p><strong>Descrição:</strong> {task.description}</p>
                                {task.responsible && <p><strong>Responsável:</strong> {task.responsible}</p>}
                                {task.deadline && (
                                    <p><strong>Prazo:</strong> {new Date(task.deadline).toLocaleDateString('pt-BR')}</p>
                                )}
                            </div>
                        ))}
                    </section>
                )}

                {/* 4️⃣ Ocorrências */}
                {handover.occurrences && handover.occurrences.length > 0 && (
                    <section className={styles.detailSection}>
                        <h2>4️⃣ Ocorrências / Intercorrências ({handover.occurrences.length})</h2>
                        {handover.occurrences.map((occurrence, index) => (
                            <div key={index} className={styles.occurrenceCard}>
                                <div className={styles.occurrenceHeader}>
                                    <h4>{occurrence.type}</h4>
                                    <span className={`${styles.badge} ${occurrence.status === 'Resolvido' ? styles.badgeSuccess : styles.badgeWarning}`}>
                                        {occurrence.status}
                                    </span>
                                </div>
                                <p><strong>Data/Hora:</strong> {new Date(occurrence.dateTime).toLocaleString('pt-BR')}</p>
                                <p><strong>Descrição:</strong> {occurrence.description}</p>
                                {occurrence.actionTaken && (
                                    <p><strong>Ação Tomada:</strong> {occurrence.actionTaken}</p>
                                )}
                            </div>
                        ))}
                    </section>
                )}

                {/* 5️⃣ Tarefas em Andamento */}
                {handover.ongoingTasks && handover.ongoingTasks.length > 0 && (
                    <section className={styles.detailSection}>
                        <h2>5️⃣ Atendimentos / Tarefas em Andamento ({handover.ongoingTasks.length})</h2>
                        {handover.ongoingTasks.map((task, index) => (
                            <div key={index} className={styles.taskCard}>
                                <h4>{task.name} {task.identifier && `(${task.identifier})`}</h4>
                                <p><strong>Status Atual:</strong> {task.currentStatus}</p>
                                {task.nextAction && <p><strong>Próxima Ação:</strong> {task.nextAction}</p>}
                                {task.observations && <p><strong>Observações:</strong> {task.observations}</p>}
                            </div>
                        ))}
                    </section>
                )}

                {/* 6️⃣ Comunicados */}
                {handover.importantCommunications && (
                    <section className={styles.detailSection}>
                        <h2>6️⃣ Comunicados Importantes</h2>
                        <div className={styles.summaryBox}>
                            <p>{handover.importantCommunications}</p>
                        </div>
                    </section>
                )}

                {/* 8️⃣ Confirmação */}
                <section className={styles.detailSection}>
                    <h2>8️⃣ Confirmação da Passagem</h2>
                    <div className={styles.signatureBox}>
                        <div className={styles.signature}>
                            <strong>✔️ Entregue por:</strong>
                            <p>{handover.handingOverName}</p>
                            {handover.handedOverAt && (
                                <small>{new Date(handover.handedOverAt).toLocaleString('pt-BR')}</small>
                            )}
                        </div>
                        {handover.receivedAt && (
                            <div className={styles.signature}>
                                <strong>✔️ Recebido por:</strong>
                                <p>{handover.receivingName}</p>
                                <small>{new Date(handover.receivedAt).toLocaleString('pt-BR')}</small>
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
}

export default ShiftHandoverDetail;
