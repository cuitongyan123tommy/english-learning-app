@echo off
chcp 65001 >nul
echo.
echo 正在测试百度OCR密钥是否有效...
echo.
node -e "const https=require('https');const cfg=require('./config.json');const q=`grant_type=client_credentials^&client_id=${cfg.baiduApiKey}^&client_secret=${cfg.baiduSecretKey}`;const r=https.request({hostname:'aip.baidubce.com',path:'/oauth/2.0/token?'+q,method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','Content-Length':0}},res=>{let d='';res.on('data',c=>d+=c);res.on('end',()=>{try{const j=JSON.parse(d);if(j.access_token){console.log('密钥验证成功！OCR可以正常使用')}else{console.log('密钥有问题：'+d)}}catch(e){console.log('返回内容：'+d)}})});r.on('error',e=>console.log('网络错误：'+e));r.end();"
echo.
pause
