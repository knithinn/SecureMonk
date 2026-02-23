# SecureMonk

A defensive AI security dashboard for:

- Registering AI agents, LLM endpoints, and API keys.
- Tracking basic risk posture for prompt injection hardening.
- Querying Shodan for exposed AI-related internet assets.
- Aligning remediation activities with OWASP LLM Top 10 themes.

## Run locally

```bash
export SHODAN_API_KEY="<your_shodan_api_key>"
python3 server.py
```

Then open `http://localhost:4173`.

## Why a backend proxy for Shodan?

Shodan lookups are routed through `/api/shodan/search` in `server.py`.
This avoids browser CORS/key exposure issues and keeps your API key server-side.
