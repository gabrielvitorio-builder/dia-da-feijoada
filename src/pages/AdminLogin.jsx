import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminLogin, ApiError } from '../lib/api.js'
import { useAdminAuth } from '../context/AdminAuthContext.jsx'

export default function AdminLogin() {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { login, isAuthed } = useAdminAuth()
  const navigate = useNavigate()

  if (isAuthed) {
    navigate('/admin/painel', { replace: true })
    return null
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (loading) return
    setLoading(true)
    setError('')
    try {
      const result = await adminLogin(password)
      login(result.token)
      navigate('/admin/painel', { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível entrar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app-shell" style={{ justifyContent: 'center' }}>
      <div className="section">
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40 }}>🔐</div>
          <h2 style={{ fontSize: 20, margin: '8px 0 4px' }}>Área administrativa</h2>
          <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 20 }}>
            Dia da Feijoada — Joias de Cristo
          </p>
          <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
            <div className={`field ${error ? 'field--error' : ''}`}>
              <label htmlFor="senha">Senha de acesso</label>
              <input
                id="senha"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
              />
              {error && <div className="field__error">{error}</div>}
            </div>
            <button className="btn btn--dark" type="submit" disabled={loading || !password}>
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
