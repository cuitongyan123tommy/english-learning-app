import { useState, useEffect } from 'react'
import { useAppStore } from '../store'
import { db } from '../db'
import SpellGame from '../components/games/SpellGame'
import PhonicsGame from '../components/games/PhonicsGame'
import FillBlankGame from '../components/games/FillBlankGame'
import HighFreqGame from '../components/games/HighFreqGame'
import ReadingGame from '../components/games/ReadingGame'
import { sounds } from '../utils/sound'

type Mode = 'select' | 'spell' | 'phonics' | 'fillblank' | 'highfreq' | 'reading'

const MODES = [
  { id: 'spell' as Mode, emoji: '✏️', label: '拼写练习', sub: '中文→拼英文', color: '#FF6B6B', bg: '#FFF0F0', grades: [1,2,3,4,5,6] },
  { id: 'phonics' as Mode, emoji: '🎵', label: '自然拼读', sub: '音节拆分·跟读', color: '#FE8C2F', bg: '#FFF5EE', grades: [1,2,3,4,5,6] },
  { id: 'highfreq' as Mode, emoji: '⚡', label: '高频小词', sub: 'we/our/with等', color: '#4D96FF', bg: '#EFF6FF', grades: [1,2,3,4,5,6] },
  { id: 'fillblank' as Mode, emoji: '📖', label: '课文填空', sub: '用上传内容练习', color: '#6BCB77', bg: '#F0FFF4', grades: [1,2,3,4,5,6] },
  { id: 'reading' as Mode, emoji: '📚', label: '阅读理解', sub: '短文→回答问题', color: '#A29BFE', bg: '#F5F3FF', grades: [3,4,5,6] },
]

export default function StudyPage() {
  const { currentGrade } = useAppStore()
  const [mode, setMode] = useState<Mode>('select')
  const [wordCount, setWordCount] = useState(0)
  const [lessonCount, setLessonCount] = useState(0)

  useEffect(() => {
    db.words.where('gradeId').equals(currentGrade).count().then(setWordCount)
    db.lessons.where('gradeId').equals(currentGrade).count().then(setLessonCount)
  }, [currentGrade])

  if (mode !== 'select') {
    return (
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '16px 12px' }}>
        <button
          onClick={() => { sounds.click(); setMode('select') }}
          style={{ marginBottom: 16, background: '#F5F5F5', border: '2px solid #DDD', borderRadius: 14, padding: '8px 16px', cursor: 'pointer', fontWeight: 700, color: '#666', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          ← 返回选择
        </button>
        {mode === 'spell' && <SpellGame />}
        {mode === 'phonics' && <PhonicsGame />}
        {mode === 'highfreq' && <HighFreqGame />}
        {mode === 'fillblank' && <FillBlankGame />}
        {mode === 'reading' && <ReadingGame />}
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '16px 12px' }}>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>📚</div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#333', marginBottom: 4 }}>选择练习方式</h1>
        <div style={{ color: '#888', fontSize: '0.9rem' }}>
          题库：{wordCount} 个单词 · {lessonCount} 篇课文
          {wordCount === 0 && <span style={{ color: '#FF6B6B', fontWeight: 700 }}> （请家长先上传课文）</span>}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
        {MODES.filter(m => m.grades.includes(currentGrade)).map(m => (
          <button
            key={m.id}
            onClick={() => { sounds.click(); setMode(m.id) }}
            className="card-cartoon btn-cartoon"
            style={{ padding: '20px 16px', background: m.bg, border: `3px solid ${m.color}33`, textAlign: 'center', cursor: 'pointer' }}
          >
            <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>{m.emoji}</div>
            <div style={{ fontWeight: 900, fontSize: '1.1rem', color: m.color, marginBottom: 4 }}>{m.label}</div>
            <div style={{ fontSize: '0.8rem', color: '#888' }}>{m.sub}</div>
          </button>
        ))}
      </div>

      {wordCount === 0 && lessonCount === 0 && (
        <div style={{ marginTop: 20, background: '#FFF9E6', border: '2px solid #FFD93D', borderRadius: 20, padding: '16px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>💡</div>
          <div style={{ fontWeight: 700, color: '#666' }}>还没有题库哦！</div>
          <div style={{ color: '#888', fontSize: '0.9rem', marginTop: 4 }}>请家长点击顶部菜单「家长」，上传孩子学校的英语课文</div>
        </div>
      )}
    </div>
  )
}
