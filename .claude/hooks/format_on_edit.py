#!/usr/bin/env python3
"""
PostToolUse hook: ESLint --fix on edited TypeScript/JavaScript files.
Never blocks (always exits 0).
"""
import sys
import json
import subprocess
import os

CHECKED_EXTS = {".ts", ".tsx", ".js", ".jsx"}

def main():
    try:
        raw = sys.stdin.read()
        if not raw.strip():
            sys.exit(0)
        data = json.loads(raw)
        tool_input = data.get("tool_input", {})
        fp = tool_input.get("file_path", "")
        if not fp:
            sys.exit(0)
        _, ext = os.path.splitext(fp)
        if ext not in CHECKED_EXTS:
            sys.exit(0)
        result = subprocess.run(
            ["npx", "eslint", "--fix", "--quiet", fp],
            capture_output=True,
            text=True,
            timeout=30,
        )
        if result.returncode != 0 and result.stderr:
            print(f"ESLint: {result.stderr[:300]}", file=sys.stderr)
    except Exception:
        pass
    sys.exit(0)

if __name__ == "__main__":
    main()
