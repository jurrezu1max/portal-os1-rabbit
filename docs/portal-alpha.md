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

## Identity Registry

Open **Identity Dashboard** from Portal navigation, use `#/portal/identity`, or run `Open Identity Dashboard` in the Executive Dashboard command form. Register humans, agents, and organizations; select **Manage** to edit names/types and assign roles/capabilities. The agent directory lists identities of type `agent`. Registering an agent does not create executable code or replace the five existing local agents.

`src/identity/types.ts` defines the shared `Identity` and `Capability` schemas. `registry.ts` exports `registerIdentity(input)`, `updateIdentity(id, changes)`, `findIdentity(id)`, `removeIdentity(id)`, and `listIdentities(type?)`, backed by the browser singleton `identityRegistry`. IDs default to UUIDs; callers may supply stable IDs for future domain references. Updates preserve `id` and `createdAt`, generate `updatedAt`, and validate before committing. Missing lookup returns `undefined`; missing removal returns `false`; updating a missing identity throws. Results are copies; store snapshots are frozen. `createIdentityRegistry({ storage, now, generateId })` creates isolated instances with injectable storage/time/IDs; omitting storage creates an in-memory registry.

The eight roles are Founder, Admin, Operator, Researcher, Strategist, Observer, MarketAgent, and ComplianceAgent. Use `identityRegistry.assignRole/revokeRole` and `assignCapability/revokeCapability`, or replace the corresponding arrays through `updateIdentity`. Unknown roles, duplicate assignments in a supplied array, unknown capability references, and duplicate identity IDs are rejected. Assignment helpers are idempotent. `saveCapability` validates and upserts a catalog entry; `removeCapability` removes its references from all identities and updates their timestamps. The dashboard requires explicit Edit to update an existing entry and keeps its ID stable.

Identity capability arrays contain catalog IDs. Each catalog entry has one shared proficiency in the inclusive range 0–100, including decimals; editing proficiency affects every assigned identity. No per-identity proficiency is implied. `capabilityVector` returns explicitly named capability axes sorted by ID, with assigned proficiency divided by 100 and zero for unassigned axes. These are local metadata vectors for future consumers, independent of spectral identity metrics and existing ICV scoring.

Persistence uses the separate versioned key `portal-os-identities-v1`. Every load and mutation validates types, timestamps, collection limits (500 records each), text (1–200 characters), assignment lists (up to 200 unique IDs), and capability references. Failed writes leave both registry state and its previous saved copy intact. Malformed stored data pauses writes and remains available through **Download original identities**; **Replace saved identities** explicitly replaces that copy with the current empty recovery registry. **Export identity registry** downloads identity and capability records as JSON. There is currently no identity import UI or cloud synchronization. Data belongs to this browser origin; concurrent editing in separate tabs is not coordinated.

Existing ICV profiles, GS-IP owner strings, and agent execution contracts remain compatible and separate. Identity IDs provide the foundation for future domain links and migrations. Roles and capabilities describe responsibilities and skills; they do not authenticate users, grant permissions, verify legal ownership, or enforce authorization. No protected kernel module is changed.

The identity modules and all four dashboard components have per-file coverage gates of **100% statements, branches, functions, and lines** in `vitest.config.ts`. `npm test -- --coverage` exercises CRUD, all roles, capability validation/assignment/deletion, immutable boundaries, storage reloads, corruption/quota failures, routing, and dashboard interactions.

## GS-IP Asset Registry

Open **GS-IP Registry Dashboard** in Portal navigation or `#/portal/gsip-registry`; the Executive command router also accepts `Open GS-IP Registry Dashboard`. Create an owner in Identity Dashboard first, then register an asset, select **Manage**, issue licenses, and advance its lifecycle. The dashboard displays Assets Created, Active Licenses, Revenue Generated, and counts for all eight stages.

The new schema lives in `src/gsip/registry/types.ts`; persistence/API orchestration is in `assetRegistry.ts`. The named exports `createAsset(input)`, `updateAsset(id, changes)`, `getAsset(id)`, `listAssets(status?)`, `createLicense(input)`, `recordRevenue(input)`, and `getRevenue(assetId?)` use the browser singleton `assetRegistry`. `getAsset` returns `undefined` for a missing ID; mutation of a missing asset throws. `getRevenue` returns receipt records (all assets when omitted), and `totalRevenue` computes their sum. Results are copies; snapshots and their records/collections are frozen. An isolated `createAssetRegistry({ storage, now, generateId, findIdentity })` supports tests and future adapters; absent storage means in-memory operation.

