# Franken Firewall

**A model-agnostic guardrail proxy for LLM-powered systems.**

Franken Firewall sits between your application and any large language model. It enforces your security policy, strips PII, blocks prompt injection, validates every tool call, and scrubs hallucinated dependencies — before a single token reaches your business logic or a single side-effect runs.

It treats every LLM as what it actually is: a non-deterministic black box that should never be trusted unconditionally.

---

> ### Disclaimer
>
> **This project is provided for educational and experimental purposes only.**
> The author takes no responsibility for any actions, outputs, or consequences resulting from an LLM or AI assistant following these rules. Use at your own risk. Always review AI-generated code before deploying to production.

---

## Why this exists

LLM integrations fail in predictable ways:

- **Prompt injection** — user-supplied content overrides system instructions
- **PII leakage** — sensitive data sent to third-party APIs without redaction
- **Hallucinated tool calls** — the model invokes functions that don't exist, with arguments that don't validate
- **Ghost dependencies** — generated code imports packages that were invented by the model
- **Provider lock-in** — switching from Claude to GPT (or to a local model) requires rewriting integration code
- **Runaway costs** — no ceiling on per-call or per-session token spend

Franken Firewall addresses all six with a composable middleware pipeline that runs in the critical path on every request.

---

## How it works

Every request passes through two interception stages wrapped around a provider-agnostic adapter:

```
Your Application
      │
      ▼
┌─────────────────────────────────────────────────────┐
│                  INBOUND (Pre-Flight)                │
│                                                     │
│  1. InjectionScanner      — structural intent scan  │
│  2. PiiMasker             — local redaction, no API │
│  3. ProjectAlignmentChecker — budget, scope, allow  │
└─────────────────────────────────────────────────────┘
      │  clean, masked, validated request
      ▼
┌─────────────────────────────────────────────────────┐
│                   ADAPTER LAYER                     │
│                                                     │
│  ClaudeAdapter  │  OpenAIAdapter  │  YourAdapter    │
│                                                     │
│  transformRequest → execute → transformResponse     │
└─────────────────────────────────────────────────────┘
      │  raw provider response
      ▼
┌─────────────────────────────────────────────────────┐
│                 OUTBOUND (Post-Flight)               │
│                                                     │
│  4. SchemaEnforcer        — UnifiedResponse shape   │
│  5. DeterministicGrounder — tool call validation    │
│  6. HallucinationScraper  — import whitelist check  │
└─────────────────────────────────────────────────────┘
      │
      ▼
  UnifiedResponse  ←  always this shape, always
```

**The Orchestrator always receives a `UnifiedResponse`. It never sees a provider-specific shape. It never sees a raw LLM error. It never receives an unvalidated tool call.**

Inbound violations short-circuit the pipeline — the adapter is never called. Outbound violations return `finish_reason: "content_filter"` with a structured, inspectable `GuardrailViolation`. Nothing is silently swallowed.

---

## Interceptors

### Inbound

| Interceptor | What it enforces |
| :--- | :--- |
| `InjectionScanner` | Detects structural intent to override, reassign, or reprioritise instructions. Scans all message content, system prompts, and nested tool result payloads. STRICT tier adds additional pattern categories. |
| `PiiMasker` | Redacts email addresses, phone numbers, SSNs, and credit card patterns using local regex — no data leaves your infrastructure for masking. Controlled per-project via `redact_pii`. |
| `ProjectAlignmentChecker` | Validates provider is in the allowlist, estimated token cost is under the per-call ceiling, and requested tool names exist in the Skill Registry before the request is sent. |

### Outbound

| Interceptor | What it enforces |
| :--- | :--- |
| `SchemaEnforcer` | Validates the raw adapter output against the `UnifiedResponse` v1 contract. Schema version mismatches are hard failures. |
| `DeterministicGrounder` | Checks every `tool_calls[].function_name` against the injected Skill Registry. Validates that arguments are JSON-parseable. Rejects unregistered tools before any execution reaches them. |
| `HallucinationScraper` | Extracts `import`/`require` statements from LLM-generated content and flags any package not present in the project's `dependency_whitelist`. |

