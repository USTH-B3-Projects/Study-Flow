import { getTasksByCourseId, getTasksByStudentId } from "./taskService.js";

const DAY = 86400000;
const IMPORTANCE_SCORES = {
  "very-low": 20,
  low: 40,
  medium: 60,
  high: 80,
  "very-high": 100,
};

function calculateUrgencyScore(deadline, now = new Date()) {
  const due = new Date(deadline);
  if (due < now) return 100;
  if (due.toDateString() === now.toDateString()) return 90;
  const days = Math.ceil((due - now) / DAY);
  if (days === 1) return 80;
  if (days <= 3) return 60;
  if (days <= 7) return 40;
  return 20;
}

function calculateImportanceScore(importance) {
  return IMPORTANCE_SCORES[importance] ?? 60;
}

function calculateRemainingWorkload(estimatedDuration, currentProgress) {
  return (estimatedDuration ?? 3) * (1 - Number(currentProgress) / 100);
}

function calculateWorkloadScore(remainingWorkload) {
  if (remainingWorkload <= 1) return 20;
  if (remainingWorkload <= 2) return 40;
  if (remainingWorkload <= 4) return 60;
  if (remainingWorkload <= 6) return 80;
  return 100;
}

export function enrich(task) {
  const urgencyScore = calculateUrgencyScore(task.deadline);
  const importanceScore = calculateImportanceScore(task.importance);
  const remainingWorkload = calculateRemainingWorkload(
    task.estimatedDuration,
    task.currentProgress,
  );
  const workloadScore = calculateWorkloadScore(remainingWorkload);
  const completionStatus = Number(task.currentProgress) === 100 ? "completed" : "pending";
  const isOverdue = completionStatus !== "completed" && new Date(task.deadline) < new Date();
  const hasWorkloadWarning =
    completionStatus !== "completed" &&
    !isOverdue &&
    task.estimatedDuration != null &&
    ((urgencyScore >= 80 && workloadScore >= 60) ||
      (urgencyScore >= 60 && workloadScore >= 80));

  return {
    ...task,
    effectiveDuration: task.estimatedDuration ?? 3,
    urgencyScore,
    importanceScore,
    remainingWorkload,
    workloadScore,
    priorityScore:
      0.5 * urgencyScore + 0.3 * importanceScore + 0.2 * workloadScore,
    completionStatus,
    isOverdue,
    displayStatus: completionStatus === "completed" ? "completed" : isOverdue ? "overdue" : "pending",
    hasWorkloadWarning,
  };
}

export function calculatePriorityScore(task) {
  return enrich(task).priorityScore;
}

export function rankTasks(tasks) {
  return tasks
    .map(enrich)
    .filter((task) => task.completionStatus !== "completed")
    .sort(
      (a, b) =>
        b.priorityScore - a.priorityScore ||
        new Date(a.deadline) - new Date(b.deadline) ||
        b.importanceScore - a.importanceScore ||
        new Date(a.createdAt) - new Date(b.createdAt),
    );
}

export function recommended(tasks, limit = 3) {
  return rankTasks(tasks).slice(0, limit);
}

export function getGlobalRecommendations(studentId) {
  return rankTasks(getTasksByStudentId(studentId));
}

export function getLocalRecommendations(courseId) {
  return rankTasks(getTasksByCourseId(courseId));
}

export function getWorkloadWarning(tasks) {
  return rankTasks(tasks).filter((task) => task.hasWorkloadWarning || task.isOverdue);
}
