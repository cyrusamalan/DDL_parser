# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev            # Start Next.js dev server
npm run build          # Production build
npm run lint           # ESLint (eslint-config-next)
npm run db:migrate     # Apply db/schema.sql to DATABASE_URL (idempotent)

# Smoke tests (plain node scripts under scripts/, no test runner)
npm run test:ddl         # node-sql-parser → AST walk pipeline
npm run test:sanitize    # DDL sanitizer
npm run test:layout      # layout engine
npm run test:linter      # schema linter
npm run test:bottlenecks # bottleneck analysis
npm run test:upload      # .sql file reader
```

There is no unit-test framework. Tests are standalone `scripts/smoke-*.cjs` files using `node:assert/strict`; some duplicate the `src/` logic in CommonJS to assert against it. Run a single one directly with `node scripts/smoke-<name>.cjs`.

`db:migrate` reads `db/schema.sql` and applies it statement-by-statement (it has its own dollar-quote/comment-aware splitter). The only table is `diagrams`; there is no migration history — `schema.sql` is the source of truth and is written to be re-runnable.

## Environment

Copy `.env.example` to `.env.local`. Required: `DATABASE_URL` (Neon), `CLERK_SECRET_KEY` + `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (auth), `GEMINI_API_KEY` (AI table grouping; feature degrades gracefully without it). `GEMINI_MODEL` overrides the default model.

## Architecture

A Next.js app (App Router, React 19) that turns pasted PostgreSQL DDL into an interactive ERD. Single domain entity: a **Diagram**, persisted as a `diagrams` row whose `canvas_state` JSONB column holds the entire `CanvasState` (nodes, edges, viewport, raw SQL, settings, grouping). See `src/lib/types/diagram.ts` — this type is the contract between DB, server actions, and the React Flow canvas.

### Persistence & auth boundary
- **`src/lib/db.ts`** — lazy Neon serverless client (`getSql()`), reads `DATABASE_URL`.
- **`src/actions/*.ts`** — `"use server"` server actions are the *only* DB access path. Every action calls `requireUserId()` (Clerk `auth()`) and scopes queries by `user_id`; there are no API routes for diagram CRUD. `canvas_state` is round-tripped as `JSON.stringify(...)::jsonb`.
- **`src/proxy.ts`** — Clerk middleware protecting `/dashboard` and `/workspace`. (Note: this is the middleware file for this Next.js version — see AGENTS.md; do not assume conventional `middleware.ts`.)

### DDL → ERD pipeline (the core of the app)
This runs client-side in the workspace. Order matters:
1. **`sanitize-postgres-ddl.ts`** — pre-processes pasted SQL so `node-sql-parser` can handle it: splits statements (dollar-quote/comment aware), drops everything that isn't `CREATE TABLE` or `ALTER TABLE ... FOREIGN KEY`, rewrites custom ENUM columns to TEXT, strips enum casts, quotes reserved-word table names, etc. Returns human-readable `notes[]` surfaced to the user as "what we changed."
2. **`parse-postgres-ddl.ts`** — dynamically imports `node-sql-parser`, astifies with `{ database: "Postgresql" }`, then hands the AST to the walker.
3. **`ast-walker.ts`** — walks the untyped parser AST into a strongly-typed `ParsedSchema` (`tables` + `foreignKeys`). All AST access is defensive (`isObject`, optional chaining) because the parser's shape is loosely typed. Handles both inline `REFERENCES` and `ALTER TABLE ADD CONSTRAINT` foreign keys.
4. **`ddl-to-flow.ts`** — converts `ParsedSchema` into React Flow `nodes`/`edges` (`tableNode` + `fkEdge` custom types), **preserving existing node positions** by id, then runs layout.

### Layout
- **`layout-graph.ts`** — orchestrator. Picks clustered-by-group layout if a grouping exists, else BFS hierarchy levels from FK edges + an orphan section. `layoutTableNodes` tries the **ELK** engine (`elk-layout.ts`) first and falls back to the hand-rolled grid (`computeLayout`) on failure/empty. `relayoutNodes` re-runs layout + edge-handle optimization together.
- **`optimize-edge-handles.ts`** — chooses left/right source/target handles per edge based on relative node positions; re-run after any drag or relayout.
- Spacing/grid/direction come from `DiagramSettings` (`diagram-settings.ts` provides `mergeDiagramSettings` defaults).

### Schema analysis (read-only insights over the built graph)
- **`schema-graph.ts`** / **`schema-graph-context.ts`** — build adjacency maps + degree counts once into a `SchemaGraphContext`; everything else consumes that context.
- **`schema-analysis.ts`** — single entry `runSchemaAnalysis(nodes, edges, grouping)` returning `{ stats, issues, bottlenecks }` from `schema-stats.ts`, `schema-linter.ts`, `schema-bottlenecks.ts`. Surfaced via the `use-schema-analysis.ts` hook + `schema-info-panel.tsx`.

### AI grouping (Gemini)
- **`auto-group-tables.ts`** (server action) → **`gemini-grouping.ts`** → `@google/generative-ai`. Sends a structured prompt (`grouping-prompt.ts`) with a JSON `responseSchema`, with model fallback on quota errors and a 30s timeout. Returns a *preview* (`AiGroupingPreview`); the user confirms in `ai-grouping-preview-dialog.tsx` before it's applied and the canvas relaid out.

### Workspace state
`workspace-client.tsx` is the stateful hub holding nodes/edges/viewport/settings/grouping and a `canvasRevision` dirty-tracking counter (save is explicit, not autosave). Grouping mutations go through pure helpers in `table-grouping.ts`. Several heavy modules (`parse-postgres-ddl`, `node-sql-parser`) are dynamically `import()`-ed to keep them out of the initial bundle.

## Conventions
- `@/*` path alias maps to `src/*`.
- DDL/layout/analysis logic lives in framework-free `src/lib/ddl/*` modules (pure functions over plain data), kept separate from React components in `src/components/*` so it can be exercised by the `.cjs` smoke tests.
