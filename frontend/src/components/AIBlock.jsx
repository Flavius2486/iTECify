import { useState, useRef, useEffect } from 'react'

function extractCode(text) {
  const match = text.match(/```(?:\w+)?\n([\s\S]*?)```/)
  return match ? match[1].trim() : text.trim()
}

export default function AIPanel({ code, language, onProposeDiff }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [mode, setMode] = useState('chat')
  const [input, setInput] = useState('')
  const [history, setHistory] = useState([]) // { role: 'user'|'ai', text, isEdit? }
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [history, loading])

  async function handleSend() {
    if (!input.trim()) return
    const prompt = input.trim()
    setInput('')
    setError(null)

    // Adăugăm mesajul utilizatorului în istoric
    setHistory(prev => [...prev, { role: 'user', text: prompt, isEdit: mode === 'edit' }])
    setLoading(true)

    const systemPrompt = mode === 'edit'
      ? 'Ești un asistent de programare. Returnează DOAR codul modificat într-un singur bloc de cod markdown, fără explicații. NU introduce bucle infinite, while(true), while(1) sau orice cod care rulează la nesfârșit.'
      : 'Ești un asistent de programare. Răspunde în română.'

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_GROQ_KEY}`,
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `${prompt}\n\nLimbaj: ${language}\n\nCod:\n\`\`\`${language}\n${code}\n\`\`\`` },
          ],
        }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error?.message || 'Eroare API')
      }

      const data = await response.json()
      const content = data.choices[0].message.content

      if (mode === 'edit') {
        const extracted = extractCode(content)
        onProposeDiff(extracted)
        setHistory(prev => [...prev, { role: 'ai', text: '✓ Modificări propuse în editor.', isEdit: true }])
      } else {
        setHistory(prev => [...prev, { role: 'ai', text: content }])
      }
    } catch (e) {
      setError(e.message || 'Eroare la AI')
    }

    setLoading(false)
  }

  const quickPrompts = mode === 'chat'
    ? ['Explică codul', 'Ce erori are?', 'Cum îl îmbunătățesc?']
    : ['Corectează erorile', 'Optimizează', 'Adaugă comentarii', 'Curăță codul']

  return (
    <div style={{ width: 260, background: 'transparent', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ padding: '8px 10px', borderBottom: '1px solid rgba(200,160,255,0.1)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 14 }}>✨</span>
          <span style={{ color: '#CECBF6', fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            AI Assistant
          </span>
        </div>
      </div>

      {/* Istoric conversație */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {history.length === 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {(mode === 'chat'
              ? ['Explică codul', 'Ce erori are?', 'Cum îl îmbunătățesc?']
              : ['Corectează erorile', 'Optimizează', 'Adaugă comentarii', 'Curăță codul']
            ).map(p => (
              <button key={p} onClick={() => setInput(p)}
                style={{ background: '#1e1e1e', border: '1px solid #444', color: '#aaa', borderRadius: 12, padding: '3px 8px', fontSize: 11, cursor: 'pointer' }}>
                {p}
              </button>
            ))}
          </div>
        )}

        {history.map((msg, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              background: msg.role === 'user' ? '#534AB7' : (msg.isEdit ? '#1a2a1a' : '#1a1830'),
              border: msg.role === 'ai' ? `0.5px solid ${msg.isEdit ? '#2d5a2d' : '#534AB7'}` : 'none',
              borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
              padding: '6px 10px',
              maxWidth: '90%',
              color: msg.role === 'user' ? '#fff' : (msg.isEdit ? '#4ec94e' : '#AFA9EC'),
              fontSize: 12,
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}>
              {msg.text}
            </div>
          </div>
        ))}

        {loading && <div style={{ color: '#888', fontSize: 12 }}>⏳ Se gândește...</div>}

        {error && (
          <div style={{ background: '#2a1515', border: '0.5px solid #f48771', borderRadius: 4, padding: 8, color: '#f48771', fontSize: 11 }}>
            ⚠ {error}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div style={{ borderTop: '1px solid rgba(200,160,255,0.1)', padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
        {/* Toggle Edit / Chat */}
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden', alignSelf: 'flex-start' }}>
          <button
            onClick={() => setMode('chat')}
            style={{ padding: '4px 12px', background: mode === 'chat' ? '#534AB7' : 'transparent', color: mode === 'chat' ? '#fff' : '#888', border: 'none', fontSize: 11, cursor: 'pointer' }}
          >
            Chat
          </button>
          <button
            onClick={() => setMode('edit')}
            style={{ padding: '4px 12px', background: mode === 'edit' ? '#534AB7' : 'transparent', color: mode === 'edit' ? '#fff' : '#888', border: 'none', fontSize: 11, cursor: 'pointer' }}
          >
            Edit
          </button>
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            placeholder={mode === 'edit' ? 'Ce modificări să facă AI?' : 'Întreabă ceva despre cod...'}
            rows={2}
            style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(200,160,255,0.15)', borderRadius: 4, padding: '5px 8px', color: '#fff', fontSize: 12, resize: 'none', outline: 'none', fontFamily: 'inherit' }}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            style={{ background: '#534AB7', color: '#fff', border: 'none', borderRadius: 4, padding: '0 10px', cursor: 'pointer', fontSize: 14, opacity: loading || !input.trim() ? 0.5 : 1 }}
          >
            ↑
          </button>
        </div>
      </div>
    </div>
  )
}
