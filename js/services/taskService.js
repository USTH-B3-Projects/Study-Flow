import { getData, saveData } from "./storageService.js";
import { getCourseById } from "./courseService.js";

const TASKS_KEY = "studyflow_tasks";

const VALID_PROGRESS_VALUES = [0, 25, 50, 75, 100];

function generateTaskId() {
  return "task-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
}

function getAllTasks() {
  const tasks = getData(TASKS_KEY);
  return tasks || [];
}

export function createTask(taskData) {
  const name = (taskData.name || "").trim();
  if (!name) {
    throw new Error("Tên task không được để trống.");
  }

  const course = getCourseById(taskData.courseId);
  if (!course) {
    throw new Error("courseId không tồn tại.");
  }

  if (!taskData.deadline || isNaN(new Date(taskData.deadline).getTime())) {
    throw new Error("Deadline không hợp lệ.");
  }

  let estimatedDuration = null;
  if (taskData.estimatedDuration !== undefined && taskData.estimatedDuration !== null) {
    if (taskData.estimatedDuration <= 0) {
      throw new Error("estimatedDuration phải lớn hơn 0.");
    }
    estimatedDuration = taskData.estimatedDuration;
  }

  let currentProgress = 0;
  if (taskData.currentProgress !== undefined) {
    if (!VALID_PROGRESS_VALUES.includes(taskData.currentProgress)) {
      throw new Error("currentProgress phải là một trong: 0, 25, 50, 75, 100.");
    }
    currentProgress = taskData.currentProgress;
  }

  const newTask = {
    taskId: generateTaskId(),
    courseId: taskData.courseId,
    name: name,
    description: taskData.description ? taskData.description.trim() : "",
    deadline: taskData.deadline,
    importance: taskData.importance || "medium",
    estimatedDuration: estimatedDuration,
    currentProgress: currentProgress,
    createdAt: new Date().toISOString(),
  };

  const tasks = getAllTasks();
  tasks.push(newTask);
  saveData(TASKS_KEY, tasks);

  return newTask;
}

export function getTasksByStudentId(studentId) {
  const courses = getData("courses") || [];
  const studentCourseIds = courses
    .filter((course) => course.studentId === studentId)
    .map((course) => course.courseId);

  const tasks = getAllTasks();
  return tasks.filter((task) => studentCourseIds.includes(task.courseId));
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
  ];

  const currentTask = tasks[index];
  const updatedTask = { ...currentTask };

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      updatedTask[field] = data[field];
    }
  }

  if (updatedTask.name) {
    updatedTask.name = updatedTask.name.trim();
    if (!updatedTask.name) {
      throw new Error("Tên task không được để trống.");
    }
  }

  tasks[index] = updatedTask;
  saveData(TASKS_KEY, tasks);

  return updatedTask;
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
  if (!VALID_PROGRESS_VALUES.includes(currentProgress)) {
    throw new Error("currentProgress phải là một trong: 0, 25, 50, 75, 100.");
  }

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

export function getOverdueTasks(studentId) {
  const now = new Date();
  const studentTasks = getTasksByStudentId(studentId);

  return studentTasks.filter((task) => {
    const isNotCompleted = task.currentProgress < 100;
    const isPastDeadline = new Date(task.deadline) < now;
    return isNotCompleted && isPastDeadline;
  });
}