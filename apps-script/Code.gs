/**
 * DIA DA FEIJOADA — Backend em Google Apps Script
 * ------------------------------------------------
 * Este arquivo é o único ponto de acesso à planilha. Nenhuma credencial
 * da planilha é exposta ao frontend: o app React só conhece a URL pública
 * deste Web App, publicada com "Executar como: eu" e "Quem tem acesso: qualquer pessoa".
 *
 * CONFIGURAÇÃO OBRIGATÓRIA ANTES DE PUBLICAR (veja README):
 * No editor do Apps Script, vá em Configurações do projeto > Propriedades do script
 * e crie:
 *   ADMIN_PASSWORD   -> senha que o admin vai digitar em /admin
 *   TOKEN_SECRET     -> uma string aleatória longa, só para assinar o token de sessão
 * Opcional:
 *   SHEET_ID         -> se quiser apontar para outra planilha (senão usa o ID abaixo)
 */

var DEFAULT_SHEET_ID = '1rqi-byQV34vU3kGzUjC2s78agYKygZexqXX8ToeoRKs'
var SHEET_PEDIDOS = 'Pedidos'
var SHEET_IDEMPOTENCY = 'Idempotency'
var COUNTER_PROPERTY = 'ORDER_COUNTER'
var SESSION_TTL_SECONDS = 6 * 60 * 60 // 6 horas (limite máximo do CacheService)

var HEADERS = [
  'Nº Pedido',
  'Data/Hora',
  'Nome',
  'WhatsApp',
  'Feijoada P',
  'Feijoada G',
  'Suco Maracujá',
  'Suco Abacaxi',
  'Suco Goiaba',
  'Total',
  'Pagamento',
  'Troco',
  'Delivery/Retirada',
  'Horário',
  'Endereço',
  'Referência',
  'Status',
  'IdempotencyKey'
]

/* ------------------------------------------------------------------ */
/* Entradas HTTP                                                       */
/* ------------------------------------------------------------------ */

function doGet() {
  return ContentService.createTextOutput('Dia da Feijoada — API online.').setMimeType(
    ContentService.MimeType.TEXT
  )
}

function doPost(e) {
  var body
  try {
    body = JSON.parse(e.postData.contents)
  } catch (err) {
    return jsonResponse({ ok: false, message: 'Corpo da requisição inválido.', code: 'BAD_REQUEST' })
  }

  var action = body.action

  try {
    switch (action) {
      case 'createOrder':
        return jsonResponse(handleCreateOrder(body.order, body.idempotencyKey))
      case 'adminLogin':
        return jsonResponse(handleAdminLogin(body.password))
      case 'getOrders':
        return jsonResponse(handleGetOrders(body.token))
      case 'updateOrderStatus':
        return jsonResponse(handleUpdateStatus(body.token, body.orderNumber, body.status))
      default:
        return jsonResponse({ ok: false, message: 'Ação desconhecida.', code: 'UNKNOWN_ACTION' })
    }
  } catch (err) {
    // Log interno (visível em Execuções, no editor do Apps Script)
    console.error(err)
    return jsonResponse({
      ok: false,
      message: 'Erro interno ao processar a solicitação. Tente novamente.',
      code: 'INTERNAL_ERROR'
    })
  }
}

function jsonResponse(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON)
}

/* ------------------------------------------------------------------ */
/* Criação de pedido (com trava contra concorrência e duplicidade)     */
/* ------------------------------------------------------------------ */

function handleCreateOrder(order, idempotencyKey) {
  if (!order || typeof order !== 'object') {
    return { ok: false, message: 'Pedido inválido.', code: 'INVALID_ORDER' }
  }
  if (!idempotencyKey) {
    return { ok: false, message: 'Pedido sem identificador de envio.', code: 'MISSING_IDEMPOTENCY_KEY' }
  }

  var validation = validateOrder(order)
  if (!validation.valid) {
    return { ok: false, message: validation.message, code: 'VALIDATION_ERROR' }
  }

  var lock = LockService.getScriptLock()
  lock.waitLock(30000) // até 30s esperando outros pedidos simultâneos liberarem

  try {
    var ss = getSpreadsheet()
    var pedidosSheet = getOrCreateSheet(ss, SHEET_PEDIDOS, HEADERS)
    var idempSheet = getOrCreateSheet(ss, SHEET_IDEMPOTENCY, ['Key', 'NumeroPedido', 'DataHora'])

    // Se esta idempotencyKey já foi processada (retry de rede, duplo clique
    // que escapou do frontend, etc.), devolve o mesmo número já gerado
    // em vez de criar uma linha nova.
    var existing = findIdempotencyKey(idempSheet, idempotencyKey)
    if (existing) {
      return { ok: true, data: { orderNumber: existing } }
    }

    var orderNumber = getNextOrderNumber()
    var now = new Date()

    var itens = order.itens || {}
    var row = [
      orderNumber,
      Utilities.formatDate(now, Session.getScriptTimeZone() || 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm:ss'),
      order.nome,
      order.whatsapp,
      Number(itens.feijoadaP) || 0,
      Number(itens.feijoadaG) || 0,
      Number(itens.sucoMaracuja) || 0,
      Number(itens.sucoAbacaxi) || 0,
      Number(itens.sucoGoiaba) || 0,
      Number(order.total) || 0,
      order.pagamento,
      order.precisaTroco ? order.trocoPara : '',
      order.entrega,
      order.horario,
      order.endereco || '',
      order.referencia || '',
      'Novo',
      idempotencyKey
    ]

    pedidosSheet.appendRow(row)
    idempSheet.appendRow([
      idempotencyKey,
      orderNumber,
      Utilities.formatDate(now, Session.getScriptTimeZone() || 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm:ss')
    ])

    return { ok: true, data: { orderNumber: orderNumber } }
  } finally {
    lock.releaseLock()
  }
}

function validateOrder(order) {
  if (!order.nome || String(order.nome).trim().length < 2) {
    return { valid: false, message: 'Nome inválido.' }
  }
  if (!order.whatsapp || String(order.whatsapp).replace(/\D/g, '').length < 10) {
    return { valid: false, message: 'WhatsApp inválido.' }
  }
  if (!order.horario) {
    return { valid: false, message: 'Horário não informado.' }
  }
  if (order.entrega === 'delivery' && !order.endereco) {
    return { valid: false, message: 'Endereço obrigatório para delivery.' }
  }
  var itens = order.itens || {}
  var totalItens =
    (Number(itens.feijoadaP) || 0) +
    (Number(itens.feijoadaG) || 0) +
    (Number(itens.sucoMaracuja) || 0) +
    (Number(itens.sucoAbacaxi) || 0) +
    (Number(itens.sucoGoiaba) || 0)
  if (totalItens <= 0) {
    return { valid: false, message: 'O pedido precisa ter ao menos um item.' }
  }
  return { valid: true }
}

function findIdempotencyKey(idempSheet, key) {
  var data = idempSheet.getDataRange().getValues()
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === key) return data[i][1]
  }
  return null
}

