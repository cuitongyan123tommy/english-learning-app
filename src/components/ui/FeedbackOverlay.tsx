import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Props {
  show: boolean
  correct: boolean
  message?: string
  onDone: () => void
}

const CORRECT_MSGS = ['太棒了！🎉','好厉害！⭐','真聪明！🌟','完美！🏆','加油！继续！🚀']
const WRONG_MSGS = ['再想想～😊','没关系，试试看！💪','快到了！加油！🌈','不要灰心！✨']

export default function FeedbackOverlay({ show, correct, message, onDone }: Props) {
  useEffect(() => {
    if (show) {
      const t = setTimeout(onDone, 1200)
      return () => clearTimeout(t)
    }
  }, [show, onDone])

  const msgs = correct ? CORRECT_MSGS : WRONG_MSGS
  const text = message || msgs[Math.floor(Math.random() * msgs.length)]

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          style={{
            position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 500, pointerEvents: 'none'
          }}
        >
          <div style={{
            background: correct ? 'linear-gradient(135deg,#55EFC4,#00B894)' : 'linear-gradient(135deg,#FD9644,#E17055)',
            color: 'white', borderRadius: 32, padding: '24px 40px',
            textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            border: '4px solid rgba(255,255,255,0.4)'
          }}>
            <div style={{ fontSize: '3.5rem', marginBottom: 8 }}>{correct ? '🎉' : '💪'}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 900 }}>{text}</div>
            {correct && <div style={{ fontSize: '1rem', marginTop: 8, opacity: 0.9 }}>+10 积分</div>}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
