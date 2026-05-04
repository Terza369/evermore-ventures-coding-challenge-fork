A full-stack calendar scheduling application with **weekly recurring events**, conflict detection, and a FullCalendar-based UI with drag-and-drop support.

### Backend (NestJS + Prisma)

**API Endpoints:**

| Method   | Endpoint            | Description                                    |
| :------- | :------------------ | :--------------------------------------------- |
| `GET`    | `/api/events`       | List events with optional `from`/`to` filtering |
| `GET`    | `/api/events/:id`   | Get a single event by UUID                     |
| `POST`   | `/api/events`       | Create an event (with optional recurrence)     |
| `PATCH`  | `/api/events/:id`   | Partial update (title, times, recurrence)      |
| `DELETE` | `/api/events/:id`   | Delete an event                                |

**Key Design Decisions:**

- **Recurring events are stored as a single DB row** with `recurrenceRule` and `recurrenceEnd` fields. Occurrences are expanded on-the-fly during `GET` queries — no denormalization.
- **Conflict detection** expands both the new event and all candidate events into their occurrences, then checks for pairwise overlap. This correctly handles recurring-vs-recurring, recurring-vs-single, and single-vs-single conflicts.
- **Synthetic IDs** for occurrences use the format `{uuid}_{isoDate}`, allowing the frontend to distinguish occurrences from templates.
- **Validation** uses `class-validator` decorators on DTOs plus custom business rules (`validateTimeRange`, `validateTimezone`, `validateRecurrence`) in a utility module.
- **UTC arithmetic** throughout — occurrence expansion uses millisecond math instead of `Date.setDate()` to avoid DST edge cases.

### Frontend (React + FullCalendar)

- **Feature-based architecture** under `src/features/scheduler/` with NestJS-style file naming (`.component.tsx`, `.hooks.ts`, `.types.ts`, `.utils.ts`).
- **FullCalendar** with `@fullcalendar/interaction` for drag-and-drop event moving/resizing, with automatic revert on mutation failure.
- **MUI Dialog** for event creation/editing with timezone-aware datetime pickers.
- **React Query** for server state management with optimistic-style date range filtering.

### Testing

```bash
# Unit tests (generateOccurrences edge cases)
cd backend && npm test

# E2E tests (full API + DB, uses a disposable Docker container)
cd backend && npm run test:e2e
```

- **61 total tests** — 11 unit tests for `generateOccurrences` boundary conditions + 50 e2e tests across two isolated suites.
- **E2E infrastructure** spins up a separate Postgres container on port 5433, pushes the schema, runs tests, and tears down automatically.
- **Recurrence e2e tests** are isolated in their own spec file with separate fixtures in the `2030-03` date range (vs `2030-01` for standard tests).


## 🚀 Getting Started

### 1. Prerequisites

Ensure you have the following installed:

- **Node.js** (v22+ recommended)
- **Docker** & **Docker Compose**
- **NPM** (v7+ comes with Node)

### 2. Install Dependencies

From the root directory, install dependencies for all workspaces:

```bash
npm install
```

### 3. Start Infrastructure

Start the PostgreSQL database container. This must be running before starting the backend.

```bash
npm run docker:up
```

> **Note:** The database runs on port `5432`. Ensure no local Postgres instances are conflicting.

---

## 🛠 Development Workflows

We have configured root-level scripts for convenience.

| Command                | Description                                              |
| :--------------------- | :------------------------------------------------------- |
| `npm run docker:up`    | Starts the Postgres database container in detached mode. |
| `npm run docker:down`  | Stops and removes the database container.                |
| `npm run dev:backend`  | Starts the NestJS server in watch mode.                  |
| `npm run dev:frontend` | Starts the React/Vite development server.                |

### Typical Startup Routine

1. `npm run docker:up`
2. Open a new terminal: `npm run dev:backend`
3. Open a new terminal: `npm run dev:frontend`

---

## 📂 Documentation

For specific details on the sub-projects, please refer to their respective READMEs:

- [Frontend Documentation](./frontend/README.md)
- [Backend Documentation](./backend/README.md)
