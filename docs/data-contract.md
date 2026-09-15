# StudyFlow Data Contract

## 1. Purpose

This document defines the common data structures used by all
StudyFlow modules.

All modules must use the same field names, data types, allowed
values, and relationships defined in this document.

## 2. General Conventions

- ID type: String
- Date format: ISO 8601 String
- Duration unit: Hour
- Progress unit: Percentage
- Field naming convention: camelCase
- Missing optional value: null
- All IDs must be unique

## 3. Student

<b>Register Input</b>

| Field | Type | Required | Default | Description |
|---|---|---:|---|---|
| studentId | String | Yes | null | Unique student identifier and login ID |
| studentName | String | Yes | null | Student's display name |
| email | String | Yes | null | Student's email address |
| password | String | Yes | null | Password for prototype authentication |

<b>Login Input</b>
| Field | Type | Required | Description |
|---|---|---:|---|
| studentId | String | Yes | Student ID used for login |
| password | String | Yes | Account password |

### Account Validation

- `studentId` must not be empty, must be unique, must be trimmed before being stored
- `studentName` must not be empty, must be trimmed before being stored.
- `email` must have a valid email format, must be unique, must be trimmed and converted to lowercase.
- `password` must meet the minimum length selected by the team.

<!--
{
  "studentId": "1023",
  "studentName": "John Doe",
  "email": "john.doe@example.com",
  "password": "demo-password"
}
-->

## 4. Course

| Field | Type | Required | Default | Description |
|---|---|---:|---|---|
| courseId | String | Yes | Generated | Unique course identifier |
| studentId | String | Yes | null | ID of the course owner |
| courseName | String | Yes | null | Course name |
| color | String or null | No | null | Optional course display color |

### Course Validation

- `courseName` must not be empty.
- `studentId` must refer to an existing student.
- `color` must be a valid CSS color if provided.

<!--{
  "courseId": "course-001",
  "studentId": "1023",
  "courseName": "Deep Learning",
  "color": "#6C63FF"
}
-->

## 5. Task

| Field | Type | Required | Default | Description |
|---|---|---:|---|---|
| taskId | String | Yes | Generated | Unique task identifier |
| courseId | String | Yes | null | ID of the Course containing the task |
| taskName | String | Yes | null | Task name |
| description | String | No | "" | Additional task information |
| deadline | ISO Date String | Yes | null | Task deadline |
| importance | ImportanceLevel | Yes | "medium" | User-selected importance |
| estimatedDuration | Number or null | No | null | User-estimated duration in hours |
| currentProgress | Number | Yes | 0 | Current task progress |
| createdAt | ISO Date String | Yes | Current time | Task creation time |

### Task Validation

- `taskName` must not be empty.
- `courseId` must refer to an existing course.
- `deadline` must be a valid date.
- `estimatedDuration` must be greater than 0 when provided.
- `estimatedDuration` must remain null if the user does not provide it.
- The default value of 3 hours is applied only to `effectiveDuration`.
- `currentProgress` must be one of: 0, 25, 50, 75, 100.
- `completionStatus` is derived from `currentProgress` and is not stored.
- `displayStatus` is derived from `currentProgress` and `deadline` and is not stored.

<!--
{
  "taskId": "task-001",
  "courseId": "course-001",
  "taskName": "Finish DL Lab",
  "description": "Complete the PyTorch exercise",
  "deadline": "2026-09-15T23:59:00.000Z",
  "importance": "high",
  "estimatedDuration": 6,
  "currentProgress": 50,
  "createdAt": "2026-09-12T09:00:00.000Z"
}
-->

<!--{
  "taskId": "task-002",
  "courseId": "course-001",
  "taskName": "Review Lecture 4",
  "description": "",
  "deadline": "2026-09-18T23:59:00.000Z",
  "importance": "medium",
  "estimatedDuration": null,
  "currentProgress": 0,
  "createdAt": "2026-09-12T09:10:00.000Z"
}
-->

## 6. Allowed Values

### Urgency
| Time until deadline | Urgency Score |
|---|---:|
| > 7 days | 20 |
| 4 - 7 days | 40 |
| 2 - 3 days | 60 |
| 1 day | 80 |
| Today | 90 |
| Overdue | 100 |

### ImportanceLevel

| Value | Importance Score |
|---|---:|
| very-low | 20 |
| low | 40 |
| medium | 60 |
| high | 80 |
| very-high | 100 |

