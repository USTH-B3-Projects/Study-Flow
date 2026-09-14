import { storageService as s } from "./storageService.js";
const id = () =>
  crypto.randomUUID
    ? crypto.randomUUID()
    : `course-${Date.now()}-${Math.random().toString(16).slice(2)}`;
export const courseService = {
  list(studentId) {
    return s.getCourses().filter((c) => c.studentId === studentId);
  },
  get(courseId) {
    return s.getCourses().find((c) => c.courseId === courseId);
  },
  create({ studentId, name, color = null }) {
    name = String(name || "").trim();
    if (!name) throw new Error("Course name is required.");
    const c = { courseId: id(), studentId, name, color: color || null };
    s.setCourses([...s.getCourses(), c]);
    return c;
  },
  update(courseId, patch) {
    const all = s
      .getCourses()
      .map((c) =>
        c.courseId === courseId
          ? { ...c, ...patch, name: String(patch.name ?? c.name).trim() }
          : c,
      );
    s.setCourses(all);
    return all.find((c) => c.courseId === courseId);
  },
  remove(courseId) {
    s.setCourses(s.getCourses().filter((c) => c.courseId !== courseId));
    s.setTasks(s.getTasks().filter((t) => t.courseId !== courseId));
  },
};
