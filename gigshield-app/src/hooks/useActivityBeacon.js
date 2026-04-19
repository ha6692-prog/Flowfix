import { useEffect } from 'react'
import { monitoringApi, getRole } from '../api/client'

const BEACON_INTERVAL_MS = 5 * 60 * 1000

const getNetworkType = () => {
  const effective = navigator.connection?.effectiveType || ''
  if (/wifi/i.test(effective)) return 'WiFi'
  if (/3g/i.test(effective)) return '3G'
  if (/2g|slow/i.test(effective)) return 'offline'
  return '4G'
}

const sendBeacon = () => {
  if (!localStorage.getItem('gs_access')) return
  if (getRole() !== 'worker') return
  if (!navigator.geolocation) return

  navigator.geolocation.getCurrentPosition(
    ({ coords }) => {
      monitoringApi.beacon({
        gps_lat: Number(coords.latitude),
        gps_lng: Number(coords.longitude),
        gps_spoofing_flag: false,
        accelerometer_active: false,
        gyro_active: false,
        network_type: getNetworkType(),
        app_in_foreground: document.visibilityState === 'visible',
      }).catch(() => {
        // Beacon failures should not interrupt user flow.
      })
    },
    () => {
      // If location permission is denied/unavailable, skip beacon quietly.
    },
    {
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: 120000,
    },
  )
}

export default function useActivityBeacon() {
  useEffect(() => {
    if (!localStorage.getItem('gs_access')) return undefined
    if (getRole() !== 'worker') return undefined

    sendBeacon()
    const id = window.setInterval(sendBeacon, BEACON_INTERVAL_MS)

    return () => window.clearInterval(id)
  }, [])
}
