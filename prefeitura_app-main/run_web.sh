#!/bin/bash
echo "========================================"
echo "  Iniciando Flutter Web na porta 7500"
echo "========================================"
echo ""
echo "URL: http://localhost:7500/#/forms-garca-login"
echo ""
echo "Abrindo Chrome automaticamente..."
if [[ "$OSTYPE" == "darwin"* ]]; then
  # macOS
  open -a "Google Chrome" "http://localhost:7500/#/forms-garca-login"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
  # Linux
  google-chrome "http://localhost:7500/#/forms-garca-login" 2>/dev/null || chromium-browser "http://localhost:7500/#/forms-garca-login" 2>/dev/null || echo "Chrome não encontrado. Abra manualmente: http://localhost:7500/#/forms-garca-login"
fi
sleep 3
flutter run -d chrome --web-hostname=localhost --web-port=7500

