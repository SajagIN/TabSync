# TabSync latency report

**Status: not measured.** No latency values or target claim are reported from this checkout. The Playwright suite could not launch because the sandbox has no Chromium executable, so a real multi-page measurement was not available. Do not treat build time, unit-test time, or a BroadcastChannel round trip as sync latency.

## Environment

- OS: Linux x86_64 sandbox
- Node.js: 22.22.3
- Bun: 1.4.3
- Next.js: 16.4.0
- Browser: none available in the sandbox; Playwright's Chromium headless executable was missing
- Build type: static export configuration is in place; the production timing run has not been performed

## Method

The measurement should follow [§18 of the product requirements](../TabSync_PRD.md#18-performance-and-latency): record sender commit and receiver commit with `performance.timeOrigin + performance.now()`, calibrate cross-page clock disagreement with round trips, and report the first post-commit animation frame separately. Run on a production static export with two and three foreground tabs. Keep storage-fallback and background-tab results separate.

The application records absolute event timestamps and captures incoming BroadcastChannel latency in the diagnostics event log. A calibrated Playwright benchmark harness still needs to be added and run before percentiles can be published.

## Results

| Scenario | Tabs | Samples | p50 | p95 | p99 | Max | >100 ms | Failures |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| BroadcastChannel, foreground | — | — | not measured | not measured | not measured | not measured | — | — |
| Storage-event fallback | — | — | not measured | not measured | not measured | not measured | — | — |
| Background / suspended tab | — | — | not measured | not measured | not measured | not measured | — | — |
| Slider burst | — | — | not measured | not measured | not measured | not measured | — | — |
| Cold reopen / first paint | — | — | not measured | not measured | not measured | not measured | — | — |

## Limitation

The 100 ms foreground target is not verified. Cross-page timestamp calibration, browser-version reporting, and sample counts are required before making that claim. Install Chromium and implement/run the benchmark harness before replacing this report with measured values.
