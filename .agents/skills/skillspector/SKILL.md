---
name: skillspector
description: >-
  Scan AI agent skills for security risks before installing or trusting them using
  NVIDIA/SkillSpector. Use when the user asks to audit a skill folder or skill
  repository for malicious instructions or unsafe patterns.
---

# SkillSpector (`NVIDIA/SkillSpector`)

Repository: https://github.com/NVIDIA/SkillSpector (Apache-2.0)

Scans AI skills before you install them and produces a risk score from 0 to 100.

## Prerequisites

- Python 3.12 or 3.13

## Install

```bash
python -m pip install --upgrade skillspector
```

*(Check the [NVIDIA/SkillSpector README](https://github.com/NVIDIA/SkillSpector) for the direct GitHub `pip install` URL if the package is not yet on PyPI for your environment.)*

## Run Scan

Scan a local skill folder:

```bash
skillspector scan ./.agents/skills/my-skill/
```

Or scan a skill repository link (see `skillspector scan --help` for exact flags).

## Workflow

1. Verify Python 3.12/3.13 and `skillspector` are installed.
2. Run `skillspector scan <path-or-repo>` on any third-party skill before enabling it.
3. Review the 0–100 risk score and flagged findings with the user.
