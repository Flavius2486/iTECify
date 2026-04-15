import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import LoginPage from './pages/LoginPage'
import EditorPage from './pages/EditorPage'
import Home from './pages/Home'
import ParticlesBackground from './components/ParticlesBackground'

export default function App() {
  const { user, loading, setUser } = useAuth()

  if (loading) return <div style={{ color: '#fff', padding: 20 }}>Se încarcă...</div>

  return (
    <BrowserRouter>
      <div style={{ position: 'relative', minHeight: '100vh', background: 'linear-gradient(135deg, #04050f 0%, #080b1e 50%, #060412 100%)' }}>
        <ParticlesBackground />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <Routes>
            <Route path="/login" element={!user ? <LoginPage onLogin={setUser} /> : <Navigate to="/" />} />
            <Route path="/" element={user ? <Home onLogout={() => setUser(null)} /> : <Navigate to="/login" />} />
            <Route path="/room/:roomId" element={user ? <EditorPage onLogout={() => setUser(null)} /> : <Navigate to="/login" />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  )
}
