import https from 'https'

let cachedToken = null
let tokenExpireAt = 0

function httpsPost(hostname, urlPath, body) {
  return new Promise((resolve, reject) => {
    const data = typeof body === 'string' ? body : new URLSearchParams(body).toString()
    const req = https.request({
      hostname, path: urlPath, method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(data) }
    }, res => {
      const chunks = []
      res.on('data', c => chunks.push(c))
      res.on('end', () => {
        try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf-8'))) }
        catch { resolve({}) }
      })
    })
    req.on('error', reject)
    req.write(data)
    req.end()
  })
}

async function getBaiduToken() {
  if (cachedToken && Date.now() < tokenExpireAt) return cachedToken
  const apiKey = process.env.BAIDU_API_KEY
  const secretKey = process.env.BAIDU_SECRET_KEY
  if (!apiKey || !secretKey) throw new Error('Missing Baidu API credentials')
  const result = await httpsPost('aip.baidubce.com',
    `/oauth/2.0/token?grant_type=client_credentials&client_id=${apiKey}&client_secret=${secretKey}`, '')
  if (!result.access_token) throw new Error('Failed to get token: ' + JSON.stringify(result))
  cachedToken = result.access_token
  tokenExpireAt = Date.now() + (result.expires_in - 60) * 1000
  return cachedToken
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const imageBase64 = req.body?.imageBase64
  if (!imageBase64) return res.status(400).json({ error: 'No image data' })

  try {
    const token = await getBaiduToken()
    const formBody = `image=${encodeURIComponent(imageBase64)}&language_type=ENG&detect_direction=true`
    const result = await httpsPost(
      'aip.baidubce.com',
      `/rest/2.0/ocr/v1/accurate_basic?access_token=${token}`,
      formBody
    )
    if (result.error_code) {
      return res.status(500).json({ error: `百度OCR错误(${result.error_code}): ${result.error_msg}` })
    }
    return res.status(200).json(result)
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
