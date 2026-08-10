/**
 * Extrai CPF/CNPJ enviado por diferentes frontends (Memorial, SAMA, Flutter, etc.).
 * Retorna apenas dígitos ou string vazia.
 */
module.exports = function resolveRegisterCpf(body) {
  const b = body || {}
  const raw =
    b.cpf ||
    b.cpf_cnpj ||
    b.cpfCnpj ||
    b.documento ||
    b.document ||
    b.CPF
  return String(raw || '').replace(/\D/g, '')
}
