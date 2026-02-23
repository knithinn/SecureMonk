# SecureMonk

A frontend dashboard concept for defensive AI security operations:

- Register AI agents, LLM endpoints, and API keys.
- Track basic risk posture for prompt injection hardening.
- Query Shodan for exposed AI-related internet assets.
- Align remediation activities with OWASP LLM Top 10 themes.

## Run locally

```bash
python3 -m http.server 4173
```

Then open `http://localhost:4173`.

> Note: Shodan API calls from browser clients may fail due to CORS or key policy restrictions. Use a backend proxy for production deployments.
