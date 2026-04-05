#!/usr/bin/env python3
"""
Auto-update docs/wiki.md after each Claude Code session.
Runs as a Stop hook — only fires if there were new commits since last wiki update.
Uses claude-haiku-4-5 to keep token costs minimal.
"""
import subprocess
import json
import os
import sys
import urllib.request
import urllib.error
from datetime import datetime
from pathlib import Path

PROJECT_DIR = Path(__file__).parent.parent
WIKI_PATH = PROJECT_DIR / "docs" / "wiki.md"
MEMORY_DIR = Path.home() / ".claude/projects/-Users-macintosh-Documents-work-afina-ai-first/memory"
MODEL = "claude-haiku-4-5-20251001"


def git(cmd: list[str]) -> str:
    result = subprocess.run(
        ["git", "-C", str(PROJECT_DIR)] + cmd,
        capture_output=True, text=True
    )
    return result.stdout.strip()


def main():
    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        sys.exit(0)  # No key — silently skip

    # Only run if there were commits since last wiki update
    if WIKI_PATH.exists():
        wiki_mtime = datetime.fromtimestamp(WIKI_PATH.stat().st_mtime).isoformat()
        recent_commits = git(["log", "--oneline", f"--since={wiki_mtime}"])
    else:
        recent_commits = git(["log", "--oneline", "-5"])

    if not recent_commits:
        sys.exit(0)  # Nothing new — skip

    # Gather context
    wiki_content = WIKI_PATH.read_text() if WIKI_PATH.exists() else ""
    git_log = git(["log", "--oneline", "-20"])

    memory_content = ""
    if MEMORY_DIR.exists():
        for f in sorted(MEMORY_DIR.glob("*.md")):
            if f.name != "MEMORY.md":
                memory_content += f"\n### {f.stem}\n{f.read_text()}\n"

    prompt = f"""You maintain a project wiki for a software project called Afina (AI-first marketing tool prototype).

Your job: update the wiki to reflect new completed work from recent commits. Be concise.

Rules:
- Only add genuinely new information (new features, decisions, conventions)
- Keep existing sections and formatting intact
- Don't remove content unless clearly outdated
- Write in the same language as existing content (mix of Russian/English is fine)
- Return the COMPLETE updated wiki.md

CURRENT WIKI:
{wiki_content}

NEW COMMITS (since last wiki update):
{recent_commits}

FULL RECENT GIT LOG:
{git_log}

MEMORY FILES (project context):
{memory_content}
"""

    payload = json.dumps({
        "model": MODEL,
        "max_tokens": 4096,
        "messages": [{"role": "user", "content": prompt}]
    }).encode()

    try:
        req = urllib.request.Request(
            "https://api.anthropic.com/v1/messages",
            data=payload,
            headers={
                "Content-Type": "application/json",
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01",
            }
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read())
            updated_wiki = data["content"][0]["text"]
    except (urllib.error.URLError, KeyError, json.JSONDecodeError):
        sys.exit(0)  # Network/API error — silently skip

    WIKI_PATH.write_text(updated_wiki)

    # Commit the update
    subprocess.run(["git", "-C", str(PROJECT_DIR), "add", "docs/wiki.md"], capture_output=True)
    subprocess.run([
        "git", "-C", str(PROJECT_DIR), "commit", "-m",
        "docs: auto-update wiki [wiki-bot]",
        "--no-verify"
    ], capture_output=True)


if __name__ == "__main__":
    main()
