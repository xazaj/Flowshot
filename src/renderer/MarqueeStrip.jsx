export default function MarqueeStrip({ manifest }) {
  const nodeCount = manifest.nodes?.length ?? 0
  const edgeCount = manifest.edges?.length ?? 0
  const commit = manifest.crediOS?.commit ?? "—"
  const capturedAt = manifest.capturedAt ? manifest.capturedAt.slice(0, 10) : "—"
  const items = [
    `${nodeCount} stages`,
    `${edgeCount} transitions`,
    `CrediOS@${commit}`,
    `Captured ${capturedAt}`,
    manifest.uiFlowVersion ? `UI Flow ${manifest.uiFlowVersion}` : null,
  ].filter(Boolean)

  return (
    <div className="marquee-strip" role="status" aria-label="Flow metadata">
      <div className="marquee-strip__track">
        {items.map((s, i) => (
          <span key={i} className="marquee-strip__item">{s}</span>
        ))}
      </div>
    </div>
  )
}
