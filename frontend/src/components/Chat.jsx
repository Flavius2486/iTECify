import { useState, useEffect, useRef } from 'react'
import { api } from '../services/api'
import { getUser } from '../services/auth'

export default function Chat({ roomId, roomWs }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const bottomRef = useRef(null)
  const usernameCache = useRef({})
  const user = getUser()

  async function resolveUsername(userId) {
    if (usernameCache.current[userId]) return usernameCache.current[userId]
    try {
      const users = await api.getUsers([userId])
      const username = users?.[0]?.username || 'utilizator'
      usernameCache.current[userId] = username
      return username
    } catch {
      return 'utilizator'
    }
  }

  // Încarcă istoricul la mount
  useEffect(() => {
    api.getMessages(roomId).then(async (msgs) => {
      const missingIds = [...new Set(msgs.filter(m => !m.username).map(m => m.user_id))]
      if (missingIds.length > 0) {
        const users = await api.getUsers(missingIds).catch(() => [])
        users.forEach(u => { usernameCache.current[u.id] = u.username })
      }
      const resolved = msgs.map(m => ({
        ...m,
        username: m.username || usernameCache.current[m.user_id] || 'utilizator',
      }))
      setMessages(resolved)
    }).catch(() => {})
  }, [roomId])

  // Ascultă mesaje noi prin WebSocket
  useEffect(() => {
    if (!roomWs) return

    const handler = async (e) => {
      try {
        const payload = JSON.parse(e.data)
        if (payload.action === 'chat_message') {
          const msg = { ...payload.message }
          if (!msg.username) {
            msg.username = await resolveUsername(msg.user_id)
          }
          setMessages(prev => [...prev, msg])
        }
      } catch (_) {}
    }

    roomWs.addEventListener('message', handler)
    return () => roomWs.removeEventListener('message', handler)
  }, [roomWs])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    const content = input.trim()
    if (!content) return
    setInput('')

    try {
      const { messageId, username } = await api.sendMessage(roomId, content)
      const newMsg = {
        id: messageId,
        user_id: user.id,
        content,
        created_at: new Date().toISOString(),
        username: username || user.username,
      }
      setMessages(prev => [...prev, newMsg])
      if (roomWs?.readyState === 1) {
        roomWs.send(JSON.stringify({ action: 'chat_message', message: newMsg }))
      }
    } catch (e) {
      console.error('Error sending message:', e)
    }
  }

  function formatTime(iso) {
    return new Date(iso).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div style={{ width: 260, background: 'transparent', borderLeft: '1px solid rgba(160,100,255,0.12)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
      <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(160,100,255,0.1)', color: 'rgba(255,255,255,0.4)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Chat
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {messages.length === 0 && (
          <span style={{ color: '#555', fontSize: 12 }}>Niciun mesaj încă.</span>
        )}
        {messages.map((m) => {
          const isMe = m.user_id === user?.id
          return (
            <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
              <span style={{ color: '#666', fontSize: 10, marginBottom: 2 }}>
                @{m.username || (isMe ? user.username : 'utilizator')} · {formatTime(m.created_at)}
              </span>
              <div style={{
                background: isMe ? 'rgba(37,99,235,0.7)' : 'rgba(255,255,255,0.07)',
                color: '#fff',
                padding: '5px 10px',
                borderRadius: isMe ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                fontSize: 13,
                maxWidth: 200,
                wordBreak: 'break-word',
              }}>
                {m.content}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <div style={{ padding: '8px 10px', borderTop: '1px solid #111', display: 'flex', gap: 6 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="Mesaj..."
          style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(130,160,255,0.15)', borderRadius: 4, padding: '5px 8px', color: '#fff', fontSize: 13, outline: 'none' }}
        />
        <button onClick={handleSend} style={{ background: '#007acc', color: '#fff', border: 'none', borderRadius: 4, padding: '5px 10px', cursor: 'pointer', fontSize: 13 }}>
          ↑
        </button>
      </div>
    </div>
  )
}
