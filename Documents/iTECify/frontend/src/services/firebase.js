import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyCvYwV_ZKYY_I-JpFZ-9flK-OyUX91WLWs",
  authDomain: "collaborative-ide-dd51f.firebaseapp.com",
  projectId: "collaborative-ide-dd51f",
  storageBucket: "collaborative-ide-dd51f.firebasestorage.app",
  messagingSenderId: "205378753209",
  appId: "1:205378753209:web:f8514eb9ba3b878b150168"
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)