#!/usr/bin/env python3
"""SecureMonk local server with Shodan proxy support.

Serves static dashboard files and provides a backend endpoint:
  GET /api/shodan/search?query=<query>

Requires SHODAN_API_KEY in environment for the proxy route.
"""

from __future__ import annotations

import json
import os
import urllib.parse
import urllib.request
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class SecureMonkHandler(SimpleHTTPRequestHandler):
    def _send_json(self, payload: dict, status: int = HTTPStatus.OK) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path != "/api/shodan/search":
            super().do_GET()
            return

        shodan_key = os.getenv("SHODAN_API_KEY", "").strip()
        if not shodan_key:
            self._send_json(
                {
                    "error": "Server is missing SHODAN_API_KEY.",
                    "hint": "Set SHODAN_API_KEY before starting server.py.",
                },
                status=HTTPStatus.BAD_REQUEST,
            )
            return

        query = urllib.parse.parse_qs(parsed.query).get("query", [""])[0].strip()
        if not query:
            self._send_json(
                {"error": "Missing required query parameter: query."},
                status=HTTPStatus.BAD_REQUEST,
            )
            return

        endpoint = "https://api.shodan.io/shodan/host/search"
        encoded = urllib.parse.urlencode({"key": shodan_key, "query": query})
        url = f"{endpoint}?{encoded}"

        try:
            with urllib.request.urlopen(url, timeout=20) as response:
                data = response.read()
                content_type = response.headers.get("Content-Type", "application/json")
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)
        except Exception as exc:  # network / API failure passthrough
            self._send_json(
                {
                    "error": "Failed to query Shodan API.",
                    "details": str(exc),
                },
                status=HTTPStatus.BAD_GATEWAY,
            )


def main() -> None:
    port = int(os.getenv("PORT", "4173"))
    server = ThreadingHTTPServer(("0.0.0.0", port), SecureMonkHandler)
    print(f"SecureMonk server running on http://0.0.0.0:{port}")
    server.serve_forever()


if __name__ == "__main__":
    main()
