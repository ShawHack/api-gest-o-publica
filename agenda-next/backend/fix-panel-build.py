#!/usr/bin/env python3
from pathlib import Path
import re

ctx = Path('/home/semit/painel-semit/src/features/calls/PanelContext.tsx')
text = ctx.read_text(encoding='utf-8')
text = re.sub(
    r"onWake: \(event\) => \{.*?\},\s*onPollTick",
    "onWake: () => {\n          void fetchCalls('mercure')\n        },\n        onPollTick",
    text,
    count=1,
    flags=re.DOTALL,
)
ctx.write_text(text, encoding='utf-8')

cm = Path('/home/semit/painel-semit/src/services/realtime/connectionManager.ts')
cm_text = cm.read_text(encoding='utf-8')
cm_text = cm_text.replace(
    "this.options.onWake({ type: 'call', id: data.id || Date.now(), raw: data })",
    'this.options.onWake()',
)
cm.write_text(cm_text, encoding='utf-8')
print('fixed')
