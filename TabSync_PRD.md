# TabSync — Product Requirements Document

| | |
|---|---|
| **Domain** | Frontend development |
| **Task** | Task 1 — Multi-Tab Settings Synchronization (GDG Tech Wildcard entry) |
| **Status** | Specification of record. §8 lists what is already implemented and verified; every other capability is a plan, not a claim. |
| **Language** | TypeScript, `strict` |
| **Stack** | Next.js 16.4 (App Router, static export) · Tailwind CSS v4 · shadcn/ui (preset `b0`) · Vitest 5 + fast-check 4 · Playwright 1.64 · Bun |
| **Deployment** | Static export, any host, one origin for all demo tabs |
| **Submission** | Public repository · README · this document · latency report · deployment link · demo recording |

**Reading order for a reviewer:** §1–§7 (what and why) → §8 (what already runs) → §10–§16 (the protocol, in detail) → §19 (how it is proven) → §24 (acceptance) → Appendix A (the quality bar).

---

## 1. Summary

TabSync is a settings application whose preferences are identical in every open tab of the same origin. A change made anywhere appears everywhere without a reload, survives closing every tab, initializes without ever painting the wrong theme, and converges deterministically when two tabs edit the same field at the same instant.

Three preferences are in scope: **theme** (light/dark), **language** (English, Hindi, Tamil), **font size** (14–24 px).

The engineering claim of this project is narrow and testable: **settings are a small replicated state machine**, not a `localStorage` write. Every design decision below serves that claim, and every claim in the write-up is backed by a command in §19.

## 2. Problem statement

A `localStorage.setItem("theme", value)` plus a `storage` listener is the canonical "solution" to this task, and it fails four ways:

1. **Lost updates.** A single JSON blob read-modify-written by two tabs is not atomic. Tab A writes theme, tab B writes font size from a snapshot taken before A's write, and A's change disappears.
2. **Non-deterministic conflicts.** Two tabs writing the same field simultaneously resolve by whatever arrives last, which differs per tab. The tabs end up disagreeing.
3. **No durability guarantee under races.** A tab that writes and is immediately closed can lose its write entirely if persistence is deferred to unload handlers.
4. **Wrong first paint.** Reading stored preferences inside an effect paints the default theme for one or more frames, which is exactly what a user notices.

TabSync treats these as protocol problems with published answers — per-field last-writer-wins registers ordered by a hybrid logical clock, actor-owned durable records, and a synchronous pre-paint bootstrap — and proves each with tests rather than describing it.

## 3. Goals, non-goals, success metrics

### 3.1 Goals

| # | Goal |
|---|---|
| G-1 | Any preference change reaches every open tab without a reload, targeting ≤ 100 ms foreground commit-to-commit. |
| G-2 | Simultaneous edits — same field or different fields — resolve to a **deterministic, identical** state in every tab. |
| G-3 | Preferences survive closing every tab, and a session reopened from disk shows saved values on the **first painted frame**. |
| G-4 | Behaviour degrades honestly: with a transport or storage API unavailable, the UI stays usable and says what is impaired. |
| G-5 | The synchronization protocol is framework-free, typed, and unit-testable without a browser, so it can be reasoned about and reviewed on its own. |

### 3.2 Non-goals

Server sync, accounts, cross-device consistency, cross-origin or cross-profile syncing, syncing between normal and private windows or between storage partitions, arbitrary user-defined settings, mobile apps, backends, and a hard real-time guarantee for suspended or backgrounded tabs. Each is out of scope by decision, not by omission (§26, Appendix B).

### 3.3 Success metrics

| Metric | Target | Measured by |
|---|---|---|
| Sync latency, foreground, 2–3 tabs | p95 ≤ 100 ms | §18 benchmark, `docs/latency-report.md` |
| Convergence after forced simultaneous same-field edits | 100% agreement across tabs, all runs | E2E-05/06 |
| Persistence after closing the entire browser | restored on next launch | E2E-08 |
| Wrong-theme first frame | zero occurrences | E2E-07 (first-frame instrumentation) |
| Unit + property test suite | 100% green, no skipped tests | `bun run test` |
| Cold-start bootstrap | ≤ 50 ms of synchronous work before first paint | instrumented in E2E-07 |

## 4. Official requirements and traceability

The task brief's requirements override any choice in this document. IDs are stable and referenced from tests, code comments, and the demo script.

| ID | Requirement (from the brief) | Implementation | Proving artifact |
|---|---|---|---|
| FR-01 | Dark-mode toggle | `components/settings-controls.tsx`, `Switch` | E2E-01, demo beat 1 |
| FR-02 | Language selector with multiple languages | `lib/i18n/dictionaries.ts`, `Select` | E2E-02, demo beat 3 |
| FR-03 | Font-size slider | `Slider` bound to 14–24 px | E2E-03 |
| FR-04 | All open tabs synchronize without refresh, ≤ 100 ms target | `lib/tabsync/transport.ts`, `store.ts` | E2E-04, B-01…B-04 |
| FR-05 | Preferences persist after every tab is closed | `lib/tabsync/storage.ts` | E2E-08, E2E-15 |
| FR-06 | Newly opened tabs load the latest preferences without briefly showing the wrong theme | `app/head-bootstrap.tsx` | E2E-07 (first frame) |
| FR-07 | Simultaneous edits resolve deterministically and converge | `lib/tabsync/version.ts`, `merge.ts` | U-*, P-*, E2E-05, E2E-06 |
| FR-08 | Repository, README, run instructions, technical explanation | `README.md`, this document | §25 rehearsal |

### 4.1 Grading weights and where effort goes

| Criterion | Weight | Primary artifacts | Deliberately not spent on |
|---|---:|---|---|
| Cross-tab synchronization and latency | 30% | transport, store, benchmark harness | decorative animation |
| Conflict resolution and consistency | 25% | clock, merge, property tests, concurrency tests | extra settings |
| Persistence and initialization | 20% | durable record rules, bootstrap script, reopen tests | storage compaction |
| Code quality and architecture | 15% | module boundaries, typed protocol, lint gates | abstractions without a second use case |
| UI/UX and responsiveness | 10% | §15–§16 contract, shadcn components, accessibility | bespoke visuals |

**Tie-break rule:** when two requirements compete for an hour, the higher row wins. This single sentence resolves most scope questions in a two-day build.

### 4.2 Identifier scheme

| Prefix | Meaning |
|---|---|
| `FR-xx` | functional requirement from the brief |
| `NFR-xx` | non-functional requirement (§21) |
| `U-xx` / `P-xx` | unit test / property test cases (§19.1) |
| `E2E-xx` | browser test cases (§19.2) |
| `B-xx` | benchmark scenarios (§19.3) |
| `AC-xx` | acceptance criteria (§24) |

## 5. Users and scenarios

**Reviewer / grader** — the primary user. Needs to open three tabs, change something, see everything agree, close the browser, reopen, and be able to *inspect* why it agreed (versions, winners, transport in use).

**End user** — changes theme while a second tab is open on another monitor; expects both to look the same instantly. Switches language and expects the interface to actually change.

Acceptance narratives:

| # | Scenario | Observable outcome |
|---|---|---|
| S-1 | Change theme in tab A | Tab B repaints to the new theme, no reload |
| S-2 | Change language in tab B | Tab A's labels are translated; `<html lang>` updates |
| S-3 | Drag the font slider in tab A | Tab B's preview text resizes immediately; the final dragged value equals the final value in both tabs |
| S-4 | Tab A changes theme while tab B changes font size | Both changes survive |
| S-5 | Both tabs change theme at the same instant | Every tab shows the same winner, and the same winner is durable |
| S-6 | Close all tabs, reopen | Saved values appear on the first frame; nothing flashes |
| S-7 | Open a tab while another is mid-edit | New tab shows the current values, then follows subsequent updates |
| S-8 | Storage disabled by the browser | Controls still work, banner explains that nothing is being saved |
| S-9 | A tab is suspended, then resumed | It rejoins without reverting anyone's newer values |

## 6. Scope

### 6.1 In scope (MVP)

Three typed preferences · immediate local updates · `BroadcastChannel` primary transport with `storage`-event fallback · lock-free durable per-field per-actor records · hybrid logical clock ordering · deterministic per-field conflict resolution · synchronous pre-paint bootstrap · schema validation and storage-failure handling · unit, property and multi-tab browser tests · latency benchmark with published numbers · debug panel exposing state, versions and the event log · technical write-up.

### 6.2 Stretch (only after §24 is fully green)

Presence (peer count via `PING`, no persistence) · export/copy state JSON · `Code Block` + `Trace` debug renderers · one additional locale · slider-burst histogram in the debug panel.

### 6.3 Out of scope

Everything in §3.2, plus: undo/redo, settings profiles, import/export files, URL-encoded settings, storage compaction, service workers, Web Locks, and any network dependency for core behaviour.

## 7. Settings specification

| Field | Type | Default | Domain | Control | Behaviour |
|---|---|---|---|---|---|
| `theme` | union | `light` | `light` \| `dark` | `Switch` | Sets the `dark` class on `<html>` and `color-scheme`; no system mode (deterministic by design) |
| `language` | union | `en` | `en` \| `hi` \| `ta` | `Select` | Translates all interface copy and updates `<html lang>` |
| `fontSize` | integer | `16` | 14–24 px, step 1 | `Slider` | Sets `--tabsync-font-size`; consumed by the preview panel only |

### 7.1 Rules and edge cases

