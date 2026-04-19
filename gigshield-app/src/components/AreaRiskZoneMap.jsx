import { useEffect } from 'react'
import { MapContainer, TileLayer, Circle, Popup, Tooltip, useMap } from 'react-leaflet'

// Comprehensive Chennai coverage with 21 areas
const CHENNAI_ZONES = [
  // HIGH RISK
  { name: 'T Nagar', lat: 13.0418, lng: 80.2341, risk: 'high', riskScore: 78 },
  { name: 'Velachery', lat: 12.9791, lng: 80.2215, risk: 'high', riskScore: 82 },
  { name: 'Guindy', lat: 13.0067, lng: 80.2206, risk: 'high', riskScore: 75 },
  { name: 'Tambaram', lat: 12.9249, lng: 80.1000, risk: 'high', riskScore: 81 },
  { name: 'Perungalathur', lat: 12.9120, lng: 80.0900, risk: 'high', riskScore: 79 },
  { name: 'Sholinganallur', lat: 12.9010, lng: 80.2279, risk: 'high', riskScore: 77 },

  // MEDIUM RISK
  { name: 'Anna Nagar', lat: 13.0850, lng: 80.2101, risk: 'medium', riskScore: 58 },
  { name: 'Porur', lat: 13.0380, lng: 80.1565, risk: 'medium', riskScore: 62 },
  { name: 'OMR', lat: 12.9000, lng: 80.2300, risk: 'medium', riskScore: 55 },
  { name: 'Adyar', lat: 13.0069, lng: 80.2570, risk: 'medium', riskScore: 61 },
  { name: 'Thoraipakkam', lat: 12.9440, lng: 80.2380, risk: 'medium', riskScore: 59 },
  { name: 'Medavakkam', lat: 12.9170, lng: 80.1920, risk: 'medium', riskScore: 57 },
  { name: 'Ambattur', lat: 13.1143, lng: 80.1548, risk: 'medium', riskScore: 54 },
  { name: 'Chromepet', lat: 12.9516, lng: 80.1462, risk: 'medium', riskScore: 60 },

  // LOW RISK
  { name: 'Avadi', lat: 13.1143, lng: 80.1090, risk: 'low', riskScore: 28 },
  { name: 'Red Hills', lat: 13.1865, lng: 80.1999, risk: 'low', riskScore: 32 },
  { name: 'Perambur', lat: 13.1210, lng: 80.2320, risk: 'low', riskScore: 25 },
  { name: 'Mylapore', lat: 13.0339, lng: 80.2619, risk: 'low', riskScore: 35 },
  { name: 'Besant Nagar', lat: 13.0003, lng: 80.2660, risk: 'low', riskScore: 29 },
  { name: 'ECR', lat: 12.9500, lng: 80.2700, risk: 'low', riskScore: 31 },
  { name: 'Koyambedu', lat: 13.0732, lng: 80.1945, risk: 'low', riskScore: 27 },
]

const CITY_CENTERS = {
  chennai: [13.0827, 80.2707],
  bengaluru: [12.9716, 77.5946],
  mumbai: [19.076, 72.8777],
  delhi: [28.6139, 77.209],
  hyderabad: [17.385, 78.4867],
}

const riskColor = (riskLevel = 'low') => {
  if (riskLevel === 'high') return '#ef4444'
  if (riskLevel === 'medium') return '#f59e0b'
  return '#10b981'
}

const riskLabel = (riskLevel = 'low') => {
  if (riskLevel === 'high') return 'High'
  if (riskLevel === 'medium') return 'Moderate'
  return 'Low'
}

const getRiskRadius = (riskLevel = 'low') => {
  if (riskLevel === 'high') return 2000
  if (riskLevel === 'medium') return 1500
  return 1200
}

function FitToZones({ zones }) {
  const map = useMap()

  useEffect(() => {
    if (!zones.length) return

    if (zones.length === 1) {
      map.setView([zones[0].lat, zones[0].lng], 11)
      return
    }

    const bounds = zones.map((z) => [z.lat, z.lng])
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 11 })
  }, [map, zones])

  return null
}

export default function AreaRiskZoneMap({ zones = [], loading = false }) {
  // Use hardcoded Chennai zones for comprehensive coverage
  const displayZones = CHENNAI_ZONES

  const initialCenter = [13.0827, 80.2707] // Chennai center

  if (loading) {
    return (
      <div className="glass p-6 animate-slide-up">
        <div className="h-[320px] rounded-2xl border border-white/[0.08] bg-white/[0.03] animate-pulse" />
      </div>
    )
  }

  if (!displayZones.length) {
    return (
      <div className="glass p-6 animate-slide-up">
        <p className="text-slate-400 text-sm">No zone map data available yet.</p>
      </div>
    )
  }

  return (
    <div className="glass p-6 animate-slide-up">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-slate-400 text-sm uppercase tracking-wider">Area Risk Zone Map</p>
          <h3 className="text-white text-xl font-bold">Live Zone Risk Overlay</h3>
        </div>
        <div className="flex gap-3 text-xs text-slate-400">
          <span className="inline-flex items-center gap-1"><i className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />Low</span>
          <span className="inline-flex items-center gap-1"><i className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />Moderate</span>
          <span className="inline-flex items-center gap-1"><i className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />High</span>
        </div>
      </div>

      <div className="h-[360px] overflow-hidden rounded-2xl border border-white/[0.08]">
        <MapContainer
          center={initialCenter}
          zoom={11}
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%' }}
        >
          <FitToZones zones={displayZones} />

          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {displayZones.map((zone, index) => {
            const color = riskColor(zone.risk)
            const radius = getRiskRadius(zone.risk)

            return (
              <Circle
                key={`${zone.name}-${index}`}
                center={[zone.lat, zone.lng]}
                radius={radius}
                pathOptions={{
                  color,
                  fillColor: color,
                  fillOpacity: 0.4,
                  weight: 2,
                }}
              >
                <Tooltip direction="top" offset={[0, -8]} permanent>
                  <span style={{ fontWeight: 700 }}>{zone.name}</span>
                </Tooltip>
                <Popup>
                  <div className="text-sm">
                    <p><strong>{zone.name}</strong></p>
                    <p>Risk Level: <strong>{riskLabel(zone.risk)}</strong></p>
                    <p>Risk Score: <strong>{zone.riskScore}%</strong></p>
                  </div>
                </Popup>
              </Circle>
            )
          })}
        </MapContainer>
      </div>
    </div>
  )
}
