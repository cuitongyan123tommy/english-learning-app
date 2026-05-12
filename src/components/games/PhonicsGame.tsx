import { useState, useEffect } from 'react'
import { useAppStore } from '../../store'
import { db, addPoints, recordWrong } from '../../db'
import { splitSyllables } from '../../utils/ocr'
import { sounds } from '../../utils/sound'
import { triggerConfetti } from '../ui/Confetti'
import FeedbackOverlay from '../ui/FeedbackOverlay'
import { HIGH_FREQ_LIST } from '../../data/highfreq'

interface Question {
  word: string
  chinese: string
  syllables: string[]
  options: string[][]
  id?: number
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5)
}

export default function PhonicsGame() {
  const { currentGrade, soundEnabled } = useAppStore()
  const [questions, setQuestions] = useState<Question[]>([])
  const [idx, setIdx] = useState(0)
  const [selected, setSelected] = useState<string[]>([])
  const [feedback, setFeedback] = useState<{ show: boolean; correct: boolean }>({ show: false, correct: false })
  const [score, setScore] = useState(0)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    async function load() {
      const dbWords = await db.words.where('gradeId').equals(currentGrade).toArray()
      const all = [
        ...dbWords.map(w => ({ english: w.english, chinese: w.chinese, id: w.id })),
        ...HIGH_FREQ_LIST
      ].filter(w => w.english.length >= 3)

      const qs: Question[] = shuffle(all).slice(0, 15).map(w => {
        const syllables = splitSyllables(w.english)
        const allSyllables = all.flatMap(x => splitSyllables(x.english))
        const distractors = shuffle(allSyllables.filter(s => !syllables.includes(s))).slice(0, 4)
        return {
          word: w.english,
          chinese: w.chinese,
          syllables,
          options: syllables.map((_, i) => {
            const correct = syllables[i]
            return shuffle([correct, ...distractors.slice(0, 3)])
          }),
          id: (w as { id?: number }).id
        }
      })
      setQuestions(qs)
    }
    load()
  }, [currentGrade])

  const current = questions[idx]

  useEffect(() => {
    if (current) setSelected(Array(current.syllables.length).fill(''))
  }, [current])

  async function check() {
    if (!current) return
    const correct = selected.every((s, i) => s === current.syllables[i])
    if (soundEnabled) correct ? sounds.correct() : sounds.wrong()
    setFeedback({ show: true, correct })
    setTotal(t => t + 1)
    if (correct) {
      setScore(s => s + 1)
      await addPoints(currentGrade, 10)
      triggerConfetti()
    } else {
      await recordWrong(currentGrade, current.id ?? 0, current.word, current.chinese, 'phonics')
    }
  }

  function next() {
    setFeedback({ show: false, correct: false })
    setIdx(i => (i + 1) % Math.max(1, questions.length))
  }

  function speak(word: string) {
    if ('speechSynthesis' in window) {
      const utter = new SpeechSynthesisUtterance(word)
      utter.lang = 'en-US'
      utter.rate = 0.85
      speechSynthesis.speak(utter)
    }
  }

  if (!current) {
    return (
      <div className="card-cartoon" style={{ padding: 40, textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: 12 }}>🎵</div>
        <div style={{ fontWeight: 700, color: '#666' }}>暂无单词，请家长先上传课文</div>
      </div>
    )
  }

  const canCheck = selected.every(s => s)

  return (
    <div>
      <FeedbackOverlay show={feedback.show} correct={feedback.correct} onDone={next} />

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontWeight: 900, fontSize: '1.1rem', color: '#333' }}>🎵 自然拼读练习</div>
        <div style={{ background: '#FFF5EE', borderRadius: 20, padding: '4px 16px', fontWeight: 700, color: '#FE8C2F' }}>✓ {score}/{total}</div>
      </div>

      <div className="card-cartoon" style={{ padding: 28, textAlign: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: '0.9rem', color: '#999', marginBottom: 8 }}>为这个单词选择正确的音节顺序</div>

        <button
          onClick={() => speak(current.word)}
          style={{ marginBottom: 16, padding: '10px 24px', background: 'linear-gradient(135deg,#4D96FF,#A29BFE)', color: 'white', border: 'none', borderRadius: 20, fontWeight: 700, fontSize: '1.1rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(77,150,255,0.3)' }}
        >
          🔊 听发音
        </button>

        <div style={{ fontSize: '1.3rem', color: '#888', marginBottom: 16 }}>{current.chinese}</div>

        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginBottom: 24, flexWrap: 'wrap' }}>
          {current.syllables.map((_, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.8rem', color: '#999', marginBottom: 6 }}>第{['一','二','三','四'][i]}音节</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {current.options[i].map((opt, j) => (
                  <button
                    key={j}
                    onClick={() => {
                      const next = [...selected]
                      next[i] = opt
                      setSelected(next)
                      sounds.click()
                    }}
                    style={{
                      padding: '10px 20px',
                      background: selected[i] === opt ? 'linear-gradient(135deg,#FE8C2F,#FFD93D)' : 'white',
                      color: selected[i] === opt ? 'white' : '#333',
                      border: `2.5px solid ${selected[i] === opt ? '#FE8C2F' : '#E0D5FF'}`,
                      borderRadius: 12,
                      fontWeight: 700,
                      fontSize: '1.1rem',
                      cursor: 'pointer',
                      letterSpacing: 1,
                      minWidth: 80
                    }}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {selected.some(s => s) && (
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#A29BFE', marginBottom: 16, letterSpacing: 4 }}>
            {selected.join('-')}
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button
            onClick={check}
            disabled={!canCheck}
            className="btn-cartoon"
            style={{ padding: '12px 32px', background: canCheck ? 'linear-gradient(135deg,#FE8C2F,#FFD93D)' : '#EEE', color: canCheck ? 'white' : '#AAA', fontSize: '1rem', cursor: canCheck ? 'pointer' : 'default' }}
          >
            确认答案 ✓
          </button>
          <button onClick={next} style={{ padding: '12px 20px', background: '#F5F5F5', border: '2px solid #DDD', borderRadius: 14, fontWeight: 700, color: '#666', cursor: 'pointer' }}>跳过 →</button>
        </div>
      </div>

      <div style={{ background: '#FFF9E6', border: '2px solid #FFD93D', borderRadius: 16, padding: '12px 16px' }}>
        <div style={{ fontWeight: 700, color: '#FE8C2F', marginBottom: 4 }}>💡 拼读小技巧</div>
        <div style={{ fontSize: '0.85rem', color: '#666' }}>
          自然拼读：把单词拆开来读，一个音节一个音节地拼，听几次就能记住！
        </div>
      </div>
    </div>
  )
}
