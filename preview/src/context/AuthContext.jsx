import React, { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const saved = sessionStorage.getItem('gm_user')
    if (saved) {
      try { setUser(JSON.parse(saved)) } catch (_) {}
    }
    setLoading(false)
  }, [])

  const login = async (username, password) => {
    const res = await window.api.login({ username, password })
    if (res.success) {
      setUser(res.user)
      sessionStorage.setItem('gm_user', JSON.stringify(res.user))
    }
    return res
  }

  const logout = () => {
    setUser(null)
    sessionStorage.removeItem('gm_user')
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, isAdmin: user?.role === 'admin' }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
