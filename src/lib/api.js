// Camada única de comunicação com o backend (Google Apps Script Web App).
// Nenhuma credencial de planilha passa pelo frontend: o Apps Script guarda
// o ID da planilha e a senha do admin no lado do servidor (PropertiesService).

const BASE_URL = import.meta.env.VITE_APPS_SCRIPT_URL

function assertConfigured() {
  if (!BASE_URL || BASE_URL.includes('COLE_AQUI')) {
    throw new ApiError(
      'A aplicação ainda não foi conectada ao Apps Script. Configure VITE_APPS_SCRIPT_URL.',
      'NOT_CONFIGURED'
    )
  }
}

export class ApiError extends Error {
  constructor(message, code) {
    super(message)
    this.code = code
  }
}

async function callApi(action, payload = {}, { timeoutMs = 15000 } = {}) {
  assertConfigured()

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  let response
  try {
    response = await fetch(BASE_URL, {
      method: 'POST',
      // text/plain evita o preflight de CORS no Apps Script (que não
      // responde a OPTIONS). O Apps Script lê e faz JSON.parse do corpo.
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, ...payload }),
      signal: controller.signal
    })
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new ApiError('O servidor demorou demais para responder. Tente novamente.', 'TIMEOUT')
    }
    throw new ApiError('Não foi possível conectar ao servidor. Verifique sua internet.', 'NETWORK')
  } finally {
    clearTimeout(timeout)
  }

  if (!response.ok) {
    throw new ApiError(`Erro de servidor (HTTP ${response.status}).`, 'HTTP')
  }

  let data
  try {
    data = await response.json()
  } catch {
    throw new ApiError('Resposta inválida do servidor.', 'PARSE')
  }

  if (!data.ok) {
    throw new ApiError(data.message || 'Ocorreu um erro ao processar o pedido.', data.code || 'API')
  }

  return data.data
}

export function createOrder(order, idempotencyKey) {
  return callApi('createOrder', { order, idempotencyKey }, { timeoutMs: 20000 })
}

export function adminLogin(password) {
  return callApi('adminLogin', { password })
}

export function getOrders(token) {
  return callApi('getOrders', { token })
}

export function updateOrderStatus(token, orderNumber, status) {
  return callApi('updateOrderStatus', { token, orderNumber, status })
}
