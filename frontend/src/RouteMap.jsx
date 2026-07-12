import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Renders an encoded-polyline route on a clean Leaflet map (no react-leaflet dep).
export default function RouteMap({ points, color = '#2f6fed', height = 190, interactive = false }) {
  const el = useRef(null)

  useEffect(() => {
    if (!el.current || !points || points.length === 0) return
    const map = L.map(el.current, {
      zoomControl: interactive,
      attributionControl: false,
      dragging: interactive,
      scrollWheelZoom: false,
      doubleClickZoom: interactive,
      boxZoom: interactive,
      touchZoom: interactive,
      keyboard: false,
    })
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map)

    const line = L.polyline(points, { color, weight: 4, opacity: 0.95, lineJoin: 'round' }).addTo(map)
    L.circleMarker(points[0], { radius: 4, color: '#1a9d6b', fillColor: '#1a9d6b', fillOpacity: 1, weight: 0 }).addTo(map)
    L.circleMarker(points[points.length - 1], { radius: 4, color: '#d64550', fillColor: '#d64550', fillOpacity: 1, weight: 0 }).addTo(map)
    map.fitBounds(line.getBounds(), { padding: [16, 16] })
    const t = setTimeout(() => map.invalidateSize(), 30)

    return () => { clearTimeout(t); map.remove() }
  }, [points, color, interactive])

  return (
    <div
      ref={el}
      style={{ height, width: '100%', borderRadius: 10, overflow: 'hidden', background: '#eef0f3' }}
    />
  )
}
