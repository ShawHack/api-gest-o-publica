#!/usr/bin/env python3
from pathlib import Path

test = Path("/home/semit/Documentos/api-semit/backend/__tests__/unit/comtur-content.test.js")
text = test.read_text(encoding="utf-8")
snippet = """
  test('aceita ponto QR com placa e coordenadas', () => {
    const r = normalize({
      type: 'qr_point',
      slug: 'placa-lago',
      title: 'Placa do Lago',
      summary: 'QR do lago',
      geo: { lat: -22.21, lng: -49.65 },
      qr: {
        enabled: true,
        code: 'GARCA-QR-001',
        status: 'installed',
        installationLocation: 'Entrada do lago',
        installedAt: '2026-09-01',
      },
      metadata: {
        destinationKind: 'portal_local',
        destinationSlug: 'lago-artificial',
        destinationUrl: '/turismo/local/lago-artificial',
      },
    })
    expect(r.error).toBeUndefined()
    expect(r.value.qr.enabled).toBe(true)
    expect(r.value.qr.code).toBe('GARCA-QR-001')
    expect(r.value.qr.status).toBe('installed')
    expect(r.value.geo.lat).toBe(-22.21)
  })
  test('rejeita QR ativo sem código', () => {
    const r = normalize({
      type: 'qr_point',
      slug: 'placa-x',
      title: 'Placa X',
      qr: { enabled: true, code: '', status: 'installed' },
    })
    expect(r.error).toBe('Informe o código da placa QR')
  })
"""
if "aceita ponto QR com placa" not in text:
    # append before last closing of describe if possible, else append file
    if text.rstrip().endswith("})") or "})" in text[-40:]:
        # insert before final newline after last test in file
        idx = text.rfind("})")
        # find end of last describe block - simpler append before module end
        pass
    # Find last describe closing - append inside last describe('conteúdo editorial
    marker = "  test('aceita compras e serviços do catálogo'"
    if marker in text:
        # insert before that test
        text = text.replace(marker, snippet + "\n  " + marker, 1)
    else:
        text = text.rstrip() + "\n" + snippet + "\n"
    test.write_text(text, encoding="utf-8")
    print("TEST_PATCHED")
else:
    print("TEST_ALREADY")
