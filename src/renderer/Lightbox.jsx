import { useEffect, useRef } from "react"

export default function Lightbox({ node, onClose }) {
  const ref = useRef(null)

  useEffect(() => {
    const dlg = ref.current
    if (!dlg) return
    if (node && !dlg.open) dlg.showModal()
    if (!node && dlg.open) dlg.close()
  }, [node])

  useEffect(() => {
    const dlg = ref.current
    if (!dlg) return
    const handleCancel = () => onClose()
    const handleClick = (e) => {
      if (e.target === dlg) onClose()
    }
    dlg.addEventListener("cancel", handleCancel)
    dlg.addEventListener("click", handleClick)
    return () => {
      dlg.removeEventListener("cancel", handleCancel)
      dlg.removeEventListener("click", handleClick)
    }
  }, [onClose])

  return (
    <dialog ref={ref} className="lightbox" aria-label="Screenshot detail">
      {node && (
        <div className="lightbox__inner">
          <button
            type="button"
            className="lightbox__close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
          <img className="lightbox__image" src={node.full} alt={node.title} />
          <div className="lightbox__caption">
            <div className="lightbox__caption-title">{node.title}</div>
            <div className="lightbox__caption-stage">{node.stage}</div>
          </div>
        </div>
      )}
    </dialog>
  )
}
