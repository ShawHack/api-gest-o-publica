// controllers/ShiftHandoverController.js
const ShiftHandover = require('../models/ShiftHandover');
const User = require('../models/User');
const getToken = require('../helpers/get-token');
const getUserByToken = require('../helpers/get-user-by-token');

module.exports = class ShiftHandoverController {

    // Criar nova passagem de plantão
    static async create(req, res) {
        try {
            console.log('[ShiftHandover] Iniciando criação de passagem de plantão');
            console.log('[ShiftHandover] Body recebido:', JSON.stringify(req.body, null, 2));

            const token = getToken(req);
            const user = await getUserByToken(token);

            console.log('[ShiftHandover] Usuário autenticado:', user._id, user.name);

            const {
                sector,
                unit,
                shiftDate,
                shiftTime,
                shift,
                receivingUserId,
                receivingName,
                generalSummary,
                shiftClimate,
                pendingTasks,
                occurrences,
                ongoingTasks,
                importantCommunications,
                attachments
            } = req.body;

            // Validações
            if (!sector || !shiftTime || !shift || !generalSummary) {
                console.log('[ShiftHandover] Validação falhou - campos obrigatórios faltando');
                return res.status(422).json({
                    message: 'Campos obrigatórios: setor, horário, turno e resumo geral',
                    missing: {
                        sector: !sector,
                        shiftTime: !shiftTime,
                        shift: !shift,
                        generalSummary: !generalSummary
                    }
                });
            }

            // Validar e limpar arrays para evitar problemas com subdocumentos
            const cleanPendingTasks = (pendingTasks || []).map(task => ({
                description: task.description || '',
                responsible: task.responsible || '',
                priority: task.priority || 'Média',
                deadline: task.deadline || null,
                completed: task.completed || false
            }));

            const cleanOccurrences = (occurrences || []).map(occ => ({
                type: occ.type || '',
                dateTime: occ.dateTime || new Date(),
                description: occ.description || '',
                actionTaken: occ.actionTaken || '',
                status: occ.status || 'Em andamento'
            }));

            const cleanOngoingTasks = (ongoingTasks || []).map(task => ({
                name: task.name || '',
                identifier: task.identifier || '',
                currentStatus: task.currentStatus || '',
                nextAction: task.nextAction || '',
                observations: task.observations || ''
            }));

            console.log('[ShiftHandover] Criando documento com dados validados');

            const handover = new ShiftHandover({
                sector,
                unit: unit || '',
                shiftDate: shiftDate || new Date(),
                shiftTime,
                shift,
                handingOverUser: user._id,
                handingOverName: user.name,
                receivingUser: receivingUserId || null,
                receivingName: receivingName || '',
                generalSummary,
                shiftClimate: shiftClimate || 'Normal',
                pendingTasks: cleanPendingTasks,
                occurrences: cleanOccurrences,
                ongoingTasks: cleanOngoingTasks,
                importantCommunications: importantCommunications || '',
                attachments: attachments || [],
                handedOverAt: new Date(),
                handedOverSignature: `${user._id}_${Date.now()}` // Assinatura simples
            });

            console.log('[ShiftHandover] Salvando no banco de dados...');
            await handover.save();
            console.log('[ShiftHandover] Passagem salva com sucesso! ID:', handover._id);

            res.status(201).json({
                message: 'Passagem de plantão criada com sucesso!',
                handover
            });

        } catch (error) {
            console.error('[ShiftHandover] ERRO ao criar passagem de plantão:', error);
            console.error('[ShiftHandover] Stack trace:', error.stack);

            // Tratamento específico para erros de validação do Mongoose
            if (error.name === 'ValidationError') {
                const validationErrors = {};
                for (const field in error.errors) {
                    validationErrors[field] = error.errors[field].message;
                }
                return res.status(422).json({
                    message: 'Erro de validação dos dados',
                    errors: validationErrors
                });
            }

            res.status(500).json({
                message: 'Erro ao criar passagem de plantão',
                error: error.message,
                type: error.name
            });
        }
    }

    // Listar passagens de plantão com filtros e paginação
    static async list(req, res) {
        try {
            console.log('[ShiftHandover] Listando passagens de plantão');
            console.log('[ShiftHandover] Query params:', req.query);
            console.log('[ShiftHandover] User:', req.user);

            const {
                page = 1,
                limit = 10,
                sector,
                status,
                shift,
                startDate,
                endDate,
                search
            } = req.query;

            const query = {};

            if (sector) query.sector = sector;
            if (status) query.status = status;
            if (shift) query.shift = shift;

            if (startDate || endDate) {
                query.shiftDate = {};
                if (startDate) query.shiftDate.$gte = new Date(startDate);
                if (endDate) query.shiftDate.$lte = new Date(endDate);
            }

            if (search) {
                query.$or = [
                    { sector: { $regex: search, $options: 'i' } },
                    { unit: { $regex: search, $options: 'i' } },
                    { handingOverName: { $regex: search, $options: 'i' } },
                    { receivingName: { $regex: search, $options: 'i' } },
                    { generalSummary: { $regex: search, $options: 'i' } }
                ];
            }

            const skip = (parseInt(page) - 1) * parseInt(limit);

            const handovers = await ShiftHandover.find(query)
                .populate('handingOverUser', 'name email')
                .populate('receivingUser', 'name email')
                .sort({ shiftDate: -1, createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit));

            const total = await ShiftHandover.countDocuments(query);

            res.status(200).json({
                handovers,
                pagination: {
                    total,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalPages: Math.ceil(total / parseInt(limit))
                }
            });

        } catch (error) {
            console.error('Erro ao listar passagens:', error);
            res.status(500).json({ message: 'Erro ao listar passagens', error: error.message });
        }
    }

    // Buscar por ID
    static async getById(req, res) {
        try {
            const { id } = req.params;

            const handover = await ShiftHandover.findById(id)
                .populate('handingOverUser', 'name email phone')
                .populate('receivingUser', 'name email phone');

            if (!handover) {
                return res.status(404).json({ message: 'Passagem de plantão não encontrada' });
            }

            res.status(200).json({ handover });

        } catch (error) {
            console.error('Erro ao buscar passagem:', error);
            res.status(500).json({ message: 'Erro ao buscar passagem', error: error.message });
        }
    }

    // Atualizar passagem (apenas se não estiver bloqueada)
    static async update(req, res) {
        try {
            const { id } = req.params;
            const token = getToken(req);
            const user = await getUserByToken(token);

            const handover = await ShiftHandover.findById(id);

            if (!handover) {
                return res.status(404).json({ message: 'Passagem de plantão não encontrada' });
            }

            // Verificar se está bloqueada
            if (handover.locked) {
                return res.status(403).json({
                    message: 'Esta passagem está bloqueada e não pode ser editada'
                });
            }

            // Verificar se o usuário é o criador ou admin
            if (handover.handingOverUser.toString() !== user._id.toString() && user.role !== 'admin') {
                return res.status(403).json({
                    message: 'Você não tem permissão para editar esta passagem'
                });
            }

            const updateData = { ...req.body };
            delete updateData.handedOverSignature; // Não permitir alterar assinatura
            delete updateData.receivedSignature;
            delete updateData.locked;

            Object.assign(handover, updateData);
            await handover.save();

            res.status(200).json({
                message: 'Passagem atualizada com sucesso!',
                handover
            });

        } catch (error) {
            console.error('Erro ao atualizar passagem:', error);
            res.status(500).json({ message: 'Erro ao atualizar passagem', error: error.message });
        }
    }

    // Confirmar recebimento
    static async confirmReceipt(req, res) {
        try {
            const { id } = req.params;
            const token = getToken(req);
            const user = await getUserByToken(token);

            const handover = await ShiftHandover.findById(id);

            if (!handover) {
                return res.status(404).json({ message: 'Passagem de plantão não encontrada' });
            }

            if (handover.status === 'Recebido') {
                return res.status(400).json({ message: 'Esta passagem já foi confirmada' });
            }

            handover.receivingUser = user._id;
            handover.receivingName = user.name;
            handover.receivedAt = new Date();
            handover.receivedSignature = `${user._id}_${Date.now()}`;
            handover.status = 'Recebido';
            handover.locked = true; // Bloquear após confirmação
            handover.lockedAt = new Date();

            await handover.save();

            res.status(200).json({
                message: 'Recebimento confirmado com sucesso!',
                handover
            });

        } catch (error) {
            console.error('Erro ao confirmar recebimento:', error);
            res.status(500).json({ message: 'Erro ao confirmar recebimento', error: error.message });
        }
    }

    // Exportar para PDF (retorna dados formatados)
    static async exportData(req, res) {
        try {
            const { id } = req.params;

            const handover = await ShiftHandover.findById(id)
                .populate('handingOverUser', 'name email phone')
                .populate('receivingUser', 'name email phone');

            if (!handover) {
                return res.status(404).json({ message: 'Passagem de plantão não encontrada' });
            }

            // Retorna dados formatados para geração de PDF no frontend
            res.status(200).json({
                handover,
                exportReady: true
            });

        } catch (error) {
            console.error('Erro ao exportar:', error);
            res.status(500).json({ message: 'Erro ao exportar', error: error.message });
        }
    }

    // Deletar (apenas admin)
    static async delete(req, res) {
        try {
            const { id } = req.params;
            const token = getToken(req);
            const user = await getUserByToken(token);

            if (user.role !== 'admin') {
                return res.status(403).json({ message: 'Apenas administradores podem deletar passagens' });
            }

            const handover = await ShiftHandover.findById(id);

            if (!handover) {
                return res.status(404).json({ message: 'Passagem de plantão não encontrada' });
            }

            await ShiftHandover.findByIdAndDelete(id);

            res.status(200).json({ message: 'Passagem deletada com sucesso!' });

        } catch (error) {
            console.error('Erro ao deletar:', error);
            res.status(500).json({ message: 'Erro ao deletar', error: error.message });
        }
    }

    // Histórico de passagens anteriores
    static async getHistory(req, res) {
        try {
            const { sector, limit = 10 } = req.query;

            const query = sector ? { sector } : {};

            const history = await ShiftHandover.find(query)
                .populate('handingOverUser', 'name')
                .populate('receivingUser', 'name')
                .sort({ shiftDate: -1 })
                .limit(parseInt(limit))
                .select('sector shift shiftDate handingOverName receivingName status shiftClimate');

            res.status(200).json({ history });

        } catch (error) {
            console.error('Erro ao buscar histórico:', error);
            res.status(500).json({ message: 'Erro ao buscar histórico', error: error.message });
        }
    }

    // Estatísticas
    static async getStats(req, res) {
        try {
            const { startDate, endDate, sector } = req.query;

            const query = {};
            if (sector) query.sector = sector;
            if (startDate || endDate) {
                query.shiftDate = {};
                if (startDate) query.shiftDate.$gte = new Date(startDate);
                if (endDate) query.shiftDate.$lte = new Date(endDate);
            }

            const total = await ShiftHandover.countDocuments(query);
            const pending = await ShiftHandover.countDocuments({ ...query, status: 'Pendente' });
            const received = await ShiftHandover.countDocuments({ ...query, status: 'Recebido' });

            const bySector = await ShiftHandover.aggregate([
                { $match: query },
                { $group: { _id: '$sector', count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ]);

            const byShift = await ShiftHandover.aggregate([
                { $match: query },
                { $group: { _id: '$shift', count: { $sum: 1 } } }
            ]);

            res.status(200).json({
                stats: {
                    total,
                    pending,
                    received,
                    bySector,
                    byShift
                }
            });

        } catch (error) {
            console.error('Erro ao buscar estatísticas:', error);
            res.status(500).json({ message: 'Erro ao buscar estatísticas', error: error.message });
        }
    }
};
