---
name: semgrep
description: >-
  Run static code analysis across 30+ languages to flag risky patterns and
  vulnerabilities using semgrep/semgrep. Use when the user asks to scan source
  code (Python, JavaScript/React, etc.) for security bugs or anti-patterns.
---

# Semgrep (`semgrep/semgrep`)

Repository: https://github.com/semgrep/semgrep (LGPL-2.1)

Reads your code and flags risky patterns in 30+ languages (including Python/Django/FastAPI and JavaScript/React in this workspace). Code is analyzed locally by default.

## Install

- **Python (`pip` / `pipx` — works on Windows, macOS, Linux):**
  ```bash
  python -m pip install semgrep
  ```
- **macOS / Linux (Homebrew):**
  ```bash
  brew install semgrep
  ```

## Run Scan

From the workspace root (note: `semgrep ci` may ask you to sign in on first run; `semgrep scan --config auto` runs locally without sign-in):

```bash
semgrep scan --config auto .
```

Or using Semgrep CI:

```bash
semgrep ci
```

## Workflow

1. Check if `semgrep` is installed (`semgrep --version`).
2. Run `semgrep scan --config auto .` (or target `./backend` and `./frontend` separately).
3. Group findings by severity and file, and propose concrete code fixes.
