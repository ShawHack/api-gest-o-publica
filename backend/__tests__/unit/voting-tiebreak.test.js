const { compareCandidatesByVotesThenNumber } = require('../../helpers/voting-election-service')

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
})