- **Font size scoping.** The setting affects the preview panel, not the application chrome. Applying it to `<html>` would rescale the entire UI and cause layout shift mid-drag, which is not what a "font size" setting means on a settings screen. The CSS custom property is published on `<html>` by the bootstrap (so there is no flash) but only the preview consumes it.
- **Slider write policy.** During a drag, the local UI updates on every `input` event; the *broadcast* is coalesced to one update per animation frame; the final value is always broadcast on `change`. This keeps a 60-update drag from flooding the channel while guaranteeing that the value the user let go of is the value everyone converges to (B-04).
- **Reset to defaults.** Implemented as an ordinary versioned edit carrying default *values* with a fresh high version — never as key deletion — so a tab holding pre-reset values cannot resurrect them (E2E-13).
- **Unknown or invalid values** never reach the UI: they are rejected at the boundary (§10.7) and counted in diagnostics.
- **Text direction** is LTR for all three locales; no RTL layout work is required. The `rtl` flag in `components.json` stays `false`.
- **Number formatting** for the px readout uses `Intl.NumberFormat(locale)`.

## 8. Toolchain and verified state

### 8.1 Verified in this repository

Every row below was executed and produced this result; run them yourself to reproduce.

| Command | Result |
|---|---|
| `bun run test` | 38 tests pass (4 files): clock ordering, skew, overflow, merge laws, validation, storage write rules |
| `bun run typecheck` | clean under `strict` |
| `bun run lint` | clean, including the enforced "protocol imports no React/Next" rule |
| `bun run build` | compiled; `/` and `/_not-found` prerendered; static export written to `out/` |
| `bun run preview` | serves `out/` on `0.0.0.0:4173`; `HTTP 200`, `<title>TabSync</title>` |
| `bunx --bun shadcn@latest info` | framework `Next.js (next-app)` 16.4.0, RSC yes, TS yes, Tailwind v4, CSS `app/globals.css`, alias `@` |
| `bunx --bun shadcn@latest preset decode b0` | style `nova`, base `base`, baseColor `neutral`, theme `neutral`, icons `lucide`, font `inter`, radius `default` |

Pinned versions: `next@16.4.0`, `react@19.3.0`, `@base-ui/react@1.9.0`, `tailwindcss@4`, `vitest@5.0.5`, `fast-check@4.10.2`, `@playwright/test@1.64.1`, `eslint@9`, `prettier@3.9`.

### 8.2 Implemented modules

```
lib/tabsync/types.ts        registers, field domains, defaults, reserved actor
lib/tabsync/version.ts      total order + hybrid logical clock
lib/tabsync/merge.ts        field-wise max, fold, merge outcomes
lib/tabsync/validation.ts   hand-written guards for stored and transmitted records
lib/tabsync/storage.ts      actor-owned durable records: load, write rules, diagnostics
tests/unit/*.test.ts        38 tests (unit + fast-check properties)
```

### 8.3 To be implemented

`transport.ts`, `store.ts`, `hooks/use-settings.ts`, `app/head-bootstrap.tsx`, `lib/i18n/`, `components/settings-controls.tsx`, `preview-panel.tsx`, `status-line.tsx`, `debug-panel.tsx`, `tests/e2e/`, `tests/benchmark/`, `docs/latency-report.md`. Order and checkpoints: §22.

### 8.4 Environment facts that cost time if rediscovered

- **Use Bun.** npm 10.8.2 on Node 20 aborts with `Cannot read properties of null (reading 'edgesOut')` (an arborist peer-set bug) on this dependency graph.
- **`shadcn` is a runtime dependency**, not a dev tool: `app/globals.css` imports `shadcn/tailwind.css`, which resolves to `node_modules/shadcn/dist/tailwind.css`. It must stay in `dependencies`.
- **Components are Base UI, not Radix.** Composition uses the `render` prop; there is no `asChild`. Read the installed component before writing a trigger.
- **The `skills` CLI (`npx skills add …`) requires Node ≥ 22.20.** Run it on a compatible machine; its rules still apply here — run `shadcn info` before adding components, and never hand-decode or hand-build a preset code.
- **`next/font/google` fetches at build time** and self-hosts the result, so there is no runtime font request. On a networkless CI, switch to `next/font/local` with the woff2 files committed.
- **Dev-server origins:** `allowedDevOrigins` in `next.config.ts` lists the proxied preview hosts; the dev server rejects unknown origins by default.

### 8.5 Agent skills: what to install, when to invoke it, what to refuse

**Agent skills** are plain-markdown instruction packs (`SKILL.md`) that a coding agent reads for domain expertise. They are **not** dependencies: nothing from the registry enters `package.json`, and a skill adds no runtime, no bundle weight and no install-time risk. They are installed per project into the agent's skills directory (`.claude/skills/` for Claude Code, with equivalents for Codex, Cursor and others), and they are read by the agent, not executed.

```bash
npx skills add <owner/repo> --skill <skill>            # asks which agent
npx skills add <owner/repo> --skill <skill> --agent claude-code   # targets one agent
npx skills find <query>                                 # resolve an exact skill name
bash scripts/install-skills.sh                          # this project's adopted set, in one command
```

The CLI requires **Node ≥ 22.20** (it aborts on the Node 20 runtime used in the build sandbox, so `scripts/install-skills.sh` is provided but was not executed here — run it on a supported machine). Skill names and install paths change; `npx skills find <query>` resolves the current name. The public leaderboard is <https://skills.sh>.

#### Inventory

| Skill | Install | What it changes in this build | Verdict |
|---|---|---|---|
| `shadcn` (shadcn-ui/ui) | `npx skills add https://github.com/shadcn-ui/ui --skill shadcn` | Project-aware component workflow: read project context first, search registries, compose with correct primitives, never hand-decode a preset code | **Adopt** — the workflow §8.1 is built on |
| `migrate-radix-to-base` (shadcn-ui/ui) | `… --skill migrate-radix-to-base` | Radix → Base UI translation: `asChild` → `render`, plus Select/Slider/ToggleGroup differences | **Adopt** — preset `b0` ships Base UI, while every training-data default is Radix (§8.4) |
| `vercel-react-best-practices` (vercel-labs/agent-skills) | `npx skills add vercel-labs/agent-skills --skill react-best-practices` | 57 React/Next rules ordered by impact: request waterfalls, client bundle size, server/client boundaries, re-render avoidance | **Adopt** — during H2–H8, then once more before submission |
| `web-design-guidelines` (vercel-labs/agent-skills) | `… --skill web-design-guidelines` | 100+ accessibility and UX audit rules | **Adopt** — the audit pass in H15–H17 |
| `frontend-design` (anthropics/skills) | `npx skills add anthropics/skills --skill frontend-design` | Pushes output away from generic defaults — unchosen typefaces, gradients, three identical cards | **Adopt (one of two)** — pairs with §16; §16 wins any disagreement |
| `design-taste-frontend` (leonxlnx/taste-skill) | `npx skills add leonxlnx/taste-skill --skill design-taste-frontend` | Alternative taste skill; overlaps `frontend-design` | **Adopt at most one** — stacking two taste skills produces the average of both, which is the failure mode Appendix A exists to prevent |
| `ui-ux-pro-max` (nextlevelbuilder/ui-ux-pro-max-skill) | `npx skills add https://github.com/nextlevelbuilder/ui-ux-pro-max-skill --skill ui-ux-pro-max` | Design-intelligence database plus an audit pass: contrast ratios, focus states, ARIA, touch targets, spacing | **Adopt with guardrail** — its catalog recommends styles this project forbids (gradients, glassmorphism, animation presets). Use it for **audits** and for §16.7, never for aesthetics |
| `webapp-testing` (anthropics/skills) | `npx skills add anthropics/skills --skill webapp-testing` | Drives the app in a real browser via Playwright to verify behaviour | **Adopt** — same loop as §19.2, H8–H13 |
| `tdd` (mattpocock/skills) | `npx skills add mattpocock/skills --skill tdd` | Enforces failing-test-first sequencing | **Adopt** — the protocol modules and every rule in §10 |
| `code-review` (mattpocock/skills) | `… --skill code-review` | Structured review pass over a diff | **Adopt** — H17–H19, with Appendix A as the checklist |
| `systematic-debugging` (obra/superpowers) | `npx skills add obra/superpowers --skill systematic-debugging` | Isolate-then-fix discipline instead of speculative edits | **Adopt** — triggered by the 45-minute rule in §22.4 |
| `verification-before-completion` (obra/superpowers) | `… --skill verification-before-completion` | Refuses to declare anything done without running the check | **Adopt** — the same rule as §22.4, mechanically enforced |
| `improve-codebase-architecture` (mattpocock/skills) | `… --skill improve-codebase-architecture` | Structural second opinion: duplication, boundaries, dead code | **Adopt with care** — §9.1 and §20.2 already decide these; treat its output as a proposal, not a mandate |
| `review-animations` (emilkowalski/skills) | `npx skills add emilkowalski/skills --skill review-animations` | Reviews motion for jank, interruption and reduced-motion compliance | **Adopt (small scope)** — audits the 120 ms budget in §16.4 |
| `find-skills` (vercel-labs/skills) | `npx skills add vercel-labs/skills --skill find-skills` | Discovery meta-skill: finds and installs the right skill from inside the conversation | **Optional** — `npx skills find <query>` does the same job without a permanent install |
| `clerk-nextjs-patterns` (clerk/skills) | `npx skills add clerk/skills --skill clerk-nextjs-patterns` | Authentication: middleware, Server Actions, user-scoped caching, protected routes | **Not applicable** — TabSync has no accounts, no server and no protected route (§3.2). Installing it would import a solution for a problem this project does not have |
| `gsap-react` (greensock/gsap-skills) | `npx skills add greensock/gsap-skills --skill gsap-react` | GSAP in React: `useGSAP`, scoped selectors, cleanup, SSR safety | **Not applicable** — §16.4 caps motion at 120 ms CSS transitions and §20.4 carries no animation dependency. If motion scope ever expands, this is the skill to install, and `gsap` + `@gsap/react` must pass the dependency ledger first |

#### Rules of engagement

