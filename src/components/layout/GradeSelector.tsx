import { useAppStore } from '../../store'
import { sounds } from '../../utils/sound'

const GRADES = [
  { id: 1, label: '一年级', emoji: '🌱', color: '#FF6B6B', bg: '#FFF0F0' },
  { id: 2, label: '二年级', emoji: '🌸', color: '#FE8C2F', bg: '#FFF5EE' },
  { id: 3, label: '三年级', emoji: '🌟', color: '#FFD93D', bg: '#FFFDE7' },
  { id: 4, label: '四年级', emoji: '🍀', color: '#6BCB77', bg: '#F0FFF4' },
  { id: 5, label: '五年级', emoji: '🚀', color: '#4D96FF', bg: '#EFF6FF' },
  { id: 6, label: '六年级', emoji: '👑', color: '#A29BFE', bg: '#F5F3FF' },
]

export default function GradeSelector() {
  const { currentGrade, setGrade } = useAppStore()

  return (
    <div style={{ background: 'white', borderBottom: '3px solid #F0E8D0', padding: '8px 12px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
        {GRADES.map(g => {
          const active = currentGrade === g.id
          return (
            <button
              key={g.id}
              onClick={() => { sounds.click(); setGrade(g.id) }}
              style={{
                background: active ? g.color : g.bg,
                color: active ? 'white' : g.color,
                border: `2.5px solid ${g.color}`,
                borderRadius: 14,
                padding: '5px 14px',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                boxShadow: active ? `0 4px 0 ${g.color}88` : 'none',
                transition: 'all 0.15s',
                flexShrink: 0
              }}
            >
              <span>{g.emoji}</span>
              <span>{g.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
