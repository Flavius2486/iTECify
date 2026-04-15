export default function CodeScanModal({ issues, onRunAnyway, onCancel }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}>
      <div style={{ background: '#252526', border: '1px solid #444', borderRadius: 8, padding: 24, width: 420, maxHeight: '80vh', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>⚠️</span>
          <span style={{ color: '#f48771', fontWeight: 500, fontSize: 14 }}>AI a detectat probleme în cod</span>
        </div>

        <div style={{ overflowY: 'auto', maxHeight: 300, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {issues.map((issue, i) => (
            <div key={i} style={{ background: '#1e1e1e', borderRadius: 4, padding: '8px 12px', borderLeft: `3px solid ${issue.severity === 'error' ? '#f48771' : '#dcdcaa'}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ color: issue.severity === 'error' ? '#f48771' : '#dcdcaa', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>
                  {issue.severity === 'error' ? '✕ Eroare' : '⚠ Avertisment'}
                </span>
                {issue.line && (
                  <span style={{ color: '#569cd6', fontSize: 11, fontFamily: 'monospace', background: '#0d1117', padding: '1px 6px', borderRadius: 3 }}>
                    Linia {issue.line}
                  </span>
                )}
              </div>
              {issue.lineContent && (
                <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#888', background: '#0d1117', padding: '3px 8px', borderRadius: 3, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {issue.lineContent}
                </div>
              )}
              <div style={{ color: '#ccc', fontSize: 13 }}>{issue.message}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{ background: '#3c3c3c', color: '#ccc', border: 'none', padding: '8px 16px', borderRadius: 4, cursor: 'pointer', fontSize: 13 }}
          >
            Anulează
          </button>
          <button
            onClick={onRunAnyway}
            style={{ background: '#534AB7', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 4, cursor: 'pointer', fontSize: 13 }}
          >
            Rulează oricum
          </button>
        </div>
      </div>
    </div>
  )
}
