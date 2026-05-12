import { useState, useRef, useEffect } from 'react'
import { useAppStore } from '../store'
import { recognizeImage, extractWords, extractSentences } from '../utils/ocr'
import { translateWords } from '../data/dictionary'
import { db, type Word } from '../db'
import { sounds } from '../utils/sound'

interface WordEntry { english: string; chinese: string }
interface SentEntry { english: string; chinese: string }

async function translateViaApi(text: string): Promise<string> {
  try {
    const res = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    })
    const d = await res.json()
    return d.translation || ''
  } catch { return '' }
}

// 并发限制：最多同时 5 个请求
async function limitedAll<T>(tasks: (() => Promise<T>)[], limit = 5): Promise<T[]> {
  const results: T[] = new Array(tasks.length)
  let idx = 0
  async function worker() {
    while (idx < tasks.length) {
      const i = idx++
      results[i] = await tasks[i]()
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker))
  return results
}

export default function ParentPage() {
  const { currentGrade } = useAppStore()
  const [step, setStep] = useState<'upload' | 'preview' | 'edit' | 'done'>('upload')
  const [progress, setProgress] = useState(0)
  const [progressMsg, setProgressMsg] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [lessonTitle, setLessonTitle] = useState('')
  const [wordEntries, setWordEntries] = useState<WordEntry[]>([])
  const [sentEntries, setSentEntries] = useState<SentEntry[]>([])
  const [customEn, setCustomEn] = useState('')
  const [customZh, setCustomZh] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    setImageUrl(URL.createObjectURL(file))
    setErrorMsg('')
    setProgress(0)
    setProgressMsg('正在上传图片...')
    setStep('preview')

    try {
      // 1. OCR 识别
      const rawText = await recognizeImage(file, p => {
        setProgress(Math.round(p * 0.5))
        if (p < 40) setProgressMsg('正在上传图片...')
        else setProgressMsg('百度AI正在识别文字...')
      })

      // 2. 提取单词和句子
      const words = extractWords(rawText)
      const sents = extractSentences(rawText)

      setProgressMsg('正在翻译单词...')
      setProgress(55)

      // 3. 词库查询
      const dictMap = translateWords(words)
      const unknownWords = words.filter(w => !dictMap[w])

      // 4. API 翻译生词（并发限制5）
      const apiWordResults = await limitedAll(
        unknownWords.map(w => () => translateViaApi(w).then(t => ({ w, t }))),
        5
      )
      const apiWordMap: Record<string, string> = {}
      apiWordResults.forEach(({ w, t }) => { if (t) apiWordMap[w] = t })

      setProgressMsg('正在翻译句子...')
      setProgress(80)

      // 5. API 翻译句子（并发限制5）
      const sentTranslations = await limitedAll(
        sents.map(s => () => translateViaApi(s)),
        5
      )

      setProgress(100)

      // 6. 合并 & 过滤：只保留有中文翻译的
      const allWordMap = { ...dictMap, ...apiWordMap }
      const filteredWords: WordEntry[] = words
        .filter(w => allWordMap[w])
        .map(w => ({ english: w, chinese: allWordMap[w] }))

      const filteredSents: SentEntry[] = sents
        .map((s, i) => ({ english: s, chinese: sentTranslations[i] || '' }))
        .filter(s => s.chinese)

      setWordEntries(filteredWords)
      setSentEntries(filteredSents)
      setStep('edit')
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : '识别失败，请重试')
      setStep('upload')
    }
  }

  function addCustomWord() {
    const en = customEn.trim().toLowerCase()
    const zh = customZh.trim()
    if (!en || !zh) return
    if (wordEntries.some(w => w.english === en)) {
      alert('该单词已存在')
      return
    }
    setWordEntries(prev => [...prev, { english: en, chinese: zh }])
    setCustomEn('')
    setCustomZh('')
  }

  async function saveLesson() {
    if (!lessonTitle.trim()) { alert('请输入课文名称'); return }
    const lessonId = await db.lessons.add({
      gradeId: currentGrade,
      title: lessonTitle.trim(),
      content: JSON.stringify(sentEntries),
      imageUrl,
      createdAt: Date.now()
    })
    const validWords = wordEntries.filter(w => w.english && w.chinese)
    await db.words.bulkAdd(validWords.map(w => ({
      gradeId: currentGrade,
      lessonId,
      english: w.english.toLowerCase().trim(),
      chinese: w.chinese.trim(),
      createdAt: Date.now()
    } as Word)))
    sounds.levelUp()
    setStep('done')
  }

  function reset() {
    setStep('upload'); setImageUrl(''); setLessonTitle('')
    setWordEntries([]); setSentEntries([]); setProgress(0)
    setErrorMsg(''); setCustomEn(''); setCustomZh('')
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '16px 12px' }}>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>👨‍👩‍👧</div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#333', marginBottom: 4 }}>家长上传区</h1>
        <p style={{ color: '#888', fontSize: '0.9rem' }}>拍照上传英语讲义 · 自动识别 · 自动翻译 · 生成题库</p>
      </div>

      {step === 'upload' && <UploadStep fileRef={fileRef} onFile={handleFile} errorMsg={errorMsg} />}

      {step === 'preview' && (
        <div className="card-cartoon" style={{ padding: 32, textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🤖</div>
          <div style={{ fontWeight: 900, fontSize: '1.2rem', marginBottom: 8, color: '#333' }}>{progressMsg}</div>
          <div style={{ height: 18, borderRadius: 999, background: '#F0E8FF', overflow: 'hidden', marginBottom: 8 }}>
            <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg,#A29BFE,#FF6B6B)', borderRadius: 999, transition: 'width 0.4s' }} />
          </div>
          <div style={{ color: '#A29BFE', fontWeight: 700, marginBottom: 16 }}>{progress}%</div>
          {imageUrl && <img src={imageUrl} style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 16, border: '3px solid #E0D5FF' }} alt="" />}
        </div>
      )}

      {step === 'edit' && (
        <div>
          {/* 统计摘要 */}
          <div className="card-cartoon" style={{ padding: 14, marginBottom: 14, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {imageUrl && <img src={imageUrl} style={{ width: 70, height: 70, borderRadius: 10, objectFit: 'cover', border: '2px solid #E0D5FF', flexShrink: 0 }} alt="" />}
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>✅ 识别并翻译完成</div>
              <div style={{ fontSize: '0.85rem', color: '#666', lineHeight: 1.9 }}>
                📝 单词 <strong style={{ color: '#A29BFE' }}>{wordEntries.length}</strong> 个（已全部匹配中文）
                &nbsp;·&nbsp;
                📖 句子 <strong style={{ color: '#6BCB77' }}>{sentEntries.length}</strong> 句（已全部翻译）
              </div>
            </div>
          </div>

          {/* 课文名称 */}
          <div className="card-cartoon" style={{ padding: 14, marginBottom: 14 }}>
            <label style={{ fontWeight: 700, display: 'block', marginBottom: 8 }}>📚 课文名称 *</label>
            <input value={lessonTitle} onChange={e => setLessonTitle(e.target.value)}
              placeholder="例如：Unit 3 My Family"
              style={{ width: '100%', padding: '10px 14px', border: '2.5px solid #A29BFE', borderRadius: 14, fontSize: '1rem', outline: 'none', boxSizing: 'border-box' }} />
          </div>

          {/* 单词列表 */}
          {wordEntries.length > 0 && (
            <div className="card-cartoon" style={{ padding: 14, marginBottom: 14 }}>
              <div style={{ fontWeight: 700, marginBottom: 10 }}>📝 单词（{wordEntries.length}个，均已有中文）</div>
              <div style={{ maxHeight: 340, overflowY: 'auto' }}>
                {wordEntries.map((w, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 7, alignItems: 'center' }}>
                    <div style={{ width: 130, padding: '7px 12px', background: '#F5F3FF', borderRadius: 10, fontWeight: 700, color: '#A29BFE', fontSize: '0.95rem', flexShrink: 0 }}>
                      {w.english}
                    </div>
                    <input value={w.chinese}
                      onChange={e => setWordEntries(prev => { const n = [...prev]; n[i] = { ...n[i], chinese: e.target.value }; return n })}
                      style={{ flex: 1, padding: '7px 12px', border: '2px solid #6BCB77', borderRadius: 10, fontSize: '0.9rem', outline: 'none', background: '#F0FFF4' }} />
                    <button onClick={() => setWordEntries(prev => prev.filter((_, j) => j !== i))}
                      style={{ color: '#FF6B6B', background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', padding: 4 }}>✕</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 句子列表 */}
          {sentEntries.length > 0 && (
            <div className="card-cartoon" style={{ padding: 14, marginBottom: 14 }}>
              <div style={{ fontWeight: 700, marginBottom: 10 }}>📖 句子（{sentEntries.length}句，含中文翻译）</div>
              <div style={{ maxHeight: 340, overflowY: 'auto' }}>
                {sentEntries.map((s, i) => (
                  <div key={i} style={{ marginBottom: 12, padding: '10px 12px', background: '#F8F5FF', borderRadius: 12, border: '1.5px solid #E0D5FF', position: 'relative' }}>
                    <button onClick={() => setSentEntries(prev => prev.filter((_, j) => j !== i))}
                      style={{ position: 'absolute', top: 6, right: 8, color: '#FF6B6B', background: 'none', border: 'none', fontSize: '1.1rem', cursor: 'pointer' }}>✕</button>
                    <input value={s.english}
                      onChange={e => setSentEntries(prev => { const n = [...prev]; n[i] = { ...n[i], english: e.target.value }; return n })}
                      style={{ width: '100%', padding: '5px 8px', border: '1.5px solid #C5B8FF', borderRadius: 8, fontSize: '0.9rem', outline: 'none', marginBottom: 6, boxSizing: 'border-box', fontStyle: 'italic' }} />
                    <input value={s.chinese}
                      onChange={e => setSentEntries(prev => { const n = [...prev]; n[i] = { ...n[i], chinese: e.target.value }; return n })}
                      style={{ width: '100%', padding: '5px 8px', border: '1.5px solid #6BCB77', borderRadius: 8, fontSize: '0.9rem', outline: 'none', background: '#F0FFF4', boxSizing: 'border-box' }} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 自定义手动添加 */}
          <div className="card-cartoon" style={{ padding: 14, marginBottom: 14, border: '2px dashed #A29BFE' }}>
            <div style={{ fontWeight: 700, marginBottom: 10 }}>✏️ 手动补充（查漏补缺）</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <input value={customEn} onChange={e => setCustomEn(e.target.value)}
                placeholder="英文单词/词组"
                onKeyDown={e => e.key === 'Enter' && addCustomWord()}
                style={{ flex: 1, minWidth: 120, padding: '9px 12px', border: '2px solid #E0D5FF', borderRadius: 10, fontSize: '0.95rem', outline: 'none' }} />
              <input value={customZh} onChange={e => setCustomZh(e.target.value)}
                placeholder="中文意思"
                onKeyDown={e => e.key === 'Enter' && addCustomWord()}
                style={{ flex: 1, minWidth: 120, padding: '9px 12px', border: '2px solid #E0D5FF', borderRadius: 10, fontSize: '0.95rem', outline: 'none' }} />
              <button onClick={addCustomWord} className="btn-cartoon"
                style={{ padding: '9px 20px', background: '#A29BFE', color: 'white', fontSize: '0.95rem', whiteSpace: 'nowrap' }}>
                + 添加
              </button>
            </div>
            <div style={{ fontSize: '0.78rem', color: '#AAA', marginTop: 6 }}>输完按 Enter 或点添加，自动加入上方单词列表</div>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={reset} className="btn-cartoon" style={{ flex: 1, padding: '14px 0', background: '#F5F5F5', color: '#666' }}>重新上传</button>
            <button onClick={saveLesson} className="btn-cartoon"
              style={{ flex: 2, padding: '14px 0', background: 'linear-gradient(135deg,#A29BFE,#FF6B6B)', color: 'white', fontSize: '1.1rem' }}>
              ✨ 保存并生成题库
            </button>
          </div>
        </div>
      )}

      {step === 'done' && (
        <div className="card-cartoon" style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: '4rem', marginBottom: 16 }} className="bounce">🎉</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#333', marginBottom: 8 }}>题库生成成功！</div>
          <div style={{ color: '#888', marginBottom: 24 }}>孩子现在可以去「练习」页面开始闯关了</div>
          <button onClick={reset} className="btn-cartoon"
            style={{ padding: '12px 32px', background: 'linear-gradient(135deg,#A29BFE,#FF6B6B)', color: 'white' }}>
            继续上传
          </button>
        </div>
      )}

      <LessonList gradeId={currentGrade} key={step} />
    </div>
  )
}

function UploadStep({ fileRef, onFile, errorMsg }: { fileRef: React.RefObject<HTMLInputElement | null>; onFile: (f: File) => void; errorMsg: string }) {
  return (
    <div>
      {errorMsg && (
        <div style={{ background: '#FFF0F0', border: '2px solid #FF6B6B', borderRadius: 14, padding: '12px 16px', marginBottom: 12, color: '#FF6B6B', fontWeight: 600, fontSize: '0.9rem' }}>
          ❌ {errorMsg}
        </div>
      )}
      <div className="card-cartoon" onClick={() => fileRef.current?.click()}
        style={{ padding: 40, textAlign: 'center', cursor: 'pointer', border: '3px dashed #A29BFE', background: '#F8F5FF', marginBottom: 16 }}>
        <div style={{ fontSize: '4rem', marginBottom: 12 }} className="float-anim">📷</div>
        <div style={{ fontWeight: 900, fontSize: '1.2rem', color: '#A29BFE', marginBottom: 8 }}>点击上传图片</div>
        <div style={{ color: '#888', fontSize: '0.9rem' }}>支持手机拍照、截图、扫描件</div>
        <div style={{ marginTop: 8, fontSize: '0.8rem', color: '#AAA' }}>图片越清晰，识别越准确</div>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f) }} />
      </div>
      <div className="card-cartoon" style={{ padding: 16, background: '#F0FFF4', border: '2px solid #6BCB77' }}>
        <div style={{ fontWeight: 700, marginBottom: 6, color: '#6BCB77' }}>✨ 识别效果说明</div>
        <div style={{ fontSize: '0.85rem', color: '#555', lineHeight: 1.8 }}>
          • 百度高精度OCR识别，自动翻译所有单词和句子<br />
          • 词库涵盖小学→高三约2500个常用词，自动匹配<br />
          • 超出词库的词汇调用翻译API补全<br />
          • 没有翻译的词自动过滤，确保题库质量<br />
          • 底部可手动补充遗漏的单词
        </div>
      </div>
    </div>
  )
}

function LessonList({ gradeId }: { gradeId: number }) {
  const [lessons, setLessons] = useState<{ id?: number; title: string; createdAt: number }[]>([])
  useEffect(() => {
    db.lessons.where('gradeId').equals(gradeId).sortBy('createdAt').then(ls => setLessons(ls.reverse()))
  }, [gradeId])
  if (lessons.length === 0) return null
  return (
    <div className="card-cartoon" style={{ padding: 16, marginTop: 20 }}>
      <div style={{ fontWeight: 700, marginBottom: 12 }}>📚 已上传的课文（{lessons.length}份）</div>
      {lessons.map(l => (
        <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #F0EAF0' }}>
          <span style={{ fontSize: '1.5rem' }}>📖</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700 }}>{l.title}</div>
            <div style={{ fontSize: '0.8rem', color: '#999' }}>{new Date(l.createdAt).toLocaleDateString()}</div>
          </div>
          <button onClick={async () => {
            if (confirm('删除这份课文？题库里对应的单词也会删除')) {
              await db.lessons.delete(l.id!)
              await db.words.where('lessonId').equals(l.id!).delete()
              setLessons(prev => prev.filter(x => x.id !== l.id))
            }
          }} style={{ color: '#FF6B6B', background: 'none', border: 'none', fontSize: '1.1rem', cursor: 'pointer' }}>🗑️</button>
        </div>
      ))}
    </div>
  )
}
