import type { NovoSgaServicoUnidade, NovoSgaUnidade } from '../../types/novosga'
import { servicoUnidadeSchema, unidadeSchema } from './adapters/schemas'
import { apiRequest } from './client'
import { z } from 'zod'

function asArray(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>
    if (Array.isArray(obj.items)) return obj.items
    if (Array.isArray(obj.data)) return obj.data
    if (Array.isArray(obj.results)) return obj.results
  }
  throw new Error('Resposta de unidades/serviços em formato inesperado')
}

export async function fetchUnidades(apiUrl: string, token: string): Promise<NovoSgaUnidade[]> {
  const raw = await apiRequest<unknown>(apiUrl, '/unidades?limit=100', { token })
  return z.array(unidadeSchema).parse(asArray(raw))
}

export async function fetchServicosUnidade(
  apiUrl: string,
  token: string,
  unitId: number,
): Promise<NovoSgaServicoUnidade[]> {
  const raw = await apiRequest<unknown>(apiUrl, `/unidades/${unitId}/servicos`, { token })
  const items = asArray(raw)
  // Parse item a item para não falhar a lista inteira por um campo opcional
  const parsed: NovoSgaServicoUnidade[] = []
  for (const item of items) {
    const result = servicoUnidadeSchema.safeParse(item)
    if (result.success) {
      parsed.push(result.data)
    } else if (item && typeof item === 'object' && 'servico' in item) {
      const row = item as {
        sigla?: string
        peso?: number
        ativo?: boolean
        tipo?: string | number | null
        mensagem?: string | null
        servico?: { id?: number; nome?: string }
      }
      if (row.servico?.id && row.servico?.nome) {
        parsed.push({
          sigla: row.sigla ?? '',
          peso: Number(row.peso ?? 0),
          ativo: row.ativo !== false,
          tipo: row.tipo == null ? undefined : String(row.tipo),
          mensagem: row.mensagem ?? null,
          servico: { id: Number(row.servico.id), nome: String(row.servico.nome) },
        })
      }
    }
  }
  return parsed
}
