"""Music Hub API: owner login plus the tool registry (see musicbox/tools)."""

from typing import Any

from fastapi import Depends, FastAPI, HTTPException
from pydantic import BaseModel, Field

from musicbox.runtime import RunLog
from musicbox.tools import TOOLS, list_tools, run_tool

from .auth import require_owner
from .auth import router as auth_router

app = FastAPI(title="Music Hub")
app.include_router(auth_router)


class RunBody(BaseModel):
    params: dict[str, Any] = Field(default_factory=dict)


@app.get("/api/health")
def health():
    return {"ok": True}


@app.get("/api/tools", dependencies=[Depends(require_owner)])
def tools():
    return list_tools()


@app.post("/api/tools/{tool_id}/run", dependencies=[Depends(require_owner)])
def run(tool_id: str, body: RunBody):
    if tool_id not in TOOLS:
        raise HTTPException(404, "Unknown tool")
    log = RunLog()
    try:
        result = run_tool(tool_id, body.params, log)
    except Exception as e:  # a tool failing is a result to show, not a server error
        log(f"Failed: {e}")
        return {"ok": False, "error": str(e), "log": log.lines, "result": None}
    return {"ok": True, "error": None, "log": log.lines, "result": result}
