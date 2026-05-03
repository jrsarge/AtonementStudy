# AtonementStudy — Project Guide for Claude

## Purpose
A theological knowledge graph focused on the Atonement of Jesus Christ, built incrementally from scripture passages. The graph is visualized as a React/Vite site deployed on Vercel.

## Workflow
1. User pastes a scripture passage into the chat
2. Claude extracts concept triples and presents them for review
3. User approves/rejects/edits each triple
4. Claude writes approved triples to `public/graph.json`
5. User deploys to Vercel manually when ready

## Extracting Triples — Core Principle
**The Atonement is the central focus.** Every triple should be framed in terms of what it teaches about the Atonement — what enables it, what it requires, what it produces, what it contrasts with. Avoid triples that are purely about peripheral topics without connecting back to the Atonement.

## Data
- `public/graph.json` — the persistent graph (nodes + edges), updated after each approved session
- Nodes are deduplicated by `id` (lowercase)
- Edges are directed: `source → target` with a `label`
- Nodes have a `references` array of objects: `[{ "ref": "Ether 3:14", "quote": "..." }]` — always populate this when writing new nodes. Clicking a node shows the reference and quote in a side panel.
- **Quote rule:** The quote must be the complete text of every verse cited — no partial verses. It does not need to be the entire multi-verse passage, but any verse included must be quoted in full. If the full text of a verse is not known, leave `"quote": ""` and flag it for the user to fill in.
- **Node naming — who rule:** When a concept refers specifically to Christ's action (e.g. his suffering, his death, his sinless life), prefix the node label with "Christ's" (e.g. `christ's suffering for sins`, `christ's death`). Reserve unprefixed labels for concepts that apply to mankind generally (e.g. `healing`, `sin`, `repentance`).

## Tech Stack
- React + Vite (`npm run dev`, `npm run build`)
- `react-force-graph-2d` for graph visualization
- No Python scripts — triple extraction happens in-chat with Claude
