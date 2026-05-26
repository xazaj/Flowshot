import { useMemo, useCallback } from "react"
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  BackgroundVariant,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import ScreenNode from "./ScreenNode.jsx"
import Swimlanes from "./Swimlanes.jsx"

const nodeTypes = { screen: ScreenNode }

function buildNodes(manifest, onOpen) {
  return manifest.nodes.map((n) => ({
    id: n.id,
    type: "screen",
    position: { x: n.x, y: n.y },
    draggable: false,
    selectable: false,
    data: {
      title: n.title,
      stage: n.stage,
      thumb: n.thumb,
      onOpen: () => onOpen(n),
    },
  }))
}

function buildEdges(manifest) {
  return manifest.edges.map((e, i) => ({
    id: `e-${e.from}-${e.to}-${i}`,
    source: e.from,
    target: e.to,
    label: e.label,
    type: "smoothstep",
    labelBgPadding: [8, 4],
    labelBgBorderRadius: 50,
    labelBgStyle: { fill: "#ffffff" },
    labelStyle: { fontFamily: "var(--font-sans)", fontWeight: 500 },
    style: { stroke: "var(--color-ink)", strokeWidth: 1.5 },
  }))
}

export default function FlowCanvas({ manifest, onOpenNode }) {
  const nodes = useMemo(() => buildNodes(manifest, onOpenNode), [manifest, onOpenNode])
  const edges = useMemo(() => buildEdges(manifest), [manifest])

  const onInit = useCallback((rf) => {
    rf.fitView({ padding: 0.15, duration: 0 })
  }, [])

  return (
    <ReactFlowProvider>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        proOptions={{ hideAttribution: true }}
        onInit={onInit}
        minZoom={0.2}
        maxZoom={2}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#ececea" />
        <Swimlanes nodes={manifest.nodes} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </ReactFlowProvider>
  )
}
