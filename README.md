# StudyFlow
StudyFlow is a smart study planner that helps students manage courses, tasks, deadlines, progress, and task priorities.

## Main features
- Authentication
- Course management
- Task and deadline management
- Task progress tracking
- Smart task prioritization
- Global and local recommendations
- Workload warning

## Smart Prioritization
StudyFlow calculates task priority based on:
- Deadline urgency
- Importance level
- Current progress
- Estimated duration (optional)

If estimated duration is not provided, the system uses a default effective duration of 2h for priority calculation.

## Data Storage
StudyFlow uses browser `localStorage` for prototype data persistence.

Main stored data:
- Users
- Courses
- Tasks
- Current logged-in user
Calculated values: priority score, workload score, overdue status, and workload warning are derived by the system and are not stored directly.

## Project Documents
- Brief: `docs/studyflow-brief.pdf`
- Use Case Diagram: `docs/use-case-diagram.png`
- Class Diagram: `docs/class-diagram.pdf`
- Workflow: `docs/workflow.pdf`
- Data Contract: `docs/data-contract.md`

## Team Responsibilities

- Architecture, structure and integration
- UI, course, task and smart features
- Data storage/API and testing

## Setup

Setup instructions will be added after the technology stack is finalized.

## Code Structure
```text
studyflow/
│
├── index.html
├── dashboard.html
├── course.html
│
├── css/
│   ├── global.css
│   ├── auth.css
│   ├── dashboard.css
│   └── course.css
│
├── js/
│   ├── app.js
│   │
│   ├── services/
│   │   ├── storageService.js
│   │   ├── authService.js
│   │   ├── courseService.js
│   │   ├── taskService.js
│   │   └── smartService.js
│   │
│   └── ui/
│       ├── dashboardUI.js
│       ├── courseUI.js
│       └── taskUI.js
│
├── docs/
│   ├── studyflow-brief.pdf
│   ├── data-contract.md
│   ├── use-case-diagram.png
│   ├── class-diagram.pdf
│   └── workflow.pdf
│
└── README.md
```
