# MAX-SIM Structural Architecture Workbench

An interactive architecture research environment built with React, TypeScript, Vite, D3, Chart.js, Tailwind CSS, Zustand, and Framer Motion. The original Streamlit dashboard remains available under `max_sim/` with equivalent Python calculus methods.

## Start the React workbench

Requires Node.js **22.12+** (verified with Node 24) and npm.

```bash
npm ci
npm run dev
```

The development and preview servers bind to localhost by default. For explicit LAN or cloud-sandbox access, use `npm run dev:lan`, or `npm run preview -- --host 0.0.0.0`.

Open **http://localhost:5173**. All graph analysis runs locally in the browser; no API keys or backend are required.

```bash
npm test          # numerical, integrity, cascade, import/export, and state tests
npm run build     # strict TypeScript checks + production bundle in dist/
npm run preview   # serve the production build locally
```

Deploy `dist/` to a static host. The app uses no URL routes that require server rewrites. Use HTTPS for deployment. Identifiers use `crypto.randomUUID` with a UUID v4 fallback based on `crypto.getRandomValues` for plain-HTTP LAN testing.

## Three primary screens

- **Command Center:** draggable D3 topology, pan/zoom, cluster collapse/expand, centrality heatmap, structural metrics, topology-based subsystem health, spectral overview, and node inspector. Select **Connect**, then click two nodes, or use the source/target controls. Remove connections in the inspector. Add and delete subsystems through the controls.
- **Evolution Lab:** topology editing, named snapshots, baseline selection, snapshot comparison, export, restore, and architecture replay. Charts track identity, consecutive drift, connectivity, and spectral entropy as a complexity proxy. Replay is read-only and does not replace the live architecture.
- **Failure Simulator:** select nodes on the map and disable them as initial failures, or use preset scenarios. Run/pause/reset cascade playback, inspect failed nodes, surviving regions, identity collapse, and communication bottlenecks. **Apply simulated failures** explicitly replaces the working topology.

The **Research mode** switch reveals spectral matrices, sortable eigenvalues, eigenvectors, spectral density, translation comparison, and the experimental structural manifold simulator. Graph diameter and betweenness are also exposed in the node inspector.

## Data and persistence

The sample architecture contains the 12 requested subsystems and 24 undirected connections. A portable fixture is available at [`public/data/max-sim.json`](public/data/max-sim.json).

- Workspace, snapshots, edit history, and manually dragged positions are saved to browser `localStorage` on the current origin. Physics can move nodes after a reload; switch it off for manual arrangement. Physics motion itself does not create history events.
- Limits: **80 nodes**, **40 named snapshots**, **80 recent history events**, and **2 MB per import**. These bound synchronous eigendecomposition and browser storage. Export important snapshots for durable storage or sharing; there is no cloud synchronization.
- If saved data cannot be parsed or validated, its original browser-storage value is preserved and automatic writes pause. A recovery banner lets you download the exact saved data. **Replace saved copy** explicitly resumes persistence with the current in-memory workspace; export the original first if you need to recover it.
- Saved snapshots include `id`, `name`, ISO `timestamp`, `nodes`, and `edges`. Node IDs remain stable through comparisons and restores.
- **JSON:** accepts `{ nodes, edges }` or the exported snapshot object. Node schema: `{ id, label, type, x?, y? }`. Types: `Executive`, `Memory`, `Agent`, `Infrastructure`, `Cognition`. Edge schema: `{ source, target }`.
- **CSV:** exported columns are `kind,id,label,type,x,y,source,target,textEncoding`. Node rows have `kind=node`; edge rows have `kind=edge`. This preserves isolated nodes and labels containing commas or quotes. A simple `source,target` edge list can also be imported; its nodes default to Infrastructure.
- **GraphML:** one undirected graph, node `label`/`name` and `type` data keys (optional). Unspecified types default to Infrastructure. Directed graphs, non-unit weights, hyperedges, ports, DTDs, and entities are rejected.
- **Exports:** JSON/CSV architecture data, JSON snapshots, and SVG/PNG topology images. Image export captures the visible graph view, including zoom and current layout. Image export is available on Command Center and Evolution Lab.

All architectures are simple, undirected, and unweighted. Duplicate IDs, duplicate undirected edges, self-loops, invalid types, and dangling edge endpoints are rejected before any state changes. Imported labels are rendered as text.

## Numerical contract

The original six-node Streamlit topology and its existing definitions are preserved. The React sample is an explicitly expanded 12-node model.

