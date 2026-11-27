---
name: pyrit
description: >-
  Red-team and test AI features, LLM endpoints, or chatbots for misuse, prompt
  injection, and jailbreaks using microsoft/PyRIT. Use when the user asks to
  security-test an AI/LLM feature in the app.
---

# PyRIT (`microsoft/PyRIT`)

Repository: https://github.com/microsoft/PyRIT (MIT)

Python Risk Identification Tool for generative AI. Tests your own AI feature or chatbot for ways people could misuse it (prompt injection, jailbreaks, unsafe outputs).

> **Important:** Only run PyRIT scans against AI endpoints/models you own or have written permission to test.

## Install

Follow the installation guide in the [microsoft/PyRIT documentation](https://github.com/microsoft/PyRIT) (typically via `pip install pyrit` in a Python virtual environment).

```bash
python -m pip install pyrit
```

## Workflow

1. Identify the AI/chatbot endpoint or model wrapper in the project (e.g., in `backend/`).
2. Set up a dedicated Python virtual environment and install `pyrit` per the repo docs.
3. Configure a PyRIT target pointing at your local/staging AI endpoint and run automated red-teaming orchestrators/converters.
4. Summarize discovered failure modes and recommend guardrails/input validation.
