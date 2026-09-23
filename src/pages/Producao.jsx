import { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAdminAuth } from '../context/AdminAuthContext.jsx'
import { getOrders, ApiError } from '../lib/api.js'
import { summarizeOrders } from '../lib/orders.js'
import { formatBRL } from '../lib/products'

const REFRESH_MS = 15000

export default function Producao() {
  const { token, logout } = useAdminAuth()
  const navigate = useNavigate()
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setLoading(true)
      try {
        const data = await getOrders(token)
        setSummary(summarizeOrders(data.orders || []))
      } catch (err) {
        if (err instanceof ApiError && err.code === 'UNAUTHORIZED') {
          logout()
          navigate('/admin', { replace: true })
        }
      } finally {
        if (!silent) setLoading(false)
      }
    },
    [token, logout, navigate]
  )

  useEffect(() => {
    load()
    const id = setInterval(() => load({ silent: true }), REFRESH_MS)
    return () => clearInterval(id)
  }, [load])

  return (
    <div className="app-shell">
      <div className="hero" style={{ borderRadius: '0 0 22px 22px', paddingBottom: 22 }}>
        <div className="top-nav">
          <Link to="/admin/painel" className="top-nav__back">
            ←
          </Link>
          <div>
            <p className="hero__eyebrow" style={{ marginBottom: 0 }}>
              Cozinha
            </p>
            <h2 style={{ fontSize: 22, color: 'var(--yellow)', fontFamily: "'Fraunces', serif" }}>Produção</h2>
          </div>
        </div>
      </div>

      {loading && <div className="section">Carregando...</div>}

      {!loading && summary && (
        <div className="section" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <ProductionCard label="Feijoada P" value={summary.feijoadaP} icon="P" iconClass="icon--p" />
          <ProductionCard label="Feijoada G" value={summary.feijoadaG} icon="G" iconClass="icon--g" />
          <ProductionCard label="Suco Maracujá" value={summary.sucoMaracuja} icon="🥤" iconClass="icon--suco" />
          <ProductionCard label="Suco Laranja" value={summary.sucoLaranja} icon="🥤" iconClass="icon--suco" />
          <ProductionCard label="Suco Abacaxi" value={summary.sucoAbacaxi} icon="🥤" iconClass="icon--suco" />
          <ProductionCard label="Suco Goiaba" value={summary.sucoGoiaba} icon="🥤" iconClass="icon--suco" />

          <div className="card card--cream" style={{ marginTop: 4 }}>
            <div className="summary-line">
              <span>Total de pedidos</span>
              <strong>{summary.totalPedidos}</strong>
            </div>
            <div className="summary-line">
              <span>Faturamento</span>
              <strong>{formatBRL(summary.faturamento)}</strong>
            </div>
            <div className="summary-line">
              <span>Delivery / Retirada</span>
              <strong>
                {summary.delivery} / {summary.retirada}
              </strong>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ProductionCard({ label, value, icon, iconClass }) {
  return (
    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <div className={`product-row__icon ${iconClass}`} style={{ width: 52, height: 52, fontSize: 20 }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 700 }}>{label}</div>
        <div style={{ fontFamily: "'Fraunces', serif", fontSize: 30, fontWeight: 800 }}>{value}</div>
      </div>
    </div>
  )
}
