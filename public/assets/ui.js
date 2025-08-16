// UI helpers - DOM updates in one place for maintainability
export const els = {
	status: document.getElementById('status'),
	qrImg: document.getElementById('qr-img'),
	qrSection: document.getElementById('qr-section'),
	error: document.getElementById('error-banner'),
	btnReconnect: document.getElementById('btn-reconnect'),
	btnResetLogin: document.getElementById('btn-reset-login'),
	logs: document.getElementById('logs'),
	loading: document.getElementById('loading-overlay'), // New loading overlay
	stats: {
		clients: document.getElementById('stat-clients'),
		conversations: document.getElementById('stat-conversations'),
		appointments: document.getElementById('stat-appointments'),
		bot: document.getElementById('stat-bot'),
		manual: document.getElementById('stat-manual'),
		uptime: document.getElementById('stat-uptime')
	},
	widgets: document.getElementById('extensible-widgets')
}

export function setStatus(text) {
	// Translate status messages to Spanish
	const statusTranslations = {
		'unknown': 'desconocido',
		'disconnected': 'desconectado',
		'connected': 'conectado',
		'reconnecting...': 'reconectando...',
		'LOGGED OUT. Reconectando...': 'DESCONECTADO. Reconectando...',
		'connecting': 'conectando',
		'initializing': 'inicializando',
		'ready': 'listo',
		'close': 'cerrado',
		'open': 'conectado',
		'conflict': 'conflicto - sesión duplicada',
		'logged_out': 'desconectado',
		'qr_ready': 'código QR listo',
		'restart_required': 'reinicio requerido',
		'connection_lost': 'conexión perdida'
	}

	const translatedText = statusTranslations[text] || text
	if (els.status) {
		els.status.textContent = `Estado: ${translatedText}`
		console.log('Status updated to:', translatedText)
	}
}

export function showQR(dataUrl) {
	if (els.qrImg && els.qrSection) {
		const qrLoading = document.getElementById('qr-loading')
		if (qrLoading) {
			qrLoading.style.display = 'none' // Hide loading state
		}
		els.qrImg.src = dataUrl
		els.qrImg.style.display = 'block' // Show QR image
		els.qrSection.style.display = 'block'
	}
}
export function hideQR() {
	if (els.qrImg && els.qrSection) {
		const qrLoading = document.getElementById('qr-loading')
		if (qrLoading) {
			qrLoading.style.display = 'none'
		}
		els.qrImg.removeAttribute('src')
		els.qrImg.style.display = 'none'
		els.qrSection.style.display = 'none'
	}
}

export function showQRLoading() {
	if (els.qrSection) {
		const qrLoading = document.getElementById('qr-loading')
		if (qrLoading) {
			qrLoading.style.display = 'block'
		}
		if (els.qrImg) {
			els.qrImg.style.display = 'none'
		}
		els.qrSection.style.display = 'block'
	}
}

export function showError(msg) {
	// Translate common error messages to Spanish
	const errorTranslations = {
		'Connection lost to server. Try Reconnect or Reset login.': 'Conexión perdida con el servidor. Intenta Reconectar o Reiniciar sesión.',
		'Disconnected from WhatsApp. You can try to reconnect.': 'Desconectado de WhatsApp. Puedes intentar reconectar.',
		'Request failed:': 'Solicitud falló:',
		'Bot error:': 'Error del bot:'
	}

	let translatedMsg = msg
	for (const [english, spanish] of Object.entries(errorTranslations)) {
		if (msg.includes(english)) {
			translatedMsg = msg.replace(english, spanish)
			break
		}
	}

	const errorElement = document.getElementById('error-message')
	if (errorElement) {
		errorElement.textContent = translatedMsg
	}
	els.error.style.display = 'block'
}
export function clearError() {
	if (els.error) {
		els.error.textContent = ''
		els.error.style.display = 'none'
	}
}

