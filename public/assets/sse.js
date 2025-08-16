// Enhanced SSE helper with better error handling and reconnection
export function openSSE(url = '/events', listeners = {}) {
	const es = new EventSource(url)

	// Enhanced error handling
	es.addEventListener('error', (event) => {
		console.warn('SSE connection error:', event)
		if (es.readyState === EventSource.CLOSED) {
			console.log('SSE connection closed')
		}
	})

	es.addEventListener('open', () => {
		console.log('SSE connection established')
	})

	// Add listeners with error handling
	for (const [type, handler] of Object.entries(listeners)) {
		es.addEventListener(type, (event) => {
			try {
				handler(event)
			} catch (error) {
				console.error(`Error handling SSE event ${type}:`, error)
			}
		})
	}

	return es
}

export function secondsToHms(d) {
	d = Number(d)
	const h = Math.floor(d / 3600)
	const m = Math.floor((d % 3600) / 60)
	const s = Math.floor(d % 60)
	return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}
