import { z } from 'zod'

export const painelSenhaSchema = z.object({
  id: z.number(),
  senha: z.string(),
  siglaSenha: z.string(),
  numeroSenha: z.number(),
  local: z.string(),
  numeroLocal: z.number(),
  peso: z.number(),
  prioridade: z.string(),
  corPrioridade: z.string().nullable().optional(),
  nomeCliente: z.string().nullable().optional(),
  documentoCliente: z.string().nullable().optional(),
  servico: z.object({
    id: z.number(),
    nome: z.string(),
  }),
})

export const painelSenhaListSchema = z.array(painelSenhaSchema)

export const mercurePanelEventSchema = z.object({
  '@type': z.string(),
  id: z.number(),
})

export const apiInfoSchema = z.object({
  status: z.string(),
  time: z.number(),
  mercureUrl: z.string().nullable().optional(),
})

export const tokenResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  expires_in: z.number(),
  token_type: z.string().optional(),
})

export const unidadeSchema = z.object({
  id: z.coerce.number(),
  nome: z.string(),
  descricao: z.string().optional().nullable(),
  ativo: z.boolean().optional(),
})

export const servicoUnidadeSchema = z.object({
  sigla: z.union([z.string(), z.null()]).optional().transform((v) => v ?? ''),
  peso: z.coerce.number().optional().default(0),
  ativo: z.union([z.boolean(), z.number()]).optional().transform((v) => Boolean(v ?? true)),
  tipo: z
    .union([z.string(), z.number(), z.null()])
    .optional()
    .transform((v) => (v == null ? undefined : String(v))),
  mensagem: z.union([z.string(), z.null()]).optional(),
  servico: z.object({
    id: z.coerce.number(),
    nome: z.string(),
  }),
})
