const bannedWords = [
  // --- Escárnio sobre a morte / desrespeito ao falecido ---
  'ja foi tarde','ja vai tarde','antes ele do que eu','antes ele do eu',
  'menos um','nao fara falta','nao vai fazer falta',
  'ninguem vai sentir falta','ninguem sente falta',
  'ainda bem que morreu','que bom que morreu','bem feito que morreu',
  'morreu e pouco','que apodreca','apodrece no caixao',
  'descansa no inferno','arde no inferno','que o diabo te leve','o diabo te leve',
  'va pro inferno','que a terra te seja pesada',
  'morto inutil','falecido inutil','cadaver fedido','cadaver fedorento',
  'que bom que se foi','se foi tarde','foi tarde','bem feito',
  'morre logo','tomara que apodreca',

  // --- Profanação / ameaças ao local ---
  'vou desenterrar','desenterrar','abrir caixao','violar tumba',
  'profanar tumba','profanar tumulo','quebrar lapide','chutar lapide',
  'pichar tumba','pichar tumulo','pichar lapide','depredar tumba','depredar tumulo',
  'roubar jazigo','roubar tumulo','destruir cemiterio',
  'urinar na tumba','urinar no tumulo','cuspir na tumba','cuspir no tumulo',
  'roubar ossos','roubar restos','roubar restos mortais',

  // --- Humor mórbido / zombaria ---
  'piada com morto','piada com defunto','piada de cemiterio',
  'rindo do morto','rir do morto','rindo do defunto',
  'zombar do morto','zombando do morto','tirar sarro do morto','deboche do morto',

  // --- Palavrões e ofensas gerais ---
  'vai se foder','vai se fuder','va se foder',
  'vai tomar no cu','tomar no cu','pau no cu','pau no seu cu','pnc',
  'fdp','filho da puta','filha da puta','puta que pariu','pqp',
  'puta','puto','putaria',
  'caralho','carai','krl','crl',
  'porra','merda','bosta','cacete','caceta',
  'cu','cuzao','cuzuda','cuzinho',
  'buceta','bucetinha','bucetona','bct',
  'xota','xoxota','xereca','perereca',
  'pau','pauzao','pauzudo',
  'pica','piroca','rola',
  'arrombado','arrombada',
  'babaca','escroto','escrota',
  'vagabundo','vagabunda',
  'corno','corna','corninho','corno manso',
  'desgraca','desgracado','desgracada',
  'otario','otaria','imbecil','idiota','trouxa','canalha','verme'
]

// normaliza acentos e caixa
const normalize = (s='') =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

// escapa termos para uso seguro em regex
const escapeRegex = (s='') => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// compila regex com bordas de palavra para cada termo banido (baseado no texto normalizado)
const bannedPatterns = bannedWords.map(w => new RegExp(`\\b${escapeRegex(normalize(w))}\\b`, 'i'))

// bloqueia se encontrar termos proibidos (usa regex por palavra/frase inteira)
const bannedWordsGuard = (req, res, next) => {
  const raw = (req.body?.comentario || '').toString()
  const norm = normalize(raw)

  const found = bannedWords.filter((_, i) => bannedPatterns[i].test(norm))

  if (found.length) {
    return res.status(422).json({ message: 'Seu comentário contém termos não permitidos.' })
  }
  next()
}

module.exports = { bannedWords, bannedWordsGuard, normalize }
