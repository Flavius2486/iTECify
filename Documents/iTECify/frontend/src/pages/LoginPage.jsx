import { useState } from 'react'
import { auth } from '../services/firebase'
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth'

const provider = new GoogleAuthProvider()

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  async function handleLogin() {
    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch (e) {
      setError('Email sau parolă greșită')
    }
  }

  async function handleRegister() {
    try {
      await createUserWithEmailAndPassword(auth, email, password)
    } catch (e) {
      setError('Eroare la înregistrare')
    }
  }

  async function handleGoogle() {
    try {
      await signInWithPopup(auth, provider)
    } catch (e) {
      setError('Eroare la login cu Google')
    }
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100vh', background:'#1e1e1e', gap:12 }}>
      <h2 style={{ color:'#fff', marginBottom:16 }}>ITECify</h2>

      {error && <p style={{ color:'#f48771' }}>{error}</p>}

      <input
        placeholder="Email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        style={{ padding:'8px 12px', borderRadius:4, border:'1px solid #444', background:'#2d2d2d', color:'#fff', width:260 }}
      />
      <input
        placeholder="Parolă"
        type="password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        style={{ padding:'8px 12px', borderRadius:4, border:'1px solid #444', background:'#2d2d2d', color:'#fff', width:260 }}
      />

      <button onClick={handleLogin} style={{ background:'#007acc', color:'#fff', border:'none', padding:'8px 0', borderRadius:4, width:260, cursor:'pointer' }}>
        Login
      </button>
      <button onClick={handleRegister} style={{ background:'#3c3c3c', color:'#fff', border:'none', padding:'8px 0', borderRadius:4, width:260, cursor:'pointer' }}>
        Înregistrare
      </button>
      <button onClick={handleGoogle} style={{ background:'#fff', color:'#333', border:'none', padding:'8px 0', borderRadius:4, width:260, cursor:'pointer' }}>
        Login cu Google
      </button>
    </div>
  )
}