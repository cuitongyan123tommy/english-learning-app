import { useState, useEffect } from 'react'
import { useAppStore } from '../store'
import { getProgress, type UserProgress, db } from '../db'
import { sounds } from '../utils/sound'

const AVATARS = [
  { id: 'star', emoji: '⭐', label: '小星星', unlockPts: 0 },
  { id: 'cat', emoji: '🐱', label: '喵喵猫', unlockPts: 0 },
  { id: 'rabbit', emoji: '🐰', label: '小兔子', unlockPts: 50 },
  { id: 'bear', emoji: '🐻', label: '小熊熊', unlockPts: 100 },
  { id: 'fox', emoji: '🦊', label: '狐狸侠', unlockPts: 200 },
  { id: 'dragon', emoji: '🐲', label: '英语龙', unlockPts: 500 },
  { id: 'rocket', emoji: '🚀', label: '火箭侠', unlockPts: 800 },
  { id: 'crown', emoji: '👑', label: '英语王', unlockPts: 1000 },
]

const SKINS = [
  { id: 'default', label: '默认蓝天', emoji: '☁️', unlockPts: 0, bg: 'linear-gradient(135deg,#4D96FF,#A29BFE)' },
  { id: 'sunset', label: '橙色日落', emoji: '🌅', unlockPts: 100, bg: 'linear-gradient(135deg,#FF6B6B,#FE8C2F)' },
  { id: 'forest', label: '绿色森林', emoji: '🌳', unlockPts: 200, bg: 'linear-gradient(135deg,#6BCB77,#4D96FF)' },
  { id: 'candy', label: '糖果粉', emoji: '🍬', unlockPts: 300, bg: 'linear-gradient(135deg,#FF8ED4,#A29BFE)' },
  { id: 'gold', label: '黄金王者', emoji: '✨', unlockPts: 600, bg: 'linear-gradient(135deg,#FFD93D,#FE8C2F)' },
]

const BADGES = [
  { id: 'first', emoji: '🎖️', label: '初学者', desc: '完成第一题' },
  { id: 'streak3', emoji: '🔥', label: '连续3天', desc: '连续打卡3天' },
  { id: 'streak7', emoji: '💫', label: '连续7天', desc: '连续打卡7天' },
  { id: 'words50', emoji: '📚', label: '词汇达人', desc: '学了50个单词' },
  { id: 'perfect', emoji: '🏆', label: '全对达人', desc: '连续答对10题' },
  { id: 'speed', emoji: '⚡', label: '速度之星', desc: '1分钟答对5题' },
  { id: 'upload5', emoji: '📷', label: '上传高手', desc: '上传5份课文' },
  { id: 'level5', emoji: '🚀', label: '升至5级', desc: '升到第5等级' },
]

