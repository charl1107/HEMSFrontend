# HEMS Frontend

Vue 3 SPA for the Hospitality Management Event System (HEMS). Consumes the NestJS API in `../HEMSBackend`.

## Stack

- **Vue 3.5** + TypeScript + `<script setup>` SFCs
- **Vite 8** + `@vitejs/plugin-vue`
- **Pinia** (auth, theme stores) · **Vue Router 5** (role-guarded routes)
- **Tailwind CSS 4** via `@tailwindcss/vite`
- **Axios** API layer (`src/api/`)
- **vite-plugin-pwa** — offline-capable installable app (Workbox precache + runtime caching, IndexedDB roster snapshot)
- **Vitest** + @vue/test-utils + happy-dom

## Features

- **Public** — event catalog and event detail pages with no login (`/events`)
- **Auth** — login, welcome screen, forced change-password flow
- **Dashboards** — separate student and staff dashboards
- **Events** — create/edit/detail views with role-based access (`Event Coordinator`, `Instructor`, `Student Officer`, `Department Head`, `Admin`)
- **Reports** — reports dashboard
- **Admin** — user management, bulk student add, audit log viewer
- **Notifications** — `NotificationBell` in the app bar
- **PWA** — installable, works offline after first visit (event catalog + rosters cached)

## Project structure

```
src/
  api/           Axios client + typed API modules (auth, events, users, ...)
  components/    Shared components (ui/, NotificationBell)
  layouts/       AppLayout (authed shell), PublicLayout
  router/        routes, public routes, auth/role guard, landing redirect
  stores/        Pinia stores (auth, theme)
  views/
    auth/        Login, welcome, change password
    public/      Public event list/detail
    dashboards/  Student + staff dashboards
    app/         Events, reports
    admin/       Users, audit log, add students
  utils/         Helpers
  test-utils/    Shared test setup
```

Tests are co-located with their source file (`*.spec.ts`), including accessibility/style guards (`contrast-guard.spec.ts`, `style.spec.ts`).

## Setup

```bash
npm install
cp .env .env.local   # optional; defaults to the API at http://localhost:3000
```

| Variable | Purpose |
|---|---|
| `VITE_API_BASE_URL` | Backend base URL (default `http://localhost:3000`) |

The backend must be running with `FRONTEND_URL` allowing this origin when CORS is enabled.

## Running

```bash
npm run dev       # Vite dev server (http://localhost:5173)
npm run build     # vue-tsc type-check + production build
npm run preview   # Preview the production build
```

## Tests

```bash
npm test          # Run once (Vitest)
npm run test:watch  # Watch mode
```

## Deployment

- **Vercel** — `vercel.json` rewrites all paths to `index.html` (SPA routing)
- **Docker/nginx** — `Dockerfile` + `nginx.conf` serve the built `dist/` with SPA fallback

PWA manifest: name "Hospitality Management Portal", start URL `/welcome`, theme `#be185d`.
