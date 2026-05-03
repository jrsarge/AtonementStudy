import { useRef, useCallback, useState, useEffect } from 'react'
import ForceGraph2D from 'react-force-graph-2d'

export default function GraphView({ data }) {
  const fgRef = useRef()
  const [highlightNodes, setHighlightNodes] = useState(new Set())
  const [highlightLinks, setHighlightLinks] = useState(new Set())
  const [selectedNode, setSelectedNode] = useState(null)

  // Build adjacency for highlight-on-click
  const nodeLinks = useRef({})
  data.edges.forEach(e => {
    if (!nodeLinks.current[e.source]) nodeLinks.current[e.source] = { neighbors: new Set(), links: new Set() }
    if (!nodeLinks.current[e.target]) nodeLinks.current[e.target] = { neighbors: new Set(), links: new Set() }
    nodeLinks.current[e.source].neighbors.add(e.target)
    nodeLinks.current[e.target].neighbors.add(e.source)
    nodeLinks.current[e.source].links.add(e)
    nodeLinks.current[e.target].links.add(e)
  })

  // Build a lookup from id → full node data (for references)
  const nodeDataById = useRef({})
  data.nodes.forEach(n => { nodeDataById.current[n.id] = n })

  useEffect(() => {
    const fg = fgRef.current
    if (!fg) return
    fg.d3Force('charge').strength(-600)
    fg.d3Force('link').distance(180)
  }, [])

  const handleNodeClick = useCallback(node => {
    const info = nodeLinks.current[node.id]
    if (info) {
      setHighlightNodes(new Set([node.id, ...info.neighbors]))
      setHighlightLinks(new Set(info.links))
    }
    setSelectedNode(nodeDataById.current[node.id] ?? node)
  }, [])

  const handleBackgroundClick = useCallback(() => {
    setHighlightNodes(new Set())
    setHighlightLinks(new Set())
    setSelectedNode(null)
  }, [])

  const graphNodes = data.nodes.map(n => ({ id: n.id, label: n.label }))
  const graphLinks = data.edges.map(e => ({ source: e.source, target: e.target, label: e.label }))

  const nodeCanvasObject = useCallback((node, ctx, globalScale) => {
    const isHighlighted = highlightNodes.size === 0 || highlightNodes.has(node.id)
    const radius = 8
    ctx.beginPath()
    ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI)
    ctx.fillStyle = isHighlighted ? '#4a90d9' : '#2c3a5a'
    ctx.fill()
    ctx.strokeStyle = isHighlighted ? '#7ab3e8' : '#2c5f8a'
    ctx.lineWidth = 2 / globalScale
    ctx.stroke()

    const label = node.label || node.id
    const fontSize = Math.max(10, 13 / globalScale)
    ctx.font = `${fontSize}px sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = isHighlighted ? 'white' : '#555'
    ctx.fillText(label, node.x, node.y + radius + fontSize)
  }, [highlightNodes])

  const linkCanvasObject = useCallback((link, ctx, globalScale) => {
    const isHighlighted = highlightLinks.size === 0 || highlightLinks.has(link)

    const start = link.source
    const end = link.target
    if (typeof start !== 'object' || typeof end !== 'object') return

    const dx = end.x - start.x
    const dy = end.y - start.y
    const len = Math.sqrt(dx * dx + dy * dy)
    if (len === 0) return

    ctx.beginPath()
    ctx.moveTo(start.x, start.y)
    ctx.lineTo(end.x, end.y)
    ctx.strokeStyle = isHighlighted ? '#aaaaaa' : '#2a2a3a'
    ctx.lineWidth = (isHighlighted ? 1.5 : 1) / globalScale
    ctx.stroke()

    const arrowLen = 8 / globalScale
    const angle = Math.atan2(dy, dx)
    const ax = end.x - (10 / globalScale) * Math.cos(angle)
    const ay = end.y - (10 / globalScale) * Math.sin(angle)
    ctx.beginPath()
    ctx.moveTo(ax, ay)
    ctx.lineTo(ax - arrowLen * Math.cos(angle - 0.4), ay - arrowLen * Math.sin(angle - 0.4))
    ctx.lineTo(ax - arrowLen * Math.cos(angle + 0.4), ay - arrowLen * Math.sin(angle + 0.4))
    ctx.closePath()
    ctx.fillStyle = isHighlighted ? '#aaaaaa' : '#2a2a3a'
    ctx.fill()

    if (link.label && isHighlighted) {
      const midX = (start.x + end.x) / 2
      const midY = (start.y + end.y) / 2
      const fontSize = Math.max(8, 10 / globalScale)
      ctx.font = `${fontSize}px sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = '#cccccc'
      ctx.fillText(link.label, midX, midY - 6 / globalScale)
    }
  }, [highlightLinks])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <ForceGraph2D
        ref={fgRef}
        graphData={{ nodes: graphNodes, links: graphLinks }}
        backgroundColor="#1a1a2e"
        nodeCanvasObject={nodeCanvasObject}
        nodeCanvasObjectMode={() => 'replace'}
        linkCanvasObject={linkCanvasObject}
        linkCanvasObjectMode={() => 'replace'}
        onNodeClick={handleNodeClick}
        onBackgroundClick={handleBackgroundClick}
        nodeLabel={node => node.label || node.id}
        linkDirectionalArrowLength={0}
        d3AlphaDecay={0.01}
        d3VelocityDecay={0.2}
        cooldownTicks={200}
        onEngineStop={() => fgRef.current?.zoomToFit(400, 80)}
      />

      {selectedNode && (
        <div style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: 280,
          height: '100%',
          background: 'rgba(15, 15, 35, 0.95)',
          borderLeft: '1px solid #2c3a5a',
          padding: '24px 20px',
          boxSizing: 'border-box',
          overflowY: 'auto',
        }}>
          <button
            onClick={() => setSelectedNode(null)}
            style={{
              position: 'absolute',
              top: 12,
              right: 14,
              background: 'none',
              border: 'none',
              color: '#aaa',
              fontSize: 20,
              cursor: 'pointer',
              lineHeight: 1,
            }}
          >×</button>

          <h2 style={{ color: '#7ab3e8', fontSize: 16, fontWeight: 600, marginBottom: 16, textTransform: 'capitalize' }}>
            {selectedNode.label || selectedNode.id}
          </h2>

          <p style={{ color: '#888', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
            Scripture References
          </p>

          {selectedNode.references && selectedNode.references.length > 0 ? (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {selectedNode.references.map(ref => (
                <li key={ref} style={{
                  color: '#ccc',
                  fontSize: 14,
                  padding: '6px 0',
                  borderBottom: '1px solid #1e2a3a',
                }}>
                  {ref}
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ color: '#555', fontSize: 13, fontStyle: 'italic' }}>No references recorded yet.</p>
          )}
        </div>
      )}
    </div>
  )
}
