import { useRef, useCallback, useState } from 'react'
import ForceGraph2D from 'react-force-graph-2d'

export default function GraphView({ data }) {
  const fgRef = useRef()
  const [highlightNodes, setHighlightNodes] = useState(new Set())
  const [highlightLinks, setHighlightLinks] = useState(new Set())

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

  const handleNodeClick = useCallback(node => {
    const info = nodeLinks.current[node.id]
    if (!info) return
    setHighlightNodes(new Set([node.id, ...info.neighbors]))
    setHighlightLinks(new Set(info.links))
  }, [])

  const handleBackgroundClick = useCallback(() => {
    setHighlightNodes(new Set())
    setHighlightLinks(new Set())
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

    // Draw line
    ctx.beginPath()
    ctx.moveTo(start.x, start.y)
    ctx.lineTo(end.x, end.y)
    ctx.strokeStyle = isHighlighted ? '#aaaaaa' : '#2a2a3a'
    ctx.lineWidth = (isHighlighted ? 1.5 : 1) / globalScale
    ctx.stroke()

    // Draw arrowhead
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

    // Draw edge label
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
      d3Force={('charge', undefined)}
    />
  )
}
