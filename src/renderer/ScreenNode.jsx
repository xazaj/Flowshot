import { Handle, Position } from "@xyflow/react"

export default function ScreenNode({ data }) {
  const onKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      data.onOpen()
    }
  }
  return (
    <div
      className="screen-node"
      role="button"
      tabIndex={0}
      onClick={data.onOpen}
      onKeyDown={onKeyDown}
      aria-label={`Open ${data.title}`}
    >
      <Handle type="target" position={Position.Left} />
      {data.thumb ? (
        <img className="screen-node__thumb" src={data.thumb} alt="" draggable={false} />
      ) : (
        <div className="screen-node__thumb screen-node__thumb--placeholder" aria-hidden="true" />
      )}
      <div className="screen-node__body">
        <div className="screen-node__title">{data.title}</div>
        <div className="screen-node__stage">{data.stage}</div>
      </div>
      {(data.desc || data.route) && (
        <div className="screen-node__tooltip" role="tooltip">
          {data.desc && <div className="screen-node__tooltip-desc">{data.desc}</div>}
          {data.route && (
            <div className="screen-node__tooltip-route">
              <span className="screen-node__tooltip-route-label">Route</span>
              <code>{data.route}</code>
            </div>
          )}
        </div>
      )}
      <Handle type="source" position={Position.Right} />
    </div>
  )
}
