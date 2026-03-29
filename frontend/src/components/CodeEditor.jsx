import { Editor } from '@monaco-editor/react'
import { useState, useEffect, useRef } from 'react'
import { useCollaboration } from '../hooks/useCollaboration'
import { getUser } from '../services/auth'

export default function CodeEditor({ roomId, fileId, code, language, onChange, diffCode, onAccept, onReject, onErrorsChange, colorMap = {}, myId, aiLines = [], onAiLinesChange }) {
  const [editor, setEditor] = useState(null)
  const me = getUser()
  const myColor = colorMap[myId]
  const myUsername = me?.username
  const { setContent, provider } = useCollaboration(editor, roomId, fileId, myColor, myUsername, code)
  const decorationsRef = useRef([])
  const cursorDecorationsRef = useRef([])
  const aiDecorationsRef = useRef([])
  const originalCodeRef = useRef(code)

  // Culoarea cursorului propriu
  useEffect(() => {
    if (!editor || !myColor) return
    let styleEl = document.getElementById('my-cursor-style')
    if (!styleEl) {
      styleEl = document.createElement('style')
      styleEl.id = 'my-cursor-style'
      document.head.appendChild(styleEl)
    }
    styleEl.textContent = `
      .monaco-editor .cursor { background-color: ${myColor} !important; border-color: ${myColor} !important; }
    `
  }, [editor, myColor])

  // Cursoare colaboratori din awareness
  useEffect(() => {
    if (!editor || !provider?.current) return
    const awareness = provider.current.awareness
    const widgets = new Map()

    if (!document.getElementById('remote-cursor-style')) {
      const style = document.createElement('style')
      style.id = 'remote-cursor-style'
      style.textContent = `
        .remote-cursor-widget {
          width: 2px !important;
          height: 1.2em !important;
          display: inline-block !important;
          position: relative !important;
          animation: cursorBlink 1s step-start infinite;
          pointer-events: none;
          z-index: 100;
        }
        @keyframes cursorBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        .remote-cursor-label {
          position: absolute;
          top: -18px;
          left: 0;
          font-size: 10px;
          padding: 1px 4px;
          border-radius: 3px;
          white-space: nowrap;
          pointer-events: none;
          color: #000;
          font-family: sans-serif;
        }
      `
      document.head.appendChild(style)
    }

    function updateCursors() {
      widgets.forEach((w) => editor.removeContentWidget(w))
      widgets.clear()

      awareness.getStates().forEach((state, clientId) => {
        if (clientId === awareness.clientID) return
        const cursor = state.cursor
        const color = state.user?.color || '#888'
        const username = state.user?.username || ''
        if (!cursor) return

        const domNode = document.createElement('div')
        domNode.className = 'remote-cursor-widget'
        domNode.style.background = color

        if (username) {
          const label = document.createElement('div')
          label.className = 'remote-cursor-label'
          label.style.background = color
          label.textContent = username
          domNode.appendChild(label)
        }

        const widget = {
          getId: () => `remote-cursor-${clientId}`,
          getDomNode: () => domNode,
          getPosition: () => ({
            position: { lineNumber: cursor.line, column: cursor.column },
            preference: [0],
          }),
        }

        editor.addContentWidget(widget)
        widgets.set(clientId, widget)
      })
    }

    awareness.on('change', updateCursors)
    return () => {
      awareness.off('change', updateCursors)
      widgets.forEach((w) => editor.removeContentWidget(w))
    }
  }, [editor, provider?.current])

  // Aplică glyph ✨ pentru liniile scrise de AI + detectează ștergere
  useEffect(() => {
    if (!editor) return

    // Aplică decorations
    const applyDecorations = (lines) => {
      if (!lines.length) {
        aiDecorationsRef.current = editor.deltaDecorations(aiDecorationsRef.current, [])
        return
      }
      const decorations = lines.map(line => ({
        range: { startLineNumber: line, startColumn: 1, endLineNumber: line, endColumn: 1 },
        options: {
          glyphMarginClassName: 'ai-glyph-star',
          glyphMarginHoverMessage: { value: '✨ Scris de AI' },
          stickiness: 2,
        },
      }))
      aiDecorationsRef.current = editor.deltaDecorations(aiDecorationsRef.current, decorations)
    }

    applyDecorations(aiLines)

    // Detectăm când o linie AI e modificată sau ștearsă
    const disposable = editor.onDidChangeModelContent(() => {
      const model = editor.getModel()
      if (!model) return
      const totalLines = model.getLineCount()
      const surviving = aiLines.filter(line => {
        if (line > totalLines) return false
        // Linia există dar verificăm dacă mai are conținut non-gol
        const content = model.getLineContent(line)
        return content.trim().length > 0
      })
      if (surviving.length !== aiLines.length) {
        onAiLinesChange?.(fileId, surviving)
      }
    })

    return () => disposable.dispose()
  }, [editor, aiLines])
  useEffect(() => {
    if (!editor) return
    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, [])
    if (!diffCode) return

    const model = editor.getModel()
    if (!model) return
    originalCodeRef.current = model.getValue()

    const originalLines = originalCodeRef.current.split('\n')
    const modifiedLines = diffCode.split('\n')
    const newDecorations = []
    const maxLen = Math.max(originalLines.length, modifiedLines.length)
    for (let i = 0; i < maxLen; i++) {
      if (originalLines[i] === modifiedLines[i]) continue
      newDecorations.push({
        range: { startLineNumber: i + 1, startColumn: 1, endLineNumber: i + 1, endColumn: 1 },
        options: { isWholeLine: true, className: 'diff-added-line' },
      })
    }

    if (model.getValue() !== diffCode) model.setValue(diffCode)
    decorationsRef.current = editor.deltaDecorations([], newDecorations)
  }, [diffCode, editor])

  function handleMount(ed, monaco) {
    setEditor(ed)
    monaco.editor.onDidChangeMarkers(() => {
      const model = ed.getModel()
      if (!model) return
      const markers = monaco.editor.getModelMarkers({ resource: model.uri })
      const hasErrors = markers.some(m => m.severity === monaco.MarkerSeverity.Error)
      onErrorsChange?.(fileId, hasErrors)
    })
    ed.onDidChangeCursorPosition((e) => {
      if (!provider?.current) return
      provider.current.awareness.setLocalStateField('cursor', {
        line: e.position.lineNumber,
        column: e.position.column,
      })
    })
  }

  function handleAccept() {
    if (!editor || !diffCode) { onAccept?.(); return }
    if (setContent) setContent(diffCode)
    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, [])
    onAccept?.()
  }

  function handleReject() {
    const model = editor?.getModel()
    if (model) model.setValue(originalCodeRef.current)
    decorationsRef.current = editor?.deltaDecorations(decorationsRef.current, []) || []
    onReject?.()
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {diffCode !== null && diffCode !== undefined && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 14px', background: '#1a1a2e', borderBottom: '1px solid #333', flexShrink: 0 }}>
          <span style={{ color: '#CECBF6', fontSize: 12 }}>✨ Propunere AI — verifică modificările</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleAccept} style={{ background: '#1a3a1a', color: '#4ec94e', border: '1px solid #2d5a2d', borderRadius: 4, padding: '4px 16px', fontSize: 12, cursor: 'pointer' }}>
              ✓ Acceptă
            </button>
            <button onClick={handleReject} style={{ background: '#3a1a1a', color: '#f48771', border: '1px solid #5a2d2d', borderRadius: 4, padding: '4px 16px', fontSize: 12, cursor: 'pointer' }}>
              ✕ Respinge
            </button>
          </div>
        </div>
      )}

      <style>{`
        .diff-added-line { background: rgba(40, 120, 40, 0.25) !important; }
        .ai-glyph-star::before { content: '✨'; font-size: 11px; line-height: 1; }
      `}</style>

      <Editor
        height="100%"
        language={language}
        value={code}
        theme="vs-dark"
        onMount={handleMount}
        onChange={diffCode ? undefined : onChange}
        options={{
          fontSize: 14,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          readOnly: !!diffCode,
          glyphMargin: true,
        }}
      />
    </div>
  )
}
