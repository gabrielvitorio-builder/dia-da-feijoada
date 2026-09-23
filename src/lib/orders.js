export const STATUS_OPTIONS = ['Novo', 'Confirmado', 'Em preparo', 'Pronto', 'Entregue', 'Retirado', 'Cancelado']

const CSV_COLUMNS = [
  ['numero', 'Nº Pedido'],
  ['dataHora', 'Data/Hora'],
  ['nome', 'Nome'],
  ['whatsapp', 'WhatsApp'],
  ['feijoadaP', 'Feijoada P'],
  ['feijoadaG', 'Feijoada G'],
  ['sucoMaracuja', 'Suco Maracujá'],
  ['sucoLaranja', 'Suco Laranja'],
  ['sucoAbacaxi', 'Suco Abacaxi'],
  ['sucoGoiaba', 'Suco Goiaba'],
  ['total', 'Total'],
  ['pagamento', 'Pagamento'],
  ['trocoPara', 'Troco'],
  ['entrega', 'Delivery/Retirada'],
  ['horario', 'Horário'],
  ['endereco', 'Endereço'],
  ['referencia', 'Referência'],
  ['status', 'Status']
]

function csvEscape(value) {
  const str = String(value ?? '')
  if (/[",\n;]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export function exportOrdersToCsv(orders, filename = 'pedidos-feijoada.csv') {
  const header = CSV_COLUMNS.map(([, label]) => csvEscape(label)).join(';')
  const rows = orders.map((order) => CSV_COLUMNS.map(([key]) => csvEscape(order[key])).join(';'))
  const csv = '\uFEFF' + [header, ...rows].join('\n') // BOM ajuda o Excel a ler acentos

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function summarizeOrders(orders) {
  const summary = {
    totalPedidos: orders.length,
    feijoadaP: 0,
    feijoadaG: 0,
    sucoMaracuja: 0,
    sucoAbacaxi: 0,
    sucoLaranja: 0,
    sucoGoiaba: 0,
    faturamento: 0,
    delivery: 0,
    retirada: 0
  }
  for (const o of orders) {
    if (o.status === 'Cancelado') continue
    summary.feijoadaP += Number(o.feijoadaP) || 0
    summary.feijoadaG += Number(o.feijoadaG) || 0
    summary.sucoMaracuja += Number(o.sucoMaracuja) || 0
    summary.sucoLaranja += Number(o.sucoLaranja) || 0
    summary.sucoAbacaxi += Number(o.sucoAbacaxi) || 0
    summary.sucoGoiaba += Number(o.sucoGoiaba) || 0
    summary.faturamento += Number(o.total) || 0
    if (o.entrega === 'delivery') summary.delivery += 1
    else summary.retirada += 1
  }
  return summary
}
