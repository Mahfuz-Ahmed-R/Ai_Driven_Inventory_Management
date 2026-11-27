---
name: comp
description: >-
  Self-host and run open-source security compliance automation (SOC 2 / ISO /
  Vanta & Drata alternative) using trycompai/comp. Use when the user asks about
  compliance tracking, security paperwork, or setting up CompAI.
---

# Comp (`trycompai/comp`)

Repository: https://github.com/trycompai/comp (AGPL-3.0)

Helps a company get through security compliance (the repo calls itself an open-source Vanta and Drata alternative). Useful when customers start asking for security paperwork.

## Prerequisites

- [Bun](https://bun.sh/)
- Docker & Docker Compose

## Self-Hosting Quick Start

Clone `https://github.com/trycompai/comp` into its own directory (outside this app repo unless intentionally vendored), then run:

```bash
bun install && bun run docker:up && bun run db:migrate && bun run dev
```

Check the [trycompai/comp README](https://github.com/trycompai/comp) for environment variables and production deployment steps.

## Workflow

1. Verify `bun --version` and `docker --version` are installed.
2. Clone `https://github.com/trycompai/comp` to a dedicated folder.
3. Run the Bun + Docker setup commands and guide the user through initial compliance workspace setup.
