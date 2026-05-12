import { useEffect, useState } from 'react'

interface Particle { id: number; x: number; color: string; delay: number; size: number }

const COLORS = ['#FF6B6B','#FFD93D','#6BCB77','#4D96FF','#A29BFE','#FE8C2F','#FF8ED4']

let globalTrigger: (() => void) | null = null
export function triggerConfetti() { globalTrigger?.() }

export default function Confetti() {
  const [particles, setParticles] = useState<Particle[]>([])

  useEffect(() => {
    globalTrigger = () => {
      const newParticles = Array.from({ length: 30 }, (_, i) => ({
        id: Date.now() + i,
        x: Math.random() * 100,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        delay: Math.random() * 0.5,
        size: 8 + Math.random() * 10
      }))
      setParticles(newParticles)
      setTimeout(() => setParticles([]), 2500)
    }
    return () => { globalTrigger = null }
  }, [])

  return (
    <>
      {particles.map(p => (
        <div
          key={p.id}
          className="confetti"
          style={{
            left: `${p.x}%`,
            background: p.color,
            animationDelay: `${p.delay}s`,
            width: p.size,
            height: p.size,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px'
          }}
        />
      ))}
    </>
  )
}
