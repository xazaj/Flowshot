import { createRoot } from "react-dom/client"
import App from "./App.jsx"
import "./fonts.css"
import "./tokens.css"
import "./app.css"

const PLACEHOLDER_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="

const FALLBACK_MANIFEST = import.meta.env.DEV
  ? {
      uiFlowVersion: "v0.0.0-dev",
      project: { name: "Dev Preview", scope: "no manifest loaded" },
      crediOS: { commit: "0000000", commitTime: new Date().toISOString(), repo: "" },
      capturedAt: new Date().toISOString(),
      viewport: { width: 1280, height: 800 },
      nodes: [
        { id: "W1", title: "Workbench", lane: "shared", x: 0, y: 300, stage: "WORKBENCH", desc: "demo",
          thumb: "https://placehold.co/240x135/eeeeee/333333?text=W1", full: "https://placehold.co/1280x800/eeeeee/333333?text=W1" },
        { id: "A1", title: "Identity Scope", lane: "shared", x: 320, y: 300, stage: "IDENTITY_SCOPE", desc: "demo",
          thumb: "https://placehold.co/240x135/eeeeee/333333?text=A1", full: "https://placehold.co/1280x800/eeeeee/333333?text=A1" },
        { id: "N1", title: "NTC DE1", lane: "ntc", x: 640, y: 100, stage: "NTC_DE1_ENTRY", desc: "demo",
          thumb: "https://placehold.co/240x135/f5ecd9/333333?text=N1", full: "https://placehold.co/1280x800/f5ecd9/333333?text=N1" },
        { id: "E1", title: "ETC DE1", lane: "etc", x: 640, y: 540, stage: "ETC_DE1_ENTRY", desc: "demo",
          thumb: "https://placehold.co/240x135/d9d4ff/333333?text=E1", full: "https://placehold.co/1280x800/d9d4ff/333333?text=E1" },
      ],
      edges: [
        { from: "W1", to: "A1", label: "New" },
        { from: "A1", to: "N1", label: "NTC" },
        { from: "A1", to: "E1", label: "ETC" },
      ],
    }
  : null

function normalizeManifest(raw) {
  const m = raw && typeof raw === "object" ? raw : {}
  const rawNodes = Array.isArray(m.nodes) ? m.nodes : []
  const rawEdges = Array.isArray(m.edges) ? m.edges : []

  const seen = new Set()
  const nodes = []
  for (const n of rawNodes) {
    if (!n || typeof n.id !== "string") {
      console.warn("[flowshot] dropping node without id:", n)
      continue
    }
    if (seen.has(n.id)) {
      console.warn(`[flowshot] dropping duplicate node id: ${n.id}`)
      continue
    }
    seen.add(n.id)
    const next = { ...n }
    if (!next.thumb) {
      console.warn(`[flowshot] node ${n.id} missing thumb; using placeholder`)
      next.thumb = PLACEHOLDER_PNG
    }
    if (!next.full) {
      console.warn(`[flowshot] node ${n.id} missing full; using placeholder`)
      next.full = PLACEHOLDER_PNG
    }
    nodes.push(next)
  }

  const ids = new Set(nodes.map((n) => n.id))
  const edges = []
  for (const e of rawEdges) {
    if (!e || !ids.has(e.from) || !ids.has(e.to)) {
      console.warn("[flowshot] dropping edge with unknown endpoint:", e)
      continue
    }
    edges.push(e)
  }

  return { ...m, nodes, edges }
}

function readManifest() {
  const tag = document.getElementById("uiflow-manifest")
  if (tag && tag.textContent && tag.textContent.trim().length > 0) {
    try {
      return JSON.parse(tag.textContent)
    } catch (err) {
      console.error("[flowshot] failed to parse manifest:", err)
    }
  }
  return FALLBACK_MANIFEST
}

const root = createRoot(document.getElementById("root"))
const raw = readManifest()

if (!raw) {
  root.render(<div className="manifest-error">No manifest available</div>)
} else {
  const manifest = normalizeManifest(raw)
  if (manifest.nodes.length === 0) {
    root.render(<div className="manifest-error">Manifest has no nodes</div>)
  } else {
    root.render(<App manifest={manifest} />)
  }
}
