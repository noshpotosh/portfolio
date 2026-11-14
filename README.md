# Portfolio

Noah Stewart’s portfolio, built with HTML, CSS, JavaScript, and [CFJS](https://github.com/noshpotosh/cfjs) inside a handheld-console frame. Projects, case studies, and activity load from public GitHub data. No build step is required; `src/` is the complete website.

## Live site

Visit [noshpotosh.github.io/portfolio](https://noshpotosh.github.io/portfolio/).

GitHub Actions tests pull requests targeting `develop` or `main`, and pushes to either branch, using the `/portfolio/` base path. After the tests pass on `main`, the Pages workflow publishes `src/` directly to GitHub Pages. The workflow can also be run manually from the Actions tab. Runs on `develop` test the site without publishing it.

## Branch workflow

1. Create a feature branch from the latest `develop`, and open a PR into `develop`. Squash-merge it after `Verify portfolio` passes and review conversations are resolved.
2. Test the integrated changes on `develop` with `npm run dev` and `BASE_PATH=/portfolio/ npm run test:all`. GitHub Actions also runs the full suite after each merge. There is no separate hosted staging site.
3. When ready to release, open a `develop` → `main` PR. Squash-merge it after the required checks pass; the successful `main` workflow deploys the live site.
4. Before the next batch of features, create a temporary sync branch from the latest `develop`, merge `origin/main` into it, and open a PR back into `develop`. Use **Create a merge commit** for this sync PR so both branches share the release history. This avoids repeated release diffs after squash merges. Resolve any conflicts on the sync branch and rerun checks.

Both long-lived branches require PRs, passing `Verify portfolio` checks on an up-to-date branch, and resolved review conversations, including for administrators. Direct pushes, force-pushes, and deletion are blocked. An independent reviewer approval is optional, allowing a solo maintainer to merge their own PRs. `main` requires linear history; `develop` permits merge commits for release synchronization. Merged temporary branches are deleted automatically; keep `main` and `develop`.

## Run locally

Use Node.js 22.23.4 or newer. Starting the local server needs no dependency installation:

```sh
npm run dev
```

Open http://127.0.0.1:4321/ and refresh after edits. `npm run preview` starts the same server. Pass `-- --port 4322` to use another port. Use HTTP rather than opening `index.html` directly; the site requires JavaScript.

## Edit content

- `src/pages/` contains Home, Projects, and Résumé; `src/components/` contains the shared shell and reusable fragments.
- `src/data/resume.json` supplies the résumé page and downloadable PDF. Check both after editing.
- `src/styles/` holds shared styles; component styles live beside their markup.
- `src/components/shell.html` owns the GitHub account and shared data helpers.

GitHub topics choose projects: `portfolio-work` lists Work, `portfolio-play` lists Play (taking priority), and `portfolio-featured` lists Work and selects the most recently pushed featured project for Home. Other topics supply technology labels, with the repository language as a fallback.

On each project’s default branch, `.github/project-preview.png` (or `.gif` as a fallback) supplies its preview, `.github/project-icon.png` its icon, and root `CASE_STUDY.md` its case study. The repository’s website setting supplies the live link. Missing optional files are omitted; GitHub failures show fallbacks. Repository lists are cached locally for one hour.

## Verify

```sh
npm ci
npx playwright install chromium
npm run test:all
```

`npm run test:all` runs the logic tests followed by the browser tests, stopping if either suite fails. Browser commands manage their own local server. Set `BASE_PATH=/portfolio/` to check subdirectory serving.

`npm test` checks project selection, URL validation, repository pagination, caching, and optional file discovery. `npm run test:browser` checks navigation and history, data rendering and failures, safe Markdown, preview links, résumé/PDF downloads, and component section order.

Keep edge-case combinations in the logic tests. Browser tests should cover representative user flows and integration failures: routing in `tests/browser.cjs`, card links in `tests/previews.cjs`, activity in `tests/activity.cjs`, and résumé exports in `tests/resume.cjs`. Extend the test that owns a behavior instead of repeating it in another flow. The component-order check remains required by `AGENTS.md`.

`archive/` keeps local historical material and is ignored by Git.