| Measure                | Definition                                                                              |
| ---------------------- | --------------------------------------------------------------------------------------- |
| Laplacian              | `L = D − A`, node order matches the architecture array                                  |
| Identity `I(S)`        | Sum of Laplacian eigenvalues above `1e−8`; equals `2 × edge count` for this graph model |
| Drift `Dᵢ`             | `I(target) − I(source)`; cards use selected baseline, timeline uses preceding event     |
| Algebraic connectivity | Second-smallest Laplacian eigenvalue; zero for disconnected or fewer than two nodes     |
| Spectral radius        | Largest absolute **adjacency** eigenvalue                                               |
| Entropy `H(S)`         | `−Σ pᵢ log₂ pᵢ`, where `pᵢ = λᵢ / Σλ`; zero when there are no positive eigenvalues      |
| Translation loss `Lₜ`  | `H(source) − H(target)` in bits; negative means entropy gain                            |
| Fidelity `Fₜ`          | `I(target) / I(source)`; **undefined/N/A** if source identity is zero; can exceed 1     |
| Preservation score     | `min(Iₐ,Iᵦ) / max(Iₐ,Iᵦ)`; 1 when both are zero                                         |
| Information proxies    | Preserved = `min(Hₐ,Hᵦ)`; destroyed = `max(0,Lₜ)`; gained = `max(0,−Lₜ)`                |
| Centrality             | Degree divided by `n−1`; zero for singleton                                             |
| Betweenness            | Brandes shortest-path betweenness normalized for an undirected graph                    |
| Graph diameter         | Largest shortest-path distance; N/A for empty/disconnected graphs; singleton = 0        |
| Emergence proxy        | Mean local clustering coefficient, with degree < 2 contributing zero                    |

Identity is not a unique graph identifier. Cospectral graphs exist. Spectral entropy does not measure semantic information or cognition. The UI labels these experimental interpretations. Eigenvectors have arbitrary signs; repeated eigenvalues permit non-unique bases.

### Failure model

Initial failures are selected explicitly. Presets prefer the Executive node labeled Core Executive and the Infrastructure node labeled Routing Proxy, independently of their IDs. Without those names, they select the highest-degree Executive or highest-betweenness Infrastructure node (ID breaks ties). Memory and Agent presets select every node of the corresponding type; missing types produce a visible message. In each simultaneous round, a surviving node fails if the fraction of its **original** neighbors already failed meets the selected threshold. Originally isolated nodes do not spontaneously fail. Failed nodes and incident edges are removed from analysis. The simulator colors failed nodes red and distinct surviving components separately. Identity collapse is `(I(before)−I(after))/I(before)` (zero if initial identity is zero). This is a dependency-loss experiment, not a validated prediction of a real architecture's failure behavior.

### Research equation

Initial vector `S=(i,c,d,e,t)`:

- `i`: identity
- `c`: 1 − density
- `d`: identity difference from baseline
- `e`: mean local clustering
- `t`: entropy loss from baseline

The prompt leaves vector fields unspecified. This implementation explicitly defines:

```text
D = (d, 0, d, 0, 0)
E = (e, 0, 0, e, 0)
C = (c, c, 0, 0, 0)
T = (t, 0, 0, 0, t)
dS/dt = αD + βE − γC + δT
```

Sliders control α, β, γ, δ in [0,1]. Explicit Euler integration uses Δt=0.1, lasts 30 model time units, and clamps coordinates to ±10⁶. The radar shows `|x|/(1+|x|)`; signed values remain visible. This experiment evolves the vector independently of the topology. It is not a validated MAX Calculus law.

## Source structure

```text
src/
  App.tsx                    Three-screen application shell
  components/                D3 graph, Chart.js charts, and research panels
  engine/graph.ts            Validation and topology operations
  engine/metrics.ts          StructuralInvariant and spectral analysis
  engine/failure.ts          Synchronous cascade model
  engine/research.ts         Experimental vector evolution
  engine/io.ts               JSON, CSV, GraphML, SVG, PNG
  state/workbench.ts         Persistent Zustand workspace
  data/sample.ts             Twelve-subsystem sample architecture
  types.ts                   Shared TypeScript types
  test/                      Engine, data, and persistence tests
max_sim/                     Original Streamlit app and Python calculator
```

## Original Streamlit dashboard

Requires Python 3.11+. From the repository root:

```bash
python -m venv .venv
source .venv/bin/activate
python -m pip install -r max_sim/requirements.txt
streamlit run max_sim/app.py
python -m unittest discover -s tests -v
```

Open http://localhost:8501. Its original graph has 6 nodes, 7 edges, identity 14, and connectivity ≈0.4384. `StructuralInvariant` preserves `spectrum()`, `identity()`, `connectivity()`, `node_count()`, and `edge_count()`, and now adds the requested `laplacian_spectrum()`, `identity_invariant()`, `translation_loss(target)`, `structural_fidelity(target)`, and `structural_drift(target)` APIs. SciPy is explicitly declared for NetworkX's sparse Laplacian.

