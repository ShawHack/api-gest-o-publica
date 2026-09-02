import { describe, expect, it } from 'vitest'
import { parsePainelSenha, toDisplayCall } from '../services/api/adapters/painelSenhaAdapter'
import { dedupeCalls, isSameCall } from './dedupe'
import { applyApiSnapshot, prependHistory, pushFeaturedCall } from './history'
import { numberToWordsPtBr } from '../services/speech/numberToWordsPtBr'
import { buildAnnouncementParts, buildAnnouncementText } from '../services/speech/announceCall'
import { SpeechQueue } from '../services/speech/speechQueue'
import type { DisplayCall } from '../types/call'

const sampleRaw = {
  id: 10,
  senha: 'A123',
  siglaSenha: 'A',
  numeroSenha: 123,
  local: 'Guichê',
  numeroLocal: 4,
  peso: 0,
  prioridade: 'Normal',
  corPrioridade: '#0091da',
  nomeCliente: null,
  documentoCliente: null,
  servico: { id: 1, nome: 'Atendimento' },
}

function call(partial: Partial<DisplayCall> & Pick<DisplayCall, 'id'>): DisplayCall {
  return {
    ticket: 'A001',
    prefix: 'A',
    number: 1,
    localName: 'Guichê',
    localNumber: 1,
    localLabel: 'Guichê 01',
    serviceId: 1,
    serviceName: 'Atendimento',
    priorityName: 'Normal',
    priorityWeight: 0,
    priorityColor: null,
    clientName: null,
    calledAt: new Date().toISOString(),
    source: 'api',
    ...partial,
  }
}

describe('painelSenhaAdapter', () => {
  it('converte payload real do NovoSGA', () => {
    const result = parsePainelSenha(sampleRaw)
    expect(result.ticket).toBe('A123')
    expect(result.prefix).toBe('A')
    expect(result.number).toBe(123)
    expect(result.localLabel).toBe('Guichê 04')
    expect(result.serviceName).toBe('Atendimento')
  })

  it('rejeita payload inválido', () => {
    expect(() => parsePainelSenha({ id: 'x' })).toThrow()
  })

  it('toDisplayCall preserva source', () => {
    expect(toDisplayCall(sampleRaw, 'mercure').source).toBe('mercure')
  })
})

