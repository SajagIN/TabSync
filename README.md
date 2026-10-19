# TabSync

A small multi-tab preferences app and protocol demonstration. Theme, language, and preview text size are stored in this browser and converge across open tabs from the same origin.

## What it demonstrates

- **Per-field replicated registers:** editing one setting cannot overwrite a concurrent edit to another.
- **Deterministic conflict resolution:** registers are ordered by a hybrid logical clock and actor ID.
- **Durable, actor-owned records:** each page writes only its own localStorage keys; all tabs fold the same records into the same winners.
- **Pre-paint restoration:** a small inline script reads and validates saved records in `<head>` before the page is painted, then applies theme, language, and the preview-size variable.
- **Two transports:** `BroadcastChannel` is preferred; storage events are the fallback. Add `?transport=storage` to the URL to exercise that path.
- **Inspectable state:** Diagnostics exposes current registers, per-field versions, and a bounded event log.
- **English, Hindi, and Tamil:** changing language updates the interface and `<html lang>`.

The app is browser-local by design. There are no accounts, backend, analytics, or runtime network calls.

## Requirements

- Node.js 22 or newer
- Bun 1.4 or newer (the repository includes `bun.lock`)
- A current browser for the app; Chromium for Playwright tests

## Run locally

```bash
bun install --frozen-lockfile
bun run dev
```

Open the printed local URL in two tabs. Change a preference in either tab and watch the other tab follow. To test the storage-event fallback, append `?transport=storage` to the URL in both tabs.

## Verify

```bash
bun run typecheck
bun run lint
bun run test
bun run build
# Or run all four checks in sequence:
bun run verify
```

The unit and property suite runs in Node and does not need a DOM. The Playwright suite uses real pages in one browser context:

```bash
bunx playwright install chromium
bun run test:e2e
```

`bun run build` creates a static export in `out/`. Serve that export on a fixed origin with:

```bash
bun run preview
```

The static server listens on `0.0.0.0:4173` by default; set `PORT` to change it. Use the same origin for every tab because browser storage and messaging are origin-scoped.

## Project map

```text
app/                 Next.js App Router page, layout, bootstrap script, styles
components/          Settings, preview, connection status, diagnostics
hooks/               useSyncExternalStore bridge
lib/tabsync/         Framework-free validation, HLC, merge, storage, transport, store
lib/i18n/            English, Hindi, Tamil dictionaries
tests/unit/          Vitest and fast-check tests
tests/e2e/           Playwright multi-tab checks
scripts/             Static-export preview server
TabSync_PRD.md       Product requirements and protocol rationale
```

## Honest limits

- The sync guarantee is for tabs of one origin in one browser storage partition. It does not cover other devices, profiles, private windows, or origins.
- Background tabs can be suspended by the browser; they reconcile when they resume. The app does not claim hard real-time delivery while a tab is suspended.
- If browser storage is unavailable, controls remain usable and the status panel reports that preferences are not being saved. Live sync may still work when `BroadcastChannel` is available.
- The Playwright suite needs its Chromium binary installed separately. Timing claims should only be made after running a calibrated benchmark on the target machine; no latency numbers are claimed by this README.
- Hindi and Tamil copy has not yet had an independent native-speaker review.

See [`TabSync_PRD.md`](./TabSync_PRD.md) for the full product contract and the planned verification matrix.
