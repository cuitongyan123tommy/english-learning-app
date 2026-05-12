import { useEffect, useState } from 'react'
import { useAppStore } from '../store'
import { getProgress, type UserProgress } from '../db'
import { sounds } from '../utils/sound'
import type { Page } from '../App'

const GRADE_INFO = [
  { id: 1, emoji: '🌱', color: '#FF6B6B', bg: 'linear-gradient(135deg,#FF6B6B,#FE8C2F)', desc: '零基础启蒙', tip: '认识字母，学会简单单词' },
  { id: 2, emoji: '🌸', color: '#FE8C2F', bg: 'linear-gradient(135deg,#FE8C2F,#FFD93D)', desc: '拼读起步', tip: '学会拼读，掌握高频小词' },
  { id: 3, emoji: '🌟', color: '#FFD93D', bg: 'linear-gradient(135deg,#FFD93D,#6BCB77)', desc: '词汇积累', tip: '扩展词汇，学会简单句子' },
  { id: 4, emoji: '🍀', color: '#6BCB77', bg: 'linear-gradient(135deg,#6BCB77,#4D96FF)', desc: '语法入门', tip: '掌握基础语法，读懂短文' },
  { id: 5, emoji: '🚀', color: '#4D96FF', bg: 'linear-gradient(135deg,#4D96FF,#A29BFE)', desc: '阅读提升', tip: '阅读理解，写作练习' },
  { id: 6, emoji: '👑', color: '#A29BFE', bg: 'linear-gradient(135deg,#A29BFE,#FF6B6B)', desc: '综合拔高', tip: '综合运用，备战考试' },
]

const BADGES = [
  { id: 'first', emoji: '🎖️', label: '初学者' },
  { id: 'streak3', emoji: '🔥', label: '连续3天' },
  { id: 'streak7', emoji: '💫', label: '连续7天' },
  { id: 'words50', emoji: '📚', label: '学了50词' },
  { id: 'perfect', emoji: '🏆', label: '全对达人' },
  { id: 'speed', emoji: '⚡', label: '速度之星' },
]

interface Props { setPage: (p: Page) => void }

