@echo off
setlocal
set PATH=C:\Progra~1\nodejs;%PATH%
set BROWSER=none
cd /d C:\Users\Samuel - Job Rotatio\Desktop\samuel projetos
C:\Progra~1\nodejs\node.exe node_modules\expo\bin\cli start --web --port 19011 --host localhost >> expo-web.log 2>&1
