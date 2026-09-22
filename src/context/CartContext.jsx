import { createContext, useContext, useMemo, useState, useCallback } from 'react'
import { PRODUCTS } from '../lib/products'

const CartContext = createContext(null)

function emptyCart() {
  return Object.fromEntries(PRODUCTS.map((p) => [p.key, 0]))
}

export function CartProvider({ children }) {
  const [quantities, setQuantities] = useState(emptyCart)
  const [customer, setCustomer] = useState({
    nome: '',
    whatsapp: '',
    entrega: 'retirada', // 'retirada' | 'delivery'
    horario: '',
    pagamento: 'pix', // 'pix' | 'dinheiro' | 'cartao'
    precisaTroco: false,
    trocoPara: '',
    endereco: '',
    referencia: ''
  })

  const setQty = useCallback((key, qty) => {
    setQuantities((prev) => ({ ...prev, [key]: Math.max(0, Math.min(99, qty)) }))
  }, [])

  const increment = useCallback((key) => {
    setQuantities((prev) => ({ ...prev, [key]: Math.min(99, (prev[key] || 0) + 1) }))
  }, [])

  const decrement = useCallback((key) => {
    setQuantities((prev) => ({ ...prev, [key]: Math.max(0, (prev[key] || 0) - 1) }))
  }, [])

  const items = useMemo(
    () =>
      PRODUCTS.map((p) => ({ ...p, qty: quantities[p.key] || 0 })).filter((p) => p.qty > 0),
    [quantities]
  )

  const totalItems = useMemo(() => items.reduce((sum, i) => sum + i.qty, 0), [items])
  const total = useMemo(() => items.reduce((sum, i) => sum + i.qty * i.price, 0), [items])

  const resetCart = useCallback(() => {
    setQuantities(emptyCart())
    setCustomer({
      nome: '',
      whatsapp: '',
      entrega: 'retirada',
      horario: '',
      pagamento: 'pix',
      precisaTroco: false,
      trocoPara: '',
      endereco: '',
      referencia: ''
    })
  }, [])

  const value = {
    quantities,
    setQty,
    increment,
    decrement,
    items,
    totalItems,
    total,
    customer,
    setCustomer,
    resetCart
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart precisa estar dentro de <CartProvider>')
  return ctx
}
