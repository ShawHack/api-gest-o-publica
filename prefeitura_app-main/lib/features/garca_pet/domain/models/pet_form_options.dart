/// Valores aceitos pela API (`backend/models/Pet.js`) — não duplicar regras, só espelhar enums.
abstract final class PetFormOptions {
  static const types = ['Cachorro', 'Gato', 'Outros'];
  static const sizes = ['Pequeno', 'Médio', 'Grande'];
  static const genders = ['Macho', 'Fêmea'];
}