export default function HomePage({ setPage }: Props) {
  const { currentGrade } = useAppStore()
  const [progress, setProgress] = useState<UserProgress | null>(null)
  const info = GRADE_INFO[currentGrade - 1]

  useEffect(() => {
    getProgress(currentGrade).then(setProgress)
  }, [currentGrade])

  const level = progress?.level ?? 1
  const points = progress?.points ?? 0
  const nextLevel = level * 100
  const pct = Math.min((points % 100) / 100 * 100, 100)
  const streak = progress?.streak ?? 0

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '16px 12px' }}>

      {/* 欢迎横幅 */}
      <div style={{ background: info.bg, borderRadius: 28, padding: '24px 20px', marginBottom: 20, color: 'white', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: -10, top: -10, fontSize: '7rem', opacity: 0.15, transform: 'rotate(15deg)' }}>{info.emoji}</div>
        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: '0.9rem', opacity: 0.9, marginBottom: 4 }}>小朋友，今天也来学习吧！🌈</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, textShadow: '2px 2px 0 rgba(0,0,0,0.2)', marginBottom: 8 }}>
            {info.emoji} {currentGrade}年级 · {info.desc}
          </div>
          <div style={{ fontSize: '0.95rem', opacity: 0.9, marginBottom: 16 }}>{info.tip}</div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ background: 'rgba(255,255,255,0.25)', borderRadius: 16, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '1.4rem' }}>🏅</span>
              <div>
                <div style={{ fontSize: '0.75rem', opacity: 0.85 }}>等级</div>
                <div style={{ fontWeight: 900, fontSize: '1.1rem' }}>Lv.{level}</div>
              </div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.25)', borderRadius: 16, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '1.4rem' }}>⭐</span>
              <div>
                <div style={{ fontSize: '0.75rem', opacity: 0.85 }}>积分</div>
                <div style={{ fontWeight: 900, fontSize: '1.1rem' }}>{points}</div>
              </div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.25)', borderRadius: 16, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '1.4rem' }}>🔥</span>
              <div>
                <div style={{ fontSize: '0.75rem', opacity: 0.85 }}>连续打卡</div>
                <div style={{ fontWeight: 900, fontSize: '1.1rem' }}>{streak}天</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 经验进度条 */}
      <div className="card-cartoon" style={{ padding: 16, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontWeight: 700 }}>
          <span>🌟 升级进度</span>
          <span style={{ color: '#A29BFE' }}>{points % 100}/{100} → Lv.{level + 1}</span>
        </div>
        <div className="progress-bar" style={{ height: 18, borderRadius: 999, background: '#F0E8FF', border: '2px solid rgba(162,155,254,0.3)', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,#A29BFE,#FF6B6B)', borderRadius: 999, transition: 'width 0.5s ease' }} />
        </div>
        <div style={{ marginTop: 6, fontSize: '0.8rem', color: '#888' }}>再得 {nextLevel - points} 积分升级！</div>
      </div>

      {/* 功能入口 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { emoji: '📖', label: '开始练习', sub: '题目练习·闯关', color: '#FF6B6B', bg: '#FFF0F0', page: 'study' as Page },
          { emoji: '📷', label: '上传课文', sub: '拍照·OCR识别', color: '#4D96FF', bg: '#EFF6FF', page: 'parent' as Page },
          { emoji: '📝', label: '错题本', sub: '专攻薄弱点', color: '#FE8C2F', bg: '#FFF5EE', page: 'wrong' as Page },
          { emoji: '🏆', label: '我的奖励', sub: '勋章·皮肤', color: '#A29BFE', bg: '#F5F3FF', page: 'rewards' as Page },
        ].map(item => (
          <button
            key={item.page}
            onClick={() => { sounds.click(); setPage(item.page) }}
            className="card-cartoon btn-cartoon"
            style={{ padding: '20px 16px', background: item.bg, cursor: 'pointer', textAlign: 'center', border: `3px solid ${item.color}22`, transition: 'transform 0.15s, box-shadow 0.15s' }}
          >
            <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>{item.emoji}</div>
            <div style={{ fontWeight: 900, fontSize: '1.1rem', color: item.color, marginBottom: 4 }}>{item.label}</div>
            <div style={{ fontSize: '0.8rem', color: '#888' }}>{item.sub}</div>
          </button>
        ))}
      </div>

      {/* 勋章展示 */}
      <div className="card-cartoon" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ fontWeight: 900, fontSize: '1.1rem', marginBottom: 12 }}>🎖️ 勋章墙</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {BADGES.map(b => {
            const owned = progress?.badges.includes(b.id)
            return (
              <div key={b.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, opacity: owned ? 1 : 0.3, filter: owned ? 'none' : 'grayscale(1)' }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: owned ? 'linear-gradient(135deg,#FFD93D,#FE8C2F)' : '#EEE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', boxShadow: owned ? '0 4px 12px rgba(255,217,61,0.5)' : 'none' }}>{b.emoji}</div>
                <span style={{ fontSize: '0.7rem', color: '#666', fontWeight: 700 }}>{b.label}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* 今日提示 */}
      <div style={{ background: 'linear-gradient(135deg,#FFD93D,#FE8C2F)', borderRadius: 20, padding: '16px 20px', color: 'white' }}>
        <div style={{ fontWeight: 900, marginBottom: 6 }}>💡 今日学习提示</div>
        <div style={{ fontSize: '0.9rem', opacity: 0.95 }}>
          {currentGrade <= 2
            ? '一二年级重点：先学高频小词，比如 we、our、in、on，每天认识5个新词就超棒！'
            : currentGrade <= 4
            ? '三四年级重点：多练习自然拼读，看到单词就能读出来，单词记得更牢！'
            : '五六年级重点：多读英语短文，看懂整段意思，准备迎接更大挑战！'}
        </div>
      </div>
    </div>
  )
}
