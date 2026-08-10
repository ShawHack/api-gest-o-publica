const { validatePostInput } = require('../../helpers/education-post-validation')

describe('education-post-validation', () => {
  test('exige campos obrigatórios no create', () => {
    const result = validatePostInput({})
    expect(result.valid).toBe(false)
    expect(result.errors.title[0]).toMatch(/título/i)
    expect(result.errors.educationEntityId[0]).toMatch(/obrigatório/i)
    expect(result.errors.type[0]).toMatch(/tipo/i)
  })

  test('rejeita conselho com tipo diferente de conselhos', () => {
    const result = validatePostInput(
      {
        educationEntityId: '507f1f77bcf86cd799439011',
        title: 'Teste',
        type: 'comunicado',
      },
      { entity: { type: 'conselho' } }
    )
    expect(result.valid).toBe(false)
    expect(result.errors.type[0]).toMatch(/Conselhos/i)
  })
})
