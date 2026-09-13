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

If estimated duration is not provided, the system yses a default effective duration of 3h for priority calculation.

## Data Storage
StudyFlow uses browser `localStorage` for prototype data persistence.

Main stored data:
- Students
- Courses
- Tasks
- Current logged-in student
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