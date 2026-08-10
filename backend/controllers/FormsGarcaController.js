const fs = require('fs');
const path = require('path');
const FormGarca = require('../models/FormGarca');
const InscriptionGarca = require('../models/InscriptionGarca');
const { BASE_DIR } = require('../helpers/file-upload');
const { recordAudit } = require('../helpers/audit-log');

function isAdmin(req) {
    return req?.user?.role === 'admin';
}

function canAccessInscription(req, inscription) {
    if (isAdmin(req)) return true;
    return inscription?.userId && req?.user?.id && String(inscription.userId) === String(req.user.id);
}

function toSafeInscription(inscription) {
    const item = typeof inscription.toObject === 'function' ? inscription.toObject() : inscription;
    return {
        ...item,
        userEmail: undefined,
        userPhone: undefined,
        userCpf: undefined,
    };
}

module.exports = class FormsGarcaController {

    // ─── FORMULÁRIOS (CRUD) ───────────────────

    // POST /forms-garca/forms
    static async createForm(req, res) {
        try {
            if (!isAdmin(req)) {
                return res.status(403).json({ message: 'Acesso restrito a administradores.' });
            }
            const { titulo, descricao, dataEvento, idSolicitacao1Doc, status, campos, createdBy } = req.body;

            if (!titulo || !dataEvento) {
                return res.status(422).json({ message: 'Título e Data do Evento são obrigatórios.' });
            }

            // Converte campos para o formato do schema
            const camposMapped = (campos || []).map(c => ({
                fieldId: c.id || c.fieldId,
                label: c.label,
                type: c.type || 'text',
                required: c.required || false,
                value: c.value || null,
                options: c.options || [],
            }));

            const form = new FormGarca({
                titulo,
                descricao,
                dataEvento: new Date(dataEvento),
                idSolicitacao1Doc,
                status: status || 'aberto',
                createdBy,
                campos: camposMapped,
            });

            const saved = await form.save();
            await recordAudit(req, {
                action: 'form.create',
                resourceType: 'form',
                resourceId: saved._id,
                metadata: { status: saved.status },
            });
            return res.status(201).json({ message: 'Formulário criado!', form: saved });
        } catch (error) {
            console.error('Erro ao criar formulário:', error);
            return res.status(500).json({ message: 'Erro ao criar formulário.', error: error.message });
        }
    }

    // GET /forms-garca/forms
    static async getForms(req, res) {
        try {
            if (!isAdmin(req)) {
                return res.status(403).json({ message: 'Acesso restrito a administradores.' });
            }
            const { status } = req.query;
            const filter = {};
            if (status) filter.status = status;

            const forms = await FormGarca.find(filter).sort({ createdAt: -1 });
            return res.status(200).json({ forms });
        } catch (error) {
            console.error('Erro ao buscar formulários:', error);
            return res.status(500).json({ message: 'Erro ao buscar formulários.', error: error.message });
        }
    }

    // GET /forms-garca/forms/:id
    static async getFormById(req, res) {
        try {
            if (!isAdmin(req)) {
                return res.status(403).json({ message: 'Acesso restrito a administradores.' });
            }
            const form = await FormGarca.findById(req.params.id);
            if (!form) {
                return res.status(404).json({ message: 'Formulário não encontrado.' });
            }
            return res.status(200).json({ form });
        } catch (error) {
            console.error('Erro ao buscar formulário:', error);
            return res.status(500).json({ message: 'Erro ao buscar formulário.', error: error.message });
        }
    }

    // PUT /forms-garca/forms/:id
    static async updateForm(req, res) {
        try {
            if (!isAdmin(req)) {
                return res.status(403).json({ message: 'Acesso restrito a administradores.' });
            }
            const { titulo, descricao, dataEvento, idSolicitacao1Doc, status, campos, updatedBy } = req.body;

            const updateData = {};
            if (titulo !== undefined) updateData.titulo = titulo;
            if (descricao !== undefined) updateData.descricao = descricao;
            if (dataEvento !== undefined) updateData.dataEvento = new Date(dataEvento);
            if (idSolicitacao1Doc !== undefined) updateData.idSolicitacao1Doc = idSolicitacao1Doc;
            if (status !== undefined) updateData.status = status;
            if (updatedBy !== undefined) updateData.updatedBy = updatedBy;

            if (campos !== undefined) {
                updateData.campos = (campos || []).map(c => ({
                    fieldId: c.id || c.fieldId,
                    label: c.label,
                    type: c.type || 'text',
                    required: c.required || false,
                    value: c.value || null,
                    options: c.options || [],
                }));
            }

            const form = await FormGarca.findByIdAndUpdate(req.params.id, updateData, { new: true });
            if (!form) {
                return res.status(404).json({ message: 'Formulário não encontrado.' });
            }
            await recordAudit(req, {
                action: 'form.update',
                resourceType: 'form',
                resourceId: form._id,
            });
            return res.status(200).json({ message: 'Formulário atualizado!', form });
        } catch (error) {
            console.error('Erro ao atualizar formulário:', error);
            return res.status(500).json({ message: 'Erro ao atualizar formulário.', error: error.message });
        }
    }

    // DELETE /forms-garca/forms/:id
    static async deleteForm(req, res) {
        try {
            if (!isAdmin(req)) {
                return res.status(403).json({ message: 'Acesso restrito a administradores.' });
            }
            const form = await FormGarca.findByIdAndDelete(req.params.id);
            if (!form) {
                return res.status(404).json({ message: 'Formulário não encontrado.' });
            }
            // Também deleta todas as inscrições vinculadas
            await InscriptionGarca.deleteMany({ formId: req.params.id });
            await recordAudit(req, {
                action: 'form.delete',
                resourceType: 'form',
                resourceId: req.params.id,
            });
            return res.status(200).json({ message: 'Formulário e inscrições deletados!' });
        } catch (error) {
            console.error('Erro ao deletar formulário:', error);
            return res.status(500).json({ message: 'Erro ao deletar formulário.', error: error.message });
        }
    }

    // GET /forms-garca/forms/statistics
    static async getStatistics(req, res) {
        try {
            if (!isAdmin(req)) {
                return res.status(403).json({ message: 'Acesso restrito a administradores.' });
            }
            const total = await FormGarca.countDocuments();
            const aberto = await FormGarca.countDocuments({ status: 'aberto' });
            const emAndamento = await FormGarca.countDocuments({ status: 'emAndamento' });
            const concluido = await FormGarca.countDocuments({ status: 'concluido' });

            return res.status(200).json({ total, aberto, emAndamento, concluido });
        } catch (error) {
            return res.status(500).json({ message: 'Erro ao buscar estatísticas.', error: error.message });
        }
    }

    // ─── INSCRIÇÕES (CRUD) ────────────────────

    // POST /forms-garca/inscriptions
    static async createInscription(req, res) {
        try {
            const { formId, userId, userName, userEmail, userPhone, userCpf, formData } = req.body;
            const requesterId = req?.user?.id;
            if (!isAdmin(req) && requesterId && String(userId) !== String(requesterId)) {
                return res.status(403).json({ message: 'Você só pode criar inscrição para o próprio usuário.' });
            }

            if (!formId || !userId || !userName || !userEmail) {
                return res.status(422).json({ message: 'formId, userId, userName e userEmail são obrigatórios.' });
            }

            // Verifica se o usuário já se inscreveu neste formulário
            const existing = await InscriptionGarca.findOne({ formId, userId });
            if (existing) {
                return res.status(409).json({ message: 'Você já está inscrito neste formulário.' });
            }

            // Gera código de voucher único
            let voucherCode = '';
            let isUnique = false;
            let attempts = 0;
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            while (!isUnique && attempts < 10) {
                voucherCode = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
                const check = await InscriptionGarca.findOne({ voucherCode });
                if (!check) isUnique = true;
                attempts++;
            }

            if (!isUnique) {
                return res.status(500).json({ message: 'Erro ao gerar código único. Tente novamente.' });
            }

            const inscription = new InscriptionGarca({
                formId,
                userId,
                userName,
                userEmail,
                userPhone,
                userCpf,
                voucherCode,
                formData: formData || {},
            });

            const saved = await inscription.save();
            await recordAudit(req, {
                action: 'form.inscription_create',
                resourceType: 'inscription',
                resourceId: saved._id,
                metadata: { formId },
            });
            return res.status(201).json({ message: 'Inscrição criada!', inscription: toSafeInscription(saved), inscriptionId: saved._id.toString() });
        } catch (error) {
            console.error('Erro ao criar inscrição:', error);
            return res.status(500).json({ message: 'Erro ao criar inscrição.', error: error.message });
        }
    }

    // GET /forms-garca/inscriptions?formId=xxx
    static async getInscriptions(req, res) {
        try {
            const { formId, userId } = req.query;
            const filter = {};
            if (formId) filter.formId = formId;
            if (isAdmin(req)) {
                if (userId) filter.userId = userId;
            } else {
                filter.userId = req?.user?.id;
            }

            const inscriptions = await InscriptionGarca.find(filter).sort({ createdAt: -1 });
            return res.status(200).json({ inscriptions: inscriptions.map(toSafeInscription) });
        } catch (error) {
            console.error('Erro ao buscar inscrições:', error);
            return res.status(500).json({ message: 'Erro ao buscar inscrições.', error: error.message });
        }
    }

    // GET /forms-garca/inscriptions/:id
    static async getInscriptionById(req, res) {
        try {
            const inscription = await InscriptionGarca.findById(req.params.id);
            if (!inscription) {
                return res.status(404).json({ message: 'Inscrição não encontrada.' });
            }
            if (!canAccessInscription(req, inscription)) {
                return res.status(403).json({ message: 'Acesso negado a esta inscrição.' });
            }
            return res.status(200).json({ inscription: toSafeInscription(inscription) });
        } catch (error) {
            return res.status(500).json({ message: 'Erro ao buscar inscrição.', error: error.message });
        }
    }

    // PUT /forms-garca/inscriptions/:id
    static async updateInscription(req, res) {
        try {
            const existing = await InscriptionGarca.findById(req.params.id);
            if (!existing) {
                return res.status(404).json({ message: 'Inscrição não encontrada.' });
            }
            if (!canAccessInscription(req, existing)) {
                return res.status(403).json({ message: 'Acesso negado a esta inscrição.' });
            }
            const updateData = {};
            const { formData, userName, userEmail, userPhone, userCpf } = req.body;
            if (formData !== undefined) updateData.formData = formData;
            if (userName !== undefined) updateData.userName = userName;
            if (userEmail !== undefined) updateData.userEmail = userEmail;
            if (userPhone !== undefined) updateData.userPhone = userPhone;
            if (userCpf !== undefined) updateData.userCpf = userCpf;

            const inscription = await InscriptionGarca.findByIdAndUpdate(req.params.id, updateData, { new: true });
            await recordAudit(req, {
                action: 'form.inscription_update',
                resourceType: 'inscription',
                resourceId: req.params.id,
            });
            return res.status(200).json({ message: 'Inscrição atualizada!', inscription: toSafeInscription(inscription) });
        } catch (error) {
            return res.status(500).json({ message: 'Erro ao atualizar inscrição.', error: error.message });
        }
    }

    // DELETE /forms-garca/inscriptions/:id
    static async deleteInscription(req, res) {
        try {
            const existing = await InscriptionGarca.findById(req.params.id);
            if (!existing) {
                return res.status(404).json({ message: 'Inscrição não encontrada.' });
            }
            if (!canAccessInscription(req, existing)) {
                return res.status(403).json({ message: 'Acesso negado a esta inscrição.' });
            }
            const inscription = await InscriptionGarca.findByIdAndDelete(req.params.id);
            await recordAudit(req, {
                action: 'form.inscription_delete',
                resourceType: 'inscription',
                resourceId: req.params.id,
            });
            return res.status(200).json({ message: 'Inscrição deletada!' });
        } catch (error) {
            return res.status(500).json({ message: 'Erro ao deletar inscrição.', error: error.message });
        }
    }

    // GET /forms-garca/inscriptions/check?formId=xxx&userId=yyy
    static async isUserInscribed(req, res) {
        try {
            const { formId, userId } = req.query;
            const lookupUserId = isAdmin(req) ? userId : req?.user?.id;
            const existing = await InscriptionGarca.findOne({ formId, userId: lookupUserId });
            return res.status(200).json({ inscribed: !!existing });
        } catch (error) {
            return res.status(500).json({ message: 'Erro ao verificar inscrição.', error: error.message });
        }
    }

    // ─── UPLOAD DE ARQUIVOS ───────────────────

    // POST /forms-garca/upload
    static async upload(req, res) {
        if (!req.file) {
            return res.status(422).json({ message: 'Por favor, envie um arquivo.' });
        }

        try {
            const file = req.file;
            let relativePath = path.relative(BASE_DIR, file.path);
            relativePath = relativePath.split(path.sep).join('/');

            const appUrl = process.env.APP_URL || 'http://localhost';
            const fileLink = `${appUrl}/api/images/${relativePath}`;

            return res.status(200).json({
                message: 'Arquivo enviado com sucesso!',
                fileLink: fileLink,
                originalName: file.originalname,
                size: file.size
            });
        } catch (error) {
            return res.status(500).json({ message: 'Erro ao processar upload.', error: error.message });
        }
    }

    // POST /forms-garca/upload-multiple
    static async uploadMultiple(req, res) {
        if (!req.files || req.files.length === 0) {
            return res.status(422).json({ message: 'Por favor, envie pelo menos um arquivo.' });
        }

        try {
            const appUrl = process.env.APP_URL || 'http://localhost';
            const filesData = req.files.map(file => {
                let relativePath = path.relative(BASE_DIR, file.path);
                relativePath = relativePath.split(path.sep).join('/');
                return {
                    originalName: file.originalname,
                    size: file.size,
                    fileLink: `${appUrl}/api/images/${relativePath}`
                };
            });

            return res.status(200).json({
                message: 'Arquivos enviados com sucesso!',
                files: filesData
            });
        } catch (error) {
            return res.status(500).json({ message: 'Erro ao processar uploads.', error: error.message });
        }
    }
};
