import { getCourseById } from "./courseService.js";

const TASKS_KEY = "studyflow_tasks";
const COURSES_KEY = "studyflow_courses";
const LEGACY_USER_ID = "studentId";

const VALID_PROGRESS_VALUES = [0, 25, 50, 75, 100];
const VALID_IMPORTANCE_VALUES = ["very-low", "low", "medium", "high", "very-high"];
const progressBeforeCompletion = new Map();

function generateTaskId() {
  return crypto.randomUUID();
}

function getData(key) {
  let data = JSON.parse(localStorage.getItem(key) ?? "[]");
  if (!Array.isArray(data)) throw new Error(`Invalid stored data for ${key}`);
  if (key === COURSES_KEY) {
    const migrated = data.map((course) => {
      if (!course || typeof course !== "object" || !(LEGACY_USER_ID in course)) return course;
      const { [LEGACY_USER_ID]: legacyUserId, ...rest } = course;
      return { ...rest, userId: rest.userId ?? legacyUserId };
    });
    if (migrated.some((course, index) => course !== data[index])) {
      saveData(key, migrated);
      data = migrated;
    }
  }
  return data;
}

function saveData(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

function getAllTasks() {
  return getData(TASKS_KEY);
}

function parseProgress(value, defaultValue = 0) {
  if (value === undefined) return defaultValue;
  const progress = Number(value);
  if (!VALID_PROGRESS_VALUES.includes(progress)) {
    throw new Error("currentProgress must be: 0, 25, 50, 75, 100.");
  }
  return progress;
}

function parseDuration(value) {
  if (value === undefined || value === null || value === "") return null;
  const duration = Number(value);
  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error("estimatedDuration must be larger than 0.");
  }
  return duration;
}

function parseDeadline(value) {
  const deadline = new Date(value);
  if (!value || Number.isNaN(deadline.getTime())) {
    throw new Error("Deadline is invalid.");
  }
  return deadline.toISOString();
}

function parseImportance(value = "medium") {
  if (!VALID_IMPORTANCE_VALUES.includes(value)) {
    throw new Error("Importance is invalid.");
  }
  return value;
}

export function createTask(taskData) {
  const name = (taskData.name || "").trim();
  if (!name) {
    throw new Error("Task name is NOT empty.");
  }

  const course = getCourseById(taskData.courseId);
  if (!course) {
    throw new Error("courseId does NOT exist.");
  }

  const newTask = {
    taskId: generateTaskId(),
    courseId: taskData.courseId,
    name: name,
    description: String(taskData.description || "").trim(),
    deadline: parseDeadline(taskData.deadline),
    importance: parseImportance(taskData.importance),
    estimatedDuration: parseDuration(taskData.estimatedDuration),
    currentProgress: parseProgress(taskData.currentProgress),
    createdAt: new Date().toISOString(),
  };

  const tasks = getAllTasks();
  tasks.push(newTask);
  saveData(TASKS_KEY, tasks);

  return newTask;
}

export function getTasksByUserId(userId) {
  const courses = getData(COURSES_KEY);
  const userCourseIds = courses
    .filter((course) => course.userId === userId)
    .map((course) => course.courseId);

  const tasks = getAllTasks();
  return tasks.filter((task) => userCourseIds.includes(task.courseId));
}

export function getTasksByCourseId(courseId) {
  const tasks = getAllTasks();
  return tasks.filter((task) => task.courseId === courseId);
}

export function getTaskById(taskId) {
  const tasks = getAllTasks();
  const task = tasks.find((t) => t.taskId === taskId);
  return task || null;
}

export function updateTask(taskId, data) {
  const tasks = getAllTasks();
  const index = tasks.findIndex((t) => t.taskId === taskId);

  if (index === -1) {
    return null;
  }

  const allowedFields = [
    "name",
    "description",
    "deadline",
    "importance",
    "estimatedDuration",
    "currentProgress",
  ];

  const currentTask = tasks[index];
  const updatedTask = { ...currentTask };

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      updatedTask[field] = data[field];
    }
  }

  updatedTask.name = String(updatedTask.name || "").trim();
  if (!updatedTask.name) throw new Error("Task name is NOT empty.");
  updatedTask.description = String(updatedTask.description || "").trim();
  updatedTask.deadline = parseDeadline(updatedTask.deadline);
  updatedTask.importance = parseImportance(updatedTask.importance);
  updatedTask.estimatedDuration = parseDuration(updatedTask.estimatedDuration);
  updatedTask.currentProgress = parseProgress(updatedTask.currentProgress);

  tasks[index] = updatedTask;
  saveData(TASKS_KEY, tasks);

  return updatedTask;
}

export function updateDisplayOrder(taskIds) {
  const tasks = getAllTasks();
  const remaining = tasks
    .filter((task) => !taskIds.includes(task.taskId))
    .sort((a, b) => (a.manualOrder ?? Number.MAX_SAFE_INTEGER) - (b.manualOrder ?? Number.MAX_SAFE_INTEGER))
    .map((task) => task.taskId);
  const order = new Map([...taskIds, ...remaining].map((id, index) => [id, index]));
  tasks.forEach((task) => {
    if (order.has(task.taskId)) task.manualOrder = order.get(task.taskId);
  });
  saveData(TASKS_KEY, tasks);
}

export function deleteTask(taskId) {
  const tasks = getAllTasks();
  const index = tasks.findIndex((t) => t.taskId === taskId);

  if (index === -1) {
    return false;
  }

  tasks.splice(index, 1);
  saveData(TASKS_KEY, tasks);

  return true;
}

export function updateTaskProgress(taskId, currentProgress) {
  currentProgress = parseProgress(currentProgress);

  const tasks = getAllTasks();
  const index = tasks.findIndex((t) => t.taskId === taskId);

  if (index === -1) {
    return null;
  }

  tasks[index].currentProgress = currentProgress;
  saveData(TASKS_KEY, tasks);

  return tasks[index];
}

export function markTaskCompleted(taskId) {
  return updateTaskProgress(taskId, 100);
}

export function toggleTaskCompleted(taskId) {
  const task = getTaskById(taskId);
  if (!task) return null;
  if (task.currentProgress === 100) {
    const progress = progressBeforeCompletion.get(taskId) ?? 0;
    progressBeforeCompletion.delete(taskId);
    return updateTaskProgress(taskId, progress);
  }
  progressBeforeCompletion.set(taskId, task.currentProgress);
  return updateTaskProgress(taskId, 100);
}

export function getOverdueTasks(userId) {
  const now = new Date();
  const userTasks = getTasksByUserId(userId);

  return userTasks.filter((task) => {
    const isNotCompleted = task.currentProgress < 100;
    const isPastDeadline = new Date(task.deadline) < now;
    return isNotCompleted && isPastDeadline;
  });
}

// Names used by app.js.
export const create = createTask;
export const list = getTasksByCourseId;
export const update = updateTask;
export const remove = deleteTask;
export const setProgress = updateTaskProgress;
export const toggleCompleted = toggleTaskCompleted;
