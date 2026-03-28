import { useState } from 'react'

export default function AIPanel({ code, language }) {
  const [loading, setLoading] = useState(false)
  const [suggestion, setSuggestion] = useState(null)
  const [error, setError] = useState(null)

  async function handleAI(prompt) {
    setLoading(true)
    setSuggestion(null)
    setError(null)

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_GROQ_KEY}`
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [{
            role: 'user',
            content: `${prompt}\n\nLimbaj: ${language}\n\nCod:\n\`\`\`${language}\n${code}\n\`\`\``
          }]
        })
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error?.message || 'Eroare API')
      }

      const data = await response.json()
      setSuggestion(data.choices[0].message.content)
    } catch (e) {
      setError(e.message || 'Eroare la AI')
    }

    setLoading(false)
  }

  return (
    <div style={{
      width: 240,
      background: '#252526',
      borderLeft: '1px solid #111',
      display: 'flex',
      flexDirection: 'column',
      padding: 10,
      gap: 8,
      overflowY: 'auto'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span style={{ fontSize: 14 }}>✨</span>
        <span style={{ color: '#CECBF6', fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          AI Assistant
        </span>
      </div>

      <button
        onClick={() => handleAI('Corectează erorile din acest cod și explică ce ai schimbat. Răspunde în română.')}
        disabled={loading}
        style={{ background: '#534AB7', color: '#CECBF6', border: 'none', padding: '7px 0', borderRadius: 4, fontSize: 12, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
      >
        ✨ Corectează codul
      </button>

      <button
        onClick={() => handleAI('Explică ce face acest cod pas cu pas, pe înțelesul unui începător. Răspunde în română.')}
        disabled={loading}
        style={{ background: '#3c3c3c', color: '#ccc', border: 'none', padding: '7px 0', borderRadius: 4, fontSize: 12, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
      >
        🔍 Explică codul
      </button>

      <button
        onClick={() => handleAI('Optimizează acest cod pentru performanță mai bună și explică îmbunătățirile. Răspunde în română.')}
        disabled={loading}
        style={{ background: '#3c3c3c', color: '#ccc', border: 'none', padding: '7px 0', borderRadius: 4, fontSize: 12, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
      >
        ⚙️ Optimizează
      </button>

      <button
        onClick={() => handleAI('Adaugă comentarii clare și documentație la acest cod. Răspunde în română.')}
        disabled={loading}
        style={{ background: '#3c3c3c', color: '#ccc', border: 'none', padding: '7px 0', borderRadius: 4, fontSize: 12, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
      >
        📝 Documentează
      </button>

      <button
        onClick={() => handleAI('Scrie teste unitare pentru acest cod. Răspunde în română.')}
        disabled={loading}
        style={{ background: '#3c3c3c', color: '#ccc', border: 'none', padding: '7px 0', borderRadius: 4, fontSize: 12, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
      >
        🧪 Generează teste
      </button>

      {loading && (
        <div style={{ color: '#888', fontSize: 12, padding: '4px 0' }}>
          ⏳ Se gândește...
        </div>
      )}

      {error && (
        <div style={{ background: '#2a1515', border: '0.5px solid #f48771', borderRadius: 4, padding: 8 }}>
          <div style={{ color: '#f48771', fontSize: 11 }}>⚠ {error}</div>
        </div>
      )}

      {suggestion && !loading && (
        <div style={{ background: '#1a1830', border: '0.5px solid #534AB7', borderRadius: 4, padding: 8, marginTop: 4 }}>
          <div style={{ color: '#888', fontSize: 10, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Răspuns AI
          </div>
          <div style={{ color: '#AFA9EC', fontSize: 11, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
            {suggestion}
          </div>
          <button
            onClick={() => setSuggestion(null)}
            style={{ background: 'transparent', border: 'none', color: '#555', fontSize: 11, cursor: 'pointer', marginTop: 8, padding: 0 }}
          >
            ✕ Închide
          </button>
        </div>
      )}
    </div>
  )
}