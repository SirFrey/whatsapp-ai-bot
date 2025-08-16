import { openSSE, secondsToHms } from './sse.js'
import { setStatus, showQR, hideQR, showQRLoading, showError, clearError, updateStats, appendLog, clearLogs, els, apiPost } from './ui.js'

// Initial snapshot to render UI immediately on refresh
(async () => {
	try {
		const res = await fetch('/api/snapshot')
		if (res.ok) {
			const snap = await res.json()
			setStatus(snap.status || 'unknown')

			// Handle QR code display logic
			if (snap.qrDataUrl && typeof snap.qrDataUrl === 'string' && snap.qrDataUrl.length > 20) {
				showQR(snap.qrDataUrl)
			} else {
				// If no QR data but status suggests we need authentication, show loading state
				if (snap.status === 'initializing' || snap.status === 'connecting' || snap.status === 'unknown') {
					showQRLoading()
				} else {
					hideQR()
				}
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
		} else {
			// If we can't get snapshot, assume we need to show QR section for first-time setup
			setStatus('conectando')
			showQRLoading()
		}
	} catch {
		// If there's an error fetching snapshot, assume we need QR for initial setup
		setStatus('conectando')
		showQRLoading()
	}
})()

// Single SSE connection wired to UI updates
const es = openSSE('/events', {
	status: e => {
		const data = e.data
		if (data === 'logged_out') {
			setStatus('DESCONECTADO. Reconectando...')
			showError('El bot fue desconectado de WhatsApp. Intentando reconectar automáticamente...')
		} else if (data === 'close') {
			setStatus('desconectado')
			showError('Desconectado de WhatsApp. Puedes intentar reconectar.')
		} else if (data === 'open') {
			setStatus('conectado')
			clearError()
		} else {
			setStatus(data)
		}
	},
	qr: e => {
		if (e.data && typeof e.data === 'string' && e.data.length > 20) {
			showQR(e.data)
		} else {
			// If QR data is empty but we're in a state that might need QR, show loading
			const currentStatus = els.status.textContent || ''
			if (currentStatus.includes('conectando') || currentStatus.includes('inicializando')) {
				showQRLoading()
			} else {
				hideQR()
			}
		}
	},
	error: e => {
		if (e.data) showError('Error del bot: ' + e.data)
	},
	log: e => {
		try { appendLog(JSON.parse(e.data)) } catch { }
	}
})

es.onerror = () => {
	setStatus('desconectado')
	showError('Conexión perdida con el servidor. Intenta Reconectar o Reiniciar sesión.')
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
			setStatus('reconectando...')
			await apiPost('/api/reconnect')
			showError('Reconectando… si no se conecta, intenta Reiniciar sesión.')
		} catch { }
	})
}
if (els.btnResetLogin) {
	els.btnResetLogin.addEventListener('click', async () => {
		try {
			if (!confirm('Esto desvinculará la sesión actual. ¿Continuar?')) return
			setStatus('reiniciando sesión...')
			await apiPost('/api/reset-login')
			showError('Sesión reiniciada. Escanea el código QR para conectar nuevamente.')
		} catch { }
	})
}

// Clear logs button functionality
const clearLogsBtn = document.getElementById('clear-logs')
if (clearLogsBtn) {
	clearLogsBtn.addEventListener('click', () => {
		clearLogs()
	})
}
