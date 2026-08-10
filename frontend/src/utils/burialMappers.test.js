import { mapBurialFromApi, mapBurialListResponse } from './burialMappers';
import { deduplicateBurials } from './burialDeduplication';

describe('burialMappers', () => {
  test('mapBurialFromApi normaliza campos da API', () => {
    const mapped = mapBurialFromApi({
      _id: 'abc-123',
      nome: 'Sebastião Gilio',
      dtNasc: '12/03/1945',
      dtFal: '07/08/2024',
      rua: 'F3',
      quadra: '02',
      chapa: '45517',
      images: ['foto.jpg'],
    });
    expect(mapped.id).toBe('abc-123');
    expect(mapped.fullName).toBe('Sebastião Gilio');
    expect(mapped.street).toBe('F3');
    expect(mapped.photoUrl).toContain('foto.jpg');
    expect(mapped.hasLocation).toBe(true);
  });

  test('mapBurialListResponse aceita sepultado e sepultados', () => {
    const a = mapBurialListResponse({ sepultado: [{ _id: '1', nome: 'A' }], total: 1 });
    const b = mapBurialListResponse({ sepultados: [{ _id: '2', nome: 'B' }], total: 1 });
    expect(a.items).toHaveLength(1);
    expect(b.items[0].fullName).toBe('B');
  });
});

describe('burialDeduplication', () => {
  test('remove duplicatas por id', () => {
    const items = deduplicateBurials([
      { id: 'x', fullName: 'A' },
      { id: 'x', fullName: 'A dup' },
      { id: 'y', fullName: 'B' },
    ]);
    expect(items).toHaveLength(2);
    expect(items[0].id).toBe('x');
  });
});
