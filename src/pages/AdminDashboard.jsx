import { useEffect, useMemo, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAdminAuth } from '../context/AdminAuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { getOrders, updateOrderStatus, ApiError } from '../lib/api.js'
import { STATUS_OPTIONS, exportOrdersToCsv, summarizeOrders } from '../lib/orders.js'
import { formatBRL } from '../lib/products'
import StatusBadge from '../components/StatusBadge.jsx'
import OrderDetailModal from '../components/OrderDetailModal.jsx'

const REFRESH_MS = 20000

export default function AdminDashboard() {
  const { token, logout } = useAdminAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()

  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('todos')
  const [entregaFilter, setEntregaFilter] = useState('todos')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [updating, setUpdating] = useState(false)

  const loadOrders = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setLoading(true)
      try {
        const data = await getOrders(token)
        setOrders(data.orders || [])
        setError('')
      } catch (err) {
        if (err instanceof ApiError && err.code === 'UNAUTHORIZED') {
          logout()
          navigate('/admin', { replace: true })
          return
        }
        setError(err instanceof ApiError ? err.message : 'Não foi possível carregar os pedidos.')
      } finally {
        if (!silent) setLoading(false)
      }
    },
    [token, logout, navigate]
  )

  useEffect(() => {
    loadOrders()
    const id = setInterval(() => loadOrders({ silent: true }), REFRESH_MS)
    return () => clearInterval(id)
  }, [loadOrders])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return orders.filter((o) => {
      if (statusFilter !== 'todos' && o.status !== statusFilter) return false
      if (entregaFilter !== 'todos' && o.entrega !== entregaFilter) return false
      if (!term) return true
      return (
        o.numero?.toLowerCase().includes(term) ||
        o.nome?.toLowerCase().includes(term) ||
        o.whatsapp?.includes(term)
      )
    })
  }, [orders, search, statusFilter, entregaFilter])

  const summary = useMemo(() => summarizeOrders(orders), [orders])

  async function handleStatusChange(numero, status) {
    setUpdating(true)
    try {
      await updateOrderStatus(token, numero, status)
      setOrders((prev) => prev.map((o) => (o.numero === numero ? { ...o, status } : o)))
      setSelectedOrder((prev) => (prev && prev.numero === numero ? { ...prev, status } : prev))
      showToast('Status atualizado.')
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Não foi possível atualizar o status.', 'error')
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="admin-shell app-shell app-shell--wide">
      <div className="admin-header">
        <div>
          <h2 style={{ fontSize: 18, fontFamily: "'Fraunces', serif" }}>Dia da Feijoada — Admin</h2>
          <p style={{ fontSize: 12, opacity: 0.75 }}>Atualiza automaticamente a cada 20s</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link to="/producao" className="btn btn--sm btn--green" style={{ color: 'white' }}>
            Produção
          </Link>
          <button
            className="btn btn--sm btn--outline"
            style={{ color: 'white', borderColor: 'rgba(255,255,255,0.4)' }}
            onClick={() => {
              logout()
              navigate('/admin', { replace: true })
            }}
          >
            Sair
          </button>
        </div>
      </div>

      {error && (
        <div className="section">
          <div className="card" style={{ borderLeft: '4px solid var(--danger)' }}>
            <strong>Erro:</strong> {error}
          </div>
        </div>
      )}

      <div className="kpi-grid">
        <Kpi label="Total de pedidos" value={summary.totalPedidos} />
        <Kpi label="Faturamento" value={formatBRL(summary.faturamento)} />
        <Kpi label="Feijoada P" value={summary.feijoadaP} />
        <Kpi label="Feijoada G" value={summary.feijoadaG} />
        <Kpi label="Suco Maracujá" value={summary.sucoMaracuja} />
        <Kpi label="Suco Abacaxi" value={summary.sucoAbacaxi} />
        <Kpi label="Suco Goiaba" value={summary.sucoGoiaba} />
        <Kpi label="Delivery / Retirada" value={`${summary.delivery} / ${summary.retirada}`} />
      </div>

      <div className="toolbar">
        <input
          placeholder="Buscar por nome, número ou WhatsApp"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 200 }}
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="todos">Todos os status</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select value={entregaFilter} onChange={(e) => setEntregaFilter(e.target.value)}>
          <option value="todos">Retirada e delivery</option>
          <option value="retirada">Só retirada</option>
          <option value="delivery">Só delivery</option>
        </select>
        <button className="btn btn--dark btn--sm" onClick={() => exportOrdersToCsv(filtered)}>
          Exportar CSV
        </button>
        <button className="btn btn--outline btn--sm" onClick={() => loadOrders()}>
          Atualizar agora
        </button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nº</th>
              <th>Cliente</th>
              <th>WhatsApp</th>
              <th>Itens</th>
              <th>Total</th>
              <th>Entrega</th>
              <th>Horário</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={9}>Carregando pedidos...</td>
              </tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={9}>Nenhum pedido encontrado.</td>
              </tr>
            )}
            {!loading &&
              filtered.map((o) => (
                <tr key={o.numero}>
                  <td>{o.numero}</td>
                  <td>{o.nome}</td>
                  <td>{o.whatsapp}</td>
                  <td>
                    {[
                      o.feijoadaP ? `${o.feijoadaP}P` : null,
                      o.feijoadaG ? `${o.feijoadaG}G` : null,
                      o.sucoMaracuja ? `${o.sucoMaracuja} maracujá` : null,
                      o.sucoAbacaxi ? `${o.sucoAbacaxi} abacaxi` : null,
                      o.sucoGoiaba ? `${o.sucoGoiaba} goiaba` : null
                    ]
                      .filter(Boolean)
                      .join(', ')}
                  </td>
                  <td>{formatBRL(o.total)}</td>
                  <td>{o.entrega === 'delivery' ? 'Delivery' : 'Retirada'}</td>
                  <td>{o.horario}</td>
                  <td>
                    <StatusBadge status={o.status} />
                  </td>
                  <td>
                    <button className="btn btn--sm btn--outline" onClick={() => setSelectedOrder(o)}>
                      Detalhes
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <OrderDetailModal
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onStatusChange={handleStatusChange}
        updating={updating}
      />
    </div>
  )
}

function Kpi({ label, value }) {
  return (
    <div className="kpi-card">
      <div className="kpi-card__label">{label}</div>
      <div className="kpi-card__value">{value}</div>
    </div>
  )
}
