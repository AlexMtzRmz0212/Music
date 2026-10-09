"""
Tool registry: every mini-project is one module in this package.

A tool module defines

    META = {
        "id": "spotify_search",            # url-safe, unique
        "title": "...", "description": "...",
        "needs": ["SPOTIFY_CLIENT_ID"],    # settings it cannot run without
        "writes": False,                   # True if it can change data elsewhere (Notion...)
        "params": [{"name": "query", "label": "Search", "type": "text", "default": ""}],
    }

    def run(params: dict, log) -> dict:    # `log(str)` adds a line to the run log
        return {"rows": [...], ...}        # `rows` (list of dicts) is shown as a table

and shows up in the web UI on its own. param types: text, bool, number, select (+ "options").
"""

import importlib
import pkgutil
from types import ModuleType

from .. import config
from ..runtime import Log


def _load() -> dict[str, ModuleType]:
    tools = {}
    for info in pkgutil.iter_modules(__path__):
        module = importlib.import_module(f"{__name__}.{info.name}")
        if hasattr(module, "META") and hasattr(module, "run"):
            tools[module.META["id"]] = module
    return dict(sorted(tools.items(), key=lambda item: item[1].META.get("order", 100)))


TOOLS = _load()


def list_tools() -> list[dict]:
    """Tool descriptions for the UI, each with the settings it is still missing."""
    return [{**m.META, "missing": config.missing(m.META.get("needs", []))} for m in TOOLS.values()]


def _coerce(spec: dict, value):
    kind = spec["type"]
    if value is None or value == "":
        value = spec.get("default")
    if kind == "bool":
        return value in (True, "true", "1", 1, "on")
    if kind == "number":
        try:
            return int(value)
        except (TypeError, ValueError):
            return int(spec.get("default") or 0)
    text = "" if value is None else str(value).strip()
    if kind == "select" and text not in spec.get("options", []):
        return spec.get("default")
    return text


def run_tool(tool_id: str, params: dict, log: Log) -> dict:
    """Run one tool. Raises KeyError for an unknown id, ValueError for missing settings."""
    module = TOOLS[tool_id]
    missing = config.missing(module.META.get("needs", []))
    if missing:
        raise ValueError("Missing settings: " + ", ".join(missing))
    clean = {spec["name"]: _coerce(spec, (params or {}).get(spec["name"])) for spec in module.META.get("params", [])}
    return module.run(clean, log)
