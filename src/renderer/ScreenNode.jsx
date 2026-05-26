import { Handle, Position } from "@xyflow/react"

export default function ScreenNode({ data }) {
  return (
    <div className="screen-node" onClick={data.onOpen}>
      <Handle type="target" position={Position.Left} />
      <img className="screen-node__thumb" src={data.thumb} alt="" draggable={false} />
      <div className="screen-node__body">
        <div className="screen-node__title">{data.title}</div>
        <div className="screen-node__stage">{data.stage}</div>
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  )
}