## Scope

This release implements a 2D research environment with local persistence. 3D/Three.js visualization, external live telemetry, multi-user collaboration, and cloud snapshot storage are future extensions.

## MAX-SIM OS workspace layers

- **Command workspace:** a local, deterministic natural-language command interpreter above the topology. Supports `Create Memory Cluster`, `Connect Agent Cluster A to World Model`, `Compute Identity Invariant`, `Run failure simulation on Core Executive`, `Save snapshot v12`, and `Compare snapshot v12 vs v18`. Names match full labels ignoring case; ambiguous names are rejected. The system-instruction disclosure and Explain results switch describe its behavior. This is not an LLM chat integration. Commands are disabled during history replay. Simulations use a 50% neighbor-loss threshold and require Apply simulated failures to change the graph.
- **Media Center:** submit YouTube links or HTTPS MP4/WebM URLs, or open local MP4/WebM recordings up to 200 MB. Dock/undock the player to retain it while navigating. Uploaded media uses a browser object URL and is never uploaded to a server. Closing/replacing a local video revokes its URL. Embedded media requires network connectivity and provider permission. Simulation playback opens the existing interactive Failure Simulator; screen recording capture is not included.
- **Intelligence Feed:** fetch public GitHub repository summaries, OpenAlex papers, Hacker News stories, and Open-Meteo current weather. Custom JSON endpoints accept an array or `{ "items": [{ "title": "...", "summary": "...", "url": "https://..." }] }`; use these for public sports, finance, market, or other feeds. Fetches omit credentials, time out after 15 seconds, and cap responses at 2 MB / 20 displayed results. CORS, provider limits, and availability apply. There is no background polling or private-key proxy.
- **Knowledge layer:** pin up to 40 observations with source and retrieval time during the current session. Model an observation as a Cognition node and connect it manually for experiments. Observations are not executed as commands; this does not infer dependencies, semantic relationships, or causal impact. Pinned content and command transcript are session-only; created topology nodes use existing local workspace persistence.

Existing spectral metrics, topology contracts, and Streamlit APIs are unchanged. Dedicated dependency graph ingestion, author/citation graphs, authenticated data providers, free-form model-backed conversation, and automatic event-to-simulation mapping remain extensions.

CSV exports mark text encoding as `apostrophe-v1` and prefix formula-like text and literal leading apostrophes to make spreadsheet opening safer. The importer decodes only marked rows, retaining exact IDs/labels and numeric coordinates. Legacy CSV without the marker retains its original interpretation. External CSV consumers may ignore the new column but must decode marked text to recover the original values.

## Portal Assistant

The default home is a Copilot-style interactive Portal-OS workspace. Suggested prompts and the keyboard-accessible composer use the existing local command interpreter to create subsystems, connect nodes, compute identity, save snapshots, and launch failure simulations. Ask `Summarize my architecture` for current metrics or `Explain the layers` for the Umbrella blueprint. Use **What can I ask?** for command examples. Enter sends; Shift+Enter adds a line. Responses can be copied; **New conversation** clears only the transcript. Conversation history is session-only and bounded to 20 exchanges. All existing workbench screens remain available from navigation.

The five-layer blueprint and determinant target are recorded in [CODERABBIT_INSTRUCTIONS.md](CODERABBIT_INSTRUCTIONS.md). The GUI identifies the local assistant and the unverified manifest target. Model-backed conversation, Worker execution, identity verification, and marketplace licensing are architectural targets, not connected services in this release.

## Portal-OS Alpha production domains

The [production manifest](CODERABBIT.md) guides incremental development. All nine Portal dashboards are accessible from navigation: Executive, Opportunity Radar, Research, GS-IP Factory, PMD, Compliance, Agents, Umbrella Planetary, and Founder Mission. Existing assistant, topology, research, media, feed, snapshots, and failure workflows remain available.

See [Portal Alpha architecture and workflow](docs/portal-alpha.md) for domain contracts, scoring formulas, source traceability, persistence/recovery, agent behavior, compliance rules, and MAX-SIM scenario APIs. Portal uses a separate validated local workspace with JSON import/export; its data does not replace the original graph store. Dashboards use hash URLs and work on static hosting without server rewrites.

```bash
npm test -- --coverage  # >=80% engine/domain coverage; 100% assistant/commands/graph
npm run build          # strict types and production bundle
```

Market inputs and planetary observations are explicitly sourced operator records. ICV and the agent network provide deterministic local analysis and recommendations. Independent fact verification, model-backed execution, cloud identity, and legal compliance certification require external contracts and are not claimed by this Alpha.
