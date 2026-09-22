import { formatBRL } from '../lib/products'

export default function StickyCartBar({ totalItems, total, onNext, label = 'Continuar', disabled }) {
  if (totalItems === 0) return null
  return (
    <div className="sticky-bar">
      <button className="btn btn--primary" onClick={onNext} disabled={disabled}>
        <span>{label}</span>
        <span>· {totalItems} {totalItems === 1 ? 'item' : 'itens'} · {formatBRL(total)}</span>
      </button>
    </div>
  )
}
