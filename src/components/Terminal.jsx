export default function Terminal() {
  return (
    <div style={{ background: '#121212', color: '#00ff00', height: '100%', padding: '20px', fontFamily: 'monospace', fontSize: '14px', borderLeft: '2px solid #333' }}>
      <div style={{ color: '#888', marginBottom: '10px' }}>// Terminal Output</div>
      <div>$ python main.py</div>
      <div style={{ color: 'white' }}>Hello World!</div>
      <div style={{ marginTop: '10px', color: '#444' }}>_</div>
    </div>
  );
}