1. **A skill is instruction, not a dependency.** `package.json` is unchanged by anything in the table above; §20.4 stays the single ledger. If a skill *proposes* a package, that package must still pass §20.4 on its own merits.
2. **The project contract outranks the skill.** §10 (protocol) and §16 (design) are decisions with reasons; a skill is a second opinion with evidence. When they disagree, the contract wins and the disagreement is worth a comment in the diff.
3. **Read `SKILL.md` before installing.** It is markdown and takes 30 seconds. Skills are unvetted third-party content; installing one blind is the same failure as accepting a generated dependency without checking it exists.
4. **One skill per domain.** One taste skill, one testing loop, one review pass. Overlapping skills average each other out — the mechanism Appendix A describes.
5. **Keep the repository clean.** `.claude/skills/`, `.agents/`, `.cursor/` and `.codex/` are gitignored; `scripts/install-skills.sh` reproduces the adopted set, so the submission ships instructions instead of vendored tool folders.
6. **A test beats a skill.** Where a skill's advice and a failing test disagree, the test is the evidence.

#### Invocation map

| Phase (§22) | Skills to have loaded |
|---|---|
| H0–H5 (protocol, persistence, bootstrap) | `tdd`, `verification-before-completion`, `shadcn`, `migrate-radix-to-base` |
| H2–H8 (UI, i18n, debug panel) | `vercel-react-best-practices`, `frontend-design` (one taste skill), `ui-ux-pro-max` for audits |
| H8–H15 (e2e, concurrency, degraded, benchmark) | `webapp-testing`, `systematic-debugging` |
| H15–H19 (audit, docs, review) | `web-design-guidelines`, `review-animations`, `code-review`, `improve-codebase-architecture` |

## 9. Architecture

```
index.html  <head>
  └── inline bootstrap  (synchronous, before first paint, before React exists)
        ├── reads durable registers from localStorage
        ├── validates each record (same rules as the runtime)
        ├── folds to one winner per field (same comparator as the runtime)
        └── applies class="dark" / color-scheme / lang / --tabsync-font-size
            and publishes window.__tabsync.bootstrap for the store to adopt

lib/tabsync/**          framework-free protocol (lint-enforced: no React, no Next, no components)
  types.ts     version.ts     merge.ts     validation.ts     storage.ts
  transport.ts store.ts
        ▲
hooks/use-settings.ts   useSyncExternalStore bridge
        ▲
components/**           presentation only; they read snapshots and call store methods
```

### 9.1 Dependency rule

`components → hooks → store → {transport, storage} → {merge, validation, version, types}`. Imports never point backwards. React never owns synchronization state; it renders a snapshot from the store and re-renders on notification. This is enforced by `no-restricted-imports` on `lib/tabsync/**`, so the boundary survives future edits instead of relying on discipline.

### 9.2 Contracts

```ts
// lib/tabsync/store.ts
export interface SyncStatus {
  transport: "broadcast" | "storage" | "none"
  persistence: "ok" | "degraded"
  peers: number
  lastError: string | null
}

export interface SyncEvent {
  at: number              // performance.timeOrigin + performance.now()
  kind: "local" | "remote" | "merge" | "rejected" | "lifecycle"
  field?: FieldName
  version?: Version
  detail?: string
}

export interface SettingsStore {
  getState(): SettingsState
  subscribe(listener: () => void): () => void
  setField<F extends FieldName>(field: F, value: FieldValueMap[F]): void
  resetDefaults(): void
  getStatus(): SyncStatus
  getLog(): readonly SyncEvent[]      // bounded ring, 200 entries
  dispose(): void
}

export interface StoreDeps {
  clock: Clock
  storage: StorageLike                // injected: tests need no jsdom
  actorId: string                     // crypto.randomUUID(), one per page instance
  transport?: Transport               // injected: tests can force the fallback
  now?: () => number
  testMode?: TestHooks                // only constructed when NEXT_PUBLIC_TABSYNC_TEST=1
}
```

Dependencies arrive as arguments. That is why the unit suite runs on `environment: "node"` with no DOM emulator and no mocks.

### 9.3 Why framework-free

Three reasons, in order: the protocol is what is being graded, so it should be readable without React; `jsdom` has no `BroadcastChannel` and cannot represent multiple tabs, so browser-dependent logic cannot be honestly unit-tested anyway; and a store that survives component remounts is a requirement (E2E-12), which is easiest to guarantee when it is a module singleton rather than component state.

## 10. Protocol

### 10.1 Data model

```ts
type FieldName = "theme" | "language" | "fontSize"

interface Version { wallMs: number; counter: number; actorId: string }

interface Register<F extends FieldName> {
  field: F
  value: FieldValueMap[F]
  version: Version
}

interface SettingsState {           // exactly one register per field
  theme: Register<"theme">; language: Register<"language">; fontSize: Register<"fontSize">
}

const DEFAULT_STATE: SettingsState  // light / en / 16, all carrying (0, 0, "default")
```

Per-field registers are the central choice. A single versioned blob would let a race on `theme` discard a concurrent `fontSize` change; per-field versions make unrelated edits independent by construction.

### 10.2 Actors

- Each **page instance** generates `crypto.randomUUID()` at startup. Never derived from `sessionStorage`, because a duplicated tab inherits `sessionStorage` and two tabs sharing an actor id could write the same durable key and lose an edit.
- The reserved actor id **`default`** is carried only by `DEFAULT_STATE` and is the origin of the version order. Stored or transmitted records claiming `default` are rejected (§10.7): a page that could write under it could fabricate a version no real edit can outrank.
- Charset is restricted to `[A-Za-z0-9_-]{1,64}` because the actor id is embedded in storage keys.

### 10.3 Total order over versions

`(wallMs, counter, actorId)`, compared lexicographically — first the physical component, then the logical counter, then the actor id as the final tie-break. This is a total order for every pair of compliant writers, which is what makes convergence provable rather than probable. Ties can only occur between versions produced by the same page instance.

Documented honestly: this is **logical order**. It usually agrees with wall-clock recency because the counter rides on wall time, but the guarantee is determinism, not "the last human action always wins".

### 10.4 Hybrid logical clock

A pure Lamport counter gives determinism but can rank a genuinely older edit above a newer one, which looks like a bug in a demo. A hybrid logical clock keeps the deterministic order and stays close to wall time (48-bit physical component plus a 16-bit logical counter in the canonical packing).

```
tick(actorId):                                  # local edit
  physical = floor(now())
  if physical > wallMs: wallMs = physical; counter = 0
  else:                 counter += 1
  if counter > 0xffff:  wallMs += 1; counter = 0         # overflow promotion
  return { wallMs, counter, actorId }

observe(remote):                                # receive
  physical = floor(now())
  maxWall = max(physical, wallMs, remote.wallMs)
  if maxWall == wallMs and maxWall == remote.wallMs: counter = max(counter, remote.counter) + 1
  else if maxWall == wallMs:                         counter += 1
  else if maxWall == remote.wallMs:                  counter  = remote.counter + 1
  else:                                              counter  = 0
  wallMs = maxWall
  if counter > 0xffff: wallMs += 1; counter = 0

seedFromPersisted(state):                       # page startup, once per field
  observe(state[field].version)
```

The rules that matter in practice:

- **Monotonic.** Two local ticks inside the same millisecond differ (`counter` increments), so a burst of edits never produces equal versions.
- **Skew-tolerant.** Observing a version whose physical component is in the future (a suspended tab waking up, a clock jump) pushes the local clock past it, so the next local edit still outranks the value it replaces.
- **Startup seeding is mandatory.** Without `seedFromPersisted`, a reopened tab with a wall clock behind the stored records could write a *lower* version than the value it intends to replace, and its edit would silently lose.
- **Downgrade path.** If the clock ever misbehaves under time pressure, keep the comparator and replace `tick` with `counter = maxObserved + 1`. No other file changes.

### 10.5 Merge

Field-wise maximum by version, with outcome reporting:

```ts
mergeRegister(local, remote): { register, accepted, conflict }
```

Rules and proven properties:

1. **Higher version wins**, regardless of arrival order.
2. **Equal version, equal value** — no-op, no new version created.
3. **Equal version, different value** — treated as corruption, never as a race: the local register is kept and the field is counted as a conflict. Resolving it by arrival order would make convergence depend on timing, which is precisely what the protocol exists to prevent.
4. **Commutative, associative, idempotent** over valid registers (P-01…P-04). These properties are what guarantee that replicas receiving the same set of updates in any order reach the same state.
5. Merging **only affects the field in the incoming register**; unrelated fields are untouched (S-4).

### 10.6 Messages

Channel name: `tabsync:v1`.

```ts
type Envelope =
  | { proto: 1; t: "HELLO";  from: string; msgId: string }
  | { proto: 1; t: "STATE";  from: string; msgId: string; state: unknown }
  | { proto: 1; t: "UPDATE"; from: string; msgId: string; register: unknown }
  | { proto: 1; t: "PING";   from: string; msgId: string }   // presence (stretch)
```

Boundary rules: `register` and `state` are typed `unknown` and must pass `parseRecord` / `parseState` before touching the store. Envelopes larger than 4 KB are rejected. `msgId` values are remembered in a 200-entry ring so duplicates are ignored before they reach the log. `from` must equal the sender inside the payload; a mismatch is rejected and logged as a diagnostic.

### 10.7 Validation

Hand-written guards (no validation library) because the schema is three fields with three domains, and because the pre-paint bootstrap needs the same rules in a few hundred bytes of inlined JavaScript.

| Reject reason | Trigger |
|---|---|
| `malformed-json` | `JSON.parse` throws on a stored value |
| `not-an-object` | `null`, array or primitive where a record is expected |
| `unknown-schema-version` | `v !== 1` — a future writer's record is ignored, never "migrated" silently |
| `unknown-field` | field not in `theme \| language \| fontSize` |
| `invalid-value` | theme/language outside the union; font size not an integer inside 14–24 |
| `invalid-version` | non-integer or negative `wallMs`, non-integer or negative `counter`, actor id outside the charset, or missing version |
| `reserved-actor` | actor id exactly `default` |

