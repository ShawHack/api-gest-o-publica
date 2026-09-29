const path = require('path');
const FormGarca = require('../models/FormGarca');
const InscriptionGarca = require('../models/InscriptionGarca');
const { BASE_DIR } = require('../helpers/file-upload');
const { recordAudit } = require('../helpers/audit-log');

function slugify(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function isMasterAdmin(req) {
  const role = req?.user?.role;
  return role === 'admin' || role === 'semit' || req?.user?.isAdmin === true;
}

function isFormsAdmin(req) {
  const role = req?.user?.role;
  return isMasterAdmin(req) || role === 'forms_admin';
}

function canManageForms(req) {
  const role = req?.user?.role;
  return isFormsAdmin(req) || role === 'forms_organizador';
}

function canManageForm(req, form) {
  if (isFormsAdmin(req)) return true;
  if (req?.user?.role === 'forms_organizador') {
    const userId = String(req?.user?.id || req?.user?._id || '');
    if (form.createdBy && String(form.createdBy) === userId) return true;
    if (Array.isArray(form.organizadores) && form.organizadores.some(id => String(id) === userId)) return true;
  }
  return false;
}

function canAccessInscription(req, inscription) {
  if (isFormsAdmin(req)) return true;
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

  // ─── FORMULÁRIOS / EVENTOS (CRUD) ───────────────────

  // POST /forms-garca/forms
  static async createForm(req, res) {
    try {
      if (!canManageForms(req)) {
        return res.status(403).json({ message: 'Acesso restrito a administradores e organizadores de formulários.' });
      }
      const {
        titulo,
        subtitulo,
        slug: requestedSlug,
        descricao,
        dataEvento,
        dataFim,
        tipoEvento,
        inicioInscricoes,
        fimInscricoes,
        limiteInscricoes,
        inscricoesAbertas,
        permitirMultiplasInscricoes,
        mensagemConfirmacao,
        orientacoesInscricao,
        local,
        endereco,
        numero,
        complemento,
        bairro,
        cidade,
        estado,
        cep,
        linkOnline,
        tema,
        corPrimaria,
        logoUrl,
        bannerUrl,
        organizadorNome,
        organizadorDescricao,
        organizadorEmail,
        organizadorTelefone,
        idSolicitacao1Doc,
        status,
        campos,
        createdBy,
      } = req.body;

      if (!titulo || !dataEvento) {
        return res.status(422).json({ message: 'Título e Data do Evento são obrigatórios.' });
      }

      // Gera slug único
      let baseSlug = slugify(requestedSlug || titulo) || 'evento';
      let candidateSlug = baseSlug;
      let count = 1;
      while (await FormGarca.findOne({ slug: candidateSlug })) {
        candidateSlug = `${baseSlug}-${count++}`;
      }

      // Converte campos para o formato do schema
      const camposMapped = (campos || []).map((c, idx) => ({
        fieldId: c.id || c.fieldId || `f_${Date.now()}_${idx}`,
        label: c.label || '',
        type: c.type || 'text',
        required: c.required || false,
        placeholder: c.placeholder || '',
        helpText: c.helpText || '',
        ordem: c.ordem !== undefined ? c.ordem : idx,
        value: c.value || null,
        options: c.options || [],
        validacoes: c.validacoes || {},
      }));

      const finalStatus = status || 'rascunho';
      const isPublicado = finalStatus === 'aberto' || finalStatus === 'emAndamento';

      const form = new FormGarca({
        titulo,
        subtitulo: subtitulo || '',
        slug: candidateSlug,
        descricao: descricao || '',
        dataEvento: new Date(dataEvento),
        dataFim: dataFim ? new Date(dataFim) : null,
        tipoEvento: tipoEvento || 'presencial',
        inicioInscricoes: inicioInscricoes ? new Date(inicioInscricoes) : null,
        fimInscricoes: fimInscricoes ? new Date(fimInscricoes) : null,
        limiteInscricoes: limiteInscricoes !== undefined && limiteInscricoes !== '' ? Number(limiteInscricoes) : null,
        inscricoesAbertas: inscricoesAbertas !== undefined ? Boolean(inscricoesAbertas) : true,
        permitirMultiplasInscricoes: Boolean(permitirMultiplasInscricoes),
        mensagemConfirmacao: mensagemConfirmacao || '',
        orientacoesInscricao: orientacoesInscricao || '',
        local: local || '',
        endereco: endereco || '',
        numero: numero || '',
        complemento: complemento || '',
        bairro: bairro || '',
        cidade: cidade || 'Garça',
        estado: estado || 'SP',
        cep: cep || '',
        linkOnline: linkOnline || '',
        tema: tema || 'padrao',
        corPrimaria: corPrimaria || '#1e3a8a',
        logoUrl: logoUrl || '',
        bannerUrl: bannerUrl || '',
        organizadorNome: organizadorNome || '',
        organizadorDescricao: organizadorDescricao || '',
        organizadorEmail: organizadorEmail || '',
        organizadorTelefone: organizadorTelefone || '',
        idSolicitacao1Doc: idSolicitacao1Doc || null,
        status: finalStatus,
        publicado: isPublicado,
        createdBy: createdBy || String(req.user?.id || req.user?._id || ''),
        campos: camposMapped,
      });

      const saved = await form.save();
      await recordAudit(req, {
        action: 'form.create',
        resourceType: 'form',
        resourceId: saved._id,
        metadata: { status: saved.status, slug: saved.slug },
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
      if (!canManageForms(req)) {
        return res.status(403).json({ message: 'Acesso restrito a administradores e organizadores.' });
      }
      const { status, q, period } = req.query;
      const filter = { deletedAt: null };

      if (!isFormsAdmin(req)) {
        const userId = String(req.user?.id || req.user?._id || '');
        filter.$or = [{ createdBy: userId }, { organizadores: userId }];
      }

      if (status) {
        const statuses = status.split(',').map(s => s.trim());
        filter.status = { $in: statuses };
      }

      if (q && q.trim()) {
        const regex = new RegExp(q.trim(), 'i');
        const qFilter = [{ titulo: regex }, { subtitulo: regex }, { local: regex }];
        if (filter.$or) {
          filter.$and = [{ $or: filter.$or }, { $or: qFilter }];
          delete filter.$or;
        } else {
          filter.$or = qFilter;
        }
      }

      if (period === 'futuros') {
        filter.dataEvento = { $gte: new Date() };
      } else if (period === 'passados') {
        filter.dataEvento = { $lt: new Date() };
      }

      const forms = await FormGarca.find(filter).sort({ dataEvento: -1, createdAt: -1 });

      // Agrega contagens de inscritos para cada formulário
      const formIds = forms.map(f => f._id);
      const inscriptionCounts = await InscriptionGarca.aggregate([
        { $match: { formId: { $in: formIds } } },
        {
          $group: {
            _id: '$formId',
            total: { $sum: 1 },
            confirmadas: { $sum: { $cond: [{ $eq: ['$status', 'confirmada'] }, 1, 0] } },
          },
        },
      ]);

      const countsMap = {};
      for (const item of inscriptionCounts) {
        countsMap[item._id.toString()] = item;
      }

      const enrichedForms = forms.map(f => {
        const counts = countsMap[f._id.toString()] || { total: 0, confirmadas: 0 };
        const fObj = f.toObject();
        return {
          ...fObj,
          totalInscritos: counts.total,
          confirmados: counts.confirmadas,
          vagasOcupadas: counts.confirmadas,
          vagasRestantes: f.limiteInscricoes ? Math.max(0, f.limiteInscricoes - counts.confirmadas) : null,
        };
      });

      return res.status(200).json({ forms: enrichedForms });
    } catch (error) {
      console.error('Erro ao buscar formulários:', error);
      return res.status(500).json({ message: 'Erro ao buscar formulários.', error: error.message });
    }
  }

  // GET /forms-garca/forms/:id
  static async getFormById(req, res) {
    try {
      if (!canManageForms(req)) {
        return res.status(403).json({ message: 'Acesso restrito.' });
      }
      const form = await FormGarca.findOne({ _id: req.params.id, deletedAt: null });
      if (!form) {
        return res.status(404).json({ message: 'Formulário não encontrado.' });
      }
      if (!canManageForm(req, form)) {
        return res.status(403).json({ message: 'Acesso negado a este evento.' });
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
      if (!canManageForms(req)) {
        return res.status(403).json({ message: 'Acesso restrito.' });
      }
      const existing = await FormGarca.findOne({ _id: req.params.id, deletedAt: null });
      if (!existing) {
        return res.status(404).json({ message: 'Formulário não encontrado.' });
      }
      if (!canManageForm(req, existing)) {
        return res.status(403).json({ message: 'Acesso negado a este evento.' });
      }

      const {
        titulo,
        subtitulo,
        slug: requestedSlug,
        descricao,
        dataEvento,
        dataFim,
        tipoEvento,
        inicioInscricoes,
        fimInscricoes,
        limiteInscricoes,
        inscricoesAbertas,
        permitirMultiplasInscricoes,
        mensagemConfirmacao,
        orientacoesInscricao,
        local,
        endereco,
        numero,
        complemento,
        bairro,
        cidade,
        estado,
        cep,
        linkOnline,
        tema,
        corPrimaria,
        logoUrl,
        bannerUrl,
        organizadorNome,
        organizadorDescricao,
        organizadorEmail,
        organizadorTelefone,
        idSolicitacao1Doc,
        status,
        campos,
        publicado,
      } = req.body;

      const updateData = {
        updatedBy: String(req.user?.id || req.user?._id || ''),
      };

      if (titulo !== undefined) updateData.titulo = titulo;
      if (subtitulo !== undefined) updateData.subtitulo = subtitulo;
      if (descricao !== undefined) updateData.descricao = descricao;
      if (dataEvento !== undefined) updateData.dataEvento = new Date(dataEvento);
      if (dataFim !== undefined) updateData.dataFim = dataFim ? new Date(dataFim) : null;
      if (tipoEvento !== undefined) updateData.tipoEvento = tipoEvento;
      if (inicioInscricoes !== undefined) updateData.inicioInscricoes = inicioInscricoes ? new Date(inicioInscricoes) : null;
      if (fimInscricoes !== undefined) updateData.fimInscricoes = fimInscricoes ? new Date(fimInscricoes) : null;
      if (limiteInscricoes !== undefined) updateData.limiteInscricoes = limiteInscricoes !== '' ? Number(limiteInscricoes) : null;
      if (inscricoesAbertas !== undefined) updateData.inscricoesAbertas = Boolean(inscricoesAbertas);
      if (permitirMultiplasInscricoes !== undefined) updateData.permitirMultiplasInscricoes = Boolean(permitirMultiplasInscricoes);
      if (mensagemConfirmacao !== undefined) updateData.mensagemConfirmacao = mensagemConfirmacao;
      if (orientacoesInscricao !== undefined) updateData.orientacoesInscricao = orientacoesInscricao;
      if (local !== undefined) updateData.local = local;
      if (endereco !== undefined) updateData.endereco = endereco;
      if (numero !== undefined) updateData.numero = numero;
      if (complemento !== undefined) updateData.complemento = complemento;
      if (bairro !== undefined) updateData.bairro = bairro;
      if (cidade !== undefined) updateData.cidade = cidade;
      if (estado !== undefined) updateData.estado = estado;
      if (cep !== undefined) updateData.cep = cep;
      if (linkOnline !== undefined) updateData.linkOnline = linkOnline;
      if (tema !== undefined) updateData.tema = tema;
      if (corPrimaria !== undefined) updateData.corPrimaria = corPrimaria;
      if (logoUrl !== undefined) updateData.logoUrl = logoUrl;
      if (bannerUrl !== undefined) updateData.bannerUrl = bannerUrl;
      if (organizadorNome !== undefined) updateData.organizadorNome = organizadorNome;
      if (organizadorDescricao !== undefined) updateData.organizadorDescricao = organizadorDescricao;
      if (organizadorEmail !== undefined) updateData.organizadorEmail = organizadorEmail;
      if (organizadorTelefone !== undefined) updateData.organizadorTelefone = organizadorTelefone;
      if (idSolicitacao1Doc !== undefined) updateData.idSolicitacao1Doc = idSolicitacao1Doc;

      if (status !== undefined) {
        updateData.status = status;
        if (status === 'aberto' || status === 'emAndamento') updateData.publicado = true;
        if (status === 'rascunho' || status === 'arquivado') updateData.publicado = false;
      }
      if (publicado !== undefined) {
        updateData.publicado = Boolean(publicado);
      }

      if (requestedSlug && requestedSlug !== existing.slug) {
        let baseSlug = slugify(requestedSlug);
        let candidateSlug = baseSlug;
        let count = 1;
        while (await FormGarca.findOne({ slug: candidateSlug, _id: { $ne: existing._id } })) {
          candidateSlug = `${baseSlug}-${count++}`;
        }
        updateData.slug = candidateSlug;
      }

      if (campos !== undefined) {
        updateData.campos = (campos || []).map((c, idx) => ({
          fieldId: c.id || c.fieldId || `f_${Date.now()}_${idx}`,
          label: c.label || '',
          type: c.type || 'text',
          required: c.required || false,
          placeholder: c.placeholder || '',
          helpText: c.helpText || '',
          ordem: c.ordem !== undefined ? c.ordem : idx,
          value: c.value || null,
          options: c.options || [],
          validacoes: c.validacoes || {},
        }));
      }

      const form = await FormGarca.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
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

  // POST /forms-garca/forms/:id/duplicate
  static async duplicateForm(req, res) {
    try {
      if (!canManageForms(req)) {
        return res.status(403).json({ message: 'Acesso restrito.' });
      }
      const existing = await FormGarca.findOne({ _id: req.params.id, deletedAt: null });
      if (!existing) {
        return res.status(404).json({ message: 'Formulário não encontrado.' });
      }
      if (!canManageForm(req, existing)) {
        return res.status(403).json({ message: 'Acesso negado a este evento.' });
      }

      const baseSlug = `${existing.slug || slugify(existing.titulo)}-copia`;
      let candidateSlug = baseSlug;
      let count = 1;
      while (await FormGarca.findOne({ slug: candidateSlug })) {
        candidateSlug = `${baseSlug}-${count++}`;
      }

      const copyData = existing.toObject();
      delete copyData._id;
      delete copyData.createdAt;
      delete copyData.updatedAt;
      delete copyData.__v;

      copyData.titulo = `${existing.titulo} (Cópia)`;
      copyData.slug = candidateSlug;
      copyData.status = 'rascunho';
      copyData.publicado = false;
      copyData.createdBy = String(req.user?.id || req.user?._id || '');

      const duplicated = new FormGarca(copyData);
      const saved = await duplicated.save();

      await recordAudit(req, {
        action: 'form.duplicate',
        resourceType: 'form',
        resourceId: saved._id,
        metadata: { originalId: existing._id },
      });

      return res.status(201).json({ message: 'Evento duplicado com sucesso como rascunho!', form: saved });
    } catch (error) {
      console.error('Erro ao duplicar formulário:', error);
      return res.status(500).json({ message: 'Erro ao duplicar formulário.', error: error.message });
    }
  }

  // POST /forms-garca/forms/:id/publish
  static async publishForm(req, res) {
    try {
      if (!canManageForms(req)) {
        return res.status(403).json({ message: 'Acesso restrito.' });
      }
      const existing = await FormGarca.findOne({ _id: req.params.id, deletedAt: null });
      if (!existing) {
        return res.status(404).json({ message: 'Formulário não encontrado.' });
      }
      if (!canManageForm(req, existing)) {
        return res.status(403).json({ message: 'Acesso negado a este evento.' });
      }

      if (!existing.titulo || !existing.dataEvento) {
        return res.status(422).json({ message: 'O evento precisa de título e data antes de ser publicado.' });
      }

      existing.publicado = true;
      existing.status = 'aberto';
      existing.updatedBy = String(req.user?.id || req.user?._id || '');
      await existing.save();

      await recordAudit(req, {
        action: 'form.publish',
        resourceType: 'form',
        resourceId: existing._id,
      });

      return res.status(200).json({ message: 'Evento publicado com sucesso!', form: existing });
    } catch (error) {
      return res.status(500).json({ message: 'Erro ao publicar formulário.', error: error.message });
    }
  }

  // POST /forms-garca/forms/:id/archive
  static async archiveForm(req, res) {
    try {
      if (!canManageForms(req)) {
        return res.status(403).json({ message: 'Acesso restrito.' });
      }
      const existing = await FormGarca.findOne({ _id: req.params.id, deletedAt: null });
      if (!existing) {
        return res.status(404).json({ message: 'Formulário não encontrado.' });
      }
      if (!canManageForm(req, existing)) {
        return res.status(403).json({ message: 'Acesso negado a este evento.' });
      }

      existing.publicado = false;
      existing.status = 'arquivado';
      existing.updatedBy = String(req.user?.id || req.user?._id || '');
      await existing.save();

      await recordAudit(req, {
        action: 'form.archive',
        resourceType: 'form',
        resourceId: existing._id,
      });

      return res.status(200).json({ message: 'Evento arquivado com sucesso!', form: existing });
    } catch (error) {
      return res.status(500).json({ message: 'Erro ao arquivar formulário.', error: error.message });
    }
  }

  // GET /forms-garca/forms/:id/dashboard
  static async getFormDashboard(req, res) {
    try {
      if (!canManageForms(req)) {
        return res.status(403).json({ message: 'Acesso restrito.' });
      }
      const form = await FormGarca.findOne({ _id: req.params.id, deletedAt: null });
      if (!form) {
        return res.status(404).json({ message: 'Formulário não encontrado.' });
      }
      if (!canManageForm(req, form)) {
        return res.status(403).json({ message: 'Acesso negado a este evento.' });
      }

      const totalInscritos = await InscriptionGarca.countDocuments({ formId: form._id });
      const confirmados = await InscriptionGarca.countDocuments({ formId: form._id, status: 'confirmada' });
      const pendentes = await InscriptionGarca.countDocuments({ formId: form._id, status: 'pendente' });
      const cancelados = await InscriptionGarca.countDocuments({ formId: form._id, status: 'cancelada' });

      const limite = form.limiteInscricoes || null;
      const vagasOcupadas = confirmados;
      const vagasRestantes = limite !== null ? Math.max(0, limite - vagasOcupadas) : null;

      // Agrupamento por dia dos últimos 14 dias
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

      const dailyStats = await InscriptionGarca.aggregate([
        { $match: { formId: form._id, createdAt: { $gte: fourteenDaysAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      // Checklist de alertas antes da publicação
      const alerts = [];
      if (!form.descricao || form.descricao.trim().length < 10) {
        alerts.push('Adicione uma descrição detalhada do evento.');
      }
      if (!form.campos || form.campos.length === 0) {
        alerts.push('Configure pelo menos um campo de formulário para receber inscrições.');
      }
      if (!form.organizadorNome) {
        alerts.push('Defina o nome do organizador responsável.');
      }
      if (!form.bannerUrl) {
        alerts.push('Adicione um banner de apresentação para melhorar a identidade visual.');
      }

      return res.status(200).json({
        event: form,
        indicators: {
          totalInscritos,
          confirmados,
          pendentes,
          cancelados,
          limite,
          vagasOcupadas,
          vagasRestantes,
        },
        dailyStats,
        alerts,
      });
    } catch (error) {
      console.error('Erro no dashboard do evento:', error);
      return res.status(500).json({ message: 'Erro ao gerar dashboard do evento.', error: error.message });
    }
  }

  // DELETE /forms-garca/forms/:id
  static async deleteForm(req, res) {
    try {
      if (!canManageForms(req)) {
        return res.status(403).json({ message: 'Acesso restrito.' });
      }
      const existing = await FormGarca.findOne({ _id: req.params.id, deletedAt: null });
      if (!existing) {
        return res.status(404).json({ message: 'Formulário não encontrado.' });
      }
      if (!canManageForm(req, existing)) {
        return res.status(403).json({ message: 'Acesso negado a este evento.' });
      }

      existing.deletedAt = new Date();
      existing.status = 'arquivado';
      existing.publicado = false;
      await existing.save();

      await recordAudit(req, {
        action: 'form.delete',
        resourceType: 'form',
        resourceId: req.params.id,
      });
      return res.status(200).json({ message: 'Formulário excluído com sucesso!' });
    } catch (error) {
      console.error('Erro ao deletar formulário:', error);
      return res.status(500).json({ message: 'Erro ao deletar formulário.', error: error.message });
    }
  }

  // GET /forms-garca/forms/statistics
  static async getStatistics(req, res) {
    try {
      if (!canManageForms(req)) {
        return res.status(403).json({ message: 'Acesso restrito.' });
      }
      const filter = { deletedAt: null };
      if (!isFormsAdmin(req)) {
        const userId = String(req.user?.id || req.user?._id || '');
        filter.$or = [{ createdBy: userId }, { organizadores: userId }];
      }

      const total = await FormGarca.countDocuments(filter);
      const aberto = await FormGarca.countDocuments({ ...filter, status: { $in: ['aberto', 'publicado'] } });
      const rascunho = await FormGarca.countDocuments({ ...filter, status: 'rascunho' });
      const emAndamento = await FormGarca.countDocuments({ ...filter, status: 'emAndamento' });
      const concluido = await FormGarca.countDocuments({ ...filter, status: { $in: ['concluido', 'encerrado'] } });
      const arquivado = await FormGarca.countDocuments({ ...filter, status: 'arquivado' });

      return res.status(200).json({ total, aberto, rascunho, emAndamento, concluido, arquivado });
    } catch (error) {
      return res.status(500).json({ message: 'Erro ao buscar estatísticas.', error: error.message });
    }
  }

  // ─── ÁREA PÚBLICA (SEM AUTENTICAÇÃO) ───────────────────

  // GET /forms-garca/public/forms/:slug
  static async getPublicFormBySlug(req, res) {
    try {
      const { slug } = req.params;
      const form = await FormGarca.findOne({
        slug: slug.toLowerCase(),
        publicado: true,
        deletedAt: null,
      });

      if (!form) {
        return res.status(404).json({ message: 'Evento não encontrado ou ainda não publicado.' });
      }

      // Calcula situação das vagas e período
      const now = new Date();
      let situacao = 'disponivel';
      let motivo = '';

      if (form.inicioInscricoes && now < form.inicioInscricoes) {
        situacao = 'nao_iniciada';
        motivo = 'As inscrições ainda não foram iniciadas.';
      } else if (form.fimInscricoes && now > form.fimInscricoes) {
        situacao = 'encerrada';
        motivo = 'O período de inscrições foi encerrado.';
      } else if (!form.inscricoesAbertas || form.status === 'encerrado' || form.status === 'concluido') {
        situacao = 'encerrada';
        motivo = 'Inscrições encerradas pela organização.';
      }

      let vagasRestantes = null;
      if (form.limiteInscricoes !== null && form.limiteInscricoes > 0) {
        const count = await InscriptionGarca.countDocuments({ formId: form._id, status: 'confirmada' });
        vagasRestantes = Math.max(0, form.limiteInscricoes - count);
        if (vagasRestantes <= 0) {
          situacao = 'esgotada';
          motivo = 'Vagas esgotadas para este evento.';
        }
      }

      const publicData = {
        _id: form._id,
        titulo: form.titulo,
        subtitulo: form.subtitulo,
        slug: form.slug,
        descricao: form.descricao,
        tipoEvento: form.tipoEvento,
        dataEvento: form.dataEvento,
        dataFim: form.dataFim,
        inicioInscricoes: form.inicioInscricoes,
        fimInscricoes: form.fimInscricoes,
        limiteInscricoes: form.limiteInscricoes,
        vagasRestantes,
        situacao,
        motivo,
        orientacoesInscricao: form.orientacoesInscricao,
        local: form.local,
        endereco: form.endereco,
        numero: form.numero,
        complemento: form.complemento,
        bairro: form.bairro,
        cidade: form.cidade,
        estado: form.estado,
        cep: form.cep,
        linkOnline: form.linkOnline,
        tema: form.tema,
        corPrimaria: form.corPrimaria,
        logoUrl: form.logoUrl,
        bannerUrl: form.bannerUrl,
        organizadorNome: form.organizadorNome,
        organizadorDescricao: form.organizadorDescricao,
        campos: (form.campos || [])
          .sort((a, b) => (a.ordem || 0) - (b.ordem || 0))
          .map(c => ({
            fieldId: c.fieldId,
            label: c.label,
            type: c.type,
            required: c.required,
            placeholder: c.placeholder,
            helpText: c.helpText,
            options: c.options || [],
          })),
      };

      return res.status(200).json({ event: publicData });
    } catch (error) {
      console.error('Erro ao buscar evento público:', error);
      return res.status(500).json({ message: 'Erro ao buscar evento.', error: error.message });
    }
  }

  // POST /forms-garca/public/forms/:slug/inscribe
  static async publicInscribeForm(req, res) {
    try {
      const { slug } = req.params;
      const { userName, userEmail, userPhone, userCpf, formData, arquivos } = req.body;

      if (!userName || !userEmail) {
        return res.status(422).json({ message: 'Nome e e-mail são obrigatórios.' });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(userEmail.trim())) {
        return res.status(422).json({ message: 'Por favor, informe um endereço de e-mail válido.' });
      }

      const form = await FormGarca.findOne({
        slug: slug.toLowerCase(),
        publicado: true,
        deletedAt: null,
      });

      if (!form) {
        return res.status(404).json({ message: 'Evento não encontrado ou indisponível para inscrições.' });
      }

      // Validação de período
      const now = new Date();
      if (form.inicioInscricoes && now < form.inicioInscricoes) {
        return res.status(400).json({ message: 'As inscrições para este evento ainda não foram abertas.' });
      }
      if (form.fimInscricoes && now > form.fimInscricoes) {
        return res.status(400).json({ message: 'O período de inscrições para este evento já foi encerrado.' });
      }
      if (!form.inscricoesAbertas || form.status === 'encerrado' || form.status === 'concluido' || form.status === 'arquivado') {
        return res.status(400).json({ message: 'As inscrições estão encerradas pela organização.' });
      }

      // Validação de limite de vagas
      if (form.limiteInscricoes !== null && form.limiteInscricoes > 0) {
        const count = await InscriptionGarca.countDocuments({ formId: form._id, status: 'confirmada' });
        if (count >= form.limiteInscricoes) {
          return res.status(400).json({ message: 'As vagas para este evento encontram-se esgotadas.' });
        }
      }

      // Prevenção de duplicidade por evento + e-mail / CPF
      const cleanEmail = userEmail.toLowerCase().trim();
      const cleanCpf = userCpf ? String(userCpf).replace(/\D/g, '') : null;

      if (!form.permitirMultiplasInscricoes) {
        const duplicateQuery = {
          formId: form._id,
          status: { $ne: 'cancelada' },
          $or: [
            { userEmail: cleanEmail },
            ...(cleanCpf ? [{ userCpf: cleanCpf }, { userCpf: userCpf }] : [])
          ]
        };
        const existing = await InscriptionGarca.findOne(duplicateQuery);
        if (existing) {
          return res.status(409).json({
            message: 'Já existe uma inscrição ativa para este evento com este e-mail ou CPF.',
            voucherCode: existing.voucherCode,
          });
        }
      }

      // Validação de campos obrigatórios
      const submittedData = formData || {};
      if (Array.isArray(form.campos)) {
        for (const campo of form.campos) {
          if (campo.required) {
            const val = submittedData[campo.fieldId] || submittedData[campo.label];
            if (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0)) {
              return res.status(422).json({
                message: `O campo obrigatório "${campo.label}" não foi preenchido.`,
                fieldId: campo.fieldId,
              });
            }
          }
        }
      }

      // Gera código de voucher único
      let voucherCode = '';
      let isUnique = false;
      let attempts = 0;
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
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
        formId: form._id,
        userId: req?.user?.id || null,
        userName: userName.trim(),
        userEmail: cleanEmail,
        userPhone: userPhone ? String(userPhone).trim() : '',
        userCpf: cleanCpf || userCpf || '',
        voucherCode,
        status: 'confirmada',
        formData: submittedData,
        arquivos: Array.isArray(arquivos) ? arquivos : [],
      });

      await inscription.save();

      await recordAudit(req, {
        action: 'form.public_inscribe',
        resourceType: 'inscription',
        resourceId: inscription._id,
        metadata: {
          formId: form._id,
          slug: form.slug,
          voucherCode,
          userName: inscription.userName,
          userEmail: inscription.userEmail,
        },
      });

      return res.status(201).json({
        message: 'Inscrição confirmada com sucesso!',
        inscription: {
          id: inscription._id,
          voucherCode: inscription.voucherCode,
          userName: inscription.userName,
          userEmail: inscription.userEmail,
          createdAt: inscription.createdAt,
          formTitle: form.titulo,
          mensagemConfirmacao: form.mensagemConfirmacao || 'Sua inscrição foi confirmada com sucesso!',
        },
      });
    } catch (error) {
      console.error('Erro ao realizar inscrição pública:', error);
      return res.status(500).json({ message: 'Erro ao processar inscrição.', error: error.message });
    }
  }

  // GET /forms-garca/public/vouchers/:voucherCode
  static async getPublicVoucher(req, res) {
    try {
      const code = String(req.params.voucherCode || '').toUpperCase().trim();
      const inscription = await InscriptionGarca.findOne({ voucherCode: code });
      if (!inscription) {
        return res.status(404).json({ message: 'Comprovante não encontrado ou código inválido.' });
      }

      const form = await FormGarca.findOne({ _id: inscription.formId });

      return res.status(200).json({
        valid: inscription.status === 'confirmada',
        status: inscription.status,
        voucherCode: inscription.voucherCode,
        userName: inscription.userName,
        createdAt: inscription.createdAt,
        event: form ? {
          titulo: form.titulo,
          dataEvento: form.dataEvento,
          dataFim: form.dataFim,
          local: form.local,
          endereco: form.endereco,
          organizadorNome: form.organizadorNome,
          tipoEvento: form.tipoEvento,
        } : null,
      });
    } catch (error) {
      return res.status(500).json({ message: 'Erro ao consultar comprovante.', error: error.message });
    }
  }

  // PATCH /forms-garca/inscriptions/:id/status
  static async updateInscriptionStatus(req, res) {
    try {
      const { status } = req.body;
      if (!['confirmada', 'pendente', 'cancelada'].includes(status)) {
        return res.status(422).json({ message: 'Status inválido. Use confirmada, pendente ou cancelada.' });
      }

      const inscription = await InscriptionGarca.findById(req.params.id);
      if (!inscription) {
        return res.status(404).json({ message: 'Inscrição não encontrada.' });
      }

      const form = await FormGarca.findById(inscription.formId);
      if (form && !canManageForm(req, form)) {
        return res.status(403).json({ message: 'Sem permissão para alterar inscrição deste evento.' });
      }

      const oldStatus = inscription.status;
      inscription.status = status;
      await inscription.save();

      await recordAudit(req, {
        action: 'form.inscription_status_change',
        resourceType: 'inscription',
        resourceId: inscription._id,
        metadata: { oldStatus, newStatus: status, formId: inscription.formId },
      });

      return res.status(200).json({ message: `Status alterado para ${status}!`, inscription });
    } catch (error) {
      return res.status(500).json({ message: 'Erro ao alterar status da inscrição.', error: error.message });
    }
  }

  // ─── INSCRIÇÕES (CRUD) ────────────────────

  // POST /forms-garca/inscriptions
  static async createInscription(req, res) {
    try {
      const { formId, userId, userName, userEmail, userPhone, userCpf, formData, arquivos } = req.body;
      const requesterId = req?.user?.id;
      if (!isFormsAdmin(req) && requesterId && String(userId) !== String(requesterId)) {
        return res.status(403).json({ message: 'Você só pode criar inscrição para o próprio usuário.' });
      }

      if (!formId || !userId || !userName || !userEmail) {
        return res.status(422).json({ message: 'formId, userId, userName e userEmail são obrigatórios.' });
      }

      const form = await FormGarca.findOne({ _id: formId, deletedAt: null });
      if (!form) {
        return res.status(404).json({ message: 'Evento não encontrado.' });
      }

      // Validação de período
      const now = new Date();
      if (form.inicioInscricoes && now < form.inicioInscricoes) {
        return res.status(400).json({ message: 'As inscrições para este evento ainda não foram abertas.' });
      }
      if (form.fimInscricoes && now > form.fimInscricoes) {
        return res.status(400).json({ message: 'O período de inscrições para este evento já se encerrou.' });
      }

      // Validação de vagas
      if (form.limiteInscricoes !== null && form.limiteInscricoes > 0) {
        const count = await InscriptionGarca.countDocuments({ formId, status: 'confirmada' });
        if (count >= form.limiteInscricoes) {
          return res.status(400).json({ message: 'As vagas para este evento estão esgotadas.' });
        }
      }

      // Prevenção de duplicidade por evento + usuário
      if (!form.permitirMultiplasInscricoes) {
        const existing = await InscriptionGarca.findOne({ formId, userId, status: { $ne: 'cancelada' } });
        if (existing) {
          return res.status(409).json({ message: 'Você já possui uma inscrição ativa para este evento.' });
        }
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
        userEmail: userEmail.toLowerCase().trim(),
        userPhone: userPhone || '',
        userCpf: userCpf || '',
        voucherCode,
        status: 'confirmada',
        formData: formData || {},
        arquivos: arquivos || [],
      });

      const saved = await inscription.save();
      await recordAudit(req, {
        action: 'form.inscription_create',
        resourceType: 'inscription',
        resourceId: saved._id,
        metadata: { formId, voucherCode },
      });

      return res.status(201).json({
        message: 'Inscrição confirmada com sucesso!',
        inscription: toSafeInscription(saved),
        voucherCode: saved.voucherCode,
        orientacoes: form.mensagemConfirmacao || form.orientacoesInscricao || '',
      });
    } catch (error) {
      console.error('Erro ao criar inscrição:', error);
      return res.status(500).json({ message: 'Erro ao criar inscrição.', error: error.message });
    }
  }

  // GET /forms-garca/inscriptions
  static async getInscriptions(req, res) {
    try {
      const { formId, userId, status, q } = req.query;
      const filter = {};
      if (formId) filter.formId = formId;

      if (isFormsAdmin(req)) {
        if (userId) filter.userId = userId;
      } else if (req?.user?.role === 'forms_organizador' && formId) {
        const form = await FormGarca.findById(formId);
        if (!form || !canManageForm(req, form)) {
          return res.status(403).json({ message: 'Acesso negado às inscrições deste evento.' });
        }
      } else {
        filter.userId = req?.user?.id;
      }

      if (status) filter.status = status;
      if (q && q.trim()) {
        const regex = new RegExp(q.trim(), 'i');
        filter.$or = [{ userName: regex }, { userEmail: regex }, { voucherCode: regex }];
      }

      const inscriptions = await InscriptionGarca.find(filter).sort({ createdAt: -1 });
      const isManager = isFormsAdmin(req) || req?.user?.role === 'forms_organizador';

      return res.status(200).json({
        inscriptions: inscriptions.map(i => (isManager ? i : toSafeInscription(i))),
      });
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
      const isManager = isFormsAdmin(req) || req?.user?.role === 'forms_organizador';
      return res.status(200).json({
        inscription: isManager ? inscription : toSafeInscription(inscription),
      });
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
      const { formData, userName, userEmail, userPhone, userCpf, status, observacoesAdmin } = req.body;

      if (formData !== undefined) updateData.formData = formData;
      if (userName !== undefined) updateData.userName = userName;
      if (userEmail !== undefined) updateData.userEmail = userEmail;
      if (userPhone !== undefined) updateData.userPhone = userPhone;
      if (userCpf !== undefined) updateData.userCpf = userCpf;

      if (status !== undefined && (isFormsAdmin(req) || req?.user?.role === 'forms_organizador')) {
        updateData.status = status;
        if (status === 'cancelada') {
          updateData.canceladoEm = new Date();
          updateData.canceladoPor = String(req.user?.id || req.user?._id || '');
        }
      }
      if (observacoesAdmin !== undefined && (isFormsAdmin(req) || req?.user?.role === 'forms_organizador')) {
        updateData.observacoesAdmin = observacoesAdmin;
      }

      const inscription = await InscriptionGarca.findByIdAndUpdate(req.params.id, updateData, { new: true });
      await recordAudit(req, {
        action: 'form.inscription_update',
        resourceType: 'inscription',
        resourceId: req.params.id,
      });
      return res.status(200).json({ message: 'Inscrição atualizada!', inscription });
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
      if (!isFormsAdmin(req)) {
        return res.status(403).json({ message: 'Apenas administradores podem excluir inscrições definitivamente.' });
      }
      await InscriptionGarca.findByIdAndDelete(req.params.id);
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
      const lookupUserId = isFormsAdmin(req) && userId ? userId : req?.user?.id;
      const existing = await InscriptionGarca.findOne({
        formId,
        userId: lookupUserId,
        status: { $ne: 'cancelada' },
      });
      return res.status(200).json({
        inscribed: !!existing,
        voucherCode: existing?.voucherCode || null,
        status: existing?.status || null,
      });
    } catch (error) {
      return res.status(500).json({ message: 'Erro ao verificar inscrição.', error: error.message });
    }
  }

  // ─── UPLOADS ───────────────────

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
        size: file.size,
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
          fileLink: `${appUrl}/api/images/${relativePath}`,
        };
      });

      return res.status(200).json({
        message: 'Arquivos enviados com sucesso!',
        files: filesData,
      });
    } catch (error) {
      return res.status(500).json({ message: 'Erro ao processar uploads.', error: error.message });
    }
  }
};
