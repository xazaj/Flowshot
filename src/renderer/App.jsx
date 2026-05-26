import { useCallback, useState } from "react"
import FlowCanvas from "./FlowCanvas.jsx"
import Lightbox from "./Lightbox.jsx"
import VersionBadge from "./VersionBadge.jsx"

export default function App({ manifest }) {
  const [active, setActive] = useState(null)
  const [ready, setReady] = useState(false)
  const handleOpen = useCallback((n) => setActive(n), [])
  const handleClose = useCallback(() => setActive(null), [])
  const handleReady = useCallback(() => setReady(true), [])

  return (
    <div className="app-shell" data-ready={ready ? "true" : "false"}>
      <header className="top-nav">
        <div className="top-nav__brand">
          <div className="top-nav__eyebrow">User Flow Map</div>
          <div className="top-nav__wordmark">{manifest.project?.name || "CrediOS UI Flow"}</div>
          {manifest.project?.scope && (
            <div className="top-nav__scope">{manifest.project.scope}</div>
          )}
        </div>
        <VersionBadge manifest={manifest} />
      </header>
      <main className="flow-wrap">
        <FlowCanvas manifest={manifest} onOpenNode={handleOpen} onReady={handleReady} />
      </main>
      <Lightbox node={active} onClose={handleClose} />
    </div>
  )
}
