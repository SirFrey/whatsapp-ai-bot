// UI helpers - DOM updates in one place for maintainability
export const els = {
	status: document.getElementById('status'),
	qrImg: document.getElementById('qr-img'),
	qrSection: document.getElementById('qr-section'),
	error: document.getElementById('error-banner'),
	btnReconnect: document.getElementById('btn-reconnect'),
	btnResetLogin: document.getElementById('btn-reset-login'),
	logs: document.getElementById('logs'),
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
	els.status.textContent = `Status: ${text}`
}

export function showQR(dataUrl) {
	els.qrImg.src = dataUrl
	els.qrSection.style.display = 'block'
}
export function hideQR() {
	els.qrImg.removeAttribute('src')
	els.qrSection.style.display = 'none'
}

export function showError(msg) {
	els.error.textContent = msg
	els.error.style.display = 'block'
}
export function clearError() {
	els.error.textContent = ''
	els.error.style.display = 'none'
}

export async function apiPost(path) {
	try {
		const res = await fetch(path, { method: 'POST' })
		if (!res.ok) throw new Error(`HTTP ${res.status}`)
		return await res.json()
	} catch (e) {
		showError('Request failed: ' + (e?.message || e))
		throw e
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
