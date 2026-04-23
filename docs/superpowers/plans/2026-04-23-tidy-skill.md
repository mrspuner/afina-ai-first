# `/tidy` Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a global Claude Code skill `/tidy` that interactively archives completed plans/specs from `docs/superpowers/`, cleans build-artifact caches (`.next/`, `tsconfig.tsbuildinfo`, `test-results/`, `.DS_Store`), appends a cleanup CHANGELOG entry, and bundles everything into one commit.

**Architecture:** Single `SKILL.md` at `~/.claude/skills/tidy/SKILL.md`. The skill is a behavioral spec (instructions Claude follows) — no helper scripts, no compiled code. All logic is inline shell + git commands. The skill runs 5 sequential steps: precondition → scan+report → user reply → execute → single commit.

**Tech Stack:** Markdown (SKILL.md with YAML frontmatter), bash (commands referenced in-skill), git (mv + commit + amend). Based on design spec `docs/superpowers/specs/2026-04-23-tidy-skill-design.md`.

**Testing strategy:** Because the skill is behavioral instructions (not executable code), unit tests don't apply. Validation is acceptance-based: a final task smoke-tests `/tidy` on the live Afina repo and verifies the design's Success criteria (clean report → selective archive → clean tree → correct CHANGELOG entry → matching commit).

---

## File Structure

Single new file:
- Create: `~/.claude/skills/tidy/SKILL.md` — the entire skill

No modifications to existing files. Afina repo is only touched during the smoke-test task (Task 7), which creates ordinary archive commits via the skill.

---

## Task 1: Scaffold skill directory + frontmatter

**Files:**
- Create: `~/.claude/skills/tidy/SKILL.md`

- [ ] **Step 1: Verify `~/.claude/skills/` exists**

Run:
```bash
ls -d ~/.claude/skills/
```
Expected: prints `/Users/macintosh/.claude/skills/`. If it doesn't exist, create it: `mkdir -p ~/.claude/skills`.

- [ ] **Step 2: Create the skill directory**

Run:
```bash
mkdir -p ~/.claude/skills/tidy
```

- [ ] **Step 3: Write minimal SKILL.md with frontmatter only**

Write to `~/.claude/skills/tidy/SKILL.md`:

```markdown
---
name: tidy
description: Tidy up the project — interactively archive completed plans/specs from docs/superpowers/, clean build-artifact caches (.next, tsconfig.tsbuildinfo, test-results, .DS_Store), append a cleanup CHANGELOG entry, and bundle everything in one commit. Invoke manually at natural breakpoints (end of day, end of a roadmap block). Trigger when user types /tidy, says "приборка", "почисти папку", "tidy up", or "clean up docs".
---

# /tidy — Project Tidy-Up

Manually-invoked cleanup. Runs 5 steps in order. Announce each step so the user can interrupt mid-flow.

STEPS NOT YET WRITTEN — see tasks 2-6.
```

- [ ] **Step 4: Verify skill is discoverable**

Run:
```bash
ls -la ~/.claude/skills/tidy/SKILL.md && head -5 ~/.claude/skills/tidy/SKILL.md
```
Expected: file exists, frontmatter prints with `name: tidy`.

- [ ] **Step 5: No commit yet**

`~/.claude/skills/` is outside the Afina repo; we'll not commit anything from tasks 1–6. The only commit in this plan comes from task 7's smoke test of `/tidy` on Afina itself. If `~/.claude/skills/` is under a dotfiles repo, the user can commit that separately.

---

## Task 2: Write Step 1 (precondition check)

**Files:**
- Modify: `~/.claude/skills/tidy/SKILL.md`

- [ ] **Step 1: Replace the placeholder with Step 1 section**

Open `~/.claude/skills/tidy/SKILL.md`. Replace the line `STEPS NOT YET WRITTEN — see tasks 2-6.` with:

````markdown
## Step 1 — Precondition: clean git tree

Run:
```bash
git status --porcelain
```

If output is non-empty, STOP and print:

> Working tree is dirty. Commit or stash your changes first, then re-run `/tidy`.

Do NOT proceed to step 2. No exceptions, no `--force` flag.
````

- [ ] **Step 2: Verify section present**

Run:
```bash
grep -A1 "Step 1 — Precondition" ~/.claude/skills/tidy/SKILL.md
```
Expected: prints the section heading and "Run:" line.

