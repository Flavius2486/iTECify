import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import { logout, getUser } from '../services/auth'

export default function Home({ onLogout }) {
  const [joinCode, setJoinCode] = useState('')
  const [roomName, setRoomName] = useState('')
  const [rooms, setRooms] = useState([])
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const user = getUser()

  useEffect(() => {
    loadRooms()
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
      // Dacă ești deja participant, încearcă să găsești room-ul în lista ta
      if (e.message?.includes('Already a participant')) {
        const existing = rooms.find(r => r.join_code === joinCode.trim().toUpperCase())
        if (existing) { navigate(`/room/${existing.id}`); return }
      }
      setError(e.message)
    }
  }

  async function handleLeave(e, roomId) {
    e.stopPropagation()
    if (!confirm('Părăsești această cameră? Dacă ești singurul participant, camera va fi ștearsă.')) return
    try {
      await api.leaveRoom(roomId)
      setRooms(prev => prev.filter(r => r.id !== roomId))
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleDelete(e, roomId) {
    e.stopPropagation()
    if (!confirm('Ștergi această cameră? Toți participanții vor pierde accesul.')) return
    try {
      await api.deleteRoom(roomId)
      setRooms(prev => prev.filter(r => r.id !== roomId))
    } catch (err) {
      setError(err.message)
    }
  }

  function handleLogout() {
    logout()
    onLogout?.()
    navigate('/login')
  }

  const inputStyle = {
    padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(130,160,255,0.2)',
    background: 'rgba(255,255,255,0.06)', color: '#fff', fontSize: 13,
    width: '100%', boxSizing: 'border-box', outline: 'none',
  }
  const btnStyle = (color = '#2563eb') => ({
    background: color === '#4CAF50'
      ? 'linear-gradient(90deg, #16a34a, #22c55e)'
      : 'linear-gradient(90deg, #2563eb, #3b82f6)',
    color: '#fff', border: 'none', padding: '10px 0',
    borderRadius: 8, cursor: 'pointer', width: '100%', fontSize: 13, fontWeight: 500,
  })

  const glass = {
    background: 'rgba(8, 12, 30, 0.65)',
    backdropFilter: 'blur(14px)',
    border: '1px solid rgba(130, 160, 255, 0.15)',
    borderRadius: 12,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: 600 }}>
        <h1 style={{ color: '#fff', fontSize: 28, margin: 0 }}>ITECify <span style={{ color: '#4CAF50' }}>IDE</span></h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>@{user?.username}</span>
          <button onClick={handleLogout} style={{ background: 'rgba(255,255,255,0.08)', color: '#ccc', border: '1px solid rgba(255,255,255,0.1)', padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>
            Logout
          </button>
        </div>
      </div>

      {error && <p style={{ color: '#f87171', margin: 0, fontSize: 13 }}>{error}</p>}

      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>

        {/* Roomurile mele */}
        <div style={{ ...glass, padding: 24, width: 280 }}>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: 500, margin: '0 0 12px' }}>Roomurile mele</p>
          {rooms.length === 0 && <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>Nu ai roomuri încă</p>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {rooms.map(r => {
              const isAdmin = (r.admin_id || r.created_by) === user?.id
              const adminUsername = r.admin?.username || null
              return (
              <div
                key={r.id}
                onClick={() => navigate(`/room/${r.id}`)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', borderRadius: 8, cursor: 'pointer', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(130,160,255,0.1)', transition: 'background 0.15s' }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    {isAdmin && <span title="Admin" style={{ fontSize: 11 }}>👑</span>}
                    <p style={{ color: '#fff', fontSize: 13, margin: 0 }}>{r.name}</p>
                  </div>
                  <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, margin: 0, fontFamily: 'monospace' }}>{r.join_code}</p>
                  {adminUsername && (
                    <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10, margin: '2px 0 0', display: 'flex', alignItems: 'center', gap: 3 }}>
                      <span>👑</span> @{adminUsername}
                    </p>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button onClick={(e) => handleLeave(e, r.id)} title="Părăsește camera"
                    style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: '2px 4px', display: 'flex', alignItems: 'center' }}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M5 2H2a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                      <path d="M9 10l3-3-3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                      <line x1="12" y1="7" x2="5" y2="7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                    </svg>
                  </button>
                </div>
              </div>
              )
            })}
          </div>
        </div>

        {/* Acțiuni */}
        <div style={{ ...glass, padding: 24, width: 280, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: 500, margin: '0 0 4px' }}>Creează room nou</p>
          <input placeholder="Nume room" value={roomName} onChange={e => setRoomName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()} style={inputStyle} />
          <button onClick={handleCreate} style={btnStyle('#4CAF50')}>Creează</button>

          <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.08)', margin: '4px 0' }} />

          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: 500, margin: '0 0 4px' }}>Intră cu cod</p>
          <input placeholder="Cod acces (ex: AB12CD)" value={joinCode} onChange={e => setJoinCode(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleJoin()} style={inputStyle} />
          <button onClick={handleJoin} style={btnStyle()}>Intră</button>
        </div>
      </div>
    </div>
  )
}
