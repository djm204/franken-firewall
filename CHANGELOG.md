# Changelog

## [0.2.0](https://github.com/djm204/franken-firewall/compare/firewall-v0.1.0...firewall-v0.2.0) (2026-02-19)


### Features

* **adapter/claude:** implement ClaudeAdapter — transformRequest, execute, transformResponse, validateCapabilities ([5f08fbd](https://github.com/djm204/franken-firewall/commit/5f08fbd6f238f081d99ff3d9f76ee7b82024d598))
* **adapter/openai:** implement OpenAIAdapter — proves provider agnosticism ([33b17fa](https://github.com/djm204/franken-firewall/commit/33b17fa602cdbfb106df7773cacebb1a5e07d927))
* **adapter:** define IAdapter interface — four-method provider boundary ([eaa5156](https://github.com/djm204/franken-firewall/commit/eaa5156e57488464b3b572164f6613b0f9ca940c))
* **adapter:** implement AdapterRegistry with allowed_providers enforcement ([06aa6c6](https://github.com/djm204/franken-firewall/commit/06aa6c61fed586023babb35f3abad98b1fba72c6))
* **adapter:** implement BaseAdapter with retry, timeout, and cost calculation ([0918549](https://github.com/djm204/franken-firewall/commit/09185491e00b007b3017ff4eeaa44fb5c9388209))
* **config:** implement loadConfig with GuardrailsConfig interface and validation ([2c6342e](https://github.com/djm204/franken-firewall/commit/2c6342e828bdf14b3f76c2925711661a2feaeba0))
* **cost:** implement CostLedger — in-memory session spend accumulator ([d1f5bc7](https://github.com/djm204/franken-firewall/commit/d1f5bc7ee6944301e1fb4d30152f13db8559142a))
* **inbound/align:** implement ProjectAlignmentChecker — provider, budget, and skill validation ([d73e2cc](https://github.com/djm204/franken-firewall/commit/d73e2cc8ca20423c465aa364e15b1bac63877bf5))
* **inbound/injection:** implement InjectionScanner with structural intent pattern matching ([fc8ffa6](https://github.com/djm204/franken-firewall/commit/fc8ffa68f6cb4f841e33174289da1dc0070b5f87))
* **inbound/pii:** implement PiiMasker — regex-based local PII redaction ([5e8373a](https://github.com/djm204/franken-firewall/commit/5e8373a6a2a187333df59b0cec2ca57bff65f6dd))
* **mod-01:** Frankenbeast Firewall — full implementation ([a70b776](https://github.com/djm204/franken-firewall/commit/a70b776442ae5c07e69aab6440f9e1379bac07dc))
* **observability:** implement AuditLogger — structured JSON log per pipeline run ([54de7bb](https://github.com/djm204/franken-firewall/commit/54de7bbdf0c4d1607fd27d35e805e55e55ebf32b))
* **outbound/grounding:** implement DeterministicGrounder — validates tool calls against Skill Registry ([baa74f5](https://github.com/djm204/franken-firewall/commit/baa74f55085d8a2d2f928b0d0da386e76bf9a9f2))
* **outbound/hallucination:** implement HallucinationScraper — flags unlisted imports in LLM output ([22ba9db](https://github.com/djm204/franken-firewall/commit/22ba9db82130f32889515957b24ad58e32e60dc8))
* **outbound/schema:** implement SchemaEnforcer — validates UnifiedResponse shape and version ([e88839e](https://github.com/djm204/franken-firewall/commit/e88839e474969369cf2ceb536059d6c0f96e9dfa))
* **perf:** add pipeline benchmark — 495K ops/sec, mean 0.002ms per full run ([91ffcd1](https://github.com/djm204/franken-firewall/commit/91ffcd10afe1ae826685ae3d56f732dbffab5b02))
* **pipeline:** implement runPipeline() — inbound → adapter → outbound chain ([fc83c24](https://github.com/djm204/franken-firewall/commit/fc83c24c32196f0edd966ad0fb82f8504bfd00a1))
* **types:** define UnifiedRequest schema ([57decec](https://github.com/djm204/franken-firewall/commit/57dececa96faac8ef4b12550362aec8ae1d73f81))


### Bug Fixes

* estimateTokensFromChars took string param — renamed to accept charCount number ([d73e2cc](https://github.com/djm204/franken-firewall/commit/d73e2cc8ca20423c465aa364e15b1bac63877bf5))
* scoped package root extraction split on first two segments not one ([22ba9db](https://github.com/djm204/franken-firewall/commit/22ba9db82130f32889515957b24ad58e32e60dc8))


### Miscellaneous

* **scaffold:** init repo with project instructions, CLAUDE.md, and implementation plan ([d3bac7b](https://github.com/djm204/franken-firewall/commit/d3bac7bde9a88f12fa74265e28bd87e9c3d9b9f4))
* **scaffold:** init TypeScript project with tsconfig, vitest, eslint, prettier ([a6843d2](https://github.com/djm204/franken-firewall/commit/a6843d20fbafec05812affd2a4e76c9be9a62d94))


### Documentation

* **adr:** ADR-0001 — TypeScript as implementation language ([b5eff8b](https://github.com/djm204/franken-firewall/commit/b5eff8b3c5ec6695af37c989b15fda04f4de9baa))
* **adr:** ADR-0002 — UnifiedResponse as version 1 canonical contract ([c3c33c2](https://github.com/djm204/franken-firewall/commit/c3c33c2a3d59f474443b260f7f69b5816416129c))
* **adr:** ADR-0003 — four-method adapter contract as provider boundary ([eaa5156](https://github.com/djm204/franken-firewall/commit/eaa5156e57488464b3b572164f6613b0f9ca940c))
* **adr:** ADR-0004 — structural intent scanning vs keyword matching ([fc8ffa6](https://github.com/djm204/franken-firewall/commit/fc8ffa68f6cb4f841e33174289da1dc0070b5f87))
* **adr:** ADR-0005 — local NLP for PII masking ([5e8373a](https://github.com/djm204/franken-firewall/commit/5e8373a6a2a187333df59b0cec2ca57bff65f6dd))
* **adr:** ADR-0006 — Skill Registry as external dependency (interface, not import) ([baa74f5](https://github.com/djm204/franken-firewall/commit/baa74f55085d8a2d2f928b0d0da386e76bf9a9f2))
* **adr:** ADR-0007 — in-memory CostLedger for v1; external store deferred ([d1f5bc7](https://github.com/djm204/franken-firewall/commit/d1f5bc7ee6944301e1fb4d30152f13db8559142a))
* **readme:** add comprehensive policy configuration reference ([ab26b26](https://github.com/djm204/franken-firewall/commit/ab26b267c91295986f95c652b30e2cf99af70771))
* **readme:** add README with disclaimer, architecture overview, and usage guide ([988d978](https://github.com/djm204/franken-firewall/commit/988d978ade468e2885bb6639ae1883f62ff219ff))
* **readme:** fix markdownlint MD036 and MD040 warnings ([d3592cb](https://github.com/djm204/franken-firewall/commit/d3592cbe749fd0a5f03a7f3fa6d4c4420cb3b99e))
* **readme:** rewrite as project-level README — motivation, architecture, usage, roadmap ([a4468f9](https://github.com/djm204/franken-firewall/commit/a4468f91eab56e8ca04bb27ceb04286e1e00a465))


### CI/CD

* **commitlint:** add commitlint config with adr type ([868bbad](https://github.com/djm204/franken-firewall/commit/868bbad263750f0c0fc88fcba13dadffc016134b))
* **release:** add Release Please with npm publish on release ([d612e19](https://github.com/djm204/franken-firewall/commit/d612e199330ebdccb74648a90aa914338beb9eea))
* **workflow:** add CI workflow for PRs and main branch pushes ([4757144](https://github.com/djm204/franken-firewall/commit/475714452cd2d40d3276980264024e7b520038ea))


### Tests

* **adapter/parity:** ClaudeAdapter and OpenAIAdapter return identical UnifiedResponse shape ([33b17fa](https://github.com/djm204/franken-firewall/commit/33b17fa602cdbfb106df7773cacebb1a5e07d927))
