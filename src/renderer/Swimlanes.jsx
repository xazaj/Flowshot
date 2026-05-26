import { useMemo } from "react"
import { useViewport } from "@xyflow/react"

const NODE_W = 240
const NODE_H = 180
const PAD = 80

function computeLaneBox(nodes, lane) {
  const items = nodes.filter((n) => n.lane === lane)
  if (items.length === 0) return null
  const xs = items.map((n) => n.x)
  const ys = items.map((n) => n.y)
  const minX = Math.min(...xs) - PAD
  const minY = Math.min(...ys) - PAD
  const maxX = Math.max(...xs) + NODE_W + PAD
  const maxY = Math.max(...ys) + NODE_H + PAD
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}

export default function Swimlanes({ nodes }) {
  const { x, y, zoom } = useViewport()
  const ntc = useMemo(() => computeLaneBox(nodes, "ntc"), [nodes])
  const etc = useMemo(() => computeLaneBox(nodes, "etc"), [nodes])

  const transform = `translate(${x}px, ${y}px) scale(${zoom})`

  return (
    <div className="swimlanes">
      <div className="swimlanes__layer" style={{ transform }}>
        {ntc && (
          <div
            className="swimlane swimlane--ntc"
            style={{ left: ntc.x, top: ntc.y, width: ntc.width, height: ntc.height }}
          >
            <div className="swimlane__label">NTC · New-to-Credit</div>
          </div>
        )}
        {etc && (
          <div
            className="swimlane swimlane--etc"
            style={{ left: etc.x, top: etc.y, width: etc.width, height: etc.height }}
          >
            <div className="swimlane__label">ETC · Existing-to-Credit</div>
          </div>
        )}
      </div>
    </div>
  )
}
