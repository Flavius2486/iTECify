import { useState } from 'react'

function extractCode(text) {
  const match = text.match(/```(?:\w+)?\n([\s\S]*?)```/)
  return match ? match[1].trim() : text.trim()
}

export default function AIPanel({ code, language, onProposeDiff }) {
  const [loading, setLoading] = useState(false)
  const [suggestion, setSuggestion] = useState(null)
  const [error, setError] = useState(null)
  const [mode, setMode] = useState('chat') // 'chat' | 'edit'
  const [input, setInput] = useState('')

  async function handleSend() {
    if (!input.trim()) return
    const prompt = input.trim()
    setInput('')
    setLoading(true)
    setSuggestion(null)
    setError(null)

    const systemPrompt = mode === 'edit'
      ? 'Ești un asistent de programare. Returnează DOAR codul modificat într-un singur bloc de cod markdown, fără explicații.'
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
      } else {
        setSuggestion(content)
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
    <div style={{ width: 260, background: '#252526', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ padding: '8px 10px', borderBottom: '1px solid #111', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 14 }}>✨</span>
          <span style={{ color: '#CECBF6', fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            AI Assistant
          </span>
        </div>
      </div>

      {/* Răspuns chat */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {/* Quick prompts */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {quickPrompts.map(p => (
            <button
              key={p}
              onClick={() => { setInput(p); }}
              style={{ background: '#1e1e1e', border: '1px solid #444', color: '#aaa', borderRadius: 12, padding: '3px 8px', fontSize: 11, cursor: 'pointer' }}
            >
              {p}
            </button>
          ))}
        </div>

        {loading && <div style={{ color: '#888', fontSize: 12, marginTop: 8 }}>⏳ Se gândește...</div>}

        {error && (
          <div style={{ background: '#2a1515', border: '0.5px solid #f48771', borderRadius: 4, padding: 8, color: '#f48771', fontSize: 11, marginTop: 4 }}>
            ⚠ {error}
          </div>
        )}

        {suggestion && !loading && (
          <div style={{ background: '#1a1830', border: '0.5px solid #534AB7', borderRadius: 4, padding: 8, marginTop: 4 }}>
            <div style={{ color: '#888', fontSize: 10, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Răspuns AI</div>
            <div style={{ color: '#AFA9EC', fontSize: 11, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{suggestion}</div>
            <button onClick={() => setSuggestion(null)} style={{ background: 'transparent', border: 'none', color: '#555', fontSize: 11, cursor: 'pointer', marginTop: 8, padding: 0 }}>
              ✕ Închide
            </button>
          </div>
        )}
      </div>

      {/* Input area */}
      <div style={{ borderTop: '1px solid #111', padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
        {/* Toggle Edit / Chat */}
        <div style={{ display: 'flex', background: '#1e1e1e', borderRadius: 4, overflow: 'hidden', alignSelf: 'flex-start' }}>
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
            style={{ flex: 1, background: '#1e1e1e', border: '1px solid #444', borderRadius: 4, padding: '5px 8px', color: '#fff', fontSize: 12, resize: 'none', outline: 'none', fontFamily: 'inherit' }}
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
