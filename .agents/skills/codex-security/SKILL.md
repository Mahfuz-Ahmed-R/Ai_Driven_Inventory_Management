---
name: codex-security
description: >-
  Find, check, and fix vulnerabilities in code using OpenAI's openai/codex-security
  CLI tool. Use when the user asks to run Codex Security on the workspace.
---

# Codex Security (`openai/codex-security`)

Repository: https://github.com/openai/codex-security (Apache-2.0)

OpenAI's CLI tool to find, verify, and fix vulnerabilities in your code. Uses your OpenAI account.

## Install

```bash
npm install --global @openai/codex-security
```

## Authenticate & Scan

1. Sign in with your OpenAI account:
   ```bash
   cs login
   ```
2. Scan the current workspace:
   ```bash
   cs scan .
   ```

## Workflow

1. Check if `cs` is installed (`cs --version`), and install `@openai/codex-security` if needed.
2. Ensure the user is logged in (`cs login` — interactive auth must be completed by the user).
3. Run `cs scan .` from the workspace root and review the reported vulnerabilities and suggested fixes.