describe('dedupe e histórico', () => {
  it('remove duplicatas pela chave composta', () => {
    const list = [
      call({ id: 2, prefix: 'A', number: 10, localName: 'Guichê', localNumber: 1, serviceId: 1 }),
      call({ id: 1, prefix: 'A', number: 10, localName: 'Guichê', localNumber: 1, serviceId: 1 }),
    ]
    expect(dedupeCalls(list)).toHaveLength(1)
  })

  it('não duplica a chamada atual no histórico na carga inicial', () => {
    const incoming = [
      call({ id: 3, ticket: 'A003', number: 3 }),
      call({ id: 2, ticket: 'A002', number: 2 }),
      call({ id: 1, ticket: 'A001', number: 1 }),
    ]
    const result = applyApiSnapshot({ current: null, history: [] }, incoming, 5, false)
    expect(result.state.current?.id).toBe(3)
    expect(result.state.history.map((h) => h.id)).toEqual([2, 1])
    expect(result.state.history.some((h) => isSameCall(h, result.state.current))).toBe(false)
  })

  it('processa apenas registros mais novos', () => {
    const state = {
      current: call({ id: 2, number: 2 }),
      history: [call({ id: 1, number: 1 })],
    }
    const incoming = [
      call({ id: 4, number: 4 }),
      call({ id: 3, number: 3 }),
      call({ id: 2, number: 2 }),
    ]
    const result = applyApiSnapshot(state, incoming, 5, true)
    expect(result.state.current?.id).toBe(4)
    expect(result.newlyFeatured.map((c) => c.id)).toEqual([4])
    expect(result.state.history.map((h) => h.id)).toContain(3)
  })

  it('prependHistory remove chave já existente', () => {
    const history = [
      call({ id: 9, prefix: 'A', number: 1, localName: 'Guichê', localNumber: 2, serviceId: 1 }),
    ]
    const next = prependHistory(
      call({ id: 10, prefix: 'A', number: 1, localName: 'Guichê', localNumber: 2, serviceId: 1 }),
      history,
      5,
    )
    expect(next).toHaveLength(1)
    expect(next[0]?.id).toBe(10)
  })

  it('reanuncia ao chamar novamente (mesmo ticket, id maior)', () => {
    const current = call({ id: 10, prefix: 'MEC', number: 4, localName: 'Sala', localNumber: 2, serviceId: 1 })
    const state = { current, history: [] }
    const incoming = [call({ id: 11, prefix: 'MEC', number: 4, localName: 'Sala', localNumber: 2, serviceId: 1 }), current]

    const result = applyApiSnapshot(state, incoming, 5, true)

    expect(result.state.current?.id).toBe(11)
    expect(result.newlyFeatured).toHaveLength(1)
    expect(result.newlyFeatured[0]?.id).toBe(11)
    expect(result.state.history.map((h) => h.id)).toEqual([10])
  })

  it('guarda chamada anterior da agenda quando a API só traz a mais recente', () => {
    const ag005 = call({ id: 1005, ticket: 'AG05', prefix: 'AG', number: 5, priorityName: 'Agendamento Web' })
    const ag006 = call({ id: 1006, ticket: 'AG06', prefix: 'AG', number: 6, priorityName: 'Agendamento Web' })
    const ads = call({ id: 50, ticket: 'ADS002', prefix: 'ADS', number: 2, serviceId: 82 })
    const state = { current: ag005, history: [ads] }
    const incoming = [ag006, ads]

    const result = applyApiSnapshot(state, incoming, 5, true)

    expect(result.state.current?.id).toBe(1006)
    expect(result.state.history.map((h) => h.ticket)).toEqual(['AG05', 'ADS002'])
  })

  it('prioriza histórico local sobre ADS da API quando há limite de slots', () => {
    const ag006 = call({ id: 1006, ticket: 'AG06', prefix: 'AG', number: 6 })
    const ag007 = call({ id: 1007, ticket: 'AG07', prefix: 'AG', number: 7 })
    const ads1 = call({ id: 50, ticket: 'ADS001', prefix: 'ADS', number: 1, serviceId: 82 })
    const ads2 = call({ id: 51, ticket: 'ADS002', prefix: 'ADS', number: 2, serviceId: 82 })
    const state = { current: ag006, history: [] }
    const incoming = [ag007, ads2, ads1]

    const result = applyApiSnapshot(state, incoming, 3, true)

    expect(result.state.current?.ticket).toBe('AG07')
    expect(result.state.history.map((h) => h.ticket)).toEqual(['AG06', 'ADS002', 'ADS001'])
  })

  it('pushFeaturedCall move atual para histórico', () => {
    const state = {
      current: call({ id: 1, number: 1 }),
      history: [],
    }
    const next = pushFeaturedCall(state, call({ id: 2, number: 2 }), 5)
    expect(next.current?.id).toBe(2)
    expect(next.history[0]?.id).toBe(1)
  })
})

describe('voz pt-BR', () => {
  it('converte números para extenso', () => {
    expect(numberToWordsPtBr(123)).toBe('cento e vinte e três')
    expect(numberToWordsPtBr(4)).toBe('quatro')
    expect(numberToWordsPtBr(100)).toBe('cem')
  })

  it('monta partes do anúncio (Mangati)', () => {
    const parts = buildAnnouncementParts(
      call({
        id: 1,
        prefix: 'PR',
        number: 123,
        localName: 'Guichê',
        localNumber: 4,
      }),
    )
    expect(parts).toEqual([
      'Senha',
      'P R',
      'cento e vinte e três',
      'dirigir-se ao guichê quatro',
    ])
  })

  it('usa "dirigir-se à" para locais femininos', () => {
    const parts = buildAnnouncementParts(
      call({
        id: 2,
        prefix: 'A',
        number: 10,
        localName: 'Sala',
        localNumber: 2,
      }),
    )
    expect(parts).toEqual(['Senha', 'A', 'dez', 'dirigir-se à sala dois'])
  })

  it('monta frase de anúncio completa', () => {
    const text = buildAnnouncementText(
      call({
        id: 1,
        prefix: 'A',
        number: 123,
        localName: 'Guichê',
        localNumber: 4,
      }),
    )
    expect(text).toBe('Senha A cento e vinte e três dirigir-se ao guichê quatro')
  })
})

describe('SpeechQueue', () => {
  it('enfileira e processa em série', async () => {
    const spoken: string[] = []
    const queue = new SpeechQueue({}, async (job) => {
      spoken.push(job.text ?? job.parts?.join(' ') ?? '')
    })

    queue.markUnlocked()
    queue.enqueue({ id: '1', text: 'um' })
    queue.enqueue({ id: '2', text: 'dois' })

    await new Promise((r) => setTimeout(r, 20))
    expect(spoken).toEqual(['um', 'dois'])
    expect(queue.pending).toBe(0)
  })
})
