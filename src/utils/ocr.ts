function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export async function recognizeImage(
  imageFile: File,
  onProgress?: (pct: number) => void
): Promise<string> {
  onProgress?.(20)
  const imageBase64 = await fileToBase64(imageFile)
  onProgress?.(50)

  const res = await fetch('/api/baidu-ocr', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64 })
  })

  onProgress?.(80)

  if (!res.ok) throw new Error(`服务器错误: ${res.status}，请确认服务器已启动`)

  const data = await res.json()

  if (data.error_code) throw new Error(`百度OCR错误(${data.error_code}): ${data.error_msg}`)
  if (data.error) throw new Error(data.error)

  const lines: string[] = (data.words_result || []).map((w: { words: string }) => w.words)
  onProgress?.(100)
  return lines.join('\n')
}

// 功能词，不作为学习词汇
const STOPWORDS = new Set([
  'a','an','the','is','are','am','was','were','be','been','being',
  'i','you','he','she','it','we','they','me','him','her','us','them',
  'my','your','his','its','our','their',
  'this','that','these','those',
  'in','on','at','to','for','of','and','or','but','not','nor',
  'with','from','by','as','if','so','up','out','no','yes',
  'do','does','did','have','has','had','will','would',
  'can','could','should','may','might','shall',
  'very','much','many','some','any','all','each','every',
  'what','which','who','how','when','where','why',
  'here','there','then','now','just','also','too','well',
  'about','after','before','over','under','into','onto',
  'more','most','less','than','only','even','still',
  'one','two','three','four','five','six','seven','eight','nine','ten'
])

export function extractWords(rawText: string): string[] {
  const seen = new Set<string>()
  const words: string[] = []

  for (const line of rawText.split('\n')) {
    const tokens = line.match(/[a-zA-Z]{2,}/g) || []
    for (const token of tokens) {
      const word = token.toLowerCase()
      if (word.length >= 2 && !STOPWORDS.has(word) && !seen.has(word)) {
        seen.add(word)
        words.push(word)
      }
    }
  }

  return words
}

export function extractSentences(rawText: string): string[] {
  const sentences: string[] = []

  for (const line of rawText.split('\n')) {
    const trimmed = line.trim().replace(/^\d+[.)]\s*/, '')
    if (!trimmed) continue

    const englishWords = trimmed.match(/[a-zA-Z]+/g) || []
    // 至少4个单词才算句子
    if (englishWords.length >= 4 && trimmed.length >= 15) {
      sentences.push(trimmed)
    }
  }

  return sentences
}

export function isHighFreq(word: string): boolean {
  return STOPWORDS.has(word.toLowerCase())
}

export function splitSyllables(word: string): string[] {
  const w = word.toLowerCase()
  const vowels = 'aeiouy'
  const syllables: string[] = []
  let current = ''
  for (let i = 0; i < w.length; i++) {
    current += w[i]
    if (vowels.includes(w[i]) && i < w.length - 1 && !vowels.includes(w[i + 1])) {
      if (i + 2 < w.length) {
        syllables.push(current)
        current = ''
      }
    }
  }
  if (current) syllables.push(current)
  return syllables.length > 1 ? syllables : [word]
}

export function generateBlanks(sentence: string, words: string[]): { text: string; answer: string }[] {
  const result: { text: string; answer: string }[] = []
  words.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi')
    if (regex.test(sentence)) {
      const blank = sentence.replace(regex, '_'.repeat(word.length))
      result.push({ text: blank, answer: word.toLowerCase() })
    }
  })
  return result
}
