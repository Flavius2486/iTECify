import Editor from '@monaco-editor/react'
import { useRef, useEffect } from 'react'
import { io } from 'socket.io-client'

const socket = io('http://localhost:1234')

export default function CodeEditor({ roomId, code, language, onChange }) {
  const isRemoteUpdate = useRef(false)

  useEffect(() => {
    socket.emit('join-room', roomId)

    socket.on('sync-code', (savedCode) => {
      isRemoteUpdate.current = true
      onChange(savedCode)
    })

    socket.on('code-update', (newCode) => {
      isRemoteUpdate.current = true
      onChange(newCode)
    })

    return () => {
      socket.off('sync-code')
      socket.off('code-update')
    }
  }, [roomId])

  function handleChange(newCode) {
    if (isRemoteUpdate.current) {
      isRemoteUpdate.current = false
      return
    }
    onChange(newCode)
    socket.emit('code-change', { roomId, code: newCode })
  }

  return (
    <Editor
      height="100%"
      language={language}
      value={code}
      theme="vs-dark"
      onChange={handleChange}
      options={{
        fontSize: 14,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        wordWrap: 'on',
      }}
    />
  )
}