export function showLoading(message = 'Cargando...') {
	// Create loading overlay if it doesn't exist
	if (!els.loading) {
		const overlay = document.createElement('div')
		overlay.id = 'loading-overlay'
		overlay.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'
		overlay.innerHTML = `
			<div class="bg-white rounded-lg p-6 max-w-sm mx-4 text-center">
				<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
				<p id="loading-message" class="text-gray-700">${message}</p>
			</div>
		`
		document.body.appendChild(overlay)
		els.loading = overlay
	} else {
		const messageEl = document.getElementById('loading-message')
		if (messageEl) messageEl.textContent = message
		els.loading.style.display = 'flex'
	}
}

export function hideLoading() {
	if (els.loading) {
		els.loading.style.display = 'none'
	}
}

export async function apiPost(endpoint, data = {}) {
	const loadingMessage = endpoint === '/api/reconnect' ? 'Reconectando...' : 'Reiniciando sesión...'
	showLoading(loadingMessage)

	try {
		const controller = new AbortController()
		const timeoutId = setTimeout(() => controller.abort(), 15000) // 15 second timeout

		const res = await fetch(endpoint, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(data),
			signal: controller.signal
		})

		clearTimeout(timeoutId)

		const result = await res.json()

		if (!res.ok) {
			throw new Error(result.error || `HTTP ${res.status}`)
		}

		if (result.message) {
			// Show success message briefly
			showLoading(result.message + ' ✓')
			setTimeout(hideLoading, 2000)
		} else {
			hideLoading()
		}

		return result
	} catch (error) {
		hideLoading()

		if (error.name === 'AbortError') {
			showError('Tiempo de espera agotado. Intenta nuevamente.')
		} else {
			showError(`Error en solicitud: ${error.message}`)
		}

		throw error
	}
}

export function updateStats({ sseClients, conversations, appointments, botNumber, manualOverrides, uptimeHms }) {
	if (typeof sseClients !== 'undefined') els.stats.clients.textContent = sseClients
	if (typeof conversations !== 'undefined') els.stats.conversations.textContent = conversations
	if (typeof appointments !== 'undefined') els.stats.appointments.textContent = appointments
	if (typeof botNumber !== 'undefined') els.stats.bot.textContent = botNumber || '-'
	if (typeof manualOverrides !== 'undefined') els.stats.manual.textContent = manualOverrides
	if (typeof uptimeHms !== 'undefined') els.stats.uptime.textContent = uptimeHms
}

// Logs rendering
const MAX_LOG_ROWS = 500
export function appendLog(entry) {
	if (!els.logs) return
	const pre = document.createElement('div')
	pre.className = 'log-row'
	const color = entry.level === 'error' ? '#c62828' : entry.level === 'warn' ? '#f57f17' : '#2e7d32'
	pre.style.color = color
	const msg = typeof entry.msg === 'string' ? entry.msg : JSON.stringify(entry.msg)
	const args = entry.args && entry.args.length ? ' ' + entry.args.map(a => {
		try { return typeof a === 'string' ? a : JSON.stringify(a) } catch { return String(a) }
	}).join(' ') : ''
	pre.textContent = `[${entry.ts}] [${entry.level.toUpperCase()}] ${msg}${args}`
	const wasAtBottom = Math.abs(els.logs.scrollHeight - (els.logs.scrollTop + els.logs.clientHeight)) < 8
	els.logs.appendChild(pre)
	while (els.logs.children.length > MAX_LOG_ROWS) els.logs.removeChild(els.logs.firstChild)
	if (wasAtBottom) els.logs.scrollTop = els.logs.scrollHeight
}

// Clear logs functionality
export function clearLogs() {
	if (!els.logs) return
	els.logs.innerHTML = `
		<div class="text-slate-500 text-center py-8">
			<svg class="w-8 h-8 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
			</svg>
			Esperando registros del sistema...
		</div>
	`
}
