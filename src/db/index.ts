import Dexie, { type Table } from 'dexie'

export interface Word {
  id?: number
  gradeId: number
  lessonId: number
  english: string
  chinese: string
  phonetic?: string
  syllables?: string[]
  createdAt: number
}

export interface Lesson {
  id?: number
  gradeId: number
  title: string
  content: string
  imageUrl?: string
  createdAt: number
}

export interface QuizRecord {
  id?: number
  gradeId: number
  wordId: number
  word: string
  quizType: 'spell' | 'phonics' | 'fillblank' | 'reading' | 'highfreq'
  correct: boolean
  answeredAt: number
}

export interface WrongWord {
  id?: number
  gradeId: number
  wordId: number
  word: string
  chinese: string
  quizType: string
  wrongCount: number
  lastWrongAt: number
}

export interface UserProgress {
  id?: number
  gradeId: number
  stars: number
  points: number
  level: number
  badges: string[]
  streak: number
  lastStudyDate: string
  unlockedAvatars: string[]
  unlockedSkins: string[]
  currentAvatar: string
  currentSkin: string
}

export interface DailyCheckIn {
  id?: number
  gradeId: number
  date: string
  points: number
}

export interface AppSettings {
  id?: number
  parentPassword: string
  currentGrade: number
  soundEnabled: boolean
}

class EnglishDB extends Dexie {
  words!: Table<Word>
  lessons!: Table<Lesson>
  quizRecords!: Table<QuizRecord>
  wrongWords!: Table<WrongWord>
  userProgress!: Table<UserProgress>
  dailyCheckIns!: Table<DailyCheckIn>
  appSettings!: Table<AppSettings>

  constructor() {
    super('EnglishStarDB')
    this.version(1).stores({
      words: '++id, gradeId, lessonId, english',
      lessons: '++id, gradeId',
      quizRecords: '++id, gradeId, wordId, quizType, answeredAt',
      wrongWords: '++id, gradeId, wordId, [gradeId+word]',
      userProgress: '++id, gradeId',
      dailyCheckIns: '++id, gradeId, date',
      appSettings: '++id'
    })
  }
}

export const db = new EnglishDB()

export async function getSettings(): Promise<AppSettings> {
  const s = await db.appSettings.toArray()
  if (s.length === 0) {
    const id = await db.appSettings.add({
      parentPassword: '1234',
      currentGrade: 1,
      soundEnabled: true
    })
    return (await db.appSettings.get(id))!
  }
  return s[0]
}

export async function getProgress(gradeId: number): Promise<UserProgress> {
  const p = await db.userProgress.where('gradeId').equals(gradeId).first()
  if (!p) {
    const id = await db.userProgress.add({
      gradeId,
      stars: 0,
      points: 0,
      level: 1,
      badges: [],
      streak: 0,
      lastStudyDate: '',
      unlockedAvatars: ['star', 'cat'],
      unlockedSkins: ['default'],
      currentAvatar: 'star',
      currentSkin: 'default'
    })
    return (await db.userProgress.get(id))!
  }
  return p
}

export async function addPoints(gradeId: number, pts: number) {
  const p = await getProgress(gradeId)
  const newPoints = p.points + pts
  const newLevel = Math.floor(newPoints / 100) + 1
  const today = new Date().toISOString().split('T')[0]
  let newStreak = p.streak
  if (p.lastStudyDate !== today) {
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
    newStreak = p.lastStudyDate === yesterday ? p.streak + 1 : 1
  }
  await db.userProgress.update(p.id!, {
    points: newPoints,
    stars: p.stars + Math.floor(pts / 10),
    level: newLevel,
    streak: newStreak,
    lastStudyDate: today
  })
  return { points: newPoints, level: newLevel, streak: newStreak }
}

export async function recordWrong(gradeId: number, wordId: number, word: string, chinese: string, quizType: string) {
  const existing = await db.wrongWords.where('[gradeId+word]').equals([gradeId, word]).first()
  if (existing) {
    await db.wrongWords.update(existing.id!, {
      wrongCount: existing.wrongCount + 1,
      lastWrongAt: Date.now()
    })
  } else {
    await db.wrongWords.add({ gradeId, wordId, word, chinese, quizType, wrongCount: 1, lastWrongAt: Date.now() })
  }
}

export async function getWrongWords(gradeId: number): Promise<WrongWord[]> {
  return db.wrongWords.where('gradeId').equals(gradeId).sortBy('wrongCount')
}
