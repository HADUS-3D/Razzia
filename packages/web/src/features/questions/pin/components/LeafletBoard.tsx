import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { useEffect, useRef, type CSSProperties } from "react"
import type { PinMapView, PinPosition } from "@razzia/common/types/game"
import { MAP_MAX_ZOOM, PIN_DEFAULT_MAP_VIEW } from "@razzia/common/constants"

const TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png"

const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'

const PIN_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" stroke="white" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3" fill="white"/></svg>'

const FIT_PADDING: L.PointTuple = [40, 40]

const FIT_MAX_ZOOM = 12

export interface BoardMarker extends PinPosition {
  color?: string
  label?: string
  size?: "sm" | "md"
  /** Image only: animation hooks. */
  className?: string
  style?: CSSProperties
}

export interface BoardCircle extends PinPosition {
  /** Percent of the image width, or km on a map. */
  radius: number
  tone: "right" | "limit"
}

export interface BoardLines {
  from: PinPosition
  to: Array<PinPosition & { color: string }>
}

const markerIcon = ({ color = "#ef4444", label, size = "md" }: BoardMarker) => {
  const root = document.createElement("div")

  root.style.cssText =
    "position:absolute;left:0;top:0;transform:translate(-50%,-100%);display:flex;flex-direction:column;align-items:center;pointer-events:none"

  if (label) {
    const text = document.createElement("span")

    text.textContent = label
    text.style.cssText =
      "margin-bottom:2px;max-width:96px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;border-radius:4px;background:rgba(0,0,0,.7);padding:0 4px;font:700 11px/16px sans-serif;color:#fff"
    root.append(text)
  }

  const pin = document.createElement("div")
  const px = size === "md" ? 34 : 26

  pin.style.cssText = `width:${px}px;height:${px}px;fill:${color};filter:drop-shadow(0 1px 2px rgba(0,0,0,.5))`
  pin.innerHTML = PIN_SVG
  root.append(pin)

  return L.divIcon({ html: root, className: "", iconSize: [0, 0] })
}

interface Props {
  view?: PinMapView
  onPick?: (_position: PinPosition) => void
  onViewChange?: (_view: PinMapView) => void
  markers?: BoardMarker[]
  circles?: BoardCircle[]
  lines?: BoardLines
  /** Zoom to show every marker, circle and line. */
  fit?: boolean
  heightClass?: string
}

/** An OpenStreetMap map. Positions are x = longitude and y = latitude, radii are in km. */
const LeafletBoard = ({
  view = PIN_DEFAULT_MAP_VIEW,
  onPick,
  onViewChange,
  markers = [],
  circles = [],
  lines,
  fit,
  heightClass = "h-[50vh]",
}: Props) => {
  const element = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const layer = useRef<L.LayerGroup | null>(null)
  const handlers = useRef({ onPick, onViewChange })

  handlers.current = { onPick, onViewChange }

  useEffect(() => {
    if (!element.current) {
      return undefined
    }

    const instance = L.map(element.current, {
      center: [view.lat, view.lng],
      zoom: view.zoom,
      maxZoom: MAP_MAX_ZOOM,
      worldCopyJump: true,
    })

    L.tileLayer(TILES, {
      attribution: ATTRIBUTION,
      maxZoom: MAP_MAX_ZOOM,
    }).addTo(instance)

    instance.on("click", (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng.wrap()

      handlers.current.onPick?.({ x: lng, y: lat })
    })
    instance.on("moveend", () => {
      const center = instance.getCenter().wrap()

      handlers.current.onViewChange?.({
        lat: center.lat,
        lng: center.lng,
        zoom: instance.getZoom(),
      })
    })

    layer.current = L.layerGroup().addTo(instance)
    map.current = instance

    const observer = new ResizeObserver(() => instance.invalidateSize())

    observer.observe(element.current)

    return () => {
      observer.disconnect()
      instance.remove()
      map.current = null
      layer.current = null
    }
    // The map is created once; its starting view is only used then.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const group = layer.current
    const instance = map.current

    if (!group || !instance) {
      return
    }

    group.clearLayers()

    const bounds = L.latLngBounds([])

    circles.forEach((circle) => {
      const center: L.LatLngTuple = [circle.y, circle.x]
      const shape = L.circle(center, {
        radius: circle.radius * 1000,
        interactive: false,
        color: circle.tone === "right" ? "#22c55e" : "#ef4444",
        fillColor: "#22c55e",
        fillOpacity: circle.tone === "right" ? 0.25 : 0,
        dashArray: circle.tone === "right" ? undefined : "6 6",
        weight: 2,
      }).addTo(group)

      if (circle.tone === "right") {
        bounds.extend(shape.getBounds())
      }
    })

    if (lines) {
      lines.to.forEach((point) => {
        L.polyline(
          [
            [lines.from.y, lines.from.x],
            [point.y, point.x],
          ],
          {
            color: point.color,
            weight: 2,
            dashArray: "4 4",
            interactive: false,
          },
        ).addTo(group)
      })
    }

    markers.forEach((marker) => {
      L.marker([marker.y, marker.x], {
        icon: markerIcon(marker),
        interactive: false,
        keyboard: false,
      }).addTo(group)
      bounds.extend([marker.y, marker.x])
    })

    if (fit && bounds.isValid()) {
      instance.fitBounds(bounds, {
        padding: FIT_PADDING,
        maxZoom: FIT_MAX_ZOOM,
      })
    }
  }, [markers, circles, lines, fit])

  return (
    <div
      ref={element}
      className={`${heightClass} z-0 w-full rounded-md bg-white shadow-lg ${onPick ? "cursor-crosshair" : ""}`}
    />
  )
}

export default LeafletBoard
