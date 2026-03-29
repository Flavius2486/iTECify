import { useEffect, useRef, useState } from 'react'
import CodeScanModal from './CodeScanModal'

const WS_BASE = 'ws://localhost:3000'

const LANG_MAP = {
  javascript: 'javascript', typescript: 'typescript',
  python: 'python', cpp: 'cpp', c: 'c', rust: 'rust', go: 'go',
}

async function scanCodeWithAI(code, language) {
  const lines = code.split('\n')
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_GROQ_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        max_tokens: 400,
        messages: [
          {
            role: 'system',
            content: 'Ești un analizor de cod. Răspunde DOAR cu JSON valid fără text suplimentar: {"issues": [{"line": <număr întreg>, "severity": "error"|"warning", "message": "<max 10 cuvinte în română>"}]}. Dacă nu există probleme returnează {"issues": []}.',
          },
          {
            role: 'user',
            content: `Găsește erorile de sintaxă și problemele funcționale evidente din acest cod ${language}. Specifică numărul exact al liniei pentru fiecare problemă.\n\`\`\`${language}\n${code.slice(0, 3000)}\n\`\`\``,
          },
        ],
      }),
    })
    if (!res.ok) return []
    const data = await res.json()
    const content = data.choices[0].message.content.trim()
    const match = content.match(/\{[\s\S]*\}/)
    if (!match) return []
    const parsed = JSON.parse(match[0])
    // Adăugăm conținutul liniei din cod
    return (parsed.issues || []).map(issue => ({
      ...issue,
      lineContent: issue.line ? (lines[issue.line - 1] || '').trim() : null,
    }))
  } catch {
    return []
  }
}

export default function Terminal({ roomId, fileId, language, code }) {
  const [lines, setLines] = useState([{ type: 'info', text: 'Apasă RUN pentru a executa codul.' }])
  const [running, setRunning] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [scanIssues, setScanIssues] = useState(null) // null = no modal
  const wsRef = useRef(null)
  const bottomRef = useRef(null)

  useEffect(() => {
    return () => wsRef.current?.close()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [lines])

  async function handleRun() {
    if (!code?.trim()) { startRun(); return }

    setScanning(true)
    const issues = await scanCodeWithAI(code, language)
    setScanning(false)

    if (issues.length > 0) {
      setScanIssues(issues)
    } else {
      startRun()
    }
  }

  function startRun() {
    setScanIssues(null)
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
    <>
      {scanIssues && (
        <CodeScanModal
          issues={scanIssues}
          onRunAnyway={startRun}
          onCancel={() => setScanIssues(null)}
        />
      )}

      <div style={{ background: '#0f0f0f', height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 12px', borderTop: '1px solid #222' }}>
          <span style={{ color: '#569cd6', fontSize: 12, fontFamily: 'monospace' }}>Terminal</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {running && (
              <button onClick={stop} style={{ background: '#c0392b', color: '#fff', border: 'none', padding: '3px 12px', borderRadius: 3, cursor: 'pointer', fontSize: 12 }}>
                ■ Stop
              </button>
            )}
            <button
              onClick={handleRun}
              disabled={running || scanning}
              style={{ background: running ? '#2d5a2d' : '#4CAF50', color: '#fff', border: 'none', padding: '3px 12px', borderRadius: 3, cursor: (running || scanning) ? 'not-allowed' : 'pointer', fontSize: 12, opacity: (running || scanning) ? 0.7 : 1 }}
            >
              {scanning ? '🤖 Scanare...' : '▶ Run'}
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
    </>
  )
}
