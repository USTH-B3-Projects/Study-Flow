import { storageService as s } from "./storageService.js";
const id = () =>
  crypto.randomUUID
    ? crypto.randomUUID()
    : `task-${Date.now()}-${Math.random().toString(16).slice(2)}`;
export const taskService = {
  list(courseId) {
    return s.getTasks().filter((t) => t.courseId === courseId);
  },
  allForStudent(studentId) {
    const ids = new Set(
      s
        .getCourses()
        .filter((c) => c.studentId === studentId)
        .map((c) => c.courseId),
    );
    return s.getTasks().filter((t) => ids.has(t.courseId));
  },
  create(data) {
    const t = {
      taskId: id(),
      courseId: data.courseId,
      name: String(data.name || "").trim(),
      description: String(data.description || ""),
      deadline: new Date(data.deadline).toISOString(),
      importance: data.importance || "medium",
      estimatedDuration:
        data.estimatedDuration === "" || data.estimatedDuration == null
          ? null
          : Number(data.estimatedDuration),
      currentProgress: Number(data.currentProgress || 0),
      createdAt: new Date().toISOString(),
    };
    if (!t.name || Number.isNaN(new Date(t.deadline).getTime()))
      throw new Error("Task name and valid deadline required.");
    const all = [...s.getTasks(), t];
    s.setTasks(all);
    return t;
  },
  update(taskId, patch) {
    const all = s.getTasks().map((t) =>
      t.taskId === taskId
        ? {
            ...t,
            ...patch,
            deadline: patch.deadline
              ? new Date(patch.deadline).toISOString()
              : t.deadline,
            currentProgress:
              patch.currentProgress == null
                ? t.currentProgress
                : Number(patch.currentProgress),
          }
        : t,
    );
    s.setTasks(all);
    return all.find((t) => t.taskId === taskId);
  },
  remove(taskId) {
    s.setTasks(s.getTasks().filter((t) => t.taskId !== taskId));
  },
  setProgress(taskId, progress) {
    return this.update(taskId, { currentProgress: Number(progress) });
  },
};
