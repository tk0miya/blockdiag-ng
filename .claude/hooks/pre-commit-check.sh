#!/bin/bash

# Hook input is JSON from stdin
input=$(cat)
tool_name=$(echo "$input" | jq -r '.tool_name')
command=$(echo "$input" | jq -r '.tool_input.command // ""')

# Only run for git commit commands (also matches `git -C <path> commit`, used
# when working in a worktree).
commit_re='git[[:space:]]+(-C[[:space:]]+[^[:space:]]+[[:space:]]+)?(commit|cherry-pick|merge|rebase)'
if [[ "$tool_name" != "Bash" ]] || [[ ! "$command" =~ $commit_re ]]; then
    exit 0
fi

work_dir="$CLAUDE_PROJECT_DIR"
if [[ "$command" =~ git[[:space:]]+-C[[:space:]]+([^[:space:]]+) ]]; then
    work_dir="${BASH_REMATCH[1]}"
fi

cd "$work_dir" || exit 1

echo "Running pre-commit checks..." >&2

if ! npm run ci >&2; then
    echo "Error: npm run ci failed" >&2
    exit 2
fi

echo "All checks passed!" >&2
exit 0