### CompletionStatus

| Value | Meaning |
|---|---|
| pending | Progress is below 100 |
| completed | Progress is 100 |

### DisplayStatus

| Value | Meaning |
|---|---|
| completed | Progress is 100 |
| overdue | Progress is below 100 & deadline has passed |
| pending | Progress is below 100 & deadline has not passed |

### CurrentProgress

| Level | Score |
|---|---:|
| not started | 0 |
| started | 25 |
| halfway | 50 |
| almost done | 75 |
| completed | 100 |

### WorkloadScore
| Remaining Workload | Workload Score |
|---|---:|
| ≤ 1h | 20 |
| > 1 and ≤ 2h | 40 |
| > 2 and ≤ 4h | 60 |
| > 4 and ≤ 6h | 80 |
| > 6h | 100 |

## 7. Derived Task Values

The following values are calculated by PriorityService.
They are not entered directly by the user.

| Field | Type | Stored? | Description |
|---|---|---:|---|
| effectiveDuration | Number | No | User duration or default 3 hours |
| urgencyScore | Number | No | Calculated from deadline |
| importanceScore | Number | No | Converted from importance level |
| remainingWorkload | Number | No | Remaining estimated work |
| workloadScore | Number | No | Calculated from remaining workload |
| priorityScore | Number | No | Final priority score |
| completionStatus | CompletionStatus | No | Derived from currentProgress |
| isOverdue | Boolean | No | Whether deadline has passed & task is incomplete |
| displayStatus | DisplayStatus | No | Status displayed on the interface |
| hasWorkloadWarning | Boolean | No | Whether the task is at risk |

<b>effectiveDuration:</b>
<br>
If estimatedDuration is provided: effectiveDuration = estimatedDuration
<br>
Otherwise: effectiveDuration = 3

<b>remainingWorkload:</b>
<br>
remainingWorkload = effectiveDuration × (1 - currentProgress / 100)

<b>priorityScore:</b>
<br>
priorityScore = 0.5 × urgencyScore + 0.3 × importanceScore + 0.2 × workloadScore

<b>workloadWarning:</b>
<br>
If completionStatus is completed: No warning
<br>
Else if task is overdue: Show overdue status
<br>
Else if estimatedDuration is null: Do not calculate workload warning
<br>
Else if
    (urgencyScore >= 80 AND workloadScore >= 60)
    OR
    (urgencyScore >= 60 AND workloadScore >= 80): Show workload warning
<br>
Else
    No workload warning

## 8. Relationships

- One Student can have zero or many Courses.
- One Course belongs to exactly one Student, identified by studentId.
- One Course can have zero or many Tasks.
- One Task belongs to exactly one Course, identified by courseId.

## 9. Deletion Rules

### Delete Course

Before deleting a course, the system must display a confirmation.

If confirmed, the course and all tasks belonging to that course
are deleted.

### Delete Task

Before deleting a task, the system must display a confirmation.

## 10. Local Storage

| Key | Value Type | Description |
|---|---|---|
| studyflow_users | Array<Student> | Registered students |
| studyflow_courses | Array<Course> | All courses |
| studyflow_tasks | Array<Task> | All tasks |
| studyflow_current_user | String or null | studentId of logged-in student |

<!--
Initial data:
{ 
  "studyflow_users": [],
  "studyflow_courses": [],
  "studyflow_tasks": [],
  "studyflow_current_user": null
}
-->


## 11. Recommended Task View

PriorityService combines stored Task data with calculated values.

### Recommendation Sorting

Only pending tasks are included in recommendation ranking.

Completed tasks are excluded from Recommendation ranking.

Tasks are sorted by:

1. priorityScore DESC
2. deadline ASC
3. importanceScore DESC
4. createdAt ASC



<!--Example:

{
  "taskId": "task-001",
  "courseId": "course-001",
  "taskName": "Finish DL Lab",
  "deadline": "2026-09-15T23:59:00.000Z",
  "importance": "high",
  "estimatedDuration": 6,
  "currentProgress": 50,

  "effectiveDuration": 6,
  "remainingWorkload": 3,
  "urgencyScore": 80,
  "importanceScore": 80,
  "workloadScore": 60,
  "priorityScore": 76,

  "completionStatus": "pending",
  "isOverdue": false,
  "displayStatus": "pending",
  "hasWorkloadWarning": true
}
-->
