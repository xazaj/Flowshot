import { createRoot } from "react-dom/client"
import App from "./App.jsx"
import "./fonts.css"
import "./tokens.css"
import "./app.css"

const FALLBACK_MANIFEST = {
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

const manifest = readManifest()
createRoot(document.getElementById("root")).render(<App manifest={manifest} />)
