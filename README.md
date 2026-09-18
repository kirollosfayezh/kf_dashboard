# KF Dashboard

Admin control panel for KF Tech Solutions. Vite + React + TypeScript + TanStack
Router + Tailwind CSS, styled to match the brand mockup in
`../Homepage form responses (1)/Dashboard.dc.html` (dark theme by default with a
light-mode toggle, Space Grotesk / Instrument Sans / JetBrains Mono, orange→pink
gradient accents).

Everything — auth, content, leads, media, settings and live chat — comes from
`kf_backend`, the standalone Express + MongoDB server deployed on Render. Reads
and writes are plain REST under `/api`; live chat additionally opens a Socket.io
connection to the same origin, used purely as a push channel (every write still
goes through REST and the server emits the saved result back).

## Setup

```bash
npm install
cp .env.example .env   # point VITE_API_BASE_URL at your API
npm run dev
```

### Environment variables (`.env`)

| Variable | Purpose |
|---|---|
| `VITE_API_BASE_URL` | Origin of the `kf_backend` server, with no trailing slash and no `/api` suffix (`http://localhost:4000` locally, `https://<service>.onrender.com` on Render). REST calls are made to `<VITE_API_BASE_URL>/api/…`; Socket.io connects to the origin itself, since the realtime server shares the HTTP server. |
| `VITE_SITE_URL` | Optional. Target of the sidebar's "View live site" link. |

## Auth

There is no signup screen. The single admin account is created by the backend's
`npm run seed-admin` script (see `kf_backend/README.md`), which hashes the
password from `SUPERADMIN_EMAIL` / `SUPERADMIN_PASSWORD`.

1. `POST /api/admin/auth/login` with `{ email, password }` returns
   `{ token, user: { id, email, name } }`.
2. The token is persisted to `localStorage` and sent as
   `Authorization: Bearer <token>` on every `/api/admin/*` request.
3. On load, `GET /api/admin/auth/me` re-validates the stored token; any 401
   clears it and bounces to `/login`.

## Running locally end-to-end

1. Start MongoDB (locally or point `MONGODB_URI` at an Atlas cluster).
2. In `kf_backend/`: `npm run seed-admin` once, then `npm run dev`.
3. In this folder: `npm run dev`, then sign in with the seeded credentials.

## Scripts

- `npm run dev` — start the Vite dev server
- `npm run build` — type-check (`tsc -b`) and build for production
- `npm run preview` — preview the production build locally

## Structure

- `src/routes/` — file-based TanStack Router routes (`__root.tsx` is the
  authenticated shell + responsive sidebar, `login.tsx` is public)
- `src/components/app-sidebar.tsx` — fixed rail from `lg` up, off-canvas drawer
  below it (the root route owns the open/close state)
- `src/components/content-crud/ContentCrudScreen.tsx` — the one generic
  list+form+delete screen reused by `projects`, `services`, `solutions`,
  `aboutSections`, `blogPosts`, `testimonials`, `faqs` (all share the same
  `ContentItem` shape)
- `src/services/http.ts` — fetch wrapper that prefixes `/api`, attaches the
  bearer token, turns network failures into a readable `ApiError` and redirects
  to `/login` on a 401
- `src/services/session.ts` — the `localStorage`-backed token
- `src/services/socket.ts` — lazy Socket.io client; the admin JWT travels in the
  handshake `auth`, which joins the connection to the server's `admins` room
- `src/services/chat.ts` — chat REST calls plus `subscribeToChat()`, which wires
  `chat:thread-updated`, `chat:message` and `chat:typing` and exposes
  `watch(visitorId)` for `chat:watch` / `chat:unwatch`
- `src/services/domain-types.ts` — TS types mirroring
  `kf_backend/src/shared/types.ts`
- `src/store/auth.ts` — JWT session state (Zustand)
- `src/store/theme.ts` — dark/light theme toggle, persisted to `localStorage`

## Responsive behaviour

The layout is built for 375px, 768px and 1280px:

- **Sidebar** — a fixed 250px rail at `lg` and up; below that it slides in as a
  drawer from a hamburger in the mobile top bar, with a scrim, and closes on
  navigation.
- **Tables** (inbox, content lists) — real CSS grids with column headings from
  `md` up; below that each row collapses into a stacked card. Nothing scrolls
  horizontally.
- **Forms** (settings, content edit) — auto-fit grids that fall to a single
  column on narrow screens.
- **Live chat** — two columns (threads / conversation) from `md` up. On mobile
  it's one column: the thread list, then the conversation with a back button.

## Chat data flow

A thread is addressed by its **`visitorId`**, not by the Mongo `id` that also
comes back on the document.

- `GET /api/admin/chat/threads` on mount fills the thread list.
- Opening a thread loads `GET /api/admin/chat/threads/:visitorId/messages` and
  emits `chat:watch` so that thread's `chat:message` events start arriving.
- Sending a reply `POST`s to `…/messages` with `{ text }` (the server sets
  `from: "agent"`). The socket echoes the saved message; appends are de-duped by
  message id, so a reply shows up exactly once whether the echo or the HTTP
  response lands first.
- `chat:thread-updated` fires for *every* thread and drives the list ordering
  and the unread badges.
