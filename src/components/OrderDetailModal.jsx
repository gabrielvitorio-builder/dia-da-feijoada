import { STATUS_OPTIONS } from '../lib/orders.js'
import { formatBRL } from '../lib/products'
import StatusBadge from './StatusBadge.jsx'

export default function OrderDetailModal({ order, onClose, onStatusChange, updating }) {
  if (!order) return null

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3 style={{ fontSize: 18 }}>{order.numero}</h3>
          <button className="btn btn--outline btn--sm" onClick={onClose}>
            Fechar
          </button>
        </div>

        <StatusBadge status={order.status} />

        <div style={{ marginTop: 16 }}>
          <Row label="Cliente" value={order.nome} />
          <Row label="WhatsApp" value={order.whatsapp} />
          <Row label="Feijoada P" value={order.feijoadaP} />
          <Row label="Feijoada G" value={order.feijoadaG} />
          <Row label="Suco Maracujá" value={order.sucoMaracuja} />
          <Row label="Suco Laranja" value={order.sucoLaranja} />
          <Row label="Suco Abacaxi" value={order.sucoAbacaxi} />
          <Row label="Suco Goiaba" value={order.sucoGoiaba} />
          <Row label="Total" value={formatBRL(order.total)} />
          <Row label="Pagamento" value={order.pagamento} />
          {order.precisaTroco ? <Row label="Troco para" value={order.trocoPara} /> : null}
          <Row label="Entrega" value={order.entrega === 'delivery' ? 'Delivery' : 'Retirada'} />
          <Row label="Horário" value={order.horario} />
          {order.entrega === 'delivery' && (
            <>
              <Row label="Endereço" value={order.endereco} />
              <Row label="Referência" value={order.referencia || '—'} />
            </>
          )}
          <Row label="Criado em" value={order.dataHora} />
        </div>

        <div className="field" style={{ marginTop: 18 }}>
          <label htmlFor="status">Alterar status</label>
          <select
            id="status"
            value={order.status}
            disabled={updating}
            onChange={(e) => onStatusChange(order.numero, e.target.value)}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="summary-line">
      <span style={{ color: 'var(--muted)' }}>{label}</span>
      <span style={{ fontWeight: 700, textAlign: 'right', maxWidth: '60%' }}>{value ?? '—'}</span>
    </div>
  )
}
