import { useMemo, useRef, useState } from 'react'
import { useCart } from '../context/CartContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { PRODUCTS, PRODUCT_MAP, formatBRL } from '../lib/products'
import { createOrder, ApiError } from '../lib/api.js'
import QuantityStepper from '../components/QuantityStepper.jsx'
import StickyCartBar from '../components/StickyCartBar.jsx'

const STEPS = ['produtos', 'dados', 'revisao', 'confirmacao']

function onlyDigits(str) {
  return (str || '').replace(/\D/g, '')
}

function formatWhatsappDisplay(digits) {
  const d = onlyDigits(digits)
  if (d.length <= 2) return d
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7, 11)}`
}

export default function OrderFlow() {
  const cart = useCart()
  const { showToast } = useToast()
  const [step, setStep] = useState(0)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [confirmedOrder, setConfirmedOrder] = useState(null)

  // A idempotency key é gerada uma vez por tentativa de pedido e reaproveitada
  // em retries, para o backend nunca gravar a mesma reserva duas vezes.
  const idempotencyKeyRef = useRef(null)

  function goTo(nextStep) {
    setStep(nextStep)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function validateCustomer() {
    const c = cart.customer
    const next = {}
    if (!c.nome.trim() || c.nome.trim().length < 2) next.nome = 'Informe seu nome completo.'
    if (onlyDigits(c.whatsapp).length < 10) next.whatsapp = 'Informe um WhatsApp válido com DDD.'
    if (!c.horario) next.horario = 'Escolha um horário.'
    if (c.pagamento === 'dinheiro' && c.precisaTroco) {
      const valor = Number(String(c.trocoPara).replace(',', '.'))
      if (!valor || valor <= cart.total) next.trocoPara = `Informe um valor maior que ${formatBRL(cart.total)}.`
    }
    if (c.entrega === 'delivery' && !c.endereco.trim()) next.endereco = 'Informe o endereço de entrega.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleConfirm() {
    if (submitting) return // trava contra duplo clique / envio duplicado
    if (!idempotencyKeyRef.current) {
      idempotencyKeyRef.current =
        (crypto.randomUUID && crypto.randomUUID()) || `${Date.now()}-${Math.random().toString(16).slice(2)}`
    }

    setSubmitting(true)
    try {
      const payload = {
        nome: cart.customer.nome.trim(),
        whatsapp: onlyDigits(cart.customer.whatsapp),
        entrega: cart.customer.entrega,
        horario: cart.customer.horario,
        pagamento: cart.customer.pagamento,
        precisaTroco: cart.customer.pagamento === 'dinheiro' ? cart.customer.precisaTroco : false,
        trocoPara: cart.customer.pagamento === 'dinheiro' && cart.customer.precisaTroco ? cart.customer.trocoPara : '',
        endereco: cart.customer.entrega === 'delivery' ? cart.customer.endereco.trim() : '',
        referencia: cart.customer.entrega === 'delivery' ? cart.customer.referencia.trim() : '',
        itens: Object.fromEntries(PRODUCTS.map((p) => [p.key, cart.quantities[p.key] || 0])),
        total: cart.total
      }

      const result = await createOrder(payload, idempotencyKeyRef.current)
      setConfirmedOrder({ numero: result.orderNumber, ...payload, total: cart.total })
      idempotencyKeyRef.current = null
      goTo(3)
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : 'Não conseguimos confirmar seu pedido agora. Tente novamente em instantes.'
      showToast(message, 'error', 5000)
      // idempotencyKeyRef mantém o mesmo valor: um retry não cria pedido duplicado
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="app-shell">
      <Header step={step} />

      {step === 0 && <StepProdutos cart={cart} onNext={() => goTo(1)} />}
      {step === 1 && (
        <StepDados
          cart={cart}
          errors={errors}
          onBack={() => goTo(0)}
          onNext={() => validateCustomer() && goTo(2)}
        />
      )}
      {step === 2 && (
        <StepRevisao cart={cart} onBack={() => goTo(1)} onConfirm={handleConfirm} submitting={submitting} />
      )}
      {step === 3 && confirmedOrder && (
        <StepConfirmacao
          order={confirmedOrder}
          onNewOrder={() => {
            cart.resetCart()
            setConfirmedOrder(null)
            goTo(0)
          }}
        />
      )}

      <footer className="footer-note">Joias de Cristo · Rua Passagem Will Durant, 130 · Guaianases — SP</footer>
    </div>
  )
}

function Header({ step }) {
  const titles = ['Escolha sua marmita', 'Seus dados', 'Revise seu pedido', 'Pedido confirmado']
  return (
    <div className="hero">
      <div className="hero__badge">
        26/09
        <strong>Sáb</strong>
      </div>
      <p className="hero__eyebrow">Dia da</p>
      <h1 className="hero__title">Feijoada</h1>
      <p className="hero__meta">A partir das 11h · {titles[step]}</p>
      {step < 3 && (
        <div className="progress-dots">
          {[0, 1, 2].map((i) => (
            <span key={i} className={i <= step ? 'is-active' : ''} />
          ))}
        </div>
      )}
    </div>
  )
}

function StepProdutos({ cart, onNext }) {
  return (
    <>
      <div className="section">
        <div className="card">
          {PRODUCTS.map((p) => (
            <div className="product-row" key={p.key}>
              <div className={`product-row__icon ${p.iconClass}`}>{p.icon}</div>
              <div className="product-row__info">
                <div className="product-row__name">{p.name}</div>
                <div className="product-row__price">
                  {formatBRL(p.price)} · {p.description}
                </div>
              </div>
              <QuantityStepper
                qty={cart.quantities[p.key] || 0}
                onIncrement={() => cart.increment(p.key)}
                onDecrement={() => cart.decrement(p.key)}
              />
            </div>
          ))}
        </div>

        <div className="card card--cream" style={{ marginTop: 14 }}>
          <span className="badge-pix">PIX 11958925757</span>
          <p style={{ fontSize: 13, marginTop: 10, color: 'var(--brown-800)' }}>
            Acompanha arroz, couve e farofa. Retirada na igreja ou delivery com taxa de entrega.
          </p>
        </div>
      </div>

      <StickyCartBar totalItems={cart.totalItems} total={cart.total} onNext={onNext} />
    </>
  )
}

function StepDados({ cart, errors, onBack, onNext }) {
  const c = cart.customer
  const set = (patch) => cart.setCustomer((prev) => ({ ...prev, ...patch }))

  return (
    <div className="section">
      <div className="card">
        <div className={`field ${errors.nome ? 'field--error' : ''}`}>
          <label htmlFor="nome">Nome completo</label>
          <input
            id="nome"
            value={c.nome}
            onChange={(e) => set({ nome: e.target.value })}
            placeholder="Como podemos te chamar?"
            autoComplete="name"
          />
          {errors.nome && <div className="field__error">{errors.nome}</div>}
        </div>

        <div className={`field ${errors.whatsapp ? 'field--error' : ''}`}>
          <label htmlFor="whatsapp">WhatsApp</label>
          <input
            id="whatsapp"
            value={formatWhatsappDisplay(c.whatsapp)}
            onChange={(e) => set({ whatsapp: onlyDigits(e.target.value) })}
            placeholder="(11) 90000-0000"
            inputMode="numeric"
            autoComplete="tel"
          />
          {errors.whatsapp && <div className="field__error">{errors.whatsapp}</div>}
        </div>

        <div className="field">
          <label>Retirada ou delivery?</label>
          <div className="choice-group">
            <button
              type="button"
              className={`choice ${c.entrega === 'retirada' ? 'is-active' : ''}`}
              onClick={() => set({ entrega: 'retirada' })}
            >
              Retirada na igreja
            </button>
            <button
              type="button"
              className={`choice ${c.entrega === 'delivery' ? 'is-active' : ''}`}
              onClick={() => set({ entrega: 'delivery' })}
            >
              Delivery
            </button>
          </div>
        </div>

        {c.entrega === 'delivery' && (
          <>
            <div className={`field ${errors.endereco ? 'field--error' : ''}`}>
              <label htmlFor="endereco">Endereço completo</label>
              <textarea
                id="endereco"
                rows={2}
                value={c.endereco}
                onChange={(e) => set({ endereco: e.target.value })}
                placeholder="Rua, número, bairro"
              />
              {errors.endereco && <div className="field__error">{errors.endereco}</div>}
            </div>
            <div className="field">
              <label htmlFor="referencia">Ponto de referência (opcional)</label>
              <input
                id="referencia"
                value={c.referencia}
                onChange={(e) => set({ referencia: e.target.value })}
                placeholder="Ex: portão azul, próximo ao mercado"
              />
            </div>
          </>
        )}

        <div className={`field ${errors.horario ? 'field--error' : ''}`}>
          <label htmlFor="horario">Horário desejado ({c.entrega === 'delivery' ? 'entrega' : 'retirada'})</label>
          <select id="horario" value={c.horario} onChange={(e) => set({ horario: e.target.value })}>
            <option value="">Selecione um horário</option>
            {['11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00'].map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
          {errors.horario && <div className="field__error">{errors.horario}</div>}
        </div>

        <div className="field">
          <label>Forma de pagamento</label>
          <div className="choice-group">
            {[
              ['pix', 'PIX'],
              ['dinheiro', 'Dinheiro'],
              ['cartao', 'Cartão']
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={`choice ${c.pagamento === value ? 'is-active' : ''}`}
                onClick={() => set({ pagamento: value })}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {c.pagamento === 'dinheiro' && (
          <>
            <div className="field">
              <label>Precisa de troco?</label>
              <div className="choice-group">
                <button
                  type="button"
                  className={`choice ${!c.precisaTroco ? 'is-active' : ''}`}
                  onClick={() => set({ precisaTroco: false, trocoPara: '' })}
                >
                  Não
                </button>
                <button
                  type="button"
                  className={`choice ${c.precisaTroco ? 'is-active' : ''}`}
                  onClick={() => set({ precisaTroco: true })}
                >
                  Sim
                </button>
              </div>
            </div>
            {c.precisaTroco && (
              <div className={`field ${errors.trocoPara ? 'field--error' : ''}`}>
                <label htmlFor="troco">Troco para quanto?</label>
                <input
                  id="troco"
                  value={c.trocoPara}
                  onChange={(e) => set({ trocoPara: e.target.value })}
                  placeholder="Ex: 50"
                  inputMode="decimal"
                />
                {errors.trocoPara && <div className="field__error">{errors.trocoPara}</div>}
              </div>
            )}
          </>
        )}
      </div>

      <div className="section" style={{ display: 'flex', gap: 10, padding: '4px 0 0' }}>
        <button className="btn btn--outline" onClick={onBack}>
          Voltar
        </button>
        <button className="btn btn--primary" onClick={onNext}>
          Revisar pedido
        </button>
      </div>
    </div>
  )
}

function StepRevisao({ cart, onBack, onConfirm, submitting }) {
  const c = cart.customer
  const entregaLabel = c.entrega === 'delivery' ? 'Delivery' : 'Retirada na igreja'
  const pagamentoLabel = { pix: 'PIX', dinheiro: 'Dinheiro', cartao: 'Cartão' }[c.pagamento]

  return (
    <div className="section">
      <div className="card">
        <h3 style={{ fontSize: 17, marginBottom: 12 }}>Itens do pedido</h3>
        {cart.items.map((item) => (
          <div className="summary-line" key={item.key}>
            <span>
              {item.qty}× {item.name}
            </span>
            <span>{formatBRL(item.qty * item.price)}</span>
          </div>
        ))}
        <div className="summary-line summary-line--total">
          <span>Total</span>
          <span>{formatBRL(cart.total)}</span>
        </div>
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <h3 style={{ fontSize: 17, marginBottom: 12 }}>Seus dados</h3>
        <div className="summary-line">
          <span>Nome</span>
          <span>{c.nome}</span>
        </div>
        <div className="summary-line">
          <span>WhatsApp</span>
          <span>{formatWhatsappDisplay(c.whatsapp)}</span>
        </div>
        <div className="summary-line">
          <span>{entregaLabel}</span>
          <span>{c.horario}</span>
        </div>
        {c.entrega === 'delivery' && (
          <div className="summary-line">
            <span>Endereço</span>
            <span style={{ textAlign: 'right', maxWidth: '65%' }}>{c.endereco}</span>
          </div>
        )}
        <div className="summary-line">
          <span>Pagamento</span>
          <span>
            {pagamentoLabel}
            {c.pagamento === 'dinheiro' && c.precisaTroco ? ` · troco p/ ${c.trocoPara}` : ''}
          </span>
        </div>
      </div>

      <div className="section" style={{ display: 'flex', gap: 10, padding: '4px 0 0' }}>
        <button className="btn btn--outline" onClick={onBack} disabled={submitting}>
          Voltar
        </button>
        <button className="btn btn--primary" onClick={onConfirm} disabled={submitting}>
          {submitting ? (
            <>
              <span className="spinner" /> Confirmando...
            </>
          ) : (
            'Confirmar pedido'
          )}
        </button>
      </div>
    </div>
  )
}

function StepConfirmacao({ order, onNewOrder }) {
  const whatsappNumero = import.meta.env.VITE_WHATSAPP_NUMERO || ''
  const mensagem = useMemo(() => {
    const linhas = [
      `Olá! Acabei de fazer o pedido *${order.numero}* do Dia da Feijoada.`,
      `Nome: ${order.nome}`,
      `Total: ${formatBRL(order.total)}`,
      `${order.entrega === 'delivery' ? 'Entrega' : 'Retirada'} às ${order.horario}`
    ]
    return encodeURIComponent(linhas.join('\n'))
  }, [order])

  return (
    <div className="section">
      <div className="card" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 46 }}>✅</div>
        <h2 style={{ fontSize: 22, margin: '8px 0 4px' }}>Pedido confirmado!</h2>
        <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 16 }}>Guarde seu número de pedido</p>
        <div
          style={{
            background: 'var(--yellow)',
            color: 'var(--brown-950)',
            fontFamily: "'Fraunces', serif",
            fontWeight: 900,
            fontSize: 28,
            borderRadius: 14,
            padding: '14px 10px',
            marginBottom: 16
          }}
        >
          {order.numero}
        </div>

        <div style={{ textAlign: 'left' }}>
          {Object.entries(order.itens)
            .filter(([, qty]) => qty > 0)
            .map(([key, qty]) => (
              <div className="summary-line" key={key}>
                <span>
                  {qty}× {PRODUCT_MAP[key]?.name || key}
                </span>
              </div>
            ))}
          <div className="summary-line summary-line--total">
            <span>Total</span>
            <span>{formatBRL(order.total)}</span>
          </div>
        </div>
      </div>

      <div className="section" style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '14px 0 0' }}>
        {whatsappNumero && (
          <a
            className="btn btn--whatsapp"
            href={`https://wa.me/${whatsappNumero}?text=${mensagem}`}
            target="_blank"
            rel="noreferrer"
          >
            Falar no WhatsApp
          </a>
        )}
        <button className="btn btn--outline" onClick={onNewOrder}>
          Fazer outro pedido
        </button>
      </div>
    </div>
  )
}
