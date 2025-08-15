import { openSSE, secondsToHms } from './sse.js'
import { setStatus, showQR, hideQR, showError, clearError, updateStats, appendLog, els, apiPost } from './ui.js'

// Initial snapshot to render UI immediately on refresh
(async () => {
	try {
		const res = await fetch('/api/snapshot')
		if (res.ok) {
			const snap = await res.json()
			setStatus(snap.status || 'unknown')
			if (snap.qrDataUrl && typeof snap.qrDataUrl === 'string' && snap.qrDataUrl.length > 20) {
				showQR(snap.qrDataUrl)
			} else {
				hideQR()
			}
			if (snap.stats) {
				updateStats({
					sseClients: snap.stats.sseClients,
					conversations: snap.stats.conversations,
					appointments: snap.stats.appointments,
					botNumber: snap.stats.botNumber,
					manualOverrides: snap.stats.manualOverrides,
					uptimeHms: secondsToHms(snap.stats.uptimeSec)
				})
			}
			if (Array.isArray(snap.logs)) {
				snap.logs.forEach(entry => { try { appendLog(entry) } catch { } })
			}
		}
	} catch { }
})()

// Single SSE connection wired to UI updates
const es = openSSE('/events', {
	status: e => {
		const data = e.data
		if (data === 'logged_out') {
			setStatus('LOGGED OUT. Reconectando...')
			showError('El bot fue desconectado de WhatsApp. Intentando reconectar automáticamente...')
		} else if (data === 'close') {
			setStatus('disconnected')
			showError('Disconnected from WhatsApp. You can try to reconnect.')
		} else if (data === 'open') {
			setStatus('connected')
			clearError()
		} else {
			setStatus(data)
		}
	},
	qr: e => {
		if (e.data && typeof e.data === 'string' && e.data.length > 20) {
			showQR(e.data)
		} else {
			hideQR()
		}
	},
	error: e => {
		if (e.data) showError('Bot error: ' + e.data)
	},
	log: e => {
		try { appendLog(JSON.parse(e.data)) } catch { }
	}
})

es.onerror = () => {
	setStatus('disconnected')
	showError('Connection lost to server. Try Reconnect or Reset login.')
}

es.onopen = () => {
	// UI connected to backend; keep status consistent but clear stale errors
	clearError()
}

es.addEventListener('stats', e => {
	try {
		const payload = JSON.parse(e.data)
		updateStats({
			sseClients: payload.sseClients,
			conversations: payload.conversations,
			appointments: payload.appointments,
			botNumber: payload.botNumber,
			manualOverrides: payload.manualOverrides,
			uptimeHms: secondsToHms(payload.uptimeSec)
		})
	} catch { }
})

// UI actions: Reconnect and Reset login
if (els.btnReconnect) {
	els.btnReconnect.addEventListener('click', async () => {
		try {
			setStatus('reconnecting...')
			await apiPost('/api/reconnect')
			showError('Reconnecting… if it does not connect, try Reset login.')
		} catch { }
	})
}
if (els.btnResetLogin) {
	els.btnResetLogin.addEventListener('click', async () => {
		try {
			if (!confirm('This will unlink the current session. Continue?')) return
			setStatus('resetting login...')
			await apiPost('/api/reset-login')
			showError('Login reset. Scan the QR code to connect again.')
		} catch { }
	})
}
