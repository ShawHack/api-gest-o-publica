const fs = require('fs')
const path = require('path')
const archiver = require('archiver')

const dist = path.join(__dirname, 'dist')
const parts = path.join(dist, 'deb-parts-1.1.1')
const linuxApp = path.join(dist, 'linux-unpacked')

fs.rmSync(parts, { recursive: true, force: true })
fs.mkdirSync(parts, { recursive: true })
fs.writeFileSync(path.join(parts, 'debian-binary'), '2.0\n')

const control = `Package: painel-senhas-desktop
Version: 1.1.1
Section: utils
Priority: optional
Architecture: amd64
Depends: libgtk-3-0, libnotify4, libnss3, libxss1, libxtst6, xdg-utils, libatspi2.0-0, libuuid1, libsecret-1-0
Maintainer: SEMIT - Prefeitura Municipal de Garça <semit@garca.sp.gov.br>
Installed-Size: 185000
Description: Painel de Senhas e TV Corporativa
 Cliente desktop da Prefeitura de Garça com cache local integral de mídias.
`

const desktop = `[Desktop Entry]
Name=Painel TV Garça
Comment=Painel de Senhas e TV Corporativa SEMIT
Exec=/opt/painel-tv-garca/painel-tv-garca --no-sandbox
Terminal=false
Type=Application
Categories=Utility;
`

function makeTar(outputPath, addEntries) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputPath)
    const archive = archiver('tar', { gzip: true, gzipOptions: { level: 9 } })
    output.on('close', resolve)
    output.on('error', reject)
    archive.on('error', reject)
    archive.pipe(output)
    addEntries(archive)
    archive.finalize()
  })
}

function arHeader(name, size) {
  const field = (value, length) => String(value).padEnd(length, ' ').slice(0, length)
  return Buffer.from(
    field(`${name}/`, 16) + field(Math.floor(Date.now() / 1000), 12) +
    field(0, 6) + field(0, 6) + field('100644', 8) + field(size, 10) + '`\n',
    'ascii',
  )
}

async function main() {
  await makeTar(path.join(parts, 'control.tar.gz'), archive => {
    archive.append(control, { name: 'control', mode: 0o644 })
  })
  await makeTar(path.join(parts, 'data.tar.gz'), archive => {
    // O build vem de NTFS, que não preserva bits POSIX. O pacote precisa marcar
    // os binários do Electron como executáveis para funcionar após a instalação.
    archive.directory(linuxApp, 'opt/painel-tv-garca', { mode: 0o755 })
    archive.append(desktop, { name: 'usr/share/applications/painel-tv-garca.desktop', mode: 0o644 })
    archive.append('', {
      name: 'usr/bin/painel-tv-garca',
      mode: 0o777,
      type: 'symlink',
      linkname: '/opt/painel-tv-garca/painel-tv-garca',
    })
  })

  const chunks = [Buffer.from('!<arch>\n', 'ascii')]
  for (const member of ['debian-binary', 'control.tar.gz', 'data.tar.gz']) {
    const data = fs.readFileSync(path.join(parts, member))
    chunks.push(arHeader(member, data.length), data)
    if (data.length % 2) chunks.push(Buffer.from('\n'))
  }
  const output = path.join(dist, 'painel-senhas-desktop_1.1.1_amd64.deb')
  fs.writeFileSync(output, Buffer.concat(chunks))
  console.log(output)
}

main().catch(err => {
  console.error(err)
  process.exitCode = 1
})
