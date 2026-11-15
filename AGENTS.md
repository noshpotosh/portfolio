A main goal of all agent work in this repository is to write simple, semantic code that is easy to understand and tweak. Use meaningful names, clear structure, and straightforward implementations; avoid unnecessary complexity and abstractions.

There is no build step: `src/` is the complete site, served by `npm run dev`. CFJS is vendored at `src/vendor/cfjs.js`. `archive/` is ignored by Git and out of scope. `README.md` is the human guide to content, data, and testing.

## Before you finish

- `BASE_PATH=/portfolio/ npm run test:all` passes. This is the command the `Verify portfolio` check runs.
- Visible changes are checked in the browser under `npm run dev`.
- Changed behavior is covered by extending the test that owns it (see README “Verify”). Edge-case combinations belong in the logic tests (`tests/*.test.mjs`); browser tests cover representative flows.
- Every consumer of changed data still works. For example, `src/data/resume.json` feeds both the résumé page and the PDF download.

## Code readability

- Use blank lines to separate logical chunks of code, keeping closely related statements together.
- Name functions for what they do, and spell names out rather than abbreviating.
- Add concise JSDoc-style comments to core functions, explaining their purpose and any non-obvious parameters, return values, or side effects. Comment the why, not what the code already says.
- Use clearly named constants for values with domain meaning or shared behavioral significance. Keep ordinary display text inline when a constant would add no clarity.
- Put public and core functions near the top of a file, followed by smaller helper functions roughly in the order they are called. Keep required imports and setup first, preserve initialization dependencies, and apply this ordering within the JavaScript section of HTML files.

## Component section order

Use **HTML → JavaScript → CSS** in all active HTML files under `src/components/` and `src/pages/`. Put all markup, including reusable `<template>` elements, first, scripts second, and styles last. Omit unused sections. Keep template contents together, and preserve relative order within script and style groups (including the résumé’s two style blocks). `src/index.html` (document-level loading requirements) and archived files are excluded. `tests/section-order.cjs` enforces this as part of `npm run test:browser`.

Preserve script types and attributes when moving blocks. The shared helpers in `src/components/shell.html` must stay synchronous classic scripts; the comment above them explains the CFJS timing. Check consumer initialization whenever you move a shared script.

## Branch workflow

- Branch from the latest `develop` and raise PRs into `develop`. Never commit or push directly to `main` or `develop`.
- Merge only after `Verify portfolio` passes and review conversations are resolved, keeping branch protection and checks intact.
- Squash-merge feature PRs and `develop` → `main` releases. Only `main` deploys GitHub Pages.
- After a release, sync before the next feature batch: branch from the latest `develop`, merge `origin/main`, raise a PR into `develop`, and merge it with a **merge commit** to preserve ancestry. README “Branch workflow” has the full procedure.
- Keep `main`, `develop`, and recovery stashes. Delete a temporary branch only once its work is in a merged PR and it has no later unmerged commits.
