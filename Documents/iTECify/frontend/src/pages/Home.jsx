import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth, db } from '../services/firebase'
import { signOut } from 'firebase/auth'
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore'

export default function Home() {
  const [roomId, setRoomId] = useState('')
  const [roomName, setRoomName] = useState('')
  const [rooms, setRooms] = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    loadRooms()
  }, [])

  async function loadRooms() {
    const q = query(
      collection(db, 'rooms'),
      where('members', 'array-contains', auth.currentUser.uid)
    )
    const snap = await getDocs(q)
    setRooms(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  }

  async function handleCreate() {
    if (!roomName.trim()) return
    const newRoom = Math.random().toString(36).substring(2, 8)
    await addDoc(collection(db, 'rooms'), {
      roomId: newRoom,
      name: roomName,
      members: [auth.currentUser.uid],
      createdAt: serverTimestamp()
    })
    navigate(`/room/${newRoom}`)
  }

  async function handleJoin() {
    if (!roomId.trim()) return
    navigate(`/room/${roomId}`)
  }

  async function handleLogout() {
    await signOut(auth)
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100vh', background:'#1e1e1e', gap:16 }}>
     <h1 style={{ color:'#fff', fontSize:32 }}>ITECify <span style={{ color:'#4CAF50' }}>IDE</span></h1>
      <p style={{ color:'#888' }}>Colaborare live în timp real</p>

      <div style={{ display:'flex', gap:24, alignItems:'flex-start', marginTop:16 }}>

        {/* Roomuri anterioare */}
        <div style={{ background:'#252526', padding:24, borderRadius:8, width:280 }}>
          <p style={{ color:'#ccc', fontSize:14, marginBottom:12, fontWeight:500 }}>Roomurile mele</p>
          {rooms.length === 0 && <p style={{ color:'#666', fontSize:13 }}>Nu ai roomuri încă</p>}
          {rooms.map(r => (
            <div
              key={r.id}
              onClick={() => navigate(`/room/${r.roomId}`)}
              style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 10px', borderRadius:4, cursor:'pointer', background:'#2d2d2d', marginBottom:6 }}
            >
              <div>
                <p style={{ color:'#fff', fontSize:13, margin:0 }}>{r.name}</p>
                <p style={{ color:'#888', fontSize:11, margin:0, fontFamily:'monospace' }}>{r.roomId}</p>
              </div>
              <span style={{ color:'#4CAF50', fontSize:12 }}>→</span>
            </div>
          ))}
        </div>

        {/* Actiuni */}
        <div style={{ background:'#252526', padding:24, borderRadius:8, width:280, display:'flex', flexDirection:'column', gap:12 }}>
          <p style={{ color:'#ccc', fontSize:14, fontWeight:500 }}>Creează room nou</p>
          <input
            placeholder="Nume room (ex: Proiect iTEC)"
            value={roomName}
            onChange={e => setRoomName(e.target.value)}
            style={{ padding:'8px 12px', borderRadius:4, border:'1px solid #444', background:'#2d2d2d', color:'#fff', fontSize:13 }}
          />
          <button onClick={handleCreate} style={{ background:'#4CAF50', color:'#fff', border:'none', padding:'8px 0', borderRadius:4, cursor:'pointer' }}>
            Creează
          </button>

          <hr style={{ border:'none', borderTop:'1px solid #444', margin:'4px 0' }} />

          <p style={{ color:'#ccc', fontSize:14, fontWeight:500 }}>Intră în room existent</p>
          <input
            placeholder="Room ID (ex: abc123)"
            value={roomId}
            onChange={e => setRoomId(e.target.value)}
            style={{ padding:'8px 12px', borderRadius:4, border:'1px solid #444', background:'#2d2d2d', color:'#fff', fontSize:13 }}
          />
          <button onClick={handleJoin} style={{ background:'#007acc', color:'#fff', border:'none', padding:'8px 0', borderRadius:4, cursor:'pointer' }}>
            Intră
          </button>

          <hr style={{ border:'none', borderTop:'1px solid #444', margin:'4px 0' }} />

          <button onClick={handleLogout} style={{ background:'transparent', color:'#888', border:'1px solid #444', padding:'8px 0', borderRadius:4, cursor:'pointer' }}>
            Logout
          </button>
        </div>
      </div>
    </div>
  )
}