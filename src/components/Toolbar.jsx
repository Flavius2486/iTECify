export default function Toolbar() {
  return (
    <div style={{ height: '50px', background: '#2d2d2d', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', borderBottom: '1px solid #444', color: 'white' }}>
      <div style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>DevSync <span style={{color: '#4CAF50'}}>IDE</span></div>
      <div style={{ display: 'flex', gap: '15px' }}>
        <select style={{ background: '#3c3c3c', color: 'white', border: '1px solid #555', padding: '5px 10px', borderRadius: '4px' }}>
          <option>Python</option>
          <option>JavaScript</option>
          <option>C++</option>
        </select>
        <button style={{ background: '#4CAF50', color: 'white', border: 'none', padding: '6px 20px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
          ▶ RUN
        </button>
      </div>
    </div>
  );
}