Rejection never mutates state. Rejections are counted and surfaced in the debug panel with the key that produced them — the sanitized diagnostic required by §17.

### 10.8 Startup sequence

1. The inline bootstrap merges durable registers and applies them to `<html>` **before first paint** (§13).
2. The store initializes from the same merged state; `window.__tabsync.bootstrap` is adopted rather than re-scanned, so one page load has one source of truth.
3. The clock observes every winning version (`seedFromPersisted`).
4. Transport listeners attach (`BroadcastChannel`, then `storage`).
5. **Storage is re-read after listeners attach.** This closes the window where a write could land between the bootstrap scan and listener installation and otherwise be missed forever.
6. `HELLO` is broadcast; each other tab answers `STATE` once; replies are validated and merged.
7. `visibilitychange → visible`, `pageshow` (bfcache restore) and `focus` trigger a reconcile: re-read durable state, merge, never re-assert stale local values.

### 10.9 Local edit

1. Local UI updates immediately (optimistic).
2. Clock ticks; a register is created for the edited field only.
3. `saveRegister()` persists it **synchronously** under this actor's own key — before the change is reported as saved. A refused write is reported in status, never hidden.
4. The register is broadcast.
5. No correctness anywhere depends on `beforeunload`/`pagehide` writes; the durable write already happened.

### 10.10 Remote update

Validate envelope and payload → `observe(version)` → merge the affected field → publish a store change **only if the winning register changed** → log. Receiving an update never manufactures a new version, and a duplicate update is a no-op after deduplication and again at merge time (defence in depth).

## 11. Persistence

### 11.1 Layout

```
tabsync:v1:register:theme:<actorId>
tabsync:v1:register:language:<actorId>
tabsync:v1:register:fontSize:<actorId>

{"v":1,"field":"fontSize","value":18,"version":{"wallMs":1700000000000,"counter":3,"actorId":"…"}}
```

Two independent version surfaces: the **namespace** version (`v1` in every key) and the **record** schema version (`v` inside each value). An unknown namespace is simply a different prefix and is ignored; an unknown record version is rejected with a reason. This dual naming is what allows a future format change without corrupting current data.

### 11.2 Why actor-owned keys instead of one shared snapshot

A shared JSON blob is a read-modify-write register. Two tabs writing concurrently lose one change because `localStorage` offers no compare-and-swap, and a stale writer can overwrite a newer winner wholesale. With actor-owned keys:

- a page writes **only** its own keys, so writes from different pages cannot collide at all;
- `setItem` is atomic per key, so a tab killed mid-operation cannot leave a half-written record;
- startup is a scan-and-fold, which is microseconds for three fields, and needs no locking;
- the highest version per field is recoverable even if the tab that wrote it is long gone.

### 11.3 Write rules (implemented and tested)

| # | Rule | Consequence if broken |
|---|---|---|
| W-1 | A page may persist only registers whose `version.actorId` is its own; a foreign-actor write is refused with a typed reason | one page could overwrite another's record and hide a winner |
| W-2 | A write never replaces an equal-or-higher version under the same key (monotonic replacement) | a stale in-memory register could resurrect an older value |
| W-3 | A corrupted own record holds no version worth protecting and may be replaced | the key would be permanently stuck |
| W-4 | Quota/disabled storage returns `{ written: false, reason: "storage-unavailable" }` | silent data loss, or a crash that hides a working UI |
| W-5 | Writes are synchronous; nothing is deferred to an unload handler | a closed tab loses its last edit |

### 11.4 Load

`loadState(storage)` iterates the namespace, validates each value, folds valid records to one winner per field (`DEFAULT_STATE` as the identity), and returns both the state and diagnostics: keys scanned, rejected records with reasons, fields restored, conflicts, and the set of actor ids seen. Diagnostics feed the debug panel and the write-up; they are not logged to the console in production paths.

### 11.5 Growth budget and quota

Keys grow as (3 fields × page instances ever created): about 130 bytes per key, so 10 000 page instances ≈ 3.8 MB, still inside a typical 5 MB quota. Therefore:

- **No compaction and no deletion.** Deleting "dominated" records while another tab may be writing is a data-loss race that cannot be tested in two days, and the payoff is a few kilobytes.
- The debug panel shows key count and approximate bytes, so the claim is visible rather than asserted.
- If the quota is exhausted, the app keeps working, marks persistence degraded, and says so (§17).
- A production extension would move to IndexedDB with a designed compaction scheme and a bootstrap that no longer needs a synchronous read — explicitly out of scope here, and stated as such in the write-up.

### 11.6 Reset

Reset writes default values as ordinary registers with a fresh high version. Keys are never deleted, so an older tab cannot resurrect pre-reset values (E2E-13).

### 11.7 Replica persistence is deliberately absent

Copying a winning register into another actor's key ("recovery replicas") is **not** implemented. Every accepted winner already exists durably under the key of the actor that produced it, and a copy would create a second durable source of truth for the same version, with new failure modes and nothing to show for it. Recovery for a tab that missed a broadcast is handled by the `HELLO`/`STATE` handshake and by lifecycle reconciliation, which read the same durable records.

## 12. Transport

| Path | When used | Notes |
|---|---|---|
| `BroadcastChannel("tabsync:v1")` | primary | structured clone; stores nothing, so a tab opened after a broadcast learns state from storage, never from a replay |
| `window` `storage` events | BroadcastChannel missing, constructor throws, or fallback forced | read the value from `event.newValue`; do **not** re-read localStorage, which may already hold a newer value by the time the handler runs |
| Lifecycle reconcile | always active | covers suspended/background tabs, bfcache restores and missed handshakes |

Details that decide correctness:

- **Echo control.** `BroadcastChannel` does not deliver to the sending context and `storage` events do not fire in the writing tab, but the same update may arrive twice (once per path) when both are active. Deduplication by `msgId` plus idempotent merge makes that harmless; the log records which path delivered each update.
- **Fallback forcing.** `?transport=storage` forces the fallback; with `NEXT_PUBLIC_TABSYNC_TEST=1` the same is available through a test hook. Documented and shipped deliberately so the demo and the tests can exercise the degraded path without browser flags.
- **Cleanup.** Channel and listener teardown happens on `pagehide` and on store disposal; a remounted component must not add a second pair of listeners (E2E-12).
- **Background tabs.** A suspended tab cannot be woken on demand; it may exceed the latency target and is therefore reported separately (§18). Correctness is preserved because the tab reconciles durable state when it returns.

## 13. Pre-paint bootstrap (FR-06)

### 13.1 Why the obvious approaches fail

`useEffect` runs after paint. `useLayoutEffect` runs after hydration but not after HTML parsing. Either way, the browser can paint default-light UI before the stored value is known — and on a slow connection that window is long. The only reliable placement is a **synchronous inline script in `<head>`**, executed while the HTML is parsed, before stylesheets finish loading and before React exists.

### 13.2 Contract

```
1. Scan localStorage for keys starting with "tabsync:v1:register:".
2. Validate each value with the same rules as the runtime (§10.7), inlined.
3. Fold to one winner per field using the same comparator as the runtime (§10.3).
4. Apply, before returning:
     documentElement.classList.toggle("dark", theme === "dark")
     documentElement.style.colorScheme = theme
     documentElement.lang = language
     documentElement.style.setProperty("--tabsync-font-size", fontSize + "px")
5. Publish the merged state on window.__tabsync.bootstrap so the store adopts it.
6. Never throw: the entire body is wrapped in try/catch, and the CSS defaults
   (light / en / 16 px) are the correct fallback.
```

Supporting decisions:

- **No system-theme mode.** Default is `light`; the value is explicit and stored. Same input, same output keeps the first-frame test deterministic and removes a class of "why is it dark?" review questions. (Revisit only after §24 is green.)
- **`color-scheme` is set alongside the class**, so scrollbars, form controls and the default canvas match the theme in the very first frame — otherwise a dark page shows a light scrollbar before the stylesheet loads.
- **Metadata placement.** The script is emitted in `<head>`; `app/layout.tsx` carries `suppressHydrationWarning` on `<html>` because the bootstrap intentionally mutates that element before hydration (server and client markup legitimately differ for one frame).
- **CSP.** Static export plus inline script means the host must allow the script by hash (or nonce). The hash is recorded in the README build notes; a host with no CSP needs nothing. Disabling CSP to make this work is not acceptable.
- **No competing theme system.** `next-themes` is not used: it owns a second theme state and its own storage key, and two writers for one field is exactly the defect this project is graded on. One fact, one owner.

### 13.3 Bootstrapping duplicates logic — contain it

The inline script cannot import TypeScript, so a small amount of logic exists twice. Containment, in priority order:

1. Keep the script under ~50 lines and read only the three fields it must apply.
2. **Generate** it from a module (`bootstrapSource()`) that shares the field names, domains and bounds, rather than inlining a hand-written literal in JSX.
3. Test equivalence: P-05 runs the generated script text against generated record sets — including corrupted, future-schema and conflicted keys — and asserts its winner for each field equals the runtime `loadState` result.

This is a deliberate, tested duplication, not an accident of layering.

## 14. Internationalization

Three locales — `en`, `hi`, `ta` — implemented as typed dictionaries, no i18n library:

```ts
type Messages = { [K in MessageKey]: string }
const en: Messages = { … }
const hi: Messages = { … }
const ta: Messages = { … }
```

A missing or misspelled key is a **compile error**, which is stricter than most runtime i18n library configurations and costs one file.

Rules:

