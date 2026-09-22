import { createContext, useCallback, useContext, useState } from 'react'

const STORAGE_KEY = 'feijoada_admin_session'
const AdminAuthContext = createContext(null)

function loadSession() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    // sessão expira em 6h, mesmo tempo do token no servidor (CacheService)
    if (Date.now() - parsed.createdAt > 6 * 60 * 60 * 1000) return null
    return parsed
  } catch {
    return null
  }
}

export function AdminAuthProvider({ children }) {
  const [session, setSession] = useState(loadSession)

  const login = useCallback((token) => {
    const next = { token, createdAt: Date.now() }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    setSession(next)
  }, [])

  const logout = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY)
    setSession(null)
  }, [])

  return (
    <AdminAuthContext.Provider value={{ token: session?.token || null, isAuthed: !!session, login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  )
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext)
  if (!ctx) throw new Error('useAdminAuth precisa estar dentro de <AdminAuthProvider>')
  return ctx
}
