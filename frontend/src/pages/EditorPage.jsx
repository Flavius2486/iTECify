import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { db, auth } from '../services/firebase'
import { collection, doc, getDocs, addDoc, updateDoc, query, where } from 'firebase/firestore'
import Toolbar from '../components/Toolbar'
import CodeEditor from '../components/CodeEditor'
import Terminal from '../components/Terminal'
import LeftSidebar from '../components/Sidebar'
import AIPanel from '../components/AIBlock'

function getLanguage(filename) {
  const ext = filename.split('.').pop()
  const map = {
    py: 'python',
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    cpp: 'cpp',
    html: 'html',
    css: 'css',
  }
  return map[ext] || 'plaintext'
}

export default function EditorPage() {
  const { roomId } = useParams()
  const [files, setFiles] = useState([])
  const [activeFile, setActiveFile] = useState(null)
  const [roomDocId, setRoomDocId] = useState(null)

  useEffect(() => {
    loadFiles()
  }, [roomId])

  async function loadFiles() {
    const q = query(collection(db, 'rooms'), where('roomId', '==', roomId))
    const snap = await getDocs(q)
    if (snap.empty) return

    const roomDoc = snap.docs[0]
    setRoomDocId(roomDoc.id)

    const filesSnap = await getDocs(collection(db, 'rooms', roomDoc.id, 'files'))
    const loadedFiles = filesSnap.docs.map(d => ({ id: d.id, ...d.data() }))

    if (loadedFiles.length === 0) {
      const newFile = await addDoc(collection(db, 'rooms', roomDoc.id, 'files'), {
        name: 'main.py',
        content: '# Scrie codul tau aici\nprint("Hello World")'
      })
      setFiles([{ id: newFile.id, name: 'main.py', content: '# Scrie codul tau aici\nprint("Hello World")' }])
      setActiveFile('main.py')
    } else {
      setFiles(loadedFiles)
      setActiveFile(loadedFiles[0].name)
    }
  }

  async function handleCodeChange(newCode) {
    setFiles(prev => prev.map(f =>
      f.name === activeFile ? { ...f, content: newCode } : f
    ))
    if (!roomDocId) return
    const file = files.find(f => f.name === activeFile)
    if (file?.id) {
      await updateDoc(doc(db, 'rooms', roomDocId, 'files', file.id), { content: newCode })
    }
  }

  async function handleNewFile() {
    const name = prompt('Nume fișier (ex: script.py):')
    if (!name || !roomDocId) return
    const newFile = await addDoc(collection(db, 'rooms', roomDocId, 'files'), {
      name,
      content: ''
    })
    setFiles(prev => [...prev, { id: newFile.id, name, content: '' }])
    setActiveFile(name)
  }

  function handleSave() {
    const file = files.find(f => f.name === activeFile)
    if (!file) return
    const blob = new Blob([file.content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = activeFile
    a.click()
    URL.revokeObjectURL(url)
  }

  const currentFile = files.find(f => f.name === activeFile)
  const language = activeFile ? getLanguage(activeFile) : 'plaintext'

  if (files.length === 0) return <div style={{ color:'#fff', padding:20 }}>Se încarcă...</div>

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh', background:'#1e1e1e' }}>
      <Toolbar
        roomId={roomId}
        files={files}
        activeFile={activeFile}
        onFileSelect={setActiveFile}
        onSave={handleSave}
      />
      <div style={{ display:'flex', flex:1, overflow:'hidden' }}>
        <LeftSidebar
          files={files}
          activeFile={activeFile}
          onFileSelect={setActiveFile}
          onNewFile={handleNewFile}
        />
        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
          <CodeEditor
            roomId={roomId + activeFile}
            code={currentFile?.content || ''}
            language={language}
            onChange={handleCodeChange}
          />
          <Terminal />
        </div>
        <AIPanel code={currentFile?.content || ''} language={language} />
      </div>
    </div>
  )
}