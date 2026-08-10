const mongoose = require('../db/conn')

/**
 * Ciclo PNAB — entidade principal (não confunde com exercício fiscal isolado).
 * Ex.: Ciclo 1 (repasses 2023–2024), Ciclo 2 (a partir de 2025 / Decreto 12.409/2025).
 */
const PnabCycleSchema = new mongoose.Schema({
  codigo: { type: Number, required: true, unique: true }, // 1, 2, 3…
  nome: { type: String, required: true, trim: true }, // "Ciclo 1"
  subtitulo: { type: String, trim: true }, // "Repasses 2023–2024"
  descricao: { type: String, trim: true },
  bannerUrl: { type: String },
  imagemUrl: { type: String },
  dataInicio: { type: Date },
  dataFim: { type: Date },
  /** Anos de execução/repasse abrangidos (rótulos livres). */
  anosAbrangidos: [{ type: String, trim: true }],
  decretoReferencia: { type: String, trim: true },
  status: {
    type: String,
    enum: ['planejamento', 'em_execucao', 'monitoramento', 'prestacao_contas', 'encerrado'],
    default: 'planejamento',
  },
  /** Texto institucional (ex.: 60% de execução + investimento próprio). */
  requisitosProximoCiclo: { type: String, trim: true },
  ordem: { type: Number, default: 0 },
  ativo: { type: Boolean, default: true },
  deleted: { type: Boolean, default: false },
  autor: { type: String },
  dataCriacao: { type: Date, default: Date.now },
  dataAtualizacao: { type: Date, default: Date.now },
})

PnabCycleSchema.index({ deleted: 1, ordem: 1, codigo: 1 })

module.exports = mongoose.model('PnabCycle', PnabCycleSchema)
