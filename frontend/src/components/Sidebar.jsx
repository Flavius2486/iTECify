export default function LeftSidebar({ files, activeFile, onFileSelect, onNewFile }) {
  const icons = { py: '🐍', js: '📜', jsx: '⚛️', html: '🌐', css: '🎨', cpp: '⚙️' }

  function getIcon(filename) {
    const ext = filename.split('.').pop()
    return icons[ext] || '📄'
  }

  return (
    <div style={{ width:180, background:'#252526', borderRight:'1px solid #111', display:'flex', flexDirection:'column' }}>
      
      {/* Fisiere */}
      <div style={{ padding:'8px 10px', borderBottom:'1px solid #111' }}>
        <div style={{ color:'#888', fontSize:10, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:6 }}>Fișiere</div>
        
        {files.map(f => (
          <div
            key={f.name}
            onClick={() => onFileSelect(f.name)}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'4px 6px', borderRadius:4, cursor:'pointer', background: activeFile === f.name ? '#2d2d2d' : 'transparent' }}
          >
            <span style={{ fontSize:12 }}>{getIcon(f.name)}</span>
            <span style={{ color: activeFile === f.name ? '#fff' : '#ccc', fontSize:12, fontFamily:'monospace' }}>{f.name}</span>
          </div>
        ))}

        <div
          onClick={onNewFile}
          style={{ display:'flex', alignItems:'center', gap:6, padding:'4px 6px', borderRadius:4, cursor:'pointer', marginTop:4 }}
        >
          <span style={{ color:'#888', fontSize:14 }}>+</span>
          <span style={{ color:'#888', fontSize:12 }}>Fișier nou</span>
        </div>
      </div>

      {/* Colaboratori */}
      <div style={{ padding:'8px 10px' }}>
        <div style={{ color:'#888', fontSize:10, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:6 }}>Colaboratori</div>
        <div style={{ color:'#666', fontSize:12 }}>Se încarcă...</div>
      </div>
    </div>
  )
}