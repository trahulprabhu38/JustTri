import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { api, AuthError } from './api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [state, setState] = useState({ loading: true, user: null, stravaConfigured: false, stravaConnected: false })

  const refresh = useCallback(async () => {
    try {
      const me = await api.me()
      setState({ loading: false, user: me.user, stravaConfigured: me.stravaConfigured, stravaConnected: me.stravaConnected })
    } catch (e) {
      if (e instanceof AuthError) setState({ loading: false, user: null, stravaConfigured: false, stravaConnected: false })
      else setState((s) => ({ ...s, loading: false }))
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const logout = useCallback(async () => {
    await api.logout().catch(() => {})
    setState({ loading: false, user: null, stravaConfigured: false, stravaConnected: false })
  }, [])

  return <AuthContext.Provider value={{ ...state, refresh, logout }}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
