export default function LeftSidebar({ files, activeFileId, onFileSelect, onNewFile, onDeleteFile }) {
  const icons = {
    py: '🐍', js: '📜', jsx: '⚛️', tsx: '⚛️', ts: '📘',
    html: '🌐', css: '🎨', cpp: '⚙️', c: '⚙️', rs: '🦀', go: '🐹',
    json: '📋', md: '📝', txt: '📄',
  }

  function getIcon(filename) {
    const ext = filename?.split('.').pop()
    return icons[ext] || '📄'
  }

  return (
    <div style={{ width: 180, background: '#252526', borderRight: '1px solid #111', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
      <div style={{ padding: '8px 10px' }}>
        <div style={{ color: '#888', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Fișiere</div>

        {files.map(f => (
          <div
            key={f.id}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 6px', borderRadius: 4, background: activeFileId === f.id ? '#2d2d2d' : 'transparent', cursor: 'pointer' }}
          >
            <div onClick={() => onFileSelect(f)} style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, overflow: 'hidden' }}>
              <span style={{ fontSize: 12 }}>{getIcon(f.name)}</span>
              <span style={{ color: activeFileId === f.id ? '#fff' : '#ccc', fontSize: 12, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
            </div>
            <span
              onClick={(e) => { e.stopPropagation(); onDeleteFile(f.id) }}
              style={{ color: '#666', fontSize: 14, padding: '0 2px', lineHeight: 1 }}
              title="Șterge"
            >×</span>
          </div>
        ))}

        <div onClick={onNewFile} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 6px', borderRadius: 4, cursor: 'pointer', marginTop: 4 }}>
          <span style={{ color: '#888', fontSize: 14 }}>+</span>
          <span style={{ color: '#888', fontSize: 12 }}>Fișier nou</span>
        </div>
      </div>
    </div>
  )
}
