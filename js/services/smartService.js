const importance = {
  "very-low": 20,
  low: 40,
  medium: 60,
  high: 80,
  "very-high": 100,
};
function urgency(deadline, now = new Date()) {
  const due = new Date(deadline),
    dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate()),
    today = new Date(now.getFullYear(), now.getMonth(), now.getDate()),
    days = Math.round((dueDay - today) / 86400000);
  if (due < now && days < 0) return 100;
  if (days <= 0) return 90;
  if (days === 1) return 80;
  if (days <= 3) return 60;
  if (days <= 7) return 40;
  return 20;
}
function enrich(task, now = new Date()) {
  const u = urgency(task.deadline, now),
    i = importance[task.importance] ?? 60,
    d = task.estimatedDuration == null ? 3 : Number(task.estimatedDuration),
    remaining = d * (1 - Number(task.currentProgress || 0) / 100),
    w =
      remaining <= 1
        ? 20
        : remaining <= 2
          ? 40
          : remaining <= 4
            ? 60
            : remaining <= 6
              ? 80
              : 100,
    completed = Number(task.currentProgress) === 100,
    overdue = !completed && new Date(task.deadline) < now,
    warning =
      !completed &&
      !overdue &&
      task.estimatedDuration != null &&
      ((u >= 80 && w >= 60) || (u >= 60 && w >= 80));
  return {
    ...task,
    effectiveDuration: d,
    urgencyScore: u,
    importanceScore: i,
    remainingWorkload: remaining,
    workloadScore: w,
    priorityScore: 0.5 * u + 0.3 * i + 0.2 * w,
    completionStatus: completed ? "completed" : "pending",
    isOverdue: overdue,
    displayStatus: completed ? "completed" : overdue ? "overdue" : "pending",
    hasWorkloadWarning: warning,
  };
}
export const smartService = {
  enrich,
  rank(tasks) {
    return tasks
      .map(enrich)
      .filter((t) => t.completionStatus !== "completed")
      .sort(
        (a, b) =>
          b.priorityScore - a.priorityScore ||
          new Date(a.deadline) - new Date(b.deadline) ||
          b.importanceScore - a.importanceScore ||
          new Date(a.createdAt) - new Date(b.createdAt),
      );
  },
  recommended(tasks, limit = 5) {
    return this.rank(tasks).slice(0, limit);
  },
  hasWorkloadWarning(task) {
    return enrich(task).hasWorkloadWarning;
  },
};
