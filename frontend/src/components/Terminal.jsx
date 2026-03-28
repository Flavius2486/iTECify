import { useEffect, useRef, useState } from 'react'

const WS_BASE = 'ws://localhost:3000'

export default function Terminal({ roomId, fileId, language }) {
  const [lines, setLines] = useState([{ type: 'info', text: 'Apasă RUN pentru a executa codul.' }])
  const wsRef = useRef(null)
  const bottomRef = useRef(null)

  // Monaco language → Docker language key
  const LANG_MAP = {
    javascript: 'javascript',
    typescript: 'typescript',
    python: 'python',
    cpp: 'cpp',
    c: 'c',
    rust: 'rust',
    go: 'go',
  }

  useEffect(() => {
    return () => wsRef.current?.close()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [lines])

  function run() {
    if (wsRef.current) wsRef.current.close()
    setLines([{ type: 'info', text: 'Conectare la executor...' }])

    const ws = new WebSocket(`${WS_BASE}/execute/${roomId}`)
    wsRef.current = ws

    ws.onopen = () => {
      const dockerLang = LANG_MAP[language] || 'python'
      ws.send(JSON.stringify({ action: 'run', fileId, language: dockerLang }))
    }

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data)
      setLines(prev => [...prev, { type: msg.type, text: msg.data }])
    }

    ws.onerror = () => setLines(prev => [...prev, { type: 'error', text: 'Eroare conexiune WebSocket.' }])
    ws.onclose = () => setLines(prev => [...prev, { type: 'info', text: '— Sesiune închisă —' }])
  }

  const colors = { stdout: '#d4d4d4', stderr: '#f48771', info: '#569cd6', error: '#f48771' }

  return (
    <div style={{ background: '#0f0f0f', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 12px', borderTop: '1px solid #222' }}>
        <span style={{ color: '#569cd6', fontSize: 12, fontFamily: 'monospace' }}>Terminal</span>
        <button onClick={run} style={{ background: '#4CAF50', color: '#fff', border: 'none', padding: '3px 12px', borderRadius: 3, cursor: 'pointer', fontSize: 12 }}>
          ▶ Run
        </button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px', fontFamily: 'monospace', fontSize: 13 }}>
        {lines.map((l, i) => (
          <div key={i} style={{ color: colors[l.type] || '#d4d4d4', whiteSpace: 'pre-wrap' }}>{l.text}</div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
