// Catálogo de produtos do Dia da Feijoada.
// A "key" de cada item precisa bater com as colunas esperadas no Apps Script (Code.gs).
export const PRODUCTS = [
  {
    key: 'feijoadaP',
    name: 'Feijoada P',
    description: 'Tudo em 1 marmita: feijoada, arroz, couve e farofa.',
    price: 25,
    icon: 'P',
    iconClass: 'icon--p'
  },
  {
    key: 'feijoadaG',
    name: 'Feijoada G',
    description: 'Tudo separado: arroz, feijão e farofa.',
    price: 45,
    icon: 'G',
    iconClass: 'icon--g'
  },
  {
    key: 'sucoMaracuja',
    name: 'Suco natural — Maracujá',
    description: 'Garrafinha de suco natural.',
    price: 10,
    icon: '🥤',
    iconClass: 'icon--suco'
  },
   {
    key: 'sucoLaranja',
    name: 'Suco natural — Laranja',
    description: 'Garrafinha de suco natural.',
    price: 10,
    icon: '🥤',
    iconClass: 'icon--suco'
  },
  {
    key: 'sucoAbacaxi',
    name: 'Suco natural — Abacaxi',
    description: 'Garrafinha de suco natural.',
    price: 10,
    icon: '🥤',
    iconClass: 'icon--suco'
  },
  {
    key: 'sucoGoiaba',
    name: 'Suco natural — Goiaba',
    description: 'Garrafinha de suco natural.',
    price: 10,
    icon: '🥤',
    iconClass: 'icon--suco'
  }
]

export const PRODUCT_MAP = Object.fromEntries(PRODUCTS.map((p) => [p.key, p]))

export function formatBRL(value) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
