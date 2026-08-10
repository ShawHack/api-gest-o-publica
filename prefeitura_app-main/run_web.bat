@echo off
echo ========================================
echo   Iniciando Flutter Web na porta 7500
echo   (Chrome SEM CORS - Apenas Desenvolvimento)
echo ========================================
echo.
echo URL: http://localhost:7500/#/forms-garca-login
echo.
echo Aguarde o Chrome abrir automaticamente...
echo.
start chrome "http://localhost:7500/#/forms-garca-login"
timeout /t 3 /nobreak >nul
flutter run -d chrome --web-hostname=localhost --web-port=7500 --web-browser-flag="--disable-web-security" --web-browser-flag="--user-data-dir=C:\temp\chrome_dev_session"

