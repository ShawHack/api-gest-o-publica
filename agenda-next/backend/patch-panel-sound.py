#!/usr/bin/env python3
"""Persiste som ativado e desbloqueia ao clicar na tela da TV."""
from pathlib import Path

ctx = Path('/home/semit/painel-semit/src/features/calls/PanelContext.tsx')
display = Path('/home/semit/painel-semit/src/pages/DisplayPage.tsx')

ctx_text = ctx.read_text(encoding='utf-8')
if "painel-semit:sound-unlocked" not in ctx_text:
    ctx_text = ctx_text.replace(
        '  const [soundUnlocked, setSoundUnlocked] = useState(false)',
        "  const [soundUnlocked, setSoundUnlocked] = useState(() => {\n"
        "    if (typeof window === 'undefined') return false\n"
        "    return sessionStorage.getItem('painel-semit:sound-unlocked') === '1'\n"
        "  })",
    )
    ctx_text = ctx_text.replace(
        '  const unlockSound = useCallback(async () => {\n'
        '    await playAlertChime(0.2)\n'
        '    speechRef.current.markUnlocked()\n'
        '    setSoundUnlocked(true)\n'
        '  }, [])',
        '  const unlockSound = useCallback(async () => {\n'
        '    await playAlertChime(0.2)\n'
        '    speechRef.current.markUnlocked()\n'
        '    setSoundUnlocked(true)\n'
        "    sessionStorage.setItem('painel-semit:sound-unlocked', '1')\n"
        '  }, [])\n\n'
        '  useEffect(() => {\n'
        '    if (soundUnlocked) speechRef.current.markUnlocked()\n'
        '  }, [soundUnlocked])',
    )
    ctx.write_text(ctx_text, encoding='utf-8')
    print('PanelContext.tsx patched ok')
else:
    print('PanelContext.tsx already patched')

disp_text = display.read_text(encoding='utf-8')
if 'onClick={() => { if (!soundUnlocked)' not in disp_text:
    disp_text = disp_text.replace(
        '    <div\n'
        '      className={[\n'
        "        'display-page',",
        '    <div\n'
        "      onClick={() => { if (!soundUnlocked) void unlockSound() }}\n"
        '      className={[\n'
        "        'display-page',",
    )
    display.write_text(disp_text, encoding='utf-8')
    print('DisplayPage.tsx patched ok')
else:
    print('DisplayPage.tsx already patched')