```typescript
import { createAsset, updateAsset, createLicense, recordRevenue, getRevenue } from "../src/gsip/registry/assetRegistry";
import { ASSET_STATUSES } from "../src/gsip/registry/types";

// ownerId must reference a registered identity.
const asset = createAsset({
  title: "Research report", description: "Original research",
  category: "Research", ownerId, market: "Education",
});
createLicense({ assetId: asset.id, holder: "Example reader", type: "Commercial" });
for (const status of ASSET_STATUSES.slice(1, -1)) updateAsset(asset.id, { status });
recordRevenue({ assetId: asset.id, amount: 125.50, source: "Invoice 001" });
updateAsset(asset.id, { status: "Expansion" });
const receipts = getRevenue(asset.id);
```

### Ownership and lifecycle

Assets start in Creation, then advance one stage at a time: Creation → Framework → Platform → Media → Product → Distribution → Revenue → Expansion. Receipt recording requires Revenue or Expansion; Expansion requires positive recorded revenue. Updates retain `id` and `createdAt`. New ownership and transfers must resolve to an Identity Registry record. Each registration/transfer appends an ownership event containing the previous owner ID, new owner ID, asset ID and timestamp. Loads validate that the ordered history starts at creation, chains correctly and agrees with the current owner. Deleted identities retain their historical IDs; the dashboard labels a missing current owner and permits transfer to a registered replacement. A deleted owner does not discard assets or receipts. Local ownership metadata does not establish legal title or authenticate the operator.

The existing GS-IP Factory retains its original schema, lifecycle, annual revenue estimates, compliance links and workspace persistence. This requested asset schema is an additional registry; factory records are not silently migrated or copied. Registry receipts are not added to factory annual revenue, and registry IDs are the future attachment point for products, media, licensing and marketplace adapters.

### Licenses, receipts and royalty previews

Licenses require a known asset; holder and type are explicit text fields. Every issued grant counts toward **Active Licenses** because the requested schema has no expiration/revocation state. The dashboard labels this limitation; licensing enforcement and revocation require a future schema version.

Revenue entries are immutable recorded receipts with ID, asset ID, amount, source and ISO timestamp. Amounts are **USD**, positive, with at most two decimal places. Totals use integer cents; each amount and the total registry ledger are limited to $1 billion. The source should identify the invoice or receipt. Duplicate receipt IDs are rejected; callers integrating payment events should provide stable IDs to avoid duplicate recording on retries. All asset/receipt/license/ownership references and chronology are validated before saving. **Revenue Generated** is the sum of receipts, without an annualization assumption. Refunds, other currencies and payment provider reconciliation require future contracts.

`royalties.ts` provides `calculateRoyalty(amount, percentage)` for the dashboard's planning preview: amount in cents × percentage / 100, rounded to the nearest cent (half up). Rates must be finite numbers in [0,100]. No royalty agreement, liability, payment or payout is recorded by this calculator.

### Storage and validation

Registry storage uses `portal-os-gsip-registry-v1`, independent of the original graph, Portal workspace and Identity Registry keys. Each collection is limited to 2,000 records; ordinary text to 200 characters and descriptions to 20,000. Identity IDs are validated at registration/transfer; historical identity references remain readable after deletion. Failed writes leave the prior saved copy and registry state intact. Corrupt records pause writes and preserve the original string for download; **Replace saved GS-IP records** explicitly replaces it with the empty recovery registry. **Export GS-IP registry** includes assets, licenses, receipts and ownership history. Import UI, cloud synchronization and coordination of concurrent browser tabs are not implemented.

`vitest.config.ts` enforces at least **95% per-file lines, statements, branches and functions** for all six registry modules and all four dashboard components. Tests cover lifecycle gates, identity ownership, transfers and historical owners, licenses, exact-cent revenue, royalty previews, metrics, immutable boundaries, duplicate and malformed records, chronology, corruption/quota recovery, persistence, routing and dashboard interactions. Existing kernel and identity coverage gates remain intact.

