# PORTAL‑OS ALPHA PRODUCTION MANIFEST

Repository: portal-os1-rabbit

Product: Portal‑OS Alpha

Classification: Primary Product Repository

Status: ACTIVE DEVELOPMENT

## PURPOSE

Portal‑OS Alpha is the primary application layer of the Umbrella Planetary Ecosystem.

The repository currently contains:

- Research Workbench
- Knowledge Graph Engine
- Assistant Layer
- Command System
- MAX‑Sim Integration
- Visualization Layer

The objective is to evolve the platform into:

- Portal‑OS
- ICV (Intelligent Coherence Vector)
- GS‑IP Factory
- Market Intelligence
- PMD Command System
- Founder Mission Console
- Umbrella Planetary Dashboard

This repository is the primary product layer of the ecosystem.

## ENGINEERING DIRECTIVE

When modifying this repository:

ALWAYS:

- Extend
- Refactor
- Modularize
- Document

NEVER:

- Remove working functionality
- Rewrite proven systems
- Duplicate architecture
- Introduce breaking changes without migration paths

Optimize for:

- Reliability
- Maintainability
- Observability
- Performance
- Developer Velocity

## PROTECTED KERNEL MODULES

The following files are kernel components. These files may be improved and refactored but must not be removed.

Protected Files:

- src/engine/assistant.ts
- src/engine/commands.ts
- src/engine/graph.ts
- src/engine/research.ts
- src/engine/metrics.ts
- src/state/workbench.ts

Rules:

- Preserve public behaviour
- Preserve compatibility
- Add tests before major changes
- Refactor incrementally

## TARGET ARCHITECTURE

```text
src/
├── engine/
├── components/
├── state/
├── portal/
├── icv/
├── gsip/
├── markets/
├── pmd/
├── compliance/
├── agents/
├── umbrella/
└── mission/
```

All new functionality must belong to one of these domains.

## PHASE 1 — PORTAL‑OS FOUNDATION

Create src/portal/ with dashboard.ts, navigation.ts, workspace.ts, routing.ts, commands.ts.

Responsibilities:

- Unified navigation
- Workspace orchestration
- Dashboard composition
- Command routing
- Application shell

## PHASE 2 — ICV IMPLEMENTATION

Create src/icv/ with identity.ts, context.ts, meaning.ts, coherence.ts, strategy.ts, verification.ts.

Responsibilities:

- Identity Engine: Roles, Capabilities, User Profiles, Agent Registry
- Context Engine: Session awareness, Workspace context, Project context
- Meaning Engine: Entity extraction, Classification, Relationships
- Coherence Engine: Alignment scoring, Conflict detection, Consistency checking
- Strategy Engine: Prioritisation, Action planning, Opportunity mapping
- Verification Engine: Validation, Data integrity checks, Reality verification

Pipeline: Input → Meaning → Context → Coherence → Strategy → Action.

## PHASE 3 — GS‑IP FACTORY

Create src/gsip/ with creation.ts, framework.ts, platform.ts, media.ts, product.ts, distribution.ts, revenue.ts, expansion.ts.

Pipeline: Creation → Framework → Platform → Media → Product → Distribution → Revenue → Expansion.

Every asset must contain:

- Asset ID
- Status
- Owner
- Category
- Revenue State
- Market Assignment

## PHASE 4 — MARKET INTELLIGENCE

Create src/markets/ with scanner.ts, forecast.ts, trends.ts, opportunities.ts, tam.ts.

Metrics:

- TAM
- SAM
- SOM
- Opportunity Score
- Growth Score
- Competition Score

Requirements:

- No hardcoded scores
- Document all scoring methods
- Maintain source traceability

## PHASE 5 — PMD COMMAND SYSTEM

Create src/pmd/ with ai.ts, education.ts, social.ts, media.ts, urban.ts, climate.ts, infrastructure.ts, quantum.ts.

Required Fields:

- Status
- Priority
- Readiness Score
- Alignment Score
- Stage
- Owner

## PHASE 6 — COMPLIANCE ENGINE

Create src/compliance/ with ip.ts, privacy.ts, governance.ts, risk.ts, licensing.ts.

Responsibilities:

- Intellectual Property
- Copyright Tracking
- Trademark Tracking
- Licensing
- Governance
- Privacy
- Risk

Requirements:

- Typed outputs
- Auditable decisions
- Documented rules

## PHASE 7 — UMBRELLA PLANETARY

Create src/umbrella/ with population.ts, economics.ts, infrastructure.ts, climate.ts, education.ts, government.ts, industry.ts, analytics.ts.

Domains:

- Population
- Economics
- Infrastructure
- Climate
- Institutions
- Education
- Government
- Technology
- Industry

## PHASE 8 — AGENT SYSTEM

Create src/agents/ with founder-agent.ts, research-agent.ts, market-agent.ts, strategy-agent.ts, compliance-agent.ts.

Common Interface:

```typescript
interface AgentResult {
  status: string;
  confidence: number;
  reasoning: string[];
  actions: string[];
}
```

Requirements:

- Shared contracts
- Typed outputs
- Test coverage

## PHASE 9 — MAX‑SIM INTEGRATION

Preserve max_sim/.

Enhance graph_engine.py, metrics.py, topology.json.

Capabilities:

- Network simulation
- Forecasting
- Scenario testing
- Evolution modelling

Do not break existing workflows.

## REQUIRED DASHBOARDS

The following dashboards must exist before Beta release:

1. Executive Dashboard
2. Opportunity Radar
3. Research Console
4. GS‑IP Factory
5. PMD Command Center
6. Compliance Console
7. Agent Command Center
8. Umbrella Planetary Dashboard
9. Founder Mission Console

## UI REQUIREMENTS

Design Principles:

- Dark Theme
- Responsive Layout
- Keyboard Navigation
- High Information Density
- Graph Native
- Minimal Visual Noise
- Accessibility Compliance

## TESTING REQUIREMENTS

Every public module requires:

- Unit Tests
- Integration Tests
- Type Validation

Coverage Targets:

- Minimum: 80%
- Critical Modules: 100%
- Critical modules: assistant.ts, commands.ts, graph.ts

## TYPESCRIPT REQUIREMENTS

Must remain: `strict: true`.

Forbidden:

- any
- ts-ignore
- unused exports
- dead code

## PERFORMANCE REQUIREMENTS

- Dashboard Load: < 2 seconds
- Graph Interaction: < 100 ms latency
- Performance regressions require justification.
- Large dependencies require review.

## PR REVIEW CHECKLIST

Every Pull Request must answer:

1. What was changed?
2. Why is it necessary?
3. What architecture layer does it belong to?
4. What tests prove it works?
5. Does it introduce technical debt?
6. Is there a simpler implementation?

## NORTH STAR

Portal‑OS Alpha → ICV → GS‑IP → Market Intelligence → PMD → Agent Network → Umbrella Planetary.

All development decisions should move the repository toward this architecture while preserving existing functionality.

END OF MANIFEST
