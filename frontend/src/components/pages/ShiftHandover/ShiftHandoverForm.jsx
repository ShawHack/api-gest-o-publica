// components/pages/ShiftHandover/ShiftHandoverForm.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ShiftHandoverService from '../../../services/shiftHandoverService';
import styles from './ShiftHandover.module.css';

function ShiftHandoverForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEdit = Boolean(id);

    const [formData, setFormData] = useState({
        sector: '',
        unit: '',
        shiftDate: new Date().toISOString().split('T')[0],
        shiftTime: '',
        shift: 'Manhã',
        receivingName: '',
        generalSummary: '',
        shiftClimate: 'Normal',
        importantCommunications: '',
        pendingTasks: [],
        occurrences: [],
        ongoingTasks: []
    });

    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isEdit) {
            loadHandover();
        }
    }, [id]);

    const loadHandover = async () => {
        try {
            setLoading(true);
            const data = await ShiftHandoverService.getById(id);
            const handover = data.handover;

            setFormData({
                sector: handover.sector || '',
                unit: handover.unit || '',
                shiftDate: new Date(handover.shiftDate).toISOString().split('T')[0],
                shiftTime: handover.shiftTime || '',
                shift: handover.shift || 'Manhã',
                receivingName: handover.receivingName || '',
                generalSummary: handover.generalSummary || '',
                shiftClimate: handover.shiftClimate || 'Normal',
                importantCommunications: handover.importantCommunications || '',
                pendingTasks: handover.pendingTasks || [],
                occurrences: handover.occurrences || [],
                ongoingTasks: handover.ongoingTasks || []
            });
        } catch (error) {
            console.error('Erro ao carregar passagem:', error);
            alert('Erro ao carregar passagem de plantão');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.sector || !formData.shiftTime || !formData.generalSummary) {
            alert('Por favor, preencha todos os campos obrigatórios');
            return;
        }

        try {
            setLoading(true);

            if (isEdit) {
                await ShiftHandoverService.update(id, formData);
                alert('Passagem atualizada com sucesso!');
            } else {
                await ShiftHandoverService.create(formData);
                alert('Passagem criada com sucesso!');
            }

            navigate('/shift-handovers');
        } catch (error) {
            console.error('Erro ao salvar:', error);
            alert(error.response?.data?.message || 'Erro ao salvar passagem de plantão');
        } finally {
            setLoading(false);
        }
    };

    // Funções para gerenciar pendências
    const addPendingTask = () => {
        setFormData(prev => ({
            ...prev,
            pendingTasks: [
                ...prev.pendingTasks,
                { description: '', responsible: '', priority: 'Média', deadline: '' }
            ]
        }));
    };

    const updatePendingTask = (index, field, value) => {
        const updated = [...formData.pendingTasks];
        updated[index][field] = value;
        setFormData(prev => ({ ...prev, pendingTasks: updated }));
    };

    const removePendingTask = (index) => {
        setFormData(prev => ({
            ...prev,
            pendingTasks: prev.pendingTasks.filter((_, i) => i !== index)
        }));
    };

    // Funções para gerenciar ocorrências
    const addOccurrence = () => {
        setFormData(prev => ({
            ...prev,
            occurrences: [
                ...prev.occurrences,
                {
                    type: '',
                    dateTime: new Date().toISOString().slice(0, 16),
                    description: '',
                    actionTaken: '',
                    status: 'Em andamento'
                }
            ]
        }));
    };

    const updateOccurrence = (index, field, value) => {
        const updated = [...formData.occurrences];
        updated[index][field] = value;
        setFormData(prev => ({ ...prev, occurrences: updated }));
    };

    const removeOccurrence = (index) => {
        setFormData(prev => ({
            ...prev,
            occurrences: prev.occurrences.filter((_, i) => i !== index)
        }));
    };

    // Funções para gerenciar tarefas em andamento
    const addOngoingTask = () => {
        setFormData(prev => ({
            ...prev,
            ongoingTasks: [
                ...prev.ongoingTasks,
                { name: '', identifier: '', currentStatus: '', nextAction: '', observations: '' }
            ]
        }));
    };

    const updateOngoingTask = (index, field, value) => {
        const updated = [...formData.ongoingTasks];
        updated[index][field] = value;
        setFormData(prev => ({ ...prev, ongoingTasks: updated }));
    };

    const removeOngoingTask = (index) => {
        setFormData(prev => ({
            ...prev,
            ongoingTasks: prev.ongoingTasks.filter((_, i) => i !== index)
        }));
    };

    if (loading && isEdit) {
        return <div className={styles.loading}>Carregando...</div>;
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1>{isEdit ? '✏️ Editar' : '➕ Nova'} Passagem de Plantão</h1>
            </div>

            <form onSubmit={handleSubmit} className={styles.form}>
                {/* 1️⃣ Identificação do Plantão */}
                <section className={styles.section}>
                    <h2>1️⃣ Identificação do Plantão</h2>

                    <div className={styles.formGrid}>
                        <div className={styles.formGroup}>
                            <label>Setor / Unidade *</label>
                            <input
                                type="text"
                                name="sector"
                                value={formData.sector}
                                onChange={handleChange}
                                required
                                className={styles.input}
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label>Unidade</label>
                            <input
                                type="text"
                                name="unit"
                                value={formData.unit}
                                onChange={handleChange}
                                className={styles.input}
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label>Data *</label>
                            <input
                                type="date"
                                name="shiftDate"
                                value={formData.shiftDate}
                                onChange={handleChange}
                                required
                                className={styles.input}
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label>Horário do Plantão *</label>
                            <input
                                type="text"
                                name="shiftTime"
                                value={formData.shiftTime}
                                onChange={handleChange}
                                placeholder="Ex: 08:00 - 14:00"
                                required
                                className={styles.input}
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label>Turno *</label>
                            <select
                                name="shift"
                                value={formData.shift}
                                onChange={handleChange}
                                required
                                className={styles.select}
                            >
                                <option value="Manhã">Manhã</option>
                                <option value="Tarde">Tarde</option>
                                <option value="Noite">Noite</option>
                            </select>
                        </div>

                        <div className={styles.formGroup}>
                            <label>Profissional que Assume</label>
                            <input
                                type="text"
                                name="receivingName"
                                value={formData.receivingName}
                                onChange={handleChange}
                                className={styles.input}
                            />
                        </div>
                    </div>
                </section>

                {/* 2️⃣ Resumo Geral */}
                <section className={styles.section}>
                    <h2>2️⃣ Resumo Geral do Plantão</h2>

                    <div className={styles.formGroup}>
                        <label>Situação Geral *</label>
                        <textarea
                            name="generalSummary"
                            value={formData.generalSummary}
                            onChange={handleChange}
                            required
                            rows="4"
                            placeholder="Descreva a situação geral do plantão, ocorrências relevantes, etc."
                            className={styles.textarea}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label>Clima do Plantão</label>
                        <select
                            name="shiftClimate"
                            value={formData.shiftClimate}
                            onChange={handleChange}
                            className={styles.select}
                        >
                            <option value="Tranquilo">Tranquilo</option>
                            <option value="Normal">Normal</option>
                            <option value="Agitado">Agitado</option>
                            <option value="Crítico">Crítico</option>
                            <option value="Sobrecarga">Sobrecarga</option>
                        </select>
                    </div>
                </section>

                {/* 3️⃣ Pendências */}
                <section className={styles.section}>
                    <h2>3️⃣ Pendências</h2>

                    {formData.pendingTasks.map((task, index) => (
                        <div key={index} className={styles.itemCard}>
                            <div className={styles.itemHeader}>
                                <h4>Pendência #{index + 1}</h4>
                                <button
                                    type="button"
                                    onClick={() => removePendingTask(index)}
                                    className={styles.btnRemove}
                                >
                                    ❌
                                </button>
                            </div>

                            <div className={styles.formGrid}>
                                <div className={styles.formGroup}>
                                    <label>Descrição</label>
                                    <input
                                        type="text"
                                        value={task.description}
                                        onChange={(e) => updatePendingTask(index, 'description', e.target.value)}
                                        className={styles.input}
                                    />
                                </div>

                                <div className={styles.formGroup}>
                                    <label>Responsável</label>
                                    <input
                                        type="text"
                                        value={task.responsible}
                                        onChange={(e) => updatePendingTask(index, 'responsible', e.target.value)}
                                        className={styles.input}
                                    />
                                </div>

                                <div className={styles.formGroup}>
                                    <label>Prioridade</label>
                                    <select
                                        value={task.priority}
                                        onChange={(e) => updatePendingTask(index, 'priority', e.target.value)}
                                        className={styles.select}
                                    >
                                        <option value="Baixa">Baixa</option>
                                        <option value="Média">Média</option>
                                        <option value="Alta">Alta</option>
                                        <option value="Urgente">Urgente</option>
                                    </select>
                                </div>

                                <div className={styles.formGroup}>
                                    <label>Prazo</label>
                                    <input
                                        type="date"
                                        value={task.deadline}
                                        onChange={(e) => updatePendingTask(index, 'deadline', e.target.value)}
                                        className={styles.input}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}

                    <button
                        type="button"
                        onClick={addPendingTask}
                        className={styles.btnAdd}
                    >
                        ➕ Adicionar Pendência
                    </button>
                </section>

                {/* 4️⃣ Ocorrências */}
                <section className={styles.section}>
                    <h2>4️⃣ Ocorrências / Intercorrências</h2>

                    {formData.occurrences.map((occurrence, index) => (
                        <div key={index} className={styles.itemCard}>
                            <div className={styles.itemHeader}>
                                <h4>Ocorrência #{index + 1}</h4>
                                <button
                                    type="button"
                                    onClick={() => removeOccurrence(index)}
                                    className={styles.btnRemove}
                                >
                                    ❌
                                </button>
                            </div>

                            <div className={styles.formGrid}>
                                <div className={styles.formGroup}>
                                    <label>Tipo</label>
                                    <input
                                        type="text"
                                        value={occurrence.type}
                                        onChange={(e) => updateOccurrence(index, 'type', e.target.value)}
                                        className={styles.input}
                                    />
                                </div>

                                <div className={styles.formGroup}>
                                    <label>Data e Hora</label>
                                    <input
                                        type="datetime-local"
                                        value={occurrence.dateTime}
                                        onChange={(e) => updateOccurrence(index, 'dateTime', e.target.value)}
                                        className={styles.input}
                                    />
                                </div>

                                <div className={styles.formGroup}>
                                    <label>Status</label>
                                    <select
                                        value={occurrence.status}
                                        onChange={(e) => updateOccurrence(index, 'status', e.target.value)}
                                        className={styles.select}
                                    >
                                        <option value="Em andamento">Em andamento</option>
                                        <option value="Resolvido">Resolvido</option>
                                    </select>
                                </div>

                                <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                                    <label>Descrição</label>
                                    <textarea
                                        value={occurrence.description}
                                        onChange={(e) => updateOccurrence(index, 'description', e.target.value)}
                                        rows="2"
                                        className={styles.textarea}
                                    />
                                </div>

                                <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                                    <label>Ação Tomada</label>
                                    <textarea
                                        value={occurrence.actionTaken}
                                        onChange={(e) => updateOccurrence(index, 'actionTaken', e.target.value)}
                                        rows="2"
                                        className={styles.textarea}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}

                    <button
                        type="button"
                        onClick={addOccurrence}
                        className={styles.btnAdd}
                    >
                        ➕ Adicionar Ocorrência
                    </button>
                </section>

                {/* 5️⃣ Tarefas em Andamento */}
                <section className={styles.section}>
                    <h2>5️⃣ Atendimentos / Tarefas em Andamento</h2>

                    {formData.ongoingTasks.map((task, index) => (
                        <div key={index} className={styles.itemCard}>
                            <div className={styles.itemHeader}>
                                <h4>Tarefa #{index + 1}</h4>
                                <button
                                    type="button"
                                    onClick={() => removeOngoingTask(index)}
                                    className={styles.btnRemove}
                                >
                                    ❌
                                </button>
                            </div>

                            <div className={styles.formGrid}>
                                <div className={styles.formGroup}>
                                    <label>Nome / Identificador</label>
                                    <input
                                        type="text"
                                        value={task.name}
                                        onChange={(e) => updateOngoingTask(index, 'name', e.target.value)}
                                        className={styles.input}
                                    />
                                </div>

                                <div className={styles.formGroup}>
                                    <label>Identificador</label>
                                    <input
                                        type="text"
                                        value={task.identifier}
                                        onChange={(e) => updateOngoingTask(index, 'identifier', e.target.value)}
                                        className={styles.input}
                                    />
                                </div>

                                <div className={styles.formGroup}>
                                    <label>Status Atual</label>
                                    <input
                                        type="text"
                                        value={task.currentStatus}
                                        onChange={(e) => updateOngoingTask(index, 'currentStatus', e.target.value)}
                                        className={styles.input}
                                    />
                                </div>

                                <div className={styles.formGroup}>
                                    <label>Próxima Ação</label>
                                    <input
                                        type="text"
                                        value={task.nextAction}
                                        onChange={(e) => updateOngoingTask(index, 'nextAction', e.target.value)}
                                        className={styles.input}
                                    />
                                </div>

                                <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                                    <label>Observações</label>
                                    <textarea
                                        value={task.observations}
                                        onChange={(e) => updateOngoingTask(index, 'observations', e.target.value)}
                                        rows="2"
                                        className={styles.textarea}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}

                    <button
                        type="button"
                        onClick={addOngoingTask}
                        className={styles.btnAdd}
                    >
                        ➕ Adicionar Tarefa
                    </button>
                </section>

                {/* 6️⃣ Comunicados */}
                <section className={styles.section}>
                    <h2>6️⃣ Comunicados Importantes</h2>

                    <div className={styles.formGroup}>
                        <label>Avisos, mudanças de rotina, falta de materiais, etc.</label>
                        <textarea
                            name="importantCommunications"
                            value={formData.importantCommunications}
                            onChange={handleChange}
                            rows="4"
                            className={styles.textarea}
                        />
                    </div>
                </section>

                {/* Botões de Ação */}
                <div className={styles.formActions}>
                    <button
                        type="button"
                        onClick={() => navigate('/shift-handovers')}
                        className={styles.btnSecondary}
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className={styles.btnPrimary}
                    >
                        {loading ? 'Salvando...' : (isEdit ? 'Atualizar' : 'Criar Passagem')}
                    </button>
                </div>
            </form>
        </div>
    );
}

export default ShiftHandoverForm;
