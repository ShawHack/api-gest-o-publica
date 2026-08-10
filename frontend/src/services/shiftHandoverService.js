// services/shiftHandoverService.js
import api from '../utils/api';

const ShiftHandoverService = {
    // Criar nova passagem de plantão
    async create(handoverData) {
        const response = await api.post('/shift-handovers', handoverData);
        return response.data;
    },

    // Listar com filtros
    async list(params = {}) {
        const response = await api.get('/shift-handovers', { params });
        return response.data;
    },

    // Buscar por ID
    async getById(id) {
        const response = await api.get(`/shift-handovers/${id}`);
        return response.data;
    },

    // Atualizar
    async update(id, handoverData) {
        const response = await api.patch(`/shift-handovers/${id}`, handoverData);
        return response.data;
    },

    // Confirmar recebimento
    async confirmReceipt(id) {
        const response = await api.post(`/shift-handovers/${id}/confirm`);
        return response.data;
    },

    // Exportar
    async exportData(id) {
        const response = await api.get(`/shift-handovers/${id}/export`);
        return response.data;
    },

    // Deletar
    async delete(id) {
        const response = await api.delete(`/shift-handovers/${id}`);
        return response.data;
    },

    // Histórico
    async getHistory(params = {}) {
        const response = await api.get('/shift-handovers/history', { params });
        return response.data;
    },

    // Estatísticas
    async getStats(params = {}) {
        const response = await api.get('/shift-handovers/stats', { params });
        return response.data;
    }
};

export default ShiftHandoverService;
