import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { logout, getUser } from '../services/auth'

export default function Toolbar({ roomName, joinCode, onSave }) {
  const navigate = useNavigate()
  const user = getUser()
  const [hoveredBtn, setHoveredBtn] = useState(null)
  const [activeBtn, setActiveBtn] = useState(null)

  function handleLogout() {
    logout()
    navigate('/')
  }

  const getButtonStyle = (baseStyle, btnId) => ({
    ...baseStyle,
    opacity: activeBtn === btnId ? 0.6 : hoveredBtn === btnId ? 0.85 : 1,
    transform: activeBtn === btnId ? 'scale(0.95)' : 'scale(1)',
    transition: 'all 0.15s ease',
  })

  return (
    <div style={{ height: 50, background: 'rgba(30, 58, 95, 0.15)', backdropFilter: 'blur(15px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', borderBottom: '1px solid rgba(100, 150, 200, 0.3)', color: 'white', flexShrink: 0, position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span 
          onClick={() => navigate('/home')} 
          style={{ color: '#fff', fontWeight: 600, fontSize: 16, cursor: 'pointer', transition: 'opacity 0.15s', display: 'flex', alignItems: 'center' }}
          onMouseEnter={() => setHoveredBtn('logo')}
          onMouseLeave={() => setHoveredBtn(null)}
          onMouseDown={() => setActiveBtn('logo')}
          onMouseUp={() => setActiveBtn(null)}
        >
          ITECify
        </span>
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
          <button 
            onClick={onSave} 
            onMouseEnter={() => setHoveredBtn('save')}
            onMouseLeave={() => setHoveredBtn(null)}
            onMouseDown={() => setActiveBtn('save')}
            onMouseUp={() => setActiveBtn(null)}
            style={getButtonStyle({ background: 'rgba(42, 90, 160, 0.6)', color: '#e0e0ff', border: '1px solid rgba(100, 150, 200, 0.3)', padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 12 }, 'save')}
          >
            💾 Salvează
          </button>
        )}
        <button 
          onClick={handleLogout}
          onMouseEnter={() => setHoveredBtn('logout')}
          onMouseLeave={() => setHoveredBtn(null)}
          onMouseDown={() => setActiveBtn('logout')}
          onMouseUp={() => setActiveBtn(null)}
          style={getButtonStyle({ background: 'rgba(42, 90, 160, 0.6)', color: '#e0e0ff', border: '1px solid rgba(100, 150, 200, 0.3)', padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 12 }, 'logout')}
        >
          Logout
        </button>
      </div>
    </div>
  )
}
