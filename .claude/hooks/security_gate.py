#!/usr/bin/env python3
"""
PreToolUse hook: security gate for Edit / Write / MultiEdit tools.
Blocks writes that contain hardcoded secrets or dangerous patterns.
Exit 1 = block the tool. Exit 0 = allow.
"""
import sys
import json
import re
import os

SECRET_PATTERNS = [
    (
        r'(?i)(api[_-]?key|api[_-]?secret|access[_-]?token|private[_-]?key)\s*=\s*["\'][^"\']{20,}["\']',
        "Hardcoded API key/token",
    ),
    (
        r'(?i)password\s*=\s*["\'][^"\']{6,}["\']',
        "Hardcoded password in source",
    ),
    (
        r'sk-[a-zA-Z0-9]{32,}',
        "OpenAI API key pattern",
    ),
    (
        r'(?i)(aws_access_key_id|aws_secret_access_key)\s*=\s*["\'][^"\']+["\']',
        "AWS credential",
    ),
]

WARN_PATTERNS = [
    (
        r'dangerouslySetInnerHTML\s*=\s*\{[^}]*__html\s*:',
        "dangerouslySetInnerHTML — verify content is sanitized",
    ),
    (
        r'eval\s*\([^)]*(?:req\.|input|params|query|body)',
        "eval() with user-controlled input",
    ),
]

CHECKED_EXTS = {".ts", ".tsx", ".js", ".jsx", ".py", ".sh"}


def _is_skippable(path):
    basename = os.path.basename(path).lower()
    return (
        basename.startswith(".env")
        or "example" in basename
        or ".test." in basename
        or ".spec." in basename
    )


def check(content, file_path):
    critical, warnings = [], []
    if _is_skippable(file_path):
        return critical, warnings
    _, ext = os.path.splitext(file_path)
    if ext not in CHECKED_EXTS:
        return critical, warnings
    fname = os.path.basename(file_path)
    for pattern, label in SECRET_PATTERNS:
        if re.search(pattern, content):
            critical.append(f"SECURITY [{fname}]: {label}")
    for pattern, label in WARN_PATTERNS:
        if re.search(pattern, content):
            warnings.append(f"WARNING [{fname}]: {label}")
    return critical, warnings


def main():
    try:
        raw = sys.stdin.read()
        if not raw.strip():
            sys.exit(0)
        data = json.loads(raw)
        tool_name = data.get("tool_name", "")
        tool_input = data.get("tool_input", {})
        all_critical, all_warnings = [], []
        if tool_name == "Write":
            c, w = check(tool_input.get("content", ""), tool_input.get("file_path", ""))
            all_critical += c
            all_warnings += w
        elif tool_name == "Edit":
            c, w = check(tool_input.get("new_string", ""), tool_input.get("file_path", ""))
            all_critical += c
            all_warnings += w
        elif tool_name == "MultiEdit":
            fp = tool_input.get("file_path", "")
            for edit in tool_input.get("edits", []):
                c, w = check(edit.get("new_string", ""), fp)
                all_critical += c
                all_warnings += w
        if all_warnings:
            print("
".join(all_warnings), file=sys.stderr)
        if all_critical:
            print("
".join(all_critical), file=sys.stderr)
            print("
Bloqueado: elimina los secretos hardcodeados antes de continuar.", file=sys.stderr)
            sys.exit(1)
        sys.exit(0)
    except Exception as exc:
        print(f"security_gate.py error: {exc}", file=sys.stderr)
        sys.exit(0)


if __name__ == "__main__":
    main()
