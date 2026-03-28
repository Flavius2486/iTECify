import { useNavigate } from 'react-router-dom'
import { logout, getUser } from '../services/auth'

export default function Toolbar({ roomName, joinCode, onSave }) {
  const navigate = useNavigate()
  const user = getUser()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div style={{ height: 50, background: '#2d2d2d', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', borderBottom: '1px solid #444', color: 'white', flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span onClick={() => navigate('/')} style={{ color: '#fff', fontWeight: 500, fontSize: 14, cursor: 'pointer' }}>ITECify</span>
        {user && (
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
        <button onClick={handleLogout} style={{ background: '#3c3c3c', color: '#ccc', border: 'none', padding: '6px 14px', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>
          Logout
        </button>
      </div>
    </div>
  )
}
