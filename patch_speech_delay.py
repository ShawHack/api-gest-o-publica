from pathlib import Path
import subprocess

p = Path('/home/semit/Documentos/semit_painel_native/app/src/main/java/br/gov/sp/garca/painelsenhas/MainActivity.java')
s = p.read_text(encoding='utf-8')

old_call = """            // Reproduz a voz de alta qualidade gerada pelo servidor (Opção 1)
            playSpeechAudio(textoFala);"""

new_call = """            // Reproduz a voz apos o termino do bip sonoro
            handler.postDelayed(() -> playSpeechAudio(textoFala), 550);"""

if old_call in s:
    p.write_text(s.replace(old_call, new_call, 1), encoding='utf-8')
    print('MainActivity patched with delayed speech')
else:
    print('pattern not found or already patched')
