import { useState, useEffect } from 'react'
import { useAppStore } from '../store'
import { getWrongWords, type WrongWord, db } from '../db'
import { sounds } from '../utils/sound'
import { addPoints } from '../db'
import { triggerConfetti } from '../components/ui/Confetti'
import FeedbackOverlay from '../components/ui/FeedbackOverlay'

export default function WrongBookPage() {
  const { currentGrade, soundEnabled } = useAppStore()
  const [words, setWords] = useState<WrongWord[]>([])
  const [mode, setMode] = useState<'list' | 'review'>('list')
  const [idx, setIdx] = useState(0)
  const [input, setInput] = useState('')
  const [feedback, setFeedback] = useState<{ show: boolean; correct: boolean }>({ show: false, correct: false })
  const [score, setScore] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)

  useEffect(() => {
    getWrongWords(currentGrade).then(ws => setWords(ws.reverse()))
  }, [currentGrade])

  const current = words[idx]

  async function check() {
    if (!current) return
    const correct = input.trim().toLowerCase() === current.word.toLowerCase()
    if (soundEnabled) correct ? sounds.correct() : sounds.wrong()
    setFeedback({ show: true, correct })
    if (correct) {
      setScore(s => s + 1)
      await addPoints(currentGrade, 15)
      triggerConfetti()
      if (current.wrongCount <= 1) {
        await db.wrongWords.delete(current.id!)
      } else {
        await db.wrongWords.update(current.id!, { wrongCount: current.wrongCount - 1 })
      }
      setWords(prev => prev.filter((_, i) => i !== idx))
    }
  }

  function next() {
    setFeedback({ show: false, correct: false })
    setInput('')
    setShowAnswer(false)
    setIdx(i => Math.min(i + 1, Math.max(0, words.length - 1)))
  }

  function speak(word: string) {
    if ('speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance(word)
      u.lang = 'en-US'; u.rate = 0.85
      speechSynthesis.speak(u)
    }
  }

  if (words.length === 0) {
    return (
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '16px 12px' }}>
        <div className="card-cartoon" style={{ padding: 48, textAlign: 'center' }}>
          <div style={{ fontSize: '4rem', marginBottom: 16 }} className="bounce">🎉</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#333', marginBottom: 8 }}>错题本是空的！</div>
          <div style={{ color: '#888', fontSize: '1rem' }}>太厉害了，没有错误！继续保持！</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '16px 12px' }}>
      <FeedbackOverlay show={feedback.show} correct={feedback.correct} onDone={next} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#333' }}>📝 错题本</h1>
          <div style={{ color: '#888', fontSize: '0.9rem' }}>{words.length} 个待复习单词</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setMode('list')} style={{ padding: '8px 16px', background: mode === 'list' ? '#FE8C2F' : '#FFF5EE', color: mode === 'list' ? 'white' : '#FE8C2F', border: '2px solid #FE8C2F', borderRadius: 12, fontWeight: 700, cursor: 'pointer' }}>列表</button>
          <button onClick={() => { setMode('review'); setIdx(0); setScore(0) }} style={{ padding: '8px 16px', background: mode === 'review' ? '#FE8C2F' : '#FFF5EE', color: mode === 'review' ? 'white' : '#FE8C2F', border: '2px solid #FE8C2F', borderRadius: 12, fontWeight: 700, cursor: 'pointer' }}>复习</button>
        </div>
      </div>

      {mode === 'list' && (
        <div>
          {words.map((w, i) => (
            <div key={w.id} className="card-cartoon" style={{ padding: '14px 16px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#FFF0F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#FF6B6B', fontSize: '0.9rem', flexShrink: 0 }}>
                {w.wrongCount}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 900, fontSize: '1.1rem', color: '#333' }}>{w.word}</div>
                <div style={{ color: '#888', fontSize: '0.85rem' }}>{w.chinese}</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => speak(w.word)} style={{ background: '#EFF6FF', border: '2px solid #4D96FF', borderRadius: 10, padding: '6px 10px', color: '#4D96FF', cursor: 'pointer', fontSize: '1rem' }}>🔊</button>
                <button
                  onClick={() => { setMode('review'); setIdx(i); setScore(0) }}
                  style={{ background: '#FFF5EE', border: '2px solid #FE8C2F', borderRadius: 10, padding: '6px 10px', color: '#FE8C2F', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem' }}
                >
                  练习
                </button>
              </div>
            </div>
          ))}
          <button
            onClick={() => setMode('review')}
            className="btn-cartoon"
            style={{ width: '100%', marginTop: 12, padding: '14px 0', background: 'linear-gradient(135deg,#FE8C2F,#FFD93D)', color: 'white', fontSize: '1.1rem' }}
          >
            🚀 开始全部复习（答对从错题本删除）
          </button>
        </div>
      )}

      {mode === 'review' && current && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ color: '#888', fontSize: '0.9rem' }}>第 {idx + 1}/{words.length} 题 · 本次答对 {score} 个</div>
            <div style={{ background: '#FFF5EE', borderRadius: 20, padding: '4px 14px', fontWeight: 700, color: '#FE8C2F', fontSize: '0.9rem' }}>
              错误 {current.wrongCount} 次
            </div>
          </div>

          <div className="card-cartoon" style={{ padding: 32, textAlign: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: '0.9rem', color: '#999', marginBottom: 8 }}>看中文，拼出这个单词</div>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: '#333', marginBottom: 8 }}>{current.chinese}</div>
            <div style={{ fontSize: '0.8rem', color: '#AAA', marginBottom: 20 }}>
              共 {current.word.length} 个字母
              {' · '}
              <button onClick={() => speak(current.word)} style={{ color: '#4D96FF', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>🔊 听发音</button>
            </div>
            <input
              value={input}
              onChange={e => setInput(e.target.value.replace(/[^a-zA-Z]/g, ''))}
              onKeyDown={e => e.key === 'Enter' && input && check()}
              placeholder="输入单词"
              style={{ width: '100%', maxWidth: 240, padding: '12px 16px', border: '3px solid #FE8C2F', borderRadius: 16, fontSize: '1.3rem', textAlign: 'center', fontWeight: 700, outline: 'none', letterSpacing: 2, marginBottom: 16 }}
              autoFocus
            />

            {showAnswer && (
              <div style={{ background: '#FFF9E6', border: '2px solid #FFD93D', borderRadius: 14, padding: '10px 20px', marginBottom: 16, fontWeight: 700, color: '#FE8C2F' }}>
                答案：{current.word}
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button onClick={() => setShowAnswer(true)} disabled={showAnswer} style={{ padding: '10px 16px', background: '#FFF9E6', border: '2px solid #FFD93D', borderRadius: 14, fontWeight: 700, color: showAnswer ? '#AAA' : '#FE8C2F', cursor: showAnswer ? 'default' : 'pointer' }}>显示答案</button>
              <button onClick={check} disabled={!input} className="btn-cartoon" style={{ padding: '10px 24px', background: input ? 'linear-gradient(135deg,#FE8C2F,#FFD93D)' : '#EEE', color: input ? 'white' : '#AAA', fontSize: '1rem', cursor: input ? 'pointer' : 'default' }}>确认 ✓</button>
              <button onClick={next} style={{ padding: '10px 16px', background: '#F5F5F5', border: '2px solid #DDD', borderRadius: 14, fontWeight: 700, color: '#666', cursor: 'pointer' }}>跳过</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
