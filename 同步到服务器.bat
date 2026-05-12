@echo off
cd /d "%~dp0"

echo ============================================
echo   英语小星星 - 同步到腾讯云服务器
echo ============================================
echo.

echo [1/3] 提交本地改动...
git add .
for /f "tokens=2 delims==" %%I in ('"wmic os get localdatetime /value"') do set datetime=%%I
set TS=%datetime:~0,8%-%datetime:~8,4%
git diff --cached --quiet
if %ERRORLEVEL% equ 0 (
    echo   没有改动，跳过提交
) else (
    git commit -m "update %TS%"
    if %ERRORLEVEL% neq 0 (
        echo   提交失败！
        pause
        exit /b 1
    )
    echo   已提交: update %TS%
)

echo.
echo [2/3] 推送到 GitHub...
git push
if %ERRORLEVEL% neq 0 (
    echo   推送失败，请检查网络！
    pause
    exit /b 1
)

echo.
echo [3/3] 服务器拉取并构建...
ssh -i "%USERPROFILE%\.ssh\id_rsa" root@152.136.120.33 "cd /opt/english-learning-app; git pull; npm install; npm run build"
if %ERRORLEVEL% neq 0 (
    echo   构建失败，请检查代码！
    pause
    exit /b 1
)

echo.
echo [4/4] 重启服务...
ssh -i "%USERPROFILE%\.ssh\id_rsa" root@152.136.120.33 "pm2 restart english-star; pm2 status"

echo.
echo ============================================
echo   同步完成！访问 http://152.136.120.33:8888
echo ============================================
pause
