# Portal-OS Alpha domains

The production manifest is [CODERABBIT.md](../CODERABBIT.md). The existing graph contracts in README remain authoritative. No protected kernel file is modified by this extension. Existing browser storage uses its original key and schema.

## Local Alpha workflow

1. Open Executive Dashboard from navigation. Configure your workspace, project, name, role, and goals. Profiles and capabilities describe local roles; they are not authentication or access control.
2. Record sourced market assumptions in Opportunity Radar. Sources are explicit references, with observation times. Estimates use USD/year.
3. Create an asset assigned to a market in GS-IP Factory. Advance one stage at a time. Revenue eligibility does not assert earnings. Record actual positive revenue before entering expansion. Later revenue updates may record a decline to zero without discarding the stage history.
4. Record numerical observations in Research Console. Use the planetary dashboard's domain/metric/unit keys for planetary indicators. Model observations as Cognition nodes in the original workbench; graph relationships remain explicit user edits.
5. Analyze a proposal through ICV. Meaning uses a documented small lexicon; relationships are co-mentions. Context includes session, workspace, project, profile, and goals. Alignment counts goals sharing a token. Avoid/never goals flag possible conflicts. Missing goals yield N/A. Integrity checks do not independently establish reality or truth.
6. Add initiatives in the eight PMD domains. Readiness is completed checks / total checks; alignment is matched goals / total goals. Counts must be nonnegative integers with positive denominators.
7. Record asset compliance evidence. Each decision carries its rule/version, record ID, source, observation time, status, and reasons. Edits retain evidence snapshots with revision numbers, rule versions, and evaluation timestamps; decisions can be reproduced from those inputs. Review recorded evidence with a qualified human; a pass means required fields exist, not legal approval. Risk uses integer likelihood × impact, each 1–5; scores ≥12 require review.
8. Run the five local agents against the current workspace. Their common result is status/confidence/reasoning/actions. Confidence measures evidence completeness, not truth probability. Accept recommendations as owned mission actions; agents do not automatically execute changes.
9. Track priorities and status in Founder Mission Console. Completed actions sort last. Export the Portal workspace for a portable backup; import validates the whole workspace before replacement.

## Architecture and boundaries

| Layer      | Implementation                                                                                            |
| ---------- | --------------------------------------------------------------------------------------------------------- |
| Portal     | Hash routing, navigation, shell, command routing, workspace validation/persistence, dashboard composition |
| ICV        | Identity metadata, context, lexicon extraction, alignment/conflicts, strategy, integrity verification     |
| GS-IP      | Owned assets, eight guarded stages, recorded revenue, chronological stage history                         |
| Markets    | Validated sourced assumptions, sizing, trends, opportunity ranking, compound growth scenarios             |
| PMD        | Eight domain assessors with common status, owner, priority, stage, readiness/alignment contract           |
| Compliance | Five typed evidence checks with traceable rule decisions                                                  |
| Umbrella   | Latest sourced indicators for nine domains; exact metric and unit matching                                |
| Agents     | Shared typed contract and registry; deterministic local recommendations                                   |
| Mission    | Owned actions, explicit status, deterministic priority ordering                                           |
| MAX-SIM    | Existing Python APIs plus copy-based scenario/evolution operations and scenario metric forecasts          |

Portal storage (`portal-os-alpha-v1`) is independent of `max-sim-workbench-v2`. Imports are limited to 2 MB; collections to 200 records, audit history to 2,000 revisions, goals to 100, text fields to 200 characters. Asset-market and compliance-asset references must resolve. Derived scores are recomputed on import. Audit revision sequences and current evidence must agree; ordinary edits cannot rewrite history. Imports are explicit replacements, and local history is not tamper-proof. The initial version-1 schema without history remains readable; previous historical states are not invented. Malformed stored data is preserved and automatic writes pause until explicit replacement. Storage quota/unavailability keeps edits in memory and displays an export reminder. Workspace exports include recorded source references and profile information; users control sharing.

All dashboard routes use `#/portal/<id>` and require no static-host rewrites. Legacy workbench screens also have hash routes and remain available. Portal code loads lazily on first dashboard access. Ordinary graph layout movement does not invalidate numerical analysis. Native labeled form controls, buttons, table headers, visible focus indicators, the existing skip link, reduced-motion support, and responsive cards support keyboard and assistive use. Accessibility needs human testing across assistive technologies before a release claim.

## Scoring methods and provenance

- TAM = potential customers × annual spend (USD/year).
- SAM = TAM × serviceable fraction, within [0,1].
- SOM = SAM × obtainable fraction of SAM, within [0,1].
- Growth score = (annual growth + 1) × 50, with growth in [−1,1].
- Competition score = competitors/(competitors+1) × 100, with a nonnegative integer count.
- Opportunity score = growth score × (1 − competition score/100) × serviceable fraction × obtainable fraction.
- Forecast SOM = current SOM × (1 + annual growth)^years, 0–10 years.

These are transparent planning heuristics, sensitive to operator assumptions. No scores are hardcoded. Each result retains source/time. Missing market data yields no score. Conflicting sources can be recorded separately and compared; a source label alone is not verification. Planetary indicators select the latest observation by timestamp for an exact domain/metric/unit. They do not sum incompatible units or infer global coverage.

## MAX-SIM

`scenario(graph, disabled)` removes selected known nodes from a copy. `evolve_network(graph, connections)` adds new simple connections to a copy and rejects unknown endpoints, loops, and duplicate edges. `StructuralInvariant.scenario_forecast(scenarios)` reports identity, connectivity, signed drift, fidelity (nullable for zero baseline identity), and entropy loss per explicit scenario step. It does not forecast real events or fitted dynamics. `max_sim/data/topology.json` adds descriptive metadata while retaining every original node and edge.

## Validation

`npm test -- --coverage` enforces an 80% floor for engine/domain functions, lines, statements, and branches and 100% for assistant, commands, and graph. `npm run build` validates strict types and builds production assets. Python contract tests use `python -m unittest discover -s tests -v`. Browser smoke checks exercise dashboard and legacy navigation, evidence/asset/agent workflows, reload, keyboard focus, and narrow layouts. Local timing measurements are evidence for the tested sandbox, not a universal device/network SLA.

## External capabilities

This Alpha is a local application. Automated market discovery, independent fact verification, model-backed agents, cloud authentication/storage, external licensing enforcement, and validated planetary forecasts need defined provider contracts and services. None is represented as connected or verified here. The original instruction manifest's determinant and identity-physics targets remain unverified architectural research; no fabricated proofs or constant guarantees are introduced.
