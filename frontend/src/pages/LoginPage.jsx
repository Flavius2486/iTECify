import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import { saveAuth } from '../services/auth'

export default function LoginPage({ onLogin }) {
  const [tab, setTab] = useState('login') // 'login' | 'register'
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleLogin() {
    if (!email || !password) return setError('Completează toate câmpurile')
    setLoading(true)
    setError('')
    try {
      const data = await api.login(email, password)
      saveAuth(data.token, data.user)
      onLogin(data.user)
      navigate('/')
    } catch (e) {
      setError(e.message || 'Email sau parolă greșită')
    }
    setLoading(false)
  }

  async function handleRegister() {
    if (!email || !username || !password) return setError('Completează toate câmpurile')
    setLoading(true)
    setError('')
    try {
      const data = await api.register(email, username, password)
      saveAuth(data.token, data.user)
      onLogin(data.user)
      navigate('/')
    } catch (e) {
      setError(e.message || 'Eroare la înregistrare')
    }
    setLoading(false)
  }

  const inputStyle = {
    padding: '8px 12px', borderRadius: 4, border: '1px solid #444',
    background: '#2d2d2d', color: '#fff', width: 260, fontSize: 13,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#1e1e1e', gap: 12 }}>
      <h2 style={{ color: '#fff', marginBottom: 8 }}>ITECify</h2>

      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <button onClick={() => setTab('login')} style={{ background: tab === 'login' ? '#007acc' : '#3c3c3c', color: '#fff', border: 'none', padding: '6px 20px', borderRadius: 4, cursor: 'pointer' }}>
          Login
        </button>
        <button onClick={() => setTab('register')} style={{ background: tab === 'register' ? '#007acc' : '#3c3c3c', color: '#fff', border: 'none', padding: '6px 20px', borderRadius: 4, cursor: 'pointer' }}>
          Înregistrare
        </button>
      </div>

      {error && <p style={{ color: '#f48771', margin: 0, fontSize: 13 }}>{error}</p>}

      <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} />
      {tab === 'register' && (
        <input placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} style={inputStyle} />
      )}
      <input placeholder="Parolă" type="password" value={password} onChange={e => setPassword(e.target.value)} style={inputStyle}
        onKeyDown={e => e.key === 'Enter' && (tab === 'login' ? handleLogin() : handleRegister())}
      />

      <button
        onClick={tab === 'login' ? handleLogin : handleRegister}
        disabled={loading}
        style={{ background: '#007acc', color: '#fff', border: 'none', padding: '8px 0', borderRadius: 4, width: 260, cursor: 'pointer', opacity: loading ? 0.7 : 1 }}
      >
        {loading ? 'Se procesează...' : tab === 'login' ? 'Login' : 'Înregistrare'}
      </button>
    </div>
  )
}
