import { useEffect, useState } from 'react'
import { api } from '../services/api'
import { getUser } from '../services/auth'

const icons = {
  py: <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg" width="14" height="14" alt="py" />,
  js: <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg" width="14" height="14" alt="js" />,
  jsx: <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg" width="14" height="14" alt="jsx" />,
  tsx: <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg" width="14" height="14" alt="tsx" />,
  ts: <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/typescript/typescript-original.svg" width="14" height="14" alt="ts" />,
  html: <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/html5/html5-original.svg" width="14" height="14" alt="html" />,
  css: <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/css3/css3-original.svg" width="14" height="14" alt="css" />,
  cpp: <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/cplusplus/cplusplus-original.svg" width="14" height="14" alt="cpp" />,
  c: <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/c/c-original.svg" width="14" height="14" alt="c" />,
  rs: <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/rust/rust-original.svg" width="14" height="14" alt="rs" />,
  go: <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/go/go-original.svg" width="14" height="14" alt="go" />,
  json: <span style={{ fontSize: 11, color: '#dcdcaa', fontWeight: 'bold' }}>{'{}'}</span>,
  md: <span style={{ fontSize: 11, color: '#888' }}>MD</span>,
  txt: <span style={{ fontSize: 11, color: '#888' }}>TXT</span>,
}

function getIcon(filename) {
  const ext = filename?.split('.').pop()
  return icons[ext] || <span style={{ fontSize: 11, color: '#888' }}>📄</span>
}

export default function LeftSidebar({ roomId, files, activeFileId, onFileSelect, onNewFile, onDeleteFile, roomWs, fileErrors = {}, colorMap = {}, participants = [], setParticipants, onUploadFile, adminId, onKick }) {
  const [onlineIds, setOnlineIds] = useState(new Set())
  const [clickedUser, setClickedUser] = useState(null) // id-ul userului pe care s-a dat click
  const me = getUser()

  useEffect(() => {
    if (!roomId) return
    api.getParticipants(roomId).then(data => {
      setParticipants?.(data || [])
      setOnlineIds(new Set([me?.id]))
    }).catch(() => {})
  }, [roomId])

  // Ascultă events de prezență de pe canalul room
  useEffect(() => {
    if (!roomWs) return
    const handler = (e) => {
      try {
        const payload = JSON.parse(e.data)
        if (payload.action === 'user_online') {
          setOnlineIds(prev => new Set([...prev, payload.userId]))
        } else if (payload.action === 'user_offline') {
          setOnlineIds(prev => { const s = new Set(prev); s.delete(payload.userId); return s })
        } else if (payload.action === 'user_kicked') {
          setOnlineIds(prev => { const s = new Set(prev); s.delete(payload.userId); return s })
        }
      } catch (_) {}
    }
    roomWs.addEventListener('message', handler)
    return () => roomWs.removeEventListener('message', handler)
  }, [roomWs])

  useEffect(() => {
    if (!clickedUser) return
    const close = () => setClickedUser(null)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [clickedUser])
  return (
    <div style={{ width: 180, background: '#252526', borderRight: '1px solid #111', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>

      <div style={{ padding: '8px 10px', borderBottom: '1px solid #111' }}>
        <div style={{ color: '#888', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Fisiere</div>
        {files.map(f => {
          const color = colorMap[f.created_by] || '#444'
          return (
            <div key={f.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 6px', borderRadius: 4, background: activeFileId === f.id ? '#2d2d2d' : 'transparent' }}>
              <div onClick={() => onFileSelect(f)} style={{ display: 'flex', alignItems: 'center', gap: 5, flex: 1, overflow: 'hidden', cursor: 'pointer' }}>
                <span style={{ fontSize: 12, display: 'flex', alignItems: 'center' }}>{getIcon(f.name)}</span>
                <span style={{ color: fileErrors[f.id] ? '#f48771' : (activeFileId === f.id ? '#fff' : '#ccc'), fontSize: 12, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{f.name}</span>
                <div style={{ width: 7, height: 7,marginRight:5, borderRadius: '50%', background: color, flexShrink: 0, alignSelf: 'center' }} />
              </div>
              <span onClick={(e) => { e.stopPropagation(); onDeleteFile(f.id) }} style={{ color: '#666', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center' }} title="Șterge">
                <svg width="8" height="8" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <line x1="1" y1="1" x2="9" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  <line x1="9" y1="1" x2="1" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </span>
            </div>
          )
        })}
        <div onClick={onNewFile} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 6px', borderRadius: 4, cursor: 'pointer', marginTop: 4 }}>
          <span style={{ color: '#888', fontSize: 14 }}>+</span>
          <span style={{ color: '#888', fontSize: 12 }}>Fisier nou</span>
        </div>
        <div onClick={onUploadFile} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 6px', borderRadius: 4, cursor: 'pointer', marginTop: 2 }}>
          <span style={{ color: '#888', fontSize: 14 }}>↑</span>
          <span style={{ color: '#888', fontSize: 12 }}>Incarca fisier</span>
        </div>
      </div>

      <div style={{ padding: '8px 10px' }} onClick={() => setClickedUser(null)}>
        <div style={{ color: '#888', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Participanti</div>
        {participants.map(p => (
          <div key={p.id} style={{ position: 'relative' }}>
            <div
              onClick={(e) => {
                e.stopPropagation()
                if (me?.id === adminId && p.id !== me?.id) {
                  setClickedUser(prev => prev === p.id ? null : p.id)
                }
              }}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '3px 6px', cursor: me?.id === adminId && p.id !== me?.id ? 'pointer' : 'default', borderRadius: 4, background: clickedUser === p.id ? '#2d2d2d' : 'transparent' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
                <div title={onlineIds.has(p.id) ? 'Online' : 'Offline'} style={{ width: 7, height: 7, borderRadius: '50%', background: onlineIds.has(p.id) ? '#4CAF50' : '#555', flexShrink: 0 }} />
                <span style={{ color: p.id === me?.id ? '#ccc' : '#888', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.id === adminId && <span title="Admin" style={{ marginRight: 3 }}>👑</span>}
                  @{p.username}{p.id === me?.id ? ' (tu)' : ''}
                </span>
              </div>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: colorMap[p.id] || '#444', flexShrink: 0 }} />
            </div>

            {/* Popover kick */}
            {clickedUser === p.id && me?.id === adminId && (
              <div style={{ position: 'absolute', right: 0, top: '100%', background: '#1e1e1e', border: '1px solid #444', borderRadius: 4, zIndex: 10, padding: '4px 0', minWidth: 80 }}>
                <button
                  onClick={(e) => { e.stopPropagation(); onKick?.(p.id); setClickedUser(null) }}
                  style={{ display: 'block', width: '100%', background: 'transparent', border: 'none', color: '#f48771', cursor: 'pointer', fontSize: 12, padding: '4px 10px', textAlign: 'left' }}
                >
                  Kick
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
