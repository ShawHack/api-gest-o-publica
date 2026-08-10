@echo off
echo Parando processos Flutter na porta 7500...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":7500" ^| find "LISTENING"') do taskkill /F /PID %%a 2>nul

echo.
echo Aguardando 2 segundos...
timeout /t 2 /nobreak >nul

echo.
echo Iniciando Flutter Web na porta 7500...
echo URL: http://localhost:7500/#/forms-garca-login
echo.
start chrome "http://localhost:7500/#/forms-garca-login"
timeout /t 3 /nobreak >nul
flutter run -d chrome --web-hostname=localhost --web-port=7500 --web-browser-flag="--disable-web-security" --web-browser-flag="--user-data-dir=C:\temp\chrome_dev_session"

