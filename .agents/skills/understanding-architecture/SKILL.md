---
name: understanding-architecture
description: "Understand clawctl's architecture and design decisions. Use when exploring the codebase structure, understanding package responsibilities, learning about the VM backend, mount system, onboarding flow, or making cross-cutting changes."
---

# Understanding the Architecture

`clawctl` is a CLI for creating and managing OpenClaw gateways on macOS.
Each instance is a Lima VM provisioned and managed from the host.

## Package responsibilities

| Package        | Role                                                |
| -------------- | --------------------------------------------------- |
| `types`        | Shared types, schemas, constants                    |
| `templates`    | Lima config generators (lima-yaml.ts)               |
| `capabilities` | Capability definitions + runner + state tracking    |
| `host-core`    | Host-side library (drivers, provisioning, registry) |
| `cli`          | Host CLI (Ink wizard + commands)                    |
| `vm-cli`       | Guest CLI (claw) — runs inside the VM               |

## Key design decisions

- **Internal CLI (`claw`)** — compiled TypeScript binary in the VM;
  same language on both sides; structured JSON output
- **Capabilities** — self-contained provisioning modules with lifecycle
  hooks, dependency resolution, state tracking, and migrations
- **vz backend** — Apple Virtualization.framework for near-native
  performance on Apple Silicon
- **virtiofs mounts** — project dir (read-only) + data dir (writable)
  survive VM rebuilds
- **Delegate to OpenClaw** — wrap their installer/onboarding, don't
  reimplement

## Two modes

- **Interactive wizard** — Ink UI collects config, steps advance
  via `onComplete` callbacks
- **Headless** — config-file-driven, no prompts

## Full reference

See [references/architecture.md](references/architecture.md) for the
complete documentation including directory structure, component
relationships, onboarding approach, and error handling.