- Translate labels, helper text, status messages, error copy and the preview content. A selector that only changes a stored code fails FR-02 and reads as fake.
- `<html lang>` follows the selected locale (bootstrap and runtime).
- One polite live region — the status line — and it must not announce remote slider updates.
- Static strings plus `Intl.NumberFormat(locale)` for the px readout; no plural machinery is needed.
- Locale choice is applied by translation, not by layout mirroring; all three locales are LTR.

### 14.1 Required message keys

`app.name` · `app.tagline` · `action.openTab` · `action.reset` · `settings.theme.label` · `settings.theme.help` · `settings.theme.light` · `settings.theme.dark` · `settings.language.label` · `settings.language.help` · `settings.fontSize.label` · `settings.fontSize.help` · `settings.fontSize.value` (`{px}`) · `preview.title` · `preview.body` · `status.transport.broadcast` · `status.transport.storage` · `status.transport.none` · `status.persistence.ok` · `status.persistence.degraded` · `status.peers` (`{count}`) · `status.reconnected` · `error.storageUnavailable` · `error.syncUnavailable` · `error.recordSkipped` · `error.futureSchema` · `debug.tab.state` · `debug.tab.versions` · `debug.tab.log` · `debug.field.winner` · `debug.field.updatedBy` · `debug.direction.local` · `debug.direction.remote` · `a11y.sliderValue` (`{px}`)

### 14.2 Translation quality is a stated limitation

Machine-produced translations are marked as unreviewed in the write-up, per locale, with the affected keys listed. Preferred order: reviewed by a speaker → flagged as unreviewed. Never ship a locale where some strings silently remain in English.

## 15. User interface

### 15.1 Screens

1. **Header** — product name, one-line instruction to open a second tab, and an `Open another tab` button (`window.open(location.href, "_blank")`).
2. **Settings card** — theme `Switch`, language `Select`, font-size `Slider` with a live readout; each control is a labelled, described field (label + control + helper text as one accessible unit).
3. **Preview card** — the three values applied to real content: theme colors, translated text rendered at the chosen size.
4. **Status line** — transport in use, persistence state, peer count; an `Alert` appears only when something is degraded (§17).
5. **Debug panel** — `Tabs`: **State** (the state JSON with copy button), **Versions** (per-field winner tuple, direction of the last update, latency of the last remote update), **Log** (the `SyncEvent` ring), plus the forced-transport switch. Collapsed by default.

### 15.2 shadcn/ui component map

Installed: `button`, `badge`, `card`, `collapsible`, `label`, `select`, `separator`, `slider`, `switch`, `tabs`, `tooltip`, `alert`.
Add when the surface is built: `field`, `code-block`, `trace`, `empty`, `item`, `spinner`, `kbd`.

| Surface | Component | Notes |
|---|---|---|
| Theme | `Switch` | visible label + `aria-label` |
| Language | `Select` | options from `LANGUAGES`, labels from the dictionary |
| Font size | `Slider` | `step=1`, `aria-valuetext` = "18 pixels" |
| Preview | `Card` + plain text | consumes `--tabsync-font-size` only |
| Degraded state | `Alert` | specific copy (§17), never "Something went wrong" |
| Field versions | `Item` / simple table | winner as `wallMs · counter · short actor id`, tooltip spells it out |
| State JSON | `Code Block` | copy button produces a shareable evidence artifact |
| Sync log | `Trace` | local / remote / merge / rejected, with direction and latency |
| Peer count | `Badge` | from presence messages; never persisted |

Never hand-roll a control that exists in the registry; never restyle a primitive beyond the tokens in §16.

### 15.3 Keyboard and accessibility

- Every control is keyboard-operable: `Switch` (Space/Enter), `Select` (arrows, type-ahead), `Slider` (arrows, Home/End, PageUp/PageDown), `Tabs` (arrows), `Collapsible` (Enter/Space).
- A visible focus ring on every interactive element; focus is never removed.
- Slider value exposed to assistive technology as text, not as a bare number.
- Contrast ≥ 4.5:1 in both themes; both themes screenshotted as part of the submission.
- `<html lang>` reflects the selected language at all times.
- Exactly one polite live region; correctness never encoded in an animation.
- `prefers-reduced-motion: reduce` disables all transitions with no loss of function.

## 16. Design contract

Binding, not aspirational. Each rule exists to prevent a specific default that makes generated interfaces look interchangeable (Appendix A).

**Position.** Quiet, editorial, black and white. The interface is a control surface for a protocol: numbers, versions and states are the content. Nothing decorative competes with them. Five principles: facts over flourish; one owner per fact; contrast creates hierarchy, color does not decorate; motion confirms and never explains; every state is designed (default, loading, empty, degraded, error).

### 16.1 Tokens

Neutral palette from preset `b0` (oklch), with these overrides in `app/globals.css`:

| Token | Value | Use |
|---|---|---|
| `--radius` | `0.75rem` (12 px) | cards, panels |
| `--radius-md` (derived) | 8 px | buttons, inputs, segmented controls |
| pill radius | full | badges only |
| `--background` / `--foreground` | neutral · `oklch(1 0 0)` / `oklch(0.145 0 0)` | page |
| `--muted-foreground` | neutral `0.556` | labels, secondary text |
| `--border` | neutral `0.922` light / dark equivalent | hairline borders at `border-border/60` |
| `--destructive` | as shipped | degraded and error states only |
| `--tabsync-font-size` | `16px` default | preview text only |

No gradients anywhere. No brand color. Accent is foreground at low alpha, plus one destructive tone for degraded states. Elevation is a hairline border, plus one soft shadow for popovers only.

### 16.2 Type

| Role | Face | Size and weight |
|---|---|---|
| Product name | Geist | `text-3xl font-semibold tracking-tight` |
| Section title | Geist | `text-base font-medium` |
| Body, labels, helper | Geist | `text-sm`; helper `text-xs text-muted-foreground` |
| Values, versions, keys, JSON | Geist Mono | `text-sm tabular-nums` |

Geist and Geist Mono are a deliberate pair, self-hosted through `next/font`. Inter was the preset default and is not used: an unchosen default is the most reliable tell of generated design (Appendix A). Prose lines ≤ 70 characters; never two accent weights in one heading.

### 16.3 Spacing and layout

Scale: 4 / 6 / 12 / 16 / 24 / 32 px. Page: `mx-auto max-w-2xl px-6 py-16`, single column, 32 px between sections. Cards: 16 px padding, 6 px internal gaps. Asymmetry where it carries meaning — the status line is smaller and quieter than the settings card because it matters less until it changes.

Responsive: single column at every width, because the app has one job. Below `sm`, controls go full width; touch targets ≥ 44 px; the debug panel collapses rather than overflowing; no horizontal scroll at 320 px.

### 16.4 Motion budget

| Interaction | Allowed |
|---|---|
| Hover, focus, press | color and opacity, 120 ms `ease-out` |
| Panel expand (`Collapsible`, `Tabs`) | height/opacity, ≤ 160 ms |
| Theme switch | **no transition** — freeze transitions for one frame so the swap is instant |
| Incoming remote update | none; values change without flourish |

Banned: springs, bounces, parallax, decorative skeletons, staggered reveals, animated gradients, page transitions.

### 16.5 Content rules

- Labels name the setting ("Theme"); helper text states the consequence ("Applies to every open tab").
- Status copy is specific: "Changes are not being saved in this browser. Other open tabs still sync."
- Version tuples render as `1432 ms · 7 · 9f3c` (physical, logical, short actor id) with a tooltip that spells them out.
- No exclamation marks, no emoji, no marketing verbs.

### 16.6 Do-not-ship list

Violet→indigo gradients · three identical cards · emoji as icons · uniform radius and padding on everything · purple "AI" glow · centered hero with a vague headline · stock illustration · animated counters · glassmorphism · dark patterns in the language selector · any control that changes only a stored code without changing the UI.

### 16.7 Design review checklist

- [ ] Every color comes from a token; no raw hex in components.
- [ ] Radius, spacing and type sizes come from the scales, not one-off values.
- [ ] Reduced-motion mode is usable and functionally identical.
- [ ] Every interactive element is keyboard reachable with a visible focus ring.
- [ ] Both themes screenshotted and contrast-checked.
- [ ] 320 / 768 / 1440 px passes with no horizontal scroll.
- [ ] No emoji, no gradient, no placeholder copy.
- [ ] Values, versions and keys render in mono with tabular numerals.
- [ ] Degraded, empty and error states have real copy.
- [ ] Nothing on the page was added "because the tool suggested it".

## 17. Failure handling and degraded modes

| Condition | Required behaviour | User-visible copy |
|---|---|---|
| Corrupted JSON in a record | Ignore that record, keep folding others, count it in diagnostics | "One saved record was unreadable and was skipped." |
| Invalid field or value | Reject, state unchanged | debug log only |
| Unknown schema version | Ignore safely, note the compatibility gap | "A newer version wrote part of this state; it was left untouched." |
| Equal version, different value | Keep local, count as conflict, log the key | debug log only |
| Storage unavailable or quota exhausted | UI stays usable, mark persistence degraded, keep broadcasting | "Changes are not being saved in this browser. Other open tabs still sync." |
| `BroadcastChannel` missing or throwing | Fall back to storage events and continue | "Live sync is using the slower channel." |
| Both transport and storage unavailable | Controls work; sync and persistence off | "Sync and saving are unavailable in this browser." |
| Suspended tab resumes | Re-read durable state, merge, never re-assert stale values | "Reconnected." |
| Reordered or duplicate messages | Merge is idempotent; duplicates are no-ops | debug log only |
| Component remount | Store and listeners are single-instance and cleaned up | — |
| Page closed mid-edit | Durable write already happened; no unload dependency | — |
| Bootstrap throws | `try/catch` swallows, CSS defaults apply, runtime still initializes correctly | — |