function getNextOrderNumber() {
  var props = PropertiesService.getScriptProperties()
  var current = parseInt(props.getProperty(COUNTER_PROPERTY) || '0', 10)
  var next = current + 1
  props.setProperty(COUNTER_PROPERTY, String(next))
  var padded = ('0000' + next).slice(-4)
  return 'FEI-' + padded
}

/* ------------------------------------------------------------------ */
/* Admin: login, listagem e atualização de status                     */
/* ------------------------------------------------------------------ */

function handleAdminLogin(password) {
  var props = PropertiesService.getScriptProperties()
  var expected = props.getProperty('ADMIN_PASSWORD')

  if (!expected) {
    return {
      ok: false,
      message: 'Senha de admin não configurada no servidor (ADMIN_PASSWORD).',
      code: 'NOT_CONFIGURED'
    }
  }
  if (String(password) !== String(expected)) {
    return { ok: false, message: 'Senha incorreta.', code: 'WRONG_PASSWORD' }
  }

  var token = Utilities.getUuid()
  CacheService.getScriptCache().put('session_' + token, 'valid', SESSION_TTL_SECONDS)
  return { ok: true, data: { token: token } }
}

function requireValidToken(token) {
  if (!token) return false
  var cached = CacheService.getScriptCache().get('session_' + token)
  return cached === 'valid'
}

function handleGetOrders(token) {
  if (!requireValidToken(token)) {
    return { ok: false, message: 'Sessão expirada. Faça login novamente.', code: 'UNAUTHORIZED' }
  }

  var ss = getSpreadsheet()
  var sheet = getOrCreateSheet(ss, SHEET_PEDIDOS, HEADERS)
  var data = sheet.getDataRange().getValues()
  if (data.length <= 1) return { ok: true, data: { orders: [] } }

  var rows = data.slice(1)
  var orders = rows
    .filter(function (r) {
      return r[0] // ignora linhas vazias
    })
    .map(function (r) {
      return {
        numero: r[0],
        dataHora: r[1],
        nome: r[2],
        whatsapp: r[3],
        feijoadaP: r[4],
        feijoadaG: r[5],
        sucoMaracuja: r[6],
        sucoAbacaxi: r[7],
        sucoGoiaba: r[8],
        total: r[9],
        pagamento: r[10],
        trocoPara: r[11],
        precisaTroco: !!r[11],
        entrega: r[12],
        horario: r[13],
        endereco: r[14],
        referencia: r[15],
        status: r[16]
      }
    })
    .reverse() // pedidos mais recentes primeiro

  return { ok: true, data: { orders: orders } }
}

function handleUpdateStatus(token, orderNumber, status) {
  if (!requireValidToken(token)) {
    return { ok: false, message: 'Sessão expirada. Faça login novamente.', code: 'UNAUTHORIZED' }
  }
  var validStatus = ['Novo', 'Confirmado', 'Em preparo', 'Pronto', 'Entregue', 'Retirado', 'Cancelado']
  if (validStatus.indexOf(status) === -1) {
    return { ok: false, message: 'Status inválido.', code: 'INVALID_STATUS' }
  }

  var lock = LockService.getScriptLock()
  lock.waitLock(15000)
  try {
    var ss = getSpreadsheet()
    var sheet = getOrCreateSheet(ss, SHEET_PEDIDOS, HEADERS)
    var data = sheet.getDataRange().getValues()
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === orderNumber) {
        sheet.getRange(i + 1, 17).setValue(status) // coluna 17 = Status
        return { ok: true, data: { numero: orderNumber, status: status } }
      }
    }
    return { ok: false, message: 'Pedido não encontrado.', code: 'NOT_FOUND' }
  } finally {
    lock.releaseLock()
  }
}

/* ------------------------------------------------------------------ */
/* Helpers de planilha                                                 */
/* ------------------------------------------------------------------ */

function getSpreadsheet() {
  var id = PropertiesService.getScriptProperties().getProperty('SHEET_ID') || DEFAULT_SHEET_ID
  return SpreadsheetApp.openById(id)
}

function getOrCreateSheet(ss, name, headers) {
  var sheet = ss.getSheetByName(name)
  if (!sheet) {
    sheet = ss.insertSheet(name)
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers)
    sheet.setFrozenRows(1)
  }
  return sheet
}
