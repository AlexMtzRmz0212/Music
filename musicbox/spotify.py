"""Spotify Web API, client-credentials flow (no user login, public catalogue only)."""

import time

import requests

from . import config

_token: dict = {"value": "", "expires": 0.0}


def get_token() -> str:
    if _token["value"] and time.time() < _token["expires"]:
        return _token["value"]
    client_id = config.get("SPOTIFY_CLIENT_ID")
    client_secret = config.get("SPOTIFY_CLIENT_SECRET")
    if not client_id or not client_secret:
        raise ValueError("SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET must be set")
    response = requests.post(
        "https://accounts.spotify.com/api/token",
        data={"grant_type": "client_credentials", "client_id": client_id, "client_secret": client_secret},
        timeout=20,
    )
    if response.status_code != 200:
        raise RuntimeError(f"Spotify auth failed ({response.status_code})")
    body = response.json()
    _token["value"] = body["access_token"]
    _token["expires"] = time.time() + body.get("expires_in", 3600) - 60
    return _token["value"]


def search(query: str, kind: str = "album", limit: int = 10) -> list[dict]:
    """Search the catalogue. `kind` is 'album', 'artist' or 'track'; returns the raw items."""
    response = requests.get(
        "https://api.spotify.com/v1/search",
        headers={"Authorization": f"Bearer {get_token()}"},
        params={"q": query, "type": kind, "limit": limit},
        timeout=20,
    )
    if response.status_code != 200:
        raise RuntimeError(f"Spotify search failed ({response.status_code})")
    return response.json()[f"{kind}s"]["items"]