Copy rules: name the consequence and the next step. Banned: "Something went wrong", "Oops!", "An unexpected error occurred", or any message that does not tell the user what changed and what still works.

## 18. Performance and latency

### 18.1 Target and metric

**Target:** ≤ 100 ms from local commit to remote commit, foreground tabs. Percentiles and misses are published; the target is a measured property of tested conditions, not a browser scheduling guarantee.

**Measured metric (one-way, commit to commit).** Each page records `performance.timeOrigin + performance.now()` at:

- **(a)** the local commit — the moment the register is merged into local state;
- **(b)** the remote commit — the moment the same register is merged into the receiving page's state;
- **(c)** the first animation frame after (b) — reported separately, because paint is what a human sees.

One-way latency = (b) − (a), computed from the two pages' absolute timestamps.

**Calibration is mandatory before reporting.** Record ~20 sanity round-trips between the two pages and report the observed disagreement. If cross-page clocks differ by more than a few milliseconds on the test machine, fall back to controller-driven measurement and say so in the report. Never present BroadcastChannel round-trip time as one-way latency, and never compare raw `performance.now()` values across pages without aligning them.

### 18.2 Instrumentation

The store appends a `SyncEvent` for every local edit, remote apply, merge, rejection and lifecycle reconcile, with timestamps and versions, into a 200-entry ring exposed as `window.__tabsync.log`. The benchmark harness (Playwright, Node side) reads that log from every page and computes the report; the debug panel shows the same numbers during the demo. The application therefore produces its own evidence.

### 18.3 Scenarios

| ID | Scenario | Samples | Notes |
|---|---|---:|---|
| B-01 | 2 tabs, BroadcastChannel, foreground | 120 | baseline |
| B-02 | 3 tabs, BroadcastChannel, foreground | 120 | fan-out cost |
| B-03 | 2–3 tabs, storage fallback | 120 | expect slightly higher; report independently |
| B-04 | Slider burst (60 updates over 2 s) | 200 samples | locals immediate; remote final value must equal the local final value |
| B-05 | Background / suspended tab | ≥ 20 | reported **separately**, never averaged into the headline |
| B-06 | Cold reopen: bootstrap time to first paint | 30 | separate metric from sync latency |

### 18.4 Report contents (`docs/latency-report.md`)

```md
## Environment
OS · CPU · RAM · browser and exact version · build type (production static export) · commit SHA
## Method
Metric definition · timestamp source · calibration result and uncertainty · harness location
## Results
| Scenario | tabs | n | p50 | p95 | p99 | max | >100 ms | failures |
## Observations
Burst behaviour · fallback delta · background-tab behaviour and why it is excluded from the headline
## Limitations
Clock comparability · harness overhead · what these numbers do not claim
```

**Claim policy.** Correctness failures are reported separately from slow samples. Background results never appear in a foreground average. A missed target is published with its cause; an unverified claim is worse than a miss. CI runs functional assertions only — strict timing lives in the benchmark project so noisy CI cannot manufacture a guarantee.

## 19. Test strategy

### 19.1 Unit and property tests (`tests/unit`, Node environment, no DOM)

| ID | Case |
|---|---|
| U-01 | Version order: physical, then counter, then actor id |
| U-02 | Clock strictly increases inside one millisecond |
| U-03 | Clock follows wall time forward |
| U-04 | Observing a future-skewed remote version makes the next local tick outrank it |
| U-05 | Counter overflow promotes physical time and never repeats a version |
| U-06 | `seedFromPersisted` makes a reopened page outrank stored winners |
| U-07 | Merge keeps local on older remote, accepts newer, is a no-op on equal-and-equal |
| U-08 | Equal version with a different value is reported as a conflict, not applied |
| U-09 | Concurrent different-field edits both survive |
| U-10 | Fold converges for any arrival order and tolerates duplicates |
| U-11 | Equal versions in the same millisecond split deterministically by actor id |
| U-12 | Validation rejects: malformed JSON, non-object, unknown schema version, unknown field, out-of-domain value, malformed version, reserved actor id, actor id outside the charset |
| U-13 | Record round-trips through serialization |
| U-14 | Storage: writes only the actor's own key; foreign-actor write refused |
| U-15 | Storage: monotonic replacement — equal or older version is skipped |
| U-16 | Storage: newer version replaces the actor's own record |
| U-17 | Storage: unavailable storage returns a typed reason instead of throwing |
| U-18 | Storage: own corrupted record is replaced |
| U-19 | Load: defaults when empty; per-actor records coexist; winner independent of key order |
| U-20 | Load: corrupted and future-schema records are skipped and counted, valid ones still restore |
| P-01 | Merge is commutative over generated registers |
| P-02 | Merge is associative |
| P-03 | Merge is idempotent |
| P-04 | Merge identity and dominance hold over generated pairs |
| P-05 | Generated bootstrap script and runtime `loadState` agree for generated record sets (incl. corrupted, future-schema, conflicted keys) |

Current status: U-01…U-20 and P-01…P-04 are implemented and green (38 assertions across 4 files). P-05 lands with the bootstrap.

### 19.2 Browser tests (`tests/e2e`, Playwright)

All multi-tab tests use **one `BrowserContext`**: `context.newPage()` creates a tab that shares origin, storage and session, and cross-tab events fire exactly as in a real browser.

| ID | Test | Method that makes it meaningful |
|---|---|---|
| E2E-01 | Theme propagates to a second tab | assert the remote **computed** style, not the stored value |
| E2E-02 | Language translates the remote interface | assert translated text in tab B, and `<html lang>` |
| E2E-03 | Font size updates the remote preview | assert computed pixel size on the preview node |
| E2E-04 | Three tabs converge after a series of edits | compare per-field winner tuples across all three |
| E2E-05 | Concurrent different-field edits both survive | barrier: pause both outboxes, write, release |
| E2E-06 | Concurrent same-field edits converge deterministically | same barrier; assert the documented winner in every tab |
| E2E-07 | Startup shows saved values before hydration | first-frame instrumentation + delayed JS chunks (§19.4) |
| E2E-08 | Reopen after closing everything | `chromium.launchPersistentContext(userDataDir)` and **relaunch the browser**, not just a page |
| E2E-09 | Fallback transport works end to end | `addInitScript` sets `BroadcastChannel` to `undefined` before app code; repeat E2E-01, E2E-04, E2E-08 |
| E2E-10 | Duplicate and reordered messages do not undo newer values | inject the same envelope twice, then an older register |
| E2E-11 | Degraded storage is visible and non-fatal | override `setItem` to throw; assert banner and usable controls |
| E2E-12 | Duplicate page instances get distinct actor ids; remount does not duplicate listeners | read `actorId` per page; assert a single listener registration |
| E2E-13 | Reset converges with an older tab still open | reset in A, then edit in B; B cannot resurrect pre-reset values |
| E2E-14 | Corrupted and future-schema records do not block startup | seed keys, then assert valid winners still load |
| E2E-15 | Race: tab killed immediately after a synchronous write | `page.close()` straight after the edit; reopen and assert durability |

### 19.3 Benchmark suite (`tests/benchmark`, Playwright)

Implements B-01…B-06, emits JSON plus the markdown skeleton in §18.4. Runs on demand (`bun run benchmark:sync`), never as a CI gate.

### 19.4 The two tests that actually prove FR-06

**First painted frame.** `addInitScript` (which runs before any page script) installs a `requestAnimationFrame` callback recording `getComputedStyle(document.documentElement).backgroundColor` and `documentElement.className` on the **first** frame. The test also routes `/_next/static/**` to a delay so hydration is slow. The assertion is that the first recorded background already equals the persisted theme's background. A screenshot taken after React settles proves nothing about flash; the first frame does.

**Bootstrap/runtime agreement.** P-05, as described in §13.3.

### 19.5 Anti-flake rules

- No fixed sleeps for correctness; use `expect.poll` / `waitForFunction` with explicit timeouts.
- Never assert on intermediate state that may change twice; assert invariants plus final convergence.
- Simultaneity is created with the barrier (§19.2 E2E-05/06), never by hoping two automation clicks overlap.
- One worker for the timing-sensitive projects; multi-tab tests are not parallelised.
- Do not combine `page.clock` with init scripts in timing tests: the clock can silently revert to real time, producing numbers that look fine and are meaningless.
- A flaky test is a bug in the test. Fix the test; never loosen the assertion to make it pass.

### 19.6 CI

GitHub Actions on every push: `bun install --frozen-lockfile` → `bun run verify` (typecheck → lint → unit tests → production build) → `bun run test:e2e` on Chromium. The benchmark project is excluded. `bun run format:check` guards the diff.

## 20. Repository and code standards

### 20.1 Layout

```
tabsync/
├── PRD.md                     this document
├── README.md                  quickstart, status, limitations
├── app/
│   ├── layout.tsx             fonts, metadata, suppressHydrationWarning
│   ├── page.tsx               composition of the panels
│   ├── head-bootstrap.tsx     the inline pre-paint script
│   └── globals.css            tokens (Tailwind v4)
├── components/
│   ├── ui/                    shadcn primitives (Base UI base)
│   ├── settings-controls.tsx  theme / language / font size
│   ├── preview-panel.tsx      translated preview at the chosen size
│   ├── status-line.tsx        transport, persistence, peers
│   └── debug-panel.tsx        state, versions, log, forced transport
├── hooks/use-settings.ts      useSyncExternalStore bridge
├── lib/
│   ├── tabsync/               types, version, merge, validation, storage, transport, store
│   ├── i18n/dictionaries.ts   en / hi / ta
│   └── utils.ts               cn()
├── scripts/
│   ├── serve-static.ts        fixed-origin static server for multi-tab testing
│   └── install-skills.sh      installs the adopted agent skills (§8.5)
├── tests/
│   ├── unit/                  Vitest + fast-check
│   ├── e2e/                   Playwright multi-tab
│   └── benchmark/             latency harness
└── docs/latency-report.md     generated evidence, written by hand from benchmark output
```