export default function RewardsPage() {
  const { currentGrade } = useAppStore()
  const [progress, setProgress] = useState<UserProgress | null>(null)
  const [tab, setTab] = useState<'badges' | 'avatars' | 'skins'>('badges')

  useEffect(() => {
    getProgress(currentGrade).then(setProgress)
  }, [currentGrade])

  async function setAvatar(id: string) {
    if (!progress) return
    const avatar = AVATARS.find(a => a.id === id)
    if (!avatar || progress.points < avatar.unlockPts) return
    await db.userProgress.update(progress.id!, {
      currentAvatar: id,
      unlockedAvatars: [...new Set([...progress.unlockedAvatars, id])]
    })
    sounds.star()
    setProgress(p => p ? { ...p, currentAvatar: id } : p)
  }

  async function setSkin(id: string) {
    if (!progress) return
    const skin = SKINS.find(s => s.id === id)
    if (!skin || progress.points < skin.unlockPts) return
    await db.userProgress.update(progress.id!, {
      currentSkin: id,
      unlockedSkins: [...new Set([...progress.unlockedSkins, id])]
    })
    sounds.star()
    setProgress(p => p ? { ...p, currentSkin: id } : p)
  }

  if (!progress) return null

  const currentAv = AVATARS.find(a => a.id === progress.currentAvatar) || AVATARS[0]
  const pts = progress.points

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '16px 12px' }}>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: '4rem', marginBottom: 8 }}>{currentAv.emoji}</div>
        <div style={{ fontWeight: 900, fontSize: '1.3rem', color: '#333' }}>{currentAv.label}</div>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 12 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#FF6B6B' }}>{pts}</div>
            <div style={{ fontSize: '0.8rem', color: '#888' }}>总积分</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#FE8C2F' }}>Lv.{progress.level}</div>
            <div style={{ fontSize: '0.8rem', color: '#888' }}>等级</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#6BCB77' }}>{progress.streak}</div>
            <div style={{ fontSize: '0.8rem', color: '#888' }}>连续天</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#A29BFE' }}>{progress.stars}</div>
            <div style={{ fontSize: '0.8rem', color: '#888' }}>星星</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {([['badges','🎖️ 勋章'],['avatars','🐱 头像'],['skins','🎨 皮肤']] as ['badges'|'avatars'|'skins', string][]).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: '10px 0', background: tab === t ? '#A29BFE' : '#F5F3FF', color: tab === t ? 'white' : '#A29BFE', border: '2px solid #A29BFE', borderRadius: 14, fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem' }}>{label}</button>
        ))}
      </div>

      {tab === 'badges' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          {BADGES.map(b => {
            const owned = progress.badges.includes(b.id)
            return (
              <div key={b.id} className="card-cartoon" style={{ padding: 16, opacity: owned ? 1 : 0.45, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: owned ? 'linear-gradient(135deg,#FFD93D,#FE8C2F)' : '#EEE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', flexShrink: 0, boxShadow: owned ? '0 4px 12px rgba(255,217,61,0.4)' : 'none' }}>
                  {b.emoji}
                </div>
                <div>
                  <div style={{ fontWeight: 700 }}>{b.label}</div>
                  <div style={{ fontSize: '0.8rem', color: '#888' }}>{b.desc}</div>
                  {owned && <div style={{ fontSize: '0.75rem', color: '#6BCB77', fontWeight: 700 }}>✓ 已获得</div>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {tab === 'avatars' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {AVATARS.map(av => {
            const unlocked = pts >= av.unlockPts
            const selected = progress.currentAvatar === av.id
            return (
              <button
                key={av.id}
                onClick={() => setAvatar(av.id)}
                disabled={!unlocked}
                style={{ padding: 16, borderRadius: 20, background: selected ? 'linear-gradient(135deg,#A29BFE,#FF6B6B)' : unlocked ? 'white' : '#F5F5F5', border: `3px solid ${selected ? '#A29BFE' : unlocked ? '#E0D5FF' : '#DDD'}`, cursor: unlocked ? 'pointer' : 'default', opacity: unlocked ? 1 : 0.5, textAlign: 'center', transition: 'all 0.2s' }}
              >
                <div style={{ fontSize: '2.5rem', marginBottom: 4 }}>{av.emoji}</div>
                <div style={{ fontWeight: 700, fontSize: '0.8rem', color: selected ? 'white' : '#333' }}>{av.label}</div>
                {!unlocked && <div style={{ fontSize: '0.7rem', color: '#AAA', marginTop: 2 }}>{av.unlockPts}分解锁</div>}
                {selected && <div style={{ fontSize: '0.7rem', color: 'white', marginTop: 2 }}>✓ 使用中</div>}
              </button>
            )
          })}
        </div>
      )}

      {tab === 'skins' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          {SKINS.map(sk => {
            const unlocked = pts >= sk.unlockPts
            const selected = progress.currentSkin === sk.id
            return (
              <button
                key={sk.id}
                onClick={() => setSkin(sk.id)}
                disabled={!unlocked}
                style={{ padding: 20, borderRadius: 20, background: unlocked ? sk.bg : '#F5F5F5', border: `3px solid ${selected ? 'white' : 'transparent'}`, cursor: unlocked ? 'pointer' : 'default', opacity: unlocked ? 1 : 0.5, textAlign: 'center', boxShadow: selected ? '0 0 0 3px #A29BFE' : 'none' }}
              >
                <div style={{ fontSize: '2rem', marginBottom: 4 }}>{sk.emoji}</div>
                <div style={{ fontWeight: 700, color: unlocked ? 'white' : '#AAA' }}>{sk.label}</div>
                {!unlocked && <div style={{ fontSize: '0.8rem', color: '#AAA', marginTop: 4 }}>{sk.unlockPts}分解锁</div>}
                {selected && <div style={{ fontSize: '0.8rem', color: 'white', marginTop: 4 }}>✓ 使用中</div>}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
