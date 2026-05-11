#!/usr/bin/env python3
"""
Security gate hook — scans edited files for common vulnerabilities.
Runs automatically after every Edit/Write/MultiEdit tool call.
Exits with code 0 always to avoid blocking Claude; issues are warnings only.
"""

import sys
import re
import os
from pathlib import Path

RULES = [
    # Secrets & credentials
    (r'(?i)(password|passwd|pwd)\s*=\s*["\'][^"\']{4,}["\']',
     "HARDCODED_PASSWORD", "Possible hardcoded password"),
    (r'(?i)(api_key|apikey|secret_key|secret)\s*=\s*["\'][A-Za-z0-9+/=_\-]{8,}["\']',
     "HARDCODED_SECRET", "Possible hardcoded API key or secret"),
    (r'(?i)(token)\s*=\s*["\'][A-Za-z0-9+/=_\-\.]{20,}["\']',
     "HARDCODED_TOKEN", "Possible hardcoded token"),
    (r'-----BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----',
     "PRIVATE_KEY", "Private key material in source file"),

    # SQL Injection
    (r'(?i)(execute|query|cursor\.execute)\s*\(\s*["\'].*\%[s|d].*["\']',
     "SQL_INJECTION", "Possible SQL injection via string formatting"),
    (r'(?i)f["\'].*SELECT.*WHERE.*\{',
     "SQL_INJECTION_FSTRING", "Possible SQL injection via f-string"),

    # Command Injection
    (r'(?i)(os\.system|subprocess\.call|subprocess\.run|shell=True)',
     "CMD_INJECTION_RISK", "Shell execution detected — verify inputs are sanitized"),
    (r'(?i)exec\s*\(',
     "EXEC_USAGE", "exec() usage detected — review for code injection risk"),

    # XSS
    (r'(?i)innerHTML\s*=\s*(?![\"\'])',
     "XSS_INNERHTML", "Direct innerHTML assignment — possible XSS"),
    (r'(?i)dangerouslySetInnerHTML',
     "XSS_REACT", "dangerouslySetInnerHTML usage — ensure content is sanitized"),

    # Insecure patterns
    (r'(?i)verify\s*=\s*False',
     "SSL_VERIFY_DISABLED", "SSL certificate verification disabled"),
    (r'(?i)DEBUG\s*=\s*True',
     "DEBUG_ENABLED", "Debug mode enabled — must not reach production"),
    (r'(?i)(md5|sha1)\s*\(',
     "WEAK_HASH", "Weak hash algorithm (MD5/SHA1) — use SHA-256 or better"),
    (r'(?i)random\.(random|randint|choice)\b(?!.*secrets)',
     "WEAK_RANDOM", "Non-cryptographic random — use secrets module for security-sensitive values"),

    # Sensitive data exposure
    (r'(?i)print\s*\(.*(?:password|token|secret|key)',
     "SENSITIVE_LOG", "Possible logging of sensitive data"),
    (r'(?i)console\.log\s*\(.*(?:password|token|secret|key)',
     "SENSITIVE_LOG_JS", "Possible logging of sensitive data in JS"),
]

SKIP_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico',
                   '.lock', '.sum', '.mod', '.map', '.woff', '.woff2', '.ttf'}

SKIP_DIRS = {'node_modules', '.git', '__pycache__', 'dist', 'build', '.next', 'vendor'}


def should_skip(filepath: str) -> bool:
    p = Path(filepath)
    if p.suffix.lower() in SKIP_EXTENSIONS:
        return True
    if any(part in SKIP_DIRS for part in p.parts):
        return True
    if not p.exists():
        return True
    return False


def scan_file(filepath: str) -> list[dict]:
    issues = []
    try:
        content = Path(filepath).read_text(encoding='utf-8', errors='ignore')
        for i, line in enumerate(content.splitlines(), 1):
            for pattern, code, message in RULES:
                if re.search(pattern, line):
                    issues.append({
                        'line': i,
                        'code': code,
                        'message': message,
                        'snippet': line.strip()[:120]
                    })
    except Exception as e:
        print(f"[SECURITY GATE] Could not scan {filepath}: {e}", file=sys.stderr)
    return issues


def main():
    filepath = sys.argv[1] if len(sys.argv) > 1 else ""

    if not filepath or should_skip(filepath):
        sys.exit(0)

    issues = scan_file(filepath)

    if not issues:
        print(f"[SECURITY GATE] ✓ {filepath} — no issues found")
    else:
        print(f"\n[SECURITY GATE] ⚠  {len(issues)} issue(s) in {filepath}:")
        for issue in issues:
            print(f"  Line {issue['line']:4d} [{issue['code']}] {issue['message']}")
            print(f"           → {issue['snippet']}")
        print()
        print("[SECURITY GATE] Review the issues above before committing.")
        print("[SECURITY GATE] These are warnings — fix before pushing to production.\n")

    sys.exit(0)


if __name__ == "__main__":
    main()
