import { describe, expect, it } from 'vitest'
import { isTvPlayerSrc, toSameOriginTvPlayerSrc } from './tvPlayerUrl'

describe('toSameOriginTvPlayerSrc', () => {
  it('converte a TV pública para o proxy local', () => {
    expect(toSameOriginTvPlayerSrc('https://api.garca.sp.gov.br/tv/')).toBe('/tv-player/')
    expect(toSameOriginTvPlayerSrc('https://api.garca.sp.gov.br/tv/?display=semit')).toBe(
      '/tv-player/?display=semit',
    )
  })

  it('mantém o proxy e query', () => {
    expect(toSameOriginTvPlayerSrc('/tv-player/?display=semit')).toBe('/tv-player/?display=semit')
  })

  it('não altera mídia que não é a TV', () => {
    expect(toSameOriginTvPlayerSrc('https://cdn.example/video.mp4')).toBe(
      'https://cdn.example/video.mp4',
    )
  })

  it('reconhece URL de TV', () => {
    expect(isTvPlayerSrc('https://api.garca.sp.gov.br/tv/?display=semit')).toBe(true)
    expect(isTvPlayerSrc('/foto.jpg')).toBe(false)
  })
})
