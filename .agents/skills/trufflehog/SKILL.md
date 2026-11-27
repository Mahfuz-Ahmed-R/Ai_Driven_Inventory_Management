---
name: trufflehog
description: >-
  Scan git history and files for leaked passwords, API keys, and tokens using
  trufflesecurity/trufflehog. Use first when checking a repo for exposed live
  credentials across 800+ key types.
---

# TruffleHog (`trufflesecurity/trufflehog`)

Repository: https://github.com/trufflesecurity/trufflehog (AGPL-3.0)

Finds passwords and keys leaked in your code and git history. Supports over 800 key types and can verify whether a discovered key is still live.

> **Security Rule:** If TruffleHog finds a **live/verified key**, rotate/replace that key at the provider **first**, then remove it from the code and git history.

## Install

- **Windows (scoop / Docker):**
  ```powershell
  scoop install trufflehog
  ```
  Or with Docker:
  ```bash
  docker run --rm -v "${PWD}:/pwd" trufflesecurity/trufflehog:latest filesystem /pwd
  ```
- **macOS / Linux (Homebrew):**
  ```bash
  brew install trufflehog
  ```

## Run Scan

Scan a local git repository (including commit history):

```bash
trufflehog git file://. --results=verified
```

Scan a remote GitHub repo:

```bash
trufflehog git https://github.com/you/your-repo --results=verified
```

Scan the current filesystem (including untracked files):

```bash
trufflehog filesystem . --results=verified
```

## Workflow

1. Run `trufflehog git file://. --results=verified` (and optionally `trufflehog filesystem .`).
2. Never print full secret values in reports—redact them.
3. For any verified/live key, instruct the user to **revoke/rotate the key immediately** before cleaning git history.
