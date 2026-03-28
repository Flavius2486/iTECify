export default function Toolbar() {
  return (
    <div style={{ height: '50px', background: '#2d2d2d', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', borderBottom: '1px solid #444', color: 'white' }}>
<span style={{ color:'#fff', fontWeight:500, fontSize:14 }}>
  ITECify 
</span>
      <div style={{ display: 'flex', gap: '15px' }}>

        <button style={{ background: '#4CAF50', color: 'white', border: 'none', padding: '6px 20px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
          ▶ RUN
        </button>
      </div>
    </div>
  );
}