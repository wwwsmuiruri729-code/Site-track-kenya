# SiteTrack Kenya

A construction site management app for Kenyan contractors and site teams to track projects, daily work, and material deliveries.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/scripts test` — run the SiteTrack API checks while the API Server workflow is running
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/sitetrack-kenya/src/App.tsx` — web app pages and forms
- `artifacts/sitetrack-kenya/src/index.css` — app styling and responsive layout
- `lib/api-spec/openapi.yaml` — source API contract
- `artifacts/api-server/src/routes/` — API endpoints
- `lib/db/src/schema/` — PostgreSQL tables and database models

## Architecture decisions

- PostgreSQL is the durable store for project, report, and material delivery records.
- Site report and delivery dates are calendar dates in the Africa/Nairobi time zone.
- A project with linked reports or deliveries cannot be deleted, protecting its history.

## Product

The first stage includes an overview dashboard, project register, daily site reports, and material delivery register. Project budgets and progress are recorded in the project register; delivered-material costs can be recorded in the materials register. Labour attendance, measured quantities, site photos, and fuller cost/reporting tools are not yet included.

## User preferences

- Build in stages and explain each development step in simple English.

## Gotchas

- Login and role-based access are not implemented yet. Do not use this version for confidential site records or publish it for public use until access controls are added.
- Delete linked daily reports and material deliveries before deleting their project.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
