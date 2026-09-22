# Connect frontend to Express API backend

The frontend services (`authService.js`, `courseService.js`, `taskService.js`) currently read and write directly to `localStorage`. The Express + SQLite backend (`server/`) already exists with working CRUD endpoints but nothing calls them. We decided to connect the two.

**Key decisions:**

- **Full async rewrite.** All service functions become `async` and return Promises. Every call site in `app.js` uses `await`. This is more work than a cache-first approach, but gives one source of truth (the server) and no stale-cache bugs.
- **No auth tokens.** The `username` is sent in every request as a query parameter or request body field. The current system stores plaintext passwords — this is a prototype, not production. JWT or sessions can be added later without changing the API shape.
- **localStorage removed for app data.** Only the current user session object and UI preferences (theme, view mode) remain in localStorage. Courses, tasks, and user lists are no longer stored client-side.
- **Smart logic stays in the frontend.** `smartService.js` computes priority scores, rankings, and workload warnings from raw task data fetched from the API. The backend's `taskController.smart` endpoint becomes unused. No formula duplication.
- **Frontend adopts backend vocabulary.** `taskName` (not `name`), `username` (not `userId`), `studentName` (not `name`) — matching the data contract document. The rename happens throughout `app.js` and all service files.
- **Query parameter filtering** on existing routes (`GET /api/v1/courses?username=X`, `GET /api/v1/tasks?courseId=X`) rather than new nested routes.
- **`storageService.js` repurposed as an API client** (`apiClient.js` pattern): a thin `fetch` wrapper exporting `get`, `post`, `put`, `del` that handles the base URL, JSON headers, and error extraction. All services call through it.
- **Toast on error, no loading states.** Reuse the existing `toast()` function for API failures. No spinners — SQLite latency on localhost is negligible.
- **Remove cross-tab `storage` event listeners** — dead code once localStorage data is gone.
- **`API_BASE` hardcoded** in `js/config.js` pointing at `http://localhost:5000/api/v1`.
