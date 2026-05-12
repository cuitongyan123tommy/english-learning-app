import { useState, useEffect, useRef, useCallback } from 'react'
import { useAppStore } from '../../store'
import { db, addPoints, recordWrong } from '../../db'
import { sounds } from '../../utils/sound'
import { triggerConfetti } from '../ui/Confetti'
import FeedbackOverlay from '../ui/FeedbackOverlay'
import { HIGH_FREQ_LIST } from '../../data/highfreq'

interface WordItem { english: string; chinese: string; id?: number }

export default function SpellGame() {
  const { currentGrade, soundEnabled } = useAppStore()
  const [words, setWords] = useState<WordItem[]>([])
  const [idx, setIdx] = useState(0)
  const [input, setInput] = useState<string[]>([])
  const [feedback, setFeedback] = useState<{ show: boolean; correct: boolean }>({ show: false, correct: false })
  const [score, setScore] = useState(0)
  const [total, setTotal] = useState(0)
  const [hint, setHint] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    async function load() {
      const dbWords = await db.words.where('gradeId').equals(currentGrade).toArray()
      const combined = [
        ...dbWords.map(w => ({ english: w.english, chinese: w.chinese, id: w.id })),
        ...HIGH_FREQ_LIST.slice(0, currentGrade <= 2 ? 15 : 8)
      ]
      const shuffled = combined.sort(() => Math.random() - 0.5)
      setWords(shuffled)
      setIdx(0)
    }
    load()
  }, [currentGrade])

  const current = words[idx]

  useEffect(() => {
    if (current) {
      setInput(Array(current.english.length).fill(''))
      setHint(false)
      setTimeout(() => inputRefs.current[0]?.focus(), 100)
    }
  }, [current])

  const check = useCallback(async () => {
    if (!current) return
    const answer = input.join('').toLowerCase()
    const correct = answer === current.english.toLowerCase()
    if (soundEnabled) correct ? sounds.correct() : sounds.wrong()
    setFeedback({ show: true, correct })
    setTotal(t => t + 1)
    if (correct) {
      setScore(s => s + 1)
      await addPoints(currentGrade, 10)
      triggerConfetti()
    } else {
      await recordWrong(currentGrade, current.id ?? 0, current.english, current.chinese, 'spell')
    }
  }, [current, input, currentGrade, soundEnabled])

  function handleKey(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !input[i] && i > 0) {
      inputRefs.current[i - 1]?.focus()
    }
    if (e.key === 'Enter') check()
  }

  function handleChange(i: number, v: string) {
    const char = v.slice(-1).replace(/[^a-zA-Z]/g, '')
    const next = [...input]
    next[i] = char
    setInput(next)
    if (char && i < input.length - 1) {
      inputRefs.current[i + 1]?.focus()
    }
  }

  function next() {
    setFeedback({ show: false, correct: false })
    setIdx(i => (i + 1) % words.length)
  }

  if (!current) {
    return (
      <div className="card-cartoon" style={{ padding: 40, textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: 12 }}>📚</div>
        <div style={{ fontWeight: 700, color: '#666' }}>暂无单词，请家长先上传课文</div>
      </div>
    )
  }

  const filled = input.filter(c => c).length
  const canCheck = filled === current.english.length

  return (
    <div>
      <FeedbackOverlay show={feedback.show} correct={feedback.correct} onDone={next} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontWeight: 900, fontSize: '1.1rem', color: '#333' }}>✏️ 中文→拼英文</div>
        <div style={{ background: '#F5F3FF', borderRadius: 20, padding: '4px 16px', fontWeight: 700, color: '#A29BFE' }}>
          ✓ {score}/{total}
        </div>
      </div>

      <div className="card-cartoon" style={{ padding: 32, textAlign: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: '0.9rem', color: '#999', marginBottom: 8 }}>看中文，拼出英文单词</div>
        <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#333', marginBottom: 20 }}>{current.chinese}</div>

        {hint && (
          <div style={{ background: '#FFF9E6', border: '2px solid #FFD93D', borderRadius: 14, padding: '8px 16px', marginBottom: 16, fontSize: '1rem', color: '#888', letterSpacing: 4 }}>
            {current.english[0]}{'_'.repeat(current.english.length - 1)}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 24 }}>
          {input.map((c, i) => (
            <input
              key={i}
              ref={el => { inputRefs.current[i] = el }}
              className="letter-box"
              value={c.toUpperCase()}
              onChange={e => handleChange(i, e.target.value)}
              onKeyDown={e => handleKey(i, e)}
              maxLength={2}
            />
          ))}
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => setHint(true)}
            disabled={hint}
            style={{ padding: '10px 20px', background: hint ? '#EEE' : '#FFF9E6', border: '2px solid #FFD93D', borderRadius: 14, fontWeight: 700, color: hint ? '#AAA' : '#FE8C2F', cursor: hint ? 'default' : 'pointer' }}
          >
            💡 提示首字母
          </button>
          <button
            onClick={check}
            disabled={!canCheck}
            className="btn-cartoon"
            style={{ padding: '10px 28px', background: canCheck ? 'linear-gradient(135deg,#FF6B6B,#FE8C2F)' : '#EEE', color: canCheck ? 'white' : '#AAA', fontSize: '1rem', cursor: canCheck ? 'pointer' : 'default' }}
          >
            检查答案 ✓
          </button>
          <button
            onClick={next}
            style={{ padding: '10px 20px', background: '#F5F5F5', border: '2px solid #DDD', borderRadius: 14, fontWeight: 700, color: '#666', cursor: 'pointer' }}
          >
            跳过 →
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 4 }}>
        {words.slice(0, Math.min(20, words.length)).map((_, i) => (
          <div key={i} style={{ flex: 1, height: 6, borderRadius: 999, background: i < idx ? '#6BCB77' : i === idx ? '#FF6B6B' : '#EEE' }} />
        ))}
      </div>
    </div>
  )
}
