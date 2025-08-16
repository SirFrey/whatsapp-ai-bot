import { openSSE, secondsToHms } from './sse.js'
import { setStatus, showQR, hideQR, showQRLoading, showError, clearError, updateStats, appendLog, clearLogs, els, apiPost } from './ui.js'

console.log('App.js loaded successfully')

// Connection state management
let isConnected = false
let retryCount = 0
const maxRetries = 5

// Initial snapshot to render UI immediately on refresh
async function loadInitialSnapshot() {
	try {
		console.log('Loading initial snapshot...')

		const res = await fetch('/api/snapshot', {
			headers: {
				'Cache-Control': 'no-cache'
			}
		})

		if (res.ok) {
			const snap = await res.json()
			console.log('Initial snapshot loaded:', snap)

			// Set status with better handling
			setStatus(snap.status || 'initializing')

			// Enhanced QR code display logic
			if (snap.qrDataUrl && typeof snap.qrDataUrl === 'string' && snap.qrDataUrl.length > 20) {
				showQR(snap.qrDataUrl)
			} else {
				// If no QR data but status suggests we need authentication, show loading state
				const status = snap.status || 'initializing'
				if (status === 'initializing' || status === 'connecting' || status === 'unknown' || status === 'close') {
					showQRLoading()
				} else {
					hideQR()
				}
			}

			// Update stats with validation
			if (snap.stats && typeof snap.stats === 'object') {
				updateStats({
					sseClients: snap.stats.sseClients || 0,
					conversations: snap.stats.conversations || 0,
					appointments: snap.stats.appointments || 0,
					botNumber: snap.stats.botNumber || null,
					manualOverrides: snap.stats.manualOverrides || 0,
					uptimeHms: secondsToHms(snap.stats.uptimeSec || 0)
				})
			}

			// Load logs with validation
			if (Array.isArray(snap.logs)) {
				snap.logs.forEach(entry => {
					try {
						appendLog(entry)
					} catch (error) {
						console.warn('Error appending log entry:', error)
					}
				})
			}

			isConnected = true
			retryCount = 0
		} else {
			console.warn('Failed to load snapshot:', res.status, res.statusText)
			// Fallback state for when we can't get snapshot
			setStatus('conectando')
			showQRLoading()
		}
	} catch (error) {
		console.error('Error loading initial snapshot:', error)
		// Fallback state for when we can't get snapshot
		setStatus('conectando')
		showQRLoading()
	}
}

// Call the function
loadInitialSnapshot()

// SSE connection with error handling
const es = openSSE('/events', {
	status: e => {
		const data = e.data
		console.log('Status update:', data)

		if (data === 'logged_out') {
			setStatus('DESCONECTADO. Reconectando...')
			showError('El bot fue desconectado de WhatsApp. Intentando reconectar automáticamente...')
			showQRLoading()
		} else if (data === 'close') {
			setStatus('desconectado')
			showError('Desconectado de WhatsApp. Puedes intentar reconectar.')
			showQRLoading()
		} else if (data === 'open') {
			setStatus('conectado')
			clearError()
			hideQR()
		} else if (data === 'conflict') {
			setStatus('conflicto')
			showError('Sesión duplicada detectada. Ya hay una sesión activa en otro lugar.')
			hideQR()
		} else {
			setStatus(data)

			// Handle QR loading state based on status
			if (data === 'initializing' || data === 'connecting' || data === 'reconnecting') {
				showQRLoading()
			}
		}
	},
	qr: e => {
		console.log('QR update:', e.data ? 'QR received' : 'QR cleared')

		if (e.data && typeof e.data === 'string' && e.data.length > 20) {
			showQR(e.data)
		} else {
			// If QR data is empty but we're in a state that might need QR, show loading
			const currentStatus = els.status ? els.status.textContent || '' : ''
			if (currentStatus.includes('conectando') || currentStatus.includes('inicializando') || currentStatus.includes('desconectado')) {
				showQRLoading()
			} else {
				hideQR()
			}
		}
	},
	error: e => {
		console.error('Bot error received:', e.data)
		if (e.data) showError('Error del bot: ' + e.data)
	},
	log: e => {
		try {
			const logData = JSON.parse(e.data)
			appendLog(logData)
		} catch (error) {
			console.warn('Error parsing log data:', error)
		}
	},
	ready: e => {
		console.log('SSE ready signal received')
		isConnected = true
		retryCount = 0
		clearError()
	}
})

// Error handling for SSE connection
es.onerror = (event) => {
	console.error('SSE connection error:', event)
	isConnected = false

	if (es.readyState === EventSource.CLOSED) {
		setStatus('desconectado')
		showError('Conexión perdida con el servidor.')
	}
}

es.onopen = () => {
	console.log('SSE connection opened')
	isConnected = true
	retryCount = 0
	clearError()
}

es.addEventListener('stats', e => {
	try {
		const payload = JSON.parse(e.data)
		updateStats({
			sseClients: payload.sseClients || 0,
			conversations: payload.conversations || 0,
			appointments: payload.appointments || 0,
			botNumber: payload.botNumber || null,
			manualOverrides: payload.manualOverrides || 0,
			uptimeHms: secondsToHms(payload.uptimeSec || 0)
		})
	} catch (e) {
		console.warn('Error updating stats:', e)
	}
})

// Button event handlers
if (els.btnReconnect) {
	els.btnReconnect.addEventListener('click', async () => {
		try {
			setStatus('reconectando...')
			await apiPost('/api/reconnect')
			clearError()
		} catch (e) {
			showError('Error al reconectar: ' + e.message)
		}
	})
}

if (els.btnResetLogin) {
	els.btnResetLogin.addEventListener('click', async () => {
		try {
			setStatus('reiniciando sesión...')
			await apiPost('/api/reset-login')
			clearError()
		} catch (e) {
			showError('Error al reiniciar sesión: ' + e.message)
		}
	})
}
