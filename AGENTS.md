<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Parallel work: always use a git worktree

If another agent may be working on this project at the same time, you MUST work in your own worktree on your own branch. Never share the main checkout with another running agent — concurrent commits to the same working tree corrupt the index and silently mix unrelated changes into one commit.

Before touching any code:

1. From the repo root, create a worktree off `main`:
   ```bash
   git worktree add .worktrees/<task-name> -b feature/<task-name> main
   cd .worktrees/<task-name>
   npm install
   ```
2. Do all work, commits, and dev-server runs inside that directory.
3. Never push to `main` directly — leave the merge to the user (or open a PR).

Notes:
- `.worktrees/` is already in `.gitignore`. Do not commit its contents.
- Only one worktree at a time can hold `next dev` on port 3000. If your worktree is not the one being viewed, run tests/lint instead of starting the dev server, or pass `-p 3001`.
- When your task is done, report the worktree path and branch name back to the user — cleanup (`git worktree remove`, branch delete) is the user's call.

Skip the worktree only if the user explicitly says "work in the main checkout" or you can confirm no other agent is active.