---

## Task 3: Write Step 2 (scan and report)

**Files:**
- Modify: `~/.claude/skills/tidy/SKILL.md`

- [ ] **Step 1: Append Step 2 section to SKILL.md**

Append to the end of `~/.claude/skills/tidy/SKILL.md`:

````markdown

## Step 2 — Scan and report

Gather data; print a single-screen report. Do not move anything yet.

### 2a. List plans

```bash
ls -1 docs/superpowers/plans/*.md 2>/dev/null | sort
```

For each file:
- Extract date prefix and slug from basename `YYYY-MM-DD-<slug>.md`.
- Get "last modified" via git (more stable than mtime across machines):
  ```bash
  git log -1 --format=%cr -- <file>
  ```

### 2b. List specs

Same as 2a but for `docs/superpowers/specs/*.md`.

### 2c. List build artifacts (only report what exists)

```bash
[ -d .next ] && du -sh .next
[ -f tsconfig.tsbuildinfo ] && du -sh tsconfig.tsbuildinfo
[ -d test-results ] && [ -n "$(ls -A test-results 2>/dev/null)" ] && du -sh test-results
find . -name ".DS_Store" -not -path "./node_modules/*" -not -path "./.git/*" 2>/dev/null
```

Sum total size. If NOTHING exists in 2c, omit the section entirely.

### 2d. Print report

Exact format (omit any empty section):

```
📋 Plans (N files)
  YYYY-MM-DD  <slug>                              <last-modified>
  ...

📋 Specs (N files)
  YYYY-MM-DD  <slug>                              <last-modified>
  ...

🧹 Build artifacts
  .next/                     X MB
  tsconfig.tsbuildinfo       X KB
  test-results/              X KB
  .DS_Store × N              X KB
  ─────────────────────────────────
  total                      X MB

💬 Reply with one of:
  - "archive through YYYY-MM-DD"   archive all plans+specs dated ≤ that
  - "archive: <id1>, <id2>, ..."   archive specific ones (slug or date)
  - "archive all"                  archive every plan+spec
  - "skip archive"                 only clean build artifacts
  - "cancel"                       do nothing
```

Sort plans/specs ascending by filename date prefix. Pad slug column to align "last-modified". If both plans and specs are empty AND no artifacts exist, skip to Step 5d and print "nothing to tidy — exiting".

Wait for user reply before proceeding.
````

- [ ] **Step 2: Verify section**

Run:
```bash
grep "Step 2 — Scan" ~/.claude/skills/tidy/SKILL.md
```
Expected: prints the heading once.

---

## Task 4: Write Step 3 (interpret user reply)

**Files:**
- Modify: `~/.claude/skills/tidy/SKILL.md`

- [ ] **Step 1: Append Step 3 section**

Append to the end of SKILL.md:

````markdown

## Step 3 — Interpret user reply

Parse reply into two lists: `PLANS_TO_ARCHIVE` and `SPECS_TO_ARCHIVE` (both are basenames).

### Pairing rule

For every plan basename `YYYY-MM-DD-<slug>.md` in `PLANS_TO_ARCHIVE`, also add to `SPECS_TO_ARCHIVE` any spec whose basename starts with `YYYY-MM-DD-<slug>` (catches `-design.md`, `-audit.md`, etc.).

Reverse: if the user selects a spec but its plan is not yet selected, add the plan too.

### Reply formats

| Reply | Meaning |
|---|---|
| `archive through YYYY-MM-DD` | every plan/spec whose filename date prefix ≤ the given date |
| `archive: campaign-flow, sidebar-redesign` | plans/specs matching those slugs |
| `archive: 2026-04-04, 2026-04-05` | plans/specs with those date prefixes |
| `archive all` | every plan in `plans/` + every spec in `specs/` |
| `skip archive` | empty lists (proceed only to build-artifact cleanup) |
| `cancel` | ABORT — exit immediately, no changes, no commit |

If the reply is ambiguous (unknown slug, mixed forms, typo), echo the parsed lists back and ask:

```
About to archive:
  plans: <N> files
    YYYY-MM-DD <slug>
    ...
  specs: <M> files
    YYYY-MM-DD <slug>
    ...
Clean: .next (X MB), tsconfig.tsbuildinfo (X KB), test-results/, K × .DS_Store
Proceed? (yes/no)
```

