import { useEffect, useRef, useState } from 'react'

const WS_BASE = 'ws://localhost:3000'

const LANG_MAP = {
  javascript: 'javascript', typescript: 'typescript',
  python: 'python', cpp: 'cpp', c: 'c', rust: 'rust', go: 'go',
}

export default function Terminal({ roomId, fileId, language }) {
  const [lines, setLines] = useState([{ type: 'info', text: 'Apasă RUN pentru a executa codul.' }])
  const [running, setRunning] = useState(false)
  const wsRef = useRef(null)
  const bottomRef = useRef(null)

  useEffect(() => {
    return () => wsRef.current?.close()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [lines])

  function run() {
    if (wsRef.current) wsRef.current.close()
    setLines([{ type: 'info', text: 'Conectare la executor...' }])
    setRunning(true)

    const ws = new WebSocket(`${WS_BASE}/execute/${roomId}`)
    wsRef.current = ws

    ws.onopen = () => {
      ws.send(JSON.stringify({ action: 'run', fileId, language: LANG_MAP[language] || 'python' }))
    }

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data)
      setLines(prev => [...prev, { type: msg.type, text: msg.data }])
      if (
        msg.type === 'error' ||
        msg.data?.includes('Container terminat') ||
        msg.data?.includes('Execuție oprită') ||
        msg.data?.includes('Timeout') ||
        msg.data?.includes('Output limitat')
      ) {
        setRunning(false)
      }
    }

    ws.onerror = () => {
      setLines(prev => [...prev, { type: 'error', text: 'Eroare conexiune WebSocket.' }])
      setRunning(false)
    }

    ws.onclose = () => {
      setLines(prev => [...prev, { type: 'info', text: '— Sesiune închisă —' }])
      setRunning(false)
    }
  }

  function stop() {
    if (wsRef.current?.readyState === 1) {
      wsRef.current.send(JSON.stringify({ action: 'stop' }))
    }
  }

  const colors = { stdout: '#d4d4d4', stderr: '#f48771', info: '#569cd6', error: '#f48771' }

  return (
    <div style={{ background: 'rgba(30, 58, 95, 0.15)', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 12px', borderTop: '1px solid rgba(100, 150, 200, 0.2)' }}>
        <span style={{ color: '#569cd6', fontSize: 12, fontFamily: 'monospace' }}>Terminal</span>
        <div style={{ display: 'flex', gap: 6 }}>
          {running && (
            <button onClick={stop} style={{ background: '#c0392b', color: '#fff', border: 'none', padding: '3px 12px', borderRadius: 3, cursor: 'pointer', fontSize: 12 }}>
              ■ Stop
            </button>
          )}
          <button onClick={run} disabled={running} style={{ background: running ? '#2d5a2d' : '#4CAF50', color: '#fff', border: 'none', padding: '3px 12px', borderRadius: 3, cursor: running ? 'not-allowed' : 'pointer', fontSize: 12, opacity: running ? 0.7 : 1 }}>
            ▶ Run
          </button>
        </div>
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
