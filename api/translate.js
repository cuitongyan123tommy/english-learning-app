import https from 'https'

function httpsGet(hostname, urlPath) {
  return new Promise((resolve, reject) => {
    const req = https.request({ hostname, path: urlPath, method: 'GET' }, res => {
      const chunks = []
      res.on('data', c => chunks.push(c))
      res.on('end', () => {
        try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf-8'))) }
        catch { resolve({}) }
      })
    })
    req.on('error', reject)
    req.end()
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const text = (req.body?.text || '').trim()
  if (!text) return res.status(200).json({ translation: '' })

  try {
    const result = await httpsGet(
      'api.mymemory.translated.net',
      '/get?q=' + encodeURIComponent(text) + '&langpair=en|zh-CN'
    )
    const t = result.responseData?.translatedText || ''
    const ok = t && t !== text && /[一-鿿]/.test(t)
    return res.status(200).json({ translation: ok ? t : '' })
  } catch {
    return res.status(200).json({ translation: '' })
  }
}
