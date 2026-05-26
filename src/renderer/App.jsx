import { useCallback, useState } from "react"
import FlowCanvas from "./FlowCanvas.jsx"
import Lightbox from "./Lightbox.jsx"
import VersionBadge from "./VersionBadge.jsx"

export default function App({ manifest }) {
  const [active, setActive] = useState(null)
  const handleOpen = useCallback((n) => setActive(n), [])
  const handleClose = useCallback(() => setActive(null), [])

  return (
    <div className="app-shell">
      <header className="top-nav">
        <div className="top-nav__wordmark">CrediOS UI Flow</div>
        <VersionBadge manifest={manifest} />
      </header>
      <main className="flow-wrap">
        <FlowCanvas manifest={manifest} onOpenNode={handleOpen} />
      </main>
      <Lightbox node={active} onClose={handleClose} />
    </div>
  )
}
