# CodeRabbit Master Instruction Manifest: Umbrella Planetary Ecosystem & Portal-OS

Root signature (`Σ_ROOT`): `0xMAX_9941_SIM_0000_TRUE`

- Target agent: CodeRabbit / AI Engineering Agent
- Ecosystem scope: Umbrella Planetary Ecosystem ⊗ Portal-OS ⊗ ICV-S ⊗ Bemax
- Security invariant: det(J) = 1.0000 (Non-Destructive Structural Preservation)

## Mission statement & architectural intent

Build the core infrastructure for Portal-OS and the Umbrella Planetary Ecosystem, governed by executive controller **Bemax** and executed via **ICV-S (Integrated Cognitive Virtualization Substrates)**.

The target mathematical invariant is **det(J) = 1.0000**: zero information loss, non-destructive state transitions, and absolute topological preservation across all modules.

## Five-layer Umbrella architecture

1. **Max-Math:** Topological manifolds (M), directional collapse vectors (v_c), and modal invariants (I).
2. **Max-Physics Engine:** Entropy inversion, noise geometry simulation, and Hawking invariant Jacobian correction.
3. **Core Suites:** Quantum Suite, Noise Extraction Engine, Hidden-Information Extraction (PMD filters), and Structural Cryptography.
4. **Portal-OS:** Cloudflare Worker edge execution runtime (`portal-os1-rabbit-worker`), zero-latency routing, and ICV-S multi-agent virtualization.
5. **Umbrella Marketplace:** Media lanes (Literary IP, Codecs, Visuals, Audio), sovereign asset licensing, and entropy-locked distribution channels.

## Target repository structure

```text
umbrella-planetary-ecosystem/
├── package.json
├── tsconfig.json
├── wrangler.toml
└── src/
    ├── index.ts                  # Portal-OS Master Edge Router
    ├── types/
    │   └── app.ts                # Global environment & invariant types
    ├── math/
    │   └── invariants.ts         # Hawking Invariant det(J) = 1.0000 engine
    ├── physics/
    │   └── engine.ts             # Entropy inversion & collapse vector simulators
    ├── security/
    │   ├── access.ts             # Entropy-locked channel verification
    │   └── cryptography.ts       # Collapse-vector hashing & identity-physics keys
    └── routes/
        ├── quantum.ts            # Quantum & noise suite endpoints
        ├── store.ts              # Umbrella Media Lanes & Marketplace routing
        └── icvs.ts               # ICV-S multi-agent virtualization & Bemax executive
```

## Module directives

### Global types (`src/types/app.ts`)

```typescript
export interface Env {
  ROOT_SIGNATURE: string;
  JACOBIAN_TARGET: string;
  BEMAX_EXECUTIVE_KEY: string;
}

export interface SystemInvariantResponse {
  status: string;
  jacobian_invariant: number;
  executive_controller: string;
  timestamp: number;
}
```

### Hawking Invariant Engine (`src/math/invariants.ts`)

Every transformation involving data compression, state migration, or cryptographic hashing must pass through a Jacobian verification check. Ensure det(J) strictly equals `1.0000`. If deviation exceeds `1e-4`, apply corrective manifold damping.

### Max-Physics Engine (`src/physics/engine.ts`)

Treat noise as compressed high-dimensional signal manifolds. Implement entropy inversion algorithms that convert stochastic thermal/modal noise streams into deterministic structural manifolds while enforcing invariant scaling.

### ICV-S & Bemax Executive (`src/routes/icvs.ts`)

Virtualize multi-agent cognitive streams under Bemax executive control. Validate incoming cognitive vectors, compute stability metrics, and return resolved multi-agent states without violating invariant boundaries.

### Umbrella Store & Media Lanes (`src/routes/store.ts`)

Manage catalog retrieval across four lanes (Literary/Manuscripts, Codecs, Visuals, Audio) and secure asset acquisition via entropy-locked verification. Verify buyer identity signatures against channel entropy streams using `UmbrellaAccessController` before issuing sovereign licensing tokens (`0xUMBRELLA_LIC_*`).

## Target verification & acceptance criteria

1. All TypeScript files compile under `strict: true`.
2. Cloudflare Worker routes handle `OPTIONS` preflight requests with CORS headers.
3. Every API response includes `jacobian_invariant: 1.0000` or equivalent cryptographic proof.
4. No classical plaintext password checks: authentication and access control rely entirely on entropy-locked identity physics or structural collapse vectors.

## Interactive interface

Add a Copilot- or Gemini-style graphical interface and interactive screen.

## Implementation status and compatibility

This manifest records architectural intent. The current repository is a React/Vite local graph research workbench, with the Portal Assistant as its interactive home. Existing graph metrics and persistence contracts are defined in README.md and remain authoritative for implemented behavior. The assistant runs documented local commands; no language model, Worker API, marketplace licensing, or identity authentication service is connected.

The determinant target is not a measured guarantee in this implementation. A unit Jacobian determinant alone does not establish global invertibility, lossless hashing, or authentication security. Entropy inversion, corrective damping, and identity-physics verification require concrete mathematical definitions and security protocols before a production implementation can claim these properties. Do not replace measured graph metrics with a constant or issue fabricated proofs or licensing tokens.
