const fs = require('fs')
const path = require('path')

const dist = path.join(__dirname, 'dist')
const parts = path.join(dist, 'deb-parts-1.1.1')
const output = path.join(dist, 'painel-senhas-desktop_1.1.1_amd64.deb')
const members = ['debian-binary', 'control.tar.gz', 'data.tar.gz']

function arHeader(name, size) {
  const field = (value, length) => String(value).padEnd(length, ' ').slice(0, length)
  return Buffer.from(
    field(`${name}/`, 16) +
    field(Math.floor(Date.now() / 1000), 12) +
    field(0, 6) +
    field(0, 6) +
    field('100644', 8) +
    field(size, 10) +
    '`\n',
    'ascii',
  )
}

const chunks = [Buffer.from('!<arch>\n', 'ascii')]
for (const member of members) {
  const data = fs.readFileSync(path.join(parts, member))
  chunks.push(arHeader(member, data.length), data)
  if (data.length % 2) chunks.push(Buffer.from('\n'))
}
fs.writeFileSync(output, Buffer.concat(chunks))
console.log(output)
