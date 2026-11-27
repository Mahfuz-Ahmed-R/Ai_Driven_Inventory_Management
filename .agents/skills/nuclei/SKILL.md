---
name: nuclei
description: >-
  Scan live web applications and APIs for known vulnerabilities and misconfigurations
  using projectdiscovery/nuclei. Use when the user asks to test a running URL,
  staging site, or local server against Nuclei templates.
---

# Nuclei (`projectdiscovery/nuclei`)

Repository: https://github.com/projectdiscovery/nuclei (MIT)

Checks your live website or API against thousands of known weak spots using community templates.

> **Important:** Only scan sites and endpoints you own or have written permission to test.

## Install

- **With Go (1.21+):**
  ```bash
  go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest
  ```
- **Windows (winget / scoop) or macOS (brew):**
  ```powershell
  winget install ProjectDiscovery.Nuclei
  ```

## Run Scan

```bash
nuclei -target https://yourapp.com
```

For a locally running dev/staging server (e.g., `http://localhost:8000` or `http://localhost:5173`):

```bash
nuclei -target http://localhost:8000
```

## Workflow

1. Confirm the user owns or has permission to test the target URL.
2. Verify `nuclei -version` and update templates with `nuclei -update-templates` if needed.
3. Run `nuclei -target <url>` and summarize findings by severity (`critical`, `high`, `medium`, `low`, `info`).
