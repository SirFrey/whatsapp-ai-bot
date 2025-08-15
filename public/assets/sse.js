// Lightweight SSE helper
export function openSSE(url = '/events', listeners = {}) {
	const es = new EventSource(url)
	for (const [type, handler] of Object.entries(listeners)) {
		es.addEventListener(type, handler)
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
