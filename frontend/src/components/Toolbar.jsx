import { useNavigate } from 'react-router-dom'
import { logout, getUser } from '../services/auth'

export default function Toolbar({ roomName, joinCode, onSave, onLogout, onLeave }) {
  const navigate = useNavigate()
  const user = getUser()

  function handleLogout() {
    logout()
    onLogout?.()
    navigate('/login')
  }

  return (
    <div style={{ height: 50, background: '#2d2d2d', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', borderBottom: '1px solid #444', color: 'white', flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span onClick={() => navigate('/')} style={{ color: '#fff', fontWeight: 500, fontSize: 14, cursor: 'pointer' }}>ITECify</span>        {user && (
          <span style={{ color: '#aaa', fontSize: 13 }}>@{user.username}</span>
        )}
        {roomName && (
          <>
            <span style={{ color: '#555', fontSize: 13 }}>·</span>
            <span style={{ color: '#ccc', fontSize: 13 }}>{roomName}</span>
          </>
        )}
        {joinCode && (
          <span style={{ color: '#4CAF50', fontSize: 12, fontFamily: 'monospace', background: '#1e1e1e', padding: '2px 8px', borderRadius: 3 }}>
            {joinCode}
          </span>
        )}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {onSave && (
          <button onClick={onSave} style={{ background: '#3c3c3c', color: '#ccc', border: 'none', padding: '6px 14px', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>
            💾 Salvează
          </button>
        )}
        {onLeave && (
          <button onClick={onLeave} title="Ieși din room" style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', padding: '6px 8px', display: 'flex', alignItems: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 14 14" fill="none">
              <path d="M5 2H2a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              <path d="M9 10l3-3-3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="12" y1="7" x2="5" y2="7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
          </button>
        )}
        <button onClick={handleLogout} style={{ background: '#3c3c3c', color: '#ccc', border: 'none', padding: '6px 14px', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>
          Logout
        </button>
      </div>
    </div>
  )
}
