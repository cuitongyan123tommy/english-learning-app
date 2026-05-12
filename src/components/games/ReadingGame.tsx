import { useState, useEffect } from 'react'
import { useAppStore } from '../../store'
import { db, addPoints } from '../../db'
import { sounds } from '../../utils/sound'
import { triggerConfetti } from '../ui/Confetti'
import FeedbackOverlay from '../ui/FeedbackOverlay'

interface ReadingQuestion {
  lessonTitle: string
  text: string
  question: string
  options: string[]
  answer: number
}

function shuffle<T>(arr: T[]): T[] { return [...arr].sort(() => Math.random() - 0.5) }

function generateQuestions(title: string, content: string, words: { english: string; chinese: string }[]): ReadingQuestion[] {
  const sentences = content.split('\n').filter(s => s.length > 10)
  const qs: ReadingQuestion[] = []

  for (const sentence of sentences.slice(0, 3)) {
    const wordInSentence = words.find(w => new RegExp(`\\b${w.english}\\b`, 'i').test(sentence))
    if (!wordInSentence) continue
    const distractors = shuffle(words.filter(w => w.english !== wordInSentence.english)).slice(0, 3).map(w => w.chinese)
    const options = shuffle([wordInSentence.chinese, ...distractors])
    qs.push({
      lessonTitle: title,
      text: sentence,
      question: `"${wordInSentence.english}" 的中文意思是？`,
      options,
      answer: options.indexOf(wordInSentence.chinese)
    })
  }
  return qs
}

export default function ReadingGame() {
  const { currentGrade, soundEnabled } = useAppStore()
  const [questions, setQuestions] = useState<ReadingQuestion[]>([])
  const [idx, setIdx] = useState(0)
  const [chosen, setChosen] = useState(-1)
  const [feedback, setFeedback] = useState<{ show: boolean; correct: boolean }>({ show: false, correct: false })
  const [score, setScore] = useState(0)
  const [total, setTotal] = useState(0)
  const [showText, setShowText] = useState(true)

  useEffect(() => {
    async function load() {
      const lessons = await db.lessons.where('gradeId').equals(currentGrade).toArray()
      const words = await db.words.where('gradeId').equals(currentGrade).toArray()
      const allQs: ReadingQuestion[] = []
      for (const lesson of lessons) {
        const lessonWords = words.filter(w => w.lessonId === lesson.id)
        allQs.push(...generateQuestions(lesson.title, lesson.content, lessonWords))
      }
      setQuestions(shuffle(allQs))
    }
    load()
  }, [currentGrade])

  const current = questions[idx]

  async function handleChoice(i: number) {
    if (chosen >= 0) return
    setChosen(i)
    const correct = i === current.answer
    if (soundEnabled) correct ? sounds.correct() : sounds.wrong()
    setFeedback({ show: true, correct })
    setTotal(t => t + 1)
    if (correct) {
      setScore(s => s + 1)
      await addPoints(currentGrade, 12)
      triggerConfetti()
    }
  }

  function next() {
    setFeedback({ show: false, correct: false })
    setChosen(-1)
    setShowText(true)
    setIdx(i => (i + 1) % Math.max(1, questions.length))
  }

  function speak(text: string) {
    if ('speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance(text)
      u.lang = 'en-US'; u.rate = 0.8
      speechSynthesis.speak(u)
    }
  }

  if (!current) {
    return (
      <div className="card-cartoon" style={{ padding: 40, textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: 12 }}>📚</div>
        <div style={{ fontWeight: 700, color: '#666' }}>暂无阅读内容，请家长先上传课文</div>
      </div>
    )
  }

  return (
    <div>
      <FeedbackOverlay show={feedback.show} correct={feedback.correct} onDone={next} />

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontWeight: 900, fontSize: '1.1rem', color: '#333' }}>📚 阅读理解</div>
        <div style={{ background: '#F5F3FF', borderRadius: 20, padding: '4px 16px', fontWeight: 700, color: '#A29BFE' }}>✓ {score}/{total}</div>
      </div>

      <div style={{ background: '#F5F3FF', border: '2px solid #A29BFE', borderRadius: 16, padding: '8px 14px', marginBottom: 16, fontSize: '0.85rem', color: '#A29BFE', fontWeight: 700 }}>
        📖 {current.lessonTitle}
      </div>

      {showText && (
        <div className="card-cartoon" style={{ padding: 20, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ fontSize: '0.9rem', color: '#999' }}>阅读短句</div>
            <button onClick={() => speak(current.text)} style={{ background: '#EFF6FF', border: '2px solid #4D96FF', borderRadius: 10, padding: '4px 12px', color: '#4D96FF', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}>🔊 听</button>
          </div>
          <div style={{ fontSize: '1.2rem', lineHeight: 1.8, color: '#333', fontStyle: 'italic' }}>
            "{current.text}"
          </div>
        </div>
      )}

      <div className="card-cartoon" style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ fontWeight: 700, color: '#333', marginBottom: 16, fontSize: '1rem' }}>
          ❓ {current.question}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {current.options.map((opt, i) => (
            <button
              key={i}
              onClick={() => handleChoice(i)}
              disabled={chosen >= 0}
              style={{
                padding: '16px 12px', borderRadius: 16, fontWeight: 700, fontSize: '1rem',
                cursor: chosen >= 0 ? 'default' : 'pointer',
                background: chosen < 0 ? 'white' : i === current.answer ? '#55EFC4' : i === chosen ? '#FD79A8' : 'white',
                color: chosen < 0 ? '#333' : i === current.answer ? 'white' : i === chosen ? 'white' : '#CCC',
                border: `2.5px solid ${chosen < 0 ? '#E0D5FF' : i === current.answer ? '#00B894' : i === chosen ? '#E84393' : '#EEE'}`,
                transition: 'all 0.2s'
              }}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      <button onClick={next} style={{ width: '100%', padding: '12px 0', background: '#F5F5F5', border: '2px solid #DDD', borderRadius: 16, fontWeight: 700, color: '#666', cursor: 'pointer', fontSize: '1rem' }}>
        下一题 →
      </button>
    </div>
  )
}
