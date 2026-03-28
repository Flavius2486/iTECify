import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import LoginPage from './pages/LoginPage'
import EditorPage from './pages/EditorPage'
import Home from './pages/Home'

export default function App() {
  const { user, loading } = useAuth()

  if (loading) return <div style={{ color: '#fff', padding: 20 }}>Se încarcă...</div>

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/" />} />
        <Route path="/" element={user ? <Home /> : <Navigate to="/login" />} />
        <Route path="/room/:roomId" element={user ? <EditorPage /> : <Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  )
}