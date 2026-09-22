# StudyFlow Full Setup Guide

## Overview

StudyFlow now has a working Express backend and a newly refactored frontend that connects to it via API. This guide walks through setting up and testing both systems end-to-end.

**Current state:**
- Backend: Complete with CRUD endpoints, ready to run
- Frontend: Rewritten to use async/await and call API, but HTML forms still use old field names
- **Action needed:** Update HTML form field names to match the new API contract

---

## Part 1: HTML Form Field Name Alignment

Before running anything, the auth form needs field name updates to match the new API contract.

### Issue Summary

| Location | Current | Needed | Reason |
|----------|---------|--------|--------|
| `index.html` login form | `userId` | `username` | API expects `username` |
| `index.html` register form | `name` | `studentName` | API expects `studentName` |
| `index.html` register form | `userId` | `username` | API expects `username` |
| `index.html` forgot form | `userId` | `username` | API expects `username` |

### Changes Required (Not yet applied)

**File:** `html/index.html`

**Line 28** (login form):
```html
<!-- Change from: -->
<input class="input" id="loginUserId" name="userId" ... />
<!-- Change to: -->
<input class="input" id="loginUserId" name="username" ... />
```

**Line 33** (forgot password form):
```html
<!-- Change from: -->
<input class="input" id="forgotUserId" name="userId" ... />
<!-- Change to: -->
<input class="input" id="forgotUserId" name="username" ... />
```

**Line 36** (register form — multiple changes):
```html
<!-- Change from: -->
<input class="input" id="registerName" name="name" ... />
<input class="input" id="registerUserId" name="userId" ... />

<!-- Change to: -->
<input class="input" id="registerName" name="studentName" ... />
<input class="input" id="registerUserId" name="username" ... />
```

