import { useAppStore } from '../../store'
import { sounds } from '../../utils/sound'
import type { Page } from '../../App'

const GRADE_COLORS = ['#FF6B6B','#FE8C2F','#FFD93D','#6BCB77','#4D96FF','#A29BFE']

interface Props {
  page: Page
  setPage: (p: Page) => void
}

export default function NavBar({ page, setPage }: Props) {
  const { currentGrade, soundEnabled, toggleSound } = useAppStore()
  const color = GRADE_COLORS[currentGrade - 1]

  function go(p: Page) {
    sounds.click()
    setPage(p)
  }

  const navItems: { id: Page; label: string; emoji: string }[] = [
    { id: 'home', label: '主页', emoji: '🏠' },
    { id: 'study', label: '练习', emoji: '📚' },
    { id: 'wrong', label: '错题', emoji: '📝' },
    { id: 'rewards', label: '奖励', emoji: '🏆' },
    { id: 'parent', label: '家长', emoji: '👨‍👩‍👧' },
  ]

  return (
    <header style={{ background: color, position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '1.8rem' }} className="bounce">⭐</span>
          <span style={{ fontWeight: 900, fontSize: '1.2rem', color: 'white', textShadow: '2px 2px 0 rgba(0,0,0,0.2)', letterSpacing: 1 }}>英语小星星</span>
        </div>
        <nav style={{ display: 'flex', gap: 4 }}>
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => go(item.id)}
              style={{
                background: page === item.id ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.15)',
                border: '2px solid rgba(255,255,255,0.4)',
                borderRadius: 16,
                color: 'white',
                fontWeight: 700,
                fontSize: '0.75rem',
                padding: '6px 10px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                minWidth: 52,
                transition: 'background 0.2s'
              }}
            >
              <span style={{ fontSize: '1.2rem' }}>{item.emoji}</span>
              <span>{item.label}</span>
            </button>
          ))}
          <button
            onClick={toggleSound}
            style={{ background: 'rgba(255,255,255,0.15)', border: '2px solid rgba(255,255,255,0.4)', borderRadius: 16, color: 'white', fontSize: '1.4rem', padding: '6px 10px', cursor: 'pointer' }}
            title={soundEnabled ? '关闭音效' : '开启音效'}
          >
            {soundEnabled ? '🔊' : '🔇'}
          </button>
        </nav>
      </div>
    </header>
  )
}
