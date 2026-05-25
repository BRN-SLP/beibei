# Mercato — Repo Rules

> **READ THIS FIRST.** Non-negotiable conventions. The contributor (BRN-SLP) has stated these preferences repeatedly across sessions. Honour them automatically; do not require reminders.

## Atomic Commits — MANDATORY

**Each commit captures ONE logical decision.**

The contributor explicitly prefers many small atomic commits over few large ones. Bundling unrelated changes into one commit violates this preference even when changes seem "related" (same file, same section, same feature pass).

### Definition of "one logical change"

- ONE design decision (`change column alignment`)
- ONE bug fix (`fix overflow when stat exceeds 3 digits`)
- ONE refactor (`extract Stat component`)
- ONE renaming (across as many files as needed — same decision)
- ONE feature toggle, ONE prop addition, ONE token rename

### Things that LOOK like one change but are MANY

- Bullet "fix hero layout" with 4 sub-changes (items-start + proportions + gap + chrome removal) → **4 commits**
- "Move stats out and drop UserBalance" → **2 commits**
- "Re-center column and resize h1" → **2 commits**
- "Drop card chrome and lock height" → **2 commits**

If your draft commit message contains the word "and", "+", or two distinct verbs, split.

### Multiple files in one commit — OK when

- Rename touches callers (same decision, many files)
- Extract component creates new file + updates importers (same decision)
- Add translation key updates 6 locale JSON files (same decision)

### One commit per file pattern is ALSO wrong

Don't artificially split one logical change across N commits just to inflate count. Renaming a function across 12 files is ONE commit, not 12.

## Commit Message Format

```
<type>(<scope>): <imperative one-line subject under 70 chars>

<optional body — explain WHY, not WHAT>
```

Types: `feat`, `fix`, `refactor`, `chore`, `docs`, `style`, `perf`, `test`, `i18n`, `ci`, `build`

- **NO em-dashes** (`—` or `--`) anywhere — in code, i18n strings, OR commit messages. Use `·`, `,`, `:`, `;`, `.`, parentheses.
- Subject in imperative mood (`add`, `fix`, `refactor`), not past tense
- Body wraps at 72 cols

## Git Author

`BRN-SLP <v.khylynskyi@gmail.com>` — verified via hook. Do NOT attempt to set Claude, Anthropic, or NoReply as author.

## Forbidden strings in tracked files

The contributor uses external program tracking that requires certain identifiers NOT appear anywhere in this repo (code, comments, i18n, README, CHANGELOG, commit messages). Specific list documented in contributor's private context. If you're unsure whether a string is safe to commit, ASK first.

When discussing the project externally use only: "Mercato", "Celo", "cost-of-living index", "community-built". Never reference any specific platform or program by name.

## Build verify before commit

```bash
pnpm --filter web build
```

Must exit green before you commit. If it fails, fix the issue and re-stage. Do NOT `--no-verify` to bypass.

## Git Workflow, PR only, NEVER push to main

**Direct push to `main` is FORBIDDEN.** Every logical change ships through a pull request.

### Why this rule exists

1. **Production safety.** Vercel auto-deploys every commit on `main` straight to `mercato-rho.vercel.app`. Pushing to `main` without a preview build means regressions land in prod before anyone sees them. We learned this the expensive way: a `useSearchParams` regression survived 1-2 days on prod because nobody ran the local build in time.
2. **External contribution tracking.** The contributor relies on an external program that counts pull requests as a first-class contribution signal alongside commits. Direct push to `main` produces commits but no PR record, so the work scores lower than it should.

### Workflow

```bash
# 1. Start a feature branch off latest main
git checkout main && git pull
git checkout -b pass-X/short-slug

# 2. Make atomic commits (same rules as before)
# ...edit, build verify, commit, repeat...

# 3. Push branch and open PR
git push -u origin pass-X/short-slug
gh pr create --title "..." --body "..." --base main

# 4. Wait for the Vercel preview deployment URL to appear
#    on the PR. Check it visually before merging. If the
#    preview build fails, fix in the same branch, do not bypass.

# 5. Merge preserving atomic history, do NOT squash
gh pr merge --merge --delete-branch
```

### Merge strategy

Use `--merge` (regular merge commit), NEVER `--squash`. Squash collapses the atomic per-decision history that the contributor explicitly values into a single fat commit.

### Branch naming

`<pass-letter>/<short-slug>` (e.g. `pass-I/legal-pages`, `pass-J/landing-spine`) or `feat/<slug>`, `fix/<slug>`, `i18n/<slug>` for non-pass work. Lowercase, dashes, under 40 chars.

### Exceptions

There are none for code. The only direct-push exception is fixing a typo in a non-code root file (e.g. this CLAUDE.md itself, or hot wiki references) when no code or i18n string is touched. Even then, prefer a PR.

## Code Style

### Country flags
`CountryMark` component is canonical. Selective imports from `country-flag-icons/react/3x2` (never wildcard — broke build at 8min once). Desat: `grayscale(0.40) contrast(1.05) brightness(0.97)`.

### Palette
Cream surface + deep-green primary (OKLCH). Tokens in `apps/web/src/app/globals.css`. Don't introduce new colors without checking existing tokens.

### Type strictness
- Avoid `any`. Use `unknown` + narrow at boundaries.
- bigint at chain edge, `number` (cents) in app domain (see `lib/chain-boundary.ts`).

### Anti-patterns (absolute bans)

- No card grids with identical cards
- No gradient text (`background-clip: text`)
- No glassmorphism by default
- No side-stripe borders > 1px as decorative accent
- No hero-metric SaaS template
- No modal as first thought

## Session Start

Before any code change in this repo, read:
1. `~/knowledge/mercato/wiki/hot.md` — current session state, what shipped, what's next
2. This `CLAUDE.md` — these rules

If `hot.md` is missing or stale, ASK before proceeding.