Note: The `email` field on line 36 can stay as-is (it's optional and not used by the API).

---

## Part 2: Full System Setup Process

### Step 1: Verify Backend is Ready

```bash
cd /home/viet/workspace/viet/Study-Flow/server

# Check server entry point
ls -la src/app.js

# Verify database module exists
ls -la src/config/database.js

# Check routes are defined
ls -la src/routes/
```

Expected files:
- `src/app.js` — Express app and CORS setup
- `src/config/database.js` — SQLite schema initialization
- `src/routes/` — auth, courses, tasks endpoints
- `package.json` — dependencies (express, better-sqlite3, etc.)

### Step 2: Install Backend Dependencies

```bash
cd /home/viet/workspace/viet/Study-Flow/server

npm install
```

This will install:
- `express` — web server
- `better-sqlite3` — database
- `cors` — cross-origin requests

### Step 3: Start Backend Server

```bash
cd /home/viet/workspace/viet/Study-Flow/server

npm start
# or: node src/app.js
```

Expected output:
```
Server running on port 5000
Database initialized
```

**Verify it's working:**
```bash
curl http://localhost:5000/api/v1/health
# Should respond with 200 OK
```

Leave this terminal running.

### Step 4: Verify Frontend Structure

In a new terminal:

```bash
cd /home/viet/workspace/viet/Study-Flow

# Check frontend files exist
ls -la js/
ls -la html/
ls -la css/

# Verify new files were created
ls -la js/config.js
ls -la js/services/
```

Expected structure:
```
js/
  ├── app.js (updated with async/await)
  ├── config.js (NEW — API_BASE)
  └── services/
      ├── authService.js (rewritten for API)
      ├── courseService.js (rewritten for API)
      ├── taskService.js (rewritten for API)
      ├── smartService.js (updated)
      └── storageService.js (API client wrapper)

html/
  ├── index.html (needs field name updates)
  ├── dashboard.html
  └── course.html

css/
  └── ... (no changes needed)
```

### Step 5: Start Frontend Dev Server

In a new terminal:

```bash
cd /home/viet/workspace/viet/Study-Flow

# Using Live Server (if installed globally)
live-server

# Or if you have Python installed:
python3 -m http.server 5501 --directory .

# Or with Node (if you prefer)
npx http-server -p 5501 -c-1
```

Expected output: Frontend available at `http://127.0.0.1:5501`

Leave this terminal running.

### Step 6: Test Registration (First-Time Flow)

1. **Open browser:** `http://127.0.0.1:5501/html/index.html`

2. **Click "Sign up"** tab

3. **Fill form:**
   - **Name:** "John Doe"
   - **Username:** "johndoe123"
   - **Email:** (optional)
   - **Password:** "password123" (min 8 chars)
   - **Confirm:** "password123"

4. **Click "Create account"**

**Expected behavior:**
- Form submits to `POST /api/v1/auth/register`
- Backend validates (name/username not empty, password >= 8 chars)
- Backend stores student in `data.db`
- Frontend auto-logs in (calls `POST /api/v1/auth/login`)
- Redirects to `dashboard.html`

**If it fails:**
- Check browser console (F12) for network errors
- Check terminal where backend is running for error logs
- Verify backend is on port 5000, frontend on 5501
- Verify CORS is not blocked (check Network tab in DevTools)

### Step 7: Test Login

1. **Open browser:** `http://127.0.0.1:5501/html/index.html`

2. **Stay on "Log in"** tab (default)

3. **Fill form:**
   - **Username or Email:** "johndoe123"
   - **Password:** "password123"

4. **Click "Log in"**

**Expected behavior:**
- Form submits to `POST /api/v1/auth/login`
- Backend authenticates against `data.db`
- Frontend stores session in localStorage
- Redirects to `dashboard.html`

**If it fails:**
- Check credentials are correct
- Verify student was created in previous step
- Check backend logs for validation errors

### Step 8: Test Course Creation

1. **On dashboard**, click **"Go to courses"** button

2. **Click "Add course"** button

3. **Fill form:**
   - **Course name:** "Deep Learning 101"
   - **Color:** (pick any color)

4. **Click "Save course"**

**Expected behavior:**
- Form submits to `POST /api/v1/courses` with `{ username, courseName, color }`
- Backend validates course name is not empty
- Backend creates course in `data.db`
- Frontend fetches updated course list via `GET /api/v1/courses?username=...`
- Course card appears in grid
- Toast notification: "Course added"

**If it fails:**
- Check browser Network tab to see request/response
- Verify API_BASE in `js/config.js` is correct
- Check backend logs for validation errors
- Confirm username is being sent with request

### Step 9: Test Task Creation

1. **Click on course card** to enter course view

2. **Click "Add task"** button

3. **Fill form:**
   - **Task name:** "Finish PyTorch exercise"
   - **Note:** (optional description)
   - **Deadline:** Pick a date/time in the future
   - **Estimated duration:** "2" hours
   - **Importance:** "High"
   - **Progress:** 0%

4. **Click "Create task"**

**Expected behavior:**
- Form submits to `POST /api/v1/tasks` with all task fields
- Backend validates (name not empty, deadline valid, etc.)
- Backend creates task in `data.db`
- Frontend fetches updated task list via `GET /api/v1/tasks?courseId=...&username=...`
- Task card appears in list, ranked by priority
- Toast notification: "Task created"

**If it fails:**
- Check that deadline is in future (not past)
- Verify all required fields are filled
- Check backend logs for validation errors

### Step 10: Test Task Progress Update

1. **On task list**, click a task row to expand details

2. **Adjust Progress slider** to 50%

3. **Click somewhere else** to trigger save

**Expected behavior:**
- Frontend calls `PUT /api/v1/tasks/:taskId` with updated progress
- Backend updates `data.db`
- Priority score recalculates in `smartService.js`
- Task list re-renders in new priority order
- Toast confirmation appears

### Step 11: Verify Database State

In a new terminal:

```bash
cd /home/viet/workspace/viet/Study-Flow/server

sqlite3 data.db ".tables"
# Output: students courses tasks

sqlite3 data.db "SELECT * FROM students LIMIT 1;"
# Verify: student record with username, studentName, password

sqlite3 data.db "SELECT * FROM courses LIMIT 1;"
# Verify: course record with username, courseName, color

sqlite3 data.db "SELECT * FROM tasks LIMIT 1;"
# Verify: task record with courseId, taskName, deadline, importance, etc.
```

---

## Part 3: Field Name Reference

To help catch any remaining mismatches, here's the complete vocabulary:

### Authentication (authService.js)
```
Input fields:
  username (was: userId)
  password
  studentName (was: name)

Stored fields:
  username
  studentName
  password

Returned user object:
  { username, studentName }
```

### Courses (courseService.js)
```
Stored fields:
  courseId
  username (owner)
  courseName
  color

API request body:
  { username, courseName, color }

API response:
  { courseId, username, courseName, color }
```

### Tasks (taskService.js)
```
Stored fields:
  taskId
  courseId
  taskName (was: name)
  description
  deadline
  importance
  estimatedDuration
  currentProgress
  createdAt

API request body:
  { username, courseId, taskName, description, deadline, importance, estimatedDuration, currentProgress }

API response:
  { taskId, courseId, taskName, description, deadline, importance, estimatedDuration, currentProgress, createdAt }

Derived fields (computed by smartService.js):
  urgencyScore
  importanceScore
  remainingWorkload
  workloadScore
  priorityScore
  completionStatus
  isOverdue
  hasWorkloadWarning
  effectiveDuration
  displayStatus
```

---

## Part 4: Troubleshooting Checklist

### Backend Won't Start
- [ ] Node.js is installed: `node --version`
- [ ] Dependencies installed: `npm install` in `/server`
- [ ] Port 5000 is free: `lsof -i :5000` (or `netstat -an | grep 5000` on Windows)
- [ ] No syntax errors in `server/src/app.js`: `node -c src/app.js`

### Frontend Can't Reach Backend
- [ ] Backend is running on port 5000
- [ ] Frontend is on port 5501 (or CORS config needs update)
- [ ] Browser Network tab shows requests going to `http://localhost:5000/api/v1/...`
- [ ] No CORS error in browser console (should show in red)

### API Requests Return 400/422
- [ ] Check request body has correct field names (username, not userId)
- [ ] Verify all required fields are present
- [ ] Check backend logs for validation error messages

### Tasks Don't Update Priority
- [ ] Verify `smartService.js` is imported in `app.js`
- [ ] Check that `enrich()` is called on all tasks before rendering
- [ ] Verify deadline is set (required for urgency calculation)

### Student Data Not Persisting
- [ ] Backend using correct database path: `server/data.db`
- [ ] Check file permissions: `ls -l server/data.db`
- [ ] Verify SQLite is working: `sqlite3 server/data.db "SELECT 1;"`

---

## Part 5: Next Steps After Full Setup

Once everything is working end-to-end:

1. **Run full test flow:**
   - Register new student
   - Create 2+ courses
   - Add 5+ tasks across courses
   - Update task progress
   - Verify priority ordering on dashboard

2. **Test edge cases:**
   - Register with duplicate username (should error)
   - Create task with past deadline (should still work, marked overdue)
   - Delete course (should delete all tasks)
   - Log out and log back in (session should persist in localStorage)

3. **Inspect database:**
   - Verify all data in `data.db` matches what UI shows
   - Check timestamps are ISO format
   - Verify relationship constraints (tasks reference valid courseIds, courses reference valid usernames)

4. **Monitor logs:**
   - Backend terminal shows all incoming requests
   - Frontend console (F12) shows fetch calls and any errors
   - Database file grows as data is added

---

## Summary: What Each Part Does

| Component | Runs On | Purpose | Start Command |
|-----------|---------|---------|---|
| **Backend** | Port 5000 | SQLite DB, API endpoints, auth logic | `cd server && npm start` |
| **Frontend** | Port 5501 | HTML/CSS/JS, calls API, renders UI | `live-server` or `python3 -m http.server 5501` |
| **Database** | Local file | Stores students, courses, tasks | Auto-created by backend on first run |
| **Config** | `js/config.js` | Tells frontend where backend is | `API_BASE = "http://localhost:5000/api/v1"` |

---

## Critical Interdependencies

```
User opens http://127.0.0.1:5501
    ↓
Browser loads index.html
    ↓
JS loads app.js + services
    ↓
User fills auth form (with username, studentName fields)
    ↓
wireAuth() handler calls authService.register() [async]
    ↓
authService calls apiClient.post("/auth/register", { username, studentName, password })
    ↓
apiClient prepends API_BASE → http://localhost:5000/api/v1/auth/register
    ↓
Backend receives request, validates, stores in data.db
    ↓
Backend responds with success
    ↓
Frontend receives response, logs user in, redirects to dashboard
    ↓
Dashboard renders, calls courseService.getCoursesByUserId() [async]
    ↓
courseService calls apiClient.get("/courses?username=...")
    ↓
Backend queries data.db for courses where username=X
    ↓
Backend responds with course array
    ↓
Frontend receives, enriches with smartService, renders course cards
```

This is the full flow. Any break in this chain causes the feature to fail.

---

## Files to Update (When Ready)

**DO NOT apply yet** — review first, then apply together:

- `html/index.html` — Change `userId` → `username`, `name` → `studentName` in auth forms

**Already Updated (No Action Needed):**
- ✅ `js/app.js` — Async/await, await all service calls
- ✅ `js/config.js` — NEW, API_BASE defined
- ✅ `js/services/authService.js` — API calls
- ✅ `js/services/courseService.js` — API calls
- ✅ `js/services/taskService.js` — API calls
- ✅ `js/services/smartService.js` — Async getGlobalRecommendations
- ✅ `js/services/storageService.js` — API client wrapper

