import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../services/api'
import Toolbar from '../components/Toolbar'
import CodeEditor from '../components/CodeEditor'
import Terminal from '../components/Terminal'
import LeftSidebar from '../components/Sidebar'
import AIPanel from '../components/AIBlock'
import Chat from '../components/Chat'

const WS_BASE = 'ws://localhost:3000'

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

export default function EditorPage() {
  const { roomId } = useParams()
  const [room, setRoom] = useState(null)
  const [files, setFiles] = useState([])
  const [activeFile, setActiveFile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [roomWs, setRoomWs] = useState(null)
  const [aiOpen, setAiOpen] = useState(false)
  const [pendingDiff, setPendingDiff] = useState(null) // codul propus de AI
  const roomWsRef = useRef(null)

  useEffect(() => {
    loadData()

    const ws = new WebSocket(`${WS_BASE}/collab/${roomId}`)
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

      if (filesData.length === 0) {
        // Crează un fișier implicit
        const created = await api.createFile(roomId, 'main.py', '# Scrie codul tau aici\nprint("Hello World")', 'python')
        const newFile = { id: created.fileId, name: 'main.py', content: '# Scrie codul tau aici\nprint("Hello World")', language: 'python' }
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
    setFiles(prev => prev.map(f => f.id === file.id ? { ...f, content: newCode } : f))
    setActiveFile(prev => ({ ...prev, content: newCode }))
    setPendingDiff(null)
    try {
      await api.updateFile(roomId, file.id, newCode, file.name, file.language)
    } catch (e) {
      console.error('Error saving AI changes:', e)
    }
  }

  async function handleCodeChange(newCode) {
    try {
      await api.updateFile(roomId, activeFile.id, newCode, activeFile.name, activeFile.language)
    } catch (e) {
      console.error('Error saving file:', e)
    }
  }

  async function handleNewFile() {
    const name = prompt('Nume fișier (ex: script.py):')
    if (!name?.trim()) return
    try {
      const created = await api.createFile(roomId, name.trim(), '', getLanguage(name.trim()))
      const newFile = { id: created.fileId, name: name.trim(), content: '', language: getLanguage(name.trim()) }
      setFiles(prev => [...prev, newFile])
      setActiveFile(newFile)
      // Notifică ceilalți utilizatori
      roomWsRef.current?.send(JSON.stringify({ action: 'file_created', file: newFile }))
    } catch (e) {
      console.error('Error creating file:', e)
    }
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#1e1e1e' }}>
      <Toolbar
        roomName={room?.name}
        joinCode={room?.join_code}
        onSave={handleSave}
      />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <LeftSidebar
          files={files}
          activeFileId={activeFile?.id}
          onFileSelect={setActiveFile}
          onNewFile={handleNewFile}
          onDeleteFile={handleDeleteFile}
        />
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
              />
            ) : (
              <div style={{ color: '#666', padding: 20, fontSize: 13 }}>Selectează sau creează un fișier</div>
            )}
          </div>
          <div style={{ height: 200, borderTop: '1px solid #333' }}>
            <Terminal roomId={roomId} fileId={activeFile?.id} language={language} />
          </div>
        </div>
        <Chat roomId={roomId} roomWs={roomWs} />

        {/* Panou AI expandabil */}
        <div style={{ display: 'flex', borderLeft: '1px solid #111', flexShrink: 0 }}>
        {/* Buton toggle */}
          <button
            onClick={() => setAiOpen(o => !o)}
            title={aiOpen ? 'Închide AI' : 'Deschide AI'}
            style={{
              writingMode: 'vertical-rl',
              textOrientation: 'mixed',
              width: 28,
              height: 'auto',
              padding: '12px 6px',
              background: aiOpen ? '#534AB7' : '#2d2b3d',
              border: 'none',
              borderLeft: '1px solid #111',
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
              transition: 'background 0.15s',
            }}
          >
            ✨ AI
          </button>
          {/* Panou AI */}
          <div style={{
            width: aiOpen ? 260 : 0,
            overflow: 'hidden',
            transition: 'width 0.2s ease',
            height: '100%',
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