---

## Adapter contract

Adding a new provider means creating one file that implements four methods. Nothing else changes.

```typescript
interface IAdapter {
  // Maps UnifiedRequest → provider's native request format
  transformRequest(request: UnifiedRequest): unknown;

  // Handles transport, timeouts, retries
  execute(providerRequest: unknown): Promise<unknown>;

  // Maps raw provider response → UnifiedResponse
  transformResponse(providerResponse: unknown, requestId: string): UnifiedResponse;

  // Self-reports which features this model supports
  validateCapabilities(feature: CapabilityFeature): boolean;
}
```

Provider-specific code — auth headers, API shapes, model quirks, rate limit handling — lives only inside the adapter file. If you find `if (provider === 'anthropic')` anywhere outside an adapter, that is a bug, not a feature.

Included adapters:

| Adapter | Provider |
| :--- | :--- |
| `ClaudeAdapter` | Anthropic (claude-sonnet-4-6, claude-opus-4-6, claude-haiku-4-5) |
| `OpenAIAdapter` | OpenAI (gpt-4o, gpt-4o-mini, gpt-4-turbo, gpt-3.5-turbo) |

---

## Configuration

All policy is controlled via `guardrails.config.json`. This file is the single source of truth for what a given project is allowed to do.

```json
{
  "project_name": "my-project",
  "security_tier": "STRICT",
  "schema_version": 1,
  "agnostic_settings": {
    "redact_pii": true,
    "max_token_spend_per_call": 0.05,
    "allowed_providers": ["anthropic", "openai"]
  },
  "safety_hooks": {
    "pre_flight": ["check_injection", "validate_auth_token"],
    "post_flight": ["verify_json_schema", "check_for_ghost_deps"]
  },
  "dependency_whitelist": ["react", "zod", "express"]
}
```

| Field | Description |
| :--- | :--- |
| `security_tier` | `STRICT` adds additional injection pattern categories. `MODERATE` and `PERMISSIVE` reduce enforcement surface. |
| `redact_pii` | `true` runs the PiiMasker on every request. Must be `true` in any `STRICT` config. |
| `max_token_spend_per_call` | Hard ceiling in USD. Requests estimated to exceed this are rejected pre-flight. |
| `allowed_providers` | Any provider not on this list is blocked by the AdapterRegistry. |
| `dependency_whitelist` | Packages the HallucinationScraper will accept in LLM output. Empty list disables scraping. |

---

## Getting started

```bash
npm install
npm test                # 133 tests, all interceptors and adapters
npm run typecheck       # TypeScript strict mode
npm run lint            # ESLint
npx vitest bench        # performance baseline (~495K ops/sec)
```

### Minimal integration

```typescript
import { loadConfig, ClaudeAdapter, AdapterRegistry, runPipeline } from "./src/index.js";

const config = loadConfig("./guardrails.config.json");

const registry = new AdapterRegistry(config.agnostic_settings.allowed_providers);
registry.register("anthropic", new ClaudeAdapter({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  model: "claude-sonnet-4-6",
}));

const { response, violations } = await runPipeline(
  request,
  registry.getAdapter(request.provider),
  config,
);

if (violations.length > 0) {
  // Every violation is structured — log, alert, or surface to the caller
  console.error(violations);
}
```

### With observability

```typescript
import { AuditLogger, CostLedger } from "./src/index.js";

const logger = new AuditLogger();   // defaults to stdout JSON lines
const ledger = new CostLedger();    // in-memory per-session spend

const startedAt = Date.now();
const { response, violations } = await runPipeline(request, adapter, config);

// Record actual spend against the session
if (request.session_id) {
  ledger.record(request.session_id, response.usage.cost_usd);
}

// Emit a structured audit entry for every call
logger.log(logger.buildEntry({
  requestId: request.id,
  provider: request.provider,
  model: request.model,
  sessionId: request.session_id,
  violations,
  inputTokens: response.usage.input_tokens,
  outputTokens: response.usage.output_tokens,
  costUsd: response.usage.cost_usd,
  startedAt,
}));
```