Proceed only on explicit `yes` / `y` / `да`. Any other reply → cancel.

If the user's reply is unambiguous (e.g. `archive through 2026-04-17`), you MAY skip the confirmation and proceed directly — but always print the list you're about to archive before moving files.
````

- [ ] **Step 2: Verify section**

Run:
```bash
grep "Step 3 — Interpret" ~/.claude/skills/tidy/SKILL.md
```
Expected: prints the heading.

---

## Task 5: Write Step 4 (execute) and Step 5 (commit)

**Files:**
- Modify: `~/.claude/skills/tidy/SKILL.md`

- [ ] **Step 1: Append Step 4 section**

Append to SKILL.md:

````markdown

## Step 4 — Execute

### 4a. Create archive directories

```bash
mkdir -p docs/superpowers/archive/plans
mkdir -p docs/superpowers/archive/specs
```

### 4b. Collision pre-check

For every basename in `PLANS_TO_ARCHIVE` + `SPECS_TO_ARCHIVE`, verify the destination does NOT exist:

```bash
[ -e docs/superpowers/archive/plans/<basename> ] && echo "COLLISION: <basename>"
```

If any collision reported, STOP with:

> Archive collision: `<path>` already exists. Aborting `/tidy`. Resolve manually (git log the existing file, decide whether to rename or keep) and re-run.

### 4c. Move files

For each plan basename in `PLANS_TO_ARCHIVE`:

```bash
git mv docs/superpowers/plans/<basename> docs/superpowers/archive/plans/<basename>
```

For each spec basename in `SPECS_TO_ARCHIVE`:

```bash
git mv docs/superpowers/specs/<basename> docs/superpowers/archive/specs/<basename>
```

Use `git mv` so git tracks the rename. If `git mv` fails (file not tracked), STOP and report.

### 4d. Delete build artifacts

Only delete what the scan (Step 2c) reported as present:

```bash
# Only run the lines for artifacts that existed in the scan
rm -rf .next
rm -f tsconfig.tsbuildinfo
rm -rf test-results
find . -name ".DS_Store" -not -path "./node_modules/*" -not -path "./.git/*" -delete
```

Do NOT run commands for artifacts that weren't in the scan — keeps the commit message honest.

### 4e. Append CHANGELOG entry

File: `docs/superpowers/archive/CHANGELOG.md`.

If the file does not exist, create it with header:

```markdown
# Cleanup Changelog

Log of `/tidy` runs.

---
```

Insert new entry immediately below the `---` separator (newest first):

```markdown
## YYYY-MM-DD

**Archived (N plans, M specs):**
- YYYY-MM-DD <slug>
- ...

**Build artifacts cleaned:** X MB (.next, tsconfig.tsbuildinfo, test-results, .DS_Store × K)

**Commit:** `<SHA>`

---
```

Rules:
- Use today's date (`date +%Y-%m-%d`).
- Omit the `Archived` block if no files were archived.
- Omit the `Build artifacts cleaned` line if nothing was deleted.
- `<SHA>` is a literal placeholder string — will be filled in Step 5c.

## Step 5 — Commit

### 5a. Stage all changes

```bash
git add -A docs/superpowers/
git add -A  # catches .DS_Store deletions outside docs/
```

### 5b. Create the commit

Compose commit message (omit empty sections):

```
chore(cleanup): archive N plans/specs + clean X MB build cache

Archived:
  plans/ YYYY-MM-DD <slug>
  ...
  specs/ YYYY-MM-DD <slug>
  ...

Cleaned:
  .next/ (X MB)
  tsconfig.tsbuildinfo (X KB)
  test-results/
  K × .DS_Store
```

Use HEREDOC (per repo conventions, never the -m shortcut for multi-line):

```bash
git commit -m "$(cat <<'EOF'
chore(cleanup): archive N plans/specs + clean X MB build cache

Archived:
  plans/ YYYY-MM-DD <slug>
  ...

Cleaned:
  .next/ (X MB)
  ...
EOF
)"
```

### 5c. Backfill SHA into CHANGELOG and amend

```bash
SHA=$(git rev-parse --short HEAD)
```