## Connected Portal system

The six adapters in `src/integration/` join the existing stores through
`PortalSystemState`. The Founder Console (`#/portal/founder`) and Executive
Dashboard show live identities, registered assets, receipt revenue, scored market
opportunities, agent status, compliance coverage, missions, and research/MAX-SIM
counts. No protected kernel module is changed.

Workflow:

1. Register human, organization and agent identities. Select the active identity
   in Identity Dashboard or Founder Console to supply ICV context to research and
   agent runs. Founder/Researcher roles map to existing ICV profiles; other roles
   map to analyst. Roles remain registry metadata, not server authorization.
2. Register an owned GS-IP asset. In GS-IP Registry, GS-IP Factory, Opportunity
   Radar or PMD Command, link its market to an existing sourced market ID.
   Previously entered market names are preserved until explicitly linked.
3. Link markets to PMD initiatives, assign executors, and optionally bind agent
   identities. Assigned executors consume only their initiatives' linked markets
   and assets; unassigned executors use workspace scope.
4. Run agents from PMD or Agent Command. Recommendations remain available across
   navigation. Accept an action in Agent Command to create an owned mission.
   Relevant input changes mark recommendations stale and remove acceptance buttons
   until rerun. Runs are session-only; saved assignments survive reload.
5. In Compliance Console, audit registered assets separately from legacy factory
   assets. Existing evidence rules and append-only revision history are preserved.
   Shared coverage additionally checks that the owner still exists and matches
   the evidence. Unaudited assets and ownership mismatches prevent a ready
   compliance-agent result. These are evidence checks, not legal determinations.

The sidecar localStorage key `portal-os-connections-v1` persists active identity,
market/initiative links, assignments, identity bindings and registry audit
revisions. Writes validate and persist before publishing. Corrupt saved bytes are
retained for download; explicit replacement clears the paused connection store.
Deleted or separately restored domain records produce visible connection health
findings. Export connections alongside the existing workspace, identity and asset
registry exports when backing up the complete system. Restores remain per store;
connections do not implicitly recreate missing domain records.

The original factory and registry retain their schemas and independent records.
Compliance receives a read-only projection of registry assets; edits save only
registry evidence in the sidecar. Founder revenue sums registry receipt amounts,
never legacy annual estimates. MAX-SIM is observed through its existing store.

### Worker deployment contract

Set `VITE_PORTAL_WORKER_BASE_URL` in your local Vite environment to your HTTP(S)
Worker base URL, then restart Vite (or rebuild production). No deployment hostname
is built into the application. A base path is preserved. The adapter supports
relative endpoint overrides through `createWorkerBridge({baseUrl, endpoints})`.

| Domain | Default path appended to base | Payload |
| --- | --- | --- |
| ICV | `api/icv` | Active ICV context, prompt, research evidence |
| GS-IP | `api/gsip` | Registered assets and identities |
| Markets | `api/markets` | Computed opportunities, PMD initiatives, links |
| Compliance | `api/compliance` | Registered assets, registry evidence, combined scoped decisions |
| Store | `api/store` | Registry assets at Product, Distribution, Revenue or Expansion |

Each call is an explicit JSON POST:

```json
{"version":1,"payload":{}}
```

The deployed Worker must respond with a successful HTTP status and:

```json
{"version":1,"data":{}}
```

The dashboard displays `data` without applying it to local stores. The adapter
rejects malformed envelopes and oversized request/response strings, cancels on
unmount/configuration changes, and defaults to a 10-second timeout. Redirects are
rejected and browser credentials omitted. Cross-origin deployments must permit
the application's origin, POST and Content-Type through CORS. Do not put secrets
in Vite variables, which are public client configuration. Authentication, server
authorization and domain-specific remote mutations require the deployment's own
contract; this repository contains no Worker server implementation.

The five routes are covered by injected transport contract tests, including
errors, timeouts and cancellation. A live deployment is not configured or claimed
as verified. Configure a compatible Worker before using the remote controls.

Integration tests enforce ≥90% lines, statements, branches and functions for both
the bridge layer and integration components. Existing Identity 100%, GS-IP 95%
and protected kernel gates remain enabled.
