// 用Web Audio API生成简单音效，无需音频文件
let audioCtx: AudioContext | null = null

function getCtx() {
  if (!audioCtx) audioCtx = new AudioContext()
  return audioCtx
}

function playTone(freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.3) {
  try {
    const ctx = getCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = freq
    osc.type = type
    gain.gain.setValueAtTime(volume, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
    osc.start()
    osc.stop(ctx.currentTime + duration)
  } catch {}
}

export const sounds = {
  correct() {
    playTone(523, 0.15)
    setTimeout(() => playTone(659, 0.15), 100)
    setTimeout(() => playTone(784, 0.3), 200)
  },
  wrong() {
    playTone(200, 0.3, 'sawtooth', 0.2)
  },
  star() {
    [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => playTone(f, 0.2), i * 80))
  },
  click() {
    playTone(800, 0.05, 'square', 0.1)
  },
  levelUp() {
    [392, 523, 659, 784, 1046].forEach((f, i) => setTimeout(() => playTone(f, 0.25), i * 100))
  }
}
