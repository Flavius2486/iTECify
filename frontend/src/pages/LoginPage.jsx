import { useState, useEffect } from 'react'
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

  useEffect(() => {
    // Wait for particles.js to load
    const timer = setTimeout(() => {
      if (window.particlesJS) {
        try {
          window.particlesJS('particles-js', {
            particles: {
              number: {
                value: 100,
                density: {
                  enable: true,
                  value_area: 800,
                },
              },
              color: {
                value: '#60a5fa',
              },
              shape: {
                type: 'circle',
                stroke: {
                  width: 0,
                  color: '#000000',
                },
              },
              opacity: {
                value: 0.6,
                random: false,
                anim: {
                  enable: false,
                  speed: 1,
                  opacity_min: 0.1,
                  sync: false,
                },
              },
              size: {
                value: 4,
                random: true,
                anim: {
                  enable: false,
                  speed: 40,
                  size_min: 0.1,
                  sync: false,
                },
              },
              line_linked: {
                enable: true,
                distance: 120,
                color: '#60a5fa',
                opacity: 0.4,
                width: 1.5,
              },
              move: {
                enable: true,
                speed: 3,
                direction: 'none',
                random: false,
                straight: false,
                out_mode: 'bounce',
                attract: {
                  enable: false,
                  rotateX: 600,
                  rotateY: 1200,
                },
              },
            },
            interactivity: {
              detect_on: 'canvas',
              events: {
                onhover: {
                  enable: true,
                  mode: 'repulse',
                },
                onclick: {
                  enable: true,
                  mode: 'push',
                },
                resize: true,
              },
              modes: {
                grab: {
                  distance: 400,
                  line_linked: {
                    opacity: 1,
                  },
                },
                bubble: {
                  distance: 400,
                  size: 40,
                  duration: 2,
                  opacity: 8,
                  speed: 3,
                },
                repulse: {
                  distance: 150,
                  duration: 0.4,
                },
                push: {
                  particles_nb: 4,
                },
                remove: {
                  particles_nb: 2,
                },
              },
            },
            retina_detect: true,
          })
          console.log('Particles initialized successfully')
        } catch (error) {
          console.error('Error initializing particles:', error)
        }
      } else {
        console.warn('particlesJS not loaded')
      }
    }, 100)

    return () => clearTimeout(timer)
  }, [])

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
    <div style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden', background: '#1e1e1e' }}>
      {/* Particles Background */}
      <div id="particles-js" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}></div>

      {/* Form Container */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, zIndex: 10 }}>
        <h2 style={{ color: '#fff', marginBottom: 8, letterSpacing: '0.3em', fontFamily: "'JMH Robotus', Arial, sans-serif", fontSize: 40, fontWeight: 600, margin: 0 }}>ITECify</h2>

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
    </div>
  )
}
