---
name: claude-code-security-review
description: >-
  Set up automated AI security code reviews on GitHub pull requests using
  anthropics/claude-code-security-review. Use when the user asks to add Claude
  security review as a GitHub Action in this repository.
---

# Claude Code Security Review (`anthropics/claude-code-security-review`)

Repository: https://github.com/anthropics/claude-code-security-review (MIT)

Claude reviews every code change / pull request for security problems on GitHub.

## Prerequisites

- A GitHub repository
- An Anthropic API key saved as a GitHub repository secret (e.g., `ANTHROPIC_API_KEY`)

## GitHub Actions Setup

Add a workflow file under `.github/workflows/security-review.yml` referencing the action:

```yaml
- uses: anthropics/claude-code-security-review@main
```

Check the [anthropics/claude-code-security-review README](https://github.com/anthropics/claude-code-security-review) for the full, up-to-date workflow template, permissions, and input parameters.

## Workflow

1. Confirm the user wants to add a GitHub Actions workflow to `.github/workflows/`.
2. Remind the user to add their `ANTHROPIC_API_KEY` in GitHub Repo Settings -> Secrets and variables -> Actions.
3. Create `.github/workflows/claude-security-review.yml` following the official README.
