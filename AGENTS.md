A main goal of all agent work in this repository is to write simple, semantic code that is easy to understand and tweak. Use meaningful names, clear structure, and straightforward implementations; avoid unnecessary complexity and abstractions.

## Code readability

- Use blank lines to separate logical chunks of code, keeping closely related statements together.
- Give variables descriptive names and name functions for what they do. Avoid vague names and unnecessary abbreviations.
- Add concise JSDoc-style comments to core functions, explaining their purpose and any non-obvious parameters, return values, or side effects. Avoid comments that merely repeat the code.
- Avoid magic strings: use clearly named constants for values with domain meaning or shared behavioral significance. Keep ordinary display text inline when a constant would add no clarity.
- Put public and core functions near the top of a file, followed by smaller helper functions roughly in the order they are called. Keep required imports and setup first, preserve initialization dependencies, and apply this ordering within the JavaScript section of HTML files.

## Component section order

Use **HTML → JavaScript → CSS** in all active HTML files under `src/components/` and `src/pages/`. Put all markup, including reusable `<template>` elements, first, scripts second, and styles last. Omit unused sections. Keep template contents together, and preserve relative order within script and style groups (including the résumé’s two style blocks).

Preserve script types and attributes when moving blocks. The shell’s shared GitHub helpers must remain a synchronous classic script so their globals are available to module consumers and CFJS data providers. CFJS expands nested includes before mounting, then activates fragment scripts. The classic helpers execute synchronously during activation, before deferred module consumers run and before CFJS looks up data providers in a microtask. Check consumer initialization when moving shared scripts.

`src/index.html` is excluded because it has document-level loading requirements. Archived files are also excluded. `npm run test:browser` discovers active component and page HTML files and checks their top-level section order with the browser’s inert template parser, ignoring comments and whitespace without inspecting template contents.
