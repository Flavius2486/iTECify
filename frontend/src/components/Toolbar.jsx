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
    <div style={{ height: 50, background: 'rgba(45, 45, 45, 0.4)', backdropFilter: 'blur(15px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', borderBottom: '1px solid rgba(68, 68, 68, 0.5)', color: 'white', flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span 
          onClick={() => navigate('/home')} 
          style={{ color: '#fff', fontWeight: 500, fontSize: 14, cursor: 'pointer', transition: 'opacity 0.15s' }}
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
            style={getButtonStyle({ background: '#3c3c3c', color: '#ccc', border: 'none', padding: '6px 14px', borderRadius: 4, cursor: 'pointer', fontSize: 12 }, 'save')}
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
          style={getButtonStyle({ background: '#3c3c3c', color: '#ccc', border: 'none', padding: '6px 14px', borderRadius: 4, cursor: 'pointer', fontSize: 12 }, 'logout')}
        >
          Logout
        </button>
      </div>
    </div>
  )
}
