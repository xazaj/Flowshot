import { useEffect, useRef } from "react"

export default function Lightbox({ nodes, activeId, onClose, onNavigate }) {
  const ref = useRef(null)
  const closeBtnRef = useRef(null)
  const previousFocus = useRef(null)

  const index = activeId ? nodes.findIndex((n) => n.id === activeId) : -1
  const node = index >= 0 ? nodes[index] : null
  const hasPrev = index > 0
  const hasNext = index >= 0 && index < nodes.length - 1

  useEffect(() => {
    const dlg = ref.current
    if (!dlg) return
    if (node && !dlg.open) {
      previousFocus.current = document.activeElement
      dlg.showModal()
      closeBtnRef.current?.focus()
    }
    if (!node && dlg.open) {
      dlg.close()
      if (previousFocus.current && typeof previousFocus.current.focus === "function") {
        previousFocus.current.focus()
      }
    }
  }, [node])

  useEffect(() => {
    const dlg = ref.current
    if (!dlg) return
    const handleCancel = () => onClose()
    const handleClick = (e) => {
      if (e.target === dlg) onClose()
    }
    const handleKey = (e) => {
      if (!node) return
      if (e.key === "ArrowLeft" && hasPrev) {
        e.preventDefault()
        onNavigate(nodes[index - 1].id)
      } else if (e.key === "ArrowRight" && hasNext) {
        e.preventDefault()
        onNavigate(nodes[index + 1].id)
      }
    }
    dlg.addEventListener("cancel", handleCancel)
    dlg.addEventListener("click", handleClick)
    dlg.addEventListener("keydown", handleKey)
    return () => {
      dlg.removeEventListener("cancel", handleCancel)
      dlg.removeEventListener("click", handleClick)
      dlg.removeEventListener("keydown", handleKey)
    }
  }, [onClose, onNavigate, node, hasPrev, hasNext, index, nodes])

  return (
    <dialog ref={ref} className="lightbox" aria-label="Screenshot detail">
      {node && (
        <div className="lightbox__inner">
          <button
            ref={closeBtnRef}
            type="button"
            className="lightbox__close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
          {hasPrev && (
            <button
              type="button"
              className="lightbox__nav lightbox__nav--prev"
              onClick={() => onNavigate(nodes[index - 1].id)}
              aria-label={`Previous: ${nodes[index - 1].title}`}
            >
              ‹
            </button>
          )}
          {hasNext && (
            <button
              type="button"
              className="lightbox__nav lightbox__nav--next"
              onClick={() => onNavigate(nodes[index + 1].id)}
              aria-label={`Next: ${nodes[index + 1].title}`}
            >
              ›
            </button>
          )}
          {node.full ? (
            <img className="lightbox__image" src={node.full} alt={node.title} />
          ) : (
            <div className="lightbox__image lightbox__image--placeholder" aria-hidden="true" />
          )}
          <div className="lightbox__caption">
            <div className="lightbox__caption-eyebrow">
              <span className="lightbox__caption-stage">{node.stage}</span>
              <span className="lightbox__caption-counter">
                {String(index + 1).padStart(2, "0")} / {String(nodes.length).padStart(2, "0")}
              </span>
            </div>
            <div className="lightbox__caption-title">{node.title}</div>
            {node.desc && <div className="lightbox__caption-desc">{node.desc}</div>}
            {node.route && (
              <div className="lightbox__caption-route">
                <span className="lightbox__caption-route-label">Route</span>
                <code>{node.route}</code>
              </div>
            )}
          </div>
        </div>
      )}
    </dialog>
  )
}