### 20.2 House rules

One purpose per module; no barrel files; no `utils` grab-bag; files under ~250 lines. Comments explain **why** — a constraint, an ordering rule, a rejected alternative — and never restate the line below. No `as any`, no `@ts-ignore`. Caught errors either return a typed reason or are surfaced to the user; no empty `catch`. No `console.log` in application paths (lint-enforced); `scripts/` is exempt because its stdout is operator feedback. No dead code: delete it, git remembers. Every dependency must earn its place (§20.4).

### 20.3 Gates

| Gate | Command | Blocks |
|---|---|---|
| Types | `bun run typecheck` | any `any`-shaped shortcut |
| Lint | `bun run lint` | protocol importing React/Next; console noise in app paths |
| Unit + properties | `bun run test` | protocol regressions |
| Build | `bun run build` | anything that breaks static export |
| Everything | `bun run verify` | the CI gate: typecheck → lint → test → build |
| Format | `bun run format:check` | noisy diffs |
| E2E | `bun run test:e2e` | multi-tab regressions |

Architecture is enforced, not requested: `no-restricted-imports` on `lib/tabsync/**` rejects `react`, `react-dom`, `next`, `next/**`, `@/app/**`, `@/components/**`, `@/hooks/**`.

### 20.4 Dependency ledger

| Package | Why it is here | What was rejected instead |
|---|---|---|
| `next`, `react`, `react-dom` | framework and runtime, mandated by the preset workflow; controls `<head>` for the bootstrap | Vite (Appendix B) |
| `@base-ui/react`, `class-variance-authority`, `cn`, `shadcn`, `tw-animate-css`, `lucide-react` | shadcn/ui primitives, variants, class merging, Tailwind layer, motion utilities, icons | hand-rolled components, icon fonts, emoji |
| `typescript`, `eslint`, `eslint-config-next`, `prettier`, `prettier-plugin-tailwindcss` | type safety and formatting, tailwind class ordering | — |
| `vitest`, `@vitest/coverage-v8`, `fast-check` | unit tests and generated-input property tests | Jest (heavier), example-only tests (weaker) |
| `@playwright/test` | the only honest way to test real cross-tab behaviour | jsdom (no `BroadcastChannel`, no tabs) |

Nothing here is used for state management, validation, clock arithmetic or i18n: those are the graded parts, and they are implemented directly.

## 21. Non-functional requirements

| ID | Requirement |
|---|---|
| NFR-01 | TypeScript `strict`; no `any` in application code |
| NFR-02 | No backend, no network call, no external font/CDN at runtime |
| NFR-03 | Small, immutable register values; payloads under 4 KB; log ring capped at 200 entries |
| NFR-04 | Cleanup of listeners, channels and timers on `pagehide` and store disposal |
| NFR-05 | Responsive from 320 px to 1440 px and beyond |
| NFR-06 | Controls stay responsive while updates stream in (no input jank during a burst) |
| NFR-07 | Packaged assets only; fonts self-hosted at build time |
| NFR-08 | Works on current Chromium, Firefox and WebKit to the extent verified; exact tested versions reported |
| NFR-09 | No `eval`; bootstrap is a static string; no user input is rendered as HTML |
| NFR-10 | Privacy: all data stays in the browser; no analytics; documented that same-origin scripts can read `localStorage` |
| NFR-11 | Cold-start synchronous bootstrap work ≤ 50 ms |
| NFR-12 | Accessibility baseline: keyboard-complete, contrast-checked, reduced-motion safe (§15.3) |

## 22. Execution plan

Two days, one developer. Ordered so the two heaviest criteria (sync 30%, conflicts 25%) are demonstrably working before any polish exists. **CP** = checkpoint (binary, do not proceed past a failure), **✂** = cut-line.

### 22.1 Starting state

Scaffold (Next 16.4, preset `b0`), 12 shadcn primitives, the five protocol modules listed in §8.2, 38 green unit tests, green typecheck/lint/build, a static preview server, and the lint-enforced protocol boundary.

### 22.2 Day 1

| Hours | Work | Checkpoint |
|---|---|---|
| H0–H1 | `transport.ts` + `store.ts` + `use-settings.ts` | **CP1:** from the console, `setField("theme","dark")` in tab A changes tab B's `documentElement.className`. Fail here → stop; nothing downstream is trustworthy. |
| H1–H2 | Persistence wiring, clock seeding, post-listener re-read, `HELLO`/`STATE`, lifecycle reconcile | **CP2:** hard-refresh both tabs and values survive; kill a tab right after an edit and a fresh tab still shows it. |
| H2–H4 | UI shell: controls, preview, status line | **CP3:** all three settings propagate between two real tabs without refresh. |
| H4–H5 | `head-bootstrap.tsx` + P-05 equivalence test | **CP4:** a new tab's first frame is already the saved theme. |
| H5–H7 | i18n: three dictionaries, `lang` updates, translated preview | **CP5:** switching language in tab A changes visible text in tab B. ✂ two reviewed locales beat three unreviewed. |
| H7–H8 | Debug panel (State / Versions / Log), forced transport | **CP6:** every field shows its winner tuple, direction and last latency. |
| H8–H10 | E2E: sync, controls, persistence, fallback | **CP7:** E2E-01…04, 08, 09 green. |

**End-of-day-1 floor:** CP1–CP4 plus two e2e tests. Behind that line, cut the debug panel and the third locale — never the tests.

### 22.3 Day 2

| Hours | Work | Checkpoint |
|---|---|---|
| H10–H12 | Concurrency barrier behind `NEXT_PUBLIC_TABSYNC_TEST=1` | **CP8:** E2E-05, 06, 12, 13 green. |
| H12–H13 | Degraded modes: storage override, corrupted seeds, close-racing-writer | **CP9:** every row of §17 has a passing test or a stated "not implemented, here's why". |
| H13–H15 | Latency benchmark + `docs/latency-report.md` | **CP10:** real numbers, including any misses, with method and calibration. |
| H15–H17 | First-frame flash test, accessibility pass, both-theme and three-width screenshots, reduced-motion run | **CP11:** E2E-07 green and the screenshots exist. |
| H17–H19 | README verified from a clean clone; limitations; license | **CP12:** a stranger can run, verify and understand it in under five minutes. |
| H19–H21 | Deploy; same-origin check in three tabs; record and rehearse the 3-minute demo | **CP13:** deployed URL works in three tabs; the recording has no dead air. |
| H21–H22 | Buffer for the weakest checkpoint | — |

### 22.4 Slack rules

Any checkpoint failing for more than 45 minutes: stop, write down the exact failing input, reduce the case, ask for review. Never add code to a failing test. Never assert anything that was not run — the write-up says "verified" only for checkpoints that actually passed. Flakiness is a test bug; fix the test rather than loosening it. A good hour either passed a checkpoint with output to show for it, or took a cut-line deliberately.

## 23. Risk register

| Risk | Trigger | Pre-decided response |
|---|---|---|
| Hybrid clock misbehaves under time pressure | > 45 min lost | Downgrade to a Lamport counter (§10.4), keep comparator and tests |
| Same-field barrier test flaky | two failed reruns | Keep one deterministic barrier test, drop the echo variants; never loosen assertions |
| Absence of flash cannot be proven | 1 h spent | Keep first-frame instrumentation; add a screencast export as secondary evidence; disclose the method's limits |
| Record growth questioned in review | review | §11.5 budget, debug-panel counters, explicit "no compaction" rationale |
| Background-tab numbers miss 100 ms | measured | Publish foreground p95 as the headline, background separately; never hide the miss |
| Sprung a leak between bootstrap and listeners | E2E-10/14 | The post-listener re-read (§10.8 step 5) exists precisely for this; assert it with a seeded key |
| Deploy host injects a CSP | deploy day | Compute the inline-script hash and add it to the host config; never disable CSP |
| Networkless CI | build fails offline | Switch to `next/font/local` with committed woff2 files |
| Time overrun | hour 24 | Cut presence, `Code Block`/`Trace` extras, third locale; keep three settings, both transports, E2E-01…08 and 15, README |

## 24. Acceptance criteria

Each item is a command or an observation, not a sentiment.

- [ ] **AC-01** Three settings (theme, language, font size) work locally and propagate to every open tab (E2E-01…04).
- [ ] **AC-02** Changing the language changes real interface text and `<html lang>` (E2E-02).
- [ ] **AC-03** Simultaneous different-field edits both survive; simultaneous same-field edits converge to the documented winner in every tab (E2E-05, 06).
- [ ] **AC-04** Closing every tab and relaunching the browser restores the saved values (E2E-08).
- [ ] **AC-05** The first painted frame already shows the saved theme (E2E-07).
- [ ] **AC-06** The storage fallback passes the same sync and persistence tests with `BroadcastChannel` removed (E2E-09).
- [ ] **AC-07** Corrupted records, future-schema records and unavailable storage never crash; degraded state is visible and specific (E2E-11, 14).
- [ ] **AC-08** A tab killed immediately after an edit still leaves a durable winner (E2E-15).
- [ ] **AC-09** `bun run verify` and `bun run test:e2e` are green from a clean clone (CP7, CP12).
- [ ] **AC-10** `docs/latency-report.md` contains the environment, method, calibration, percentiles, sample counts and limitations.
- [ ] **AC-11** The debug panel shows, for every field, the winning version tuple, the direction of the last update and the last remote latency.
- [ ] **AC-12** Keyboard-only operation and both-theme contrast checks pass; reduced motion is safe (NFR-12).
- [ ] **AC-13** The deployment serves every demo tab from one origin.
- [ ] **AC-14** README states exactly what is verified and what is not.

