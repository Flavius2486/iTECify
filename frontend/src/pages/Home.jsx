import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import { logout, getUser } from '../services/auth'

export default function Home() {
  const [joinCode, setJoinCode] = useState('')
  const [roomName, setRoomName] = useState('')
  const [rooms, setRooms] = useState([])
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const user = getUser()

  useEffect(() => {
    loadRooms()
    
    // Initialize particles.js
    const initParticles = () => {
      if (window.particlesJS) {
        window.particlesJS('particles-js', {
          particles: {
            number: {
              value: 120,
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
                distance: 150,
                line_linked: {
                  opacity: 1,
                },
              },
              bubble: {
                distance: 150,
                size: 40,
                duration: 2,
                opacity: 8,
                speed: 3,
              },
              repulse: {
                distance: 80,
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
        });
      } else {
        setTimeout(initParticles, 500);
      }
    };

    if (window.particlesJS) {
      initParticles();
    } else {
      setTimeout(initParticles, 500);
    }
  }, [])

  async function loadRooms() {
    try {
      const data = await api.getRooms()
      setRooms(data)
    } catch (e) {
      setError(e.message)
    }
  }

  async function handleCreate() {
    if (!roomName.trim()) return
    try {
      const room = await api.createRoom(roomName.trim())
      setRoomName('')
      setRooms(prev => [room, ...prev])
      navigate(`/room/${room.id}`)
    } catch (e) {
      setError(e.message)
    }
  }

  async function handleJoin() {
    if (!joinCode.trim()) return
    try {
      const room = await api.joinRoom(joinCode.trim())
      setJoinCode('')
      navigate(`/room/${room.id}`)
    } catch (e) {
      setError(e.message)
    }
  }

  function handleLogout() {
    logout()
    navigate('/')
  }

  const [hoveredBtn, setHoveredBtn] = useState(null)
  const [activeBtn, setActiveBtn] = useState(null)

  const inputStyle = {
    padding: '8px 12px', borderRadius: 4, border: '1px solid #444',
    background: '#2d2d2d', color: '#fff', fontSize: 13, width: '100%', boxSizing: 'border-box',
  }
  const btnStyle = (color = '#007acc', btnId) => ({
    background: color, 
    color: '#fff', 
    border: 'none', 
    padding: '8px 0',
    borderRadius: 4, 
    cursor: 'pointer', 
    width: '100%', 
    fontSize: 13,
    opacity: activeBtn === btnId ? 0.6 : hoveredBtn === btnId ? 0.85 : 1,
    transform: activeBtn === btnId ? 'scale(0.98)' : 'scale(1)',
    transition: 'all 0.15s ease',
  })

  return (
    <div style={{ position: 'relative', width: '100%', minHeight: '100vh', overflow: 'hidden', background: 'radial-gradient(circle at top left, rgba(37, 99, 235, 0.12), transparent 30%), radial-gradient(circle at bottom right, rgba(139, 92, 246, 0.12), transparent 28%), linear-gradient(135deg, #0a1f3d 0%, #1e3a5f 45%, #1a2d4a 100%)' }}>
      {/* Particles Background */}
      <div id="particles-js" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1 }}></div>

      {/* Content Container */}
      <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: 16, padding: '24px' }}>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <div style={{ width: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <h1 style={{ color: '#fff', fontSize: 28, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>ITECify <span style={{ color: '#4CAF50' }}>IDE</span></h1>
          </div>
          <div style={{ width: 280, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
            <span style={{ color: '#888', fontSize: 12 }}>@{user?.username}</span>
            <button 
              onClick={handleLogout}
              onMouseEnter={() => setHoveredBtn('logout')}
              onMouseLeave={() => setHoveredBtn(null)}
              onMouseDown={() => setActiveBtn('logout')}
              onMouseUp={() => setActiveBtn(null)}
              style={{ background: '#3c3c3c', color: '#ccc', border: 'none', padding: '4px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 11, opacity: activeBtn === 'logout' ? 0.6 : hoveredBtn === 'logout' ? 0.85 : 1, transform: activeBtn === 'logout' ? 'scale(0.95)' : 'scale(1)', transition: 'all 0.15s ease' }}
            >
              Logout
            </button>
          </div>
        </div>

        {error && <p style={{ color: '#f48771', margin: 0, fontSize: 13 }}>{error}</p>}

        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>

          {/* Room-urile mele */}
          <div style={{ background: 'rgba(37, 37, 38, 0.3)', padding: 24, borderRadius: 12, width: 280, border: '1px solid rgba(255, 255, 255, 0.06)', backdropFilter: 'blur(10px)' }}>
            <p style={{ color: '#ccc', fontSize: 14, marginBottom: 12, fontWeight: 500, margin: '0 0 12px' }}>Room-urile mele</p>
            {rooms.length === 0 && <p style={{ color: '#666', fontSize: 13 }}>Nu ai roomuri încă</p>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: '400px', overflowY: 'auto', paddingRight: '8px' }}>
              {rooms.map(r => (
                <div
                  key={r.id}
                  onClick={() => navigate(`/room/${r.id}`)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', borderRadius: 4, cursor: 'pointer', background: 'rgba(45, 45, 45, 0.5)', border: '1px solid rgba(255, 255, 255, 0.05)', transition: 'all 0.2s' }}
                >
                  <div>
                    <p style={{ color: '#fff', fontSize: 13, margin: 0 }}>{r.name}</p>
                    <p style={{ color: '#888', fontSize: 11, margin: 0, fontFamily: 'monospace' }}>{r.join_code}</p>
                  </div>
                  <span style={{ color: '#4CAF50', fontSize: 12 }}>→</span>
                </div>
              ))}
            </div>
          </div>

          {/* Acțiuni */}
          <div style={{ background: 'rgba(37, 37, 38, 0.3)', padding: 24, borderRadius: 12, width: 280, display: 'flex', flexDirection: 'column', gap: 12, border: '1px solid rgba(255, 255, 255, 0.06)', backdropFilter: 'blur(10px)' }}>
            <p style={{ color: '#ccc', fontSize: 14, fontWeight: 500, margin: '0 0 4px' }}>Creează room nou</p>
            <input placeholder="Nume room" value={roomName} onChange={e => setRoomName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()} style={inputStyle} />
            <button 
              onClick={handleCreate}
              onMouseEnter={() => setHoveredBtn('create')}
              onMouseLeave={() => setHoveredBtn(null)}
              onMouseDown={() => setActiveBtn('create')}
              onMouseUp={() => setActiveBtn(null)}
              style={btnStyle('#4CAF50', 'create')}
            >
              Creează
            </button>

            <hr style={{ border: 'none', borderTop: '1px solid #444', margin: '4px 0' }} />

            <p style={{ color: '#ccc', fontSize: 14, fontWeight: 500, margin: '0 0 4px' }}>Intră cu cod</p>
            <input placeholder="Cod acces (ex: AB12CD)" value={joinCode} onChange={e => setJoinCode(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleJoin()} style={inputStyle} />
            <button 
              onClick={handleJoin}
              onMouseEnter={() => setHoveredBtn('join')}
              onMouseLeave={() => setHoveredBtn(null)}
              onMouseDown={() => setActiveBtn('join')}
              onMouseUp={() => setActiveBtn(null)}
              style={btnStyle('#007acc', 'join')}
            >
              Intră
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
