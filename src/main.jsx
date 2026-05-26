import React from "react"
import { createRoot } from "react-dom/client"
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"

// 1x1 red dot PNG, base64 — simulates an inlined screenshot
const RED_DOT =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="

const ScreenNode = ({ data }) => (
  <div
    style={{
      width: 200,
      background: "#fff",
      border: "1px solid #111",
      borderRadius: 12,
      overflow: "hidden",
      fontFamily: "ui-sans-serif, system-ui",
    }}
  >
    <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
    <img src={data.thumb} alt="" style={{ width: "100%", display: "block", height: 90, background: "#eee" }} />
    <div style={{ padding: "8px 10px", fontSize: 14, fontWeight: 500 }}>{data.title}</div>
    <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
  </div>
)

const nodeTypes = { screen: ScreenNode }

const initialNodes = [
  { id: "W1", type: "screen", position: { x: 0, y: 0 }, data: { title: "Workbench", thumb: RED_DOT } },
  { id: "A1", type: "screen", position: { x: 300, y: 0 }, data: { title: "Identity Scope", thumb: RED_DOT } },
  { id: "N1", type: "screen", position: { x: 600, y: -80 }, data: { title: "NTC DE1 Entry", thumb: RED_DOT } },
  { id: "E1", type: "screen", position: { x: 600, y: 80 }, data: { title: "ETC DE1 Entry", thumb: RED_DOT } },
]

const initialEdges = [
  { id: "e1", source: "W1", target: "A1", label: "New", type: "smoothstep" },
  { id: "e2", source: "A1", target: "N1", label: "NTC", type: "smoothstep" },
  { id: "e3", source: "A1", target: "E1", label: "ETC", type: "smoothstep" },
]

function App() {
  return (
    <ReactFlow
      nodes={initialNodes}
      edges={initialEdges}
      nodeTypes={nodeTypes}
      fitView
      nodesDraggable={false}
    >
      <Background gap={16} />
      <Controls />
      <MiniMap />
    </ReactFlow>
  )
}

createRoot(document.getElementById("root")).render(<App />)
