const data = new Map([
  ["users", JSON.stringify([{ studentId: "S1" }])],
]);

globalThis.localStorage = {
  getItem: (key) => data.get(key) ?? null,
  setItem: (key, value) => data.set(key, value),
};
globalThis.CSS = { supports: () => true };

const service = await import("./courseService.js");
const course = service.createCourse({
  studentId: "S1",
  courseName: "Math",
  color: "#1769ff",
});

console.assert(service.getCoursesByStudentId("S1")[0].courseName === "Math");
console.assert(
  service.updateCourse(course.courseId, { courseName: "Physics" }).courseName ===
    "Physics",
);
console.assert(service.deleteCourse(course.courseId));
console.assert(service.getCourseById(course.courseId) === null);