## 25. Submission package and demo

**Package:** public repository with full TypeScript source · README (prerequisites, install, run, test, limitations) · this PRD · `docs/latency-report.md` · deployment link · 3-minute demo recording · LICENSE (add before making the repository public).

**Demo script (rehearsed, 3 minutes):**

1. **0:00–0:40 — The claim.** Three tabs open side by side. Change theme in A, language in B, font size in C. Everything converges; point at the versions in the debug panel.
2. **0:40–1:10 — The hard case.** Trigger both tabs writing `theme` at the same instant via the barrier demo. Show every tab agreeing on the same winner tuple, then explain per-field registers in two sentences.
3. **1:10–1:40 — Real translation.** Show the interface in Hindi and Tamil, including `<html lang>`.
4. **1:40–2:05 — The fallback.** Force `?transport=storage`, repeat one sync, show both lines in the latency table.
5. **2:05–2:30 — Durability and first paint.** Close everything, reopen: no wrong-theme frame (show the first-frame recording), values restored.
6. **2:30–2:45 — Degraded mode.** Disable storage, show the specific banner, keep using the controls.
7. **2:45–3:00 — Numbers and limits.** The latency table, sample counts, and one honest sentence about background tabs and clock comparability.

**Write-up (one page, in the README or linked):** per-field last-writer-wins registers; hybrid logical clock ordering; actor-owned durable records; pre-paint bootstrap; what is not claimed.

## 26. Open decisions and stated limitations

| Item | State |
|---|---|
| System theme mode | Deliberately absent; determinism first. Revisit only after §24 is green |
| Storage compaction | Not implemented; budget and rationale in §11.5 |
| Background/suspended tabs and the 100 ms target | Reported separately; not fixable from a page (B-05) |
| Cross-page clock comparability | Calibrated per run; uncertainty published (§18.1) |
| Translation review | Machine-assisted strings flagged as unreviewed until a speaker checks them |
| Presence and exporters | Stretch only (§6.2) |
| Cross-origin, cross-profile, private-window sync | Out of scope by definition; stated in the README |
| Firefox/WebKit verification | Run the e2e suite there if time allows; otherwise report exactly which engines were tested |

---

## Appendix A — "AI slop" mechanics: what this project refuses to ship

Slop is not ugliness. It is the statistically average choice made when nobody decided: output that is technically correct, confidently worded, and interchangeable with a thousand other builds. The cause is an absence of constraints, so the constraints come first and are written down — that is what §15, §16 and §20 are for.

### A.1 Design tells and the counter-rule

| Tell | This project |
|---|---|
| Violet→indigo gradient as the primary color | none; neutral palette, one foreground accent |
| Inter everywhere, unchosen | Geist for UI, Geist Mono (tabular numerals) for values, versions, keys — a deliberate pair |
| Three identical feature cards | one settings card, one preview, one debug panel — three different shapes |
| Emoji as icons | `lucide-react` only |
| Uniform radius and shadow on everything | 12 px on surfaces, 8 px on controls, pills for badges only; hairline borders, one soft shadow for popovers |
| Centered hero with a vague headline | title, one sentence, controls |
| Generic uplift copy | copy names the consequence: "Changes are not being saved in this browser" |
| Uniform padding everywhere | spacing scale 4/6/12/16/24/32 with deliberate variation |
| Motion as decoration | 120 ms, opacity/color/transform only, never used to communicate correctness |

### A.2 Code tells and the gate that catches each

| Tell | Gate |
|---|---|
| Unused imports, dead code, orphan files | ESLint + a dead-code pass (`knip`) before submission |
| Comments that restate the line below | review rule: comments state a *why* — rule, ordering, rejected alternative |
| `as any` / `@ts-ignore` to force code through | `strict` + review; zero tolerated |
| Empty or broad `catch` hiding failures | errors return typed reasons or surface in the UI; `no-console` in app paths |
| Over-abstraction: an interface with one implementation, a factory for one product | rule: no indirection without two real cases today |
| Duplicated logic across layers | one owner per fact — the store is the only theme writer, so `next-themes` was removed |
| Hallucinated or unnecessary dependencies | §20.4 ledger; the dependency count is a reviewed number |
| TODOs that live forever | milestones live in §22, not in code |
| Placeholder UI shipped as product | the scaffold's placeholder page was deleted |
| Copy-pasted helpers | shared behaviour lives in `lib/tabsync` and `lib/i18n` |

---

## Appendix B — decision ledger: options considered and rejected

| Option | Verdict | Reason |
|---|---|---|
| Vite SPA | rejected for this repository | Smaller bundle (~42 KB vs ~92 KB) and faster time-to-interactive, but the preset workflow specifies the Next template, and control of `<head>` for the pre-paint bootstrap is worth more here than bundle bytes. The protocol is framework-free, so a port would be a build-config change, not a rewrite. |
| React state as the source of truth | rejected | React must not own cross-tab state; `useSyncExternalStore` plus a module-singleton store keeps the protocol testable and remount-safe. |
| Zustand / TanStack Store | rejected | Perfectly reasonable libraries, but the store is ~60 lines and they would hide exactly the merge logic being graded. |
| Yjs / Automerge | rejected | Conflict-free sequence types solve concurrent text editing. Three scalar settings need a per-field LWW register; a CRDT runtime adds weight, storage growth and a harder explanation. |
| Web Locks around a single snapshot | rejected | Atomic and bounded, but introduces an async window between click and durable write, so a killed tab can lose the edit. Actor-owned keys need no lock at all. |
| SharedWorker transport | rejected | Better fan-out, weaker mobile/Safari support, and a second lifecycle to get wrong. |
| IndexedDB persistence | rejected | Cannot be read synchronously before first paint — the one thing persistence must do here. |
| Service worker | rejected | Adds install/update lifecycle for no requirement in scope. |
| Polling localStorage | rejected | Latency and CPU cost for no correctness gain. |
| Zod for validation | rejected | Three fields, three domains: hand-written guards return typed reasons, keep the inlined bootstrap small, and avoid a dependency. Reconsider beyond ~6 fields. |
| i18n library | rejected | Typed dictionaries make a missing key a compile error, which is stricter than most runtime configurations for three locales. |
| Storage compaction | rejected for this scope | Unsafe deletions under concurrent writers; documented growth budget instead. |
| System theme mode | rejected for the MVP | Determinism: same input, same output keeps the first-frame test honest. |
| `next-themes` | removed | A second theme owner with its own storage key. One fact, one owner. |
| Toasts for status | removed | Sync and persistence status is persistent state; a transient toast is the wrong affordance. `Alert` plus a status line instead. |
| Emitting latency from the network layer | rejected | There is no network. Latency is commit-to-commit inside the browser, measured by the app and read by the harness. |

---

## Appendix C — glossary

| Term | Meaning here |
|---|---|
| **Actor** | One page instance, identified by a fresh UUID; the unit of ownership for durable records |
| **Register** | One field's value plus the version that won it |
| **Version** | `(wallMs, counter, actorId)` — the comparable stamp on a register |
| **HLC** | Hybrid logical clock: wall-clock physical component plus a logical counter, monotonic and skew-tolerant |
| **Commit** | The moment a register is merged into a page's state (local or remote) |
| **Convergence** | All tabs hold the same winning register per field |
| **Degraded** | Sync or persistence impaired, UI still usable, state stated in the interface |
| **Bootstrap** | The synchronous inline `<head>` script that applies durable state before first paint |
| **Barrier** | Test-only mechanism that holds two tabs' outgoing updates and releases them together to create true simultaneity |
| **Namespace** | The `tabsync:v1:` key prefix; a later format change gets a new prefix |

---

## Appendix D — references

**Ordering and conflict resolution.** Hybrid logical clocks (Kulkarni et al., 2014) and Lamport ordering as used by last-write-wins registers in production databases; pack layouts (48-bit physical + 16-bit logical, and database-specific variants compared lexicographically); counter-overflow promotion; clock-drift guards.

**Cross-tab transport.** `BroadcastChannel` as a transport that stores nothing ("a pipe, not a bucket"), baseline availability since March 2022 with Safari 15.4; `storage` events as the fallback, including the per-message-key technique and the rule to read the value from the event rather than re-reading storage; sender-id and message-id envelopes for self-echo and duplicate control; Web Locks for atomic sections (considered and rejected here).

**Startup and rendering.** Preventing flash before hydration with a synchronous inline `<head>` script; `suppressHydrationWarning` on `<html>` for pre-hydration attribute writes; binding `color-scheme` to the applied theme rather than the OS preference; late-injected theme scripts under streaming SSR as the failure mode to avoid.

**Testing.** Property-based testing for merge-algebra laws (commutativity, associativity, idempotence); Playwright multi-tab testing inside one `BrowserContext`; `launchPersistentContext` for profile-level persistence; `addInitScript` for pre-script overrides; the Playwright clock caveat when combined with init scripts.

**Quality.** Documented AI-slop design tells (gradients, unchosen typeface, uniform radius and shadow, emoji icons, weightless copy) and code tells (dead code, restating comments, type escapes, swallowed errors, over-abstraction, fabricated dependencies), with deterministic gates preferred over model-based review.

**Agent skills.** The skills registry and its leaderboard (<https://skills.sh>), the `skills` CLI (`add`, `find`, `--agent`, `--global`), and the SKILL.md format; specifically the shadcn component workflow skill and its Radix→Base UI migration companion, Vercel Engineering's React/Next performance and web-design-guideline skills, Anthropic's `frontend-design` and `webapp-testing` skills, the `ui-ux-pro-max` design-intelligence skill, and the working-discipline skills (`tdd`, `code-review`, `systematic-debugging`, `verification-before-completion`). Installation, verdicts and the two deliberate refusals are recorded in §8.5 so a future contributor does not have to rediscover them.
