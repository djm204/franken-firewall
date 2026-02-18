# Frankenbeast Firewall (MOD-01)

> **Policy-Driven Guardrails & AI-Agnostic Proxy**

MOD-01 is a bidirectional interceptor that acts as a **Model-Agnostic Proxy (MAP)**. It decouples any orchestrator from specific LLM providers (Claude, GPT, local models) by enforcing safety, security, and structural integrity through a standardized middleware pipeline. Every LLM is treated as a non-deterministic black box. This module is what makes it safe to use one.

---

> ## Disclaimer
>
> **This project is provided for educational and experimental purposes only.**
> The author takes no responsibility for any actions, outputs, or consequences resulting from an LLM or AI assistant following these rules. Use at your own risk. Always review AI-generated code before deploying to production.

---

## Architecture

```
Orchestrator
    │
    ▼
┌─────────────────────────────────────────┐
│           INBOUND (Pre-Flight)          │
│  InjectionScanner → PiiMasker →         │
│  ProjectAlignmentChecker                │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│              ADAPTER LAYER              │
│  transformRequest → execute →           │
│  transformResponse                      │
│  (ClaudeAdapter | OpenAIAdapter | ...)  │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│          OUTBOUND (Post-Flight)         │
│  SchemaEnforcer → DeterministicGrounder │
│  → HallucinationScraper                 │
└─────────────────────────────────────────┘
    │
    ▼
  UnifiedResponse (always)
```

### Invariants

- The Orchestrator **always** receives a `UnifiedResponse` — never a provider-specific shape.
- Every inbound violation **short-circuits** the pipeline before the adapter is called.
- Every outbound violation returns `finish_reason: "content_filter"` with a structured `GuardrailViolation`.
- PII is masked **before** it leaves the infrastructure.

---

## Pipeline Interceptors

### Inbound (Pre-Flight)

| Interceptor | What it does |
| :--- | :--- |
| `InjectionScanner` | Scans for structural intent: override patterns, role reassignment, context poisoning. Operates on all message content and system prompts. |
| `PiiMasker` | Redacts email, phone, SSN, and credit card patterns locally — no external service. Controlled by `redact_pii` in config. |
| `ProjectAlignmentChecker` | Validates provider is in `allowed_providers`, estimated token cost is under `max_token_spend_per_call`, and requested tools exist in the Skill Registry. |

### Outbound (Post-Flight)

| Interceptor | What it does |
| :--- | :--- |
| `SchemaEnforcer` | Validates the raw adapter output matches `UnifiedResponse` v1 shape before it reaches the Orchestrator. |
| `DeterministicGrounder` | Checks every `tool_calls[].function_name` against the Skill Registry. Validates arguments are valid JSON. |
| `HallucinationScraper` | Extracts import/require statements from LLM-generated content and flags any package not in `dependency_whitelist`. |

---

## Adapter Contract

Any provider adapter implements exactly four methods:

```typescript
interface IAdapter {
  transformRequest(request: UnifiedRequest): unknown;
  execute(providerRequest: unknown): Promise<unknown>;
  transformResponse(providerResponse: unknown, requestId: string): UnifiedResponse;
  validateCapabilities(feature: CapabilityFeature): boolean;
}
```

Provider-specific logic (auth headers, API shapes, retry quirks) is **only allowed inside an adapter file**. If you find `if (provider === 'anthropic')` outside an adapter, that is a bug.

---

## Configuration

Policy is controlled via `guardrails.config.json` at the project root:

```json
{
  "project_name": "Project-Alpha",
  "security_tier": "STRICT",
  "schema_version": 1,
  "agnostic_settings": {
    "redact_pii": true,
    "max_token_spend_per_call": 0.05,
    "allowed_providers": ["anthropic", "openai", "local-ollama"]
  },
  "safety_hooks": {
    "pre_flight": ["check_injection", "validate_auth_token"],
    "post_flight": ["verify_json_schema", "check_for_ghost_deps"]
  },
  "dependency_whitelist": ["react", "express", "zod"]
}
```

---

## Getting Started

```bash
npm install
npm test          # run all tests
npm run typecheck # TypeScript strict check
npm run lint      # ESLint
npx vitest bench  # performance baseline
```

### Basic usage

```typescript
import { loadConfig, ClaudeAdapter, AdapterRegistry, runPipeline } from "./src/index.js";

const config = loadConfig("./guardrails.config.json");
const registry = new AdapterRegistry(config.agnostic_settings.allowed_providers);
registry.register("anthropic", new ClaudeAdapter({ apiKey: process.env.ANTHROPIC_API_KEY!, model: "claude-sonnet-4-6" }));

const { response, violations } = await runPipeline(request, registry.getAdapter("anthropic"), config);
```

---

## Project Structure

```
src/
  types/           UnifiedRequest, UnifiedResponse, GuardrailViolation
  config/          loadConfig, GuardrailsConfig
  adapters/        IAdapter, BaseAdapter, AdapterRegistry
    claude/        ClaudeAdapter + recorded test fixtures
    openai/        OpenAIAdapter + recorded test fixtures
  interceptors/
    inbound/       InjectionScanner, PiiMasker, ProjectAlignmentChecker
    outbound/      SchemaEnforcer, DeterministicGrounder, HallucinationScraper
  pipeline/        runPipeline()
  observability/   AuditLogger, CostLedger
docs/adr/          Architecture Decision Records (0001–0007)
```

---

## Architecture Decision Records

| ADR | Decision |
| :--- | :--- |
| [0001](docs/adr/0001-typescript-as-implementation-language.md) | TypeScript with strict mode as implementation language |
| [0002](docs/adr/0002-unified-response-v1-canonical-contract.md) | UnifiedResponse v1 as the canonical output contract |
| [0003](docs/adr/0003-four-method-adapter-contract.md) | Four-method adapter interface as provider boundary |
| [0004](docs/adr/0004-structural-intent-injection-scanning.md) | Structural intent scanning for prompt injection detection |
| [0005](docs/adr/0005-local-nlp-pii-masking.md) | Local regex-based PII masking — no external service |
| [0006](docs/adr/0006-skill-registry-as-external-dependency.md) | Skill Registry as injected interface, not a compile-time import |
| [0007](docs/adr/0007-in-memory-cost-ledger-for-v1.md) | In-memory CostLedger for v1; external store deferred |

---

## Test Coverage

133 tests across 18 test files. Every interceptor has pass, block, and edge case coverage. Adapters use recorded fixtures — no live API calls in the test suite.

```bash
npm run test:coverage
```
