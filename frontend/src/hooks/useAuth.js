import { useState, useEffect } from 'react'
import { getUser, isAuthenticated } from '../services/auth'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isAuthenticated()) {
      setUser(getUser())
    }
    setLoading(false)
  }, [])

  return { user, loading, setUser }
}
