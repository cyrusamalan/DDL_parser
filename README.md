# DDL ERD Visualizer

Turn PostgreSQL DDL into interactive entity relationship diagrams. Parsing runs entirely in the browser; projects persist to Neon Postgres with Clerk authentication.

## Stack

- **Next.js 16** (App Router, Server Actions) on **Vercel**
- **Clerk** — authentication
- **Neon Postgres** — diagram storage (`canvas_state` JSONB)
- **React Flow** — ERD canvas
- **node-sql-parser** — client-side PostgreSQL DDL parsing

## Setup

1. Copy environment variables:

```bash
cp .env.example .env.local
```

2. Link Vercel and pull env vars (after adding Clerk + Neon integrations):

```bash
vercel link
vercel integration add clerk
vercel env pull .env.local
```

3. Apply the database schema to Neon:

```bash
npm run db:migrate
```

Or run [`db/schema.sql`](db/schema.sql) in the Neon SQL editor.

4. Start the dev server:

```bash
npm run dev
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Local development |
| `npm run build` | Production build |
| `npm run db:migrate` | Apply `db/schema.sql` to `DATABASE_URL` |

## Usage

1. Sign up / sign in via Clerk
2. Create a project from the dashboard
3. Paste PostgreSQL `CREATE TABLE` DDL in the sidebar
4. Click **Generate** to render tables and foreign-key edges
5. Drag nodes — changes auto-save after 2 seconds

## Deployment

```bash
vercel deploy
```

Ensure Production and Preview environments have `DATABASE_URL`, Clerk keys, and sign-in/up URLs configured.