### Adding a new provider

```typescript
// src/adapters/my-provider/my-provider-adapter.ts
import { BaseAdapter } from "../base-adapter.js";
import type { IAdapter } from "../i-adapter.js";

export class MyProviderAdapter extends BaseAdapter implements IAdapter {
  transformRequest(request: UnifiedRequest): MyProviderRequest { ... }
  async execute(req: unknown): Promise<unknown> {
    return this.withRetry(() => this.withTimeout(() => fetch(...)));
  }
  transformResponse(raw: unknown, requestId: string): UnifiedResponse { ... }
  validateCapabilities(feature: CapabilityFeature): boolean { ... }
}

// Register it
registry.register("my-provider", new MyProviderAdapter({ apiKey: "..." }));
```

That's it. The pipeline, all interceptors, and all tests require zero changes.

---

## Project structure

```
src/
  types/                  Canonical schemas: UnifiedRequest, UnifiedResponse, GuardrailViolation
  config/                 Config loader and GuardrailsConfig interface
  adapters/
    claude/               ClaudeAdapter + recorded HTTP fixtures
    openai/               OpenAIAdapter + recorded HTTP fixtures
    base-adapter.ts       Shared retry, timeout, cost calculation
    adapter-registry.ts   Provider resolution against allowed_providers
    i-adapter.ts          IAdapter interface — the provider boundary
  interceptors/
    inbound/              InjectionScanner, PiiMasker, ProjectAlignmentChecker
    outbound/             SchemaEnforcer, DeterministicGrounder, HallucinationScraper
    interceptor-result.ts Pass/block result type
  pipeline/
    pipeline.ts           runPipeline() — composes all six interceptors
    pipeline.bench.ts     Performance baseline
  observability/
    audit-logger.ts       Structured JSON audit log per pipeline run
    cost-ledger.ts        In-memory session spend accumulator
  index.ts                Public module surface
docs/
  adr/                    Architecture Decision Records 0001–0007
guardrails.config.json    Example project policy config
```

---

## Decisions

Major architectural choices are recorded as ADRs in [`docs/adr/`](docs/adr/). Any non-obvious decision made during implementation has a corresponding record with context, decision, and consequences.

| ADR | Decision |
| :--- | :--- |
| [0001](docs/adr/0001-typescript-as-implementation-language.md) | TypeScript strict mode — schema violations caught at compile time |
| [0002](docs/adr/0002-unified-response-v1-canonical-contract.md) | `UnifiedResponse` v1 as the closed, versioned output contract |
| [0003](docs/adr/0003-four-method-adapter-contract.md) | Four-method adapter interface as the only provider boundary |
| [0004](docs/adr/0004-structural-intent-injection-scanning.md) | Structural intent over keyword matching for injection detection |
| [0005](docs/adr/0005-local-nlp-pii-masking.md) | Local regex PII masking — no data sent to an external masking service |
| [0006](docs/adr/0006-skill-registry-as-external-dependency.md) | Skill Registry as an injected interface, not a compile-time import |
| [0007](docs/adr/0007-in-memory-cost-ledger-for-v1.md) | In-memory `CostLedger` for v1 — external store is a v2 concern |

---

## Testing

133 tests across 18 test files. Every interceptor has pass, block, and edge-case coverage. Adapters use recorded HTTP fixtures — there are no live API calls in the test suite.

```bash
npm test                 # run all tests
npm run test:coverage    # with coverage report
npx vitest bench         # performance baseline
```

Pipeline throughput with all six interceptors active: **~495,000 ops/sec** (mean 0.002ms per run on an average payload).

---

## Roadmap

- [ ] `OllamaAdapter` — local model support
- [ ] Persistent `CostLedger` backend (Redis / Postgres)
- [ ] Streaming response support in the adapter contract
- [ ] Configurable injection pattern sets loaded from external policy files
- [ ] MOD-02: Skill Registry implementation

---

## License

MIT