Edit `docs/superpowers/archive/CHANGELOG.md`: replace the literal string `` `<SHA>` `` (in the entry you just wrote) with `` `$SHA` ``. Only replace the first occurrence to avoid touching prior entries (but older entries should already have real SHAs, so there's only one placeholder).

Amend:

```bash
git add docs/superpowers/archive/CHANGELOG.md
git commit --amend --no-edit
```

Result: one commit containing archive moves + artifact deletions + CHANGELOG with its own SHA.

### 5d. Final report

Print:

```
✅ /tidy complete
  archived: N plans, M specs → docs/superpowers/archive/
  cleaned: X MB
  commit: <new-SHA>
```

Run `git rev-parse --short HEAD` after the amend to get the updated SHA.
````

- [ ] **Step 2: Verify sections present**

Run:
```bash
grep -c "^## Step" ~/.claude/skills/tidy/SKILL.md
```
Expected: `5` (Steps 1–5).

---

## Task 6: Write safety rules + idempotency appendix

**Files:**
- Modify: `~/.claude/skills/tidy/SKILL.md`

- [ ] **Step 1: Append safety section**

Append to SKILL.md:

````markdown

## Idempotency

Running `/tidy` twice in a row must be safe:
- Step 1 passes (tree is clean after commit).
- Step 2 reports only remaining active plans/specs and zero artifacts.
- If nothing to archive AND no artifacts, print "nothing to tidy — exiting" and exit without a commit.

## Safety rules (strict — no exceptions)

- Only `rm` / `rm -rf` the exact paths listed in Step 4d. Never other paths.
- Never touch `node_modules/`, `.worktrees/`, `.git/`, or anything above the project root.
- Never use `--force`, `--no-verify`, `git reset --hard`, `git clean -f`, or any flag that bypasses a guard.
- If ANY command errors, STOP immediately. Print the error, the step it came from, and what state the tree is in (`git status`). Do not try to recover or continue — ask the user.
- Never run if `cwd` is not a git repo. Check with `git rev-parse --is-inside-work-tree`.
- Never run outside a project root: the presence of `docs/superpowers/` is what makes this a valid `/tidy` target. If `docs/superpowers/plans/` and `docs/superpowers/specs/` both missing, print "no docs/superpowers/ structure here — /tidy is not applicable" and exit.

## When to refuse

If the user runs `/tidy` but the project doesn't use `docs/superpowers/plans` + `specs` layout, tell them and stop. This skill is not a generic cleaner.
````

- [ ] **Step 2: Final structural check**

Run:
```bash
grep "^## " ~/.claude/skills/tidy/SKILL.md
```
Expected output (exact order):
```
## Step 1 — Precondition: clean git tree
## Step 2 — Scan and report
## Step 3 — Interpret user reply
## Step 4 — Execute
## Step 5 — Commit
## Idempotency
## Safety rules (strict — no exceptions)
## When to refuse
```

- [ ] **Step 3: Line count sanity check**

Run:
```bash
wc -l ~/.claude/skills/tidy/SKILL.md
```
Expected: ~200–300 lines. If way more — review for duplication. If way less — a section is probably missing.

---

## Task 7: Smoke test `/tidy` on the Afina repo

**Files:**
- No file changes in this task — we run the skill and observe.

- [ ] **Step 1: Start from a clean tree**

```bash
cd /Users/macintosh/Documents/work/afina-ai-first
git status
```
Expected: `nothing to commit, working tree clean`. If not, stop and clean up before smoke test.

- [ ] **Step 2: Dirty-tree precondition test**

Create a throwaway uncommitted change:
```bash
echo "test" >> README.md
```

Invoke `/tidy`. Expected behavior:
- Skill runs Step 1.
- Prints "Working tree is dirty..." message.
- Does NOT proceed to Step 2.
- Does NOT modify any files.

Clean up:
```bash
git checkout README.md
git status
```
Expected: clean tree restored.

- [ ] **Step 3: Happy-path archive run**

Invoke `/tidy`. Expected behavior at each step:

- Step 1: passes (clean tree).
- Step 2: report shows
  - all plans in `docs/superpowers/plans/` (including this one while it still exists — note: only AFTER task 7 completes does the skill exist in the real sense; this task is the first real invocation)
  - all specs in `docs/superpowers/specs/`
  - if build artifacts exist, they're listed; if not (cleaned earlier this session), section is omitted
- Step 3: reply `archive through 2026-04-17`.
- Step 4: moves plans/specs with date prefix ≤ 2026-04-17 into `docs/superpowers/archive/`; deletes any remaining artifacts; writes CHANGELOG entry.
- Step 5: commits and amends SHA into CHANGELOG. Prints ✅ summary.

Verify:
```bash
ls docs/superpowers/archive/plans/
ls docs/superpowers/archive/specs/
cat docs/superpowers/archive/CHANGELOG.md
git log -1 --stat
git status
```
Expected:
- Archive folders populated.
- CHANGELOG has new entry at top with real SHA (no `<SHA>` placeholder).
- Commit message matches `chore(cleanup):` format.
- `git status` clean.

- [ ] **Step 4: Idempotency test — re-run on clean tree**

Invoke `/tidy` again immediately.

Expected:
- Step 1: passes.
- Step 2: reports only plans/specs dated > 2026-04-17 (the remaining active ones); no artifacts.
- Step 3: reply `cancel` — or skill auto-exits if nothing to archive AND no artifacts.

Verify:
```bash
git log -1 --oneline  # still the tidy commit from step 3, no new commit
git status            # clean
```
Expected: no new commit created by the idempotent run.

- [ ] **Step 5: Document issues found**

If any smoke-test step produced unexpected behavior, list the symptoms. Do NOT attempt to fix in this task — capture findings, move to Task 8.

- [ ] **Step 6: Commit status**

Nothing to commit in this task itself — the smoke test's happy-path run (Step 3) is what creates the commit on the Afina repo, and that's the skill doing its job, not us manually committing.

---

## Task 8: Fix issues found in smoke test (conditional)

**Files:**
- Modify: `~/.claude/skills/tidy/SKILL.md` (if needed)

- [ ] **Step 1: Review findings from Task 7 Step 5**

If Task 7 reported no issues, skip this entire task.

If issues were found, categorize:
- Instruction ambiguity (Claude misinterpreted a step) → tighten wording
- Missing guard (a case that broke something) → add to Safety rules
- Wrong output format (report didn't match template) → fix template in SKILL.md

- [ ] **Step 2: Edit SKILL.md to address each issue**

For each issue, make the minimal edit to SKILL.md that fixes it.

- [ ] **Step 3: Re-run the failing smoke-test scenario**

If the failure happened on the real Afina repo, the tree is already past the archive step. Create a scratch case instead:

```bash
# Restore deleted test state by reverting the tidy commit, if needed
git revert HEAD --no-edit
```

Re-invoke `/tidy` and verify the fix.

- [ ] **Step 4: If revert was used, clean up**

If you reverted the tidy commit to re-test, decide with user whether to:
(a) re-run `/tidy` for real and keep the new archive commit, or
(b) revert the revert (`git reset --hard <original-tidy-SHA>`) to restore the original successful archive.

Do NOT choose (b) autonomously — ask.

---

## Self-Review (done before handing the plan off)

### Spec coverage check

Walked every section of the design spec (`docs/superpowers/specs/2026-04-23-tidy-skill-design.md`):

- **Purpose / Non-goals** → no task; documented in plan header + enforced by Safety rules (Task 6).
- **Invocation (`/tidy`, global)** → Task 1.
- **Flow 5 steps** → Tasks 2–5 (one section each).
- **Archive layout (flat)** → Task 5 Step 4c (`git mv` into `archive/{plans,specs}/`).
- **Plan ↔ spec pairing** → Task 4 (pairing rule section).
- **Build artifacts list** → Task 3 (Step 2c) + Task 5 (Step 4d).
- **Report format** → Task 3 Step 2d (exact template).
- **CHANGELOG format** → Task 5 Step 4e.
- **Commit message format** → Task 5 Step 5b.
- **Safety rules** → Task 6.
- **Open question #1 (amend vs 2nd commit)** → resolved to amend in Task 5 Step 5c.
- **Open question #2 (AskUserQuestion vs plain text)** → resolved to plain text in Task 4 (reply formats described as plain text).
- **Success criteria** → verified in Task 7 (smoke test).

No gaps.

### Placeholder scan

No "TBD", "TODO", "similar to", or handwavy error handling. Every code block is complete. Every verification step has an expected-output line.

### Type consistency

Variable names used consistently: `PLANS_TO_ARCHIVE`, `SPECS_TO_ARCHIVE`, `<basename>`, `<slug>`, `<SHA>`. No drift.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-23-tidy-skill.md`. Two execution options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
