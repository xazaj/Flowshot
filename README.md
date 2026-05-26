# Flowshot

> Snapshot your user flows. Ship them as a single HTML.

Flowshot is a tool that drives a running web app through a list of pre-defined states, captures a screenshot of each, and assembles them into a pan/zoom flow diagram — delivered as a single portable HTML file with version metadata tied to the source commit.

## Status

⚙️ **Early prototype** — extracted from a real client deliverable (CrediOS Sales Workspace UI Flow).

The current code in this repo is the Spike S5 demo from that project (Vite + React Flow + `vite-plugin-singlefile`), which proved the single-file `file://` deliverable is viable.

## Documentation

- `docs/00.Sales Workspace UI Flow 方案.md` — Original case-study spec (CrediOS-specific, will be generalized)
- `docs/01.Spike S5 报告.md` — Tech-stack validation report
- `docs/figma-design.md` — Target design system for generated flow boards

## Quick start (current spike state)

```bash
npm install
npm run build       # → dist/index.html (single file, ~337KB)
node verify.mjs     # Playwright smoke test on file:// protocol
```

## Roadmap

See `docs/00.Sales Workspace UI Flow 方案.md` §9. Next:
- Generalize seed mechanism (currently CrediOS-localStorage-specific)
- `flowshot.config.ts` schema design
- Multi-project demo
