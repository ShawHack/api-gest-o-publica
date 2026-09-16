import subprocess
from pathlib import Path

# Get server.js from docker container
src = subprocess.check_output(["docker", "exec", "tv-semit", "cat", "/app/server.js"], text=True)

speech_handler = """
// Síntese de Voz Nativa em PT-BR para TV Box / Painel
app.get('/api/speech', async (req, res) => {
  try {
    const text = String(req.query.text || '').trim();
    if (!text) return res.status(400).send('Texto obrigatorio');
    const url = 'https://translate.google.com/translate_tts?ie=UTF-8&tl=pt-BR&client=tw-ob&q=' + encodeURIComponent(text);
    const upstream = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://translate.google.com/'
      }
    });
    if (!upstream.ok) {
      return res.status(upstream.status).send('Erro TTS upstream');
    }
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    const buffer = await upstream.arrayBuffer();
    return res.send(Buffer.from(buffer));
  } catch (err) {
    console.error('[api/speech]', err.message);
    return res.status(500).send('Erro interno de sintetizador');
  }
});
"""

if "app.get('/api/speech'" not in src:
    needle = "app.get('/api/tickets'"
    if needle in src:
        new_src = src.replace(needle, speech_handler + "\n" + needle, 1)
        Path("/tmp/server_speech.js").write_text(new_src, encoding="utf-8")
        subprocess.check_call(["docker", "cp", "/tmp/server_speech.js", "tv-semit:/app/server.js"])
        subprocess.check_call(["docker", "restart", "tv-semit"])
        print("tv-semit patched with /api/speech successfully!")
    else:
        print("needle not found in server.js")
else:
    print("speech route already exists")
