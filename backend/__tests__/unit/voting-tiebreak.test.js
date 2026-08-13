const { compareCandidatesByVotesThenNumber, pickWinners } = require('../../helpers/voting-election-service')

describe('desempate por menor número na cédula', () => {
  test('mais votos vence independentemente do número', () => {
    const ranked = [
      { name: 'A', number: 10, votes: 5 },
      { name: 'B', number: 1, votes: 8 },
    ].sort(compareCandidatesByVotesThenNumber)
    expect(ranked[0].name).toBe('B')
  })

  test('empate: vence o menor número', () => {
    const ranked = [
      { name: 'Alto', number: 22, votes: 10 },
      { name: 'Baixo', number: 7, votes: 10 },
      { name: 'Meio', number: 15, votes: 10 },
    ].sort(compareCandidatesByVotesThenNumber)
    expect(ranked[0].name).toBe('Baixo')
    expect(ranked[0].number).toBe(7)
    expect(ranked[1].number).toBe(15)
    expect(ranked[2].number).toBe(22)
  })
  test('empate na última vaga não cria vencedor adicional', () => {
    const ranked = [
      { candidateId: 'a', number: 30, votes: 10 },
      { candidateId: 'b', number: 7, votes: 10 },
      { candidateId: 'c', number: 15, votes: 10 },
    ].sort(compareCandidatesByVotesThenNumber)
    const winners = pickWinners(ranked, 2)
    expect(winners).toHaveLength(2)
    expect(winners.map((w) => w.number)).toEqual([7, 15])
    expect(winners.map((w) => w.place)).toEqual([1, 2])
  })

  test('menor matrícula desempata todas as posições', () => {
    const ranked = [
      { candidateId: 'a', number: 40, votes: 12 },
      { candidateId: 'b', number: 5, votes: 12 },
      { candidateId: 'c', number: 31, votes: 8 },
      { candidateId: 'd', number: 9, votes: 8 },
    ].sort(compareCandidatesByVotesThenNumber)
    expect(ranked.map((r) => r.number)).toEqual([5, 40, 9, 31])
    expect(pickWinners(ranked, 3).map((w) => w.number)).toEqual([5, 40, 9])
  })
})
