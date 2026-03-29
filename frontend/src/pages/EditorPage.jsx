import { useState, useEffect, useRef, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../services/api'
import { getUser } from '../services/auth'
import Toolbar from '../components/Toolbar'
import CodeEditor from '../components/CodeEditor'
import Terminal from '../components/Terminal'
import LeftSidebar from '../components/Sidebar'
import AIPanel from '../components/AIBlock'
import Chat from '../components/Chat'

const WS_BASE = 'ws://localhost:3000'

const COLORS = [
  '#FF3B30', '#007AFF', '#FFD60A', '#30D158',
  '#FF9F0A', '#BF5AF2', '#00C7BE', '#FF375F',
  '#FFFFFF', '#AC8E68', '#40C8E0', '#FF6961',
]

function getLanguage(filename) {
  const ext = filename?.split('.').pop()
  const map = {
    py: 'python', js: 'javascript', jsx: 'javascript',
    ts: 'typescript', tsx: 'typescript',
    cpp: 'cpp', c: 'c', rs: 'rust', go: 'go',
    html: 'html', css: 'css', json: 'json', md: 'markdown',
  }
  return map[ext] || 'plaintext'
}

export default function EditorPage({ onLogout }) {
  const { roomId } = useParams()
  const [room, setRoom] = useState(null)
  const [files, setFiles] = useState([])
  const [activeFile, setActiveFile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [roomWs, setRoomWs] = useState(null)
  const [aiOpen, setAiOpen] = useState(false)
  const [pendingDiff, setPendingDiff] = useState(null)
  const [fileErrors, setFileErrors] = useState({})
  const [aiLines, setAiLines] = useState({}) // fileId -> array of line numbers
  const [participants, setParticipants] = useState([])
  const [adminId, setAdminId] = useState(null)
  const roomWsRef = useRef(null)

  const colorMap = useMemo(() => {
    const map = {}
    participants.forEach((p, i) => { map[p.id] = COLORS[i % COLORS.length] })
    return map
  }, [participants])

  function handleErrorsChange(fileId, hasErrors) {
    setFileErrors(prev => ({ ...prev, [fileId]: hasErrors }))
  }
  const me = getUser()

  useEffect(() => {
    loadData()

    const ws = new WebSocket(`${WS_BASE}/collab/${roomId}?userId=${me?.id || ''}&username=${encodeURIComponent(me?.username || '')}`)
    roomWsRef.current = ws
    setRoomWs(ws)

    ws.addEventListener('message', (e) => {
      try {
        const payload = JSON.parse(e.data)
        if (payload.action === 'file_created') {
          setFiles(prev => [...prev, payload.file])
        } else if (payload.action === 'file_deleted') {
          setFiles(prev => {
            const updated = prev.filter(f => f.id !== payload.fileId)
            setActiveFile(a => a?.id === payload.fileId ? (updated[0] || null) : a)
            return updated
          })
        } else if (payload.action === 'ai_lines_update') {
          setFiles(prev => prev.map(f => f.id === payload.fileId ? { ...f, ai_lines: payload.aiLines } : f))
          setActiveFile(a => a?.id === payload.fileId ? { ...a, ai_lines: payload.aiLines } : a)
        } else if (payload.action === 'user_online') {
          setParticipants(prev => {
            if (prev.find(p => p.id === payload.userId)) return prev
            return [...prev, { id: payload.userId, username: payload.username }]
          })
        } else if (payload.action === 'user_left') {
          setParticipants(prev => prev.filter(p => p.id !== payload.userId))
        } else if (payload.action === 'user_kicked' && payload.userId !== me?.id) {
          setParticipants(prev => prev.filter(p => p.id !== payload.userId))
        } else if (payload.action === 'user_kicked' && payload.userId === me?.id) {
          alert('Ai fost eliminat din această cameră.')
          navigate('/')
        } else if (payload.action === 'admin_changed') {
          setAdminId(payload.newAdminId)
          if (payload.oldAdminId && payload.newAdminId) {
            setFiles(prev => prev.map(f =>
              f.created_by === payload.oldAdminId ? { ...f, created_by: payload.newAdminId } : f
            ))
          }
        }
      } catch (_) {}
    })

    return () => ws.close()
  }, [roomId])

  async function loadData() {
    setLoading(true)
    try {
      const [roomsData, filesData] = await Promise.all([
        api.getRooms(),
        api.getFiles(roomId),
      ])
      const currentRoom = roomsData.find(r => r.id === roomId)
      setRoom(currentRoom || null)
      setAdminId(currentRoom?.admin_id || currentRoom?.created_by || null)

      if (filesData.length === 0) {
        // Crează un fișier implicit
        const created = await api.createFile(roomId, 'main.py', '# Scrie codul tau aici\nprint("Hello World")', 'python')
        const newFile = { id: created.fileId, name: 'main.py', content: '# Scrie codul tau aici\nprint("Hello World")', language: 'python', created_by: me?.id }
        setFiles([newFile])
        setActiveFile(newFile)
      } else {
        setFiles(filesData)
        setActiveFile(filesData[0])
      }
    } catch (e) {
      console.error('Error loading room data:', e)
    }
    setLoading(false)
  }

  async function handleAcceptDiff(newCode) {
    if (!activeFile || !newCode) return
    const file = activeFile

    // Calculăm liniile modificate de AI
    const originalLines = (file.content || '').split('\n')
    const newLines = newCode.split('\n')
    const existingAiLines = file.ai_lines || []
    const changedLines = []
    const maxLen = Math.max(originalLines.length, newLines.length)
    for (let i = 0; i < maxLen; i++) {
      if (originalLines[i] !== newLines[i] && newLines[i] !== undefined) {
        changedLines.push(i + 1)
      }
    }
    const mergedAiLines = [...new Set([...existingAiLines, ...changedLines])]

    setFiles(prev => prev.map(f => f.id === file.id ? { ...f, content: newCode, ai_lines: mergedAiLines } : f))
    setActiveFile(prev => ({ ...prev, content: newCode, ai_lines: mergedAiLines }))
    setPendingDiff(null)
    try {
      await api.updateFile(roomId, file.id, newCode, file.name, file.language, mergedAiLines)
    } catch (e) {
      console.error('Error saving AI changes:', e)
    }
  }

  async function handleKick(targetId) {
    if (!confirm('Elimini acest utilizator din cameră?')) return
    try {
      await api.kickUser(roomId, targetId)
      setParticipants(prev => prev.filter(p => p.id !== targetId))
      roomWsRef.current?.send(JSON.stringify({ action: 'user_kicked', userId: targetId }))
    } catch (e) {
      console.error('Kick error:', e)
    }
  }

  async function handleLeaveRoom() {
    if (!confirm('Părăsești camera?')) return
    try {
      const result = await api.leaveRoom(roomId)
      // Backend-ul broadcastează user_left și admin_changed
      // Dar dacă WS-ul e încă deschis, trimitem și noi pentru siguranță
      if (result.newAdminId) {
        roomWsRef.current?.send(JSON.stringify({
          action: 'admin_changed',
          newAdminId: result.newAdminId,
          oldAdminId: me?.id,
        }))
      }
      roomWsRef.current?.send(JSON.stringify({ action: 'user_left', userId: me?.id }))
      navigate('/')
    } catch (e) {
      console.error('Leave error:', e)
    }
  }

  async function handleCodeChange(newCode) {
    // Nu salvăm la fiecare keystroke — CRDT-ul din sockets.js se ocupă de persistență
    // Actualizăm doar state-ul local pentru AI panel și alte componente
    setFiles(prev => prev.map(f => f.id === activeFile?.id ? { ...f, content: newCode } : f))
    setActiveFile(prev => prev ? { ...prev, content: newCode } : prev)
  }

  async function handleNewFile() {
    let name = prompt('Nume fișier (ex: script.py):')
    if (!name?.trim()) return
    name = name.trim()
    if (!name.includes('.')) name += '.py'
    if (files.some(f => f.name === name)) {
      alert(`Fișierul "${name}" există deja în această cameră.`)
      return
    }
    try {
      const created = await api.createFile(roomId, name, '', getLanguage(name))
      const newFile = { id: created.fileId, name, content: '', language: getLanguage(name), created_by: me?.id }
      setFiles(prev => [...prev, newFile])
      setActiveFile(newFile)
      // Notifică ceilalți utilizatori
      roomWsRef.current?.send(JSON.stringify({ action: 'file_created', file: newFile }))
    } catch (e) {
      console.error('Error creating file:', e)
    }
  }

  async function handleUploadFile() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.py,.js,.jsx,.ts,.tsx,.cpp,.c,.rs,.go,.html,.css,.json,.md,.txt,.java,.rb,.php,.swift,.kt,.cs,.sh,.yaml,.yml,.xml,.sql'
    input.onchange = async (e) => {
      const file = e.target.files[0]
      if (!file) return
      const name = file.name
      if (files.some(f => f.name === name)) {
        alert(`Fișierul "${name}" există deja în această cameră.`)
        return
      }
      const reader = new FileReader()
      reader.onload = async (ev) => {
        const content = ev.target.result
        try {
          const created = await api.createFile(roomId, name, content, getLanguage(name))
          const newFile = { id: created.fileId, name, content, language: getLanguage(name), created_by: me?.id }
          setFiles(prev => [...prev, newFile])
          setActiveFile(newFile)
          roomWsRef.current?.send(JSON.stringify({ action: 'file_created', file: newFile }))
        } catch (err) {
          console.error('Error uploading file:', err)
          alert(err.message)
        }
      }
      reader.readAsText(file, 'UTF-8')
    }
    input.click()
  }

  async function handleDeleteFile(fileId) {
    if (!confirm('Ștergi fișierul?')) return
    try {
      await api.deleteFile(roomId, fileId)
      setFiles(prev => {
        const updated = prev.filter(f => f.id !== fileId)
        if (activeFile?.id === fileId) setActiveFile(updated[0] || null)
        return updated
      })
      // Notifică ceilalți utilizatori
      roomWsRef.current?.send(JSON.stringify({ action: 'file_deleted', fileId }))
    } catch (e) {
      console.error('Error deleting file:', e)
    }
  }

  function handleSave() {
    if (!activeFile) return
    const blob = new Blob([activeFile.content || ''], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = activeFile.name
    a.click()
    URL.revokeObjectURL(url)
  }

  const language = activeFile ? getLanguage(activeFile.name) : 'plaintext'

  if (loading) return <div style={{ color: '#fff', padding: 20 }}>Se încarcă...</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Toolbar
        roomName={room?.name}
        joinCode={room?.join_code}
        onSave={handleSave}
        onLogout={onLogout}
        onLeave={handleLeaveRoom}
      />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar — nuanță albastru-indigo */}
        <div style={{ background: 'rgba(10,15,40,0.55)', backdropFilter: 'blur(16px)', borderRight: '1px solid rgba(100,130,255,0.15)' }}>
          <LeftSidebar
            roomId={roomId}
            roomWs={roomWs}
            files={files}
            fileErrors={fileErrors}
            activeFileId={activeFile?.id}
            onFileSelect={setActiveFile}
            onNewFile={handleNewFile}
            onDeleteFile={handleDeleteFile}
            onUploadFile={handleUploadFile}
            colorMap={colorMap}
            participants={participants}
            setParticipants={setParticipants}
            adminId={adminId}
            onKick={handleKick}
          />
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            {activeFile ? (
              <CodeEditor
                roomId={roomId}
                fileId={activeFile.id}
                code={activeFile.content || ''}
                language={language}
                onChange={handleCodeChange}
                diffCode={pendingDiff}
                onAccept={() => handleAcceptDiff(pendingDiff)}
                onReject={() => setPendingDiff(null)}
                onErrorsChange={handleErrorsChange}
                aiLines={activeFile?.ai_lines || []}
                onAiLinesChange={async (fId, lines) => {
                  setFiles(prev => prev.map(f => f.id === fId ? { ...f, ai_lines: lines } : f))
                  setActiveFile(prev => prev?.id === fId ? { ...prev, ai_lines: lines } : prev)
                  try {
                    await api.updateFile(roomId, fId, activeFile.content, activeFile.name, activeFile.language, lines)
                  } catch (e) { console.error(e) }
                  roomWsRef.current?.send(JSON.stringify({ action: 'ai_lines_update', fileId: fId, aiLines: lines }))
                }}
                colorMap={colorMap}
                myId={me?.id}
              />
            ) : (
              <div style={{ color: 'rgba(255,255,255,0.3)', padding: 20, fontSize: 13 }}>Selectează sau creează un fișier</div>
            )}
          </div>
          {/* Terminal — nuanță verde-teal închis */}
          <div style={{ height: 200, borderTop: '1px solid rgba(0,200,150,0.12)', background: 'rgba(0,20,18,0.6)', backdropFilter: 'blur(12px)' }}>
            <Terminal roomId={roomId} fileId={activeFile?.id} language={language} code={activeFile?.content || ''} />
          </div>
        </div>

        {/* Chat — nuanță violet-mov */}
        <div style={{ background: 'rgba(20,10,40,0.55)', backdropFilter: 'blur(16px)', borderLeft: '1px solid rgba(160,100,255,0.15)' }}>
          <Chat roomId={roomId} roomWs={roomWs} />
        </div>

        {/* Panou AI expandabil — nuanță auriu-violet */}
        <div style={{ display: 'flex', borderLeft: '1px solid rgba(200,160,255,0.12)', flexShrink: 0 }}>
          <button
            onClick={() => setAiOpen(o => !o)}
            title={aiOpen ? 'Închide AI' : 'Deschide AI'}
            style={{
              writingMode: 'vertical-rl',
              textOrientation: 'mixed',
              width: 28,
              height: 'auto',
              padding: '12px 6px',
              background: aiOpen
                ? 'rgba(120,80,220,0.5)'
                : 'rgba(15,8,35,0.5)',
              backdropFilter: 'blur(16px)',
              border: 'none',
              cursor: 'pointer',
              color: '#CECBF6',
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              flexShrink: 0,
              transition: 'background 0.2s',
            }}
          >
            ✨ AI
          </button>
          <div style={{
            width: aiOpen ? 260 : 0,
            overflow: 'hidden',
            transition: 'width 0.2s ease',
            height: '100%',
            background: 'rgba(15,8,35,0.55)',
            backdropFilter: 'blur(16px)',
          }}>
            <div style={{ width: 260, height: '100%' }}>
              <AIPanel code={activeFile?.content || ''} language={language} onProposeDiff={setPendingDiff} onApplyCode={(newCode) => handleCodeChange(newCode)} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
