import { useState, useEffect } from 'react'
import { useAppStore } from '../../store'
import { addPoints, recordWrong } from '../../db'
import { sounds } from '../../utils/sound'
import { triggerConfetti } from '../ui/Confetti'
import FeedbackOverlay from '../ui/FeedbackOverlay'
import { HIGH_FREQ_LIST, HIGH_FREQ_SENTENCES } from '../../data/highfreq'

type SubMode = 'match' | 'fill' | 'sentence'

interface Option { english: string; chinese: string }

function shuffle<T>(arr: T[]): T[] { return [...arr].sort(() => Math.random() - 0.5) }

export default function HighFreqGame() {
  const { currentGrade, soundEnabled } = useAppStore()
  const [subMode, setSubMode] = useState<SubMode>('match')
  const [questions, setQuestions] = useState<Option[]>([])
  const [idx, setIdx] = useState(0)
  const [chosen, setChosen] = useState('')
  const [feedback, setFeedback] = useState<{ show: boolean; correct: boolean }>({ show: false, correct: false })
  const [score, setScore] = useState(0)
  const [total, setTotal] = useState(0)
  const [fillInput, setFillInput] = useState('')
  const [sentenceIdx, setSentenceIdx] = useState(0)

  useEffect(() => { setQuestions(shuffle(HIGH_FREQ_LIST)); setIdx(0); setScore(0); setTotal(0) }, [subMode])

  const current = questions[idx]
  const options = current ? shuffle([current, ...shuffle(HIGH_FREQ_LIST.filter(w => w.english !== current.english)).slice(0, 3)]) : []
  const sentences = current ? (HIGH_FREQ_SENTENCES[current.english] || []) : []

  async function handleAnswer(correct: boolean) {
    if (soundEnabled) correct ? sounds.correct() : sounds.wrong()
    setFeedback({ show: true, correct })
    setTotal(t => t + 1)
    if (correct) {
      setScore(s => s + 1)
      await addPoints(currentGrade, 8)
      triggerConfetti()
    } else {
      await recordWrong(currentGrade, 0, current.english, current.chinese, 'highfreq')
    }
    setFillInput('')
  }

  function next() {
    setFeedback({ show: false, correct: false })
    setChosen('')
    setFillInput('')
    setSentenceIdx(0)
    setIdx(i => (i + 1) % Math.max(1, questions.length))
  }

  function speak(text: string) {
    if ('speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance(text)
      u.lang = 'en-US'; u.rate = 0.9
      speechSynthesis.speak(u)
    }
  }

  if (!current) return null

  return (
    <div>
      <FeedbackOverlay show={feedback.show} correct={feedback.correct} onDone={next} />

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontWeight: 900, fontSize: '1.1rem', color: '#333' }}>⚡ 高频小词</div>
        <div style={{ background: '#EFF6FF', borderRadius: 20, padding: '4px 16px', fontWeight: 700, color: '#4D96FF' }}>✓ {score}/{total}</div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {([['match','词意配对'],['fill','拼写练习'],['sentence','句子练习']] as [SubMode,string][]).map(([m, label]) => (
          <button
            key={m}
            onClick={() => setSubMode(m)}
            style={{ flex: 1, padding: '8px 0', background: subMode === m ? '#4D96FF' : '#EFF6FF', color: subMode === m ? 'white' : '#4D96FF', border: `2px solid #4D96FF`, borderRadius: 12, fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="card-cartoon" style={{ padding: 28, marginBottom: 16 }}>
        {subMode === 'match' && (
          <>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: '0.9rem', color: '#999', marginBottom: 8 }}>选出正确的中文意思</div>
              <button onClick={() => speak(current.english)} style={{ fontSize: '2.5rem', fontWeight: 900, color: '#4D96FF', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline dotted' }}>
                {current.english}
              </button>
              <div style={{ fontSize: '0.85rem', color: '#AAA', marginTop: 4 }}>🔊 点击听发音</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {options.map(opt => (
                <button
                  key={opt.english}
                  onClick={() => { setChosen(opt.english); handleAnswer(opt.english === current.english) }}
                  disabled={!!chosen}
                  style={{
                    padding: '16px 12px', borderRadius: 16, fontWeight: 700, fontSize: '1rem', cursor: chosen ? 'default' : 'pointer',
                    background: !chosen ? 'white' : opt.english === current.english ? '#55EFC4' : opt.english === chosen ? '#FD79A8' : 'white',
                    color: !chosen ? '#333' : opt.english === current.english ? 'white' : opt.english === chosen ? 'white' : '#CCC',
                    border: `2.5px solid ${!chosen ? '#E0D5FF' : opt.english === current.english ? '#00B894' : opt.english === chosen ? '#E84393' : '#EEE'}`,
                    transition: 'all 0.2s'
                  }}
                >
                  {opt.chinese}
                </button>
              ))}
            </div>
          </>
        )}

        {subMode === 'fill' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.9rem', color: '#999', marginBottom: 8 }}>看中文，拼出这个高频词</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#333', marginBottom: 20 }}>{current.chinese}</div>
            <input
              value={fillInput}
              onChange={e => setFillInput(e.target.value.replace(/[^a-zA-Z]/g, ''))}
              onKeyDown={e => e.key === 'Enter' && fillInput && handleAnswer(fillInput.toLowerCase() === current.english)}
              placeholder="输入英文"
              style={{ width: '100%', maxWidth: 200, padding: '12px 16px', border: '3px solid #4D96FF', borderRadius: 16, fontSize: '1.3rem', textAlign: 'center', fontWeight: 700, outline: 'none', letterSpacing: 3 }}
              autoFocus
            />
            <div style={{ marginTop: 16 }}>
              <button
                onClick={() => handleAnswer(fillInput.toLowerCase() === current.english)}
                disabled={!fillInput}
                className="btn-cartoon"
                style={{ padding: '10px 28px', background: fillInput ? 'linear-gradient(135deg,#4D96FF,#A29BFE)' : '#EEE', color: fillInput ? 'white' : '#AAA', fontSize: '1rem', cursor: fillInput ? 'pointer' : 'default' }}
              >
                确认 ✓
              </button>
            </div>
          </div>
        )}

        {subMode === 'sentence' && sentences.length > 0 && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.9rem', color: '#999', marginBottom: 12 }}>找出句子中的高频词，点击它！</div>
            <div style={{ fontSize: '0.85rem', color: '#4D96FF', marginBottom: 8 }}>目标词：<strong>{current.english}</strong>（{current.chinese}）</div>
            <div style={{ fontSize: '1.3rem', marginBottom: 20, lineHeight: 2, color: '#333' }}>
              {sentences[sentenceIdx % sentences.length].split(' ').map((word, i) => {
                const clean = word.replace(/[^a-zA-Z]/g, '').toLowerCase()
                const isTarget = clean === current.english
                return (
                  <span key={i}>
                    <button
                      onClick={() => isTarget && handleAnswer(true)}
                      style={{ fontWeight: isTarget && chosen ? 900 : 400, color: isTarget && chosen ? '#4D96FF' : '#333', background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', textDecoration: isTarget ? 'underline dotted #4D96FF' : 'none', padding: '0 2px' }}
                    >
                      {word}
                    </button>{' '}
                  </span>
                )
              })}
            </div>
            <button onClick={() => speak(sentences[sentenceIdx % sentences.length])} style={{ padding: '8px 20px', background: '#EFF6FF', border: '2px solid #4D96FF', borderRadius: 14, color: '#4D96FF', fontWeight: 700, cursor: 'pointer', marginBottom: 12 }}>
              🔊 听整句
            </button>
          </div>
        )}
      </div>

      <button onClick={next} style={{ width: '100%', padding: '12px 0', background: '#F5F5F5', border: '2px solid #DDD', borderRadius: 16, fontWeight: 700, color: '#666', cursor: 'pointer', fontSize: '1rem' }}>
        换一个词 →
      </button>
    </div>
  )
}
