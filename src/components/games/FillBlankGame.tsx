import { useState, useEffect } from 'react'
import { useAppStore } from '../../store'
import { db, addPoints, recordWrong } from '../../db'
import { generateBlanks } from '../../utils/ocr'
import { sounds } from '../../utils/sound'
import { triggerConfetti } from '../ui/Confetti'
import FeedbackOverlay from '../ui/FeedbackOverlay'

interface BlankQuestion {
  text: string
  answer: string
  hint: string
  wordId: number
  wordChinese: string
  lessonTitle: string
}

function shuffle<T>(arr: T[]): T[] { return [...arr].sort(() => Math.random() - 0.5) }

export default function FillBlankGame() {
  const { currentGrade, soundEnabled } = useAppStore()
  const [questions, setQuestions] = useState<BlankQuestion[]>([])
  const [idx, setIdx] = useState(0)
  const [input, setInput] = useState('')
  const [feedback, setFeedback] = useState<{ show: boolean; correct: boolean }>({ show: false, correct: false })
  const [score, setScore] = useState(0)
  const [total, setTotal] = useState(0)
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    async function load() {
      const lessons = await db.lessons.where('gradeId').equals(currentGrade).toArray()
      const words = await db.words.where('gradeId').equals(currentGrade).toArray()
      if (lessons.length === 0 || words.length === 0) return

      const qs: BlankQuestion[] = []
      for (const lesson of lessons) {
        const lessonWords = words.filter(w => w.lessonId === lesson.id)
        if (lessonWords.length === 0) continue
        const sentences = lesson.content.split('\n').filter(s => s.length > 5)
        for (const sentence of sentences) {
          const blanks = generateBlanks(sentence, lessonWords.map(w => w.english))
          for (const b of blanks) {
            const word = lessonWords.find(w => w.english.toLowerCase() === b.answer)
            if (word) {
              qs.push({ text: b.text, answer: b.answer, hint: `（${word.chinese}）`, wordId: word.id!, wordChinese: word.chinese, lessonTitle: lesson.title })
            }
          }
        }
      }
      setQuestions(shuffle(qs))
      setIdx(0)
    }
    load()
  }, [currentGrade])

  const current = questions[idx]

  async function check() {
    if (!current) return
    const correct = input.trim().toLowerCase() === current.answer
    if (soundEnabled) correct ? sounds.correct() : sounds.wrong()
    setFeedback({ show: true, correct })
    setTotal(t => t + 1)
    if (correct) {
      setScore(s => s + 1)
      await addPoints(currentGrade, 10)
      triggerConfetti()
    } else {
      await recordWrong(currentGrade, current.wordId, current.answer, current.wordChinese, 'fillblank')
    }
  }

  function next() {
    setFeedback({ show: false, correct: false })
    setInput('')
    setRevealed(false)
    setIdx(i => (i + 1) % Math.max(1, questions.length))
  }

  if (!current) {
    return (
      <div className="card-cartoon" style={{ padding: 40, textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: 12 }}>📖</div>
        <div style={{ fontWeight: 700, color: '#666', marginBottom: 8 }}>暂无题目</div>
        <div style={{ color: '#999', fontSize: '0.9rem' }}>请家长先上传含有句子的英语课文</div>
      </div>
    )
  }

  const parts = current.text.split(/(_+)/)

  return (
    <div>
      <FeedbackOverlay show={feedback.show} correct={feedback.correct} onDone={next} />

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontWeight: 900, fontSize: '1.1rem', color: '#333' }}>📖 课文填空</div>
        <div style={{ background: '#F0FFF4', borderRadius: 20, padding: '4px 16px', fontWeight: 700, color: '#6BCB77' }}>✓ {score}/{total}</div>
      </div>

      <div style={{ background: '#F0FFF4', border: '2px solid #6BCB77', borderRadius: 16, padding: '8px 14px', marginBottom: 16, fontSize: '0.85rem', color: '#6BCB77', fontWeight: 700 }}>
        📚 {current.lessonTitle}
      </div>

      <div className="card-cartoon" style={{ padding: 28, marginBottom: 16 }}>
        <div style={{ fontSize: '0.9rem', color: '#999', marginBottom: 16 }}>根据提示，填入合适的英文单词</div>
        <div style={{ fontSize: '1.3rem', lineHeight: 2.2, marginBottom: 16, color: '#333' }}>
          {parts.map((part, i) =>
            /^_+$/.test(part) ? (
              <input
                key={i}
                value={input}
                onChange={e => setInput(e.target.value.replace(/[^a-zA-Z]/g, ''))}
                onKeyDown={e => e.key === 'Enter' && input && check()}
                style={{ width: Math.max(80, part.length * 14), textAlign: 'center', fontWeight: 900, color: '#6BCB77', background: 'transparent', border: 'none', borderBottom: '3px solid #6BCB77', outline: 'none', fontSize: '1.3rem', padding: '0 4px' }}
                autoFocus
              />
            ) : (
              <span key={i}>{part}</span>
            )
          )}
        </div>

        <div style={{ fontSize: '1rem', color: '#888', marginBottom: 20 }}>💡 提示：{current.hint}</div>

        {revealed && (
          <div style={{ background: '#FFF9E6', border: '2px solid #FFD93D', borderRadius: 12, padding: '10px 16px', marginBottom: 16, fontWeight: 700, color: '#FE8C2F' }}>
            答案：{current.answer}
          </div>
        )}

        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={() => setRevealed(true)}
            disabled={revealed}
            style={{ flex: 1, padding: '10px 0', background: '#FFF9E6', border: '2px solid #FFD93D', borderRadius: 14, fontWeight: 700, color: revealed ? '#AAA' : '#FE8C2F', cursor: revealed ? 'default' : 'pointer' }}
          >
            显示答案
          </button>
          <button
            onClick={check}
            disabled={!input}
            className="btn-cartoon"
            style={{ flex: 2, padding: '10px 0', background: input ? 'linear-gradient(135deg,#6BCB77,#4D96FF)' : '#EEE', color: input ? 'white' : '#AAA', fontSize: '1rem', cursor: input ? 'pointer' : 'default' }}
          >
            确认答案 ✓
          </button>
          <button onClick={next} style={{ flex: 1, padding: '10px 0', background: '#F5F5F5', border: '2px solid #DDD', borderRadius: 14, fontWeight: 700, color: '#666', cursor: 'pointer' }}>
            跳过 →
          </button>
        </div>
      </div>
    </div>
  )
}
