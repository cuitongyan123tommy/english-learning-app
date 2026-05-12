const http  = require('http')
const https = require('https')
const fs    = require('fs')
const path  = require('path')

const PORT = process.env.PORT || 8888
const DIST = path.join(__dirname, 'dist')
const LOG  = path.join(__dirname, 'server.log')

function log(msg) {
  const line = new Date().toLocaleTimeString() + ' ' + msg
  console.log(line)
  fs.appendFileSync(LOG, line + '\n', 'utf-8')
}

process.on('uncaughtException', err => {
  log('CRASH: ' + err.message)
  process.exit(1)
})

log('=== server starting ===')

let config = {
  baiduApiKey: process.env.BAIDU_API_KEY || '',
  baiduSecretKey: process.env.BAIDU_SECRET_KEY || ''
}

try {
  const fileConfig = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf-8'))
  config.baiduApiKey = config.baiduApiKey || fileConfig.baiduApiKey
  config.baiduSecretKey = config.baiduSecretKey || fileConfig.baiduSecretKey
  log('config loaded OK')
} catch (e) {
  if (!config.baiduApiKey) {
    log('ERROR: no Baidu API keys in env or config.json')
    process.exit(1)
  }
  log('config from env vars (no config.json)')
}

let cachedToken = null
let tokenExpireAt = 0

async function getBaiduToken() {
  if (cachedToken && Date.now() < tokenExpireAt) return cachedToken
  const result = await httpsPost('aip.baidubce.com',
    `/oauth/2.0/token?grant_type=client_credentials&client_id=${config.baiduApiKey}&client_secret=${config.baiduSecretKey}`, '')
  if (!result.access_token) throw new Error('获取Token失败: ' + JSON.stringify(result))
  cachedToken = result.access_token
  tokenExpireAt = Date.now() + (result.expires_in - 60) * 1000
  return cachedToken
}

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'application/javascript',
  '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.json': 'application/json', '.wasm': 'application/wasm',
}

function httpsPost(hostname, urlPath, body) {
  return new Promise((resolve, reject) => {
    const data = typeof body === 'string' ? body : new URLSearchParams(body).toString()
    const req = https.request({
      hostname, path: urlPath, method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(data) }
    }, res => {
      const chunks = []
      res.on('data', c => chunks.push(c))
      res.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf-8'))) } catch { resolve({}) } })
    })
    req.on('error', reject)
    req.write(data)
    req.end()
  })
}

function httpsGet(hostname, urlPath) {
  return new Promise((resolve, reject) => {
    const req = https.request({ hostname, path: urlPath, method: 'GET' }, res => {
      const chunks = []
      res.on('data', c => chunks.push(c))
      res.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf-8'))) } catch { resolve({}) } })
    })
    req.on('error', reject)
    req.end()
  })
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', c => chunks.push(Buffer.from(c)))
    req.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf-8'))) } catch { resolve({}) } })
    req.on('error', reject)
  })
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

function safeJson(res, data, status = 200) {
  try {
    if (!res.headersSent) {
      cors(res)
      res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify(data))
    }
  } catch {}
}

const server = http.createServer((req, res) => {
  cors(res)
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return }

  // 翻译接口（MyMemory 免费，无需 API key）
  if (req.url === '/api/translate' && req.method === 'POST') {
    readBody(req).then(async body => {
      const text = (body.text || '').trim()
      if (!text) return safeJson(res, { translation: '' })
      try {
        const result = await httpsGet(
          'api.mymemory.translated.net',
          '/get?q=' + encodeURIComponent(text) + '&langpair=en|zh-CN'
        )
        const t = result.responseData?.translatedText || ''
        const ok = t && t !== text && /[一-鿿]/.test(t)
        safeJson(res, { translation: ok ? t : '' })
      } catch (e) {
        safeJson(res, { translation: '' })
      }
    }).catch(() => safeJson(res, { translation: '' }))
    return
  }

  if (req.url === '/api/baidu-ocr' && req.method === 'POST') {
    readBody(req).then(async body => {
      const imageBase64 = body.imageBase64
      if (!imageBase64) return safeJson(res, { error: '未收到图片数据' }, 400)
      log('[OCR] 收到请求，图片大小: ' + imageBase64.length)
      try {
        const token = await getBaiduToken()
        const formBody = `image=${encodeURIComponent(imageBase64)}&language_type=ENG&detect_direction=true`
        const result = await httpsPost(
          'aip.baidubce.com',
          `/rest/2.0/ocr/v1/accurate_basic?access_token=${token}`,
          formBody
        )
        log('[OCR] 百度返回: ' + JSON.stringify(result).slice(0, 150))
        if (result.error_code) throw new Error(`百度OCR错误(${result.error_code}): ${result.error_msg}`)
        safeJson(res, result)
      } catch (e) {
        log('[OCR] 错误: ' + e.message)
        safeJson(res, { error: e.message }, 500)
      }
    }).catch(e => safeJson(res, { error: '读取请求失败: ' + e.message }, 500))
    return
  }

  const urlPath = req.url.split('?')[0]
  let filePath = path.join(DIST, urlPath === '/' ? 'index.html' : urlPath)
  if (!fs.existsSync(filePath)) filePath = path.join(DIST, 'index.html')
  const ext = path.extname(filePath)
  res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream')
  cors(res)
  const stream = fs.createReadStream(filePath)
  stream.on('error', () => { if (!res.headersSent) { res.writeHead(404); res.end() } })
  stream.pipe(res)
})

server.on('error', err => {
  if (err.code === 'EADDRINUSE') log('端口 ' + PORT + ' 已被占用')
  else log('ERROR: ' + err.message)
  process.exit(1)
})

server.listen(PORT, () => log('Server started at http://localhost:' + PORT))
