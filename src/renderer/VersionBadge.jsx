import { useEffect, useRef, useState } from "react"

function shortCommit(c) {
  if (!c) return "unknown"
  return c.length > 7 ? c.slice(0, 7) : c
}

function fmtDate(iso) {
  if (!iso) return ""
  try {
    const d = new Date(iso)
    return d.toISOString().replace("T", " ").slice(0, 19) + " UTC"
  } catch {
    return iso
  }
}

export default function VersionBadge({ manifest }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => { if (e.key === "Escape") setOpen(false) }
    document.addEventListener("mousedown", onDown)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  const commit = shortCommit(manifest.crediOS?.commit)
  const repo = manifest.crediOS?.repo
  const commitUrl = repo && manifest.crediOS?.commit
    ? `${repo}/commit/${manifest.crediOS.commit}`
    : null

  return (
    <div className="version-badge" ref={ref}>
      <button
        type="button"
        className="version-badge__pill"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="version-badge__mono">uiflow-{manifest.uiFlowVersion}</span>
        · CrediOS@{commit}
      </button>
      {open && (
        <div className="version-badge__popover" role="dialog">
          <div className="version-badge__row">
            <div className="version-badge__label">Project</div>
            <div className="version-badge__value">{manifest.project?.name}</div>
          </div>
          <div className="version-badge__row">
            <div className="version-badge__label">Scope</div>
            <div className="version-badge__value">{manifest.project?.scope}</div>
          </div>
          <div className="version-badge__row">
            <div className="version-badge__label">UI Flow Version</div>
            <div className="version-badge__value">{manifest.uiFlowVersion}</div>
          </div>
          <div className="version-badge__row">
            <div className="version-badge__label">CrediOS Commit</div>
            <div className="version-badge__value">
              {commitUrl ? (
                <a className="version-badge__link" href={commitUrl} target="_blank" rel="noreferrer">
                  {commit}
                </a>
              ) : commit}
            </div>
          </div>
          <div className="version-badge__row">
            <div className="version-badge__label">Commit Time</div>
            <div className="version-badge__value">{fmtDate(manifest.crediOS?.commitTime)}</div>
          </div>
          <div className="version-badge__row">
            <div className="version-badge__label">Captured At</div>
            <div className="version-badge__value">{fmtDate(manifest.capturedAt)}</div>
          </div>
        </div>
      )}
    </div>
  )
}
