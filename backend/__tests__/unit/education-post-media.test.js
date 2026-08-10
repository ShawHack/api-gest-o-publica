const {
  extractYouTubeVideoId,
  youtubeEmbedUrl,
  youtubeThumbnailUrl,
  normalizePostMedia,
  applyPostMediaFromRequest,
} = require('../../helpers/education-post-media')

describe('education-post-media', () => {
  test('extrai ID de URL watch', () => {
    expect(extractYouTubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
  })

  test('extrai ID de youtu.be', () => {
    expect(extractYouTubeVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
  })

  test('extrai ID de shorts', () => {
    expect(extractYouTubeVideoId('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
  })

  test('rejeita URL inválida', () => {
    expect(extractYouTubeVideoId('https://example.com/video')).toBeNull()
  })

  test('normalizePostMedia adiciona embed para youtube', () => {
    const out = normalizePostMedia({
      featuredMediaType: 'youtube',
      youtubeVideoId: 'dQw4w9WgXcQ',
    })
    expect(out.embedUrl).toBe(youtubeEmbedUrl('dQw4w9WgXcQ'))
    expect(out.thumbnailUrl).toContain('img.youtube.com')
  })

  test('applyPostMediaFromRequest define capa automática do youtube', () => {
    const post = { coverImageUrl: '' }
    applyPostMediaFromRequest(post, {
      featuredMediaType: 'youtube',
      youtubeUrl: 'https://youtu.be/abcdefghijk',
    })
    expect(post.youtubeVideoId).toBe('abcdefghijk')
    expect(post.coverImageUrl).toBe(youtubeThumbnailUrl('abcdefghijk'))
  })

  test('normalizeExternalUrl adiciona https quando ausente', () => {
    const { normalizeExternalUrl, isValidExternalUrl } = require('../../helpers/education-post-media')
    expect(normalizeExternalUrl('www.exemplo.gov.br/pagina')).toBe('https://www.exemplo.gov.br/pagina')
    expect(isValidExternalUrl(normalizeExternalUrl('https://www.exemplo.gov.br'))).toBe(true)
  })
})
