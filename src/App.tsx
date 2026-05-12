import { useState } from 'react'
import { useAppStore } from './store'
import HomePage from './pages/HomePage'
import StudyPage from './pages/StudyPage'
import ParentPage from './pages/ParentPage'
import RewardsPage from './pages/RewardsPage'
import WrongBookPage from './pages/WrongBookPage'
import NavBar from './components/layout/NavBar'
import GradeSelector from './components/layout/GradeSelector'
import Confetti from './components/ui/Confetti'

export type Page = 'home' | 'study' | 'parent' | 'rewards' | 'wrong'

function App() {
  const [page, setPage] = useState<Page>('home')
  const { currentGrade } = useAppStore()

  return (
    <div style={{ background: '#FFF9F0', minHeight: '100vh' }}>
      <Confetti />
      <NavBar page={page} setPage={setPage} />
      <GradeSelector />
      <main className="slide-in" key={`${page}-${currentGrade}`}>
        {page === 'home' && <HomePage setPage={setPage} />}
        {page === 'study' && <StudyPage />}
        {page === 'parent' && <ParentPage />}
        {page === 'rewards' && <RewardsPage />}
        {page === 'wrong' && <WrongBookPage />}
      </main>
    </div>
  )
}

export default App
