import { useState, useEffect } from 'react'
import GraphView from './GraphView.jsx'

export default function App() {
  const [graphData, setGraphData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch('/graph.json')
      .then(r => r.json())
      .then(setGraphData)
      .catch(() => setError('Failed to load graph data'))
  }, [])

  if (error) return <div style={{ padding: 32, color: '#ff6b6b' }}>{error}</div>
  if (!graphData) return <div style={{ padding: 32, color: '#aaa' }}>Loading...</div>

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#1a1a2e' }}>
      {graphData.nodes.length === 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#aaa', fontSize: 18 }}>
          No graph data yet. Run <code style={{ margin: '0 8px', color: '#7ab3e8' }}>python3 scripts/review_passage.py</code> to add concepts.
        </div>
      ) : (
        <GraphView data={graphData} />
      )}
    </div>
  )
}
