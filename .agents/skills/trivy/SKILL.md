---
name: trivy
description: >-
  Scan this project for known vulnerable packages (CVEs), misconfigurations, and
  hardcoded secrets using aquasecurity/trivy. Use when the user asks to scan
  dependencies, Dockerfiles, or filesystem configs for vulnerabilities.
---

# Trivy (`aquasecurity/trivy`)

Repository: https://github.com/aquasecurity/trivy (Apache-2.0)

Scans your project for known vulnerable packages, bad settings (misconfigurations), and secrets. No AI model needed.

## Install

- **Windows (winget / scoop / choco):**
  ```powershell
  winget install AquaSecurity.Trivy
  ```
- **macOS / Linux (Homebrew):**
  ```bash
  brew install trivy
  ```

## Run Scan on This Workspace

```bash
trivy fs --scanners vuln,secret,misconfig .
```

To scan specific targets (e.g., `frontend/`, `backend/`, or `docker-compose.yml`):

```bash
trivy fs --scanners vuln,secret,misconfig ./frontend
trivy fs --scanners vuln,secret,misconfig ./backend
trivy config ./docker-compose.yml
```

## Workflow

1. Verify `trivy --version` works; install if missing.
2. Run `trivy fs --scanners vuln,secret,misconfig .` from the workspace root.
3. Report CRITICAL and HIGH vulnerabilities, exposed secrets, and Dockerfile/compose misconfigurations with actionable remediation steps.
