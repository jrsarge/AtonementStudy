import { useRef, useCallback, useState, useEffect, useMemo } from 'react'
import ForceGraph2D from 'react-force-graph-2d'

const OUTCOME_NODES = new Set([
  'forgiveness of sins', 'salvation', 'eternal life', 'redemption', 'healing', 'mercy',
  'adoption as children of god', 'universal resurrection', 'immortal bodies', 'freedom from the fall',
  'kingdom of god', 'first resurrection', 'possibility of joy',
])

const HUMAN_CONDITION_NODES = new Set([
  'faith', 'repentance', 'broken heart and contrite spirit', 'obedience to commandments',
  'ordinances of salvation', 'human agency',
])

function getNodeColor(id) {
  if (id.startsWith("christ's")) return '#4a90d9'
  if (OUTCOME_NODES.has(id)) return '#5ab870'
  if (HUMAN_CONDITION_NODES.has(id)) return '#e8a838'
  return '#8a6bbf'
}

const CATEGORIES = [
  { id: 'christs',     label: "Christ's",         color: '#4a90d9', test: id => id.startsWith("christ's") },
  { id: 'outcomes',    label: 'Outcomes',          color: '#5ab870', test: id => OUTCOME_NODES.has(id) },
  { id: 'human',       label: 'Human Conditions',  color: '#e8a838', test: id => HUMAN_CONDITION_NODES.has(id) },
  { id: 'foundational',label: 'Foundational',      color: '#8a6bbf', test: id => !id.startsWith("christ's") && !OUTCOME_NODES.has(id) && !HUMAN_CONDITION_NODES.has(id) },
]

export default function GraphView({ data }) {
  const fgRef = useRef()
  const [highlightNodes, setHighlightNodes] = useState(new Set())
  const [highlightLinks, setHighlightLinks] = useState(new Set())
  const [selectedNode, setSelectedNode] = useState(null)
  const [activeCategory, setActiveCategory] = useState(null)

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

  const nodeDegree = useMemo(() => {
    const deg = {}
    data.edges.forEach(e => {
      deg[e.source] = (deg[e.source] || 0) + 1
      deg[e.target] = (deg[e.target] || 0) + 1
    })
    return deg
  }, [data])

  const categoryMatchIds = useMemo(() => {
    if (!activeCategory) return null
    const cat = CATEGORIES.find(c => c.id === activeCategory)
    return new Set(data.nodes.filter(n => cat.test(n.id)).map(n => n.id))
  }, [activeCategory, data])

  // Expand category nodes to include shortest-path bridge nodes back to 'atonement'
  const visibleNodeIds = useMemo(() => {
    if (!categoryMatchIds) return null

    // Build undirected adjacency: id → [neighbor ids]
    const adj = {}
    data.edges.forEach(e => {
      ;(adj[e.source] = adj[e.source] || []).push(e.target)
      ;(adj[e.target] = adj[e.target] || []).push(e.source)
    })

    const visible = new Set(categoryMatchIds)

    // BFS from each category node to 'atonement', add all nodes on the path
    categoryMatchIds.forEach(startId => {
      if (startId === 'atonement') return
      const parent = { [startId]: null }
      const queue = [startId]
      let found = false
      outer: for (let i = 0; i < queue.length; i++) {
        for (const neighbor of (adj[queue[i]] || [])) {
          if (neighbor in parent) continue
          parent[neighbor] = queue[i]
          if (neighbor === 'atonement') { found = true; break outer }
          queue.push(neighbor)
        }
      }
      if (found) {
        let cur = 'atonement'
        while (cur !== null) { visible.add(cur); cur = parent[cur] }
      }
    })

    return visible
  }, [categoryMatchIds, data])

  const graphNodes = useMemo(() => {
    if (!visibleNodeIds) return data.nodes.map(n => ({ id: n.id, label: n.label }))
    return data.nodes.filter(n => visibleNodeIds.has(n.id)).map(n => ({ id: n.id, label: n.label }))
  }, [data, visibleNodeIds])

  const graphLinks = useMemo(() => {
    if (!visibleNodeIds) return data.edges.map(e => ({ source: e.source, target: e.target, label: e.label }))
    return data.edges
      .filter(e => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target))
      .map(e => ({ source: e.source, target: e.target, label: e.label }))
  }, [data, visibleNodeIds])

  const nodeCanvasObject = useCallback((node, ctx, globalScale) => {
    const isHighlighted = categoryMatchIds
      ? categoryMatchIds.has(node.id)
      : (highlightNodes.size === 0 || highlightNodes.has(node.id))

    const degree = nodeDegree[node.id] || 0
    const radius = 6 + Math.min(degree * 1.2, 16)
    const color = getNodeColor(node.id)

    ctx.beginPath()
    ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI)
    ctx.fillStyle = isHighlighted ? color : '#1e2235'
    ctx.fill()
    ctx.strokeStyle = isHighlighted ? color : '#2c3a5a'
    ctx.lineWidth = 2 / globalScale
    ctx.stroke()

    if (globalScale >= 0.7) {
      const label = node.label || node.id
      const fontSize = Math.max(10, 13 / globalScale)
      ctx.font = `${fontSize}px sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = isHighlighted ? 'white' : '#555'
      ctx.fillText(label, node.x, node.y + radius + fontSize)
    }
  }, [highlightNodes, nodeDegree, categoryMatchIds])

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
      {/* Left filter sidebar */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: 160,
        height: '100%',
        background: 'rgba(10, 10, 25, 0.85)',
        borderRight: '1px solid #2c3a5a',
        padding: '16px 10px',
        boxSizing: 'border-box',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}>
        <p style={{ color: '#666', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 4px' }}>Filter by topic</p>
        {CATEGORIES.map(cat => {
          const isActive = activeCategory === cat.id
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(isActive ? null : cat.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 10px',
                background: isActive ? `${cat.color}22` : 'transparent',
                border: `1px solid ${isActive ? cat.color : '#2c3a5a'}`,
                borderRadius: 6,
                color: isActive ? cat.color : '#888',
                fontSize: 12,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s',
              }}
            >
              <span style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: cat.color,
                flexShrink: 0,
              }} />
              {cat.label}
            </button>
          )
        })}
      </div>

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
              {selectedNode.references.map(({ ref, quote }) => (
                <li key={ref} style={{ padding: '10px 0', borderBottom: '1px solid #1e2a3a' }}>
                  <div style={{ color: '#7ab3e8', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>{ref}</div>
                  {quote && (
                    <blockquote style={{
                      margin: 0,
                      paddingLeft: 10,
                      borderLeft: '2px solid #2c3a5a',
                      color: '#bbb',
                      fontSize: 13,
                      lineHeight: 1.6,
                      fontStyle: 'italic',
                    }}>
                      "{quote}"
                    </blockquote>
                  )}
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
