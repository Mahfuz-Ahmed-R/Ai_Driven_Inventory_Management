---
name: strix
description: >-
  Run dynamic, hacker-style security testing against this app using usestrix/strix.
  Use when the user asks to run Strix, simulate an attack, or dynamically test a
  local copy of the application for exploitable vulnerabilities.
---

# Strix (`usestrix/strix`)

Repository: https://github.com/usestrix/strix (Apache-2.0)

Attacks your own app like a real hacker would. It runs your code in a sandbox and proves each finding.

> **Important:** Only point Strix at apps you own or have written permission to test. Run against a test copy of the app, not production data.

## Prerequisites

- Docker running locally
- An LLM API key and provider/model configured

## Install & Run

### macOS / Linux (or WSL)

```bash
curl -sSL https://strix.ai/install | bash
export STRIX_LLM="<provider/model>"
export LLM_API_KEY="your-api-key"
strix --target ./app-directory
```

### Windows PowerShell (via WSL or Docker)

If running on Windows, install and run inside WSL2 with Docker Desktop integration enabled, or check the [usestrix/strix README](https://github.com/usestrix/strix) for the latest Windows/Docker instructions.

## Workflow

1. Confirm Docker is running and `STRIX_LLM` / `LLM_API_KEY` are set (never hardcode keys in the repo).
2. Point `strix --target` at a test copy of the target directory (e.g., `./backend` or a copied workspace).
3. Review the proven findings and prioritize fixing confirmed exploitable issues.
