import { Editor } from '@monaco-editor/react'
import { useState, useEffect, useRef } from 'react'
import { useCollaboration } from '../hooks/useCollaboration'

export default function CodeEditor({ roomId, fileId, code, language, onChange, diffCode, onAccept, onReject }) {
  const [editor, setEditor] = useState(null)
  const { setContent } = useCollaboration(editor, roomId, fileId)
  const decorationsRef = useRef([])
  const originalCodeRef = useRef(code)

  // Aplică diff când diffCode se schimbă
  useEffect(() => {
    if (!editor) return

    // Curăță decorations vechi
    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, [])

    if (!diffCode) return

    // Salvăm codul curent din model ÎNAINTE de a aplica diff-ul
    const model = editor.getModel()
    if (!model) return
    originalCodeRef.current = model.getValue()

    const originalLines = originalCodeRef.current.split('\n')
    const modifiedLines = diffCode.split('\n')
    const newDecorations = []

    const maxLen = Math.max(originalLines.length, modifiedLines.length)
    for (let i = 0; i < maxLen; i++) {
      const orig = originalLines[i]
      const mod = modifiedLines[i]
      if (orig === mod) continue
      newDecorations.push({
        range: { startLineNumber: i + 1, startColumn: 1, endLineNumber: i + 1, endColumn: 1 },
        options: { isWholeLine: true, className: 'diff-added-line' },
      })
    }

    if (model.getValue() !== diffCode) {
      model.setValue(diffCode)
    }

    decorationsRef.current = editor.deltaDecorations([], newDecorations)
  }, [diffCode, editor])

  function handleMount(ed) {
    setEditor(ed)
  }

  function handleAccept() {
    if (setContent && diffCode) setContent(diffCode)
    decorationsRef.current = editor?.deltaDecorations(decorationsRef.current, []) || []
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
        }}
      />
    </div>
  )
}
