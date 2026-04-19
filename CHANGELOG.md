# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] — 2026-04-19

Initial release. All hard gates A–D pass.

### Added
- Six product layers, **19 tools**, all schema-validated:
  - Assessment: `forkable_assess`, `forkable_choose_path`, `forkable_make_forkable`
  - Execution: `forkable_preflight_policy`, `forkable_create_fork`, `forkable_create_from_template`, `forkable_check_operation`
  - Bootstrap: `forkable_bootstrap`, `forkable_configure_upstream`, `forkable_scan_drift`, `forkable_emit_handoff`
  - Sync: `forkable_sync`, `forkable_diagnose_divergence`, `forkable_propose_sync_pr`
  - Fleet: `forkable_list_forks`, `forkable_fleet_health`, `forkable_batch_sync`
  - Receipts: `forkable_receipt`, `forkable_audit_log`
- MCP stdio server (`forkable mcp` subcommand or `forkable-mcp` binary).
- CLI parity: every tool has a subcommand with sensible CLI flags + `--json`.
- Async-aware execution: fork/template creation returns an operation_id; `check_operation` performs single-probe readiness checks.
- Fork policy resolver covers enterprise → org → repo cascade and surfaces `FORK_POLICY_BLOCKED` before wasted API calls.
- Sync layer uses GitHub merge-upstream (since 2021) and the cross-repo compare API for honest divergence diagnosis. Conflicted syncs route to `propose_sync_pr` — never force-pushes.
- Bootstrap profiles: `contributor`, `starter-kit`, `internal-seed`, `client-delivery`, `experiment`. Idempotent — files that already exist are skipped, not overwritten.
- Drift scanner detects hardcoded local paths, leaked secrets (GitHub PAT, AWS, OpenAI, Google), and stale source-owner references. Secret values are never echoed.
- SQLite state store (better-sqlite3) for operation tracking and append-only audit log. Audit redacts sensitive keys and inline PATs at write time.
- Single dispatch boundary (`src/dispatch.ts`) auto-validates and auto-audits every tool call.
- TypeScript / Node 20+ / ESM throughout.
- 162 tests across 31 files, all green.
- CI: paths-gated, ubuntu-latest, concurrency-guarded, single workflow file.
- SHIP_GATE.md tracks all hard gates A–D; SECURITY.md with explicit threat model.
