import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import { saveAuth } from '../services/auth'

export default function LoginPage({ onLogin }) {
  const [tab, setTab] = useState('login')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleLogin() {
    if (!email || !password) return setError('Completează toate câmpurile')
    setLoading(true); setError('')
    try {
      const data = await api.login(email, password)
      saveAuth(data.token, data.user)
      onLogin(data.user)
      navigate('/')
    } catch (e) { setError(e.message || 'Email sau parolă greșită') }
    setLoading(false)
  }

  async function handleRegister() {
    if (!email || !username || !password) return setError('Completează toate câmpurile')
    setLoading(true); setError('')
    try {
      const data = await api.register(email, username, password)
      saveAuth(data.token, data.user)
      onLogin(data.user)
      navigate('/')
    } catch (e) { setError(e.message || 'Eroare la înregistrare') }
    setLoading(false)
  }

  const inputStyle = {
    width: '100%', padding: '12px 16px', borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.07)',
    color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box',
    transition: 'border 0.2s',
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>

      {/* Card */}
      <div style={{ background: 'rgba(8, 15, 35, 0.8)', backdropFilter: 'blur(16px)', border: '1px solid rgba(160,190,255,0.12)', borderRadius: 16, padding: '40px 36px', width: 380, display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ color: '#fff', fontSize: 28, fontWeight: 700, margin: 0 }}>ITECify</h1>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, margin: '6px 0 0' }}>Code. Collaborate. Build with AI.</p>
        </div>

        {/* Tab selector */}
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.07)', borderRadius: 8, padding: 3, gap: 3 }}>
          {['login', 'register'].map(t => (
            <button key={t} onClick={() => { setTab(t); setError('') }}
              style={{ flex: 1, padding: '8px 0', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 500, transition: 'all 0.2s',
                background: tab === t ? '#2563eb' : 'transparent',
                color: tab === t ? '#fff' : 'rgba(255,255,255,0.5)',
              }}>
              {t === 'login' ? 'Login' : 'Înregistrare'}
            </button>
          ))}
        </div>

        {/* Fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} />
          {tab === 'register' && (
            <input placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} style={inputStyle} />
          )}
          <input placeholder="Parolă" type="password" value={password} onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (tab === 'login' ? handleLogin() : handleRegister())}
            style={inputStyle} />
        </div>

        {error && <p style={{ color: '#f87171', fontSize: 13, margin: 0, textAlign: 'center' }}>{error}</p>}

        {/* Submit */}
        <button
          onClick={tab === 'login' ? handleLogin : handleRegister}
          disabled={loading}
          style={{ padding: '13px 0', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 15, fontWeight: 600, background: 'linear-gradient(90deg, #2563eb, #3b82f6)', color: '#fff', opacity: loading ? 0.7 : 1, transition: 'opacity 0.2s' }}
        >
          {loading ? 'Se procesează...' : tab === 'login' ? 'Conectează-te' : 'Creează cont'}
        </button>

        {/* Switch tab link */}
        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 13, margin: 0 }}>
          {tab === 'login' ? (
            <>Nu ai cont încă?{' '}
              <span onClick={() => setTab('register')} style={{ color: '#3b82f6', cursor: 'pointer' }}>Înregistrare</span>
            </>
          ) : (
            <>Ai deja cont?{' '}
              <span onClick={() => setTab('login')} style={{ color: '#3b82f6', cursor: 'pointer' }}>Login</span>
            </>
          )}
        </p>
      </div>
    </div>
  )
}
