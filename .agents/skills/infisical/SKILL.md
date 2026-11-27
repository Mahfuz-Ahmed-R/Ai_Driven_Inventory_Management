---
name: infisical
description: >-
  Manage secrets securely and scan for leaked credentials before commits using
  Infisical/infisical. Use when the user asks to set up Infisical, scan for
  secrets, or install a pre-commit secret-scanning hook.
---

# Infisical (`Infisical/infisical`)

Repository: https://github.com/Infisical/infisical (MIT core + enterprise folder)

Keeps passwords, API keys, and environment variables out of your code in one safe place, and provides a CLI to scan for secrets before each commit.

## Install CLI

- **Windows (scoop / npm):**
  ```powershell
  scoop bucket add infisical https://github.com/Infisical/scoop-infisical.git
  scoop install infisical
  ```
- **macOS / Linux (Homebrew):**
  ```bash
  brew install infisical/get-cli/infisical
  ```

## Scan for Secrets

Run a verbose secret scan across the workspace:

```bash
infisical scan --verbose
```

Install the pre-commit hook so secrets are caught before every commit:

```bash
infisical scan install --pre-commit-hook
```

## Self-Hosting

Follow the Docker self-hosting instructions in the [Infisical README](https://github.com/Infisical/infisical) if you want to host your own Infisical server.

## Workflow

1. Verify `infisical --version` is available.
2. Run `infisical scan --verbose` to check for any hardcoded secrets in the repo or `.env` files tracked by git.
3. Offer to install the pre-commit hook (`infisical scan install --pre-commit-hook`) if desired.
