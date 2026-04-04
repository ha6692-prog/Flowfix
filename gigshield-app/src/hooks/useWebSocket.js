import { useEffect, useRef, useState, useCallback } from 'react'

const MAX_RETRIES = 10
const RETRY_DELAY_MS = 3000

/**
 * useWebSocket — auto-reconnecting WebSocket hook for claim status.
 *
 * @param {string|null} driverId  - UUID of the authenticated driver
 * @param {function}    onMessage - callback(event: {type, payload})
 * @returns {{ connected, lastMessage, disconnect }}
 */
export default function useWebSocket(driverId, onMessage) {
  const [connected, setConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState(null)
  const wsRef = useRef(null)
  const retriesRef = useRef(0)
  const retryTimerRef = useRef(null)
  const unmountedRef = useRef(false)

  const connect = useCallback(() => {
    if (!driverId || unmountedRef.current) return

    const token = localStorage.getItem('gs_access')
    if (!token) return

    // Determine WebSocket URL from environment or current location
    let wsUrl
    const wsEnvUrl = import.meta.env.VITE_WS_URL
    
    if (wsEnvUrl) {
      // Use environment variable (e.g., wss://api.example.com)
      wsUrl = `${wsEnvUrl}/ws/claim/${driverId}/?token=${token}`
    } else {
      // Fallback to current location for local development
      const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
      const host = window.location.host
      wsUrl = `${protocol}://${host}/ws/claim/${driverId}/?token=${token}`
    }

    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      setConnected(true)
      retriesRef.current = 0
    }

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        setLastMessage(data)
        onMessage?.(data)
      } catch (_) {}
    }

    ws.onclose = (e) => {
      setConnected(false)
      if (!unmountedRef.current && retriesRef.current < MAX_RETRIES) {
        retriesRef.current += 1
        retryTimerRef.current = setTimeout(connect, RETRY_DELAY_MS)
      }
    }

    ws.onerror = () => {
      ws.close()
    }
  }, [driverId, onMessage])

  useEffect(() => {
    unmountedRef.current = false
    connect()
    return () => {
      unmountedRef.current = true
      clearTimeout(retryTimerRef.current)
      wsRef.current?.close()
    }
  }, [connect])

  const disconnect = () => {
    unmountedRef.current = true
    clearTimeout(retryTimerRef.current)
    wsRef.current?.close()
    setConnected(false)
  }

  return { connected, lastMessage, disconnect }
}
