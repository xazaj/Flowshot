import { useCallback, useState } from "react"
import FlowCanvas from "./FlowCanvas.jsx"
import Lightbox from "./Lightbox.jsx"
import VersionBadge from "./VersionBadge.jsx"
import MarqueeStrip from "./MarqueeStrip.jsx"

function buildCommitUrl(manifest) {
  const repo = manifest.crediOS?.repo
  const commit = manifest.crediOS?.commit
  if (!repo || !commit) return null
  const cleanCommit = commit.replace(/-dirty$/, "")
  return `${repo.replace(/\.git$/, "")}/tree/${cleanCommit}`
}

export default function App({ manifest }) {
  const [activeId, setActiveId] = useState(null)
  const [ready, setReady] = useState(false)
  const handleOpen = useCallback((n) => setActiveId(n.id), [])
  const handleClose = useCallback(() => setActiveId(null), [])
  const handleNavigate = useCallback((id) => setActiveId(id), [])
  const handleReady = useCallback(() => setReady(true), [])
  const commitUrl = buildCommitUrl(manifest)

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
        <div className="top-nav__actions">
          <VersionBadge manifest={manifest} />
          {commitUrl && (
            <a
              className="btn btn--primary"
              href={commitUrl}
              target="_blank"
              rel="noreferrer noopener"
            >
              Open source ↗
            </a>
          )}
        </div>
      </header>
      <MarqueeStrip manifest={manifest} />
      <main className="flow-wrap">
        <FlowCanvas manifest={manifest} onOpenNode={handleOpen} onReady={handleReady} />
      </main>
      <Lightbox
        nodes={manifest.nodes || []}
        activeId={activeId}
        onClose={handleClose}
        onNavigate={handleNavigate}
      />
    </div>
  )
}
